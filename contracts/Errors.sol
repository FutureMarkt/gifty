// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

/**
 * @notice You are trying to add an account that is not a contract to the list of allowed tokens.
 * @param nonContract - The address of the account that caused the error. (Not a contract)
 */
error Gifty__error_0(address nonContract);

/**
 * @notice You trying to delete a token that is not in the list of allowed tokens.
 *
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

/**
 * @notice You don't have an overpaid amount of ETH.
 */
error Gifty__error_7();
