import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import NeoCard from "../common/NeoCard";
import NeoButton from "../common/NeoButton";

// Transaction type labels and colors
const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  deposit: { label: "Lend Deposit", color: "text-green-700", bg: "bg-green-100 border-green-300", icon: "📥" },
  withdraw: { label: "Withdrawal", color: "text-blue-700", bg: "bg-blue-100 border-blue-300", icon: "📤" },
  collateral_deposit: { label: "Collateral Lock", color: "text-purple-700", bg: "bg-purple-100 border-purple-300", icon: "🔒" },
  borrow: { label: "Borrow", color: "text-orange-700", bg: "bg-orange-100 border-orange-300", icon: "💳" },
  repay: { label: "Loan Repaid", color: "text-emerald-700", bg: "bg-emerald-100 border-emerald-300", icon: "✅" },
  liquidate: { label: "Liquidation", color: "text-red-700", bg: "bg-red-100 border-red-300", icon: "🔥" },
  proposal_created: { label: "DAO Proposal", color: "text-indigo-700", bg: "bg-indigo-100 border-indigo-300", icon: "📜" },
  dao_liquidation_executed: { label: "DAO Liquidation", color: "text-rose-700", bg: "bg-rose-100 border-rose-300", icon: "⚖️" },
};

interface Transaction {
  txHash: string;
  type: string;
  symbol: string;
  tokenAmount: string;
  usdValue: string;
  blockNumber: string;
  createdAt: string;
  user?: { publicAddress: string };
}

type FilterType = "all" | string;

const HistoryPage: React.FC = () => {
  const { address } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:3000/transaction/history/${address}`);
        if (!response.ok) throw new Error(`Server responded with ${response.status}`);
        const data: Transaction[] = await response.json();
        setTransactions(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch history");
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (!address) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:3000/transaction/history/${address}`);
        if (!response.ok) throw new Error(`Server responded with ${response.status}`);
        const data: Transaction[] = await response.json();
        setTransactions(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [address]);

  // Get unique transaction types for filter buttons
  const availableTypes = [...new Set(transactions.map((tx) => tx.type))];

  // Apply filter
  const filteredTransactions = filter === "all" ? transactions : transactions.filter((tx) => tx.type === filter);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const shortenHash = (hash: string) => {
    if (!hash) return "N/A";
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  if (!address) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-5xl font-black">Transaction History</h1>
        <NeoCard>
          <div className="p-12 text-center">
            <p className="text-xl text-gray-500 font-medium">Connect your wallet to view transaction history.</p>
          </div>
        </NeoCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-5xl font-black">Transaction History</h1>
      <NeoButton onClick={() => fetchHistory()}>Refresh</NeoButton>
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Transactions</p>
          <p className="text-3xl font-black text-blue-800 mt-1">{transactions.length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 text-center">
          <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Collateral Locks</p>
          <p className="text-3xl font-black text-purple-800 mt-1">
            {transactions.filter((tx) => tx.type === "collateral_deposit").length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4 text-center">
          <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Borrows</p>
          <p className="text-3xl font-black text-orange-800 mt-1">
            {transactions.filter((tx) => tx.type === "borrow").length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Repayments</p>
          <p className="text-3xl font-black text-emerald-800 mt-1">
            {transactions.filter((tx) => tx.type === "repay").length}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-all cursor-pointer ${
            filter === "all"
              ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
              : "bg-white text-black border-gray-300 hover:border-black"
          }`}
        >
          All ({transactions.length})
        </button>
        {availableTypes.map((type) => {
          const config = TYPE_CONFIG[type] || { label: type, icon: "📋", bg: "bg-gray-100 border-gray-300" };
          const count = transactions.filter((tx) => tx.type === type).length;
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-all cursor-pointer ${
                filter === type
                  ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                  : "bg-white text-black border-gray-300 hover:border-black"
              }`}
            >
              {config.icon} {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Transaction List */}
      <NeoCard padding="p-0">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium">Loading transaction history...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-red-500 font-bold text-lg">⚠️ Error Loading History</p>
            <p className="text-gray-400 text-sm mt-2">{error}</p>
            <p className="text-gray-400 text-xs mt-1">Make sure your NestJS backend is running on port 3000.</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 m-4">
            <p className="text-xl text-gray-500 font-medium">No transactions found.</p>
            <p className="text-sm text-gray-400 mt-2">
              {filter !== "all"
                ? "Try removing your filter to see all transactions."
                : "Start by depositing collateral or borrowing assets on the Borrow page."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b-2 border-black bg-gray-50">
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Type</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Asset</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Amount</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">USD Value</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Block #</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Tx Hash</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredTransactions.map((tx, index) => {
                    const config = TYPE_CONFIG[tx.type] || {
                      label: tx.type,
                      color: "text-gray-700",
                      bg: "bg-gray-100 border-gray-300",
                      icon: "📋",
                    };
                    return (
                      <motion.tr
                        key={tx.txHash}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${config.bg} ${config.color}`}>
                            <span>{config.icon}</span>
                            {config.label}
                          </span>
                        </td>
                        <td className="p-4 font-black text-lg">{tx.symbol}</td>
                        <td className="p-4 font-mono font-bold">
                          {Number(tx.tokenAmount).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </td>
                        <td className="p-4 font-mono text-gray-600">
                          ${Number(tx.usdValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 font-mono text-sm text-gray-500">{tx.blockNumber}</td>
                        <td className="p-4">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200" title={tx.txHash}>
                            {shortenHash(tx.txHash)}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-600 whitespace-nowrap">{formatDate(tx.createdAt)}</td>
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

export default HistoryPage;
