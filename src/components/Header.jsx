import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Header.css';

const Header = ({ account, formattedAccount, onConnect, isConnecting, chainId, contracts }) => {
  const navigate = useNavigate();

  const getNetworkName = (chainId) => {
    switch (chainId) {
      case 11155111:
        return 'Sepolia';
      case 5318007:
        return 'Reactive Lasna';
      default:
        return 'Unknown';
    }
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="header-logo">
            <div className="logo-icon">⚡</div>
            <div className="logo-text">
              <h1 className="logo-title">PROFIT-LOCK</h1>
              <p className="logo-subtitle">Trailing Stop System</p>
            </div>
          </div>

          <div className="header-right">
            {account && (
              <nav className="header-nav">
                <button className="nav-link" onClick={() => navigate('/')}>
                  Home
                </button>
                <button className="nav-link" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </button>
              </nav>
            )}
            {account && chainId && (
              <div className="network-badge">
                <span className="network-dot"></span>
                {getNetworkName(chainId)}
              </div>
            )}

            {contracts.callback && (
              <div className="contract-status">
                <span className="status-indicator"></span>
                Contracts Deployed
              </div>
            )}

            {account ? (
              <div className="wallet-badge">
                <span className="wallet-icon">🔐</span>
                {formattedAccount}
              </div>
            ) : (
              <button
                className="btn btn-primary"
                onClick={onConnect}
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
