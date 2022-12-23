// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IPiggyBoxErrors {
	error PiggyBox__oneOfTheAddressIsZero();
	error PiggyBox__incorrectPercentage(uint256 operationPercentage);
	error PiggyBox__incorrectUniswapFee();
	error PiggyBox__decimalsIsZero();
	error PiggyBox__receivedAmountFromSwapEq0();
	error PiggyBox__staticcalFailed();
	error PiggyBox__toLowAmount(uint256 balance, uint256 minimumValue);
	error PiggyBox__tokenBalanceIsZero(address token);
}
