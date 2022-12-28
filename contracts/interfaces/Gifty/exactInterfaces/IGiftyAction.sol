// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IGiftyAction {
	function giftETH(address receiver, uint256 amount) external payable;

	function giftETHWithGFTCommission(address receiver) external payable;

	function giftToken(address receiver, address tokenToGift, uint256 amount) external;

	function giftTokenWithGFTCommission(
		address receiver,
		address tokenToGift,
		uint256 amount
	) external;

	function claimGift(uint256 giftId) external;

	function claimGiftWithPermit(uint256 giftId, uint8 v, bytes32 r, bytes32 s) external;

	function refundGift(uint256 giftId) external;

	function claimSurplusesETH() external;
}
