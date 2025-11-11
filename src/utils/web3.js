import { ethers } from 'ethers';
import { NETWORKS } from '../config/networks';

export const getProvider = () => {
  if (typeof window.ethereum !== 'undefined') {
    return new ethers.BrowserProvider(window.ethereum);
  }
  throw new Error('No Web3 Provider detected');
};

export const getSigner = async () => {
  const provider = getProvider();
  return await provider.getSigner();
};

export const connectWallet = async () => {
  try {
    const provider = getProvider();
    const accounts = await provider.send('eth_requestAccounts', []);
    return accounts[0];
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
};

export const switchNetwork = async (networkKey) => {
  const network = NETWORKS[networkKey];
  if (!network) throw new Error('Invalid network');

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: network.chainId }],
    });
  } catch (switchError) {
    // Chain not added, let's add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [network],
        });
      } catch (addError) {
        console.error('Error adding network:', addError);
        throw addError;
      }
    } else {
      console.error('Error switching network:', switchError);
      throw switchError;
    }
  }
};

export const getCurrentChainId = async () => {
  const provider = getProvider();
  const network = await provider.getNetwork();
  return Number(network.chainId);
};

export const isCorrectNetwork = async (expectedChainId) => {
  const currentChainId = await getCurrentChainId();
  return currentChainId === expectedChainId;
};

export const formatAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatBalance = (balance, decimals = 18, displayDecimals = 4) => {
  const formatted = ethers.formatUnits(balance, decimals);
  const num = parseFloat(formatted);
  return num.toFixed(displayDecimals);
};

export const parseUnits = (value, decimals = 18) => {
  return ethers.parseUnits(value.toString(), decimals);
};

export const formatUnits = (value, decimals = 18) => {
  return ethers.formatUnits(value, decimals);
};
