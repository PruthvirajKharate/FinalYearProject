import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require("hardhat-gas-reporter");

import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  gasReporter: {
    enabled: true, // Set to true to always see the report
    currency: 'USD', // Optional: show gas costs in USD
    noColors: true, // Optional: useful for cleaner output to files
    outputFile: 'gas-report.txt' // Optional: save the report to a file
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
};

export default config;

