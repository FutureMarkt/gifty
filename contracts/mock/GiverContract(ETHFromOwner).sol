// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "../interfaces/IGifty.sol";

error GiverContractCanNotReceiverETH__canReceiveETHOnlyFromOwner();
error GiverContractCanNotReceiverETH__balanceToLow();

contract GiverContractCanNotReceiverETH {
	IGifty private immutable s_gfity;
	address private s_owner;

	constructor(IGifty gifty) {
		s_gfity = gifty;
	}

	function giftETH(uint256 amountOfGift, uint256 commission) external payable {
		uint256 balance = address(this).balance;

		uint256 giftAmountWithCommission = amountOfGift + commission;
		if (balance < giftAmountWithCommission)
			revert GiverContractCanNotReceiverETH__balanceToLow();

		s_gfity.giftETH{value: giftAmountWithCommission}(s_owner, amountOfGift);
	}

	function claimSurplusesETH() external {
		s_gfity.claimSurplusesETH();
	}
}
