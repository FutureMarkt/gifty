// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

/// @notice You are trying to re-entry in to the Gifty contract.
error ReentrancyGuard__reentrantCall();

/**
 * @title Contract module that helps prevent reentrant calls to a function.
 *
 * @notice This contract is based on the OpenZeppelin contract (https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/security/ReentrancyGuard.sol)
 * @notice with the only difference - it uses a custom error instead of require with text.
 *
 * @notice For more details, see the OpenZeppelin documentation.
 */
abstract contract ReentrancyGuard {
	uint256 private _NOT_ENTERED = 1;
	uint256 private _ENTERED = 2;

	uint256 private _status;

	constructor() {
		_status = _NOT_ENTERED;
	}

	/**
	 * If the status is currently _ENTERED,
	 * then a re-entry attack attempt will be issued and an error will be reverted.
	 */
	modifier nonReentrant() {
		// On the first call to nonReentrant, _notEntered, status will be _NOT_ENTERED.
		if (_status == _ENTERED) revert ReentrancyGuard__reentrantCall();

		// Any calls to nonReentrant after this point will fail
		_status = _ENTERED;

		_;

		// By storing the original value once again, a refund is triggered (see
		// https://eips.ethereum.org/EIPS/eip-2200)
		_status = _NOT_ENTERED;
	}
}
