import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  PiggyBank,
  ArrowDownUp,
  Flame,
  LogOut,
  Wallet,
  CheckCircle,
  AlertTriangle,
  X,
} from "lucide-react";

const AnimatedPage = ({ children }) => {
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };
  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.5,
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="w-full"
    >
      {children}
    </motion.div>
  );
};

const NeoButton = ({
  children,
  onClick,
  className = "",
  icon: Icon,
  fullWidth = false,
  variant = "primary",
  type = "button",
}) => {
  const colorClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-800",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    connect: "bg-blue-600 hover:bg-blue-700 text-white",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      onClick={onClick}
      type={type}
      className={`font-bold py-3 px-5 border border-transparent rounded-lg shadow-md hover:shadow-lg active:shadow-sm transition-all duration-200 flex items-center justify-center gap-2 ${
        colorClasses[variant]
      } ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {Icon && <Icon className="w-5 h-5" />}
      {children}
    </motion.button>
  );
};

const NeoInput = ({ label, placeholder, type = "text", id }) => (
  <div className="w-full">
    <label htmlFor={id} className="block text-sm font-bold mb-2">
      {label}
    </label>
    <input
      type={type}
      id={id}
      placeholder={placeholder}
      className="w-full rounded-lg py-3 px-4 bg-white border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
    />
  </div>
);

const NeoCard = ({ children, className = "", padding = "p-6" }) => (
  <div
    className={`bg-white rounded-xl border border-gray-200 shadow-xl w-full ${padding} ${className}`}
  >
    {children}
  </div>
);

const StatCard = ({ title, value, color }) => (
  <NeoCard className={`border-t-8 ${color}`} padding="p-4">
    <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
    <p className="text-3xl font-bold">{value}</p>
  </NeoCard>
);

const Sidebar = ({ setCurrentPage, onLogout }) => {
  const [isOpen, setIsOpen] = useState(true);
  const handleClose = () => setIsOpen(!isOpen);

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, page: "dashboard" },
    { name: "Invest", icon: PiggyBank, page: "invest" },
    { name: "Borrow", icon: ArrowDownUp, page: "borrow" },
    { name: "Liquidate", icon: Flame, page: "liquidate" },
  ];

  return (
    <motion.nav
      className="bg-white border-r border-gray-200 h-screen flex flex-col p-4 shadow-lg z-10"
      initial={{ width: "250px" }}
      animate={{ width: isOpen ? "250px" : "80px" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="flex items-center justify-between mb-8 px-2">
        <motion.h1
          initial={{ opacity: 1 }}
          animate={{ opacity: isOpen ? 1 : 0 }}
          className="text-3xl font-black"
        >
          DeFi<span className="text-blue-600">Lend</span>
        </motion.h1>
        <div className="cursor-pointer p-1" onClick={handleClose}>
          <X className="w-6 h-6 text-gray-600 hover:text-black" />
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-3">
        {navItems.map((item) => (
          <NeoButton
            key={item.page}
            onClick={() => setCurrentPage(item.page)}
            className={`w-full ${isOpen ? "justify-start" : "justify-center"}`}
            variant="secondary"
          >
            <item.icon className="w-6 h-6" />
            <motion.span
              initial={{ opacity: 1 }}
              animate={{
                opacity: isOpen ? 1 : 0,
                display: isOpen ? "block" : "none",
              }}
              className="ml-2"
            >
              {item.name}
            </motion.span>
          </NeoButton>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-4">
        <div
          className={`flex items-center gap-3 mb-4 ${
            isOpen ? "px-2" : "justify-center"
          }`}
        >
          <div className=" flex items-center gap-2" />
          <div className="w-10 h-10 rounded-3xl border-2 flex items-center justify-center font-bold text-lg bg-gray-100 border-gray-300">
            HJ
          </div>

          {isOpen && (
            <div>
              <p className="font-bold">Hemraj Jadhav</p>
              <p className="text-xs text-gray-500">Investor</p>
            </div>
          )}
        </div>

        <NeoButton
          onClick={onLogout}
          className={`w-full ${isOpen ? "justify-start" : "justify-center"}`}
          variant="secondary"
        >
          <LogOut className="w-6 h-6" />
          <motion.span
            initial={{ opacity: 1 }}
            animate={{
              opacity: isOpen ? 1 : 0,
              display: isOpen ? "block" : "none",
            }}
            className="ml-2"
          >
            Logout
          </motion.span>
        </NeoButton>
      </div>
    </motion.nav>
  );
};

const WalletPopup = ({ onClose }) => {
  const wallets = [
    { name: "MetaMask", icon: "🦊" },
    { name: "Coinbase Wallet", icon: "💙" },
    { name: "WalletConnect", icon: "🔗" },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-white rounded-xl p-6 shadow-2xl w-80 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-black"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold mb-4 text-center">Connect Wallet</h2>
        <div className="flex flex-col gap-3">
          {wallets.map((wallet) => (
            <NeoButton
              key={wallet.name}
              variant="secondary"
              fullWidth
              onClick={() => onClose()}
            >
              <span className="text-xl mr-2">{wallet.icon}</span>
              {wallet.name}
            </NeoButton>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

const Header = ({ onOpenWallet }) => {
  return (
    <header className="w-full flex justify-end items-center py-4 mb-8 z-10 relative">
      <NeoButton variant="connect" icon={Wallet} onClick={onOpenWallet}>
        Connect Wallet
      </NeoButton>
    </header>
  );
};

const LoginPage = ({ onLogin }) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
      >
        <NeoCard className="max-w-md w-full" padding="p-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onLogin();
            }}
            className="flex flex-col gap-6"
          >
            <h1 className="text-4xl font-black text-center mb-2">
              Welcome to DeFi<span className="text-blue-600">Lend</span>
            </h1>
            <p className="text-center text-gray-600 -mt-4 mb-4">
              Login to your investor account.
            </p>
            <NeoInput
              label="Email"
              id="email"
              type="email"
              placeholder="you@example.com"
            />
            <NeoInput
              label="Password"
              id="password"
              type="password"
              placeholder="••••••••"
            />
            <NeoButton
              type="submit"
              fullWidth
              className="mt-2"
              variant="primary"
            >
              Log In
            </NeoButton>
            <p className="text-sm text-center text-gray-500">
              Wallet connection will be on the dashboard.
            </p>
          </form>
        </NeoCard>
      </motion.div>
    </div>
  );
};

const DashboardPage = () => {
  const HealthStatus = ({ factor }) => {
    const f = Number(factor);
    let color = "text-green-600";
    let text = "Safe";
    if (f < 1.5) {
      color = "text-yellow-500";
      text = "Risky";
    }
    if (f < 1.1) {
      color = "text-red-500";
      text = "Liquidation risk";
    }

    return (
      <div className={`flex items-center gap-2 ${color}`}>
        <span className="font-bold text-3xl">{f.toFixed(2)}</span>
        <span className="text-sm font-medium">({text})</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-5xl font-black">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Health Factor"
          value={<HealthStatus factor={2.45} />}
          color="border-t-green-400"
        />
        <StatCard
          title="Total Deposited (Collateral)"
          value="$1,200.00"
          color="border-t-blue-500"
        />
        <StatCard
          title="Total Borrowed (Loan)"
          value="$489.80"
          color="border-t-pink-500"
        />
        <StatCard title="Net APY" value="4.20%" color="border-t-yellow-500" />
      </div>

      <NeoCard>
        <h2 className="text-3xl font-bold mb-4">Platform Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Liquidity"
            value="$12,450,830"
            color="border-t-gray-400"
          />
          <StatCard
            title="Total Borrowed"
            value="$9,780,200"
            color="border-t-gray-400"
          />
          <StatCard
            title="Utilization Rate"
            value="78.5%"
            color="border-t-gray-400"
          />
        </div>
      </NeoCard>
    </div>
  );
};

const BorrowPage = () => {
  const myCollateral = [
    {
      asset: "WETH",
      amount: 0.5,
      value: "$1,500.00",
      apy: "2.1%",
      available: "$1,200",
    },
    {
      asset: "WBTC",
      amount: 0.0,
      value: "$0.00",
      apy: "1.8%",
      available: "$0",
    },
  ];

  const availableToBorrow = [
    { asset: "xUSD", apy: "4.5%", available: "$1,200,000" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-5xl font-black">Borrow & Repay</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <NeoCard>
          <h2 className="text-3xl font-bold mb-4">My Collateral</h2>
          <div className="flex flex-col gap-4 w-full">
            {myCollateral.map((item) => (
              <div
                key={item.asset}
                className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border-2 border-gray-100"
              >
                <div>
                  <span className="text-xl font-bold">{item.asset}</span>
                  <p className="text-sm text-gray-500">APY: {item.apy}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-right">Available</p>
                  <p className="text-sm text-gray-500 text-right">
                    {item.available}
                  </p>
                </div>
                <div className="flex gap-2">
                  <NeoButton variant="primary" className="py-2 px-3">
                    Borrow
                  </NeoButton>
                  <NeoButton variant="secondary" className="py-2 px-3">
                    Repay
                  </NeoButton>
                </div>
              </div>
            ))}
          </div>
        </NeoCard>
      </div>
    </div>
  );
};

const InvestPage = () => {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-5xl font-black">Invest (Lending Pool)</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <NeoCard>
          <h2 className="text-3xl font-bold mb-4">xUSD Pool Stats</h2>
          <div className="flex flex-col gap-4">
            <StatCard
              title="Current APY"
              value="3.85%"
              color="border-t-green-400"
            />
            <StatCard
              title="Total Supplied"
              value="$12,450,830"
              color="border-t-blue-400"
            />
            <StatCard
              title="Utilization"
              value="78.5%"
              color="border-t-yellow-400"
            />
          </div>
        </NeoCard>

        <NeoCard>
          <h2 className="text-3xl font-bold mb-4">Manage Your Position</h2>

          <div className="mb-6">
            <h3 className="text-xl font-bold">Your Deposit</h3>
            <p className="text-4xl font-black text-blue-600">$5,000.00</p>
            <p className="text-sm text-gray-500">Earnings: +$120.50</p>
          </div>

          <div className="flex flex-col gap-4">
            <NeoInput
              label="Amount to Deposit"
              id="deposit-amount"
              placeholder="1000.00"
            />
            <NeoButton variant="primary" fullWidth>
              Deposit xUSD
            </NeoButton>
          </div>

          <hr className="border-t-2 border-black my-6" />

          <div className="flex flex-col gap-4">
            <NeoInput
              label="Amount to Withdraw"
              id="withdraw-amount"
              placeholder="500.00"
            />
            <NeoButton variant="secondary" fullWidth>
              Withdraw
            </NeoButton>
          </div>
        </NeoCard>
      </div>
    </div>
  );
};

const LiquidatePage = () => {
  const positions = [
    {
      user: "0x...a4bC",
      health: "0.98",
      debt: "$1,200",
      collateral: "$1,300 (WETH)",
    },
    {
      user: "0x...fE21",
      health: "0.85",
      debt: "$5,500",
      collateral: "$6,000 (WBTC)",
    },
    {
      user: "0x...99D0",
      health: "1.05",
      debt: "$800",
      collateral: "$950 (WETH)",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-5xl font-black">Liquidations</h1>
      <NeoCard>
        <h2 className="text-3xl font-bold mb-4">
          Under-Collateralized Positions
        </h2>
        <p className="mb-6 text-gray-600">
          Find positions with a Health Factor below 1.0. You can repay their
          debt to receive their collateral at a discount.
        </p>

        <div className="overflow-x-auto border-2 border-gray-100 rounded-lg">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100 border-b-2 border-gray-100">
              <tr>
                <th className="py-3 px-4 text-left font-bold">User</th>
                <th className="py-3 px-4 text-left font-bold">Health Factor</th>
                <th className="py-3 px-4 text-left font-bold">Debt (xUSD)</th>
                <th className="py-3 px-4 text-left font-bold">Collateral</th>
                <th className="py-3 px-4 text-left font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const healthNum = Number(pos.health);
                const risky = healthNum < 1;
                return (
                  <tr
                    key={pos.user}
                    className="border-b-2 shadow-sm border-gray-100 last:border-b-0"
                  >
                    <td className="py-3 px-4 font-mono">{pos.user}</td>
                    <td
                      className={`py-3 px-4 font-bold ${
                        risky ? "text-red-500" : "text-green-500"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {risky ? (
                          <AlertTriangle className="w-5 h-5" />
                        ) : (
                          <CheckCircle className="w-5 h-5" />
                        )}
                        {pos.health}
                      </div>
                    </td>
                    <td className="py-3 px-4">{pos.debt}</td>
                    <td className="py-3 px-4">{pos.collateral}</td>
                    <td className="py-3 px-4">
                      {risky ? (
                        <NeoButton variant="danger" className="py-2 px-3">
                          Liquidate
                        </NeoButton>
                      ) : (
                        <span className="text-gray-400">Safe</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </NeoCard>
    </div>
  );
};

export default function App() {
  const [currentPage, setCurrentPage] = useState("login");
  const [showWalletPopup, setShowWalletPopup] = useState(false);

  const handleLogin = () => setCurrentPage("dashboard");
  const handleLogout = () => setCurrentPage("login");
  const openWallet = () => setShowWalletPopup(true);
  const closeWallet = () => setShowWalletPopup(false);

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap'); body { font-family: 'Poppins', sans-serif; }`}</style>

      <div className="relative min-h-screen w-full">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 70%, rgba(173, 216, 230, 0.35), transparent 60%), radial-gradient(circle at 70% 30%, rgba(255, 182, 193, 0.4), transparent 60%)`,
            backgroundColor: "#fefcff",
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
                    setCurrentPage={setCurrentPage}
                    onLogout={handleLogout}
                  />
                  <main className="flex-1 p-8 overflow-y-auto relative">
                    <Header onOpenWallet={openWallet} />
                    <AnimatePresence mode="wait">
                      <AnimatedPage key={currentPage}>
                        {currentPage === "dashboard" && <DashboardPage />}
                        {currentPage === "invest" && <InvestPage />}
                        {currentPage === "borrow" && <BorrowPage />}
                        {currentPage === "liquidate" && <LiquidatePage />}
                      </AnimatedPage>
                    </AnimatePresence>
                  </main>
                </div>
              </AnimatedPage>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showWalletPopup && <WalletPopup onClose={closeWallet} />}
        </AnimatePresence>
      </div>
    </>
  );
}
