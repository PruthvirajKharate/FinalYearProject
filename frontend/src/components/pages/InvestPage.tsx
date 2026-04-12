import { useState } from "react";
import { useWriteContract, useAccount } from "wagmi";
import { ethers } from "ethers";
import { parseUnits } from "viem";
import NeoCard from "../common/NeoCard";
import NeoInput from "../common/NeoInput";
import NeoButton from "../common/NeoButton";
import StatCard from "../ui/StatCard";
import { CONTRACTS } from "../../contracts";

const InvestPage = () => {
  const { address } = useAccount();
  const [depositAmount, setDepositAmount] = useState("");
  // Removed unused withdrawAmount state
  
  const { writeContractAsync } = useWriteContract();

  // Faucet Logic 
  const handleFaucet = async () => {
    if (!address) return alert("Please connect wallet first!");
    try {
      await writeContractAsync({
        address: CONTRACTS.usdToken.address as `0x${string}`,
        abi: CONTRACTS.usdToken.abi,
        functionName: 'faucet',
        args: [address, parseUnits("10000", 0)], 
      });
      alert("Successfully minted 10,000 USD Tokens!");
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleDeposit = async () => {
    if (!address) return;
    try {
      // 1. Approve LendingPool
      await writeContractAsync({
        address: CONTRACTS.usdToken.address as `0x${string}`,
        abi: CONTRACTS.usdToken.abi,
        functionName: 'approve',
        args: [CONTRACTS.lendingPool.address, parseUnits(depositAmount, 18)],
      });
      // 2. Deposit into LendingPool
      await writeContractAsync({
        address: CONTRACTS.lendingPool.address as `0x${string}`,
        abi: CONTRACTS.lendingPool.abi,
        functionName: 'deposit',
        args: [ethers.encodeBytes32String("USD") as `0x${string}`, parseUnits(depositAmount, 18)],
      });
    } catch(e: any) {
      alert("Deposit Error: " + e.message);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
         <h1 className="text-5xl font-black">Invest (Lending Pool)</h1>
         <NeoButton variant="secondary" onClick={handleFaucet}>
            💦 Request Mock $10k USD
         </NeoButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <NeoCard>
          <h2 className="text-3xl font-bold mb-4">USD Pool Stats</h2>
          <div className="flex flex-col gap-4">
            <StatCard
              title="Current APY"
              value="5.00%"
              color="border-t-green-400"
            />
            <StatCard
               title="Risk Tier"
               value="LOW RISK"
               color="border-t-blue-400"
            />
          </div>
        </NeoCard>

        <NeoCard>
          <h2 className="text-3xl font-bold mb-4">Manage Your Position</h2>

          <div className="flex flex-col gap-4">
            <NeoInput
              label="Amount to Deposit (USD)"
              id="deposit-amount"
              placeholder="1000.00"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
            <NeoButton variant="primary" fullWidth onClick={handleDeposit}>
              Deposit USD
            </NeoButton>
          </div>
        </NeoCard>
      </div>
    </div>
  );
};

export default InvestPage;
