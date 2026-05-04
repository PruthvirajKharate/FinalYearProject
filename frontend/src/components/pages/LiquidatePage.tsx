import React, { useState, useEffect, useCallback } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, Flame, RefreshCw, ShieldAlert, Activity } from "lucide-react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import NeoCard from "../common/NeoCard";
import NeoButton from "../common/NeoButton";
import { CONTRACTS } from "../../contracts";

// Minimal ABI for Chainlink AggregatorV3Interface (price feed)
const AGGREGATOR_ABI = [
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
];

// Constants matching the smart contract
const BPS_DENOM = 10000n;
const HIGH_RISK_COLLATERAL_RATIO_BPS = 20000n;

interface LoanFromAPI {
  id: number;
  borrowerAddress: string;
  assetSymbol: string;
  principalAmount: string;
  collateralAmount: string;
  status: string;
  loanTimeStamp: string;
}

interface EnrichedPosition {
  borrowerAddress: string;
  assetSymbol: string;
  principal: bigint;
  collateral: bigint;
  healthFactor: number;
  collateralUsd: number;
  debtRequired: number;
  isHighRisk: boolean;
  isActive: boolean;
}

const LiquidatePage: React.FC = () => {
  const { isConnected } = useAccount();
  const [positions, setPositions] = useState<EnrichedPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ethUsdPrice, setEthUsdPrice] = useState<number>(0);
  const [liquidatingAddress, setLiquidatingAddress] = useState<string | null>(null);

  // Wagmi hook for writing to the contract (liquidation)
  const { writeContract, data: txHash, isPending: isWritePending, error: writeError } = useWriteContract();

  // Wait for tx confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  /**
   * Fetches active loans from the NestJS API, then reads on-chain state
   * to calculate real health factors for each position.
   */
  const fetchAndEnrichPositions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch active loans from the server API
      const response = await fetch("http://localhost:3000/loans/active");
      if (!response.ok) throw new Error(`Server responded with ${response.status}`);
      const apiLoans: LoanFromAPI[] = await response.json();

      if (apiLoans.length === 0) {
        setPositions([]);
        setLoading(false);
        return;
      }

      // Deduplicate by borrowerAddress (contract allows only one active loan per address)
      const uniqueLoans = Array.from(
        new Map(apiLoans.map((l) => [l.borrowerAddress, l])).values()
      );

      // 2. Connect to the local Hardhat node for on-chain reads
      const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const lendingPool = new ethers.Contract(
        CONTRACTS.lendingPool.address,
        CONTRACTS.lendingPool.abi,
        provider
      );

      // 3. Read global protocol parameters (only need to do this once)
      const collateralRatioBps: bigint = await lendingPool.collateralRatioBps();

      // 4. For each loan, read on-chain state and calculate health
      const enriched: EnrichedPosition[] = [];

      for (const loan of uniqueLoans) {
        try {
          // Read the on-chain loan struct
          const onChainLoan = await lendingPool.loans(loan.borrowerAddress);
          if (!onChainLoan.active) continue; // Skip if already closed on-chain

          // Read reserve info for this asset
          const symbolBytes32 = onChainLoan.symbol;
          const reserve = await lendingPool.reserves(symbolBytes32);

          // Read ETH/USD price from the price feed
          const aggregator = new ethers.Contract(reserve.priceFeed, AGGREGATOR_ABI, provider);
          const feedDecimals: bigint = BigInt(await aggregator.decimals());
          const roundData = await aggregator.latestRoundData();
          const answer: bigint = roundData.answer;

          // Normalize price to 1e18 (matching contract's _getPriceAs1e18)
          let ethUsdPrice1e18: bigint;
          if (feedDecimals === 18n) {
            ethUsdPrice1e18 = answer;
          } else if (feedDecimals < 18n) {
            ethUsdPrice1e18 = answer * (10n ** (18n - feedDecimals));
          } else {
            ethUsdPrice1e18 = answer / (10n ** (feedDecimals - 18n));
          }

          // Store readable ETH/USD price
          const ethPrice = Number(ethUsdPrice1e18) / 1e18;
          setEthUsdPrice(ethPrice);

          // Calculate health factor (matching contract's liquidation check)
          const collateral: bigint = onChainLoan.collateral;
          const principal: bigint = onChainLoan.principal;
          const isHighRisk: boolean = reserve.isHighRisk;

          const collateralUsdValue = (collateral * ethUsdPrice1e18) / (10n ** 18n);
          const requiredRatioBps = isHighRisk ? HIGH_RISK_COLLATERAL_RATIO_BPS : collateralRatioBps;
          const requiredUsd = (principal * requiredRatioBps) / BPS_DENOM;

          // Health factor: collateralUsdValue / requiredUsd
          // Using scaled BigInt math to preserve precision
          const healthScaled = requiredUsd > 0n
            ? Number(collateralUsdValue * 10000n / requiredUsd) / 10000
            : 999; // No debt = infinitely healthy

          enriched.push({
            borrowerAddress: loan.borrowerAddress,
            assetSymbol: loan.assetSymbol,
            principal,
            collateral,
            healthFactor: healthScaled,
            collateralUsd: Number(ethers.formatUnits(collateralUsdValue, 18)),
            debtRequired: Number(ethers.formatUnits(requiredUsd, 18)),
            isHighRisk,
            isActive: true,
          });
        } catch (err: any) {
          console.error(`Error enriching loan for ${loan.borrowerAddress}:`, err.message);
        }
      }

      // Sort: most at-risk positions first
      enriched.sort((a, b) => a.healthFactor - b.healthFactor);
      setPositions(enriched);
    } catch (err: any) {
      setError(err.message || "Failed to fetch positions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAndEnrichPositions();
  }, [fetchAndEnrichPositions]);

  // Handle liquidation result
  useEffect(() => {
    if (isConfirmed && liquidatingAddress) {
      toast.success(`Liquidation of ${liquidatingAddress.slice(0, 6)}...${liquidatingAddress.slice(-4)} confirmed!`);
      setLiquidatingAddress(null);
      fetchAndEnrichPositions(); // Refresh positions
    }
  }, [isConfirmed, liquidatingAddress, fetchAndEnrichPositions]);

  useEffect(() => {
    if (writeError) {
      const msg = writeError.message || "Liquidation failed";
      if (msg.includes("loan healthy")) {
        toast.error("Position is healthy — cannot liquidate.");
      } else if (msg.includes("AccessControl")) {
        toast.error("Your wallet does not have the LIQUIDATOR_ROLE.");
      } else {
        toast.error(`Liquidation failed: ${msg.slice(0, 100)}`);
      }
      setLiquidatingAddress(null);
    }
  }, [writeError]);

  const handleLiquidate = (borrowerAddress: string) => {
    if (!isConnected) {
      toast.error("Connect your wallet first.");
      return;
    }
    setLiquidatingAddress(borrowerAddress);
    writeContract({
      address: CONTRACTS.lendingPool.address as `0x${string}`,
      abi: CONTRACTS.lendingPool.abi,
      functionName: "liquidate",
      args: [borrowerAddress],
    });
  };

  // Derived stats
  const atRiskCount = positions.filter((p) => p.healthFactor < 1.0).length;
  const warningCount = positions.filter((p) => p.healthFactor >= 1.0 && p.healthFactor < 1.5).length;
  const healthyCount = positions.filter((p) => p.healthFactor >= 1.5).length;

  const getHealthColor = (hf: number) => {
    if (hf < 1.0) return "text-red-600";
    if (hf < 1.5) return "text-amber-600";
    return "text-emerald-600";
  };

  const getHealthBg = (hf: number) => {
    if (hf < 1.0) return "bg-red-50 border-red-200";
    if (hf < 1.5) return "bg-amber-50 border-amber-200";
    return "bg-emerald-50 border-emerald-200";
  };

  const getHealthIcon = (hf: number) => {
    if (hf < 1.0) return <AlertTriangle className="w-4 h-4" />;
    if (hf < 1.5) return <ShieldAlert className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-5xl font-black">Liquidations</h1>
        <NeoButton
          onClick={fetchAndEnrichPositions}
          variant="secondary"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </NeoButton>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Active Loans</p>
          <p className="text-3xl font-black text-blue-800 mt-1">{positions.length}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider">At Risk (HF &lt; 1.0)</p>
          <p className="text-3xl font-black text-red-800 mt-1">{atRiskCount}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Warning (1.0–1.5)</p>
          <p className="text-3xl font-black text-amber-800 mt-1">{warningCount}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Healthy (≥ 1.5)</p>
          <p className="text-3xl font-black text-emerald-800 mt-1">{healthyCount}</p>
        </div>
      </div>

      {/* ETH/USD Price Feed */}
      {ethUsdPrice > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Activity className="w-4 h-4" />
          <span>
            Oracle ETH/USD: <span className="font-bold text-black">${ethUsdPrice.toLocaleString()}</span>
          </span>
        </div>
      )}

      {/* Positions Table */}
      <NeoCard padding="p-0">
        <div className="p-6 border-b-2 border-gray-100">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" />
            Collateral Positions
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Positions with a Health Factor below 1.0 are eligible for liquidation. 
            Only wallets with the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">LIQUIDATOR_ROLE</code> can execute.
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium">Loading positions from blockchain...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-red-500 font-bold text-lg">⚠️ Error Loading Positions</p>
            <p className="text-gray-400 text-sm mt-2">{error}</p>
            <p className="text-gray-400 text-xs mt-1">
              Make sure your NestJS backend (port 3000) and Hardhat node (port 8545) are running.
            </p>
          </div>
        ) : positions.length === 0 ? (
          <div className="p-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 m-4">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-xl text-gray-500 font-medium">No active loans found.</p>
            <p className="text-sm text-gray-400 mt-2">
              All positions are safe or no borrowers exist. The protocol is healthy!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b-2 border-black bg-gray-50">
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Borrower</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Asset</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Debt (Principal)</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Collateral (ETH)</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Collateral USD</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Health Factor</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Risk</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {positions.map((pos, index) => {
                    const isLiquidatable = pos.healthFactor < 1.0;
                    const isCurrentlyLiquidating =
                      liquidatingAddress === pos.borrowerAddress && (isWritePending || isConfirming);

                    return (
                      <motion.tr
                        key={pos.borrowerAddress}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`border-b border-gray-100 transition-colors ${
                          isLiquidatable ? "bg-red-50/50 hover:bg-red-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="p-4 font-mono text-sm" title={pos.borrowerAddress}>
                          {shortenAddress(pos.borrowerAddress)}
                        </td>
                        <td className="p-4 font-black text-lg">{pos.assetSymbol}</td>
                        <td className="p-4 font-mono font-bold">
                          {Number(ethers.formatUnits(pos.principal, 18)).toLocaleString(undefined, {
                            maximumFractionDigits: 4,
                          })}
                        </td>
                        <td className="p-4 font-mono">
                          {Number(ethers.formatUnits(pos.collateral, 18)).toLocaleString(undefined, {
                            maximumFractionDigits: 6,
                          })}{" "}
                          ETH
                        </td>
                        <td className="p-4 font-mono text-gray-600">
                          ${pos.collateralUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border ${getHealthBg(pos.healthFactor)} ${getHealthColor(pos.healthFactor)}`}
                          >
                            {getHealthIcon(pos.healthFactor)}
                            {pos.healthFactor.toFixed(4)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              pos.isHighRisk
                                ? "bg-red-100 text-red-700 border border-red-300"
                                : "bg-blue-100 text-blue-700 border border-blue-300"
                            }`}
                          >
                            {pos.isHighRisk ? "HIGH" : "LOW"}
                          </span>
                        </td>
                        <td className="p-4">
                          {isLiquidatable ? (
                            <NeoButton
                              variant="danger"
                              className="py-2 px-4 text-sm"
                              onClick={() => handleLiquidate(pos.borrowerAddress)}
                              disabled={isCurrentlyLiquidating}
                            >
                              {isCurrentlyLiquidating ? (
                                <span className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  {isConfirming ? "Confirming..." : "Signing..."}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Flame className="w-4 h-4" />
                                  Liquidate
                                </span>
                              )}
                            </NeoButton>
                          ) : (
                            <span className="text-emerald-500 font-medium text-sm flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Safe
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </NeoCard>
    </div>
  );
};

export default LiquidatePage;
