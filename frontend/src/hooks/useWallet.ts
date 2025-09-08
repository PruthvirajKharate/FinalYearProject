import { useState, useEffect } from "react";
import { ethers } from "ethers";

export const useWallet = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  useEffect(() => {
    if ((window as any).ethereum) {
      const ethProvider = new ethers.BrowserProvider((window as any).ethereum);
      setProvider(ethProvider);
    }
  }, []);

  async function connect() {
    if (!provider) return;
    const accounts = await provider.send("eth_requestAccounts", []);
    setAccount(accounts[0]);
  }

  return { account, provider, connect };
};
