// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

/// @title Events emitted by a GiftyController
/// @notice Contains all events emitted by the GiftyController
interface IGiftyControllerEvents {
	/**
	 * @notice It is emitted when changing the address of the piggyBox.
	 * @param newPiggyBox - new address of the piggyBox
	 */
	event PiggyBoxChanged(address indexed newPiggyBox);

	/**
	 * @notice Emmmited when GFT token changed in Gifty contract
	 * @param newGiftyToken - new token address
	 */
	event GiftyTokenChanged(address newGiftyToken);

	/**
	 * @notice emitted when the minimum price of the gift changes.
	 * @param newMinGiftPrice - New minimum price
	 */
	event MinimumGiftPriceChanged(uint256 newMinGiftPrice);

	/**
	 * @notice Emitted when a new token is added
	 * @param token - address of the newly added token
	 */
	event TokenAdded(address indexed token);

	/**
	 * @notice Emitted when the token is removed from the platform
	 * @param token - address of the deleted token
	 */
	event TokenDeleted(address indexed token);

	/**
	 * @notice Emitted when the PriceFeed changes for the token.
	 * @param token - the token for which priceFeed was changed
	 * @param priceFeed - the PriceFeed that was assigned to this token.
	 */
	event PriceFeedChanged(address indexed token, address indexed priceFeed);

	/**
	 * @notice Emitted when the asset has been sent to piggyBox
	 * @param asset - the asset address that was sent.
	 * @param amount - amount which was sent
	 */
	event AssetTransferedToPiggyBox(address indexed asset, uint256 amount);

	/**
	 * @notice Emitted when changing the gift return settings.
	 *
	 * @param newRefundGiftWithCommissionThreshold - the changed value of the number of blocks before the gift can be returned with a commission.
	 * @param newFreeRefundGiftThreshold - the changed value of the number of blocks after which it becomes possible to return the gift without commission.
	 * @param newGiftRefundCommission - the changed commission that will be charged in case of a refund.
	 */
	event RefundSettingsChanged(
		uint256 newRefundGiftWithCommissionThreshold,
		uint256 newFreeRefundGiftThreshold,
		uint256 newGiftRefundCommission
	);

	/**
	 * @notice The event is emitted when the liquidity pool in the contract changes
	 * @param pool - new pool which added to the contract
	 * @param anotherTokenInPool - Another token in the liquidity pool, relative to which the GFT token price will be calculated
	 * @param secondsAgo - the number of seconds used to get the TWAP price.
	 */
	event UniswapConfigChanged(
		address indexed pool,
		address indexed anotherTokenInPool,
		uint32 secondsAgo
	);

	/**
	 * @notice Emmited when the commissionThresholds changed.

	 * @param t1 - first threshold (gift price can't be less than this value)
	 * @param t2 - second threshold (t1 < giftPrice < t2)
	 * @param t3 - third threshold (t2 < giftPrice < t3)
	 * @param t4 - fourth threshold (t3 < giftPrice < t4)
	 */
	event ComissionThresholdsChanged(uint256 t1, uint256 t2, uint256 t3, uint256 t4);

	/**
	 * @notice Emmited when the rate of full commission changed.
	 *
	 * @param l1 - full commission for t1 < giftPrice <t2
	 * @param l2 - full commission for t2 < giftPrice <t3
	 * @param l3 - full commission for t3 < giftPrice <t4
	 * @param l4 - full commission for t4 < giftPrice
	 */
	event FullCommissionsChanged(uint256 l1, uint256 l2, uint256 l3, uint256 l4);

	/**
	 * @notice Emmited when the rate of full commission changed.
	 *
	 * @param l1 - full commission for t1 < giftPrice <t2
	 * @param l2 - full commission for t2 < giftPrice <t3
	 * @param l3 - full commission for t3 < giftPrice <t4
	 * @param l4 - full commission for t4 < giftPrice
	 */
	event ReducedCommissionsChanged(uint256 l1, uint256 l2, uint256 l3, uint256 l4);
}
