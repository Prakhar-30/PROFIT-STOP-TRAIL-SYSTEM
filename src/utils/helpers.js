export const basisPointsToPercent = (bps) => {
  return (bps / 100).toFixed(2);
};

export const percentToBasisPoints = (percent) => {
  return Math.floor(percent * 100);
};

export const calculateHardStopPrice = (entryPrice, hardStopPercent) => {
  const bps = percentToBasisPoints(hardStopPercent);
  return (entryPrice * (10000 - bps)) / 10000;
};

export const calculateProfitMilestone = (entryPrice, profitTakePercent) => {
  const bps = percentToBasisPoints(profitTakePercent);
  return (entryPrice * (10000 + bps)) / 10000;
};

export const formatCurrency = (value, decimals = 2) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatTimeAgo = (timestamp) => {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export const getStatusColor = (status) => {
  const statusColors = {
    0: '#00ff88', // Active - bright green
    1: '#ffaa00', // Paused - orange
    2: '#888888', // Cancelled - gray
    3: '#00aaff', // Closed - blue
    4: '#ff4444', // Failed - red
  };
  return statusColors[status] || '#888888';
};

export const getStatusText = (status) => {
  const statusTexts = {
    0: 'Active',
    1: 'Paused',
    2: 'Cancelled',
    3: 'Closed',
    4: 'Failed',
  };
  return statusTexts[status] || 'Unknown';
};

export const validateTokenAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const validateAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
};

export const validatePercentage = (percent) => {
  const num = parseFloat(percent);
  return !isNaN(num) && num > 0 && num < 100;
};

export const truncateDecimals = (value, decimals = 4) => {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  return num.toFixed(decimals);
};

export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const retry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await sleep(delay);
    return retry(fn, retries - 1, delay * 2);
  }
};
