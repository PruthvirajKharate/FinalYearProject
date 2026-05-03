# Frontend Expansion Plan: Crypto Lend

This document outlines the detailed roadmap for implementing the remaining backend features into the frontend, transforming the current prototype into a fully functional and user-friendly DeFi platform.

---

## 🎯 Primary Objectives
1.  **Close the Feature Gap:** Bridge the backend modules (DAO, Transactions, Faucet) to the UI.
2.  **Dynamic Data:** Replace hardcoded mock data with real-time data from the NestJS API and Smart Contracts.
3.  **Enhanced UX:** Improve user flow for complex DeFi actions (Liquidation, Governance).

---

## 🚀 Phase 1: DAO & Governance Implementation
The backend already supports proposals and voting, but the UI lacks a dashboard for this.

### 1.1 Governance Overview Page
*   **Features:** List all active and past proposals.
*   **Filters:** Active, Succeeded, Defeated, Executed.
*   **Components:** `ProposalCard` showing Title, Status, and Voting Progress.

### 1.2 Proposal Detail & Voting
*   **Features:** 
    *   Detailed description of the proposal.
    *   Voting buttons (For / Against / Abstain).
    *   Real-time vote tally chart.
*   **Integration:** Connect to `dao.service.ts` via API and call the Smart Contract `vote()` function.

### 1.3 Create Proposal UI
*   **Features:** A form to submit new proposals.
*   **Inputs:** Title, Description, Action (e.g., Change Interest Rate).

---

## 📈 Phase 2: Transaction History & Activity
Users need to see what they've done on the platform.

### 2.1 Global Transaction History
*   **Features:** A dedicated page or sidebar tab showing all recent protocol activities (Deposits, Borrows, etc.).
*   **Data Source:** Fetch from `TransactionModule` in the backend.

### 2.2 User-Specific Activity
*   **Features:** Filter history to show only the logged-in user's transactions.
*   **Status Tracking:** Show "Pending" status for blockchain transactions using a loading state synced with the backend watcher.

---

## 💧 Phase 3: Faucet & Asset Management
Since this is a local testnet project, users need an easy way to get mock tokens.

### 3.1 Faucet UI
*   **Location:** Floating button or dedicated "Faucet" page.
*   **Action:** Call the `mint()` function on the Mock Token contracts (xUSD, WETH, WBTC).
*   **Feedback:** Show success/error notifications with transaction hashes.

---

## 📊 Phase 4: Real-Time Data Integration (Web3)
The current UI uses hardcoded values like `$1,200.00`.

### 4.1 Wallet State Sync
*   **Tools:** Use `Wagmi` or `Ethers.js`.
*   **Implementation:** 
    *   Fetch real token balances.
    *   Fetch real "Health Factor" from the `LendingPool` contract.
    *   Display real "Total Liquidity" from the `ReserveModule`.

### 4.2 Price Feeds
*   **Implementation:** Connect to the `MockAggregator` contract to show live prices of ETH/BTC on the dashboard.

---

## 👤 Phase 5: User Profile & Security
### 5.1 Profile Dashboard
*   **Features:** 
    *   Total Net Worth across the protocol.
    *   Connected Wallet Address (with copy button).
    *   Account Tier/Status (based on DAO participation).

### 5.2 Settings
*   **Features:** Toggle between Dark/Light mode, set notification preferences for "Low Health Factor" alerts (Email/WebPush).

---

## 🛠 Technical Checklist
- [ ] Install `wagmi` and `viem` for robust React hooks for Ethereum.
- [ ] Create a `useContract` custom hook for easier interaction with `LendingPool`.
- [ ] Implement `React Query` or `SWR` for efficient fetching of backend API data.
- [ ] Standardize `NeoCard` and `NeoButton` components for reusable UI across new pages.

---

## 📅 Suggested Implementation Order
1.  **Transaction History** (Easiest & most needed).
2.  **DAO Dashboard** (Core feature implementation).
3.  **Faucet UI** (Essential for testing).
4.  **Real Data Integration** (Final polish for production feel).
