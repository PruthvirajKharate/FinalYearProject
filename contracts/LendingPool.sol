// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

/**
 * @title LendingPool
 * @dev Core contract for Crypto Lending Application
 *      - Supports borrowing ERC20 simulation tokens by depositing ETH collateral.
 *      - Differentiates high-risk assets by modifying Loan-To-Value (LTV).
 *      - Offers both automatic and DAO-verified liquidation flows.
 */
contract LendingPool is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");

    // --- Enums ---
    enum LiquidationType {
        AUTOMATIC,
        DAO_VERIFIED
    }

    // --- Configurable protocol parameters ---
    // stored in BPS (basis points)
    uint256 public collateralRatioBps = 15000; // 150% default (approx 66% LTV)
    uint256 public constant HIGH_RISK_COLLATERAL_RATIO_BPS = 20000; // 200% (50% LTV) for high risk assets
    uint256 public constant BPS_DENOM = 10000;
    uint256 public constant SECONDS_PER_YEAR = 31536000;

    // --- Token / Reserve bookkeeping ---
    struct Reserve {
        bool enabled;
        address token; // ERC20 token address
        address priceFeed; // chainlink aggregator
        uint256 interestRateBps; // flat interest rate
        uint256 totalLiquidity; // total deposited amount
        bool isHighRisk; // if true, uses high risk collateral ratio
    }
    mapping(bytes32 => Reserve) public reserves;
    mapping(address => bytes32) public tokenToSymbol;

    // --- Collateral & Loan bookkeeping ---
    mapping(address => uint256) public collateralETH;
    
    struct Loan {
        address borrower;
        bytes32 symbol; 
        uint256 principal; 
        uint256 collateral; 
        bool active;
        uint256 timestamp;
    }
    mapping(address => Loan) public loans; 
    mapping(bytes32 => mapping(address => uint256)) public lenderBalances;

    // --- DAO Proposals for Liquidation ---
    mapping(address => bool) public activeDaoLiquidationProposals;

    // --- Events ---
    event ReserveAdded(bytes32 indexed symbol, address indexed token, address indexed priceFeed, uint256 rateBps, bool isHighRisk);
    event ReserveUpdated(bytes32 indexed symbol, address indexed priceFeed, uint256 rateBps, bool isHighRisk);
    event Deposited(address indexed lender, bytes32 indexed symbol, uint256 amount);
    event Withdrawn(address indexed lender, bytes32 indexed symbol, uint256 amount);
    event CollateralDeposited(address indexed user, uint256 amount);
    event Borrowed(address indexed borrower, bytes32 indexed symbol, uint256 amount, uint256 collateral);
    event Repaid(address indexed borrower, bytes32 indexed symbol, uint256 repaid, uint256 interest);
    event Liquidated(address indexed borrower, address indexed liquidator, uint256 seizedCollateral, LiquidationType liquidationType);
    event CollateralRatioUpdated(uint256 newRatioBps);
    event DAOLiquidationProposed(address indexed borrower, address indexed proposer);

    /**
     * @notice Constructor to setup default roles
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(LIQUIDATOR_ROLE, msg.sender); 
        _grantRole(DAO_ROLE, msg.sender); 
    }

    /**
     * @notice Add a new reserve asset
     * @param symbol Identifying symbol for the asset (e.g. USD, YEN)
     * @param tokenAddr ERC20 contract address of the asset
     * @param priceFeedAddr Chainlink price feed address
     * @param interestRateBps Annual interest rate in BPS
     * @param isHighRisk Boolean indicating if it's a high risk asset (enforces 50% LTV)
     */
    function addReserve(
        bytes32 symbol,
        address tokenAddr,
        address priceFeedAddr,
        uint256 interestRateBps,
        bool isHighRisk
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(tokenAddr != address(0), "token=0");
        require(!reserves[symbol].enabled, "reserve exists");
        reserves[symbol] = Reserve({
            enabled: true,
            token: tokenAddr,
            priceFeed: priceFeedAddr,
            interestRateBps: interestRateBps,
            totalLiquidity: 0,
            isHighRisk: isHighRisk
        });
        tokenToSymbol[tokenAddr] = symbol;
        emit ReserveAdded(symbol, tokenAddr, priceFeedAddr, interestRateBps, isHighRisk);
    }

    /**
     * @notice Update existing reserve asset
     * @param symbol Symbol of the asset
     * @param priceFeedAddr Chainlink price feed address
     * @param interestRateBps Annual interest rate in BPS
     * @param isHighRisk Risk status update
     */
    function updateReserve(
        bytes32 symbol,
        address priceFeedAddr,
        uint256 interestRateBps,
        bool isHighRisk
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(reserves[symbol].enabled, "no reserve");
        reserves[symbol].priceFeed = priceFeedAddr;
        reserves[symbol].interestRateBps = interestRateBps;
        reserves[symbol].isHighRisk = isHighRisk;
        emit ReserveUpdated(symbol, priceFeedAddr, interestRateBps, isHighRisk);
    }

    /**
     * @notice Set global default collateral ratio
     * @param newRatioBps New collateral ratio in BPS (e.g., 15000 = 150%)
     */
    function setCollateralRatio(uint256 newRatioBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRatioBps >= 1000 && newRatioBps <= 30000, "ratio out of range"); 
        collateralRatioBps = newRatioBps;
        emit CollateralRatioUpdated(newRatioBps);
    }

    /**
     * @notice Deposit tokens into the specified reserve
     * @param symbol Asset symbol to deposit
     * @param amount Token amount to deposit (accounting for token decimals)
     */
    function deposit(bytes32 symbol, uint256 amount) external nonReentrant {
        Reserve storage r = reserves[symbol];
        require(r.enabled, "reserve disabled");
        require(amount > 0, "amount=0");

        IERC20(r.token).safeTransferFrom(msg.sender, address(this), amount);

        lenderBalances[symbol][msg.sender] += amount;
        r.totalLiquidity += amount;

        emit Deposited(msg.sender, symbol, amount);
    }

    /**
     * @notice Withdraw previously deposited tokens
     * @param symbol Asset symbol to withdraw
     * @param amount Token amount to withdraw
     */
    function withdraw(bytes32 symbol, uint256 amount) external nonReentrant {
        Reserve storage r = reserves[symbol];
        require(r.enabled, "reserve disabled");
        require(amount > 0, "amount=0");
        uint256 userBal = lenderBalances[symbol][msg.sender];
        require(userBal >= amount, "insufficient balance");

        lenderBalances[symbol][msg.sender] = userBal - amount;
        r.totalLiquidity -= amount;

        IERC20(r.token).safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, symbol, amount);
    }

    /**
     * @notice Deposit ETH logic as collateral for future borrowing
     */
    function depositCollateral() external payable nonReentrant {
        require(msg.value > 0, "no ETH");
        collateralETH[msg.sender] += msg.value;
        emit CollateralDeposited(msg.sender, msg.value);
    }

    /**
     * @notice Borrow reserve tokens against deposited collateral
     * @param symbol Asset symbol to borrow
     * @param amount Amount to borrow
     * @param maxPriceSlippageBps Maximum allowed price slippage of ETH/USD
     * @param expectedEthUsd The expected ETH/USD price from chainlink
     */
    function borrow(
        bytes32 symbol,
        uint256 amount,
        uint256 maxPriceSlippageBps,
        uint256 expectedEthUsd
    ) external nonReentrant {
        require(amount > 0, "amount=0");
        require(!loans[msg.sender].active, "loan exists");
        Reserve storage r = reserves[symbol];
        require(r.enabled, "reserve disabled");

        uint256 availableEth = collateralETH[msg.sender];
        require(availableEth > 0, "no collateral");

        uint256 ethUsdPrice = _getPriceAs1e18(r.priceFeed);
        
        if (expectedEthUsd != 0) {
            uint256 diff = ethUsdPrice > expectedEthUsd
                ? ethUsdPrice - expectedEthUsd
                : expectedEthUsd - ethUsdPrice;
            require(diff * BPS_DENOM <= expectedEthUsd * maxPriceSlippageBps, "price slippage");
        }

        uint256 collateralUsdValue = (availableEth * ethUsdPrice) / 1e18;
        uint8 tokenDecimals = IERC20Metadata(r.token).decimals();
        uint256 normalizedAmount = amount;

        if (tokenDecimals < 18) {
            normalizedAmount = amount * (10 ** (18 - tokenDecimals));
        }

        uint256 requiredRatioBps = r.isHighRisk ? HIGH_RISK_COLLATERAL_RATIO_BPS : collateralRatioBps;
        require(collateralUsdValue * BPS_DENOM >= normalizedAmount * requiredRatioBps, "insufficient collateral");

        collateralETH[msg.sender] = 0;

        loans[msg.sender] = Loan({
            borrower: msg.sender,
            symbol: symbol,
            principal: amount,
            collateral: availableEth,
            active: true,
            timestamp: block.timestamp
        });

        IERC20(r.token).safeTransfer(msg.sender, amount);

        emit Borrowed(msg.sender, symbol, amount, availableEth);
    }

    /**
     * @notice Repay loan with accumulated interest, returns the held collateral
     */
    function repay() external nonReentrant {
        Loan storage loan = loans[msg.sender];
        require(loan.active, "no active loan");

        Reserve storage r = reserves[loan.symbol];
        require(r.enabled, "reserve disabled");

        uint256 time_elasped = block.timestamp - loan.timestamp;

        // compute interest (rounded up)
        uint256 denominator = BPS_DENOM * SECONDS_PER_YEAR;
        uint256 interest = (loan.principal * r.interestRateBps * time_elasped + (denominator - 1)) / denominator;
        uint256 totalOwed = loan.principal + interest;

        IERC20(r.token).safeTransferFrom(msg.sender, address(this), totalOwed);

        r.totalLiquidity += totalOwed;
        uint256 collateralToReturn = loan.collateral;

        loan.active = false;
        loan.principal = 0;
        loan.collateral = 0;

        (bool ok, ) = payable(msg.sender).call{value: collateralToReturn}("");
        require(ok, "ETH refund failed");

        emit Repaid(msg.sender, loan.symbol, totalOwed, interest);
    }

    /**
     * @notice Propose a DAO Liquidation for a risky loan
     * @param borrower The borrower address to flag for liquidation
     */
    function proposeDAOLiquidation(address borrower) external onlyRole(DAO_ROLE) {
        require(loans[borrower].active, "no active loan");
        require(!activeDaoLiquidationProposals[borrower], "already proposed");
        
        activeDaoLiquidationProposals[borrower] = true;
        emit DAOLiquidationProposed(borrower, msg.sender);
    }

    /**
     * @notice Execute an approved DAO liquidation. Requires DAO_ROLE.
     *         Bypasses health checks natively because DAO verified the risk manually.
     * @param borrower The address of the borrower to liquidate
     */
    function executeDAOLiquidation(address borrower) external nonReentrant onlyRole(DAO_ROLE) {
        require(loans[borrower].active, "no active loan for borrower");
        require(activeDaoLiquidationProposals[borrower], "no proposal active");

        activeDaoLiquidationProposals[borrower] = false;
        _executeLiquidation(borrower, msg.sender, LiquidationType.DAO_VERIFIED);
    }

    /**
     * @notice Auto-liquidate an undercollateralized loan programmatically
     * @param borrower Address of the borrower
     */
    function liquidate(address borrower) external nonReentrant onlyRole(LIQUIDATOR_ROLE) {
        Loan storage loan = loans[borrower];
        require(loan.active, "no active loan");

        Reserve storage r = reserves[loan.symbol];
        require(r.enabled, "reserve disabled");

        uint256 ethUsdPrice = _getPriceAs1e18(r.priceFeed);
        uint256 collateralUsdValue = (loan.collateral * ethUsdPrice) / 1e18;
        
        uint256 requiredRatioBps = r.isHighRisk ? HIGH_RISK_COLLATERAL_RATIO_BPS : collateralRatioBps;
        uint256 requiredUsd = (loan.principal * requiredRatioBps) / BPS_DENOM;

        require(collateralUsdValue < requiredUsd, "loan healthy");

        _executeLiquidation(borrower, msg.sender, LiquidationType.AUTOMATIC);
    }

    /**
     * @dev Internal reusable method for executing liquidation math and transfers
     */
    function _executeLiquidation(address borrower, address liquidator, LiquidationType liqType) internal {
        Loan storage loan = loans[borrower];
        uint256 seized = loan.collateral;

        loan.active = false;
        loan.principal = 0;
        loan.collateral = 0;

        (bool ok, ) = payable(liquidator).call{value: seized}("");
        require(ok, "ETH send failed");

        emit Liquidated(borrower, liquidator, seized, liqType);
    }

    /**
     * @dev Normalize price from aggregator to 18 decimals
     */
    function _getPriceAs1e18(address priceFeed) internal view returns (uint256) {
        require(priceFeed != address(0), "no feed");
        AggregatorV3Interface feed = AggregatorV3Interface(priceFeed);
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = feed.latestRoundData();
        require(answer > 0, "bad price");
        require(updatedAt > 0, "incomplete Round");
        require(answeredInRound >= roundId, "stalePrice");
        require(block.timestamp - updatedAt < 7200, "price too old");
        uint8 decimalsFeed = feed.decimals();
        
        if (decimalsFeed == 18) {
            return uint256(answer);
        } else if (decimalsFeed < 18) {
            return uint256(answer) * (10 ** (18 - decimalsFeed));
        } else {
            return uint256(answer) / (10 ** (decimalsFeed - 18));
        }
    }

    /**
     * @notice Fallback fallback to allow direct ETH deposits as collateral
     */
    receive() external payable {
        collateralETH[msg.sender] += msg.value;
        emit CollateralDeposited(msg.sender, msg.value);
    }
}
