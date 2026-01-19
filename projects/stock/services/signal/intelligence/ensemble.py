"""
Strategy Ensemble - Meta-strategy that intelligently combines signals from multiple strategies.

Key Features:
1. Runs all strategies and aggregates signals
2. Weights signals by strategy performance and market regime
3. Requires consensus for high-confidence signals
4. Generates superior combined signals

Usage:
    ensemble = StrategyEnsemble(strategies_dict, regime_detector, performance_tracker)
    signal = ensemble.generate_signal(symbol, market, ohlcv_data, data_hash)
"""

import uuid
import hashlib
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from collections import defaultdict

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from models import Signal, SignalSide, EntryType, TimeInForce
from .regime_detector import MarketRegimeDetector, RegimeAnalysis, RegimeType
from .performance_tracker import StrategyPerformanceTracker


@dataclass
class StrategyVote:
    """A strategy's vote on a signal."""
    strategy_id: str
    side: SignalSide
    confidence: float
    entry_price: float
    stop_loss: float
    target_price: float
    weight: float  # Strategy weight from performance
    features: Dict[str, Any]
    reason: str


@dataclass
class EnsembleSignal:
    """Enhanced signal from ensemble analysis."""
    signal: Optional[Signal]
    votes: List[StrategyVote]
    consensus_strength: float  # 0-1, how much strategies agree
    regime: RegimeAnalysis
    participating_strategies: int
    agreeing_strategies: int


