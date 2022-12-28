// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

struct GiftRefundSettings {
	uint120 refundGiftWithCommissionThreshold;
	uint120 freeRefundGiftThreshold;
	uint16 giftRefundCommission;
}

struct CommissionThresholds {
	uint64 t1;
	uint64 t2;
	uint64 t3;
	uint64 t4;
}

struct FullComissionRate {
	uint32 l1;
	uint32 l2;
	uint32 l3;
	uint32 l4;
}

struct ReducedComissionRate {
	uint32 l1;
	uint32 l2;
	uint32 l3;
	uint32 l4;
}

struct Commissions {
	FullComissionRate full;
	ReducedComissionRate reduced;
}

interface IGiftyControllerActions {
	function changeGiftyToken(address newGiftyToken, address pool, uint32 secondsAgo) external;

	function changeRefundSettings(GiftRefundSettings memory refundSettings) external;

	function changeCommissionSettings(
		CommissionThresholds memory thresholds,
		Commissions memory commissions
	) external;

	function changeCommissionThresholds(CommissionThresholds memory thresholds) external;

	function changeFeeSettings(Commissions memory commissions) external;

	function changeReducedCommission(ReducedComissionRate memory reducedRate) external;

	function changeFullComission(FullComissionRate memory rateSettings) external;

	function changePiggyBox(address payable newPiggyBox) external;

	function addTokens(address[] memory tokens, address[] memory priceFeeds) external;

	function deleteTokens(address[] calldata tokens) external;

	function changeCommissionRate(uint256 newCommissionRate) external;

	function transferToPiggyBoxTokens(address token, uint256 amount) external;

	function transferToPiggyBoxETH(uint256 amount) external;

	function deleteTokenEmergency(address BeingDeletedToken) external;

	function changePriceFeedsForTokens(
		address[] memory tokens,
		address[] memory priceFeeds
	) external;

	function changeUniswapConfig(address pool, uint32 secondsAgo) external;
}
