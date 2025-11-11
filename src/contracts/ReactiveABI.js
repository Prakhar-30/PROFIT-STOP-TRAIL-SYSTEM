export const REACTIVE_ABI = [
  "constructor(address _owner, address _profitLockingCallback) payable",
  "function trackedPositions(uint256) external view returns (tuple(uint256 id, address pair, bool sellToken0, uint256 coefficient, uint256 entryPrice, uint256 hardStopPrice, uint256 nextProfitMilestone, uint256 lastMilestonePrice, uint256 profitTakePercent, uint8 status, uint256 lastTriggeredAt, uint8 triggerCount))",
  "function subscribedPairs(address) external view returns (bool)",
  "function getActivePositionsForPair(address pair) external view returns (uint256[] memory)",
  "function emergencySubscribeToPair(address pair, uint256 chainId) external",
  "function emergencyUnsubscribeFromPair(address pair, uint256 chainId) external",
  "function owner() external view returns (address)",
  "event PositionTracked(address indexed pair, uint256 indexed positionId, uint256 entryPrice, uint256 hardStopPrice, uint256 firstMilestone)",
  "event PositionUntracked(address indexed pair, uint256 indexed positionId)",
  "event PairSubscribed(address indexed pair)",
  "event PairUnsubscribed(address indexed pair)",
  "event MilestoneReached(uint256 indexed positionId, uint256 currentPrice, uint256 milestonePrice, uint256 nextMilestone)",
  "event HardStopHit(uint256 indexed positionId, uint256 currentPrice, uint256 hardStopPrice)"
];
