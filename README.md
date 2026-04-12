# Crypto Lend - Decentralized Lending Protocol

Welcome to **Crypto Lend**, a full-stack Web3 Lending Application utilizing React, NestJS, PostgreSQL, and Solidity Smart Contracts.

This document explicitly maps out the setup mechanics required to launch this prototype securely on a local development network.

---

## 🚀 Setup & Execution 

To run the entire suite locally, you must spin up four separate components in background processes or individual terminal tabs.

### 1. Database Initialization
Ensure your Docker daemon is active, then spin up the PostgreSQL database container.
```bash
docker start postgres
```

### 2. Blockchain Simulator & Contract Deployment
In **Terminal A**, initialize the local Hardhat Ethereum Virtual Machine (EVM) to simulate blockchain state:
```bash
npx hardhat node
```
*(Leave this running! It will output 20 mock wallet accounts loaded with 10,000 Fake ETH each.)*

In **Terminal B**, execute the deployment script which mints the `LendingPool.sol` and issues Mock Tokens:
```bash
npx hardhat run scripts/finalDeploy.ts --network localhost
```

### 3. NestJS Backend API & Database Bot
In **Terminal C**, navigate to the `./server` directory and launch the backend watcher cron-jobs:
```bash
cd server
yarn install
yarn start:dev
```

### 4. React / Vite Web Application
In **Terminal D**, boot the frontend! 
**Note:** Vite requires Node.js `v20.19.0` or higher to compile its cryptography hashes correctly. If using Fast Node Manager (`fnm`), set your engine first:
```bash
cd frontend
fnm use v20.20.1   # Ensure your Node engine is upgraded!
yarn install
npx vite
```
The Frontend Dashboard will be hosted natively on `http://localhost:5173`.

---

## 🦊 Connecting MetaMask to Localhost

If you want to view your mocked ETH logic on the UI dashboard, you must natively connect your MetaMask extension to the local Hardhat Node. 

### Step 1: Add Localhost Network
1. Open the MetaMask Extension and click the **Network Dropdown** (top left).
2. Click **Add Network** -> **Add a network manually**.
3. Fill in the following credentials:
   - **Network Name**: Hardhat Localhost
   - **New RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`
4. Click **Save** and verify you have swapped to the network.

### Step 2: Import Hardhat Test Wallets
Your local simulation will not recognize your mainnet/real Ethereum.
1. Return to **Terminal A** where `npx hardhat node` is currently running.
2. Copy the **Private Key** belonging to `Account #0` or `Account #1` (e.g. `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`).
3. Inside MetaMask, click your **Account Icon** -> **Add account or hardware wallet** -> **Import account**.
4. Paste the raw Private Key and hit Import.

Your MetaMask wallet will instantly reflect a balance of **10,000 ETH**! You may now browse to `http://localhost:5173` and successfully use the Faucet!
