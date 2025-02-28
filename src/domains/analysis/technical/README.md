# Technical Analysis Services 
This module provides a set of technical analysis services used in trading strategies.

## Implemented Indicators

### 📊 **Momentum Indicators**
1. **Relative Strength Index (RSI)**
   - Measures the speed and change of price movements.
   - Identifies overbought (>70) and oversold (<30) conditions.

2. **Moving Average Convergence Divergence (MACD)**
   - Uses short-term (12) and long-term (26) EMAs to generate a MACD line.
   - A 9-period EMA of the MACD line is used as a signal.
   - Histogram helps in identifying crossovers and momentum shifts.

3. **Stochastic Oscillator**
   - Compares a closing price to a range of prices over a set period.
   - %K (fast stochastic) and %D (slow stochastic) values indicate momentum.
   - Identifies overbought (>80) and oversold (<20) conditions.

4. **Rate of Change (ROC)**
   - Measures the percentage change in price over a defined period.
   - Indicates momentum shifts and potential reversals.

### 🔥 **Trend Indicators**
5. **Moving Averages (SMA & EMA)**
   - SMA: Simple average of prices over a defined period.
   - EMA: Exponential weighting to give more importance to recent prices.
   - Used to identify trend direction and crossovers.

6. **Ichimoku Cloud**
   - A complete trend-following system with multiple components:
     - **Tenkan-Sen (Conversion Line)**: 9-period high-low average.
     - **Kijun-Sen (Base Line)**: 26-period high-low average.
     - **Senkou Span A & B (Cloud Levels)**: Define support/resistance and trend.
     - **Chikou Span (Lagging Line)**: Used for confirmation.
   - Identifies support/resistance levels and market trends.

7. **ADX (Average Directional Index)**
   - Measures trend strength using DI+ and DI- components.
   - ADX above 25 indicates a strong trend, below 20 suggests a weak trend.

### 📏 **Support & Resistance Indicators**
8. **Pivot Points**
   - Calculates key support and resistance levels using high, low, and close prices.
   - Provides **Pivot (PP), Resistance (R1), and Support (S1)** levels.

9. **Support & Resistance Analysis**
   - Detects key price levels based on historical data.
   - Identifies trendlines and significant market levels.

### 🎢 **Volatility Indicators**
10. **Bollinger Bands**
   - Uses a 20-period SMA with upper and lower bands calculated using standard deviations.
   - Identifies volatility expansion/contraction and breakout signals.

### 📈 **Volume-Based Indicators**
11. **Volume Analysis**
   - Computes average volume over a defined period.
   - Detects volume trends and significant changes.
   - Identifies dominant price levels based on volume concentration.

