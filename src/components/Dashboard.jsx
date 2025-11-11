import React, { useState, useEffect } from 'react';
import { getPositions, getPosition } from '../utils/contracts';
import PositionCard from './PositionCard';
import '../styles/Dashboard.css';

const Dashboard = ({ account, contracts, onAddPosition }) => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // active, paused, past
  const [refreshing, setRefreshing] = useState(false);

  const fetchPositions = async () => {
    try {
      setRefreshing(true);
      const positionIds = await getPositions(contracts.callback);

      const positionsData = await Promise.all(
        positionIds.map(async (id) => {
          const data = await getPosition(contracts.callback, id);
          return {
            id: Number(id),
            ...data,
          };
        })
      );

      setPositions(positionsData);
    } catch (error) {
      console.error('Error fetching positions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (contracts.callback) {
      fetchPositions();

      // Refresh every 30 seconds
      const interval = setInterval(fetchPositions, 30000);
      return () => clearInterval(interval);
    }
  }, [contracts.callback]);

  const filterPositions = (status) => {
    if (status === 'active') {
      return positions.filter((pos) => Number(pos.status) === 0);
    } else if (status === 'paused') {
      return positions.filter((pos) => Number(pos.status) === 1);
    } else {
      return positions.filter((pos) => Number(pos.status) >= 2);
    }
  };

  const activePositions = filterPositions('active');
  const pausedPositions = filterPositions('paused');
  const pastPositions = filterPositions('past');

  const currentPositions = filterPositions(activeTab);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading positions...</p>
      </div>
    );
  }

  return (
    <div className="dashboard fade-in">
      <div className="dashboard-header">
        <div className="dashboard-title-section">
          <h2 className="dashboard-title">Your Positions</h2>
          <button
            className="btn-refresh"
            onClick={fetchPositions}
            disabled={refreshing}
            title="Refresh"
          >
            ↻
          </button>
        </div>

        <button className="btn btn-success" onClick={onAddPosition}>
          + Add Protection
        </button>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-value">{activePositions.length}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pausedPositions.length}</div>
          <div className="stat-label">Paused</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pastPositions.length}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{positions.length}</div>
          <div className="stat-label">Total</div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active ({activePositions.length})
        </button>
        <button
          className={`tab ${activeTab === 'paused' ? 'active' : ''}`}
          onClick={() => setActiveTab('paused')}
        >
          Paused ({pausedPositions.length})
        </button>
        <button
          className={`tab ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Past ({pastPositions.length})
        </button>
      </div>

      <div className="positions-grid">
        {currentPositions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No {activeTab} positions</h3>
            <p>
              {activeTab === 'active'
                ? 'Create your first profit-locking position to get started'
                : `You have no ${activeTab} positions yet`}
            </p>
          </div>
        ) : (
          currentPositions.map((position) => (
            <PositionCard
              key={position.id}
              position={position}
              callbackAddress={contracts.callback}
              onUpdate={fetchPositions}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;
