#!/usr/bin/env python3
"""
Comprehensive Backtest Runner for All Signal Service Strategies

Runs backtests using actual strategy classes from the Signal Service,
generating performance metrics and a comparison report.

Usage:
    python scripts/backtest/run_all_strategies.py
    python scripts/backtest/run_all_strategies.py --symbols AAPL,MSFT,GOOGL
    python scripts/backtest/run_all_strategies.py --strategies momentum,breakout
    python scripts/backtest/run_all_strategies.py --realistic --output results.json

Dependencies:
    - pandas, numpy, httpx
    - Signal service strategy modules
"""

import argparse
import asyncio
import json
import os
import sys
from dataclasses import dataclass, field
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any
import hashlib

import pandas as pd
import numpy as np
import httpx

# Add services to path
SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "services" / "signal"))

# Strategy imports
from strategies.technical import (
    MomentumStrategy,
    MeanReversionStrategy,
    BreakoutStrategy,
    MACDCrossoverStrategy,
    RSIDivergenceStrategy,
    PairsTradingStrategy,
    VolatilityEventStrategy,
    VolumeProfileStrategy,
    MLSignalStrategy,
)
from models import SignalSide

# Configuration
DATA_SERVICE_URL = os.getenv('DATA_SERVICE_URL', 'http://localhost:5101')

# All available strategies
STRATEGIES = {
    'momentum': MomentumStrategy,
    'mean_reversion': MeanReversionStrategy,
    'breakout': BreakoutStrategy,
    'macd_crossover': MACDCrossoverStrategy,
    'rsi_divergence': RSIDivergenceStrategy,
    'pairs_trading': PairsTradingStrategy,
    'volatility_event': VolatilityEventStrategy,
    'volume_profile': VolumeProfileStrategy,
    'ml_signals': MLSignalStrategy,
}

# Symbols for pairs trading
PAIRS_SYMBOLS = ['GOOGL', 'META', 'AAPL', 'MSFT', 'JPM', 'BAC', 'XOM', 'CVX']


@dataclass
class BacktestConfig:
    """Backtest configuration."""
    symbols: List[str] = field(default_factory=lambda: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'])
    strategies: List[str] = field(default_factory=lambda: list(STRATEGIES.keys()))
    market: str = "US"
    start_date: date = None
    end_date: date = None
    initial_capital: float = 100000.0
    position_size_pct: float = 0.10
    realistic: bool = False
    slippage_bps: float = 5.0
    commission_per_trade: float = 0.0

    def __post_init__(self):
        if self.start_date is None:
            self.start_date = date.today() - timedelta(days=365)
        if self.end_date is None:
            self.end_date = date.today()


@dataclass
class StrategyResult:
    """Results for a single strategy."""
    strategy_id: str
    strategy_name: str

    # Performance
    total_return: float = 0.0
    annualized_return: float = 0.0
    sharpe_ratio: float = 0.0
    sortino_ratio: float = 0.0
    max_drawdown: float = 0.0
    calmar_ratio: float = 0.0

    # Trades
    total_signals: int = 0
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    win_rate: float = 0.0
    profit_factor: float = 0.0
    avg_win: float = 0.0
    avg_loss: float = 0.0

    # Costs
    total_costs: float = 0.0

    # Details
    symbols_traded: List[str] = field(default_factory=list)
    avg_confidence: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "strategy_id": self.strategy_id,
            "strategy_name": self.strategy_name,
            "performance": {
                "total_return": round(self.total_return * 100, 2),
                "annualized_return": round(self.annualized_return * 100, 2),
                "sharpe_ratio": round(self.sharpe_ratio, 2),
                "sortino_ratio": round(self.sortino_ratio, 2),
                "max_drawdown": round(self.max_drawdown * 100, 2),
                "calmar_ratio": round(self.calmar_ratio, 2),
            },
            "trades": {
                "total_signals": self.total_signals,
                "total_trades": self.total_trades,
                "winning": self.winning_trades,
                "losing": self.losing_trades,
                "win_rate": round(self.win_rate * 100, 2),
                "profit_factor": round(self.profit_factor, 2),
                "avg_win": round(self.avg_win, 2),
                "avg_loss": round(self.avg_loss, 2),
            },
            "details": {
                "symbols_traded": self.symbols_traded,
                "avg_confidence": round(self.avg_confidence, 2),
                "total_costs": round(self.total_costs, 2),
            },
        }


