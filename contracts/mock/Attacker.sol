// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "../interfaces/Gifty/exactInterfaces/IGiftyAction.sol";

error GiverContractCanNotReceiverETH__balanceToLow();

contract Attacker {
	IGiftyAction public s_target;
	uint256 public s_giftId;
	uint256 public s_functionId;

	function attack(IGiftyAction target, uint256 giftId, uint256 functionId) public {
		s_target = target;
		s_giftId = giftId;
		s_functionId = functionId;

		if (s_functionId == 1) {
			target.claimGift(s_giftId);
		} else if (s_functionId == 2) {
			target.refundGift(s_giftId);
		} else if (s_functionId == 3) {
			target.claimSurplusesETH();
		}
	}

	function giftETH(IGiftyAction target, address receiver, uint256 amount) external payable {
		uint256 balance = address(this).balance;
		if (balance < amount) revert GiverContractCanNotReceiverETH__balanceToLow();

		target.giftETH{value: msg.value}(receiver, amount);
	}

	receive() external payable {
		if (address(s_target).balance > 1 ether) {
			attack(s_target, s_giftId, s_functionId);
		}
	}
}
