"""
ML Signals Strategy

Machine learning-based signal generation using Random Forest classifier.
Uses technical indicators as features to predict BUY/SELL signals.

Features include:
- RSI, MACD, Bollinger Bands, ATR, Stochastic
- Rolling returns (5d, 10d, 20d)
- Rolling volatility
- Price-to-SMA relationships

Cold Start: Falls back to momentum strategy when no model is available.

Usage:
    strategy = MLSignalStrategy()
    signal = strategy.analyze(symbol="AAPL", market="US", ohlcv_data=data, data_hash="abc123")

Dependencies:
    - Python 3.10+
    - indicators.technical
    - models.signal
    - confidence.scorer
    - confidence.invalidation
    - joblib (optional, for model loading)
    - numpy
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import os

import structlog
import numpy as np

from indicators.technical import TechnicalIndicators
from models import Signal, SignalFeatures, SignalSide, EntryType, TimeInForce
from confidence import ConfidenceScorer, generate_invalidation_rules

logger = structlog.get_logger(__name__)


# Feature names used by the ML model (must match training order)
FEATURE_NAMES = [
    'rsi',
    'macd',
    'macd_signal',
    'macd_histogram',
    'bb_position',
    'bb_width',
    'atr',
    'stoch_k',
    'stoch_d',
    'return_5d',
    'return_10d',
    'return_20d',
    'volatility_20d',
    'volume_ratio',
    'price_to_sma_20',
    'price_to_sma_50',
]


class MLSignalStrategy:
    """
    Machine learning strategy using Random Forest on technical features.

    This strategy uses a pre-trained Random Forest classifier to predict
    BUY/SELL signals based on technical indicator features. When no model
    is available (cold start), it falls back to a simple momentum-based
    signal generation.

    Model Training:
        The model should be trained separately using historical data.
        Features are extracted using the same _extract_features() method.
        Expected classes: [0=SELL, 1=HOLD, 2=BUY] or [0=SELL, 1=BUY]

    Cold Start Fallback:
        When no model is loaded, uses SMA crossover with RSI confirmation.
    """

    NAME = "ML Signal Strategy"
    TYPE = "ml"
    VERSION = "1.0.0"
    DESCRIPTION = "Machine learning strategy using Random Forest on technical features"

    DEFAULT_CONFIG = {
        "model_path": "/app/ml_models/ml_signal_rf.joblib",  # Path to trained model
        "buy_probability_threshold": 0.65,
        "sell_probability_threshold": 0.65,
        "use_fallback_on_cold_start": True,
        "atr_multiplier_stop": 2.0,
        "atr_multiplier_target": 3.0,
        "min_data_bars": 60,
        "limit_order_offset_pct": 0.002,
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize ML Signal strategy with configuration.

        Args:
            config: Optional configuration dictionary to override defaults.
                   Keys:
                   - model_path: Path to saved joblib model file
                   - buy_probability_threshold: Minimum probability for BUY signal
                   - sell_probability_threshold: Minimum probability for SELL signal
                   - use_fallback_on_cold_start: Use momentum fallback if no model
                   - atr_multiplier_stop: ATR multiplier for stop loss calculation
                   - atr_multiplier_target: ATR multiplier for target calculation
                   - min_data_bars: Minimum OHLCV bars required for analysis
                   - limit_order_offset_pct: Offset for limit order pricing
        """
        self.config = {**self.DEFAULT_CONFIG, **(config or {})}
        self.scorer = ConfidenceScorer(strategy_type="ml_signal")
        self.model = None
        self._model_classes = None

        # Try to load model if path provided
        if self.config["model_path"]:
            self._load_model(self.config["model_path"])

        logger.info(
            "ML Signal strategy initialized",
            config=self.config,
            model_loaded=self.model is not None,
        )

    def _load_model(self, model_path: str) -> None:
        """
        Load trained model from disk.

        Args:
            model_path: Path to the saved joblib model file.

        The model is expected to be a scikit-learn compatible classifier
        with predict_proba() method. Classes should be [0=SELL, 1=HOLD, 2=BUY]
        or [0=SELL, 1=BUY].
        """
        try:
            import joblib

            if os.path.exists(model_path):
                self.model = joblib.load(model_path)

                # Try to get class labels
                if hasattr(self.model, 'classes_'):
                    self._model_classes = list(self.model.classes_)

                logger.info(
                    "Model loaded successfully",
                    path=model_path,
                    classes=self._model_classes,
                )
            else:
                logger.warning("Model file not found", path=model_path)
        except ImportError:
            logger.warning(
                "joblib not installed, cannot load model. "
                "Install with: pip install joblib"
            )
        except Exception as e:
            logger.error("Failed to load model", error=str(e), path=model_path)

    def _calc_bb_position(
        self, price: float, bb: Dict[str, List[Optional[float]]]
    ) -> float:
        """
        Calculate position within Bollinger Bands.

        Args:
            price: Current price
            bb: Bollinger bands dict with 'upper', 'lower' lists

        Returns:
            Position as 0-1 (0=at lower band, 1=at upper band)
        """
        upper = bb['upper'][-1] if bb['upper'][-1] is not None else price
        lower = bb['lower'][-1] if bb['lower'][-1] is not None else price

        if upper <= lower:
            return 0.5

        bb_range = upper - lower
        return (price - lower) / bb_range if bb_range > 0 else 0.5

    def _calc_bb_width(self, bb: Dict[str, List[Optional[float]]]) -> float:
        """
        Calculate Bollinger Band width (normalized).

        Args:
            bb: Bollinger bands dict with 'upper', 'middle', 'lower' lists

        Returns:
            Band width as percentage of middle band
        """
        upper = bb['upper'][-1]
        middle = bb['middle'][-1]
        lower = bb['lower'][-1]

        if upper is None or middle is None or lower is None or middle == 0:
            return 0.0

        return (upper - lower) / middle

    def _extract_features(
        self, ohlcv_data: List[dict]
    ) -> Optional[np.ndarray]:
        """
        Extract features from OHLCV data for ML model.

        Calculates technical indicators and returns a feature vector
        matching the expected model input format.

        Args:
            ohlcv_data: List of OHLCV bar dictionaries with keys:
                       'open', 'high', 'low', 'close', 'volume'

        Returns:
            numpy array of shape (1, n_features) or None if insufficient data
        """
        if len(ohlcv_data) < self.config['min_data_bars']:
            logger.warning(
                "Insufficient data for feature extraction",
                bars=len(ohlcv_data),
                required=self.config['min_data_bars'],
            )
            return None

        # Extract price and volume arrays
        highs = [bar['high'] for bar in ohlcv_data]
        lows = [bar['low'] for bar in ohlcv_data]
        closes = [bar['close'] for bar in ohlcv_data]
        volumes = [bar['volume'] for bar in ohlcv_data]

        # Calculate indicators
        rsi = TechnicalIndicators.rsi(closes, 14)
        macd = TechnicalIndicators.macd(closes)
        bb = TechnicalIndicators.bollinger_bands(closes)
        atr = TechnicalIndicators.atr(highs, lows, closes)
        stoch = TechnicalIndicators.stochastic(highs, lows, closes)
        sma_20 = TechnicalIndicators.sma(closes, 20)
        sma_50 = TechnicalIndicators.sma(closes, 50)

        # Build feature dictionary with safe defaults
        current = {
            'rsi': rsi[-1] if rsi[-1] is not None else 50.0,
            'macd': macd['macd'][-1] if macd['macd'][-1] is not None else 0.0,
            'macd_signal': macd['signal'][-1] if macd['signal'][-1] is not None else 0.0,
            'macd_histogram': macd['histogram'][-1] if macd['histogram'][-1] is not None else 0.0,
            'bb_position': self._calc_bb_position(closes[-1], bb),
            'bb_width': self._calc_bb_width(bb),
            'atr': atr[-1] if atr[-1] is not None else 0.0,
            'stoch_k': stoch['k'][-1] if stoch['k'][-1] is not None else 50.0,
            'stoch_d': stoch['d'][-1] if stoch['d'][-1] is not None else 50.0,
        }

        # Rolling returns (handle insufficient data gracefully)
        current['return_5d'] = (
            (closes[-1] - closes[-6]) / closes[-6]
            if len(closes) >= 6 and closes[-6] != 0
            else 0.0
        )
        current['return_10d'] = (
            (closes[-1] - closes[-11]) / closes[-11]
            if len(closes) >= 11 and closes[-11] != 0
            else 0.0
        )
        current['return_20d'] = (
            (closes[-1] - closes[-21]) / closes[-21]
            if len(closes) >= 21 and closes[-21] != 0
            else 0.0
        )

        # Rolling volatility (coefficient of variation)
        if len(closes) >= 20:
            mean_20 = np.mean(closes[-20:])
            current['volatility_20d'] = (
                np.std(closes[-20:]) / mean_20 if mean_20 > 0 else 0.0
            )
        else:
            current['volatility_20d'] = 0.0

        # Volume ratio
        avg_vol = sum(volumes[-20:]) / min(20, len(volumes)) if volumes else 1
        current['volume_ratio'] = (
            volumes[-1] / avg_vol if avg_vol > 0 else 1.0
        )

        # Price-to-SMA relationships
        current['price_to_sma_20'] = (
            (closes[-1] - sma_20[-1]) / sma_20[-1]
            if sma_20[-1] is not None and sma_20[-1] != 0
            else 0.0
        )
        current['price_to_sma_50'] = (
            (closes[-1] - sma_50[-1]) / sma_50[-1]
            if sma_50[-1] is not None and sma_50[-1] != 0
            else 0.0
        )

        # Convert to numpy array (feature vector) in correct order
        feature_vector = np.array([[current[f] for f in FEATURE_NAMES]])

        logger.debug(
            "Features extracted",
            features=current,
            shape=feature_vector.shape,
        )

        return feature_vector

    def _build_signal_features(
        self, ohlcv_data: List[dict], feature_dict: Dict[str, float]
    ) -> SignalFeatures:
        """
        Build SignalFeatures object from OHLCV data and extracted features.

        Args:
            ohlcv_data: List of OHLCV bar dictionaries
            feature_dict: Dictionary of extracted feature values

        Returns:
            SignalFeatures object for audit trail
        """
        highs = [bar['high'] for bar in ohlcv_data]
        lows = [bar['low'] for bar in ohlcv_data]
        closes = [bar['close'] for bar in ohlcv_data]
        volumes = [bar['volume'] for bar in ohlcv_data]

        # Calculate additional indicators for SignalFeatures
        sma_20 = TechnicalIndicators.sma(closes, 20)
        sma_50 = TechnicalIndicators.sma(closes, 50)
        sma_200 = TechnicalIndicators.sma(closes, 200) if len(closes) >= 200 else [None] * len(closes)
        bb = TechnicalIndicators.bollinger_bands(closes)
        atr = TechnicalIndicators.atr(highs, lows, closes)
        adx_data = TechnicalIndicators.adx(highs, lows, closes)

        # Calculate volume metrics
        avg_volume = sum(volumes[-20:]) / min(20, len(volumes)) if volumes else 1

        # Calculate trend strength
        trend_strength = 0.0
        if sma_20[-1] and sma_50[-1]:
            sma_spread = (sma_20[-1] - sma_50[-1]) / sma_50[-1]
            trend_strength = max(-1.0, min(1.0, sma_spread * 10))

        return SignalFeatures(
            price=closes[-1],
            sma_20=sma_20[-1] if sma_20[-1] else closes[-1],
            sma_50=sma_50[-1] if sma_50[-1] else closes[-1],
            sma_200=sma_200[-1],
            rsi_14=feature_dict.get('rsi', 50.0),
            macd=feature_dict.get('macd', 0.0),
            macd_signal=feature_dict.get('macd_signal', 0.0),
            macd_histogram=feature_dict.get('macd_histogram', 0.0),
            bb_upper=bb['upper'][-1] if bb['upper'][-1] else 0.0,
            bb_middle=bb['middle'][-1] if bb['middle'][-1] else 0.0,
            bb_lower=bb['lower'][-1] if bb['lower'][-1] else 0.0,
            bb_width=feature_dict.get('bb_width', 0.0),
            bb_position=feature_dict.get('bb_position', 0.5),
            atr_14=atr[-1] if atr[-1] else 0.0,
            volume=int(volumes[-1]),
            volume_sma_20=avg_volume,
            volume_ratio=feature_dict.get('volume_ratio', 1.0),
            adx_14=adx_data['adx'][-1] if adx_data['adx'][-1] else None,
            trend_strength=trend_strength,
            stoch_k=feature_dict.get('stoch_k'),
            stoch_d=feature_dict.get('stoch_d'),
            price_to_sma_20=feature_dict.get('price_to_sma_20', 0.0),
            price_to_sma_50=feature_dict.get('price_to_sma_50', 0.0),
        )

    def _create_signal(
        self,
        symbol: str,
        market: str,
        ohlcv_data: List[dict],
        data_hash: str,
        signal_side: SignalSide,
        confidence: float,
        reason: str,
        feature_dict: Optional[Dict[str, float]] = None,
    ) -> Signal:
        """
        Create a Signal object with all required fields.

        Args:
            symbol: Ticker symbol
            market: Market identifier
            ohlcv_data: OHLCV data for feature calculation
            data_hash: Data hash for audit trail
            signal_side: BUY or SELL
            confidence: Confidence score (0-1)
            reason: Human-readable reason for the signal
            feature_dict: Optional pre-calculated features

        Returns:
            Complete Signal object
        """
        closes = [bar['close'] for bar in ohlcv_data]
        highs = [bar['high'] for bar in ohlcv_data]
        lows = [bar['low'] for bar in ohlcv_data]

        # Calculate ATR for stop/target
        atr = TechnicalIndicators.atr(highs, lows, closes)
        current_atr = atr[-1] if atr[-1] else closes[-1] * 0.02  # Default 2% if no ATR

        # Build features if not provided
        if feature_dict is None:
            features_array = self._extract_features(ohlcv_data)
            if features_array is not None:
                feature_dict = dict(zip(FEATURE_NAMES, features_array[0]))
            else:
                feature_dict = {}

        # Build SignalFeatures
        features = self._build_signal_features(ohlcv_data, feature_dict)

        # Calculate entry, stop, and target prices
        entry_price = closes[-1]

        if signal_side == SignalSide.BUY:
            stop_loss = entry_price - (current_atr * self.config['atr_multiplier_stop'])
            target_price = entry_price + (current_atr * self.config['atr_multiplier_target'])
        else:
            stop_loss = entry_price + (current_atr * self.config['atr_multiplier_stop'])
            target_price = entry_price - (current_atr * self.config['atr_multiplier_target'])

        # Determine entry type
        entry_type = EntryType.MARKET
        suggested_limit_price = None

        if 0.5 < confidence < 0.85:
            entry_type = EntryType.LIMIT
            offset = entry_price * self.config['limit_order_offset_pct']
            if signal_side == SignalSide.BUY:
                suggested_limit_price = entry_price - offset
            else:
                suggested_limit_price = entry_price + offset

        # Calculate confidence factors using scorer
        indicator_dict = {
            "rsi": feature_dict.get('rsi', 50.0),
            "macd_histogram": feature_dict.get('macd_histogram', 0.0),
            "trend_strength": features.trend_strength,
            "volume_ratio": feature_dict.get('volume_ratio', 1.0),
            "price_to_sma_20": feature_dict.get('price_to_sma_20', 0.0),
            "stoch_k": feature_dict.get('stoch_k'),
            "bb_position": feature_dict.get('bb_position', 0.5),
        }

        # Get confidence factors breakdown
        _, confidence_factors = self.scorer.calculate_confidence(
            signal_side.value, indicator_dict
        )

        # Add ML-specific confidence factors
        confidence_factors["ml_probability"] = confidence

        # Generate invalidation rules
        invalidation_rules = generate_invalidation_rules(
            signal_side=signal_side.value,
            entry_price=entry_price,
            stop_loss=stop_loss,
            target_price=target_price,
            features=features.to_dict(),
            strategy_type="momentum",  # Use momentum rules as base
            atr=current_atr,
        )

        return Signal(
            symbol=symbol,
            side=signal_side,
            strategy_id="ml_signal_v1",
            strategy_version=self.VERSION,
            market=market,
            entry_type=entry_type,
            suggested_limit_price=suggested_limit_price,
            time_in_force=TimeInForce.DAY,
            entry_price=entry_price,
            target_price=target_price,
            stop_loss=stop_loss,
            confidence_score=confidence,
            confidence_factors=confidence_factors,
            reason=reason,
            features=features,
            invalidation_rules=invalidation_rules,
            valid_until=datetime.utcnow() + timedelta(days=1),
            data_snapshot_hash=data_hash,
            rule_version_id=f"ml_signal_v1_{self.VERSION}",
        )

    def _fallback_signal(
        self,
        symbol: str,
        market: str,
        ohlcv_data: List[dict],
        data_hash: str,
    ) -> Optional[Signal]:
        """
        Fallback to momentum-like signal when model unavailable.

        Uses simple SMA crossover with RSI confirmation to generate
        signals when the ML model is not loaded (cold start).

        Args:
            symbol: Ticker symbol
            market: Market identifier
            ohlcv_data: List of OHLCV bars
            data_hash: Hash of the data for audit trail

        Returns:
            Signal object or None if no signal detected
        """
        if len(ohlcv_data) < self.config['min_data_bars']:
            logger.debug(
                "Insufficient data for fallback signal",
                symbol=symbol,
                bars=len(ohlcv_data),
            )
            return None

        closes = [bar['close'] for bar in ohlcv_data]

        # Calculate indicators for fallback
        rsi = TechnicalIndicators.rsi(closes, 14)
        sma_20 = TechnicalIndicators.sma(closes, 20)
        sma_50 = TechnicalIndicators.sma(closes, 50)

        current_rsi = rsi[-1] if rsi[-1] else 50.0
        current_sma_20 = sma_20[-1]
        current_sma_50 = sma_50[-1]

        # Simple momentum rules
        if current_sma_20 is None or current_sma_50 is None:
            logger.debug("Insufficient SMA data for fallback", symbol=symbol)
            return None

        # BUY: Fast SMA above slow SMA, RSI not overbought
        if current_sma_20 > current_sma_50 and current_rsi < 70:
            return self._create_signal(
                symbol=symbol,
                market=market,
                ohlcv_data=ohlcv_data,
                data_hash=data_hash,
                signal_side=SignalSide.BUY,
                confidence=0.6,
                reason=(
                    f"ML fallback: Momentum bullish "
                    f"(SMA20 {current_sma_20:.2f} > SMA50 {current_sma_50:.2f}, "
                    f"RSI {current_rsi:.1f})"
                ),
            )

        # SELL: Fast SMA below slow SMA, RSI not oversold
        elif current_sma_20 < current_sma_50 and current_rsi > 30:
            return self._create_signal(
                symbol=symbol,
                market=market,
                ohlcv_data=ohlcv_data,
                data_hash=data_hash,
                signal_side=SignalSide.SELL,
                confidence=0.6,
                reason=(
                    f"ML fallback: Momentum bearish "
                    f"(SMA20 {current_sma_20:.2f} < SMA50 {current_sma_50:.2f}, "
                    f"RSI {current_rsi:.1f})"
                ),
            )

        return None

    def analyze(
        self,
        symbol: str,
        market: str,
        ohlcv_data: List[dict],
        data_hash: str,
    ) -> Optional[Signal]:
        """
        Analyze market data and generate a signal using ML model.

        Main entry point for signal generation. Uses the trained Random Forest
        model to predict signal direction from technical features. Falls back
        to momentum-based rules when no model is available.

        Args:
            symbol: Ticker symbol (e.g., "AAPL")
            market: Market identifier (e.g., "US", "ASX")
            ohlcv_data: List of OHLCV bar dictionaries with keys:
                       'open', 'high', 'low', 'close', 'volume', 'timestamp'
            data_hash: Hash of the data for audit trail integrity

        Returns:
            Signal object if a signal is generated, None otherwise.
            Returns None when:
            - Insufficient data (< min_data_bars)
            - No model and fallback disabled
            - Model prediction probability below threshold
        """
        logger.info(
            "Analyzing with ML Signal strategy",
            symbol=symbol,
            market=market,
            bars=len(ohlcv_data),
            model_loaded=self.model is not None,
        )

        # Validate data
        if len(ohlcv_data) < self.config['min_data_bars']:
            logger.warning(
                "Insufficient data for analysis",
                symbol=symbol,
                bars=len(ohlcv_data),
                required=self.config['min_data_bars'],
            )
            return None

        # Check if model is available
        if self.model is None:
            if self.config['use_fallback_on_cold_start']:
                logger.info(
                    "No model loaded, using fallback strategy",
                    symbol=symbol,
                )
                return self._fallback_signal(symbol, market, ohlcv_data, data_hash)
            else:
                logger.warning(
                    "No model loaded and fallback disabled",
                    symbol=symbol,
                )
                return None

        # Extract features for ML model
        features = self._extract_features(ohlcv_data)
        if features is None:
            logger.warning("Feature extraction failed", symbol=symbol)
            return None

        # Create feature dictionary for signal building
        feature_dict = dict(zip(FEATURE_NAMES, features[0]))

        try:
            # Get prediction probabilities from model
            probabilities = self.model.predict_proba(features)[0]

            # Determine class mapping
            n_classes = len(probabilities)

            if n_classes == 3:
                # Classes: [0=SELL, 1=HOLD, 2=BUY]
                prob_sell = probabilities[0]
                prob_hold = probabilities[1]
                prob_buy = probabilities[2]
            elif n_classes == 2:
                # Binary classes: [0=SELL, 1=BUY]
                prob_sell = probabilities[0]
                prob_buy = probabilities[1]
                prob_hold = 0.0
            else:
                logger.error(
                    "Unexpected number of classes from model",
                    n_classes=n_classes,
                    symbol=symbol,
                )
                return None

            logger.debug(
                "ML prediction probabilities",
                symbol=symbol,
                prob_buy=prob_buy,
                prob_sell=prob_sell,
                prob_hold=prob_hold,
            )

            # Generate signal based on probability thresholds
            if prob_buy > self.config['buy_probability_threshold']:
                signal_side = SignalSide.BUY
                confidence = prob_buy
                reason = (
                    f"ML model predicts BUY with {prob_buy:.1%} probability "
                    f"(threshold: {self.config['buy_probability_threshold']:.1%})"
                )
            elif prob_sell > self.config['sell_probability_threshold']:
                signal_side = SignalSide.SELL
                confidence = prob_sell
                reason = (
                    f"ML model predicts SELL with {prob_sell:.1%} probability "
                    f"(threshold: {self.config['sell_probability_threshold']:.1%})"
                )
            else:
                logger.debug(
                    "No strong ML signal",
                    symbol=symbol,
                    prob_buy=prob_buy,
                    prob_sell=prob_sell,
                    buy_threshold=self.config['buy_probability_threshold'],
                    sell_threshold=self.config['sell_probability_threshold'],
                )
                return None

            # Create and return the signal
            signal = self._create_signal(
                symbol=symbol,
                market=market,
                ohlcv_data=ohlcv_data,
                data_hash=data_hash,
                signal_side=signal_side,
                confidence=confidence,
                reason=reason,
                feature_dict=feature_dict,
            )

            logger.info(
                "ML signal generated",
                symbol=symbol,
                side=signal.side.value,
                confidence=signal.confidence_score,
                entry_price=signal.entry_price,
                stop_loss=signal.stop_loss,
                target_price=signal.target_price,
            )

            return signal

        except Exception as e:
            logger.error(
                "ML prediction failed",
                symbol=symbol,
                error=str(e),
                error_type=type(e).__name__,
            )

            # Fall back to momentum strategy on prediction error
            if self.config['use_fallback_on_cold_start']:
                logger.info(
                    "Falling back to momentum strategy after ML error",
                    symbol=symbol,
                )
                return self._fallback_signal(symbol, market, ohlcv_data, data_hash)

            return None
