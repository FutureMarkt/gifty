// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IGiftyErrors {
	/**
	 * @notice You are trying to add an account that is not a contract to the list of allowed tokens.
	 * @param nonContract - The address of the account that caused the error. (Not a contract)
	 */
	error Gifty__error_0(address nonContract);

	/**
	 * @notice You trying to delete a token that is not in the list of allowed tokens.
	 * @param tokenNotFound - the token that was tried to be deleted
	 */
	error Gifty__error_1(address tokenNotFound);

	/**
	 * @notice The amount for the gift that you gave is too small,
	 * @notice we cannot calculate the commission from it.
	 *
	 * @param giftAmount - Your amount for the gift
	 * @param minimumAmount - Minimum value
	 */
	error Gifty__error_2(uint256 giftAmount, uint256 minimumAmount);

	/**
	 * @notice You haven't paid, or you don't have enough funds to pay the commission.
	 *
	 * @param yourValue - the amount that you allowed to use the contract / or paid
	 * @param commission - How much did you have to pay
	 */
	error Gifty__error_3(uint256 yourValue, uint256 commission);

	/**
	 * @notice The Price Feed for this token was not found, please report it to support
	 * @param token - The address of the token for which PriceFeed was not found
	 */
	error Gifty__error_4(address token);

	/**
	 * @notice The amount specified for the gift is less than the transferred value
	 *
	 * @param giftAmount - how much do you want to give
	 * @param transferredValue - how much did you actually transfer
	 */
	error Gifty__error_5(uint256 giftAmount, uint256 transferredValue);

	/**
	 * @notice You trying to send more than the commission that Gifty earned
	 *
	 * @param amountToSend - the amount you are trying to send
	 * @param totalGiftyCommission - the current earned amount that can be withdrawn
	 */
	error Gifty__error_6(uint256 amountToSend, uint256 totalGiftyCommission);

	/** @notice You don't have an overpaid amount of ETH. */
	error Gifty__error_7();

	/** @notice One of the passed parameters is zero. */
	error Gifty__error_8();

	/** @notice The price of your gift is less than the minimum allowable gift price. */
	error Gifty__error_9(uint256 giftPriceUSD, uint256 minimumGiftPriceUSD);

	/** @notice The lengths of the priceFeeds and tokensForPriceFeeds arrays must match. */
	error Gifty__error_10(uint256 tokensForPriceFeedsLength, uint256 priceFeedsLength);

	/** @notice Giver is receiver (selfgift). */
	error Gifty__error_11();

	/** @notice You're trying to take someone else's gift */
	error Gifty__error_12();

	/** @notice You are trying to collect a gift that has already been collected */
	error Gifty__error_13();

	/** @notice The sender canceled the sending of your gift. */
	error Gifty__error_14();

	/**
	 * @notice At the moment there is no way to return the gift.
	 * @notice If the recipient does not pick it up by the time of the free return of the gift,
	 * @notice you will be able to pick it up for free.
	 */
	error Gifty__error_15();

	/** @notice The asset you want to give as a gift is not supported by the platform at the moment. */
	error Gifty__error_16(address asset);

	/**
	 * @notice Offset from last element gt gifts array length
	 *
	 * @param offset - offset from end of the array
	 * @param arrayLength - current gifts array length
	 */
	error Gifty__error_17(uint256 offset, uint256 arrayLength);

	/** @notice The number of remaining gifts is less than the number of desired gifts. */
	error Gifty__error_18();

	/** @notice Error when calling the get balance function. */
	error Gifty__error_19();

	/** @notice Variable with pool address equal to zero */
	error Gifty__error_20();

	/** @notice Returned new pool address is equal to zero */
	error Gifty__error_21();

	/** @notice Returned price from Uniswap oracle equal to zero */
	error Gifty__error_22();

	/** @notice You are trying to add a liquidity pool where no token is GFT */
	error Gifty__error_23();

	/** @notice You are trying to add a token that has already been added to the platform. */
	error Gifty__error_24();

	/** @notice The gift you wanted to access already has a designated receiver. */
	error Gifty__error_25();

	/** @notice The recovered address does not match the gift giver. */
	error Gifty__error_26();

	/** @notice You are trying to give a GiftyToken via giftToken funciton, please do it via giftTokenWithGFTCommission */
	error Gifty__error_27();

	error Gifty__incorrectPercentage(uint256 operationPercentage);
}
