// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract YenToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("Yen Token", "YEN") {
        // Mint initial supply to the deployer (your account)
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    // Optional: Mint more tokens later (only owner/admin in real case)
    function faucet(address to, uint256 amount) external {
        _mint(to, amount * 10 ** decimals());
    }
}
