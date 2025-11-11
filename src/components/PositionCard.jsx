import React, { useState } from 'react';
import { ethers } from 'ethers';
import { pausePosition, resumePosition, cancelPosition, getCurrentPrice } from '../utils/contracts';
import { formatUnits } from '../utils/web3';
import { getStatusColor, getStatusText, basisPointsToPercent, formatTimeAgo } from '../utils/helpers';
import PriceChart from './PriceChart';
import '../styles/PositionCard.css';

const PositionCard = ({ position, callbackAddress, onUpdate }) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(null);

  const handlePause = async () => {
    try {
      setLoading(true);
      await pausePosition(callbackAddress, position.id);
      onUpdate();
    } catch (error) {
      console.error('Error pausing position:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setLoading(true);
      await resumePosition(callbackAddress, position.id);
      onUpdate();
    } catch (error) {
      console.error('Error resuming position:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this position?')) {
      return;
    }

    try {
      setLoading(true);
      await cancelPosition(callbackAddress, position.id);
      onUpdate();
    } catch (error) {
      console.error('Error cancelling position:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentPrice = async () => {
    try {
      const price = await getCurrentPrice(callbackAddress, position.pair, position.sellToken0);
      setCurrentPrice(price);
    } catch (error) {
      console.error('Error loading price:', error);
    }
  };

  const handleMouseEnter = () => {
    setShowModal(true);
    loadCurrentPrice();
  };

  const handleMouseLeave = () => {
    setShowModal(false);
  };

  const status = Number(position.status);
  const statusColor = getStatusColor(status);
  const statusText = getStatusText(status);

  const entryPrice = formatUnits(position.entryPrice, 18);
  const hardStopPrice = formatUnits(position.hardStopPrice, 18);
  const nextMilestone = formatUnits(position.nextProfitMilestone, 18);
  const baseAmount = formatUnits(position.baseAmount, 18);
  const remainingBase = formatUnits(position.remainingBase, 18);
  const totalProfits = formatUnits(position.totalProfitsSold, 18);

  const hardStopPercent = basisPointsToPercent(Number(position.hardStopPercent));
  const profitPercent = basisPointsToPercent(Number(position.profitTakePercent));

  const createdAt = Number(position.createdAt);

  return (
    <>
      <div
        className="position-card glass-card"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="position-header">
          <div className="position-id">
            Position #{position.id}
          </div>
          <div
            className="position-status"
            style={{ color: statusColor, borderColor: statusColor }}
          >
            {statusText}
          </div>
        </div>

        <div className="position-pair">
          <span className="pair-label">Pair:</span>
          <span className="pair-address mono">{position.pair.slice(0, 10)}...{position.pair.slice(-8)}</span>
        </div>

        <div className="position-details">
          <div className="detail-row">
            <span className="detail-label">Entry Price:</span>
            <span className="detail-value mono">{parseFloat(entryPrice).toFixed(6)}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Hard Stop:</span>
            <span className="detail-value mono text-red">
              {parseFloat(hardStopPrice).toFixed(6)} (-{hardStopPercent}%)
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Next Milestone:</span>
            <span className="detail-value mono text-green">
              {parseFloat(nextMilestone).toFixed(6)} (+{profitPercent}%)
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Base Amount:</span>
            <span className="detail-value mono">{parseFloat(baseAmount).toFixed(4)}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Remaining:</span>
            <span className="detail-value mono">{parseFloat(remainingBase).toFixed(4)}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Profits Sold:</span>
            <span className="detail-value mono text-cyan">{parseFloat(totalProfits).toFixed(4)}</span>
          </div>

          {currentPrice && (
            <div className="detail-row">
              <span className="detail-label">Current Price:</span>
              <span className="detail-value mono text-cyan">
                {parseFloat(formatUnits(currentPrice, 18)).toFixed(6)}
              </span>
            </div>
          )}
        </div>

        <div className="position-footer">
          <span className="position-time">{formatTimeAgo(createdAt)}</span>

          <div className="position-actions">
            {status === 0 && (
              <>
                <button
                  className="btn-icon btn-warning"
                  onClick={handlePause}
                  disabled={loading}
                  title="Pause"
                >
                  ⏸
                </button>
                <button
                  className="btn-icon btn-danger"
                  onClick={handleCancel}
                  disabled={loading}
                  title="Cancel"
                >
                  ✕
                </button>
              </>
            )}

            {status === 1 && (
              <>
                <button
                  className="btn-icon btn-success"
                  onClick={handleResume}
                  disabled={loading}
                  title="Resume"
                >
                  ▶
                </button>
                <button
                  className="btn-icon btn-danger"
                  onClick={handleCancel}
                  disabled={loading}
                  title="Cancel"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="position-modal">
          <div className="modal-content">
            <PriceChart
              pairAddress={position.pair}
              sellToken="Token"
              buyToken="Token"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default PositionCard;
