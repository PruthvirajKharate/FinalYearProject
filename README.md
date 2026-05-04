# Crypto Lend - Decentralized Lending Protocol

Welcome to **Crypto Lend**, a full-stack Web3 Lending Application utilizing React, NestJS, PostgreSQL, and Solidity Smart Contracts.

This document explicitly maps out the setup mechanics required to launch this prototype securely on a local development network.

---

## 📋 Prerequisites

Before running the project, ensure you have the following installed:

| Tool               | Required Version | Verify Command        |
| :------------------ | :--------------- | :-------------------- |
| **Node.js**        | `>= v20.19.0`   | `node --version`      |
| **Yarn**           | `>= 1.22.x`     | `yarn --version`      |
| **Docker**         | Latest           | `docker --version`    |
| **MetaMask**       | Browser Extension| N/A                   |

> **Note:** Vite v7+ requires Node.js `v20.19.0` or higher to compile its cryptography hashes correctly. If using Fast Node Manager (`fnm`), set your engine first: `fnm use v20.20.1`

---

## 🗂 Project Architecture

```
FinalYearProject/
├── contracts/                 # Solidity Smart Contracts
│   ├── LendingPool.sol        # Core lending protocol
│   ├── MockAggregator.sol     # Chainlink price oracle simulator
│   ├── RupeeToken.sol         # RS (Rupee) ERC20 token
│   ├── USDToken.sol           # USD ERC20 token
│   └── YenToken.sol           # YEN ERC20 token
├── scripts/
│   └── finalDeploy.ts         # Full deployment script (tokens + pool + reserves)
├── deploy_new_pool.js         # Redeployment script (auto-updates contract addresses)
├── test/
│   └── LendingPool.test.ts    # Hardhat contract tests
├── server/                    # NestJS Backend API
│   └── src/
│       ├── transaction/       # Blockchain watcher & tx recording
│       ├── user/              # User management
│       ├── loan/              # Loan tracking
│       ├── reserve/           # Reserve/liquidity management
│       ├── dao/               # DAO governance
│       └── liquidation/       # Liquidation bot
├── frontend/                  # React + Vite Web Application
│   └── src/
│       ├── contracts.ts       # ABI imports + deployed contract addresses
│       ├── components/        # UI components (pages, layout, common, ui)
│       └── hooks/             # Custom React hooks
├── docker-compose.yml         # Docker orchestration
├── hardhat.config.ts          # Hardhat configuration
└── package.json               # Root dependencies (Hardhat + Solidity toolchain)
```

---

## 🚀 Setup & Execution (from Scratch)

To run the entire suite locally, you must spin up **four components** in separate terminal tabs/processes. Follow the steps **in order**.

---

### Step 1: Install Root Dependencies (Hardhat Toolchain)

From the **project root** directory, install the Solidity/Hardhat dependencies:

```bash
yarn install
```

This installs Hardhat, OpenZeppelin, Ethers.js, TypeChain, and all dev tooling.

---

### Step 2: Compile Solidity Smart Contracts

Compile all `.sol` files to generate the ABI artifacts (required by both frontend and server):

```bash
npx hardhat compile
```

**Expected Output:**
```
Generating typings for: 11 artifacts in dir: typechain-types for target: ethers-v6
Successfully generated 38 typings!
Compiled 11 Solidity files successfully (with Solc 0.8.20).
```

This creates the `artifacts/` directory containing JSON ABIs:
```
artifacts/contracts/
├── LendingPool.sol/LendingPool.json    ← Used by frontend & server
├── USDToken.sol/USDToken.json          ← Used by frontend
├── RupeeToken.sol/RupeeToken.json      ← Used by frontend
├── YenToken.sol/YenToken.json          ← Used by frontend
└── MockAggregator.sol/MockAggregator.json
```

> **Important:** Both `frontend/src/contracts.ts` and `server/src/blockchain/LendingPool.json` import from these artifacts. The frontend references them via relative path `../../artifacts/...`. Compilation must succeed before the frontend or server can build.

