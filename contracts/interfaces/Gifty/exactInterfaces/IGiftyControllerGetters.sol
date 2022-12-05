// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IGiftyControllerGetters {
	struct TokenInfo {
		uint248 indexInTheArray;
		bool isTokenAllowed;
	}

	struct GiftRefundSettings {
		uint120 refundGiftWithCommissionThreshold;
		uint120 freeRefundGiftThreshold;
		uint16 giftRefundCommission;
	}

	struct UniswapOracleConfig {
		address pool;
		address anotherTokenInPool;
		uint32 secondsAgo;
	}

	function getGiftyToken() external view returns (address);

	function getPiggyBox() external view returns (address);

	function getTokenInfo(address token) external view returns (TokenInfo memory);

	function getMinimalGiftPrice() external view returns (uint256);

	function getRefundSettings() external view returns (GiftRefundSettings memory);

	function getGiftyEarnedCommission(address asset) external view returns (uint256);

	function getAllowedTokens() external view returns (address[] memory);

	function getAmountOfAllowedTokens() external view returns (uint256);

	function getPriceFeedForToken(address token) external view returns (address);

	function getUniswapConfig() external view returns (UniswapOracleConfig memory);
}
