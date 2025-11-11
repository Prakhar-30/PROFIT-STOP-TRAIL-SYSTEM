import React, { useState, useEffect } from 'react';
import { useWeb3 } from './hooks/useWeb3';
import { useContracts } from './hooks/useContracts';
import Header from './components/Header';
import ContractDeployment from './components/ContractDeployment';
import Dashboard from './components/Dashboard';
import PositionForm from './components/PositionForm';
import './styles/index.css';
import './styles/App.css';

function App() {
  const { account, chainId, isConnecting, connect, formattedAccount } = useWeb3();
  const { contracts, isDeployed, saveContracts } = useContracts(account);
  const [view, setView] = useState('dashboard'); // 'form' or 'dashboard'

  // Set initial view based on deployment status
  useEffect(() => {
    if (account) {
      if (isDeployed) {
        setView('dashboard');
      } else {
        setView('form');
      }
    }
  }, [account, isDeployed]);

  const handleContractsDeployed = (callbackAddress, reactiveAddress) => {
    saveContracts(callbackAddress, reactiveAddress);
  };

  const handleViewDashboard = () => {
    setView('dashboard');
  };

  const handleAddPosition = () => {
    setView('form');
  };

  return (
    <div className="app">
      <Header
        account={account}
        formattedAccount={formattedAccount}
        onConnect={connect}
        isConnecting={isConnecting}
        chainId={chainId}
        contracts={contracts}
      />

      <main className="container">
        {!account ? (
          <div className="welcome-screen">
            <div className="welcome-content glass-card fade-in">
              <div className="welcome-icon">⚡</div>
              <h1 className="welcome-title">Profit-Locking Trailing Stop System</h1>
              <p className="welcome-description">
                Revolutionary profit-locking system for Uniswap V2. Lock profits incrementally while
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

              <button className="btn btn-primary btn-large" onClick={connect}>
                Connect Wallet to Start
              </button>
            </div>
          </div>
        ) : view === 'dashboard' ? (
          isDeployed ? (
            <Dashboard
              account={account}
              contracts={contracts}
              onAddPosition={handleAddPosition}
            />
          ) : (
            <PositionForm
              account={account}
              chainId={chainId}
              contracts={contracts}
              isDeployed={isDeployed}
              onContractsDeployed={handleContractsDeployed}
              onPositionCreated={handleViewDashboard}
            />
          )
        ) : (
          <PositionForm
            account={account}
            chainId={chainId}
            contracts={contracts}
            isDeployed={isDeployed}
            onContractsDeployed={handleContractsDeployed}
            onPositionCreated={handleViewDashboard}
          />
        )}
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <p>Profit-Locking Trailing Stop System © 2024</p>
            <p className="footer-disclaimer">
              Experimental software. Use at your own risk. Test thoroughly before mainnet.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
