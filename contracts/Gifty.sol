// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./interfaces/IGifty.sol";
import "./interfaces/IGiftyToken.sol";

import "./GiftyLibraries/ExternalAccountsInteraction.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";

error Gifty__youAreTryingToAddANonContractToTheAllowedTokens(address nonContract);
error Gifty__attemptToAccessAnElementAtAnOutOfBoundsOfArray(uint256 givenIndex, uint256 lastIndex);

contract Gifty is IGifty, Ownable {
	using ExternalAccountsInteraction for address;

	/**
	 * @notice The contract to which the EARNED commission from all gifts is transferred.
	 * EARNED - commission after all burning deductions and other manipulations.
	 */
	address private s_piggyBox;

	/// @notice The main token of the platform
	IGiftyToken private s_giftyToken;

	/**
	 * @notice Mapping of allowed tokens - will return the "true" if the token is in the Gifty project.
	 * address - address of potential token
	 */
	mapping(address => bool) private s_isTokenAllowed;

	/// @notice list of all allowed tokens in the Gifty project
	address[] private s_allowedTokens;

	/**
	 * @notice It is emitted when changing the address of the piggyBox.
	 * @param newPiggyBox - new address of the piggyBox
	 */
	event PiggyBoxChanged(address indexed newPiggyBox);

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

	function giftETH(address receiver, uint256 amount) external payable {}

	function giftETHWithGFTCommission(address receiver) external payable {}

	function giftToken(
		address receiver,
		address tokenToGift,
		address tokenToPayCommission,
		uint256 amount
	) external {}

	function claimGift(address from, uint256 nonce) external {}

	function addReceiverAddressToGift(address receiver, uint256 nonce) external {}

	function changeCommissionRate(uint256 newCommissionRate) external onlyOwner {}

	function changePiggyBox(address newPiggyBox) external onlyOwner {
		s_piggyBox = newPiggyBox;
		emit PiggyBoxChanged(newPiggyBox);
	}

	function addTokens(address[] calldata tokens) external onlyOwner {
		uint256 amountOfTokens = tokens.length;

		for (uint256 i; i < amountOfTokens; i++) {
			_addToken(tokens[i]);
		}
	}

	function deleteTokens(uint256[] calldata tokenIndexes) external onlyOwner {
		uint256 amountOfTokens = tokenIndexes.length;

		for (uint256 i; i < amountOfTokens; i++) {
			_deleteToken(tokenIndexes[i]);
		}
	}

	function splitCommission() external onlyOwner {}

	function isTokenAllowed(address token) external view returns (bool) {
		return s_isTokenAllowed[token];
	}

	function getAllowedTokens() external view returns (address[] memory) {
		return s_allowedTokens;
	}

	function getAmountOfAllowedTokens() external view returns (uint256) {
		return s_allowedTokens.length;
	}

	function version() external pure returns (uint256) {
		return 1;
	}

	function _addToken(address token) private {
		// Checking whether the address which are trying to add is a contract?
		if (!token.isContract())
			revert Gifty__youAreTryingToAddANonContractToTheAllowedTokens(token);

		// Change token status and push to array of available tokens
		s_isTokenAllowed[token] = true;
		s_allowedTokens.push(token);

		emit TokenAdded(token);
	}

	function _deleteToken(uint256 index) private {
		/*
		  We take the last element in the available tokens
		  and change its place with the token being deleted.
		 */
		uint256 lastElementIndex = s_allowedTokens.length - 1;

		if (index > lastElementIndex)
			revert Gifty__attemptToAccessAnElementAtAnOutOfBoundsOfArray(index, lastElementIndex);

		address tokenAddress = s_allowedTokens[index];
		s_allowedTokens[index] = s_allowedTokens[lastElementIndex];

		// Delte token status and from list of available tokens
		s_allowedTokens.pop();
		delete s_isTokenAllowed[tokenAddress];

		emit TokenDeleted(tokenAddress);
	}
}
