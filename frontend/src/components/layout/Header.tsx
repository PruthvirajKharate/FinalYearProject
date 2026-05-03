import React from "react"; 
import { ConnectButton } from '@rainbow-me/rainbowkit';

// --- Type Definitions ---

// 2. Define all props for the Header component
interface HeaderProps {
}

// --- Component ---

const Header: React.FC<HeaderProps> = () => {

  return (
    <header className="w-full flex justify-end items-center py-4 mb-8 z-10 sticky top-0 right-10">
      {/* Premium Web3 Native Connection */}
      <ConnectButton />
    </header>
  );
};

export default Header;
