import LendingPool from "../../artifacts/contracts/LendingPool.sol/LendingPool.json";
import USDToken from "../../artifacts/contracts/USDToken.sol/USDToken.json";
export const CONTRACTS = {
  lendingPool: {
    address: "0xYourLendingPoolAddressHere",
    abi: LendingPool.abi,
  },
  usdToken: {
    address: "0xYourUSDTokenAddressHere",
    abi: USDToken.abi,
  },
};
