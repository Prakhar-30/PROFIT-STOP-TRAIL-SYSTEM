// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.20;

import "../../lib/reactive-lib/src/abstract-base/AbstractCallback.sol";
import "../../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "../../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../lib/openzeppelin-contracts/contracts/utils/math/Math.sol";
import "../../lib/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "../../lib/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

/**
 * @title PersonalProfitLockingTrailingStopCallback
 * @notice Hybrid system: Lock profits incrementally while keeping base position alive
 * @dev Sells profits at milestones, only exits fully if hard stop is hit
 */
contract PersonalProfitLockingTrailingStopCallback is AbstractCallback {
    using SafeERC20 for IERC20;

    // Events
    event ProfitLockingPositionCreated(
        address indexed pair,
        uint256 indexed positionId,
        bool sellToken0,
        address tokenSell,
        address tokenBuy,
        uint256 baseAmount,
        uint256 entryPrice,
        uint256 hardStopPercent,
        uint256 profitTakePercent
    );

    event ProfitLocked(
        uint256 indexed positionId,
        uint256 profitAmount,
        uint256 profitValue,
        uint256 newMilestone,
        uint256 totalProfitsSold
    );

    event HardStopTriggered(
        uint256 indexed positionId,
        uint256 baseAmountSold,
        uint256 profitsRemaining,
        uint256 totalReceived
    );

    event PositionClosed(
        uint256 indexed positionId,
        uint256 totalAmountSold,
        uint256 totalReceived,
        string reason
    );

    event PositionCancelled(uint256 indexed positionId);
    event PositionPaused(uint256 indexed positionId);
    event PositionResumed(uint256 indexed positionId);
    event ETHWithdrawn(address indexed to, uint256 amount);

    // Errors
    error PositionNotActive(uint256 positionId);
    error InsufficientBalanceOrAllowance(uint256 positionId);
    error SwapExecutionFailed(uint256 positionId);
    error MaxRetriesExceeded(uint256 positionId);

    // Position status enum
    enum PositionStatus { Active, Paused, Cancelled, Closed, Failed }

    // Profit locking position struct
    struct ProfitLockingPosition {
        uint256 id;
        address pair;
        address tokenSell;
        address tokenBuy;
        bool sellToken0;
        uint256 coefficient;

        // Core amounts
        uint256 baseAmount;              // Sacred capital - only sold at hard stop
        uint256 remainingBase;           // Tracks what's left of base
        uint256 totalProfitsSold;        // Cumulative profits taken

        // Price thresholds
        uint256 entryPrice;              // Initial entry price
        uint256 hardStopPrice;           // Absolute floor (sell everything)
        uint256 hardStopPercent;         // e.g., 1000 = 10%
        uint256 profitTakePercent;       // e.g., 2000 = 20%

        // Milestone tracking
        uint256 nextProfitMilestone;     // Next price to lock profits
        uint256 lastMilestonePrice;      // Last milestone hit

        PositionStatus status;
        uint256 createdAt;
        uint256 closedAt;
        uint8 retryCount;
        uint256 lastExecutionAttempt;
    }

    // State variables
    address public immutable owner;
    IUniswapV2Router02 public immutable router;

    ProfitLockingPosition[] public positions;
    uint256 public nextPositionId;

    // Configuration
    uint256 private constant DEADLINE_OFFSET = 300;
    uint8 private constant MAX_RETRIES = 3;
    uint256 private constant RETRY_COOLDOWN = 30;
    uint256 private constant MIN_AMOUNT = 1000;
    uint256 private constant BASIS_POINTS = 10000;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier validPosition(uint256 positionId) {
        require(positionId < positions.length, "Position does not exist");
        _;
    }

    constructor(
        address _owner,
        address _callbackSender,
        address _router
    ) AbstractCallback(_callbackSender) payable {
        owner = _owner;
        router = IUniswapV2Router02(_router);
    }

    /**
     * @notice Creates a profit-locking trailing stop position
     * @param pair Uniswap V2 pair address
     * @param sellToken0 Whether selling token0
     * @param baseAmount The "sacred" base amount to protect
     * @param coefficient Price calculation coefficient
     * @param hardStopPercent Hard stop below entry (basis points, e.g., 1000 = 10%)
     * @param profitTakePercent Profit milestone spacing (basis points, e.g., 2000 = 20%)
     */
    function createProfitLockingPosition(
        address pair,
        bool sellToken0,
        uint256 baseAmount,
        uint256 coefficient,
        uint256 hardStopPercent,
        uint256 profitTakePercent
    ) external onlyOwner returns (uint256) {
        require(pair != address(0), "Invalid pair");
        require(baseAmount >= MIN_AMOUNT, "Amount too small");
        require(coefficient > 0, "Invalid coefficient");
        require(hardStopPercent > 0 && hardStopPercent < BASIS_POINTS, "Invalid hard stop");
        require(profitTakePercent > 0 && profitTakePercent < BASIS_POINTS, "Invalid profit take");

        // Get token addresses
        address token0 = IUniswapV2Pair(pair).token0();
        address token1 = IUniswapV2Pair(pair).token1();
        address tokenSell = sellToken0 ? token0 : token1;
        address tokenBuy = sellToken0 ? token1 : token0;

        // Verify balance and allowance
        require(IERC20(tokenSell).balanceOf(owner) >= baseAmount, "Insufficient balance");
        require(
            IERC20(tokenSell).allowance(owner, address(this)) >= baseAmount,
            "Insufficient allowance"
        );

        // Get current price
        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(pair).getReserves();
        require(reserve0 > 0 && reserve1 > 0, "No liquidity");

        uint256 entryPrice;
        if (sellToken0) {
            entryPrice = Math.mulDiv(uint256(reserve1), coefficient, uint256(reserve0));
        } else {
            entryPrice = Math.mulDiv(uint256(reserve0), coefficient, uint256(reserve1));
        }

        // Calculate hard stop price
        uint256 hardStopPrice = Math.mulDiv(entryPrice, BASIS_POINTS - hardStopPercent, BASIS_POINTS);

        // Calculate first profit milestone
        uint256 nextProfitMilestone = Math.mulDiv(entryPrice, BASIS_POINTS + profitTakePercent, BASIS_POINTS);

        // Create position
        uint256 positionId = nextPositionId;
        positions.push(ProfitLockingPosition({
            id: positionId,
            pair: pair,
            tokenSell: tokenSell,
            tokenBuy: tokenBuy,
            sellToken0: sellToken0,
            coefficient: coefficient,
            baseAmount: baseAmount,
            remainingBase: baseAmount,
            totalProfitsSold: 0,
            entryPrice: entryPrice,
            hardStopPrice: hardStopPrice,
            hardStopPercent: hardStopPercent,
            profitTakePercent: profitTakePercent,
            nextProfitMilestone: nextProfitMilestone,
            lastMilestonePrice: entryPrice,
            status: PositionStatus.Active,
            createdAt: block.timestamp,
            closedAt: 0,
            retryCount: 0,
            lastExecutionAttempt: 0
        }));

        nextPositionId++;

        emit ProfitLockingPositionCreated(
            pair,
            positionId,
            sellToken0,
            tokenSell,
            tokenBuy,
            baseAmount,
            entryPrice,
            hardStopPercent,
            profitTakePercent
        );

        return positionId;
    }

    /**
     * @notice Executes profit locking (called by RSC when milestone hit)
     * @param positionId Position ID
     * @param currentPrice Current market price
     * @param milestonePrice The milestone that was hit
     */
    function executeProfitLock(
        address /*sender*/,
        uint256 positionId,
        uint256 currentPrice,
        uint256 milestonePrice
    ) external authorizedSenderOnly validPosition(positionId) {
        ProfitLockingPosition storage position = positions[positionId];

        if (position.status != PositionStatus.Active) {
            revert PositionNotActive(positionId);
        }

        // Check retry cooldown
        if (position.lastExecutionAttempt > 0 &&
            block.timestamp < position.lastExecutionAttempt + RETRY_COOLDOWN) {
            return;
        }

        if (position.retryCount >= MAX_RETRIES) {
            position.status = PositionStatus.Failed;
            revert MaxRetriesExceeded(positionId);
        }

        position.lastExecutionAttempt = block.timestamp;
        position.retryCount++;

        // Calculate profit to lock
        // Profit = (milestonePrice - lastMilestonePrice) / lastMilestonePrice * baseAmount
        uint256 priceGain = milestonePrice - position.lastMilestonePrice;
        uint256 profitAmount = Math.mulDiv(position.baseAmount, priceGain, position.lastMilestonePrice);

        // Verify owner has the profit amount
        uint256 ownerBalance = IERC20(position.tokenSell).balanceOf(owner);
        uint256 ownerAllowance = IERC20(position.tokenSell).allowance(owner, address(this));

        if (ownerBalance < profitAmount || ownerAllowance < profitAmount) {
            // Try to sell whatever is available
            profitAmount = Math.min(ownerBalance, ownerAllowance);
        }

        if (profitAmount < MIN_AMOUNT) {
            revert InsufficientBalanceOrAllowance(positionId);
        }

        // Execute profit sell
        (bool success, uint256 profitValue) = _executeSwap(position, profitAmount);

        if (success) {
            // Update position state
            position.totalProfitsSold += profitAmount;
            position.lastMilestonePrice = milestonePrice;

            // Calculate next milestone
            position.nextProfitMilestone = Math.mulDiv(
                milestonePrice,
                BASIS_POINTS + position.profitTakePercent,
                BASIS_POINTS
            );

            // Reset retry count on success
            position.retryCount = 0;

            emit ProfitLocked(
                positionId,
                profitAmount,
                profitValue,
                position.nextProfitMilestone,
                position.totalProfitsSold
            );
        }
    }

    /**
     * @notice Executes hard stop - sells everything (called by RSC)
     * @param positionId Position ID
     * @param currentPrice Current market price
     */
    function executeHardStop(
        address /*sender*/,
        uint256 positionId,
        uint256 currentPrice
    ) external authorizedSenderOnly validPosition(positionId) {
        ProfitLockingPosition storage position = positions[positionId];

        if (position.status != PositionStatus.Active) {
            revert PositionNotActive(positionId);
        }

        // Check retry cooldown
        if (position.lastExecutionAttempt > 0 &&
            block.timestamp < position.lastExecutionAttempt + RETRY_COOLDOWN) {
            return;
        }

        if (position.retryCount >= MAX_RETRIES) {
            position.status = PositionStatus.Failed;
            revert MaxRetriesExceeded(positionId);
        }

        position.lastExecutionAttempt = block.timestamp;
        position.retryCount++;

        // Sell remaining base + any accumulated profits
        uint256 ownerBalance = IERC20(position.tokenSell).balanceOf(owner);
        uint256 ownerAllowance = IERC20(position.tokenSell).allowance(owner, address(this));

        uint256 totalToSell = Math.min(ownerBalance, ownerAllowance);

        if (totalToSell < MIN_AMOUNT) {
            revert InsufficientBalanceOrAllowance(positionId);
        }

        // Execute final exit swap
        (bool success, uint256 totalReceived) = _executeSwap(position, totalToSell);

        if (success) {
            position.status = PositionStatus.Closed;
            position.closedAt = block.timestamp;
            position.remainingBase = 0;

            emit HardStopTriggered(
                positionId,
                totalToSell,
                0,
                totalReceived
            );

            emit PositionClosed(
                positionId,
                totalToSell,
                totalReceived,
                "Hard stop triggered"
            );
        }
    }

    /**
     * @notice Manually close position (owner only)
     */
    function manualClosePosition(uint256 positionId)
        external
        onlyOwner
        validPosition(positionId)
    {
        ProfitLockingPosition storage position = positions[positionId];
        require(position.status == PositionStatus.Active, "Not active");

        // Sell everything manually
        uint256 ownerBalance = IERC20(position.tokenSell).balanceOf(owner);
        uint256 ownerAllowance = IERC20(position.tokenSell).allowance(owner, address(this));

        uint256 totalToSell = Math.min(ownerBalance, ownerAllowance);

        if (totalToSell >= MIN_AMOUNT) {
            (bool success, uint256 totalReceived) = _executeSwap(position, totalToSell);

            if (success) {
                position.status = PositionStatus.Closed;
                position.closedAt = block.timestamp;

                emit PositionClosed(
                    positionId,
                    totalToSell,
                    totalReceived,
                    "Manual close"
                );
            }
        }
    }

    function cancelPosition(uint256 positionId)
        external
        onlyOwner
        validPosition(positionId)
    {
        ProfitLockingPosition storage position = positions[positionId];
        require(
            position.status == PositionStatus.Active || position.status == PositionStatus.Paused,
            "Cannot cancel"
        );

        position.status = PositionStatus.Cancelled;
        emit PositionCancelled(positionId);
    }

    function pausePosition(uint256 positionId)
        external
        onlyOwner
        validPosition(positionId)
    {
        ProfitLockingPosition storage position = positions[positionId];
        require(position.status == PositionStatus.Active, "Not active");

        position.status = PositionStatus.Paused;
        emit PositionPaused(positionId);
    }

    function resumePosition(uint256 positionId)
        external
        onlyOwner
        validPosition(positionId)
    {
        ProfitLockingPosition storage position = positions[positionId];
        require(position.status == PositionStatus.Paused, "Not paused");

        position.status = PositionStatus.Active;
        emit PositionResumed(positionId);
    }

    function getAllPositions() external view returns (uint256[] memory) {
        uint256[] memory allIds = new uint256[](positions.length);
        for (uint256 i = 0; i < positions.length; i++) {
            allIds[i] = i;
        }
        return allIds;
    }

    function getActivePositions() external view returns (uint256[] memory) {
        uint256 activeCount = 0;

        for (uint256 i = 0; i < positions.length; i++) {
            if (positions[i].status == PositionStatus.Active) {
                activeCount++;
            }
        }

        uint256[] memory activePositions = new uint256[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < positions.length; i++) {
            if (positions[i].status == PositionStatus.Active) {
                activePositions[index] = i;
                index++;
            }
        }

        return activePositions;
    }

    function getCurrentPrice(address pair, bool sellToken0) external view returns (uint256) {
        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(pair).getReserves();
        require(reserve0 > 0 && reserve1 > 0, "No liquidity");

        if (sellToken0) {
            return _quote(1, uint256(reserve0), uint256(reserve1));
        } else {
            return _quote(1, uint256(reserve1), uint256(reserve0));
        }
    }

    function _executeSwap(
        ProfitLockingPosition memory position,
        uint256 amount
    ) internal returns (bool success, uint256 amountOut) {
        IERC20 tokenSell = IERC20(position.tokenSell);
        IERC20 tokenBuy = IERC20(position.tokenBuy);

        tokenSell.safeTransferFrom(owner, address(this), amount);
        tokenSell.forceApprove(address(router), amount);

        address[] memory path = new address[](2);
        path[0] = position.tokenSell;
        path[1] = position.tokenBuy;

        uint256[] memory amounts = router.swapExactTokensForTokens(
            amount,
            0,
            path,
            address(this),
            block.timestamp + DEADLINE_OFFSET
        );

        amountOut = amounts[1];
        tokenBuy.safeTransfer(owner, amountOut);

        return (true, amountOut);
    }

    function _quote(uint amountA, uint reserveA, uint reserveB)
        internal
        pure
        returns (uint amountB)
    {
        require(amountA > 0, 'INSUFFICIENT_AMOUNT');
        require(reserveA > 0 && reserveB > 0, 'INSUFFICIENT_LIQUIDITY');
        amountB = (amountA * reserveB) / reserveA;
    }

    function emergencyRecoverToken(address token, uint256 amount) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        uint256 recoverAmount = amount == 0 ? balance : amount;
        require(recoverAmount <= balance, "Insufficient balance");
        IERC20(token).safeTransfer(owner, recoverAmount);
    }

    function withdrawETH(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient ETH");
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transfer failed");
        emit ETHWithdrawn(msg.sender, amount);
    }

    function withdrawAllETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH");
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "ETH transfer failed");
        emit ETHWithdrawn(msg.sender, balance);
    }
}
