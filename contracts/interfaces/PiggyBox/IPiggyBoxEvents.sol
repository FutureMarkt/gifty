// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

/// @title Events emitted by a PiggyBox
/// @notice Contains all events emitted by the PiggyBox
interface IPiggyBoxEvents {
	event GiftyChanged(address indexed gifty);
	event PiggyBoxFunded(address indexed funder, uint256 amount);
	event SplitSettingsChanged(uint256 mintPercentage, uint256 burnPercentage, uint256 decimals);
	event SwapSettingsChanged(
		address indexed router,
		address indexed weth9,
		address middleToken,
		uint256 swapRateToMiddleToken,
		uint256 swapRateToGFT
	);
	event GiftyTokenChanged(address newGiftyToken);
	event CommissionSplitted(
		address indexed leftoversTo,
		uint256 sentAmount,
		uint256 mintedAmount,
		uint256 burnedAmount
	);
}
