// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
	constructor() ERC20("MockToken", "MT") {
		_mint(msg.sender, type(uint256).max);
	}
}
