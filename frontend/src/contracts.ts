import LendingPool from "../../artifacts/contracts/LendingPool.sol/LendingPool.json";
import USDToken from "../../artifacts/contracts/USDToken.sol/USDToken.json";
import RupeeToken from "../../artifacts/contracts/RupeeToken.sol/RupeeToken.json";
import YenToken from "../../artifacts/contracts/YenToken.sol/YenToken.json";
import MockAggregator from "../../artifacts/contracts/MockAggregator.sol/MockAggregator.json";

export const CONTRACTS = {
  lendingPool: {
    address: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    abi: LendingPool.abi,
  },
  usdToken: {
    address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    abi: USDToken.abi,
  },
  rsToken: {
    address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    abi: RupeeToken.abi,
  },
  yenToken: {
    address: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    abi: YenToken.abi,
  },
  mockAggregator: {
    address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    abi: MockAggregator.abi,
  },
};
