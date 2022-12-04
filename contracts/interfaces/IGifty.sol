// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./IGiftyController.sol";

interface IGifty is IGiftyController {
	function giftETH(address receiver, uint256 amount) external payable;

	function giftETHWithGFTCommission(address receiver) external payable;

	function giftToken(address receiver, address tokenToGift, uint256 amount) external;

	function giftTokenWithGFTCommission(
		address receiver,
		address tokenToGift,
		uint256 amount
	) external;

	function claimGift(uint256 giftId) external;

	function refundGift(uint256 giftId) external;

	function claimSurplusesETH() external;

	function version() external pure returns (uint256);
}
