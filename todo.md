# Crypto Lend - Todo

## Completed Tasks

### Documentation
- [x] Created comprehensive README.md with complete from-scratch setup guide (2026-05-04 09:50 IST)
  - Covers prerequisites, project architecture, all 4 components setup
  - Documents contract address update locations (contracts.ts + blockchain-watcher.service.ts)
  - Includes MetaMask configuration, quick restart guide, and troubleshooting

## Remaining Tasks

### Frontend (Priority: Medium)
- [ ] Replace hardcoded mock data with real on-chain data (Health Factor, Balances, Liquidity)
- [ ] Implement DAO Governance page (proposals, voting)
- [ ] Implement Transaction History page
- [ ] Implement Faucet UI for mock token minting
- [ ] Connect price feeds from MockAggregator to dashboard
- [ ] Implement user profile/settings page

### Backend (Priority: Medium)
- [ ] Add Withdrawn event handler in blockchain-watcher.service.ts
- [ ] Implement API endpoints for frontend data fetching (reserves, user loans, etc.)

### Smart Contracts (Priority: Low)
- [ ] Add comprehensive test coverage (liquidation, DAO flows, edge cases)
- [ ] Consider upgradeability pattern for production deployment
