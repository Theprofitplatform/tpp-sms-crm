"""
Tests for FX Accounting Module

Tests FX transaction recording, P&L tracking, exposure calculation,
and position attribution.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

from fx.accounting import (
    FXAccountingLedger,
    FXTransaction,
    FXTransactionType,
    FXGainType,
    CurrencyPosition,
    FXPnLSummary,
    PositionFXAttribution,
)


@pytest.fixture
def fx_ledger():
    """Create FX accounting ledger for testing."""
    return FXAccountingLedger(base_currency="AUD")


@pytest.fixture
def fx_ledger_with_service():
    """Create FX ledger with mock FX service."""
    mock_fx_service = MagicMock()
    return FXAccountingLedger(base_currency="AUD", fx_service=mock_fx_service)


class TestFXAccountingLedger:
    """Tests for FXAccountingLedger."""

    def test_initialization(self, fx_ledger):
        """Test ledger initializes correctly."""
        assert fx_ledger.base_currency == "AUD"
        # Access private attributes for testing
        assert len(fx_ledger._transactions) == 0
        assert len(fx_ledger._currency_positions) == 0
        assert len(fx_ledger._position_entries) == 0

    def test_record_trade_open(self, fx_ledger):
        """Test recording a trade open transaction."""
        fx_ledger.record_trade_open(
            trade_id="trade_001",
            symbol="AAPL",
            trade_currency="USD",
            trade_amount=15000.0,  # $15,000 USD
            fx_rate=0.65,  # 1 AUD = 0.65 USD
            position_id="pos_AAPL",
        )

        # Check transaction was recorded
        assert len(fx_ledger._transactions) == 1
        txn = fx_ledger._transactions[0]
        assert txn.transaction_type == FXTransactionType.TRADE_OPEN
        assert txn.symbol == "AAPL"
        assert txn.trade_currency == "USD"
        assert txn.trade_amount == 15000.0
        assert txn.fx_rate == 0.65

        # Check position entry data
        assert "pos_AAPL" in fx_ledger._position_entries
        pos_data = fx_ledger._position_entries["pos_AAPL"]
        assert pos_data["entry_fx_rate"] == 0.65
        assert pos_data["trade_currency"] == "USD"

        # Check currency exposure
        assert "USD" in fx_ledger._currency_positions
        usd_pos = fx_ledger._currency_positions["USD"]
        assert usd_pos.gross_long > 0

    def test_record_trade_close_with_fx_gain(self, fx_ledger):
        """Test recording trade close with FX gain (rate improved)."""
        # First open a position at FX rate 0.65
        fx_ledger.record_trade_open(
            trade_id="trade_001",
            symbol="AAPL",
            trade_currency="USD",
            trade_amount=15000.0,
            fx_rate=0.65,
            position_id="pos_AAPL",
        )

        # Close at FX rate 0.60 (AUD strengthened = gain for AUD-based investor)
        fx_ledger.record_trade_close(
            trade_id="trade_001_close",
            symbol="AAPL",
            trade_currency="USD",
            trade_amount=16000.0,  # Sold for $16,000 USD
            fx_rate=0.60,
            entry_fx_rate=0.65,
            position_id="pos_AAPL",
        )

        # Should have 2 transactions
        assert len(fx_ledger._transactions) == 2

        # Check P&L summary
        pnl = fx_ledger.get_fx_pnl_summary()
        # Value at entry FX: $16,000 / 0.65 = AUD 24,615.38
        # Value at exit FX: $16,000 / 0.60 = AUD 26,666.67
        # FX gain = 26,666.67 - 24,615.38 = AUD 2,051.28 (approx)
        assert pnl.realized_fx_gain > 0

    def test_record_trade_close_with_fx_loss(self, fx_ledger):
        """Test recording trade close with FX loss (rate worsened)."""
        # Open at FX rate 0.65
        fx_ledger.record_trade_open(
            trade_id="trade_002",
            symbol="MSFT",
            trade_currency="USD",
            trade_amount=10000.0,
            fx_rate=0.65,
            position_id="pos_MSFT",
        )

        # Close at FX rate 0.70 (AUD weakened = loss for AUD-based investor)
        fx_ledger.record_trade_close(
            trade_id="trade_002_close",
            symbol="MSFT",
            trade_currency="USD",
            trade_amount=10000.0,  # Same USD value
            fx_rate=0.70,
            entry_fx_rate=0.65,
            position_id="pos_MSFT",
        )

        pnl = fx_ledger.get_fx_pnl_summary()
        # Value at entry FX: $10,000 / 0.65 = AUD 15,384.62
        # Value at exit FX: $10,000 / 0.70 = AUD 14,285.71
        # FX loss = 14,285.71 - 15,384.62 = AUD -1,098.90 (approx)
        assert pnl.realized_fx_loss > 0

    def test_get_currency_exposure(self, fx_ledger):
        """Test getting currency exposure breakdown."""
        # Open positions in different currencies
        fx_ledger.record_trade_open(
            trade_id="t1", symbol="AAPL", trade_currency="USD",
            trade_amount=10000.0, fx_rate=0.65, position_id="pos_1",
        )
        fx_ledger.record_trade_open(
            trade_id="t2", symbol="BP", trade_currency="GBP",
            trade_amount=5000.0, fx_rate=0.52, position_id="pos_2",
        )

        exposure = fx_ledger.get_currency_exposure()

        assert "USD" in exposure
        assert "GBP" in exposure
        assert exposure["USD"].gross_long > 0
        assert exposure["GBP"].gross_long > 0

    def test_get_exposure_summary(self, fx_ledger):
        """Test exposure summary calculation."""
        fx_ledger.record_trade_open(
            trade_id="t1", symbol="AAPL", trade_currency="USD",
            trade_amount=10000.0, fx_rate=0.65, position_id="pos_1",
        )

        summary = fx_ledger.get_exposure_summary()

        assert "currency_count" in summary
        assert "total_exposure_base" in summary
        assert "currencies" in summary  # Note: actual key is "currencies", not "exposures"
        assert summary["currency_count"] >= 1

    def test_get_fx_pnl_summary_empty(self, fx_ledger):
        """Test P&L summary with no transactions."""
        pnl = fx_ledger.get_fx_pnl_summary()

        assert pnl.realized_fx_gain == 0.0
        assert pnl.realized_fx_loss == 0.0
        assert pnl.unrealized_fx_gain == 0.0
        assert pnl.unrealized_fx_loss == 0.0
        assert pnl.total_fx_impact == 0.0

    def test_get_transactions_with_filter(self, fx_ledger):
        """Test filtering transactions by type and currency."""
        fx_ledger.record_trade_open(
            trade_id="t1", symbol="AAPL", trade_currency="USD",
            trade_amount=10000.0, fx_rate=0.65, position_id="pos_1",
        )
        fx_ledger.record_trade_open(
            trade_id="t2", symbol="BP", trade_currency="GBP",
            trade_amount=5000.0, fx_rate=0.52, position_id="pos_2",
        )

        # Filter by currency
        usd_txns = fx_ledger.get_transactions(currency="USD")
        assert len(usd_txns) == 1
        assert usd_txns[0].trade_currency == "USD"

        # Filter by type
        open_txns = fx_ledger.get_transactions(transaction_type=FXTransactionType.TRADE_OPEN)
        assert len(open_txns) == 2

    def test_get_transactions_with_date_filter(self, fx_ledger):
        """Test filtering transactions by date range."""
        fx_ledger.record_trade_open(
            trade_id="t1", symbol="AAPL", trade_currency="USD",
            trade_amount=10000.0, fx_rate=0.65, position_id="pos_1",
        )

        now = datetime.utcnow()

        # Future date should return nothing
        future_txns = fx_ledger.get_transactions(
            start_date=now + timedelta(days=1)
        )
        assert len(future_txns) == 0

        # Past date should return all
        past_txns = fx_ledger.get_transactions(
            start_date=now - timedelta(days=1)
        )
        assert len(past_txns) == 1

    def test_get_position_fx_attribution(self, fx_ledger):
        """Test FX attribution for a position."""
        # Open position at FX rate 0.65
        fx_ledger.record_trade_open(
            trade_id="t1", symbol="AAPL", trade_currency="USD",
            trade_amount=15000.0, fx_rate=0.65, position_id="pos_AAPL",
        )

        # Get attribution with current values
        attribution = fx_ledger.get_position_fx_attribution(
            position_id="pos_AAPL",
            current_value_trade=16500.0,  # Position grew in USD
            current_fx_rate=0.62,  # FX also improved
        )

        assert attribution is not None
        assert attribution.position_id == "pos_AAPL"
        assert attribution.entry_fx_rate == 0.65
        assert attribution.current_fx_rate == 0.62
        assert attribution.trading_pnl_trade != 0  # Should have trading P&L in trade ccy
        assert attribution.trading_pnl_base != 0  # Should have trading P&L in base ccy
        assert attribution.fx_impact != 0  # Should have FX impact

    def test_get_position_fx_attribution_not_found(self, fx_ledger):
        """Test attribution returns None for unknown position."""
        attribution = fx_ledger.get_position_fx_attribution(
            position_id="unknown",
            current_value_trade=1000.0,
            current_fx_rate=0.65,
        )
        assert attribution is None

    def test_reset(self, fx_ledger):
        """Test resetting the ledger."""
        fx_ledger.record_trade_open(
            trade_id="t1", symbol="AAPL", trade_currency="USD",
            trade_amount=10000.0, fx_rate=0.65, position_id="pos_1",
        )

        assert len(fx_ledger._transactions) > 0

        fx_ledger.reset()

        assert len(fx_ledger._transactions) == 0
        assert len(fx_ledger._currency_positions) == 0
        assert len(fx_ledger._position_entries) == 0

    def test_record_dividend(self, fx_ledger):
        """Test recording dividend transaction."""
        txn = fx_ledger.record_dividend(
            trade_id="div_001",
            symbol="AAPL",
            trade_currency="USD",
            dividend_amount=100.0,
            fx_rate=0.65,
        )

        assert txn.transaction_type == FXTransactionType.DIVIDEND
        assert txn.trade_amount == 100.0
        assert txn.trade_currency == "USD"
        assert len(fx_ledger._transactions) == 1

    def test_revalue_positions(self, fx_ledger):
        """Test mark-to-market revaluation."""
        # Open a position
        fx_ledger.record_trade_open(
            trade_id="t1", symbol="AAPL", trade_currency="USD",
            trade_amount=15000.0, fx_rate=0.65, position_id="pos_AAPL",
        )

        # Revalue with new FX rate
        positions = [
            {
                "id": "pos_AAPL",
                "symbol": "AAPL",
                "trade_currency": "USD",
                "current_value": 16000.0,
            }
        ]
        current_rates = {"AUDUSD": 0.62}

        unrealized, txns = fx_ledger.revalue_positions(positions, current_rates)

        # Should have FX impact from rate change
        assert len(txns) == 1
        assert txns[0].transaction_type == FXTransactionType.REVALUATION


class TestCurrencyPosition:
    """Tests for CurrencyPosition dataclass."""

    def test_net_exposure(self):
        """Test net exposure is stored correctly."""
        pos = CurrencyPosition(
            currency="USD",
            gross_long=10000.0,
            gross_short=3000.0,
            net_exposure=7000.0,  # Net = gross_long - gross_short
        )
        assert pos.net_exposure == 7000.0

    def test_to_dict(self):
        """Test serialization to dict."""
        pos = CurrencyPosition(
            currency="USD",
            gross_long=10000.0,
            gross_short=3000.0,
            net_exposure=7000.0,
            position_count=2,
        )
        d = pos.to_dict()

        assert d["currency"] == "USD"
        assert d["gross_long"] == 10000.0
        assert d["gross_short"] == 3000.0
        assert d["net_exposure"] == 7000.0
        assert d["position_count"] == 2


class TestFXPnLSummary:
    """Tests for FXPnLSummary dataclass."""

    def test_realized_fx_net(self):
        """Test realized net is stored correctly."""
        summary = FXPnLSummary(
            base_currency="AUD",
            realized_fx_gain=500.0,
            realized_fx_loss=200.0,
            realized_fx_net=300.0,  # gain - loss
            unrealized_fx_gain=100.0,
            unrealized_fx_loss=50.0,
            unrealized_fx_net=50.0,
            total_fx_impact=350.0,
        )
        assert summary.realized_fx_net == 300.0

    def test_unrealized_fx_net(self):
        """Test unrealized net is stored correctly."""
        summary = FXPnLSummary(
            base_currency="AUD",
            realized_fx_gain=500.0,
            realized_fx_loss=200.0,
            realized_fx_net=300.0,
            unrealized_fx_gain=100.0,
            unrealized_fx_loss=50.0,
            unrealized_fx_net=50.0,  # gain - loss
            total_fx_impact=350.0,
        )
        assert summary.unrealized_fx_net == 50.0

    def test_total_fx_impact(self):
        """Test total impact is stored correctly."""
        summary = FXPnLSummary(
            base_currency="AUD",
            realized_fx_gain=500.0,
            realized_fx_loss=200.0,
            realized_fx_net=300.0,
            unrealized_fx_gain=100.0,
            unrealized_fx_loss=50.0,
            unrealized_fx_net=50.0,
            total_fx_impact=350.0,  # realized_net + unrealized_net
        )
        assert summary.total_fx_impact == 350.0

    def test_to_dict(self):
        """Test serialization to dict."""
        summary = FXPnLSummary(
            base_currency="AUD",
            realized_fx_gain=500.0,
            realized_fx_loss=200.0,
            realized_fx_net=300.0,
            unrealized_fx_gain=100.0,
            unrealized_fx_loss=50.0,
            unrealized_fx_net=50.0,
            total_fx_impact=350.0,
        )
        d = summary.to_dict()

        assert d["base_currency"] == "AUD"
        assert d["realized"]["gain"] == 500.0
        assert d["realized"]["loss"] == 200.0
        assert d["realized"]["net"] == 300.0
        assert d["unrealized"]["gain"] == 100.0
        assert d["unrealized"]["loss"] == 50.0
        assert d["unrealized"]["net"] == 50.0
        assert d["total_fx_impact"] == 350.0


class TestPositionFXAttribution:
    """Tests for PositionFXAttribution dataclass."""

    def test_to_dict(self):
        """Test serialization to dict."""
        attr = PositionFXAttribution(
            position_id="pos_1",
            symbol="AAPL",
            trade_currency="USD",
            entry_date=datetime(2024, 1, 15, 10, 30, 0),
            entry_fx_rate=0.65,
            cost_base_at_entry=23076.92,
            cost_trade=15000.0,
            current_fx_rate=0.62,
            current_value_trade=16500.0,
            current_value_base=26612.90,
            trading_pnl_trade=1500.0,
            trading_pnl_base=2419.35,
            fx_impact=1116.63,
            fx_impact_pct=0.0484,
            total_pnl_base=3535.98,
        )
        d = attr.to_dict()

        assert d["position_id"] == "pos_1"
        assert d["symbol"] == "AAPL"
        assert d["trade_currency"] == "USD"
        assert d["entry_fx_rate"] == 0.65
        assert d["current_fx_rate"] == 0.62
        assert d["trading_pnl_trade"] == 1500.0
        assert d["trading_pnl_base"] == 2419.35
        assert d["fx_impact"] == 1116.63
        assert d["total_pnl_base"] == 3535.98


class TestFXTransaction:
    """Tests for FXTransaction dataclass."""

    def test_to_dict(self):
        """Test transaction serialization."""
        txn = FXTransaction(
            id="txn_001",
            transaction_type=FXTransactionType.TRADE_OPEN,
            timestamp=datetime(2024, 1, 15, 10, 30, 0),
            trade_id="trade_001",
            symbol="AAPL",
            trade_currency="USD",
            trade_amount=15000.0,
            base_currency="AUD",
            base_amount=23076.92,
            fx_rate=0.65,
        )
        d = txn.to_dict()

        assert d["id"] == "txn_001"
        assert d["transaction_type"] == "TRADE_OPEN"
        assert d["symbol"] == "AAPL"
        assert d["trade_currency"] == "USD"
        assert d["fx_rate"] == 0.65
        assert d["base_amount"] == 23076.92


class TestFXTransactionType:
    """Tests for FXTransactionType enum."""

    def test_all_types_exist(self):
        """Test all expected transaction types exist."""
        assert FXTransactionType.TRADE_OPEN
        assert FXTransactionType.TRADE_CLOSE
        assert FXTransactionType.DIVIDEND
        assert FXTransactionType.FX_CONVERSION
        assert FXTransactionType.REVALUATION
        assert FXTransactionType.HEDGE_OPEN
        assert FXTransactionType.HEDGE_CLOSE
        assert FXTransactionType.INTEREST


class TestFXGainType:
    """Tests for FXGainType enum."""

    def test_all_types_exist(self):
        """Test all expected gain types exist."""
        assert FXGainType.REALIZED
        assert FXGainType.UNREALIZED
