"""
Intelligence Module - Smart trading components for adaptive strategy execution.

Components:
- MarketRegimeDetector: Classifies market conditions (trending, ranging, high-vol)
- StrategyPerformanceTracker: Tracks and scores strategy performance
- StrategyEnsemble: Meta-strategy combining multiple strategies with intelligent weighting
- AdaptivePositionSizer: Kelly criterion-based position sizing with regime adjustments

Usage:
    from intelligence import (
        MarketRegimeDetector,
        StrategyPerformanceTracker,
        StrategyEnsemble,
        AdaptivePositionSizer,
    )

    # Detect market regime
    regime_detector = MarketRegimeDetector()
    regime = regime_detector.detect(ohlcv_data)
    print(f"Regime: {regime.regime_type}, Confidence: {regime.confidence:.1%}")

    # Track strategy performance
    tracker = StrategyPerformanceTracker(config={"data_dir": "/app/data"})
    tracker.record_signal_outcome(signal_id, strategy_id, symbol, side, entry, exit, pnl, hours)
    weights = tracker.get_strategy_weights()

    # Use ensemble for combined signals
    ensemble = StrategyEnsemble(strategies, regime_detector, tracker)
    signal = ensemble.analyze(symbol, market, ohlcv_data, data_hash)

    # Calculate position size
    sizer = AdaptivePositionSizer(equity=100000, performance_tracker=tracker)
    size = sizer.calculate_position_size(
        symbol="AAPL",
        entry_price=150.0,
        stop_loss=145.0,
        confidence=0.75,
        regime_type=regime.regime_type.value,
        current_drawdown_pct=0.05,
    )
    print(f"Position: {size.shares} shares, Risk: {size.risk_pct:.1%}")
"""

from .regime_detector import (
    MarketRegimeDetector,
    RegimeAnalysis,
    RegimeType,
)

from .performance_tracker import (
    StrategyPerformanceTracker,
    StrategyMetrics,
    SignalOutcome,
)

from .ensemble import (
    StrategyEnsemble,
    StrategyVote,
    EnsembleSignal,
)

from .position_sizer import (
    AdaptivePositionSizer,
    PositionSizeResult,
)

__all__ = [
    # Regime Detection
    "MarketRegimeDetector",
    "RegimeAnalysis",
    "RegimeType",

    # Performance Tracking
    "StrategyPerformanceTracker",
    "StrategyMetrics",
    "SignalOutcome",

    # Ensemble
    "StrategyEnsemble",
    "StrategyVote",
    "EnsembleSignal",

    # Position Sizing
    "AdaptivePositionSizer",
    "PositionSizeResult",
]
