// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

error PriceConverter__answerDecimalGt18(uint8 decimals);
error PriceConverter__callToOracleReverted();
error PriceConverter__priceIsZero();

library PriceConverter {
	function to18Decimals(uint256 value, uint8 currentDecimals) internal pure returns (uint256) {
		// Support only tokens with decimals less than or equal to 18
		if (currentDecimals > 18) revert PriceConverter__answerDecimalGt18(currentDecimals);

		uint256 decimalDiff = 18 - currentDecimals;

		// Saving gas on calculations
		if (decimalDiff == 0) return value;

		// Convert the number to 18 decimals
		return value * (10 ** decimalDiff);
	}

	function getPrice(AggregatorV3Interface priceFeed) internal view returns (uint256) {
		try priceFeed.latestRoundData() returns (uint80, int256 answer, uint256, uint256, uint80) {
			// Get decimals for this answer
			uint8 decimals = priceFeed.decimals();
			uint256 result = to18Decimals(uint256(answer), decimals);

			if (result == 0) revert PriceConverter__priceIsZero();
			return result;
		} catch {
			revert PriceConverter__callToOracleReverted();
		}
	}

	function getConversionRate(
		uint256 currencyAmount,
		AggregatorV3Interface priceFeed
	) internal view returns (uint256) {
		uint256 currencyPrice = getPrice(priceFeed);
		uint256 usdAmount = (currencyPrice * currencyAmount) / 1e18;

		return usdAmount;
	}
}
