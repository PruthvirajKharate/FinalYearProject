# Crypto Lend - Todo

## Completed Tasks

### Documentation
- [x] Created comprehensive README.md with complete from-scratch setup guide (2026-05-04 09:50 IST)

### Liquidation Feature (Full Stack)
- [x] Server: Added `GET /loans/active` API endpoint for all active loans (2026-05-04 11:27 IST)
- [x] Frontend: Rewrote `LiquidatePage.tsx` with real on-chain data (2026-05-04 11:28 IST)
  - Fetches loans from NestJS API, reads contract state via ethers.js
  - Calculates health factors using BigInt math matching contract logic
  - Liquidate button via wagmi (LIQUIDATOR_ROLE required)
  - Stats bar, color-coded health, risk badges, toasts
- [x] Frontend: Added `disabled` prop to `NeoButton` component (2026-05-04 11:28 IST)

## Remaining Tasks

### Frontend (Priority: Medium)
- [ ] Replace hardcoded mock data on DashboardPage with real on-chain data
- [ ] Replace hardcoded mock data on InvestPage with real on-chain data
- [ ] Replace hardcoded mock data on BorrowPage with real on-chain data
- [ ] Implement DAO Governance page (proposals, voting)
- [ ] Implement Faucet UI for mock token minting
- [ ] Connect price feeds from MockAggregator to dashboard
- [ ] Implement user profile/settings page

### Backend (Priority: Medium)
- [ ] Add Withdrawn event handler in blockchain-watcher.service.ts
- [ ] Implement API endpoints for frontend data fetching (reserves, user loans, etc.)

### Smart Contracts (Priority: Low — DO NOT MODIFY)
- [ ] Add comprehensive test coverage (liquidation, DAO flows, edge cases)