---

### Step 3: Run Smart Contract Tests (Optional but Recommended)

Verify the contract logic is correct:

```bash
npx hardhat test
```

**Expected Output:**
```
  LendingPool (integrated flow)
    ✓ should allow deposit, depositCollateral + borrow, and repay with time-based interest

  1 passing
```

---

### Step 4: Start the Database (PostgreSQL via Docker)

Ensure Docker daemon is active, then start the PostgreSQL database container:

```bash
docker start postgres_container
```

> **First time only?** If the container doesn't exist yet, create it using the docker-compose file:
> ```bash
> docker compose up -d
> ```
> This creates a PostgreSQL 16 container with environment-variable-driven credentials:
> - **User:** `${POSTGRES_USER}` (default: `postgres`)
> - **Password:** `${POSTGRES_PASSWORD}` (default: `admin`)
> - **Database:** `${POSTGRES_DB}` (default: `lending_db`)
> - **Port:** `5432`
> - **Volume:** `pgdata` (persistent)
>
> These defaults match the NestJS server's TypeORM configuration in `server/src/app.module.ts`.

---

### Step 5: Start the Local Blockchain (Hardhat Node)

In **Terminal A**, initialize the local Hardhat Ethereum Virtual Machine:

```bash
npx hardhat node
```

**Leave this running!** It outputs 20 mock wallet accounts loaded with 10,000 Fake ETH each.

**Key accounts to note:**
```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

> **Note:** This must stay running for the entire session. Stopping this will wipe all blockchain state.

---

### Step 6: Deploy Smart Contracts to Local Network

In **Terminal B**, deploy all contracts (MockAggregator, Tokens, LendingPool) and configure reserves:

#### Option A: First-time fresh deployment
```bash
npx hardhat run scripts/finalDeploy.ts --network localhost
```

#### Option B: Redeploy LendingPool only (auto-updates addresses in code)
```bash
npx hardhat run deploy_new_pool.js --network localhost
```

> **`deploy_new_pool.js` is the recommended script** — it automatically updates the contract addresses in both:
> - `frontend/src/contracts.ts` (LendingPool address)
> - `server/src/transaction/blockchain-watcher.service.ts` (CONTRACT_ADDRESS)

**Expected Output (finalDeploy.ts):**
```
MockAggregator deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
USDToken deployed to:       0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
RSToken deployed to:        0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
YenToken deployed to:       0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
LendingPool deployed to:    0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
```

> **Important:** Hardhat uses deterministic address generation. If you deploy to a **fresh node** (just restarted `npx hardhat node`), the addresses above will always be the same. However, if the node was already used for previous deployments, the addresses will differ — you must update them manually.

---

### Step 7: Update Contract Addresses (Manual — if addresses differ)

If the deployment output shows **different addresses** than what's already in the code, update these two files:

#### 7a. Frontend — `frontend/src/contracts.ts`

```typescript
export const CONTRACTS = {
  lendingPool: {
    address: "<PASTE_LENDING_POOL_ADDRESS>",   // e.g., "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"
    abi: LendingPool.abi,
  },
  usdToken: {
    address: "<PASTE_USD_TOKEN_ADDRESS>",      // e.g., "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
    abi: USDToken.abi,
  },
  rsToken: {
    address: "<PASTE_RS_TOKEN_ADDRESS>",       // e.g., "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
    abi: RupeeToken.abi,
  },
  yenToken: {
    address: "<PASTE_YEN_TOKEN_ADDRESS>",      // e.g., "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
    abi: YenToken.abi,
  }
};
```

#### 7b. Backend — `server/src/transaction/blockchain-watcher.service.ts`

```typescript
private readonly CONTRACT_ADDRESS = "<PASTE_LENDING_POOL_ADDRESS>";
// e.g., "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"
```

> **Tip:** Use `deploy_new_pool.js` (Step 6, Option B) to avoid manual updates — it patches both files automatically.

---

### Step 8: Start the NestJS Backend Server

In **Terminal C**, navigate to the `./server` directory and launch the backend:

```bash
cd server
yarn install
yarn start:dev
```

**Expected Output:**
```
[Nest] LOG [NestApplication] Nest application successfully started
[Nest] LOG [BlockchainWatcherService] Initializing Blockchain Watcher...
[Nest] LOG [BlockchainWatcherService] Watching for events on: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
```

The server runs on `http://localhost:3000` and:
- Listens to blockchain events (Deposited, Borrowed, Repaid, Liquidated, etc.)
- Records transactions in PostgreSQL
- Provides REST API endpoints for the frontend

