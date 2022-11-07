// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

error PriceConverter__answerDecimalGt18(uint8 decimals);
error PriceConverter__priceIsZero();

library PriceConverter {
	function getPrice(AggregatorV3Interface priceFeed) internal view returns (uint256) {
		(, int256 answer, , , ) = priceFeed.latestRoundData();

		uint8 targetDecimals = 18;

		// Get decimals for this answer
		uint8 decimals = priceFeed.decimals();
		if (decimals > 18) revert PriceConverter__answerDecimalGt18(decimals);

		uint256 result;
		if ((targetDecimals - decimals) == 0) {
			result = uint256(answer);
		} else {
			/*
		      Price in dollars per unit

		        Convert to uint256 to avoid int overflow
		        Convert to 18 decimals
		    */

			result = uint256(answer) * (10**(targetDecimals - decimals));
		}

		if (result == 0) revert PriceConverter__priceIsZero();
		return result;
	}

	function getConversionRate(uint256 currencyAmount, AggregatorV3Interface priceFeed)
		internal
		view
		returns (uint256)
	{
		uint256 currencyPrice = getPrice(priceFeed);
		uint256 usdAmount = (currencyPrice * currencyAmount) / 1e18;

		return usdAmount;
	}
}
