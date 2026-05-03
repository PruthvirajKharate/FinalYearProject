import { useState } from "react";
import { useWriteContract, useAccount, useReadContract } from "wagmi";
import { ethers } from "ethers";
import { parseEther, parseUnits, formatEther, formatUnits, maxUint256 } from "viem";
import toast from "react-hot-toast";
import NeoCard from "../common/NeoCard";
import NeoInput from "../common/NeoInput";
import NeoButton from "../common/NeoButton";
import { CONTRACTS } from "../../contracts";

// Maps borrow asset key -> token contract info
const TOKEN_MAP: Record<string, { address: `0x${string}`; abi: any }> = {
  USD: { address: CONTRACTS.usdToken.address as `0x${string}`, abi: CONTRACTS.usdToken.abi },
  YEN: { address: CONTRACTS.yenToken.address as `0x${string}`, abi: CONTRACTS.yenToken.abi },
  RS: { address: CONTRACTS.rsToken.address as `0x${string}`, abi: CONTRACTS.rsToken.abi },
};

const BorrowPage = () => {
  const { address } = useAccount();
  
  // Collateral State
  const [collateralAmount, setCollateralAmount] = useState("");
  
  // Borrow State
  const [borrowAsset, setBorrowAsset] = useState("USD");
  const [borrowAmount, setBorrowAmount] = useState("");

  // Faucet State
  const [faucetAsset, setFaucetAsset] = useState("USD");
  const [isMinting, setIsMinting] = useState(false);

  // Repay loading state
  const [isRepaying, setIsRepaying] = useState(false);

  const { writeContractAsync } = useWriteContract();

  // ── Read on-chain data ──

  const { data: collateralETH, refetch: refetchCollateral } = useReadContract({
    address: CONTRACTS.lendingPool.address as `0x${string}`,
    abi: CONTRACTS.lendingPool.abi,
    functionName: "collateralETH",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: rawLoan, refetch: refetchLoan } = useReadContract({
    address: CONTRACTS.lendingPool.address as `0x${string}`,
    abi: CONTRACTS.lendingPool.abi,
    functionName: "loans",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // ── Liquidity pool reads ──
  const { data: usdReserve } = useReadContract({
    address: CONTRACTS.lendingPool.address as `0x${string}`,
    abi: CONTRACTS.lendingPool.abi,
    functionName: "reserves",
    args: [ethers.encodeBytes32String("USD") as `0x${string}`],
  });

  const { data: yenReserve } = useReadContract({
    address: CONTRACTS.lendingPool.address as `0x${string}`,
    abi: CONTRACTS.lendingPool.abi,
    functionName: "reserves",
    args: [ethers.encodeBytes32String("YEN") as `0x${string}`],
  });

  const { data: rsReserve } = useReadContract({
    address: CONTRACTS.lendingPool.address as `0x${string}`,
    abi: CONTRACTS.lendingPool.abi,
    functionName: "reserves",
    args: [ethers.encodeBytes32String("RS") as `0x${string}`],
  });

  // ── User Token Balances reads ──
  const { data: usdBalance, refetch: refetchUsdBalance } = useReadContract({
    address: CONTRACTS.usdToken.address as `0x${string}`,
    abi: CONTRACTS.usdToken.abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: yenBalance, refetch: refetchYenBalance } = useReadContract({
    address: CONTRACTS.yenToken.address as `0x${string}`,
    abi: CONTRACTS.yenToken.abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: rsBalance, refetch: refetchRsBalance } = useReadContract({
    address: CONTRACTS.rsToken.address as `0x${string}`,
    abi: CONTRACTS.rsToken.abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const parseBalance = (balance: any) => {
    if (balance === undefined || balance === null) return "0.00";
    return Number(formatUnits(balance as bigint, 18)).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  };

  // ── Parse loan data ──
  const isLoanActive = rawLoan ? (rawLoan as any[])[4] : false;
  const loanSymbolBytes = rawLoan ? (rawLoan as any[])[1] : "";
  const loanPrincipal = rawLoan ? ((rawLoan as any[])[2] as bigint) : 0n;
  const loanCollateral = rawLoan ? ((rawLoan as any[])[3] as bigint) : 0n;
  const loanTimestamp = rawLoan ? ((rawLoan as any[])[5] as bigint) : 0n;
  const loanSymbol = isLoanActive ? ethers.decodeBytes32String(loanSymbolBytes) : "";

  // Parse liquidity from reserve structs: [enabled, token, priceFeed, interestRateBps, totalLiquidity, isHighRisk]
  const parseLiquidity = (reserve: any) => {
    if (!reserve) return "0";
    return Number(formatUnits((reserve as any[])[4] as bigint, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  // ── Calculate max borrowable ──
  let maxBorrowAmount = 0;
  if (collateralETH && !isLoanActive) {
    const ethAmount = Number(ethers.formatEther(collateralETH as bigint));
    const ethUsdValue = ethAmount * 2000; // Mock price of ETH
    const ratio = borrowAsset === "RS" ? 2.0 : 1.5;
    maxBorrowAmount = ethUsdValue / ratio;
  }

  // ── Handlers ──

  const handleDepositCollateral = async () => {
    if (!address) return toast.error("Connect Wallet!");
    if (!collateralAmount) return toast.error("Enter ETH Amount!");
    
    try {
      await writeContractAsync({
        address: CONTRACTS.lendingPool.address as `0x${string}`,
        abi: CONTRACTS.lendingPool.abi,
        functionName: 'depositCollateral',
        value: parseEther(collateralAmount),
        account: address
      });
      toast.success(`Successfully deposited ${collateralAmount} ETH as Collateral!`);
      setCollateralAmount("");
      refetchCollateral();
    } catch(e: any) {
      toast.error("Error Depositing ETH: " + e.shortMessage || e.message);
    }
  };

  const handleBorrow = async () => {
    if (!address) return toast.error("Connect Wallet!");
    if (!borrowAmount) return toast.error("Enter Borrow Amount!");
    if (isLoanActive) return toast.error("You already have an active loan! Repay it first.", {style:{background:"#333", color:"#fff"}});
    
    if (Number(borrowAmount) > maxBorrowAmount) {
      return toast.error("Borrow amount exceeds maximum limit!");
    }

    try {
      await writeContractAsync({
        address: CONTRACTS.lendingPool.address as `0x${string}`,
        abi: CONTRACTS.lendingPool.abi,
        functionName: 'borrow',
        args: [
          ethers.encodeBytes32String(borrowAsset) as `0x${string}`, 
          parseUnits(borrowAmount, 18),
          BigInt(500),
          BigInt(0)
        ],
        account: address
      });
      toast.success(`Successfully Borrowed ${borrowAmount} ${borrowAsset}!`);
      setBorrowAmount("");
      refetchLoan();
      refetchCollateral();
      if (borrowAsset === "USD") refetchUsdBalance();
      if (borrowAsset === "YEN") refetchYenBalance();
      if (borrowAsset === "RS") refetchRsBalance();
    } catch(e: any) {
      toast.error("Borrow Error: " + (e.shortMessage || e.message));
    }
  };

  const handleRepay = async () => {
    if (!address) return toast.error("Connect Wallet!");
    if (!isLoanActive) return toast.error("No active loan to repay!");

    setIsRepaying(true);

    try {
      const token = TOKEN_MAP[loanSymbol];
      if (!token) {
        toast.error("Unknown loan asset: " + loanSymbol);
        setIsRepaying(false);
        return;
      }

      // Step 1: Approve the LendingPool to pull tokens from user
      toast.loading("Step 1/2: Approving token transfer...", { id: "repay" });
      await writeContractAsync({
        address: token.address,
        abi: token.abi,
        functionName: "approve",
        args: [CONTRACTS.lendingPool.address as `0x${string}`, maxUint256],
        account: address,
      });

      // Step 2: Call repay on the LendingPool
      toast.loading("Step 2/2: Repaying loan...", { id: "repay" });
      await writeContractAsync({
        address: CONTRACTS.lendingPool.address as `0x${string}`,
        abi: CONTRACTS.lendingPool.abi,
        functionName: "repay",
        account: address,
      });

      toast.success("Loan repaid! ETH collateral returned to your wallet.", { id: "repay" });
      refetchLoan();
      refetchCollateral();
      if (loanSymbol === "USD") refetchUsdBalance();
      if (loanSymbol === "YEN") refetchYenBalance();
      if (loanSymbol === "RS") refetchRsBalance();
    } catch (e: any) {
      toast.error("Repay Error: " + (e.shortMessage || e.message), { id: "repay" });
    } finally {
      setIsRepaying(false);
    }
  };

  const handleFaucetMint = async () => {
    if (!address) return toast.error("Connect Wallet!");
    setIsMinting(true);
    try {
      const token = TOKEN_MAP[faucetAsset];
      if (!token) throw new Error("Invalid asset selected");
      
      await writeContractAsync({
        address: token.address,
        abi: token.abi,
        functionName: "faucet",
        args: [address, BigInt(1000)], // Mint 1000 tokens
        account: address,
      });

      toast.success(`Successfully minted 1000 ${faucetAsset}!`);
      if (faucetAsset === "USD") refetchUsdBalance();
      if (faucetAsset === "YEN") refetchYenBalance();
      if (faucetAsset === "RS") refetchRsBalance();
    } catch (e: any) {
      toast.error("Minting Error: " + (e.shortMessage || e.message));
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-5xl font-black">Borrow Vault</h1>
      {/* ── LIQUIDITY POOL BALANCE BAR ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-green-600 uppercase tracking-wider">USD Pool</p>
            <p className="text-xl font-black text-green-800">{parseLiquidity(usdReserve)}</p>
          </div>
          <span className="text-2xl">💵</span>
        </div>
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider">YEN Pool</p>
            <p className="text-xl font-black text-red-800">{parseLiquidity(yenReserve)}</p>
          </div>
          <span className="text-2xl">💴</span>
        </div>
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">RS Pool</p>
            <p className="text-xl font-black text-orange-800">{parseLiquidity(rsReserve)}</p>
          </div>
          <span className="text-2xl">💰</span>
        </div>
      </div>

      {/* ── WALLET BALANCES & FAUCET ── */}
      <NeoCard className="border border-purple-200" padding="p-6">
        <h2 className="text-2xl font-bold mb-4">Your Wallet Balances & Faucet</h2>
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="flex gap-4 w-full md:w-auto">
            <div className="bg-gray-100 rounded-lg p-3 px-5 text-center flex-1">
              <p className="text-xs font-bold text-gray-500 uppercase">USD Balance</p>
              <p className="text-xl font-black text-green-700">{parseBalance(usdBalance)}</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-3 px-5 text-center flex-1">
              <p className="text-xs font-bold text-gray-500 uppercase">YEN Balance</p>
              <p className="text-xl font-black text-red-700">{parseBalance(yenBalance)}</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-3 px-5 text-center flex-1">
              <p className="text-xs font-bold text-gray-500 uppercase">RS Balance</p>
              <p className="text-xl font-black text-orange-700">{parseBalance(rsBalance)}</p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <select 
              className="p-3 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black font-bold outline-none cursor-pointer flex-1 md:w-32"
              value={faucetAsset}
              onChange={(e) => setFaucetAsset(e.target.value)}
            >
              <option value="USD">USD</option>
              <option value="YEN">YEN</option>
              <option value="RS">RS</option>
            </select>
            <NeoButton variant="primary" onClick={handleFaucetMint} className="whitespace-nowrap flex-1">
              {isMinting ? "Minting..." : "Mint 1000 Tokens"}
            </NeoButton>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          * Use the Faucet to get free test tokens if you need them to repay the interest on your loans.
        </p>
      </NeoCard>
      
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
            <p>
            {collateralETH && (
              <p className="text-sm text-gray-500 text-center">
                Available Collateral: <span className="font-bold text-blue-600">{Number(formatEther(collateralETH as bigint)).toFixed(4)} ETH</span>
              </p>
            )}</p>
          </div>
        </NeoCard>

        {/* BORROW SECTION */}
        <NeoCard>
          <h2 className="text-3xl font-bold mb-4">2. Mint Simulated Assets</h2>
          {isLoanActive ? (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-yellow-800 text-sm font-medium">
              ⚠️ You have an active <span className="font-black">{loanSymbol}</span> loan. Repay it below before borrowing again.
            </div>
          ) : (
            <p className="text-gray-400 mb-6">Choose an asset class to borrow against your ETH equity.</p>
          )}

          <div className="flex flex-col gap-4 mt-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">Select Asset</label>
              <select 
                 className="p-3 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black font-bold outline-none cursor-pointer"
                 value={borrowAsset}
                 onChange={(e) => setBorrowAsset(e.target.value)}
                 disabled={isLoanActive}
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
            {!isLoanActive && (
              <div className="text-sm text-gray-500 text-right -mt-2">
                Max Borrowable: <span className="font-bold text-blue-600">{maxBorrowAmount.toFixed(2)} {borrowAsset}</span>
              </div>
            )}
            
            <NeoButton variant={isLoanActive ? "danger" : "secondary"} onClick={handleBorrow}>
              {isLoanActive ? "Loan Active — Repay First" : `Borrow ${borrowAsset}`}
            </NeoButton>
          </div>
        </NeoCard>
      </div>

      {/* ── REPAY SECTION ── */}
      {isLoanActive && (
        <NeoCard>
          <h2 className="text-3xl font-bold mb-4">3. Repay Active Loan</h2>
          <p className="text-gray-400 mb-6">
            Repay your outstanding debt to unlock your locked ETH collateral. Interest is calculated automatically based on time elapsed.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Asset Borrowed</p>
              <p className="text-2xl font-black mt-1">{loanSymbol}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Principal Owed</p>
              <p className="text-2xl font-black text-red-600 mt-1">{Number(formatUnits(loanPrincipal, 18)).toLocaleString()} {loanSymbol}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">ETH to Recover</p>
              <p className="text-2xl font-black text-blue-600 mt-1">{Number(formatEther(loanCollateral)).toFixed(4)} ETH</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
            <p className="font-bold mb-1">How Repayment Works:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>We first approve the LendingPool contract to pull your {loanSymbol} tokens.</li>
              <li>The contract calculates any accrued interest automatically.</li>
              <li>Your ETH collateral ({Number(formatEther(loanCollateral)).toFixed(4)} ETH) is returned to your wallet.</li>
            </ol>
          </div>

          <NeoButton 
            variant="primary" 
            fullWidth 
            onClick={handleRepay}
          >
            {isRepaying ? "Processing..." : `Repay ${Number(formatUnits(loanPrincipal, 18)).toLocaleString()} ${loanSymbol} & Unlock ETH`}
          </NeoButton>
        </NeoCard>
      )}
    </div>
  );
};

export default BorrowPage;
