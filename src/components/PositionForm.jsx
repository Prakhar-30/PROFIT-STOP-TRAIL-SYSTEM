import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getUniswapPair, getTokenInfo, getTokenBalance, approveToken, getAllowance, createPosition, deployCallbackContract, deployReactiveContract } from '../utils/contracts';
import { parseUnits, formatUnits, switchNetwork } from '../utils/web3';
import { validateTokenAddress, validateAmount, validatePercentage } from '../utils/helpers';
import { NETWORKS } from '../config/networks';
import { useToast } from '../contexts/ToastContext';
import PriceChart from './PriceChart';
import '../styles/PositionForm.css';

const PositionForm = ({ account, chainId, contracts, isDeployed, onContractsDeployed, onPositionCreated }) => {
  const { showError, showSuccess, showInfo } = useToast();
  const [formData, setFormData] = useState({
    sellToken: '',
    buyToken: '',
    amount: '',
    hardStopPercent: '10',
    profitTakePercent: '20',
  });

  const [pairInfo, setPairInfo] = useState(null);
  const [sellTokenInfo, setSellTokenInfo] = useState(null);
  const [buyTokenInfo, setBuyTokenInfo] = useState(null);
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('input'); // input, checking, ready, deploy-callback, deploy-reactive, creating
  const [txStatus, setTxStatus] = useState('');
  const [tempCallbackAddress, setTempCallbackAddress] = useState('');

  // Auto-check pair when both addresses are entered
  useEffect(() => {
    const { sellToken, buyToken } = formData;

    // Only auto-check if:
    // 1. Both addresses are valid
    // 2. Not currently loading
    // 3. In input state (not already checked)
    // 4. Addresses are different
    if (
      validateTokenAddress(sellToken) &&
      validateTokenAddress(buyToken) &&
      sellToken.toLowerCase() !== buyToken.toLowerCase() &&
      !loading &&
      step === 'input'
    ) {
      // Small delay to avoid checking on every keystroke
      const timer = setTimeout(() => {
        checkPairAndTokens();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [formData.sellToken, formData.buyToken]);

  const checkPairAndTokens = async () => {
    try {
      setLoading(true);
      setStep('checking');

      const { sellToken, buyToken } = formData;

      if (!validateTokenAddress(sellToken) || !validateTokenAddress(buyToken)) {
        throw new Error('Invalid token addresses');
      }

      // Get pair address
      const pairAddress = await getUniswapPair(sellToken, buyToken);

      // Get token info
      const [sellInfo, buyInfo] = await Promise.all([
        getTokenInfo(sellToken),
        getTokenInfo(buyToken)
      ]);

      // Get balance
      const bal = await getTokenBalance(sellToken, account);

      setSellTokenInfo(sellInfo);
      setBuyTokenInfo(buyInfo);
      setBalance(formatUnits(bal, sellInfo.decimals));

      setPairInfo({
        address: pairAddress,
        sellToken0: sellToken.toLowerCase() < buyToken.toLowerCase()
      });

      setStep('ready');
      showSuccess(`Pair verified! ${sellInfo.symbol}/${buyInfo.symbol}`);
    } catch (err) {
      const message = err.message || 'Failed to verify pair. Make sure the pair exists on Uniswap.';
      showError(message);
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = async () => {
    const { amount, hardStopPercent, profitTakePercent } = formData;

    if (!validateAmount(amount)) {
      showError('Please enter a valid amount');
      return;
    }

    if (!validatePercentage(hardStopPercent) || !validatePercentage(profitTakePercent)) {
      showError('Please enter valid percentages (1-99)');
      return;
    }

    // Check if contracts are deployed
    if (!isDeployed) {
      // Need to deploy contracts first
      setStep('deploy-callback');
    } else {
      // Contracts already deployed, proceed to create position
      handleCreatePosition();
    }
  };

  const deployCallback = async () => {
    try {
      setLoading(true);

      // Ensure on Sepolia
      if (chainId !== NETWORKS.SEPOLIA.chainIdDecimal) {
        setTxStatus('Switching to Sepolia...');
        await switchNetwork('SEPOLIA');
        setTxStatus('Network switched! Please click Deploy again.');
        showInfo('Network switched to Sepolia. Please click Deploy again.');
        setLoading(false);
        return;
      }

      setTxStatus('Deploying Callback Contract on Sepolia...');
      showInfo('Please confirm the deployment transaction in your wallet');
      const address = await deployCallbackContract(account);

      setTempCallbackAddress(address);
      setTxStatus(`Callback deployed at ${address.slice(0, 10)}...${address.slice(-8)}`);
      setStep('deploy-reactive');
      showSuccess(`Callback contract deployed at ${address.slice(0, 10)}...${address.slice(-8)}`);
      setLoading(false);
    } catch (err) {
      const message = err.message || 'Failed to deploy callback contract';
      showError(message);
      setStep('deploy-callback');
      setLoading(false);
    }
  };

  const deployReactive = async () => {
    try {
      setLoading(true);

      // Ensure on Reactive Lasna
      if (chainId !== NETWORKS.REACTIVE_LASNA.chainIdDecimal) {
        setTxStatus('Switching to Reactive Lasna...');
        await switchNetwork('REACTIVE_LASNA');
        setTxStatus('Network switched! Please click Deploy again.');
        showInfo('Network switched to Reactive Lasna. Please click Deploy again.');
        setLoading(false);
        return;
      }

      setTxStatus('Deploying Reactive Contract on Lasna...');
      showInfo('Please confirm the deployment transaction in your wallet');
      const address = await deployReactiveContract(account, tempCallbackAddress);

      setTxStatus('All contracts deployed successfully!');
      showSuccess('All contracts deployed successfully!');

      // Save contracts
      onContractsDeployed(tempCallbackAddress, address);

      // Switch back to Sepolia for position creation
      setTimeout(async () => {
        setTxStatus('Switching back to Sepolia...');
        await switchNetwork('SEPOLIA');
        setStep('creating');
        setLoading(false);
      }, 2000);
    } catch (err) {
      const message = err.message || 'Failed to deploy reactive contract';
      showError(message);
      setStep('deploy-reactive');
      setLoading(false);
    }
  };

  const handleCreatePosition = async () => {
    try {
      setLoading(true);
      setTxStatus('');
      setStep('creating');

      const { amount, hardStopPercent, profitTakePercent } = formData;
      const amountInWei = parseUnits(amount, sellTokenInfo.decimals);

      // Ensure on Sepolia
      if (chainId !== NETWORKS.SEPOLIA.chainIdDecimal) {
        setTxStatus('Switching to Sepolia...');
        showInfo('Switching to Sepolia network...');
        await switchNetwork('SEPOLIA');
        setTxStatus('Network switched! Creating position...');
      }

      // Check allowance
      setTxStatus('Checking token allowance...');
      const allowance = await getAllowance(formData.sellToken, account, contracts.callback);

      // Approve if needed
      if (allowance < amountInWei) {
        setTxStatus('Approving tokens...');
        showInfo('Please approve token spending in your wallet');
        await approveToken(formData.sellToken, contracts.callback, amountInWei);
        setTxStatus('Tokens approved!');
        showSuccess('Tokens approved successfully!');
      }

      // Create position
      setTxStatus('Creating position...');
      showInfo('Please confirm the position creation in your wallet');
      await createPosition(
        contracts.callback,
        pairInfo.address,
        pairInfo.sellToken0,
        amountInWei,
        parseFloat(hardStopPercent),
        parseFloat(profitTakePercent)
      );

      setTxStatus('Position created successfully!');
      showSuccess('Position created successfully! Redirecting to dashboard...');
      setTimeout(() => {
        onPositionCreated();
      }, 2000);
    } catch (err) {
      const message = err.message || 'Failed to create position';
      showError(message);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (step !== 'input' && step !== 'ready') {
      setStep('input');
      setPairInfo(null);
    }
  };

  const isFormValid = () => {
    const { sellToken, buyToken } = formData;
    return (
      validateTokenAddress(sellToken) &&
      validateTokenAddress(buyToken) &&
      sellToken.toLowerCase() !== buyToken.toLowerCase()
    );
  };

  // Render deployment UI
  if (step === 'deploy-callback' || step === 'deploy-reactive') {
    return (
      <div className="position-form glass-card fade-in">
        <div className="deployment-section">
          <div className="deployment-icon">🚀</div>
          <h2 className="form-title">Deploy Your Contracts</h2>
          <p className="deployment-subtitle">
            First-time setup requires deploying two contracts
          </p>

          <div className="deployment-steps">
            <div className={`step ${step === 'deploy-reactive' ? 'completed' : 'active'}`}>
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Callback Contract</h3>
                <p>Deploy on Sepolia (0.01 ETH)</p>
                {tempCallbackAddress && (
                  <p className="step-address mono text-cyan">
                    {tempCallbackAddress.slice(0, 10)}...{tempCallbackAddress.slice(-8)}
                  </p>
                )}
              </div>
            </div>

            <div className={`step ${step === 'deploy-reactive' ? 'active' : ''}`}>
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Reactive Contract</h3>
                <p>Deploy on Reactive Lasna (1 REACT)</p>
              </div>
            </div>
          </div>

          {error && <div className="error-message text-red">{error}</div>}
          {txStatus && <div className="status-message text-cyan">{txStatus}</div>}

          <div className="form-actions">
            {step === 'deploy-callback' && (
              <button
                className="btn btn-primary btn-large"
                onClick={deployCallback}
                disabled={loading}
              >
                {loading ? 'Deploying...' : 'Deploy Callback Contract'}
              </button>
            )}

            {step === 'deploy-reactive' && (
              <button
                className="btn btn-success btn-large"
                onClick={deployReactive}
                disabled={loading}
              >
                {loading ? 'Deploying...' : 'Deploy Reactive Contract'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="position-form glass-card fade-in">
      <h2 className="form-title">Create Profit-Locking Position</h2>

      <div className="form-content">
        <div className="form-left">
          <div className="input-group">
            <label className="input-label">Sell Token Address</label>
            <input
              type="text"
              name="sellToken"
              className="input-field"
              placeholder="0x..."
              value={formData.sellToken}
              onChange={handleInputChange}
              disabled={loading || step === 'creating'}
            />
            {sellTokenInfo && (
              <span className="token-info text-cyan">
                {sellTokenInfo.symbol} - Balance: {parseFloat(balance).toFixed(4)}
              </span>
            )}
          </div>

          <div className="input-group">
            <label className="input-label">Buy Token Address</label>
            <input
              type="text"
              name="buyToken"
              className="input-field"
              placeholder="0x..."
              value={formData.buyToken}
              onChange={handleInputChange}
              disabled={loading || step === 'creating'}
            />
            {buyTokenInfo && (
              <span className="token-info text-cyan">{buyTokenInfo.symbol}</span>
            )}
          </div>

          {pairInfo && (
            <div className="pair-info-display">
              <div className="pair-info-header">
                <span className="pair-label">Uniswap V2 Pair Found</span>
                <span className="pair-check">✓</span>
              </div>
              <div className="pair-address mono text-cyan">
                {pairInfo.address}
              </div>
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Amount to Protect</label>
            <input
              type="number"
              name="amount"
              className="input-field"
              placeholder="0.0"
              value={formData.amount}
              onChange={handleInputChange}
              disabled={loading || !pairInfo || step === 'creating'}
              step="0.0001"
            />
          </div>

          <div className="input-row">
            <div className="input-group">
              <label className="input-label">Hard Stop Loss (%)</label>
              <input
                type="number"
                name="hardStopPercent"
                className="input-field"
                placeholder="10"
                value={formData.hardStopPercent}
                onChange={handleInputChange}
                disabled={loading || !pairInfo || step === 'creating'}
                min="1"
                max="99"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Profit Milestone (%)</label>
              <input
                type="number"
                name="profitTakePercent"
                className="input-field"
                placeholder="20"
                value={formData.profitTakePercent}
                onChange={handleInputChange}
                disabled={loading || !pairInfo || step === 'creating'}
                min="1"
                max="99"
              />
            </div>
          </div>

          {step === 'checking' && (
            <div className="checking-loader">
              <div className="loader-spinner"></div>
              <p className="loader-text">Verifying pair on Uniswap V2...</p>
            </div>
          )}

          {error && (
            <div className="error-message text-red">{error}</div>
          )}

          {txStatus && (
            <div className="status-message text-cyan">{txStatus}</div>
          )}

          <div className="form-actions">
            {step === 'ready' && (
              <button
                className="btn btn-success"
                onClick={handleProceed}
                disabled={loading || !formData.amount}
              >
                {!isDeployed ? 'Deploy Contracts & Create Position' : 'Create Position'}
              </button>
            )}

            {step === 'creating' && (
              <button className="btn btn-success" disabled>
                Processing...
              </button>
            )}
          </div>
        </div>

        <div className="form-right">
          {pairInfo && sellTokenInfo && buyTokenInfo && (
            <PriceChart
              pairAddress={pairInfo.address}
              sellToken={sellTokenInfo.symbol}
              buyToken={buyTokenInfo.symbol}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PositionForm;
