// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

/* --------------------ChainLink-------------------- */
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

interface IGiftyController {
	function changeMinimalGiftPrice(uint256 minGiftPrice) external;

	function changePiggyBox(address payable newPiggyBox) external;

	function addTokens(address[] memory tokens, AggregatorV3Interface[] memory priceFeeds)
		external;

	function deleteTokens(address[] calldata tokens) external;

	function changeCommissionRate(uint256 newCommissionRate) external;

	function transferToPiggyBoxTokens(address token, uint256 amount) external;

	function transferToPiggyBoxETH(uint256 amount) external;

	function deleteTokenEmergency(address BeingDeletedToken) external;

	function changePriceFeedsForTokens(
		address[] memory tokens,
		AggregatorV3Interface[] memory priceFeeds
	) external;

	function splitCommission() external;
}
