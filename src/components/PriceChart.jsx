import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import '../styles/PriceChart.css';

const PriceChart = ({ pairAddress, sellToken, buyToken }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!chartContainerRef.current || !pairAddress) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    try {
      // Create chart
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
        borderDownColor: '#ff4444',
        borderUpColor: '#00ff88',
        wickDownColor: '#ff4444',
        wickUpColor: '#00ff88',
      });

      // Generate mock data for demo purposes
      // In production, fetch real data from a DEX aggregator or subgraph
      const generateMockData = () => {
        const data = [];
        const now = Math.floor(Date.now() / 1000);
        const minutesAgo = 120;
        let basePrice = 100 + Math.random() * 50;

        for (let i = minutesAgo; i >= 0; i--) {
          const time = now - (i * 60);
          const volatility = 0.02;
          const change = (Math.random() - 0.5) * basePrice * volatility;
          basePrice += change;

          const open = basePrice;
          const close = basePrice + (Math.random() - 0.5) * basePrice * volatility;
          const high = Math.max(open, close) + Math.random() * basePrice * volatility * 0.5;
          const low = Math.min(open, close) - Math.random() * basePrice * volatility * 0.5;

          data.push({
            time,
            open,
            high,
            low,
            close,
          });
        }

        return data;
      };

      const mockData = generateMockData();
      candlestickSeries.setData(mockData);

      chart.timeScale().fitContent();

      chartRef.current = chart;
      setLoading(false);

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
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }
      };
    } catch (err) {
      console.error('Chart error:', err);
      setError('Failed to load chart');
      setLoading(false);
    }
  }, [pairAddress]);

  return (
    <div className="price-chart-container">
      <div className="chart-header">
        <h3 className="chart-title">
          {sellToken}/{buyToken}
        </h3>
        <span className="chart-subtitle">Last 120 Minutes</span>
      </div>

      {loading && (
        <div className="chart-loading">
          <div className="spinner"></div>
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
