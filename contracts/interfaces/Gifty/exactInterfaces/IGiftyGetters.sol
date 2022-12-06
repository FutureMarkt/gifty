// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";

interface IGiftyGetters {
	enum TypeOfGift {
		DEFAULT,
		ETH,
		FT
	}

	struct FinancialInfo {
		uint128 totalTurnoverInUSD;
		uint128 commissionPayedInUSD;
	}

	struct UserInfo {
		uint256[] givenGifts;
		uint256[] receivedGifts;
		FinancialInfo finInfo;
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

	function getCommissionRate() external pure returns (uint256, uint256);

	function getGiftsAmount() external view returns (uint256);

	function getAllGifts() external view returns (Gift[] memory);

	function getExactGift(uint256 giftId) external view returns (Gift memory);

	function getOverpaidETHAmount(address user) external view returns (uint256);

	function getUserInfo(address user) external view returns (UserInfo memory);

	function version() external pure returns (uint256);
}
