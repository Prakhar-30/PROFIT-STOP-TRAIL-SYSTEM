import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getUniswapPair, getTokenInfo, getTokenBalance, approveToken, getAllowance, createPosition } from '../utils/contracts';
import { parseUnits, formatUnits } from '../utils/web3';
import { validateTokenAddress, validateAmount, validatePercentage } from '../utils/helpers';
import PriceChart from './PriceChart';
import '../styles/PositionForm.css';

const PositionForm = ({ account, contracts, onPositionCreated }) => {
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
  const [step, setStep] = useState('input'); // input, checking, ready, deploying
  const [error, setError] = useState('');
  const [txStatus, setTxStatus] = useState('');

  const checkPairAndTokens = async () => {
    try {
      setLoading(true);
      setError('');
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
    } catch (err) {
      console.error('Error checking pair:', err);
      setError(err.message || 'Failed to verify pair. Make sure the pair exists on Uniswap.');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePosition = async () => {
    try {
      setLoading(true);
      setError('');
      setTxStatus('');

      const { amount, hardStopPercent, profitTakePercent } = formData;

      if (!validateAmount(amount)) {
        throw new Error('Invalid amount');
      }

      if (!validatePercentage(hardStopPercent) || !validatePercentage(profitTakePercent)) {
        throw new Error('Invalid percentages');
      }

      const amountInWei = parseUnits(amount, sellTokenInfo.decimals);

      // Check allowance
      setTxStatus('Checking token allowance...');
      const allowance = await getAllowance(formData.sellToken, account, contracts.callback);

      // Approve if needed
      if (allowance < amountInWei) {
        setTxStatus('Approving tokens...');
        await approveToken(formData.sellToken, contracts.callback, amountInWei);
        setTxStatus('Tokens approved!');
      }

      // Create position
      setTxStatus('Creating position...');
      await createPosition(
        contracts.callback,
        pairInfo.address,
        pairInfo.sellToken0,
        amountInWei,
        parseFloat(hardStopPercent),
        parseFloat(profitTakePercent)
      );

      setTxStatus('Position created successfully!');
      setTimeout(() => {
        onPositionCreated();
      }, 2000);
    } catch (err) {
      console.error('Error creating position:', err);
      setError(err.message || 'Failed to create position');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (step !== 'input') {
      setStep('input');
      setPairInfo(null);
    }
  };

  const isFormValid = () => {
    const { sellToken, buyToken, amount, hardStopPercent, profitTakePercent } = formData;
    return (
      validateTokenAddress(sellToken) &&
      validateTokenAddress(buyToken) &&
      sellToken.toLowerCase() !== buyToken.toLowerCase()
    );
  };

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
              disabled={loading}
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
              disabled={loading}
            />
            {buyTokenInfo && (
              <span className="token-info text-cyan">{buyTokenInfo.symbol}</span>
            )}
          </div>

          <div className="input-group">
            <label className="input-label">Amount to Protect</label>
            <input
              type="number"
              name="amount"
              className="input-field"
              placeholder="0.0"
              value={formData.amount}
              onChange={handleInputChange}
              disabled={loading || !pairInfo}
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
                disabled={loading || !pairInfo}
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
                disabled={loading || !pairInfo}
                min="1"
                max="99"
              />
            </div>
          </div>

          {error && (
            <div className="error-message text-red">{error}</div>
          )}

          {txStatus && (
            <div className="status-message text-cyan">{txStatus}</div>
          )}

          <div className="form-actions">
            {step === 'input' && (
              <button
                className="btn btn-primary"
                onClick={checkPairAndTokens}
                disabled={!isFormValid() || loading}
              >
                {loading ? 'Checking...' : 'Check Pair & Continue'}
              </button>
            )}

            {step === 'ready' && (
              <button
                className="btn btn-success"
                onClick={handleCreatePosition}
                disabled={loading || !formData.amount}
              >
                {loading ? 'Processing...' : 'Create Position'}
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
