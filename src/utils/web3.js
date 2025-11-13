import { ethers } from 'ethers';
import { NETWORKS } from '../config/networks';

// Get provider from wagmi config or fallback to window.ethereum
export const getProvider = () => {
  if (typeof window.ethereum !== 'undefined') {
    return new ethers.BrowserProvider(window.ethereum);
  }
  throw new Error('No Web3 Provider detected. Please connect your wallet.');
};

// Get signer with better error handling
export const getSigner = async () => {
  try {
    const provider = getProvider();
    const signer = await provider.getSigner();
    return signer;
  } catch (error) {
    console.error('Error getting signer:', error);
    throw new Error('Failed to get wallet signer. Please make sure your wallet is connected.');
  }
};

// Get read-only provider for view calls (doesn't need signer)
export const getReadProvider = () => {
  if (typeof window.ethereum !== 'undefined') {
    return new ethers.BrowserProvider(window.ethereum);
  }
  // Fallback to public RPC for reading
  return new ethers.JsonRpcProvider('https://rpc.sepolia.org');
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
        // Only pass EIP-3085 standard properties
        const { chainId, chainName, nativeCurrency, rpcUrls, blockExplorerUrls } = network;
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId,
            chainName,
            nativeCurrency,
            rpcUrls,
            blockExplorerUrls
          }],
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
