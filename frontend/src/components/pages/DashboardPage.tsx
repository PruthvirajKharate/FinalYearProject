import React from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatEther, formatUnits } from "viem";
import { ethers } from "ethers";
import NeoCard from "../common/NeoCard";
import StatCard from "../ui/StatCard";
import HealthStatus from "../ui/HealthStatus";
import { CONTRACTS } from "../../contracts";

const DashboardPage: React.FC = () => {
  const { address } = useAccount();

  // 1. Read User's Active Loan
  const { data: rawLoan } = useReadContract({
    address: CONTRACTS.lendingPool.address as `0x${string}`,
    abi: CONTRACTS.lendingPool.abi,
    functionName: "loans",
    args: address ? [address] : undefined,
  });

  // 2. Read Any Isolated Collateral
  const { data: pureCollateral } = useReadContract({
    address: CONTRACTS.lendingPool.address as `0x${string}`,
    abi: CONTRACTS.lendingPool.abi,
    functionName: "collateralETH",
    args: address ? [address] : undefined,
  });

  // Parse Wagmi Array Result [borrower, symbol, principal, collateral, active, timestamp]
  const isActive = rawLoan ? (rawLoan as any[])[4] : false;
  const symbolBytes = rawLoan ? (rawLoan as any[])[1] : "";
  const principalRaw = rawLoan ? (rawLoan as any[])[2] : 0n;
  const collateralLocked = rawLoan ? (rawLoan as any[])[3] : 0n;

  const symbol = isActive ? ethers.decodeBytes32String(symbolBytes) : "None";
  const formattedPrincipal = isActive ? formatUnits(principalRaw, 18) : "0";
  
  // They either have collateral locked in an active loan, or just floating collateral
  const totalEthCollateral = isActive ? collateralLocked : (pureCollateral || 0n);
  const formattedCollateral = formatEther(totalEthCollateral as bigint);

  // Health Factor mock logic based on LTV
  const healthFactor = isActive ? 1.5 : 0; 

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-5xl font-black">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Health Factor"
          value={isActive ? <HealthStatus factor={healthFactor} /> : "N/A"}
          color="border-t-green-400"
        />
        <StatCard
          title="ETH Locked"
          value={`${formattedCollateral} ETH`}
          color="border-t-blue-500"
        />
        <StatCard
          title="Active Debt"
          value={isActive ? `${formattedPrincipal} ${symbol}` : "$0.00"}
          color="border-t-pink-500"
        />
        <StatCard title="Account Risk" value={isActive ? "SAFE" : "IDLE"} color="border-t-yellow-500" />
      </div>

      <NeoCard>
        <h2 className="text-3xl font-bold mb-4">Your Active Position</h2>
        {isActive ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="p-4 font-bold">Asset Borrowed</th>
                  <th className="p-4 font-bold">Principal Debt</th>
                  <th className="p-4 font-bold">Anchored Collateral</th>
                  <th className="p-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50 border-b border-gray-200">
                  <td className="p-4 flex items-center gap-2 font-black">{symbol}</td>
                  <td className="p-4 font-mono text-red-500 italic">{formattedPrincipal} {symbol}</td>
                  <td className="p-4 font-mono text-blue-600">{formatEther(collateralLocked as bigint)} ETH</td>
                  <td className="p-4"><span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold border border-green-300 shadow-sm">ACTIVE</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500 font-medium">You have no active loans right now.</p>
            <p className="text-xs text-gray-400 mt-2">Deposit ETH in the Borrow Vault to mint stablecoins!</p>
          </div>
        )}
      </NeoCard>
    </div>
  );
};

export default DashboardPage;