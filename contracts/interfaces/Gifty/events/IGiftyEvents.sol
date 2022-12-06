// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IGiftyControllerEvents} from "./IGiftyControllerEvents.sol";

struct CommissionThresholds {
	uint64 threshold1;
	uint64 threshold2;
	uint64 threshold3;
	uint64 threshold4;
}

struct CommissionSizes {
	uint64 size1;
	uint64 size2;
	uint64 size3;
	uint64 size4;
}

interface IGiftyEvents is IGiftyControllerEvents {
	/**
	 * @notice Emmited when giving a gift
	 
     * @param giver - Who gave the gift
	 * @param receiver - Who the gift is intended for
	 * @param giftedAsset - What was presented? ETH - address(e)
	 * @param amount - How many giftedAssets were given
	 * @param giftId - The index of the gift in the array of all gifts
	 */
	event GiftCreated(
		address indexed giver,
		address indexed receiver,
		address indexed giftedAsset,
		uint256 amount,
		uint256 giftId
	);

	/**
	 * @notice Emitted when a gift is received
	 * @param giftId - The index of the gift in the array of all gifts
	 */
	event GiftClaimed(uint256 giftId);

	/**
	 * @notice Emmited when the user has taken the surplus of the paid ETH
	 *
	 * @param claimer - Who took the surplus
	 * @param amount - How much of the surplus was taken
	 */
	event SurplusesClaimed(address indexed claimer, uint256 amount);

	/**
	 * @notice Emeitted when the giver has refund his gift back.
	 * @param giftId - Index of the gift that was withdrawn
	 */
	event GiftRefunded(uint256 giftId);

	/**
	 * @notice Emmited when the commissionThresholds changed.
	 *
	 * @param threshold1 -
	 * @param threshold2 -
	 * @param threshold3 -
	 * @param threshold4 -
	 */
	event ComissionThresholdsChanged(
		uint256 threshold1,
		uint256 threshold2,
		uint256 threshold3,
		uint256 threshold4
	);

	/**
	 * @notice Emmited when the commissionSizes changed.
	 *
	 * @param size1 -
	 * @param size2 -
	 * @param size3 -
	 * @param size4 -
	 */
	event ComissionSizesChanged(uint256 size1, uint256 size2, uint256 size3, uint256 size4);
}
