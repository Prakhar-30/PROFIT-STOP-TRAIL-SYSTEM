# Profit-Locking Trailing Stop System

Revolutionary profit-locking system for Uniswap V2, built using Reactive Smart Contracts. Unlike traditional trailing stops that force complete exits, this system locks profits incrementally while keeping your base position alive to capture unlimited upside.

## 🚀 Features

- **Incremental Profit Locking**: Lock profits at milestones without exiting your position
- **Hard Stop Protection**: Absolute floor protection for catastrophic events
- **Unlimited Upside**: Base position stays alive to ride unlimited trends
- **Automated 24/7**: Reactive Network monitors and executes automatically
- **Retro-Futuristic UI**: Professional trading interface with glassmorphism design
- **Real-time Charts**: 120-minute candlestick charts for price monitoring
- **Personal Contracts**: Each user deploys their own private instance

## 🏗️ Architecture

### Frontend
- **React** + **Vite**: Fast, modern development
- **Ethers.js v6**: Web3 interactions
- **Lightweight Charts**: Real-time price visualization
- **Glassmorphism Design**: Retro-futuristic UI

### Smart Contracts
- **Callback Contract** (Sepolia): Manages positions and executes trades
- **Reactive Contract** (Lasna): Monitors prices and triggers callbacks

## 📋 Prerequisites

- Node.js 18+ and npm
- MetaMask or compatible Web3 wallet
- Sepolia testnet ETH for callback contract deployment
- Reactive Lasna testnet REACT tokens for reactive contract deployment

## 🛠️ Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd PROFIT-STOP-TRAIL-SYSTEM

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🎯 Usage

### 1. Connect Wallet
- Click "Connect Wallet" to connect your MetaMask
- Make sure you're on Sepolia or Reactive Lasna testnet

### 2. Deploy Contracts
First-time users need to deploy two contracts:

1. **Callback Contract** (Sepolia - 0.01 ETH)
   - Manages your profit-locking positions
   - Executes swaps through Uniswap V2

2. **Reactive Contract** (Lasna - 1 REACT)
   - Monitors price changes 24/7
   - Triggers callbacks when milestones/stops are hit

### 3. Create Position
- Enter sell token and buy token addresses
- System checks if Uniswap pair exists
- View 120-minute price chart
- Set amount to protect
- Configure hard stop percentage (e.g., 10%)
- Configure profit milestone percentage (e.g., 20%)
- Approve tokens and create position

### 4. Manage Positions
- **Active Tab**: Monitor and manage active positions
- **Paused Tab**: View temporarily disabled positions
- **Past Tab**: Review completed/cancelled positions
- **Actions**: Pause, Resume, or Cancel positions
- **Hover**: View live price chart modal

## 📊 Position Parameters

### Hard Stop Percentage
- Conservative: 5-10%
- Standard: 10-15%
- Aggressive: 15-20%

### Profit Milestone Percentage
- Low Volatility: 10-15%
- Moderate: 20-30%
- High Volatility: 30-50%

## 🔧 Configuration

### Network Configuration
Configured networks in `src/config/networks.js`:
- **Sepolia Testnet**: Chain ID 11155111
- **Reactive Lasna Testnet**: Chain ID 5318007

### Contract Addresses
Contract addresses stored in localStorage per user wallet.

## 🎨 Design System

### Colors
- Primary Cyan: `#00ffff`
- Accent Green: `#00ff88`
- Accent Red: `#ff4444`
- Accent Orange: `#ffaa00`

### Fonts
- Primary: `Orbitron` (headings, buttons)
- Monospace: `Space Mono` (addresses, numbers)

### Design Principles
- No gradients on text
- Transparent buttons with colored borders on hover
- Glassmorphism for cards
- Retro-futuristic aesthetic
- Professional trading platform look

## 🔐 Security

- **Non-Custodial**: Tokens stay in your wallet until execution
- **Personal Contracts**: Each user has private instances
- **Multiple Safeguards**: Retry logic, balance checks, emergency controls
- **Transparent**: All actions on-chain and auditable

## ⚠️ Disclaimer

This software is experimental and provided "as is". Users are responsible for:
- Understanding the risks of DeFi trading
- Testing thoroughly before using with significant capital
- Monitoring positions actively
- Securing their private keys
- Complying with local regulations

**Never invest more than you can afford to lose.**

## 📝 License

GPL-2.0-or-later

## 🙏 Acknowledgments

Built using:
- Reactive Network
- Uniswap V2
- OpenZeppelin
- Foundry

---

**"Lock profits systematically. Ride trends indefinitely. Protect against disaster."**
