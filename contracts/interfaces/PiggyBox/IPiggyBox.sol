// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IPiggyBoxErrors} from "./IPiggyBoxErrors.sol";
import {IPiggyBoxEvents} from "./IPiggyBoxEvents.sol";

struct SplitSettings {
	uint16 mintPercentage;
	uint16 burnPercentage;
	uint8 decimals;
}

struct SwapSettings {
	address router;
	address weth9;
	address middleToken;
	uint24 swapFeeToMiddleToken;
	uint24 swapFeeToGFT;
}

/// @title Interface of PiggyBox
interface IPiggyBox is IPiggyBoxErrors, IPiggyBoxEvents {
	function initialize() external;

	function setSettings(
		address gifty,
		address giftyToken,
		SplitSettings memory splitSettings,
		SwapSettings memory swapSettings
	) external;

	function changeGiftyToken(address newGiftyToken) external;

	function changeGifty(address gifty) external;

	function changeSplitSettings(SplitSettings memory splitSettings) external;

	function changeSwapSettings(SwapSettings memory swapSettings) external;

	function splitEarnedCommission(
		address[] memory tokensToBeSwapped,
		address leftoversTo
	) external;

	function getGiftyAddress() external view returns (address);

	function getGiftyTokenAddress() external view returns (address);

	function getSplitSettings() external view returns (SplitSettings memory);

	function getSwapSettings() external view returns (SwapSettings memory);
}
