import { http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// Define custom Reactive Lasna chain
export const reactiveLasna = {
  id: 5318007,
  name: 'Reactive Lasna Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'REACT',
    symbol: 'REACT',
  },
  rpcUrls: {
    default: {
      http: ['https://kopli-rpc.rkt.ink'],
    },
    public: {
      http: ['https://kopli-rpc.rkt.ink'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Reactive Explorer',
      url: 'https://kopli.reactscan.net'
    },
  },
  testnet: true,
};

export const wagmiConfig = getDefaultConfig({
  appName: 'Profit-Locking Trailing Stop System',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get from https://cloud.walletconnect.com
  chains: [sepolia, reactiveLasna],
  transports: {
    [sepolia.id]: http(),
    [reactiveLasna.id]: http(),
  },
});
