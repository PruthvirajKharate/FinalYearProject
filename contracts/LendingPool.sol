// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/*
  Production-ish MVP LendingPool

  - Uses OpenZeppelin: AccessControl, ReentrancyGuard, SafeERC20
  - Supports multiple ERC20 reserve tokens
  - Chainlink price feed interface (inline)
  - Role-based access (DEFAULT_ADMIN_ROLE, LIQUIDATOR_ROLE)
  - Admin-configurable per-token interest rates and price feeds
  - deposit (lenders), withdraw (lenders), depositCollateral (borrowers),
    borrow, repay, liquidate
  - single active loan per borrower (MVP) — can be extended later
*/

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

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

contract LendingPool is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");

    // --- Configurable protocol parameters ---
    // stored in BPS (basis points)
    uint256 public collateralRatioBps = 15000; // 150% default
    uint256 public constant BPS_DENOM = 10000;

    // --- Token / Reserve bookkeeping ---
    struct Reserve {
        bool enabled;
        address token; // ERC20 token address
        address priceFeed; // chainlink aggregator for token price in USD or ETH pair as needed
        uint256 interestRateBps; // flat interest for MVP (per loan) in bps
        uint256 totalLiquidity; // tokens held from lenders
    }
    // tokenSymbol => reserve
    mapping(bytes32 => Reserve) public reserves;

    // Quick lookup for tokenAddress -> symbol (bytes32) if needed
    mapping(address => bytes32) public tokenToSymbol;

    // --- Collateral & Loan bookkeeping ---
    mapping(address => uint256) public collateralETH; // available collateral (not locked)
    struct Loan {
        address borrower;
        bytes32 symbol;    // which reserve token borrowed
        uint256 principal; // borrowed amount (token decimals)
        uint256 collateral; // ETH locked for this loan
        bool active;
    }
    mapping(address => Loan) public loans; // single active loan per borrower (MVP)

    // Lender balances per token symbol
    mapping(bytes32 => mapping(address => uint256)) public lenderBalances;

    // --- Events ---
    event ReserveAdded(bytes32 indexed symbol, address indexed token, address indexed priceFeed, uint256 rateBps);
    event ReserveUpdated(bytes32 indexed symbol, address indexed priceFeed, uint256 rateBps);
    event Deposited(address indexed lender, bytes32 indexed symbol, uint256 amount);
    event Withdrawn(address indexed lender, bytes32 indexed symbol, uint256 amount);
    event CollateralDeposited(address indexed user, uint256 amount);
    event Borrowed(address indexed borrower, bytes32 indexed symbol, uint256 amount, uint256 collateral);
    event Repaid(address indexed borrower, bytes32 indexed symbol, uint256 repaid, uint256 interest);
    event Liquidated(address indexed borrower, address indexed liquidator, uint256 seizedCollateral);
    event CollateralRatioUpdated(uint256 newRatioBps);

    // --- Constructor: grant admin role to deployer ---
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(LIQUIDATOR_ROLE, msg.sender); // admin can liquidate in MVP
    }

    // ---------------- Admin functions ----------------
    function addReserve(
        bytes32 symbol,
        address tokenAddr,
        address priceFeedAddr,
        uint256 interestRateBps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(tokenAddr != address(0), "token=0");
        require(!reserves[symbol].enabled, "reserve exists");
        reserves[symbol] = Reserve({
            enabled: true,
            token: tokenAddr,
            priceFeed: priceFeedAddr,
            interestRateBps: interestRateBps,
            totalLiquidity: 0
        });
        tokenToSymbol[tokenAddr] = symbol;
        emit ReserveAdded(symbol, tokenAddr, priceFeedAddr, interestRateBps);
    }

    function updateReserve(bytes32 symbol, address priceFeedAddr, uint256 interestRateBps)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(reserves[symbol].enabled, "no reserve");
        reserves[symbol].priceFeed = priceFeedAddr;
        reserves[symbol].interestRateBps = interestRateBps;
        emit ReserveUpdated(symbol, priceFeedAddr, interestRateBps);
    }

    function setCollateralRatio(uint256 newRatioBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRatioBps >= 1000 && newRatioBps <= 30000, "ratio out of range"); // 10% - 300%
        collateralRatioBps = newRatioBps;
        emit CollateralRatioUpdated(newRatioBps);
    }

    // ---------------- Lender flows ----------------
    // deposit tokens into reserve (lenders)
    function deposit(bytes32 symbol, uint256 amount) external nonReentrant {
        Reserve storage r = reserves[symbol];
        require(r.enabled, "reserve disabled");
        require(amount > 0, "amount=0");

        IERC20(r.token).safeTransferFrom(msg.sender, address(this), amount);

        lenderBalances[symbol][msg.sender] += amount;
        r.totalLiquidity += amount;

        emit Deposited(msg.sender, symbol, amount);
    }

    // withdraw tokens (lender)
    function withdraw(bytes32 symbol, uint256 amount) external nonReentrant {
        Reserve storage r = reserves[symbol];
        require(r.enabled, "reserve disabled");
        require(amount > 0, "amount=0");
        uint256 userBal = lenderBalances[symbol][msg.sender];
        require(userBal >= amount, "insufficient balance");

        // In a real protocol you'd check available liquidity vs loans; for MVP assume liquidity exists
        lenderBalances[symbol][msg.sender] = userBal - amount;
        r.totalLiquidity -= amount;

        IERC20(r.token).safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, symbol, amount);
    }

    // ---------------- Collateral flows ----------------
    function depositCollateral() external payable nonReentrant {
        require(msg.value > 0, "no ETH");
        collateralETH[msg.sender] += msg.value;
        emit CollateralDeposited(msg.sender, msg.value);
    }

    // ---------------- Borrow flows ----------------
    /**
     * Borrow `amount` of token `symbol`. Requires collateral already deposited by borrower.
     * - locks entire available collateral for simplicity (MVP)
     * - single active loan per borrower
     * - price feeds assumed to return token-USD or ETH-USD depending on feed; for simplicity,
     *   we will get ETH/USD price to value ETH collateral and assume token is USD-pegged
     */
    function borrow(bytes32 symbol, uint256 amount, uint256 maxPriceSlippageBps, uint256 expectedEthUsd)
        external
        nonReentrant
    {
        require(amount > 0, "amount=0");
        require(!loans[msg.sender].active, "loan exists");
        Reserve storage r = reserves[symbol];
        require(r.enabled, "reserve disabled");

        // must have collateral deposited
        uint256 availableEth = collateralETH[msg.sender];
        require(availableEth > 0, "no collateral");

        // get ETH/USD price
        uint256 ethUsdPrice = _getPriceAs1e18(r.priceFeed, "ETH/USD");
        // optional slippage guard (protect user)
        if (expectedEthUsd != 0) {
            uint256 diff = ethUsdPrice > expectedEthUsd ? ethUsdPrice - expectedEthUsd : expectedEthUsd - ethUsdPrice;
            require(diff * BPS_DENOM <= expectedEthUsd * maxPriceSlippageBps, "price slippage");
        }

        // collateral value in USD (1e18 scale)
        uint256 collateralUsdValue = (availableEth * ethUsdPrice) / 1e18;

        // Check collateral ratio: collateralUsd >= amount * collateralRatioBps / BPS_DENOM
        // NOTE: this assumes 'amount' is USD-like in decimals (for mock fiat tokens use 18 decimals).
        require(collateralUsdValue * BPS_DENOM >= amount * collateralRatioBps, "insufficient collateral");

        // lock collateral: for MVP we lock all available collateral
        collateralETH[msg.sender] = 0;

        // create loan
        loans[msg.sender] = Loan({
            borrower: msg.sender,
            symbol: symbol,
            principal: amount,
            collateral: availableEth,
            active: true
        });

        // transfer tokens to borrower
        IERC20(r.token).safeTransfer(msg.sender, amount);

        emit Borrowed(msg.sender, symbol, amount, availableEth);
    }

    // ---------------- Repay flows ----------------
    function repay() external nonReentrant {
        Loan storage loan = loans[msg.sender];
        require(loan.active, "no active loan");

        Reserve storage r = reserves[loan.symbol];
        require(r.enabled, "reserve disabled");

        // compute interest (rounded up)
        uint256 interest = (loan.principal * r.interestRateBps + (BPS_DENOM - 1)) / BPS_DENOM;
        uint256 totalOwed = loan.principal + interest;

        // pull tokens from borrower
        IERC20(r.token).safeTransferFrom(msg.sender, address(this), totalOwed);

        // update reserve liquidity (lender pool receives repaid principal + interest)
        r.totalLiquidity += totalOwed;

        uint256 collateralToReturn = loan.collateral;

        // clear loan
        loan.active = false;
        loan.principal = 0;
        loan.collateral = 0;

        // return ETH collateral
        (bool ok, ) = payable(msg.sender).call{value: collateralToReturn}("");
        require(ok, "ETH refund failed");

        emit Repaid(msg.sender, loan.symbol, totalOwed, interest);
    }

    // ---------------- Liquidation ----------------
    // Anyone with LIQUIDATOR_ROLE (or permissionless if you prefer) can liquidate
    function liquidate(address borrower) external nonReentrant onlyRole(LIQUIDATOR_ROLE) {
        Loan storage loan = loans[borrower];
        require(loan.active, "no active loan");

        Reserve storage r = reserves[loan.symbol];
        require(r.enabled, "reserve disabled");

        // get ETH/USD price
        uint256 ethUsdPrice = _getPriceAs1e18(r.priceFeed, "ETH/USD");
        uint256 collateralUsdValue = (loan.collateral * ethUsdPrice) / 1e18;
        uint256 requiredUsd = (loan.principal * collateralRatioBps) / BPS_DENOM;

        require(collateralUsdValue < requiredUsd, "loan healthy");

        uint256 seized = loan.collateral;

        // clear loan
        loan.active = false;
        loan.principal = 0;
        loan.collateral = 0;

        // NOTE: In production you would distribute seized collateral to a liquidation pool
        // or to repay lenders; here we send to liquidator for simplicity.
        (bool ok, ) = payable(msg.sender).call{value: seized}("");
        require(ok, "ETH send failed");

        emit Liquidated(borrower, msg.sender, seized);
    }

    // ---------------- Internal helpers ----------------
    // Normalize price to 1e18 scale
    function _getPriceAs1e18(address priceFeed, string memory _hint) internal view returns (uint256) {
        require(priceFeed != address(0), "no feed");
        AggregatorV3Interface feed = AggregatorV3Interface(priceFeed);
        (, int256 answer, , , ) = feed.latestRoundData();
        require(answer > 0, "bad price");
        uint8 decimalsFeed = feed.decimals();
        // scale to 1e18
        if (decimalsFeed == 18) {
            return uint256(answer);
        } else if (decimalsFeed < 18) {
            return uint256(answer) * (10 ** (18 - decimalsFeed));
        } else {
            return uint256(answer) / (10 ** (decimalsFeed - 18));
        }
    }

    // Fallback receive to accept ETH
    receive() external payable {
        // allow direct ETH sends (user should call depositCollateral but we accept direct sends)
        collateralETH[msg.sender] += msg.value;
        emit CollateralDeposited(msg.sender, msg.value);
    }
}
