import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  PiggyBank,
  ArrowDownUp,
  Flame,
  LogOut,
  // X, // X was imported but not used, so I removed it.
  ChevronLeftCircle,
  ChevronRightCircle,
} from "lucide-react";
import NeoButton from "../common/NeoButton";

// --- Type Definitions ---

// 1. Define the specific page names allowed for navigation
type PageName = "dashboard" | "invest" | "borrow" | "liquidate";

// 2. Define the shape of the props this component accepts
interface SidebarProps {
  setCurrentPage: (page: PageName) => void;
  onLogout: () => void;
}

// 3. Define the shape of the navItem objects
interface NavItem {
  name: string;
  icon: React.ElementType; // Type for components like lucide-icons
  page: PageName;
}

// --- Component ---

const Sidebar: React.FC<SidebarProps> = ({ setCurrentPage, onLogout }) => {
  const [isOpen, setIsOpen] = useState(true);
  const handleClose = () => setIsOpen(!isOpen);

  // 4. Apply the NavItem type to our array
  const navItems: NavItem[] = [
    { name: "Dashboard", icon: LayoutDashboard, page: "dashboard" },
    { name: "Invest", icon: PiggyBank, page: "invest" },
    { name: "Borrow", icon: ArrowDownUp, page: "borrow" },
    { name: "Liquidate", icon: Flame, page: "liquidate" },
  ];

  return (
    <motion.nav
      className="border-r border-gray-200 h-screen flex flex-col p-4 shadow-lg backdrop-blur-2xl z-10 sticky top-0"
      initial={{ width: "250px" }}
      animate={{ width: isOpen ? "250px" : "90px" }} // Note: Tailwind's left-8 is 2rem (32px). 90px is custom.
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
    >
      <div className="flex items-center justify-between mb-8 px-2 w-full overflow-hidden">
        <motion.h1
          initial={{ opacity: 1, x: 0 }}
          animate={{ opacity: isOpen ? 1 : 0, x: isOpen ? 0 : -100 }}
          className={`text-3xl font-black flex ${
            isOpen ? "w-full" : "w-0"
          } transition-all duration-100 ease-out`}
        >
          <span className="font-space font-bold text-4xl">Crypto</span>
          <span className="text-blue-600 font-space text-4xl">Fi</span>
        </motion.h1>
        <div
          className={`absolute shrink-0 transition-all ${
            isOpen ? "right-5" : "left-8" // 2rem / 32px
          } `}
        >
          {isOpen ? (
            <ChevronLeftCircle
              onClick={handleClose}
              className="w-7 h-7 text-gray-600 hover:text-black shrink-0 rounded-sm cursor-pointer"
            />
          ) : (
            <ChevronRightCircle
              onClick={handleClose}
              className="w-7 h-7 text-gray-600 hover:text-black cursor-pointer"
            />
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-3">
        {navItems.map((item) => (
          <NeoButton
            key={item.page}
            onClick={() => setCurrentPage(item.page)}
            className={`w-full overflow-hidden ${
              isOpen ? "justify-start" : ""
            }`}
            variant="secondary"
          >
            <item.icon
              className={`w-7 h-7 shrink-0 transition-all duration-200`}
            />
            <span
              className={`${
                isOpen ? "" : "hidden w-0"
              } ml-2 transition-all duration-150`}
            >
              {item.name}
            </span>
          </NeoButton>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-4">
        <div
          className={`flex items-center gap-3 mb-4 ${isOpen ? "px-2" : "px-2"}`}
        >
          <div className="w-10 h-10 rounded-3xl border-2 flex items-center justify-center font-bold text-lg bg-gray-100 shrink-0 border-gray-300">
            HJ
          </div>

          {isOpen && (
            <div className="shrink-0">
              <p className="font-bold">Hemraj Jadhav</p>
              <p className="text-xs text-gray-500">Investor</p>
            </div>
          )}
        </div>

        <NeoButton
          onClick={onLogout}
          className={`w-full flex ${isOpen ? "justify-start" : ""}`}
          variant="secondary"
        >
          <LogOut className="w-6 h-6 shrink-0" />
          <span className={`ml-2 ${isOpen ? "" : "hidden w-0"}`}>Logout</span>
        </NeoButton>
      </div>
    </motion.nav>
  );
};

export default Sidebar;
