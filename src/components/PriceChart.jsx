import React, { useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';
import { createChart } from 'lightweight-charts';
import { getPairContractRead, getERC20ContractRead, getReadProvider } from '../utils/contracts';
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

      const provider = getReadProvider();
      const pairContract = getPairContractRead(pairAddress);

      // Get token addresses
      const token0Address = await pairContract.token0();
      const token1Address = await pairContract.token1();

      const token0Contract = getERC20ContractRead(token0Address);
      const token1Contract = getERC20ContractRead(token1Address);

      const [decimals0, decimals1, currentBlock] = await Promise.all([
        token0Contract.decimals(),
        token1Contract.decimals(),
        provider.getBlockNumber()
      ]);

      // Time range configuration for Sepolia (12 second blocks)
      const timeRangeConfig = {
        '15m': { blocks: 75, step: 2, dataPoints: 37, candleSize: 5, batchSize: 10 },
        '30m': { blocks: 150, step: 2, dataPoints: 75, candleSize: 10, batchSize: 15 },
        '1h': { blocks: 300, step: 3, dataPoints: 100, candleSize: 15, batchSize: 20 },
        '6h': { blocks: 1800, step: 15, dataPoints: 120, candleSize: 20, batchSize: 30 },
      };

      const config = timeRangeConfig[timeRange] || timeRangeConfig['1h'];
      const { blocks: totalBlocks, step: blockStep, dataPoints, candleSize, batchSize } = config;

      // Calculate block numbers upfront
      const blockNumbers = [];
      for (let i = 0; i < dataPoints; i++) {
        const blockNumber = currentBlock - (totalBlocks - (i * blockStep));
        if (blockNumber > 0) blockNumbers.push(blockNumber);
      }

      const priceData = [];

      // Fetch data in batches using Promise.all for parallel requests
      for (let i = 0; i < blockNumbers.length; i += batchSize) {
        const batch = blockNumbers.slice(i, Math.min(i + batchSize, blockNumbers.length));

        // Parallel fetch for this batch
        const batchPromises = batch.map(async (blockNumber, index) => {
          try {
            const reserves = await pairContract.getReserves({ blockTag: blockNumber });
            const reserve0 = parseFloat(ethers.formatUnits(reserves.reserve0, decimals0));
            const reserve1 = parseFloat(ethers.formatUnits(reserves.reserve1, decimals1));

            if (reserve0 > 0 && reserve1 > 0) {
              // Calculate price based on which token is being sold
              const price = sellToken0 ? (reserve1 / reserve0) : (reserve0 / reserve1);

              // Estimate timestamp (12 second blocks on Sepolia)
              const estimatedTimestamp = Math.floor(Date.now() / 1000) - ((currentBlock - blockNumber) * 12);

              return {
                time: estimatedTimestamp,
                price: price,
                blockNumber: blockNumber
              };
            }
          } catch (err) {
            console.log(`Skipping block ${blockNumber}:`, err.message);
          }
          return null;
        });

        const batchResults = await Promise.all(batchPromises);

        // Add valid results to priceData
        batchResults.forEach(result => {
          if (result) priceData.push(result);
        });

        // Update progress
        const progressPercent = Math.round(((i + batchSize) / blockNumbers.length) * 100);
        setProgress(Math.min(progressPercent, 99));
      }

      if (priceData.length === 0) {
        throw new Error('No price data available. The pair might be too new.');
      }

      // Sort by time (important since parallel fetching may return out of order)
      priceData.sort((a, b) => a.time - b.time);

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
