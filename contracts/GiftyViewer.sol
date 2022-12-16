// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IGiftyGetters} from "./interfaces/Gifty/exactInterfaces/IGiftyGetters.sol";

error GiftyViewer__offsetGreaterThanLengthOfTheArray(uint256 offset, uint256 arrayLength);
error GiftyViewer__amountOfElementsGreaterThanRemainingElements();

contract GiftyViewer {
	address private immutable i_gifty;

	constructor(address gifty) {
		i_gifty = gifty;
	}

	function getUsersReceivedGiftBatche(
		address user,
		uint256 offsetFromLastGift,
		uint256 amountOfGifts
	) external view returns (IGiftyGetters.Gift[] memory, uint256[] memory) {
		uint256[] memory currentUserReceivedGifts = (IGiftyGetters(i_gifty).getUserInfo(user))
			.receivedGifts;
		return _getExactGifts(currentUserReceivedGifts, offsetFromLastGift, amountOfGifts);
	}

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
