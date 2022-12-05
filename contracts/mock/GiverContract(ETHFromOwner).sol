// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "../interfaces/Gifty/exactInterfaces/IGiftyAction.sol";

error GiverContractCanNotReceiverETH__canReceiveETHOnlyFromOwner();
error GiverContractCanNotReceiverETH__balanceToLow();

contract GiverContractCanNotReceiverETH {
	IGiftyAction private immutable s_gfity;
	address private s_owner;

	constructor(IGiftyAction gifty) {
		s_gfity = gifty;
	}

	function giftETH(uint256 amountOfGift) external payable {
		uint256 balance = address(this).balance;
		if (balance < amountOfGift) revert GiverContractCanNotReceiverETH__balanceToLow();

		s_gfity.giftETH{value: msg.value}(s_owner, amountOfGift);
	}

	function claimSurplusesETH() external {
		s_gfity.claimSurplusesETH();
	}
}
