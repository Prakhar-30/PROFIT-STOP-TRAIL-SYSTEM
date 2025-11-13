# WalletConnect Setup

To enable WalletConnect functionality in RainbowKit, you need a free Project ID.

## Steps:

1. Go to https://cloud.walletconnect.com
2. Create a free account (or sign in)
3. Create a new project
4. Copy your Project ID
5. Open `src/config/wagmi.js`
6. Replace `'YOUR_WALLETCONNECT_PROJECT_ID'` with your actual Project ID

## Example:

```javascript
export const wagmiConfig = getDefaultConfig({
  appName: 'Profit-Locking Trailing Stop System',
  projectId: 'abc123def456...', // Your actual Project ID here
  chains: [sepolia, reactiveLasna],
  // ...
});
```

That's it! Your app will now support WalletConnect along with MetaMask and other wallets.
