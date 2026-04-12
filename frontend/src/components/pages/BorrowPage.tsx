import { useState } from "react";
import { useWriteContract, useAccount } from "wagmi";
import { ethers } from "ethers";
import { parseEther, parseUnits } from "viem";
import NeoCard from "../common/NeoCard";
import NeoInput from "../common/NeoInput";
import NeoButton from "../common/NeoButton";
import { CONTRACTS } from "../../contracts";

const BorrowPage = () => {
  const { address } = useAccount();
  
  // Collateral State
  const [collateralAmount, setCollateralAmount] = useState("");
  
  // Borrow State
  const [borrowAsset, setBorrowAsset] = useState("USD");
  const [borrowAmount, setBorrowAmount] = useState("");

  const { writeContractAsync } = useWriteContract();

  const handleDepositCollateral = async () => {
    if (!address) return alert("Connect Wallet!");
    if (!collateralAmount) return alert("Enter ETH Amount!");
    
    try {
      await writeContractAsync({
        address: CONTRACTS.lendingPool.address as `0x${string}`,
        abi: CONTRACTS.lendingPool.abi,
        functionName: 'depositCollateral',
        value: parseEther(collateralAmount),
        account: address
      });
      alert(`Successfully deposited ${collateralAmount} ETH as Collateral!`);
      setCollateralAmount("");
    } catch(e: any) {
      alert("Error Depositing ETH: " + e.message);
    }
  }

  const handleBorrow = async () => {
    if (!address) return alert("Connect Wallet!");
    if (!borrowAmount) return alert("Enter Borrow Amount!");
    try {
      await writeContractAsync({
        address: CONTRACTS.lendingPool.address as `0x${string}`,
        abi: CONTRACTS.lendingPool.abi,
        functionName: 'borrow',
        args: [ethers.encodeBytes32String(borrowAsset) as `0x${string}`, parseUnits(borrowAmount, 18)],
        account: address
      });
      alert(`Successfully Borrowed ${borrowAmount} ${borrowAsset}!`);
      setBorrowAmount("");
    } catch(e: any) {
      alert("Borrow Error: " + e.message);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-5xl font-black">Borrow Vault</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* COLLATERAL SECTION */}
        <NeoCard>
          <h2 className="text-3xl font-bold mb-4">1. Lock Collateral</h2>
          <p className="text-gray-400 mb-6">You must securely lock native ETH into the Lending Pool smart contract before taking a simulated asset loan.</p>
          
          <div className="flex flex-col gap-4">
            <NeoInput
              id="eth-collateral"
              label="ETH Collateral Amount"
              placeholder="e.g. 0.5"
              value={collateralAmount}
              onChange={(e) => setCollateralAmount(e.target.value)}
            />
            <NeoButton variant="primary" onClick={handleDepositCollateral}>
              Deposit ETH
            </NeoButton>
          </div>
        </NeoCard>

        {/* BORROW SECTION */}
        <NeoCard>
          <h2 className="text-3xl font-bold mb-4">2. Mint Simulated Assets</h2>
          <p className="text-gray-400 mb-6">Choose an asset class to borrow against your ETH equity.</p>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">Select Asset</label>
              <select 
                 className="p-3 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black font-bold outline-none cursor-pointer"
                 value={borrowAsset}
                 onChange={(e) => setBorrowAsset(e.target.value)}
              >
                <option value="USD">USD ($1 Stable)</option>
                <option value="YEN">Japanese Yen (¥140 / $1)</option>
                <option value="RS">Indian Rupee (₹80 / $1) [HIGH RISK]</option>
              </select>
            </div>
            
            <NeoInput
              id="borrow-amount"
              label={`Amount to Borrow (${borrowAsset})`}
              placeholder="e.g. 1000"
              value={borrowAmount}
              onChange={(e) => setBorrowAmount(e.target.value)}
            />
            
            <NeoButton variant="secondary" onClick={handleBorrow}>
              Borrow {borrowAsset}
            </NeoButton>
          </div>
        </NeoCard>
      </div>
    </div>
  );
};

export default BorrowPage;
