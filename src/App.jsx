import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAccount, useChainId } from 'wagmi';
import { useContracts } from './hooks/useContracts';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import CreatePositionPage from './pages/CreatePositionPage';
import './styles/index.css';
import './styles/App.css';

function App() {
  const { address: account } = useAccount();
  const chainId = useChainId();
  const { contracts, isDeployed, saveContracts } = useContracts(account);

  const handleContractsDeployed = (callbackAddress, reactiveAddress) => {
    saveContracts(callbackAddress, reactiveAddress);
  };

  return (
    <BrowserRouter>
      <div className="app">
        <Header
          account={account}
          chainId={chainId}
          contracts={contracts}
        />

        <main className="container">
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  account={account}
                  isDeployed={isDeployed}
                  contracts={contracts}
                />
              }
            />
            <Route
              path="/dashboard"
              element={
                account ? (
                  isDeployed ? (
                    <DashboardPage account={account} contracts={contracts} />
                  ) : (
                    <Navigate to="/create" replace />
                  )
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/create"
              element={
                account ? (
                  <CreatePositionPage
                    account={account}
                    chainId={chainId}
                    contracts={contracts}
                    isDeployed={isDeployed}
                    onContractsDeployed={handleContractsDeployed}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
          </Routes>
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
    </BrowserRouter>
  );
}

export default App;
