import React from "react"; // Import React for types
import { Wallet, CheckCircle } from "lucide-react";
import NeoButton from "../common/NeoButton";
import type { ConnectionData } from "../../App"; // 1. Import the single source of truth

// --- Type Definitions ---

// 2. Define all props for the Header component
interface HeaderProps {
  onOpenWallet: () => void;
  isConnected: boolean;
  walletData: ConnectionData | null; // 3. This now matches App.tsx
}

// --- Component ---

const Header: React.FC<HeaderProps> = ({
  onOpenWallet,
  isConnected,
  walletData,
}) => {
  // 4. This function is now type-safe
  const formatAddress = (address: string): string => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="w-full flex justify-end items-center py-4 mb-8 z-10 relative">
      {/* 5. This check is now robust. If walletData exists, walletData.address is a string. */}
      {isConnected && walletData ? (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-green-700 font-medium">
              Connected: {formatAddress(walletData.address)}
            </span>
          </div>
          <NeoButton variant="secondary" onClick={onOpenWallet}>
            Change Wallet
          </NeoButton>
        </div>
      ) : (
        <NeoButton variant="connect" icon={Wallet} onClick={onOpenWallet}>
          Connect Wallet
        </NeoButton>
      )}
    </header>
  );
};

export default Header;