---

### Step 9: Start the Frontend (React + Vite)

In **Terminal D**, boot the frontend:

```bash
cd frontend
yarn install
npx vite
```

**Expected Output:**
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://xxx.xxx.xxx.xxx:5173/
```

The Frontend Dashboard will be hosted on `http://localhost:5173`.

---

## 🦊 Connecting MetaMask to Localhost

To interact with the DApp through the UI, you must connect MetaMask to the local Hardhat node.

### Step 1: Add Localhost Network
1. Open MetaMask → Click the **Network Dropdown** (top left).
2. Click **Add Network** → **Add a network manually**.
3. Fill in:
   - **Network Name:** `Hardhat Localhost`
   - **New RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** `ETH`
4. Click **Save** and switch to this network.

### Step 2: Import Hardhat Test Wallets
1. Go to **Terminal A** where `npx hardhat node` is running.
2. Copy the **Private Key** of `Account #0`:
   ```
   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
3. In MetaMask → **Account Icon** → **Add account or hardware wallet** → **Import account**.
4. Paste the Private Key and hit Import.

Your MetaMask wallet will reflect a balance of **10,000 ETH**! Browse to `http://localhost:5173` and use the platform.

> **Tip:** If MetaMask shows incorrect nonce errors after restarting the Hardhat node, go to MetaMask → **Settings** → **Advanced** → **Clear activity tab data**.

---

## 🔄 Quick Restart Guide

If you need to restart the project after a reboot or after closing all terminals:

```bash
# 1. Start Docker (database)
docker start postgres_container

# 2. Terminal A — Start blockchain
npx hardhat node

# 3. Terminal B — Deploy contracts (from project root)
npx hardhat run deploy_new_pool.js --network localhost

# 4. Terminal C — Start backend
cd server && yarn start:dev

# 5. Terminal D — Start frontend
cd frontend && npx vite
```

---

## 📊 Component Summary

| Component            | Port   | Technology                     | Purpose                                  |
| :------------------- | :----- | :----------------------------- | :--------------------------------------- |
| **Hardhat Node**     | `8545` | Solidity, Ethers.js            | Local EVM blockchain simulator           |
| **PostgreSQL**       | `5432` | Docker, PostgreSQL 15          | Persistent data storage                  |
| **NestJS Server**    | `3000` | TypeScript, TypeORM            | REST API + Blockchain event watcher      |
| **React Frontend**   | `5173` | React 19, Vite 7, TailwindCSS | User-facing DApp interface               |

---

## 🛠 Troubleshooting

| Problem                                    | Solution                                                                     |
| :----------------------------------------- | :--------------------------------------------------------------------------- |
| `artifacts/` not found                     | Run `npx hardhat compile` from the project root first                        |
| Frontend shows wrong contract data         | Verify addresses in `frontend/src/contracts.ts` match deployment output      |
| Backend watcher not picking up events      | Verify `CONTRACT_ADDRESS` in `blockchain-watcher.service.ts` matches deploy  |
| MetaMask nonce errors                      | MetaMask → Settings → Advanced → Clear activity tab data                     |
| `Cannot connect to database`               | Ensure `docker start postgres_container` is running                          |
| `price too old` error in contract calls    | This is normal on a frozen Hardhat node; mine a new block to update timestamp|
| Port already in use                        | Kill the process: `lsof -i :<PORT>` then `kill <PID>`                        |
