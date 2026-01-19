"""
Signal Data Models

Rich signal output with confidence scores, feature snapshots, and invalidation rules.
Designed for audit trail, ML feature storage, and signal validation.

Usage:
    from models import Signal, SignalFeatures, InvalidationRule

    features = SignalFeatures(
        price=185.50,
        sma_20=183.20,
        sma_50=180.00,
        rsi_14=55.0,
        ...
    )

    signal = Signal(
        symbol="AAPL",
        side=SignalSide.BUY,
        strategy_id="momentum",
        strategy_version="1.1.0",
        confidence_score=0.85,
        features=features,
        ...
    )
"""

import uuid
import hashlib
import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Literal, Any
from enum import Enum


class SignalSide(str, Enum):
    """Signal direction."""
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"


class EntryType(str, Enum):
    """Order entry type."""
    MARKET = "market"
    LIMIT = "limit"


class TimeInForce(str, Enum):
    """Order time in force."""
    DAY = "DAY"      # Valid for the trading day
    GTC = "GTC"      # Good till cancelled
    IOC = "IOC"      # Immediate or cancel


@dataclass
class SignalFeatures:
    """
    Feature snapshot for audit trail and ML training.

    Captures all indicator values at signal generation time.
    This enables:
    - Audit trail (what did the model see?)
    - ML training (feature engineering)
    - Signal validation (have conditions changed?)
    """

    # Price features
    price: float
    sma_20: float
    sma_50: float
    sma_200: Optional[float] = None

    # Momentum features
    rsi_14: float = 50.0
    macd: float = 0.0
    macd_signal: float = 0.0
    macd_histogram: float = 0.0

    # Volatility features
    bb_upper: float = 0.0
    bb_middle: float = 0.0
    bb_lower: float = 0.0
    bb_width: float = 0.0
    bb_position: float = 0.5  # 0-1, position within bands
    atr_14: float = 0.0

    # Volume features
    volume: int = 0
    volume_sma_20: float = 0.0
    volume_ratio: float = 1.0

    # Trend features
    adx_14: Optional[float] = None
    trend_strength: float = 0.0  # -1 (strong down) to 1 (strong up)

    # Stochastic
    stoch_k: Optional[float] = None
    stoch_d: Optional[float] = None

    # Price relationships
    price_to_sma_20: float = 0.0  # % distance from SMA20
    price_to_sma_50: float = 0.0  # % distance from SMA50

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)

    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict())

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SignalFeatures":
        """Create from dictionary."""
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})

    def compute_hash(self) -> str:
        """Compute hash of features for data integrity."""
        return hashlib.md5(self.to_json().encode()).hexdigest()


@dataclass
class InvalidationRule:
    """
    Rule that invalidates a signal.

    When the condition is met, the signal is no longer valid.
    This enables automatic signal expiration based on market conditions.

    Examples:
        - Price drops below stop loss
        - RSI crosses overbought threshold
        - Time expires
        - Trend reverses
    """

    condition: str           # Machine-readable condition identifier
    threshold: float         # Threshold value for the condition
    description: str         # Human-readable description
    comparison: str = "lt"   # "lt", "gt", "eq", "gte", "lte"
    feature_name: str = ""   # Which feature to check

    # Common condition types as class constants
    PRICE_BELOW_STOP = "price_below_stop"
    PRICE_ABOVE_STOP = "price_above_stop"
    RSI_OVERBOUGHT = "rsi_overbought"
    RSI_OVERSOLD = "rsi_oversold"
    TREND_REVERSAL = "trend_reversal"
    TIME_EXPIRED = "time_expired"
    SMA_CROSSOVER = "sma_crossover"
    BB_BREACH = "bollinger_band_breach"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)

    def check(self, current_value: float) -> bool:
        """
        Check if the invalidation condition is met.

        Args:
            current_value: Current value of the feature to check

        Returns:
            True if the signal should be invalidated
        """
        if self.comparison == "lt":
            return current_value < self.threshold
        elif self.comparison == "gt":
            return current_value > self.threshold
        elif self.comparison == "lte":
            return current_value <= self.threshold
        elif self.comparison == "gte":
            return current_value >= self.threshold
        elif self.comparison == "eq":
            return current_value == self.threshold
        return False


