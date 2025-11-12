import React, { useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';
import { createChart } from 'lightweight-charts';
import { getPairContract, getERC20Contract, getProvider } from '../utils/contracts';
import '../styles/PriceChart.css';

const PriceChart = ({ pairAddress, sellToken, buyToken, sellToken0 }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [timeRange, setTimeRange] = useState('1h');

  useEffect(() => {
    if (!chartContainerRef.current || !pairAddress) return;

    fetchHistoricalPrices();

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [pairAddress, timeRange, sellToken0]);

  const fetchHistoricalPrices = async () => {
    try {
      setLoading(true);
      setError('');
      setProgress(0);

      const provider = getProvider();
      const pairContract = await getPairContract(pairAddress);

      // Get token addresses
      const token0Address = await pairContract.token0();
      const token1Address = await pairContract.token1();

      const token0Contract = await getERC20Contract(token0Address);
      const token1Contract = await getERC20Contract(token1Address);

      const [decimals0, decimals1] = await Promise.all([
        token0Contract.decimals(),
        token1Contract.decimals()
      ]);

      const currentBlock = await provider.getBlockNumber();

      // Time range configuration for Sepolia (12 second blocks)
      const timeRangeConfig = {
        '15m': { blocks: 75, step: 2, dataPoints: 37, candleSize: 5 },
        '30m': { blocks: 150, step: 2, dataPoints: 75, candleSize: 10 },
        '1h': { blocks: 300, step: 3, dataPoints: 100, candleSize: 15 },
        '6h': { blocks: 1800, step: 15, dataPoints: 120, candleSize: 20 },
      };

      const config = timeRangeConfig[timeRange] || timeRangeConfig['1h'];
      const { blocks: totalBlocks, step: blockStep, dataPoints, candleSize } = config;

      const priceData = [];

      // Fetch historical data
      for (let i = 0; i < dataPoints; i++) {
        const blockNumber = currentBlock - (totalBlocks - (i * blockStep));
        if (blockNumber < 0) break;

        try {
          const reserves = await pairContract.getReserves({ blockTag: blockNumber });
          const reserve0 = parseFloat(ethers.formatUnits(reserves.reserve0, decimals0));
          const reserve1 = parseFloat(ethers.formatUnits(reserves.reserve1, decimals1));

          if (reserve0 > 0 && reserve1 > 0) {
            // Calculate price based on which token is being sold
            // If selling token0, price = reserve1/reserve0 (how much token1 per token0)
            // If selling token1, price = reserve0/reserve1 (how much token0 per token1)
            const price = sellToken0 ? (reserve1 / reserve0) : (reserve0 / reserve1);
            const block = await provider.getBlock(blockNumber);
            const timestamp = Number(block.timestamp);

            priceData.push({
              time: timestamp,
              price: price
            });
          }
        } catch (err) {
          console.log(`Skipping block ${blockNumber}:`, err.message);
        }

        // Update progress
        const progressPercent = Math.round(((i + 1) / dataPoints) * 100);
        setProgress(progressPercent);

        // Small delay to avoid rate limiting
        if (i % 5 === 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (priceData.length === 0) {
        throw new Error('No price data available. The pair might be too new.');
      }

      // Convert to candlestick data
      const candlestickData = [];
      for (let i = 0; i < priceData.length; i += candleSize) {
        const chunk = priceData.slice(i, Math.min(i + candleSize, priceData.length));
        if (chunk.length === 0) continue;

        const prices = chunk.map(d => d.price);
        const open = prices[0];
        const close = prices[prices.length - 1];
        const high = Math.max(...prices);
        const low = Math.min(...prices);
        const time = chunk[0].time;

        candlestickData.push({
          time,
          open,
          high,
          low,
          close
        });
      }

      // Create chart
      if (chartRef.current) {
        chartRef.current.remove();
      }

      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 300,
        layout: {
          background: { color: 'transparent' },
          textColor: '#b0b0c0',
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        crosshair: {
          mode: 1,
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#00ff88',
        downColor: '#ff4444',
        borderUpColor: '#00ff88',
        borderDownColor: '#ff4444',
        wickUpColor: '#00ff88',
        wickDownColor: '#ff4444',
      });

      candlestickSeries.setData(candlestickData);
      chart.timeScale().fitContent();

      chartRef.current = chart;
      setLoading(false);
      setProgress(100);

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };

    } catch (err) {
      console.error('Chart error:', err);
      setError(err.message || 'Failed to load price data');
      setLoading(false);
    }
  };

  return (
    <div className="price-chart-container">
      <div className="chart-header">
        <div className="chart-title-section">
          <h3 className="chart-title">
            {sellToken}/{buyToken}
          </h3>
          <span className="chart-subtitle">Historical Price</span>
        </div>

        <div className="chart-time-range">
          {['15m', '30m', '1h', '6h'].map((range) => (
            <button
              key={range}
              className={`time-btn ${timeRange === range ? 'active' : ''}`}
              onClick={() => setTimeRange(range)}
              disabled={loading}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="chart-loading">
          <div className="chart-loader-spinner"></div>
          <p className="chart-loader-text">Loading price data... {progress}%</p>
        </div>
      )}

      {error && (
        <div className="chart-error text-red">{error}</div>
      )}

      <div
        ref={chartContainerRef}
        className="chart-canvas"
        style={{ visibility: loading ? 'hidden' : 'visible' }}
      />
    </div>
  );
};

export default PriceChart;
