import React, { useState } from "react"; // Import React for types
import { motion } from "framer-motion";
import NeoCard from "../common/NeoCard";
import NeoInput from "../common/NeoInput";
import NeoButton from "../common/NeoButton";

// 1. Define the props interface
interface LoginPageProps {
  onLogin: () => void;
}

// 2. Apply the interface to the component
const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!password) {
      setError("Password is required");
      return;
    }
    if (!email || !email.includes("@")) {
      setError("Valid email is required");
      return;
    }
    console.log("Login form is Valid.");
    onLogin();
  };
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
      >
        <NeoCard className="max-w-md w-full" padding="p-8">
          <form onSubmit={handleLogin} className="flex flex-col gap-6">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <NeoInput
              label="Password"
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <div className="w-full p-3 -mt-2 rounded-lg bg-red-100 border border-red-400 text-red-700 font-bold text-sm">
                {error}
              </div>
            )}
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

export default LoginPage;
