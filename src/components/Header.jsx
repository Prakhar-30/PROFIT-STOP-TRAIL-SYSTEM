import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

const Header = ({ account, chainId, contracts }) => {
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

            {contracts.callback && (
              <div className="contract-status">
                <span className="status-indicator"></span>
                Contracts Deployed
              </div>
            )}

            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
