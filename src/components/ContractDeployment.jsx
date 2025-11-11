import React, { useState } from 'react';
import { deployCallbackContract, deployReactiveContract } from '../utils/contracts';
import { switchNetwork } from '../utils/web3';
import { NETWORKS } from '../config/networks';
import '../styles/ContractDeployment.css';

const ContractDeployment = ({ account, chainId, onDeployed }) => {
  const [step, setStep] = useState('start'); // start, callback, reactive, complete
  const [callbackAddress, setCallbackAddress] = useState('');
  const [reactiveAddress, setReactiveAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txStatus, setTxStatus] = useState('');

  const deployCallback = async () => {
    try {
      setLoading(true);
      setError('');
      setStep('callback');

      // Ensure on Sepolia
      if (chainId !== NETWORKS.SEPOLIA.chainIdDecimal) {
        setTxStatus('Switching to Sepolia...');
        await switchNetwork('SEPOLIA');
        setTxStatus('Network switched! Please retry deployment.');
        setLoading(false);
        setStep('start');
        return;
      }

      setTxStatus('Deploying Callback Contract...');
      const address = await deployCallbackContract(account);

      setCallbackAddress(address);
      setTxStatus(`Callback deployed at ${address}`);
      setStep('reactive-ready');
      setLoading(false);
    } catch (err) {
      console.error('Callback deployment error:', err);
      setError(err.message || 'Failed to deploy callback contract');
      setStep('start');
      setLoading(false);
    }
  };

  const deployReactive = async () => {
    try {
      setLoading(true);
      setError('');
      setStep('reactive');

      // Ensure on Reactive Lasna
      if (chainId !== NETWORKS.REACTIVE_LASNA.chainIdDecimal) {
        setTxStatus('Switching to Reactive Lasna...');
        await switchNetwork('REACTIVE_LASNA');
        setTxStatus('Network switched! Please retry deployment.');
        setLoading(false);
        setStep('reactive-ready');
        return;
      }

      setTxStatus('Deploying Reactive Contract...');
      const address = await deployReactiveContract(account, callbackAddress);

      setReactiveAddress(address);
      setTxStatus('All contracts deployed successfully!');
      setStep('complete');

      // Save contracts and notify parent
      setTimeout(() => {
        onDeployed(callbackAddress, address);
      }, 2000);

      setLoading(false);
    } catch (err) {
      console.error('Reactive deployment error:', err);
      setError(err.message || 'Failed to deploy reactive contract');
      setStep('reactive-ready');
      setLoading(false);
    }
  };

  return (
    <div className="contract-deployment glass-card fade-in">
      <div className="deployment-icon">🚀</div>
      <h2 className="deployment-title">Deploy Your Contracts</h2>
      <p className="deployment-subtitle">
        Personal profit-locking system requires two contract deployments
      </p>

      <div className="deployment-steps">
        <div className={`step ${step === 'callback' || step === 'reactive-ready' || step === 'reactive' || step === 'complete' ? 'completed' : 'active'}`}>
          <div className="step-number">1</div>
          <div className="step-content">
            <h3>Callback Contract</h3>
            <p>Deploy on Sepolia (0.01 ETH)</p>
            {callbackAddress && (
              <p className="step-address mono text-cyan">{callbackAddress}</p>
            )}
          </div>
        </div>

        <div className={`step ${step === 'reactive' || step === 'complete' ? 'completed' : step === 'reactive-ready' ? 'active' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-content">
            <h3>Reactive Contract</h3>
            <p>Deploy on Reactive Lasna (1 REACT)</p>
            {reactiveAddress && (
              <p className="step-address mono text-cyan">{reactiveAddress}</p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message text-red">{error}</div>
      )}

      {txStatus && (
        <div className="status-message text-cyan">{txStatus}</div>
      )}

      <div className="deployment-actions">
        {step === 'start' && (
          <button
            className="btn btn-primary btn-large"
            onClick={deployCallback}
            disabled={loading}
          >
            {loading ? 'Deploying...' : 'Start Deployment'}
          </button>
        )}

        {step === 'reactive-ready' && (
          <button
            className="btn btn-success btn-large"
            onClick={deployReactive}
            disabled={loading}
          >
            {loading ? 'Deploying...' : 'Deploy Reactive Contract'}
          </button>
        )}

        {step === 'complete' && (
          <div className="completion-message">
            <div className="completion-icon">✅</div>
            <p>Contracts deployed successfully!</p>
            <p className="text-secondary">Redirecting to dashboard...</p>
          </div>
        )}
      </div>

      <div className="deployment-info">
        <h4>What happens next?</h4>
        <ul>
          <li>✓ Callback contract manages your positions on Sepolia</li>
          <li>✓ Reactive contract monitors prices 24/7</li>
          <li>✓ Automatic profit locking at your milestones</li>
          <li>✓ Hard stop protection for downside</li>
        </ul>
      </div>
    </div>
  );
};

export default ContractDeployment;
