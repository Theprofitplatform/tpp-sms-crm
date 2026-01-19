#!/usr/bin/env python3
"""
ML Signal Model Training Pipeline

Trains a Random Forest classifier for the ML Signals strategy using
historical market data and technical indicators.

Features (16 total - must match ml_signals.py):
- RSI, MACD, MACD Signal, MACD Histogram
- Bollinger Band Position, Bollinger Band Width
- ATR, Stochastic K, Stochastic D
- Returns (5d, 10d, 20d), Volatility (20d)
- Volume Ratio, Price-to-SMA (20, 50)

Labels:
- BUY (1): Forward return > threshold
- SELL (0): Forward return < -threshold
- Filtered: Returns between thresholds (not used for training)

Usage:
    python scripts/ml/train_signal_model.py
    python scripts/ml/train_signal_model.py --symbols AAPL,MSFT,GOOGL --years 3
    python scripts/ml/train_signal_model.py --output models/rf_signal_v1.joblib

Dependencies:
    pip install scikit-learn joblib pandas numpy httpx
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

import numpy as np
import pandas as pd
import httpx

# Add services to path for indicator access
SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "services" / "signal"))

from indicators.technical import TechnicalIndicators

# Configuration
DATA_SERVICE_URL = os.getenv('DATA_SERVICE_URL', 'http://localhost:5101')

# Feature names (must match ml_signals.py FEATURE_NAMES exactly)
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

# Default training symbols (diverse sectors)
DEFAULT_SYMBOLS = [
    # Tech
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'AMD', 'INTC',
    # Finance
    'JPM', 'BAC', 'GS', 'MS',
    # Energy
    'XOM', 'CVX',
    # Consumer
    'WMT', 'HD', 'NKE', 'DIS',
    # Other
    'TSLA', 'NFLX',
]


class MLTrainingPipeline:
    """Pipeline for training ML signal models."""

    def __init__(
        self,
        symbols: List[str],
        years: int = 3,
        forward_days: int = 5,
        return_threshold: float = 0.02,
        test_size: float = 0.2,
    ):
        """
        Initialize training pipeline.

        Args:
            symbols: List of symbols to train on
            years: Years of historical data to use
            forward_days: Days ahead to calculate return label
            return_threshold: Threshold for BUY/SELL classification (e.g., 0.02 = 2%)
            test_size: Fraction of data to use for testing
        """
        self.symbols = symbols
        self.years = years
        self.forward_days = forward_days
        self.return_threshold = return_threshold
        self.test_size = test_size

        self.end_date = date.today()
        self.start_date = self.end_date - timedelta(days=years * 365)

    async def fetch_data(self, symbol: str) -> Optional[pd.DataFrame]:
        """Fetch OHLCV data from data service."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{DATA_SERVICE_URL}/api/v1/ohlcv/{symbol}",
                    params={
                        "market": "US",
                        "start": self.start_date.isoformat(),
                        "end": self.end_date.isoformat(),
                    },
                    timeout=60.0,
                )

                if response.status_code != 200:
                    print(f"  Warning: Failed to fetch {symbol}")
                    return None

                data = response.json()
                ohlcv_list = data.get("data", [])

                if not ohlcv_list:
                    return None

                df = pd.DataFrame(ohlcv_list)

                # Standardize date column
                if 'time' in df.columns:
                    df['date'] = pd.to_datetime(df['time'])
                elif 'date' in df.columns:
                    df['date'] = pd.to_datetime(df['date'])

                df = df.sort_values('date').reset_index(drop=True)
                return df

            except Exception as e:
                print(f"  Error fetching {symbol}: {e}")
                return None

    def _calc_bb_position(self, price: float, upper: float, lower: float) -> float:
        """Calculate position within Bollinger Bands (0-1)."""
        if upper <= lower:
            return 0.5
        return (price - lower) / (upper - lower)

    def _calc_bb_width(self, upper: float, middle: float, lower: float) -> float:
        """Calculate Bollinger Band width as % of middle."""
        if middle == 0 or middle is None:
            return 0.0
        return (upper - lower) / middle

    def extract_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Extract features from OHLCV dataframe.

        Args:
            df: DataFrame with columns: open, high, low, close, volume, date

        Returns:
            DataFrame with feature columns added
        """
        if len(df) < 60:
            return pd.DataFrame()

        # Extract arrays
        highs = df['high'].tolist()
        lows = df['low'].tolist()
        closes = df['close'].tolist()
        volumes = df['volume'].tolist()

        # Calculate technical indicators
        rsi = TechnicalIndicators.rsi(closes, 14)
        macd = TechnicalIndicators.macd(closes)
        bb = TechnicalIndicators.bollinger_bands(closes)
        atr = TechnicalIndicators.atr(highs, lows, closes)
        stoch = TechnicalIndicators.stochastic(highs, lows, closes)
        sma_20 = TechnicalIndicators.sma(closes, 20)
        sma_50 = TechnicalIndicators.sma(closes, 50)

        # Build feature arrays
        n = len(df)
        features = {
            'rsi': [rsi[i] if rsi[i] is not None else 50.0 for i in range(n)],
            'macd': [macd['macd'][i] if macd['macd'][i] is not None else 0.0 for i in range(n)],
            'macd_signal': [macd['signal'][i] if macd['signal'][i] is not None else 0.0 for i in range(n)],
            'macd_histogram': [macd['histogram'][i] if macd['histogram'][i] is not None else 0.0 for i in range(n)],
            'atr': [atr[i] if atr[i] is not None else 0.0 for i in range(n)],
            'stoch_k': [stoch['k'][i] if stoch['k'][i] is not None else 50.0 for i in range(n)],
            'stoch_d': [stoch['d'][i] if stoch['d'][i] is not None else 50.0 for i in range(n)],
        }

        # Bollinger Band features
        bb_positions = []
        bb_widths = []
        for i in range(n):
            upper = bb['upper'][i] if bb['upper'][i] is not None else closes[i]
            middle = bb['middle'][i] if bb['middle'][i] is not None else closes[i]
            lower = bb['lower'][i] if bb['lower'][i] is not None else closes[i]
            bb_positions.append(self._calc_bb_position(closes[i], upper, lower))
            bb_widths.append(self._calc_bb_width(upper, middle, lower))

        features['bb_position'] = bb_positions
        features['bb_width'] = bb_widths

        # Rolling returns
        features['return_5d'] = [
            (closes[i] - closes[i-5]) / closes[i-5] if i >= 5 and closes[i-5] != 0 else 0.0
            for i in range(n)
        ]
        features['return_10d'] = [
            (closes[i] - closes[i-10]) / closes[i-10] if i >= 10 and closes[i-10] != 0 else 0.0
            for i in range(n)
        ]
        features['return_20d'] = [
            (closes[i] - closes[i-20]) / closes[i-20] if i >= 20 and closes[i-20] != 0 else 0.0
            for i in range(n)
        ]

        # Rolling volatility
        volatility = []
        for i in range(n):
            if i >= 19:
                window = closes[i-19:i+1]
                mean_val = np.mean(window)
                vol = np.std(window) / mean_val if mean_val > 0 else 0.0
            else:
                vol = 0.0
            volatility.append(vol)
        features['volatility_20d'] = volatility

        # Volume ratio
        volume_ratios = []
        for i in range(n):
            if i >= 19:
                avg_vol = np.mean(volumes[i-19:i+1])
                ratio = volumes[i] / avg_vol if avg_vol > 0 else 1.0
            else:
                ratio = 1.0
            volume_ratios.append(ratio)
        features['volume_ratio'] = volume_ratios

        # Price-to-SMA
        features['price_to_sma_20'] = [
            (closes[i] - sma_20[i]) / sma_20[i] if sma_20[i] is not None and sma_20[i] != 0 else 0.0
            for i in range(n)
        ]
        features['price_to_sma_50'] = [
            (closes[i] - sma_50[i]) / sma_50[i] if sma_50[i] is not None and sma_50[i] != 0 else 0.0
            for i in range(n)
        ]

        # Add features to dataframe
        for name in FEATURE_NAMES:
            df[name] = features[name]

        return df

    def create_labels(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create labels based on forward returns.

        Labels:
            1 = BUY (forward return > threshold)
            0 = SELL (forward return < -threshold)
            NaN = HOLD (excluded from training)

        Args:
            df: DataFrame with 'close' column

        Returns:
            DataFrame with 'label' and 'forward_return' columns added
        """
        closes = df['close'].values

        # Calculate forward returns
        forward_returns = []
        for i in range(len(df)):
            if i + self.forward_days < len(df):
                future_price = closes[i + self.forward_days]
                current_price = closes[i]
                ret = (future_price - current_price) / current_price
            else:
                ret = np.nan
            forward_returns.append(ret)

        df['forward_return'] = forward_returns

        # Create labels
        labels = []
        for ret in forward_returns:
            if pd.isna(ret):
                labels.append(np.nan)
            elif ret > self.return_threshold:
                labels.append(1)  # BUY
            elif ret < -self.return_threshold:
                labels.append(0)  # SELL
            else:
                labels.append(np.nan)  # HOLD (exclude)

        df['label'] = labels

        return df

    async def prepare_dataset(self) -> Tuple[np.ndarray, np.ndarray, pd.DataFrame]:
        """
        Prepare full training dataset from all symbols.

        Returns:
            Tuple of (X features, y labels, full dataframe)
        """
        all_data = []

        print(f"\nFetching data for {len(self.symbols)} symbols...")
        print(f"Period: {self.start_date} to {self.end_date}")

        for symbol in self.symbols:
            print(f"  Processing {symbol}...", end=" ")

            df = await self.fetch_data(symbol)
            if df is None or len(df) < 100:
                print("skipped (insufficient data)")
                continue

            # Extract features
            df = self.extract_features(df)
            if df.empty:
                print("skipped (feature extraction failed)")
                continue

            # Create labels
            df = self.create_labels(df)

            # Add symbol column
            df['symbol'] = symbol

            # Remove rows with insufficient history (first 60 days)
            df = df.iloc[60:].reset_index(drop=True)

            all_data.append(df)
            print(f"OK ({len(df)} samples)")

        if not all_data:
            raise ValueError("No valid data collected")

        # Combine all data
        full_df = pd.concat(all_data, ignore_index=True)

        # Filter out NaN labels (HOLD samples)
        valid_df = full_df.dropna(subset=['label'])

        print(f"\nTotal samples: {len(full_df)}")
        print(f"Valid samples (BUY/SELL): {len(valid_df)}")

        # Extract X and y
        X = valid_df[FEATURE_NAMES].values
        y = valid_df['label'].values.astype(int)

        # Check for NaN/inf in features
        X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

        return X, y, full_df

    def train_model(
        self,
        X: np.ndarray,
        y: np.ndarray,
        n_estimators: int = 200,
        max_depth: int = 10,
        min_samples_leaf: int = 20,
    ) -> Any:
        """
        Train Random Forest classifier.

        Args:
            X: Feature matrix
            y: Label vector
            n_estimators: Number of trees
            max_depth: Maximum tree depth
            min_samples_leaf: Minimum samples per leaf

        Returns:
            Trained model
        """
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import cross_val_score, train_test_split
        from sklearn.metrics import classification_report, confusion_matrix

        print(f"\nTraining Random Forest Classifier...")
        print(f"  Samples: {len(X)}")
        print(f"  Features: {X.shape[1]}")
        print(f"  Class distribution: SELL={sum(y==0)}, BUY={sum(y==1)}")

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=self.test_size, random_state=42, stratify=y
        )

        # Train model
        model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_leaf=min_samples_leaf,
            class_weight='balanced',
            random_state=42,
            n_jobs=-1,
        )

        model.fit(X_train, y_train)

        # Evaluate
        print("\n" + "="*50)
        print("MODEL EVALUATION")
        print("="*50)

        # Cross-validation
        cv_scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')
        print(f"\nCross-validation accuracy: {cv_scores.mean():.3f} (+/- {cv_scores.std()*2:.3f})")

        # Test set performance
        y_pred = model.predict(X_test)
        print(f"\nTest set results:")
        print(classification_report(y_test, y_pred, target_names=['SELL', 'BUY']))

        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        print("Confusion Matrix:")
        print(f"  {'':>10} Pred SELL  Pred BUY")
        print(f"  {'True SELL':>10}    {cm[0,0]:>5}     {cm[0,1]:>5}")
        print(f"  {'True BUY':>10}    {cm[1,0]:>5}     {cm[1,1]:>5}")

        # Feature importance
        print("\nTop 10 Feature Importances:")
        importances = list(zip(FEATURE_NAMES, model.feature_importances_))
        importances.sort(key=lambda x: x[1], reverse=True)
        for name, imp in importances[:10]:
            print(f"  {name:20} {imp:.4f}")

        # Calculate trading metrics
        y_proba = model.predict_proba(X_test)
        high_conf_mask = (y_proba.max(axis=1) > 0.65)

        if high_conf_mask.sum() > 0:
            high_conf_pred = y_pred[high_conf_mask]
            high_conf_true = y_test[high_conf_mask]
            high_conf_acc = (high_conf_pred == high_conf_true).mean()
            print(f"\nHigh confidence (>65%) predictions:")
            print(f"  Count: {high_conf_mask.sum()}")
            print(f"  Accuracy: {high_conf_acc:.3f}")

        return model

    def save_model(self, model: Any, output_path: str) -> None:
        """Save trained model to disk."""
        import joblib

        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        joblib.dump(model, output_path)
        print(f"\nModel saved to: {output_path}")

        # Also save metadata
        metadata = {
            "feature_names": FEATURE_NAMES,
            "symbols_trained": self.symbols,
            "training_period": {
                "start": str(self.start_date),
                "end": str(self.end_date),
            },
            "forward_days": self.forward_days,
            "return_threshold": self.return_threshold,
            "model_type": "RandomForestClassifier",
            "classes": ["SELL", "BUY"],
        }

        metadata_path = output_path.with_suffix('.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        print(f"Metadata saved to: {metadata_path}")


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Train ML Signal Model")
    parser.add_argument("--symbols", type=str, default=None,
                       help="Comma-separated symbols (default: diverse set of 20)")
    parser.add_argument("--years", type=int, default=3,
                       help="Years of historical data (default: 3)")
    parser.add_argument("--forward-days", type=int, default=5,
                       help="Days ahead for return calculation (default: 5)")
    parser.add_argument("--threshold", type=float, default=0.02,
                       help="Return threshold for BUY/SELL (default: 0.02 = 2%%)")
    parser.add_argument("--output", type=str,
                       default="models/ml_signal_rf.joblib",
                       help="Output model path")
    parser.add_argument("--n-estimators", type=int, default=200,
                       help="Number of trees (default: 200)")
    parser.add_argument("--max-depth", type=int, default=10,
                       help="Max tree depth (default: 10)")

    args = parser.parse_args()

    # Parse symbols
    if args.symbols:
        symbols = [s.strip().upper() for s in args.symbols.split(",")]
    else:
        symbols = DEFAULT_SYMBOLS

    print("="*60)
    print("ML SIGNAL MODEL TRAINING PIPELINE")
    print("="*60)
    print(f"Symbols: {len(symbols)}")
    print(f"Years: {args.years}")
    print(f"Forward days: {args.forward_days}")
    print(f"Return threshold: {args.threshold*100:.1f}%")
    print(f"Output: {args.output}")

    # Create pipeline
    pipeline = MLTrainingPipeline(
        symbols=symbols,
        years=args.years,
        forward_days=args.forward_days,
        return_threshold=args.threshold,
    )

    # Prepare dataset
    X, y, full_df = await pipeline.prepare_dataset()

    # Train model
    model = pipeline.train_model(
        X, y,
        n_estimators=args.n_estimators,
        max_depth=args.max_depth,
    )

    # Save model
    output_path = PROJECT_ROOT / args.output
    pipeline.save_model(model, output_path)

    print("\n" + "="*60)
    print("TRAINING COMPLETE")
    print("="*60)
    print(f"\nTo use this model, update your ml_signals strategy config:")
    print(f'  {{"model_path": "{output_path}"}}')


if __name__ == "__main__":
    asyncio.run(main())
