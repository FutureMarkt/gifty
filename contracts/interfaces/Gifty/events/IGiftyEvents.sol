// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IGiftyControllerEvents} from "./IGiftyControllerEvents.sol";

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
}
