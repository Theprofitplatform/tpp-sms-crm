"""
Technical Indicators Module

Provides a comprehensive set of technical analysis indicators.

Categories:
- Trend: SMA, EMA, MACD
- Momentum: RSI, Stochastic
- Volatility: Bollinger Bands, ATR
- Volume: OBV, VWAP
"""

from typing import List, Optional
import numpy as np
import pandas as pd


class TechnicalIndicators:
    """
    Technical analysis indicators calculator.

    All methods are static and operate on price/volume data.
    """

    # =========================================================================
    # Trend Indicators
    # =========================================================================

    @staticmethod
    def sma(prices: List[float], period: int) -> List[Optional[float]]:
        """
        Simple Moving Average.

        Args:
            prices: List of closing prices
            period: Lookback period

        Returns:
            List of SMA values (None for insufficient data)
        """
        result = [None] * (period - 1)
        for i in range(period - 1, len(prices)):
            result.append(sum(prices[i - period + 1:i + 1]) / period)
        return result

    @staticmethod
    def ema(prices: List[float], period: int) -> List[Optional[float]]:
        """
        Exponential Moving Average.

        Args:
            prices: List of closing prices
            period: Lookback period

        Returns:
            List of EMA values
        """
        if len(prices) < period:
            return [None] * len(prices)

        multiplier = 2 / (period + 1)

        # Initialize with SMA
        result = [None] * (period - 1)
        sma = sum(prices[:period]) / period
        result.append(sma)

        # Calculate EMA
        for i in range(period, len(prices)):
            ema = (prices[i] - result[-1]) * multiplier + result[-1]
            result.append(ema)

        return result

    @staticmethod
    def macd(
        prices: List[float],
        fast_period: int = 12,
        slow_period: int = 26,
        signal_period: int = 9,
    ) -> dict:
        """
        Moving Average Convergence Divergence.

        Args:
            prices: List of closing prices
            fast_period: Fast EMA period (default 12)
            slow_period: Slow EMA period (default 26)
            signal_period: Signal line period (default 9)

        Returns:
            Dictionary with 'macd', 'signal', 'histogram' lists
        """
        fast_ema = TechnicalIndicators.ema(prices, fast_period)
        slow_ema = TechnicalIndicators.ema(prices, slow_period)

        macd_line = []
        for fast, slow in zip(fast_ema, slow_ema):
            if fast is not None and slow is not None:
                macd_line.append(fast - slow)
            else:
                macd_line.append(None)

        # Signal line (EMA of MACD)
        valid_macd = [m for m in macd_line if m is not None]
        signal_line = TechnicalIndicators.ema(valid_macd, signal_period)

        # Pad signal line
        pad_length = len(macd_line) - len(signal_line)
        signal_padded = [None] * pad_length + signal_line

        # Histogram
        histogram = []
        for m, s in zip(macd_line, signal_padded):
            if m is not None and s is not None:
                histogram.append(m - s)
            else:
                histogram.append(None)

        return {
            'macd': macd_line,
            'signal': signal_padded,
            'histogram': histogram,
        }

    # =========================================================================
    # Momentum Indicators
    # =========================================================================

    @staticmethod
    def rsi(prices: List[float], period: int = 14) -> List[Optional[float]]:
        """
        Relative Strength Index.

        Args:
            prices: List of closing prices
            period: Lookback period (default 14)

        Returns:
            List of RSI values (0-100)
        """
        if len(prices) < period + 1:
            return [None] * len(prices)

        # Calculate price changes
        changes = [prices[i] - prices[i - 1] for i in range(1, len(prices))]

        # Separate gains and losses
        gains = [max(0, c) for c in changes]
        losses = [abs(min(0, c)) for c in changes]

        result = [None] * period

        # First RSI value using simple average
        avg_gain = sum(gains[:period]) / period
        avg_loss = sum(losses[:period]) / period

        if avg_loss == 0:
            result.append(100.0)
        else:
            rs = avg_gain / avg_loss
            result.append(100 - (100 / (1 + rs)))

        # Subsequent RSI values using smoothed average
        for i in range(period, len(changes)):
            avg_gain = (avg_gain * (period - 1) + gains[i]) / period
            avg_loss = (avg_loss * (period - 1) + losses[i]) / period

            if avg_loss == 0:
                result.append(100.0)
            else:
                rs = avg_gain / avg_loss
                result.append(100 - (100 / (1 + rs)))

        return result

    @staticmethod
    def stochastic(
        highs: List[float],
        lows: List[float],
        closes: List[float],
        k_period: int = 14,
        d_period: int = 3,
    ) -> dict:
        """
        Stochastic Oscillator.

        Args:
            highs: List of high prices
            lows: List of low prices
            closes: List of closing prices
            k_period: %K period (default 14)
            d_period: %D period (default 3)

        Returns:
            Dictionary with 'k' and 'd' lists
        """
        if len(closes) < k_period:
            return {'k': [None] * len(closes), 'd': [None] * len(closes)}

        k_values = [None] * (k_period - 1)

        for i in range(k_period - 1, len(closes)):
            highest_high = max(highs[i - k_period + 1:i + 1])
            lowest_low = min(lows[i - k_period + 1:i + 1])

            if highest_high - lowest_low == 0:
                k_values.append(50.0)
            else:
                k_values.append(
                    ((closes[i] - lowest_low) / (highest_high - lowest_low)) * 100
                )

        # %D is SMA of %K
        d_values = TechnicalIndicators.sma(
            [k for k in k_values if k is not None],
            d_period,
        )
        d_padded = [None] * (len(k_values) - len(d_values)) + d_values

        return {'k': k_values, 'd': d_padded}

    # =========================================================================
    # Volatility Indicators
    # =========================================================================

    @staticmethod
    def bollinger_bands(
        prices: List[float],
        period: int = 20,
        std_dev: float = 2.0,
    ) -> dict:
        """
        Bollinger Bands.

        Args:
            prices: List of closing prices
            period: SMA period (default 20)
            std_dev: Standard deviation multiplier (default 2.0)

        Returns:
            Dictionary with 'upper', 'middle', 'lower' lists
        """
        middle = TechnicalIndicators.sma(prices, period)

        upper = []
        lower = []

        for i in range(len(prices)):
            if middle[i] is None:
                upper.append(None)
                lower.append(None)
            else:
                window = prices[max(0, i - period + 1):i + 1]
                std = np.std(window)
                upper.append(middle[i] + std_dev * std)
                lower.append(middle[i] - std_dev * std)

        return {
            'upper': upper,
            'middle': middle,
            'lower': lower,
        }

    @staticmethod
    def atr(
        highs: List[float],
        lows: List[float],
        closes: List[float],
        period: int = 14,
    ) -> List[Optional[float]]:
        """
        Average True Range.

        Args:
            highs: List of high prices
            lows: List of low prices
            closes: List of closing prices
            period: Lookback period (default 14)

        Returns:
            List of ATR values
        """
        if len(closes) < 2:
            return [None] * len(closes)

        # Calculate True Range
        tr = [highs[0] - lows[0]]  # First TR
        for i in range(1, len(closes)):
            tr.append(max(
                highs[i] - lows[i],
                abs(highs[i] - closes[i - 1]),
                abs(lows[i] - closes[i - 1]),
            ))

        # ATR is EMA of TR
        return TechnicalIndicators.ema(tr, period)

    # =========================================================================
    # Trend Strength Indicators
    # =========================================================================

    @staticmethod
    def adx(
        highs: List[float],
        lows: List[float],
        closes: List[float],
        period: int = 14,
    ) -> dict:
        """
        Average Directional Index (ADX) with +DI and -DI.

        ADX measures trend strength (not direction):
        - ADX < 20: Weak trend (ranging market)
        - ADX 20-25: Trend starting
        - ADX 25-50: Strong trend
        - ADX 50-75: Very strong trend
        - ADX > 75: Extremely strong trend

        Args:
            highs: List of high prices
            lows: List of low prices
            closes: List of closing prices
            period: Lookback period (default 14)

        Returns:
            Dictionary with 'adx', 'plus_di', 'minus_di' lists
        """
        if len(closes) < period + 1:
            return {
                'adx': [None] * len(closes),
                'plus_di': [None] * len(closes),
                'minus_di': [None] * len(closes),
            }

        # Calculate True Range
        tr = [highs[0] - lows[0]]
        for i in range(1, len(closes)):
            tr.append(max(
                highs[i] - lows[i],
                abs(highs[i] - closes[i - 1]),
                abs(lows[i] - closes[i - 1]),
            ))

        # Calculate +DM and -DM (Directional Movement)
        plus_dm = [0.0]
        minus_dm = [0.0]

        for i in range(1, len(closes)):
            up_move = highs[i] - highs[i - 1]
            down_move = lows[i - 1] - lows[i]

            if up_move > down_move and up_move > 0:
                plus_dm.append(up_move)
            else:
                plus_dm.append(0.0)

            if down_move > up_move and down_move > 0:
                minus_dm.append(down_move)
            else:
                minus_dm.append(0.0)

        # Smooth TR, +DM, -DM using Wilder's smoothing
        def wilder_smooth(values: List[float], period: int) -> List[float]:
            result = [None] * (period - 1)
            # First value is simple sum
            first_sum = sum(values[:period])
            result.append(first_sum)
            # Subsequent values use smoothing
            for i in range(period, len(values)):
                smoothed = result[-1] - (result[-1] / period) + values[i]
                result.append(smoothed)
            return result

        smoothed_tr = wilder_smooth(tr, period)
        smoothed_plus_dm = wilder_smooth(plus_dm, period)
        smoothed_minus_dm = wilder_smooth(minus_dm, period)

        # Calculate +DI and -DI
        plus_di = []
        minus_di = []
        dx = []

        for i in range(len(smoothed_tr)):
            if smoothed_tr[i] is None or smoothed_tr[i] == 0:
                plus_di.append(None)
                minus_di.append(None)
                dx.append(None)
            else:
                pdi = (smoothed_plus_dm[i] / smoothed_tr[i]) * 100
                mdi = (smoothed_minus_dm[i] / smoothed_tr[i]) * 100
                plus_di.append(pdi)
                minus_di.append(mdi)

                # Calculate DX
                di_sum = pdi + mdi
                if di_sum == 0:
                    dx.append(0.0)
                else:
                    dx.append(abs(pdi - mdi) / di_sum * 100)

        # Calculate ADX (smoothed DX)
        valid_dx = [d for d in dx if d is not None]
        if len(valid_dx) < period:
            return {
                'adx': [None] * len(closes),
                'plus_di': plus_di,
                'minus_di': minus_di,
            }

        # First ADX is simple average
        adx = [None] * (len(dx) - len(valid_dx) + period - 1)
        first_adx = sum(valid_dx[:period]) / period
        adx.append(first_adx)

        # Subsequent ADX values using smoothing
        for i in range(period, len(valid_dx)):
            smoothed_adx = (adx[-1] * (period - 1) + valid_dx[i]) / period
            adx.append(smoothed_adx)

        return {
            'adx': adx,
            'plus_di': plus_di,
            'minus_di': minus_di,
        }

    @staticmethod
    def highest_high(highs: List[float], period: int) -> List[Optional[float]]:
        """
        Highest high over a period (for breakout detection).

        Args:
            highs: List of high prices
            period: Lookback period

        Returns:
            List of highest high values (None for insufficient data)
        """
        result = [None] * (period - 1)
        for i in range(period - 1, len(highs)):
            result.append(max(highs[i - period + 1:i + 1]))
        return result

    @staticmethod
    def lowest_low(lows: List[float], period: int) -> List[Optional[float]]:
        """
        Lowest low over a period (for breakout detection).

        Args:
            lows: List of low prices
            period: Lookback period

        Returns:
            List of lowest low values (None for insufficient data)
        """
        result = [None] * (period - 1)
        for i in range(period - 1, len(lows)):
            result.append(min(lows[i - period + 1:i + 1]))
        return result

    # =========================================================================
    # Volume Indicators
    # =========================================================================

    @staticmethod
    def obv(closes: List[float], volumes: List[int]) -> List[float]:
        """
        On-Balance Volume.

        Args:
            closes: List of closing prices
            volumes: List of volumes

        Returns:
            List of OBV values
        """
        obv = [volumes[0]]

        for i in range(1, len(closes)):
            if closes[i] > closes[i - 1]:
                obv.append(obv[-1] + volumes[i])
            elif closes[i] < closes[i - 1]:
                obv.append(obv[-1] - volumes[i])
            else:
                obv.append(obv[-1])

        return obv

    @staticmethod
    def vwap(
        highs: List[float],
        lows: List[float],
        closes: List[float],
        volumes: List[int],
    ) -> List[float]:
        """
        Volume Weighted Average Price.

        Args:
            highs: List of high prices
            lows: List of low prices
            closes: List of closing prices
            volumes: List of volumes

        Returns:
            List of VWAP values
        """
        typical_prices = [(h + l + c) / 3 for h, l, c in zip(highs, lows, closes)]

        cumulative_tp_vol = 0
        cumulative_vol = 0
        vwap = []

        for tp, vol in zip(typical_prices, volumes):
            cumulative_tp_vol += tp * vol
            cumulative_vol += vol

            if cumulative_vol > 0:
                vwap.append(cumulative_tp_vol / cumulative_vol)
            else:
                vwap.append(tp)

        return vwap

    # =========================================================================
    # Composite Methods
    # =========================================================================

    @staticmethod
    def calculate_all(
        opens: List[float],
        highs: List[float],
        lows: List[float],
        closes: List[float],
        volumes: List[int],
    ) -> dict:
        """
        Calculate all indicators at once.

        Returns dictionary with all indicator values at the last bar.
        """
        # Get the last valid index
        n = len(closes) - 1

        # Calculate all indicators
        sma_20 = TechnicalIndicators.sma(closes, 20)
        sma_50 = TechnicalIndicators.sma(closes, 50)
        ema_12 = TechnicalIndicators.ema(closes, 12)
        ema_26 = TechnicalIndicators.ema(closes, 26)
        rsi = TechnicalIndicators.rsi(closes, 14)
        macd = TechnicalIndicators.macd(closes)
        bb = TechnicalIndicators.bollinger_bands(closes)
        atr = TechnicalIndicators.atr(highs, lows, closes)
        stoch = TechnicalIndicators.stochastic(highs, lows, closes)

        return {
            'price': closes[n],
            'sma_20': sma_20[n],
            'sma_50': sma_50[n] if n < len(sma_50) else None,
            'ema_12': ema_12[n],
            'ema_26': ema_26[n],
            'rsi_14': rsi[n] if n < len(rsi) else None,
            'macd': macd['macd'][n] if n < len(macd['macd']) else None,
            'macd_signal': macd['signal'][n] if n < len(macd['signal']) else None,
            'macd_histogram': macd['histogram'][n] if n < len(macd['histogram']) else None,
            'bb_upper': bb['upper'][n],
            'bb_middle': bb['middle'][n],
            'bb_lower': bb['lower'][n],
            'atr_14': atr[n] if n < len(atr) else None,
            'stoch_k': stoch['k'][n] if n < len(stoch['k']) else None,
            'stoch_d': stoch['d'][n] if n < len(stoch['d']) else None,
        }
