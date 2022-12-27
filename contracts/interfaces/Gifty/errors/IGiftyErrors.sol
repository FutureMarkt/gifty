// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IGiftyErrors {
	/**
	 * @notice You are trying to add an account that is not a contract to the list of allowed tokens.
	 * @param nonContract - The address of the account that caused the error. (Not a contract)
	 */
	error Gifty__notAnContract(address nonContract);

	/**
	 * @notice You trying to delete a token that is not in the list of allowed tokens.
	 * @param tokenNotFound - the token that was tried to be deleted
	 */
	error Gifty__NotInList(address tokenNotFound);

	/**
	 * @notice The amount for the gift that you gave is too small,
	 * @notice we cannot calculate the commission from it.
	 *
	 * @param giftAmount - Your amount for the gift
	 * @param minimumAmount - Minimum value
	 */
	error Gifty__ltMinValue(uint256 giftAmount, uint256 minimumAmount);

	/**
	 * @notice You haven't paid, or you don't have enough funds to pay the commission.
	 *
	 * @param yourValue - the amount that you allowed to use the contract / or paid
	 * @param commission - How much did you have to pay
	 */
	error Gifty__commissionNotPayed(uint256 yourValue, uint256 commission);

	/**
	 * @notice The Price Feed for this token was not found, please report it to support
	 * @param token - The address of the token for which PriceFeed was not found
	 */
	error Gifty__priceFeedNotFound(address token);

	/**
	 * @notice The amount specified for the gift is less than the transferred value
	 *
	 * @param giftAmount - how much do you want to give
	 * @param transferredValue - how much did you actually transfer
	 */
	error Gifty__amountLtValue(uint256 giftAmount, uint256 transferredValue);

	/**
	 * @notice You trying to send more than the commission that Gifty earned
	 *
	 * @param amountToSend - the amount you are trying to send
	 * @param totalGiftyCommission - the current earned amount that can be withdrawn
	 */
	error Gifty__earnedAmountLtValue(uint256 amountToSend, uint256 totalGiftyCommission);

	/** @notice You don't have an overpaid amount of ETH. */
	error Gifty__zeroOverpaidAmount();

	/** @notice One of the passed parameters is zero. */
	error Gifty__zeroParam();

	/** @notice The price of your gift is less than the minimum allowable gift price. */
	error Gifty__tooLowGiftPrice(uint256 giftPriceUSD, uint256 minimumGiftPriceUSD);

	/** @notice The lengths of the arrays must match. */
	error Gifty__theLengthsDoNotMatch(uint256 tokensForPriceFeedsLength, uint256 priceFeedsLength);

	/** @notice Giver is receiver (selfgift). */
	error Gifty__giverEqReceiver();

	/** @notice You're trying to take someone else's gift */
	error Gifty__accessDenied();

	/** @notice You are trying to collect a gift that has already been collected */
	error Gifty__alreadyClaimed();

	/** @notice The sender canceled the sending of your gift. */
	error Gifty__alreadyRefunded();

	/**
	 * @notice At the moment there is no way to return the gift.
	 * @notice If the recipient does not pick it up by the time of the free return of the gift,
	 * @notice you will be able to pick it up for free.
	 */
	error Gifty__temporarilyUnavailable();

	/** @notice The asset you want to give as a gift is not supported by the platform at the moment. */
	error Gifty__notSupported(address asset);

	/** @notice Error when calling the balanceOf function. */
	error Gifty__balanceReceivingError();

	/** @notice Returned price from Uniswap oracle equal to zero */
	error Gifty__zeroPriceFromOracle();

	/** @notice You are trying to add a liquidity pool where no token is GFT */
	error Gifty__notWithGFT();

	/** @notice You are trying to add a token that has already been added to the platform. */
	error Gifty__alreadyAdded();

	/** @notice The gift you wanted to access already has a designated receiver. */
	error Gifty__hasReceiver();

	/** @notice The recovered address does not match the gift giver. */
	error Gifty__recoveredAddressDoesNotMatch();

	/** @notice You are trying to give a GiftyToken via giftToken funciton, please do it via giftTokenWithGFTCommission */
	error Gifty__GFTTokenFromSimpleGift();
}
