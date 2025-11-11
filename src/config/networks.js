export const NETWORKS = {
  SEPOLIA: {
    chainId: '0xaa36a7', // 11155111
    chainIdDecimal: 11155111,
    chainName: 'Sepolia Testnet',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
    blockExplorerUrls: ['https://sepolia.etherscan.io']
  },
  REACTIVE_LASNA: {
    chainId: '0x511f87', // 5318007
    chainIdDecimal: 5318007,
    chainName: 'Reactive Lasna Testnet',
    nativeCurrency: {
      name: 'REACT',
      symbol: 'REACT',
      decimals: 18
    },
    rpcUrls: ['https://lasna-rpc.rnk.dev/'],
    blockExplorerUrls: ['https://lasna.reactive.network']
  }
};

export const UNISWAP_V2_ROUTER = '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008';
export const CALLBACK_SENDER = '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA';

export const CALLBACK_DEPLOY_VALUE = '0.01'; // ETH
export const REACTIVE_DEPLOY_VALUE = '1'; // REACT
