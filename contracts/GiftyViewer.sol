// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IGiftyGetters} from "./interfaces/Gifty/exactInterfaces/IGiftyGetters.sol";

error GiftyViewer__offsetGreaterThanLengthOfTheArray(uint256 offset, uint256 arrayLength);
error GiftyViewer__amountOfElementsGreaterThanRemainingElements();

contract GiftyViewer {
	// Gifty address
	address private immutable i_gifty;

	/// @param gifty Gifty contract address
	constructor(address gifty) {
		i_gifty = gifty;
	}

	/**
	 * @notice Getting desired amount of received gifts with offset of exact user
	 *
	 * @param user - user address
	 * @param offsetFromLastGift - offset
	 * @param amountOfGifts - desired amount of gifs
	 *
	 * @return 1'st array - gift's instance
	 * @return 2'nd array - indexes of gifts in 1'st array
	 */
	function getUsersReceivedGiftBatche(
		address user,
		uint256 offsetFromLastGift,
		uint256 amountOfGifts
	) external view returns (IGiftyGetters.Gift[] memory, uint256[] memory) {
		uint256[] memory currentUserReceivedGifts = (IGiftyGetters(i_gifty).getUserInfo(user))
			.receivedGifts;
		return _getExactGifts(currentUserReceivedGifts, offsetFromLastGift, amountOfGifts);
	}

	/**
	 * @notice Getting desired amount of Given gifts with offset of exact user
	 *
	 * @param user - user address
	 * @param offsetFromLastGift - offset
	 * @param amountOfGifts - desired amount of gifs
	 *
	 * @return 1'st array - gift's instance
	 * @return 2'nd array - indexes of gifts in 1'st array
	 */
	function getUsersGivenGiftBatche(
		address user,
		uint256 offsetFromLastGift,
		uint256 amountOfGifts
	) external view returns (IGiftyGetters.Gift[] memory, uint256[] memory) {
		uint256[] memory currentUserGivenGifts = (IGiftyGetters(i_gifty).getUserInfo(user))
			.givenGifts;
		return _getExactGifts(currentUserGivenGifts, offsetFromLastGift, amountOfGifts);
	}

	function _getExactGifts(
		uint256[] memory userGiftsId,
		uint256 offsetFromLastGift,
		uint256 amountOfGifts
	) internal view returns (IGiftyGetters.Gift[] memory, uint256[] memory) {
		// If offset gt length of the given array - revert
		if (userGiftsId.length < offsetFromLastGift)
			revert GiftyViewer__offsetGreaterThanLengthOfTheArray(
				offsetFromLastGift,
				userGiftsId.length
			);

		// Get index of the first element
		uint256 indexOfFirstDesiredGift = userGiftsId.length - offsetFromLastGift;

		// If amount of elements gt remaining elements - revert
		if (indexOfFirstDesiredGift + amountOfGifts > userGiftsId.length)
			revert GiftyViewer__amountOfElementsGreaterThanRemainingElements();

		// New array, which will be returned
		IGiftyGetters.Gift[] memory result = new IGiftyGetters.Gift[](amountOfGifts);
		uint256[] memory giftsIds = new uint256[](amountOfGifts);

		// Fill the array with desired elements
		for (uint256 i; i < amountOfGifts; i++) {
			uint256 giftIndex = userGiftsId[indexOfFirstDesiredGift + i];

			giftsIds[i] = giftIndex;
			result[i] = IGiftyGetters(i_gifty).getExactGift(giftIndex);
		}

		return (result, giftsIds);
	}

	function getGiftyAddress() external view returns (address) {
		return i_gifty;
	}
}
