import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import '../styles/App.css';

const HomePage = ({ account, isDeployed, contracts }) => {
  const navigate = useNavigate();
  const { connect } = useWeb3();

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-content glass-card fade-in">
        <div className="welcome-icon">⚡</div>
        <h1 className="welcome-title">Profit-Locking Trailing Stop System</h1>
        <p className="welcome-description">
          Automated profit-locking system for Uniswap V2. Lock profits incrementally while
          keeping your base position alive to capture unlimited upside.
        </p>

        <div className="features">
          <div className="feature">
            <div className="feature-icon">🎯</div>
            <h3>Incremental Profit Locking</h3>
            <p>Lock profits at milestones without exiting your position</p>
          </div>

          <div className="feature">
            <div className="feature-icon">🛡️</div>
            <h3>Hard Stop Protection</h3>
            <p>Absolute floor protection for catastrophic events</p>
          </div>

          <div className="feature">
            <div className="feature-icon">🚀</div>
            <h3>Unlimited Upside</h3>
            <p>Base position stays alive to ride unlimited trends</p>
          </div>

          <div className="feature">
            <div className="feature-icon">🤖</div>
            <h3>Automated 24/7</h3>
            <p>Reactive Network monitors and executes automatically</p>
          </div>
        </div>

        {!account ? (
          <div className="landing-actions">
            <button className="btn btn-primary btn-large" onClick={connect}>
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="landing-actions">
            <button className="btn btn-success btn-large" onClick={handleGoToDashboard}>
              Go to Dashboard →
            </button>
            {isDeployed && (
              <p className="deployment-status">
                ✓ Contracts deployed • {contracts.callback ? '1 Callback' : ''} • {contracts.reactive ? '1 Reactive' : ''}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