@dataclass
class Signal:
    """
    Rich trading signal with confidence scores, features, and invalidation rules.

    This signal type provides:
    - Full audit trail with feature snapshots
    - Confidence scoring with factor breakdown
    - Automatic invalidation rules
    - Entry type suggestions (market/limit)

    Designed for:
    - Production trading systems
    - ML training pipelines
    - Risk management integration
    - Regulatory compliance
    """

    # Core identification
    symbol: str
    side: SignalSide
    strategy_id: str
    strategy_version: str
    timestamp: datetime = field(default_factory=datetime.utcnow)

    # Entry details
    entry_type: EntryType = EntryType.MARKET
    suggested_limit_price: Optional[float] = None
    time_in_force: TimeInForce = TimeInForce.DAY
    entry_price: Optional[float] = None
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None

    # Confidence and reasoning
    confidence_score: float = 0.0  # 0.0 to 1.0
    confidence_factors: Dict[str, float] = field(default_factory=dict)
    reason: str = ""

    # Feature snapshot (for audit and ML)
    features: Optional[SignalFeatures] = None

    # Invalidation rules
    invalidation_rules: List[InvalidationRule] = field(default_factory=list)
    valid_until: Optional[datetime] = None

    # Metadata
    data_snapshot_hash: str = ""
    rule_version_id: str = ""

    # Auto-generated fields
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    market: str = "US"
    status: str = "PENDING"

    # Legacy compatibility fields
    signal_type: str = field(init=False)  # Alias for side
    strength: float = field(init=False)   # Alias for confidence_score

    def __post_init__(self):
        """Initialize computed fields and validate data."""
        # Set legacy compatibility fields
        self.signal_type = self.side.value if isinstance(self.side, SignalSide) else self.side
        self.strength = self.confidence_score

        # Convert side to enum if string
        if isinstance(self.side, str):
            self.side = SignalSide(self.side)

        # Convert entry_type to enum if string
        if isinstance(self.entry_type, str):
            self.entry_type = EntryType(self.entry_type)

        # Convert time_in_force to enum if string
        if isinstance(self.time_in_force, str):
            self.time_in_force = TimeInForce(self.time_in_force)

        # Set default valid_until if not provided
        if self.valid_until is None:
            self.valid_until = datetime.utcnow() + timedelta(days=1)

        # Generate rule_version_id if not provided
        if not self.rule_version_id:
            self.rule_version_id = f"{self.strategy_id}_{self.strategy_version}"

        # Compute data_snapshot_hash from features if not provided
        if not self.data_snapshot_hash and self.features:
            self.data_snapshot_hash = self.features.compute_hash()

    @property
    def indicators(self) -> Dict[str, Any]:
        """Return indicators dict for backward compatibility."""
        if self.features:
            return self.features.to_dict()
        return {}

    @property
    def confidence(self) -> float:
        """Alias for confidence_score for backward compatibility."""
        return self.confidence_score

    @property
    def reasoning(self) -> str:
        """Alias for reason for backward compatibility."""
        return self.reason

    @property
    def expires_at(self) -> Optional[datetime]:
        """Alias for valid_until for backward compatibility."""
        return self.valid_until

    @property
    def time(self) -> datetime:
        """Alias for timestamp for backward compatibility."""
        return self.timestamp

    def is_valid(self, current_features: Optional[SignalFeatures] = None) -> tuple[bool, List[str]]:
        """
        Check if signal is still valid.

        Args:
            current_features: Current market features to check against invalidation rules

        Returns:
            Tuple of (is_valid, list of reasons if invalid)
        """
        invalid_reasons = []

        # Check time expiration
        if self.valid_until and datetime.utcnow() > self.valid_until:
            invalid_reasons.append("Signal has expired")

        # Check status
        if self.status not in ["PENDING", "ACTIVE"]:
            invalid_reasons.append(f"Signal status is {self.status}")

        # Check invalidation rules against current features
        if current_features and self.invalidation_rules:
            feature_dict = current_features.to_dict()
            for rule in self.invalidation_rules:
                if rule.feature_name and rule.feature_name in feature_dict:
                    current_value = feature_dict[rule.feature_name]
                    if current_value is not None and rule.check(current_value):
                        invalid_reasons.append(f"Invalidation rule triggered: {rule.description}")

        return (len(invalid_reasons) == 0, invalid_reasons)

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert signal to dictionary for JSON serialization.

        Returns:
            Dictionary representation of the signal
        """
        return {
            "id": self.id,
            "time": self.timestamp.isoformat(),
            "symbol": self.symbol,
            "market": self.market,
            "side": self.side.value,
            "signal_type": self.signal_type,  # Legacy compatibility
            "strategy_id": self.strategy_id,
            "strategy_version": self.strategy_version,
            "entry_type": self.entry_type.value,
            "suggested_limit_price": self.suggested_limit_price,
            "time_in_force": self.time_in_force.value,
            "entry_price": self.entry_price,
            "target_price": self.target_price,
            "stop_loss": self.stop_loss,
            "confidence_score": self.confidence_score,
            "strength": self.strength,  # Legacy compatibility
            "confidence": self.confidence_score,  # Legacy compatibility
            "confidence_factors": self.confidence_factors,
            "reason": self.reason,
            "reasoning": self.reason,  # Legacy compatibility
            "features": self.features.to_dict() if self.features else None,
            "indicators": self.indicators,  # Legacy compatibility
            "invalidation_rules": [r.to_dict() for r in self.invalidation_rules],
            "valid_until": self.valid_until.isoformat() if self.valid_until else None,
            "expires_at": self.valid_until.isoformat() if self.valid_until else None,  # Legacy
            "data_snapshot_hash": self.data_snapshot_hash,
            "rule_version_id": self.rule_version_id,
            "status": self.status,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Signal":
        """
        Create Signal from dictionary.

        Args:
            data: Dictionary representation of a signal

        Returns:
            Signal instance
        """
        # Parse features
        features = None
        if data.get("features"):
            features = SignalFeatures.from_dict(data["features"])

        # Parse invalidation rules
        invalidation_rules = []
        if data.get("invalidation_rules"):
            for rule_data in data["invalidation_rules"]:
                invalidation_rules.append(InvalidationRule(**rule_data))

        # Parse timestamps
        timestamp = data.get("time") or data.get("timestamp")
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))

        valid_until = data.get("valid_until") or data.get("expires_at")
        if isinstance(valid_until, str):
            valid_until = datetime.fromisoformat(valid_until.replace("Z", "+00:00"))

        return cls(
            id=data.get("id", str(uuid.uuid4())),
            symbol=data["symbol"],
            side=SignalSide(data.get("side") or data.get("signal_type", "HOLD")),
            strategy_id=data["strategy_id"],
            strategy_version=data.get("strategy_version", "1.0.0"),
            timestamp=timestamp or datetime.utcnow(),
            entry_type=EntryType(data.get("entry_type", "market")),
            suggested_limit_price=data.get("suggested_limit_price"),
            time_in_force=TimeInForce(data.get("time_in_force", "DAY")),
            entry_price=data.get("entry_price"),
            target_price=data.get("target_price"),
            stop_loss=data.get("stop_loss"),
            confidence_score=data.get("confidence_score") or data.get("confidence") or data.get("strength", 0.0),
            confidence_factors=data.get("confidence_factors", {}),
            reason=data.get("reason") or data.get("reasoning", ""),
            features=features,
            invalidation_rules=invalidation_rules,
            valid_until=valid_until,
            data_snapshot_hash=data.get("data_snapshot_hash", ""),
            rule_version_id=data.get("rule_version_id", ""),
            market=data.get("market", "US"),
            status=data.get("status", "PENDING"),
        )
