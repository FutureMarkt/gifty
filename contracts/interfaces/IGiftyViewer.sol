// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";

interface IGiftyViewer {
	enum TypeOfGift {
		DEFAULT,
		ETH,
		FT
	}

	struct Gift {
		address giver;
		address receiver;
		uint96 amountInUSD;
		uint256 amount;
		IERC20 asset;
		TypeOfGift giftType;
		uint32 giftedAtBlock;
		uint40 giftedAtTime;
		bool isClaimed;
		bool isRefunded;
	}

	function getUsersReceivedGiftBatche(
		address user,
		uint256 offsetFromLastGift,
		uint256 amountOfGifts
	) external view returns (Gift[] memory);

	function getUsersGivenGiftBatche(
		address user,
		uint256 offsetFromLastGift,
		uint256 amountOfGifts
	) external view returns (Gift[] memory);
}