class StrategyBacktester:
    """Backtester using actual Signal Service strategies."""

    def __init__(self, config: BacktestConfig):
        self.config = config
        self.data_cache: Dict[str, pd.DataFrame] = {}

    async def fetch_data(self, symbol: str) -> Optional[List[Dict]]:
        """Fetch OHLCV data from data service."""
        cache_key = f"{symbol}_{self.config.start_date}_{self.config.end_date}"

        if cache_key in self.data_cache:
            return self.data_cache[cache_key]

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{DATA_SERVICE_URL}/api/v1/ohlcv/{symbol}",
                    params={
                        "market": self.config.market,
                        "start": self.config.start_date.isoformat(),
                        "end": self.config.end_date.isoformat(),
                    },
                    timeout=30.0,
                )

                if response.status_code != 200:
                    print(f"  Warning: Failed to fetch {symbol} (status {response.status_code})")
                    return None

                data = response.json()
                ohlcv_list = data.get("data", [])

                if ohlcv_list:
                    self.data_cache[cache_key] = ohlcv_list

                return ohlcv_list

            except Exception as e:
                print(f"  Error fetching {symbol}: {e}")
                return None

    def _compute_data_hash(self, ohlcv_data: List[Dict]) -> str:
        """Compute hash of OHLCV data for audit trail."""
        data_str = json.dumps(ohlcv_data[-10:], sort_keys=True)
        return hashlib.md5(data_str.encode()).hexdigest()[:16]

    def _simulate_trades(
        self,
        signals: List[Dict],
        ohlcv_data: List[Dict],
    ) -> Dict[str, Any]:
        """Simulate trades from signals and compute P&L."""
        if not signals or not ohlcv_data:
            return {
                "trades": [],
                "equity_curve": [self.config.initial_capital],
                "total_return": 0.0,
            }

        # Build date-to-price map
        price_map = {}
        for bar in ohlcv_data:
            date_key = bar.get('date') or bar.get('time', '')[:10]
            price_map[date_key] = bar['close']

        capital = self.config.initial_capital
        position = 0
        entry_price = 0.0
        entry_date = None
        trades = []
        equity_curve = [capital]

        # Sort signals by date
        signals = sorted(signals, key=lambda s: s.get('date', ''))

        for sig in signals:
            sig_date = sig.get('date', '')
            price = price_map.get(sig_date)

            if price is None:
                continue

            side = sig.get('side')
            confidence = sig.get('confidence', 0.5)

            # Apply slippage
            slippage = price * (self.config.slippage_bps / 10000) if self.config.realistic else 0

            # Entry
            if position == 0 and side in ['BUY', 'SELL']:
                position_value = capital * self.config.position_size_pct
                quantity = int(position_value / price)

                if quantity > 0:
                    exec_price = price + slippage if side == 'BUY' else price - slippage
                    cost = self.config.commission_per_trade if self.config.realistic else 0

                    position = quantity if side == 'BUY' else -quantity
                    entry_price = exec_price
                    entry_date = sig_date
                    capital -= cost

            # Exit on opposite signal
            elif position != 0:
                should_exit = False
                if (side == 'BUY' and position < 0) or (side == 'SELL' and position > 0):
                    should_exit = True

                if should_exit:
                    exit_side = 'SELL' if position > 0 else 'BUY'
                    exec_price = price - slippage if exit_side == 'SELL' else price + slippage

                    if position > 0:
                        pnl = (exec_price - entry_price) * abs(position)
                    else:
                        pnl = (entry_price - exec_price) * abs(position)

                    cost = self.config.commission_per_trade if self.config.realistic else 0
                    pnl -= cost
                    capital += pnl

                    trades.append({
                        "entry_date": entry_date,
                        "exit_date": sig_date,
                        "side": "LONG" if position > 0 else "SHORT",
                        "entry_price": entry_price,
                        "exit_price": exec_price,
                        "quantity": abs(position),
                        "pnl": pnl,
                    })

                    position = 0
                    entry_price = 0.0

            equity_curve.append(capital + (position * price if position != 0 else 0))

        # Close any open position at last price
        if position != 0 and ohlcv_data:
            last_price = ohlcv_data[-1]['close']
            if position > 0:
                pnl = (last_price - entry_price) * abs(position)
            else:
                pnl = (entry_price - last_price) * abs(position)
            capital += pnl
            trades.append({
                "entry_date": entry_date,
                "exit_date": "OPEN",
                "side": "LONG" if position > 0 else "SHORT",
                "entry_price": entry_price,
                "exit_price": last_price,
                "quantity": abs(position),
                "pnl": pnl,
            })
            equity_curve.append(capital)

        total_return = (capital - self.config.initial_capital) / self.config.initial_capital

        return {
            "trades": trades,
            "equity_curve": equity_curve,
            "total_return": total_return,
            "final_capital": capital,
        }

    def _calculate_metrics(
        self,
        trades: List[Dict],
        equity_curve: List[float],
    ) -> Dict[str, float]:
        """Calculate performance metrics."""
        metrics = {
            "total_return": 0.0,
            "annualized_return": 0.0,
            "sharpe_ratio": 0.0,
            "sortino_ratio": 0.0,
            "max_drawdown": 0.0,
            "calmar_ratio": 0.0,
            "win_rate": 0.0,
            "profit_factor": 0.0,
            "avg_win": 0.0,
            "avg_loss": 0.0,
        }

        if not equity_curve or len(equity_curve) < 2:
            return metrics

        equity = pd.Series(equity_curve)
        initial = equity.iloc[0]
        final = equity.iloc[-1]

        # Returns
        metrics["total_return"] = (final / initial) - 1
        days = len(equity)
        years = days / 252 if days > 0 else 1
        metrics["annualized_return"] = (1 + metrics["total_return"]) ** (1 / years) - 1 if years > 0 else 0

        # Risk metrics
        returns = equity.pct_change().dropna()
        if len(returns) > 1 and returns.std() > 0:
            metrics["sharpe_ratio"] = returns.mean() / returns.std() * np.sqrt(252)

            downside = returns[returns < 0]
            if len(downside) > 0 and downside.std() > 0:
                metrics["sortino_ratio"] = returns.mean() / downside.std() * np.sqrt(252)

        # Max drawdown
        rolling_max = equity.cummax()
        drawdown = (equity - rolling_max) / rolling_max
        metrics["max_drawdown"] = abs(drawdown.min())

        if metrics["max_drawdown"] > 0:
            metrics["calmar_ratio"] = metrics["annualized_return"] / metrics["max_drawdown"]

        # Trade metrics
        if trades:
            pnls = [t["pnl"] for t in trades]
            winning = [p for p in pnls if p > 0]
            losing = [p for p in pnls if p < 0]

            metrics["win_rate"] = len(winning) / len(trades) if trades else 0

            if winning:
                metrics["avg_win"] = np.mean(winning)
            if losing:
                metrics["avg_loss"] = np.mean(losing)

            gross_profit = sum(winning) if winning else 0
            gross_loss = abs(sum(losing)) if losing else 0
            metrics["profit_factor"] = gross_profit / gross_loss if gross_loss > 0 else float('inf')

        return metrics

    async def backtest_strategy(
        self,
        strategy_id: str,
        strategy_class,
    ) -> StrategyResult:
        """Run backtest for a single strategy."""
        result = StrategyResult(
            strategy_id=strategy_id,
            strategy_name=strategy_class.NAME if hasattr(strategy_class, 'NAME') else strategy_id,
        )

        # Determine which symbols to use
        if strategy_id == 'pairs_trading':
            symbols = [s for s in PAIRS_SYMBOLS if s in self.config.symbols or len(self.config.symbols) <= 5]
            if not symbols:
                symbols = PAIRS_SYMBOLS[:4]
        else:
            symbols = self.config.symbols

        print(f"\n  Testing on {len(symbols)} symbols: {', '.join(symbols[:5])}{'...' if len(symbols) > 5 else ''}")

        # Initialize strategy
        try:
            strategy = strategy_class()
        except Exception as e:
            print(f"  Error initializing strategy: {e}")
            return result

        all_signals = []
        all_trades = []
        all_equity = []
        confidences = []

        for symbol in symbols:
            ohlcv_data = await self.fetch_data(symbol)

            if not ohlcv_data or len(ohlcv_data) < 30:
                continue

            data_hash = self._compute_data_hash(ohlcv_data)
            signals_for_symbol = []

            # Generate signals by walking through data
            min_bars = 60
            for i in range(min_bars, len(ohlcv_data)):
                historical_data = ohlcv_data[:i+1]

                try:
                    signal = strategy.analyze(
                        symbol=symbol,
                        market=self.config.market,
                        ohlcv_data=historical_data,
                        data_hash=data_hash,
                    )

                    if signal and signal.side != SignalSide.HOLD:
                        sig_date = ohlcv_data[i].get('date') or ohlcv_data[i].get('time', '')[:10]
                        signals_for_symbol.append({
                            "date": sig_date,
                            "side": signal.side.value,
                            "confidence": signal.confidence_score,
                            "entry_price": signal.entry_price,
                        })
                        confidences.append(signal.confidence_score)

                except Exception as e:
                    # Skip errors silently during backtest
                    continue

            if signals_for_symbol:
                all_signals.extend(signals_for_symbol)
                result.symbols_traded.append(symbol)

                # Simulate trades for this symbol
                sim_result = self._simulate_trades(signals_for_symbol, ohlcv_data)
                all_trades.extend(sim_result["trades"])
                all_equity.extend(sim_result["equity_curve"])

        # Calculate aggregate metrics
        result.total_signals = len(all_signals)
        result.total_trades = len(all_trades)

        if all_trades:
            pnls = [t["pnl"] for t in all_trades]
            winning = [p for p in pnls if p > 0]
            losing = [p for p in pnls if p < 0]

            result.winning_trades = len(winning)
            result.losing_trades = len(losing)
            result.win_rate = len(winning) / len(all_trades)

            if winning:
                result.avg_win = np.mean(winning)
            if losing:
                result.avg_loss = np.mean(losing)

            gross_profit = sum(winning) if winning else 0
            gross_loss = abs(sum(losing)) if losing else 0
            result.profit_factor = gross_profit / gross_loss if gross_loss > 0 else 0

            # Calculate portfolio-level metrics from equity curve
            if all_equity:
                metrics = self._calculate_metrics(all_trades, all_equity)
                result.total_return = metrics["total_return"]
                result.annualized_return = metrics["annualized_return"]
                result.sharpe_ratio = metrics["sharpe_ratio"]
                result.sortino_ratio = metrics["sortino_ratio"]
                result.max_drawdown = metrics["max_drawdown"]
                result.calmar_ratio = metrics["calmar_ratio"]

        if confidences:
            result.avg_confidence = np.mean(confidences)

        return result

    async def run_all(self) -> List[StrategyResult]:
        """Run backtests for all configured strategies."""
        results = []

        for strategy_id in self.config.strategies:
            if strategy_id not in STRATEGIES:
                print(f"Unknown strategy: {strategy_id}")
                continue

            print(f"\n{'='*50}")
            print(f"Backtesting: {strategy_id.upper()}")
            print(f"{'='*50}")

            strategy_class = STRATEGIES[strategy_id]
            result = await self.backtest_strategy(strategy_id, strategy_class)
            results.append(result)

            # Print summary
            print(f"  Signals: {result.total_signals}, Trades: {result.total_trades}")
            print(f"  Return: {result.total_return*100:.2f}%, Sharpe: {result.sharpe_ratio:.2f}")
            print(f"  Win Rate: {result.win_rate*100:.1f}%, Max DD: {result.max_drawdown*100:.2f}%")

        return results


