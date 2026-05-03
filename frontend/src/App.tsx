import React, { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import WalletPopup from "./components/ui/WalletPopup";
import LoginPage from "./components/pages/LoginPage";
import DashboardPage from "./components/pages/DashboardPage";
import InvestPage from "./components/pages/InvestPage";
import BorrowPage from "./components/pages/BorrowPage";
import LiquidatePage from "./components/pages/LiquidatePage";
import HistoryPage from "./components/pages/HistoryPage";
import AnimatedPage from "./components/common/AnimatedPage";

// 1. UPDATED interface to match WalletPopup.tsx
export interface ConnectionData {
  address: string;
  walletType: string;
  chainId?: number; // <-- Now optional
}

type NavPageName = "dashboard" | "invest" | "borrow" | "liquidate" | "history";
type PageName = "login" | NavPageName;

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageName>("dashboard");
  const [showWalletPopup, setShowWalletPopup] = useState(false);
  const [walletData, setWalletData] = useState<ConnectionData | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const handleLogin = () => setCurrentPage("dashboard");
  const handleLogout = () => {
    setCurrentPage("login");
    setWalletData(null);
    setIsConnected(false);
    localStorage.removeItem("walletConnection");
  };

  const openWallet = () => setShowWalletPopup(true);
  const closeWallet = () => {
    setShowWalletPopup(false);
  };

  // This function now correctly accepts ConnectionData with an optional chainId
  const handleWalletConnect = (connectionData: ConnectionData) => {
    const cleanConnectionData: ConnectionData = {
      address: connectionData.address,
      chainId: connectionData.chainId, // This will be undefined if not provided, which is fine
      walletType: connectionData.walletType,
    };

    setWalletData(cleanConnectionData);
    setIsConnected(true);

    const formattedAddress = `${connectionData.address.slice(
      0,
      6,
    )}...${connectionData.address.slice(-4)}`;
    console.log(`Connected to: ${formattedAddress}`);

    localStorage.setItem(
      "walletConnection",
      JSON.stringify(cleanConnectionData),
    );
  };

  const handleSetCurrentPage = (page: NavPageName) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    const savedConnection = localStorage.getItem("walletConnection");
    if (savedConnection) {
      try {
        const connectionData: ConnectionData = JSON.parse(savedConnection);
        setWalletData(connectionData);
        setIsConnected(true);
      } catch (error) {
        console.error("Error loading saved wallet connection:", error);
        localStorage.removeItem("walletConnection");
      }
    }
  }, []);

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap'); body { font-family: 'Poppins', sans-serif; }`}</style>

      <div className="relative font-space min-h-screen w-full bg-white text-black">
        {/* Dynamic Dark Mode Abstract Gradient */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 70%, rgba(16, 185, 129, 0.15), transparent 60%), radial-gradient(circle at 70% 30%, rgba(52, 211, 153, 0.1), transparent 60%)`,
            backgroundColor: "transparent",
          }}
        />

        <div
          className={`relative z-10 ${showWalletPopup ? "filter blur-sm" : ""}`}
        >
          <AnimatePresence mode="wait">
            {currentPage === "login" ? (
              <AnimatedPage key="login">
                <LoginPage onLogin={handleLogin} />
              </AnimatedPage>
            ) : (
              <AnimatedPage key="layout">
                <div className="flex w-full min-h-screen">
                  <Sidebar
                    setCurrentPage={handleSetCurrentPage}
                    onLogout={handleLogout}
                  />
                  <main className="flex-1 p-8 min-w-0 relative">
                    <Header />
                    <AnimatePresence mode="wait">
                      <AnimatedPage key={currentPage}>
                        {currentPage === "dashboard" && <DashboardPage />}
                        {currentPage === "invest" && <InvestPage />}
                        {currentPage === "borrow" && <BorrowPage />}
                        {currentPage === "liquidate" && <LiquidatePage />}
                        {currentPage === "history" && <HistoryPage />}
                      </AnimatedPage>
                    </AnimatePresence>
                  </main>
                </div>
              </AnimatedPage>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showWalletPopup && (
            <WalletPopup
              onClose={closeWallet}
              onConnect={handleWalletConnect}
            />
          )}
        </AnimatePresence>

        <Toaster position="bottom-right" reverseOrder={false} />
      </div>
    </>
  );
}