class StrategyEnsemble:
    """
    Meta-strategy that combines signals from multiple strategies.

    Approach:
    1. Detect market regime
    2. Get performance-based weights for each strategy
    3. Run all strategies and collect signals
    4. Aggregate signals with weighted voting
    5. Require consensus threshold for final signal
    """

    DEFAULT_CONFIG = {
        # Consensus requirements
        "min_strategies_for_signal": 2,  # At least 2 strategies must agree
        "consensus_threshold": 0.6,  # 60% weighted agreement required
        "high_confidence_threshold": 0.75,  # For high confidence signals

        # Signal aggregation
        "use_regime_weighting": True,
        "use_performance_weighting": True,
        "combine_stops_method": "conservative",  # "conservative", "average", "aggressive"
        "combine_targets_method": "average",

        # Confidence adjustment
        "consensus_confidence_boost": 0.1,  # Boost confidence if high consensus
        "regime_confidence_boost": 0.05,  # Boost if regime favors strategy

        # Strategy selection
        "max_strategies_per_signal": 5,  # Don't use more than 5 strategies
        "exclude_conflicting": True,  # Don't generate if strong opposition

        # Position sizing hints
        "base_position_size_pct": 5.0,  # Base position size
    }

    NAME = "Strategy Ensemble"
    TYPE = "meta"
    VERSION = "1.0.0"
    DESCRIPTION = "Intelligent ensemble combining multiple strategies with regime and performance weighting"

    def __init__(
        self,
        strategies: Dict[str, Any],  # strategy_id -> strategy instance
        regime_detector: Optional[MarketRegimeDetector] = None,
        performance_tracker: Optional[StrategyPerformanceTracker] = None,
        config: Optional[Dict] = None,
    ):
        self.strategies = strategies
        self.regime_detector = regime_detector or MarketRegimeDetector()
        self.performance_tracker = performance_tracker or StrategyPerformanceTracker()
        self.config = {**self.DEFAULT_CONFIG, **(config or {})}

    def analyze(
        self,
        symbol: str,
        market: str,
        ohlcv_data: List[dict],
        data_hash: str,
    ) -> Optional[Signal]:
        """
        Generate an ensemble signal by combining multiple strategies.

        Args:
            symbol: Stock symbol
            market: Market identifier
            ohlcv_data: OHLCV data bars
            data_hash: Hash of input data for audit trail

        Returns:
            Combined Signal if consensus reached, None otherwise
        """
        ensemble_result = self.analyze_full(symbol, market, ohlcv_data, data_hash)
        return ensemble_result.signal

    def analyze_full(
        self,
        symbol: str,
        market: str,
        ohlcv_data: List[dict],
        data_hash: str,
    ) -> EnsembleSignal:
        """
        Full ensemble analysis with detailed breakdown.

        Returns:
            EnsembleSignal with signal (if any), votes, and analysis details
        """
        # Step 1: Detect market regime
        regime = self.regime_detector.detect(ohlcv_data)

        # Step 2: Get strategy weights
        strategy_ids = list(self.strategies.keys())

        if self.config["use_performance_weighting"]:
            if self.config["use_regime_weighting"]:
                # Combine performance and regime weights
                perf_weights = self.performance_tracker.get_strategy_weights(strategy_ids)
                regime_weights = regime.strategy_weights

                # Blend: 60% performance, 40% regime recommendation
                weights = {}
                for sid in strategy_ids:
                    perf_w = perf_weights.get(sid, 0.1)
                    regime_w = regime_weights.get(sid, 0.1)
                    weights[sid] = 0.6 * perf_w + 0.4 * regime_w
            else:
                weights = self.performance_tracker.get_strategy_weights(strategy_ids)
        elif self.config["use_regime_weighting"]:
            weights = regime.strategy_weights
        else:
            # Equal weights
            weights = {sid: 1.0 / len(strategy_ids) for sid in strategy_ids}

        # Normalize weights
        total_weight = sum(weights.values())
        if total_weight > 0:
            weights = {k: v / total_weight for k, v in weights.items()}

        # Step 3: Run all strategies and collect votes
        votes: List[StrategyVote] = []

        for strategy_id, strategy in self.strategies.items():
            try:
                signal = strategy.analyze(symbol, market, ohlcv_data, data_hash)

                if signal and signal.side != SignalSide.HOLD:
                    votes.append(StrategyVote(
                        strategy_id=strategy_id,
                        side=signal.side,
                        confidence=signal.confidence_score,
                        entry_price=signal.entry_price,
                        stop_loss=signal.stop_loss,
                        target_price=signal.target_price,
                        weight=weights.get(strategy_id, 0.1),
                        features=signal.features.to_dict() if signal.features else {},
                        reason=signal.reason,
                    ))
            except Exception:
                pass  # Skip failed strategies

        # Step 4: Aggregate votes
        if len(votes) < self.config["min_strategies_for_signal"]:
            return EnsembleSignal(
                signal=None,
                votes=votes,
                consensus_strength=0,
                regime=regime,
                participating_strategies=len(votes),
                agreeing_strategies=0,
            )

        # Calculate weighted consensus
        buy_weight = sum(v.weight * v.confidence for v in votes if v.side == SignalSide.BUY)
        sell_weight = sum(v.weight * v.confidence for v in votes if v.side == SignalSide.SELL)
        total_weight = buy_weight + sell_weight

        if total_weight == 0:
            return EnsembleSignal(
                signal=None,
                votes=votes,
                consensus_strength=0,
                regime=regime,
                participating_strategies=len(votes),
                agreeing_strategies=0,
            )

        buy_consensus = buy_weight / total_weight
        sell_consensus = sell_weight / total_weight

        # Determine direction
        if buy_consensus >= self.config["consensus_threshold"]:
            direction = SignalSide.BUY
            consensus_strength = buy_consensus
            agreeing_votes = [v for v in votes if v.side == SignalSide.BUY]
        elif sell_consensus >= self.config["consensus_threshold"]:
            direction = SignalSide.SELL
            consensus_strength = sell_consensus
            agreeing_votes = [v for v in votes if v.side == SignalSide.SELL]
        else:
            # No consensus
            return EnsembleSignal(
                signal=None,
                votes=votes,
                consensus_strength=max(buy_consensus, sell_consensus),
                regime=regime,
                participating_strategies=len(votes),
                agreeing_strategies=max(
                    len([v for v in votes if v.side == SignalSide.BUY]),
                    len([v for v in votes if v.side == SignalSide.SELL]),
                ),
            )

        # Check for strong opposition (if enabled)
        if self.config["exclude_conflicting"]:
            opposition = 1 - consensus_strength
            if opposition > 0.35:  # More than 35% disagree
                # Reduce confidence due to disagreement
                consensus_strength *= 0.8

        # Step 5: Combine signal parameters
        signal = self._combine_signals(
            symbol=symbol,
            market=market,
            direction=direction,
            agreeing_votes=agreeing_votes,
            consensus_strength=consensus_strength,
            regime=regime,
            data_hash=data_hash,
        )

        return EnsembleSignal(
            signal=signal,
            votes=votes,
            consensus_strength=consensus_strength,
            regime=regime,
            participating_strategies=len(votes),
            agreeing_strategies=len(agreeing_votes),
        )

    def _combine_signals(
        self,
        symbol: str,
        market: str,
        direction: SignalSide,
        agreeing_votes: List[StrategyVote],
        consensus_strength: float,
        regime: RegimeAnalysis,
        data_hash: str,
    ) -> Signal:
        """Combine agreeing votes into a single signal."""
        # Weighted average for prices
        total_weight = sum(v.weight for v in agreeing_votes)

        entry_price = sum(v.entry_price * v.weight for v in agreeing_votes) / total_weight
        target_price = sum(v.target_price * v.weight for v in agreeing_votes) / total_weight

        # Stop loss: use method from config
        if self.config["combine_stops_method"] == "conservative":
            if direction == SignalSide.BUY:
                stop_loss = max(v.stop_loss for v in agreeing_votes)  # Tightest for BUY
            else:
                stop_loss = min(v.stop_loss for v in agreeing_votes)  # Tightest for SELL
        elif self.config["combine_stops_method"] == "aggressive":
            if direction == SignalSide.BUY:
                stop_loss = min(v.stop_loss for v in agreeing_votes)  # Widest for BUY
            else:
                stop_loss = max(v.stop_loss for v in agreeing_votes)  # Widest for SELL
        else:  # average
            stop_loss = sum(v.stop_loss * v.weight for v in agreeing_votes) / total_weight

        # Adjust stops for regime
        if regime.stop_loss_multiplier != 1.0:
            atr_adjustment = abs(entry_price - stop_loss) * (regime.stop_loss_multiplier - 1)
            if direction == SignalSide.BUY:
                stop_loss -= atr_adjustment
            else:
                stop_loss += atr_adjustment

        # Combined confidence
        base_confidence = sum(v.confidence * v.weight for v in agreeing_votes) / total_weight

        # Boost confidence based on consensus
        if consensus_strength >= self.config["high_confidence_threshold"]:
            base_confidence += self.config["consensus_confidence_boost"]

        # Boost if regime recommends these strategies
        participating_ids = [v.strategy_id for v in agreeing_votes]
        regime_recommended = set(regime.recommended_strategies)
        overlap = len(set(participating_ids) & regime_recommended)
        if overlap >= 2:
            base_confidence += self.config["regime_confidence_boost"]

        confidence = min(0.95, base_confidence)

        # Build reason
        strategy_names = [v.strategy_id for v in agreeing_votes]
        reason = (
            f"Ensemble: {len(agreeing_votes)} strategies agree ({', '.join(strategy_names)}). "
            f"Consensus: {consensus_strength:.1%}. Regime: {regime.regime_type.value}."
        )

        # Combine features from highest-weight vote
        best_vote = max(agreeing_votes, key=lambda v: v.weight)

        # Generate signal
        from models import SignalFeatures

        # Try to get features from best vote or create minimal features
        features = None
        if best_vote.features:
            try:
                features = SignalFeatures(**{k: v for k, v in best_vote.features.items()
                                            if k in SignalFeatures.__dataclass_fields__})
            except Exception:
                pass

        return Signal(
            id=str(uuid.uuid4()),
            time=datetime.utcnow(),
            symbol=symbol,
            market=market,
            side=direction,
            strategy_id="ensemble",
            strategy_version=self.VERSION,
            entry_price=entry_price,
            target_price=target_price,
            stop_loss=stop_loss,
            confidence_score=confidence,
            reason=reason,
            features=features,
            data_snapshot_hash=data_hash,
            entry_type=EntryType.LIMIT,
            time_in_force=TimeInForce.DAY,
            confidence_factors={
                "consensus": consensus_strength,
                "regime_alignment": overlap / max(1, len(participating_ids)),
                "strategy_count": len(agreeing_votes) / len(self.strategies),
                "base_confidence": base_confidence,
            },
        )

    def get_strategy_weights(self) -> Dict[str, float]:
        """Get current strategy weights for monitoring."""
        return self.performance_tracker.get_strategy_weights(list(self.strategies.keys()))

    def get_regime_info(self, ohlcv_data: List[dict]) -> Dict[str, Any]:
        """Get current regime information for monitoring."""
        regime = self.regime_detector.detect(ohlcv_data)
        return {
            "regime_type": regime.regime_type.value,
            "confidence": regime.confidence,
            "trend_strength": regime.trend_strength,
            "volatility_percentile": regime.volatility_percentile,
            "recommended_strategies": regime.recommended_strategies,
            "position_size_multiplier": regime.position_size_multiplier,
            "stop_loss_multiplier": regime.stop_loss_multiplier,
        }
