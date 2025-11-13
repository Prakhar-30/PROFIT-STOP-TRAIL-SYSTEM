import React, { createContext, useContext, useState, useEffect } from 'react';
import { connectWallet, getCurrentChainId } from '../utils/web3';

const Web3Context = createContext();

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
};

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [loading, setLoading] = useState(true);

  const connect = async () => {
    try {
      const address = await connectWallet();
      setAccount(address);
      const chain = await getCurrentChainId();
      setChainId(chain);
      return address;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  };

  const disconnect = () => {
    setAccount(null);
    setChainId(null);
  };

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            const chain = await getCurrentChainId();
            setChainId(chain);
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
      setLoading(false);
    };

    checkConnection();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          disconnect();
        }
      });

      window.ethereum.on('chainChanged', (chainIdHex) => {
        setChainId(parseInt(chainIdHex, 16));
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  return (
    <Web3Context.Provider value={{ account, chainId, connect, disconnect, loading }}>
      {children}
    </Web3Context.Provider>
  );
};
