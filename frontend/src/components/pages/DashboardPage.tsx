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

  // 2. Read Any Isolated Collateral (floating ETH not yet locked in a loan)
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
  
  // Total ETH = collateral locked inside the loan + any floating collateral deposited after
  const loanCollateral = isActive ? (collateralLocked as bigint) : 0n;
  const floatingCollateral = (pureCollateral as bigint) || 0n;
  const totalEthCollateral = loanCollateral + floatingCollateral;
  const formattedCollateral = formatEther(totalEthCollateral);

  // Health Factor: calculate based on collateral USD value vs principal
  let healthFactor = 0;
  if (isActive && principalRaw > 0n) {
    const collateralUsd = Number(formatEther(loanCollateral)) * 2000; // mock ETH price
    const debtUsd = Number(formatUnits(principalRaw, 18));
    healthFactor = debtUsd > 0 ? collateralUsd / debtUsd : 0;
  }

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
          title="ETH Locked (Total)"
          value={`${Number(formattedCollateral).toFixed(4)} ETH`}
          color="border-t-blue-500"
        />
        <StatCard
          title="Active Debt"
          value={isActive ? `${Number(formattedPrincipal).toLocaleString()} ${symbol}` : "$0.00"}
          color="border-t-pink-500"
        />
        <StatCard title="Account Risk" value={isActive ? (healthFactor < 1.5 ? "AT RISK" : "SAFE") : "IDLE"} color={isActive && healthFactor < 1.5 ? "border-t-red-500" : "border-t-yellow-500"} />
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
                  <th className="p-4 font-bold">Additional Collateral</th>
                  <th className="p-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50 border-b border-gray-200">
                  <td className="p-4 flex items-center gap-2 font-black">{symbol}</td>
                  <td className="p-4 font-mono text-red-500 italic">{Number(formattedPrincipal).toLocaleString()} {symbol}</td>
                  <td className="p-4 font-mono text-blue-600">{Number(formatEther(loanCollateral)).toFixed(4)} ETH</td>
                  <td className="p-4 font-mono text-emerald-600">{Number(formatEther(floatingCollateral)).toFixed(4)} ETH</td>
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