def print_comparison_table(results: List[StrategyResult]) -> None:
    """Print comparison table of all strategies."""
    print("\n" + "=" * 100)
    print("STRATEGY COMPARISON - BACKTEST RESULTS")
    print("=" * 100)

    # Header
    print(f"\n{'Strategy':<20} {'Return':>10} {'Annual':>10} {'Sharpe':>8} {'Sortino':>8} {'MaxDD':>8} {'WinRate':>8} {'Trades':>8}")
    print("-" * 100)

    # Sort by Sharpe ratio
    sorted_results = sorted(results, key=lambda r: r.sharpe_ratio, reverse=True)

    for r in sorted_results:
        print(f"{r.strategy_id:<20} {r.total_return*100:>9.2f}% {r.annualized_return*100:>9.2f}% "
              f"{r.sharpe_ratio:>8.2f} {r.sortino_ratio:>8.2f} {r.max_drawdown*100:>7.2f}% "
              f"{r.win_rate*100:>7.1f}% {r.total_trades:>8}")

    print("-" * 100)

    # Best performers
    print("\n📊 TOP PERFORMERS:")
    if sorted_results:
        best_return = max(results, key=lambda r: r.total_return)
        best_sharpe = max(results, key=lambda r: r.sharpe_ratio)
        best_winrate = max(results, key=lambda r: r.win_rate if r.total_trades > 0 else 0)
        lowest_dd = min(results, key=lambda r: r.max_drawdown if r.total_trades > 0 else 1)

        print(f"  Best Return:    {best_return.strategy_id} ({best_return.total_return*100:.2f}%)")
        print(f"  Best Sharpe:    {best_sharpe.strategy_id} ({best_sharpe.sharpe_ratio:.2f})")
        print(f"  Best Win Rate:  {best_winrate.strategy_id} ({best_winrate.win_rate*100:.1f}%)")
        print(f"  Lowest MaxDD:   {lowest_dd.strategy_id} ({lowest_dd.max_drawdown*100:.2f}%)")

    print("=" * 100)


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Backtest all Signal Service strategies")
    parser.add_argument("--symbols", type=str, default="AAPL,MSFT,GOOGL,AMZN,NVDA",
                       help="Comma-separated symbols")
    parser.add_argument("--strategies", type=str, default=None,
                       help="Comma-separated strategies (default: all)")
    parser.add_argument("--market", type=str, default="US")
    parser.add_argument("--start", type=str, default=None)
    parser.add_argument("--end", type=str, default=None)
    parser.add_argument("--capital", type=float, default=100000.0)
    parser.add_argument("--realistic", action="store_true")
    parser.add_argument("--slippage-bps", type=float, default=5.0)
    parser.add_argument("--output", type=str, default=None)

    args = parser.parse_args()

    # Parse dates
    end_date = date.fromisoformat(args.end) if args.end else date.today()
    start_date = date.fromisoformat(args.start) if args.start else end_date - timedelta(days=365)

    # Parse symbols and strategies
    symbols = [s.strip().upper() for s in args.symbols.split(",")]
    strategies = [s.strip() for s in args.strategies.split(",")] if args.strategies else list(STRATEGIES.keys())

    print(f"\n🚀 COMPREHENSIVE STRATEGY BACKTEST")
    print(f"   Period: {start_date} to {end_date}")
    print(f"   Symbols: {', '.join(symbols)}")
    print(f"   Strategies: {len(strategies)}")
    print(f"   Capital: ${args.capital:,.0f}")
    print(f"   Realistic Mode: {args.realistic}")

    config = BacktestConfig(
        symbols=symbols,
        strategies=strategies,
        market=args.market,
        start_date=start_date,
        end_date=end_date,
        initial_capital=args.capital,
        realistic=args.realistic,
        slippage_bps=args.slippage_bps,
    )

    backtester = StrategyBacktester(config)
    results = await backtester.run_all()

    # Print comparison
    print_comparison_table(results)

    # Save results
    if args.output:
        output_data = {
            "config": {
                "symbols": symbols,
                "strategies": strategies,
                "start_date": str(start_date),
                "end_date": str(end_date),
                "initial_capital": args.capital,
                "realistic": args.realistic,
            },
            "results": [r.to_dict() for r in results],
            "generated_at": datetime.now().isoformat(),
        }

        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w') as f:
            json.dump(output_data, f, indent=2)
        print(f"\n📁 Results saved to: {output_path}")


if __name__ == "__main__":
    asyncio.run(main())
