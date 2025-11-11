import { useState, useEffect, useCallback } from 'react';
import { connectWallet, getCurrentChainId, switchNetwork, formatAddress } from '../utils/web3';

export const useWeb3 = () => {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const handleAccountsChanged = useCallback((accounts) => {
    if (accounts.length === 0) {
      setAccount(null);
    } else {
      setAccount(accounts[0]);
    }
  }, []);

  const handleChainChanged = useCallback((chainIdHex) => {
    const newChainId = parseInt(chainIdHex, 16);
    setChainId(newChainId);
    window.location.reload();
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const connectedAccount = await connectWallet();
      setAccount(connectedAccount);

      const currentChainId = await getCurrentChainId();
      setChainId(currentChainId);

      return connectedAccount;
    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const switchToNetwork = useCallback(async (networkKey) => {
    setError(null);
    try {
      await switchNetwork(networkKey);
      const newChainId = await getCurrentChainId();
      setChainId(newChainId);
      return newChainId;
    } catch (err) {
      console.error('Network switch error:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setChainId(null);
  }, []);

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Check if already connected
      window.ethereum.request({ method: 'eth_accounts' })
        .then(handleAccountsChanged)
        .catch(console.error);

      getCurrentChainId()
        .then(setChainId)
        .catch(console.error);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [handleAccountsChanged, handleChainChanged]);

  return {
    account,
    chainId,
    isConnecting,
    error,
    connect,
    disconnect,
    switchToNetwork,
    formattedAccount: account ? formatAddress(account) : null,
  };
};
