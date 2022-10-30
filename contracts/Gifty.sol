// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./interfaces/IGifty.sol";
import "./interfaces/IGiftyToken.sol";

import "./GiftyLibraries/ExternalAccountsInteraction.sol";
import "./GiftyLibraries/PriceConverter.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @notice You are trying to add an account that is not a contract to the list of allowed tokens.
 * @param nonContract - The address of the account that caused the error. (Not a contract)
 */
error Gifty__error_0(address nonContract);

/**
 * @notice It will be thrown when trying to delete a token that is not in the list of allowed tokens.
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

// TODO add to constructor / initializer addToPriceFeed address of ETH: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE

contract Gifty is IGifty, Ownable {
	using ExternalAccountsInteraction for address;
	using ExternalAccountsInteraction for address payable;
	using PriceConverter for uint256;
	using SafeERC20 for IERC20;

	// TODO Without wallet?
	struct Gift {
		address giver;
		TypeOfGift giftType;
		uint256 amount;
	}

	struct FinancialInfo {
		uint256 totalTurnoverInUSD;
		uint256 commissionPayedInUSD;
	}

	// TODO: thats all?
	struct UserInfo {
		uint128 giftCounter;
		uint128 receivedGiftCounter;
		Gift[] notAcceptedGifts;
		FinancialInfo finInfo;
	}

	enum TypeOfCommission {
		ETH,
		GFT_TOKEN,
		TOKEN
	}

	/**
	 * @notice
	 * ETH - Native cryptocurrency of blockchain
	 * FUNGIBLE_TOKEN - Fungigle tokens, backward compatible with ERC-20
	 * NFT - Non-fungible token
	 */
	enum TypeOfGift {
		ETH,
		FUNGIBLE_TOKEN,
		NFT
	}

	/**
	 * @notice The contract to which the EARNED commission from all gifts is transferred.
	 * EARNED - commission after all burning deductions and other manipulations.
	 */
	address private s_piggyBox;

	/// @notice The main token of the platform
	IGiftyToken private s_giftyToken;

	mapping(address => uint256) private s_giftyCommission;

	/**
	 * @notice Mapping of allowed tokens - will return the "true" if the token is in the Gifty project.
	 * address - address of potential token
	 */
	mapping(address => bool) internal s_isTokenAllowed;

	// TODO: Is the gift contained in receiver mapping or gifter?
	mapping(address => mapping(uint256 => Gift)) internal s_userGifts;

	/// @notice All related address information
	mapping(address => UserInfo) internal s_userInformation;

	/// @notice The amount that the user overpaid when giving ETH
	mapping(address => uint256) private s_commissionSurplusesETH;

	/**
	 * @notice To get the price in dollars, we use the Chainlink Data Feeds,
	 * @notice each token has its own contract for displaying the price of tokens in relation to the USD.
	 */
	mapping(address => AggregatorV3Interface) internal s_priceFeeds;

	/// @notice list of all allowed tokens in the Gifty project
	address[] private s_allowedTokens;

	event GiftCreated(
		address indexed giver,
		address indexed receiver,
		TypeOfGift indexed giftType,
		uint256 amount
	);

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

	event SurplusesClaimed(address indexed claimer, uint256 amount);
	event PriceFeedChanged(address indexed token, address indexed priceFeed);

	constructor(IGiftyToken giftyToken, address piggyBox) {
		s_giftyToken = giftyToken;
		s_piggyBox = piggyBox;
	}

	// TODO add reentrancy guard
	function giftETH(address receiver, uint256 amount) external payable {
		_chargeCommission(amount, TypeOfCommission.ETH);
		_createGift(receiver, amount, TypeOfGift.ETH);
	}

	// TODO add reentrancy guard
	function giftETHWithGFTCommission(address receiver) external payable {}

	function giftToken(
		address receiver,
		address tokenToGift,
		address tokenToPayCommission,
		uint256 amount
	) external {}

	function addReceiverAddressToGift(address receiver, uint256 nonce) external {}

	function claimGift(address from, uint256 nonce) external {}

	function claimSurplusesETH() external {
		uint256 surpluses = s_commissionSurplusesETH[msg.sender];
		delete s_commissionSurplusesETH[msg.sender];

		payable(msg.sender).sendETH(surpluses);
		emit SurplusesClaimed(msg.sender, surpluses);
	}

	function _createGift(
		address receiver,
		uint256 amount,
		TypeOfGift giftType
	) internal {
		// uint256 receiverGiftCounter =
		// s_userGifts[receiver] = Gift({giver: msg.sender, giftType: giftType, amount: amount});
		emit GiftCreated(msg.sender, receiver, giftType, amount);
	}

	/************ GETTER FUNCTIONS *************/

	function isTokenAllowed(address token) external view returns (bool) {
		return s_isTokenAllowed[token];
	}

	function getAllowedTokens() external view returns (address[] memory) {
		return s_allowedTokens;
	}

	function getAmountOfAllowedTokens() external view returns (uint256) {
		return s_allowedTokens.length;
	}

	function getUserInfo(address user) external view returns (UserInfo memory) {
		return s_userInformation[user];
	}

	function getPriceFeedForToken(address token) external view returns (AggregatorV3Interface) {
		return s_priceFeeds[token];
	}

	function getOverpaidETHAmount(address user) external view returns (uint256) {
		return s_commissionSurplusesETH[user];
	}

	function getGiftyBalance(address token) external view returns (uint256) {
		return s_giftyCommission[token];
	}

	function version() external pure returns (uint256) {
		return 1;
	}

	/************ COMMISSIONS FUNCTIONS *************/

	function _chargeCommission(uint256 amount, TypeOfCommission commissionType) internal {
		// Get a commission interest rate for the gift.
		(
			uint256 commissionRate, /* uint256 commissionRateGFT */

		) = getCommissionRate();

		if (commissionType == TypeOfCommission.GFT_TOKEN) {
			// TODO commission GFT TOKEN: 25% free
		} else if (commissionType == TypeOfCommission.TOKEN) {
			// TODO commission token - 100% paid from token
		} else {
			if (msg.value < amount) revert Gifty__error_5(amount, msg.value);

			address ETH = _getETHAddress();
			/* 
                When giving ETH and paying commission in ETH - 
                commission it will be charged from the delta, which is calculated by the formula:
                total transferred - the amount of the gift.
                The excess will be returned to the sender.
            */

			uint256 commissionPaid;
			unchecked {
				commissionPaid = msg.value - amount;
			}

			// What is the commission amount for this gift?
			uint256 commissionShouldBePaid = _calculateCommission(amount, commissionRate);

			// Delta less commission? If so, revert.
			if (commissionPaid < commissionShouldBePaid)
				revert Gifty__error_3(commissionPaid, commissionShouldBePaid);
			/*
                Delta more commission? If yes, then let the user then withdraw it.

                * We do not transfer the excess immediately,
                * because the gift can be made through a contract that does not support receiving ETH.
            */
			else if (commissionPaid > commissionShouldBePaid) {
				unchecked {
					s_commissionSurplusesETH[msg.sender] =
						s_commissionSurplusesETH[msg.sender] +
						(commissionPaid - commissionShouldBePaid);
				}
			}

			// We replenish the balance of the Gifty in the amount of the commission.
			unchecked {
				s_giftyCommission[ETH] = s_giftyCommission[ETH] + commissionShouldBePaid;
			}

			// Get price feed (ETH / USD)
			// About this address:
			// https://ethereum.stackexchange.com/questions/87352/why-does-this-address-have-a-balance
			AggregatorV3Interface priceFeedETH = _getPriceFeed(ETH);

			// Calculate and update financial information in dollar terms
			_updateTheUserFinInfo(amount, commissionRate, priceFeedETH);
		}
	}

	function _getPriceFeed(address token) private view returns (AggregatorV3Interface priceFeed) {
		priceFeed = s_priceFeeds[token];
		if (address(priceFeed) == address(0)) revert Gifty__error_4(token);
	}

	function _updateTheUserFinInfo(
		uint256 amount,
		uint256 commissionRate,
		AggregatorV3Interface priceFeed
	) private {
		/*
            Calculate the equivalent of the gift amount and commission in USD,
            for accounting in the personal account and issuing statuses.
        */
		(uint256 giftPriceInUSD, uint256 commissionInUSD) = _calculateGiftPriceAndCommissionInUSD(
			amount,
			commissionRate,
			priceFeed
		);

		// Updating the user's financial information
		FinancialInfo storage currentUserFinInfo = s_userInformation[msg.sender].finInfo;

		unchecked {
			currentUserFinInfo.totalTurnoverInUSD =
				currentUserFinInfo.totalTurnoverInUSD +
				giftPriceInUSD;

			currentUserFinInfo.commissionPayedInUSD =
				currentUserFinInfo.commissionPayedInUSD +
				commissionInUSD;
		}
	}

	function _calculateGiftPriceAndCommissionInUSD(
		uint256 amount,
		uint256 commissionRate,
		AggregatorV3Interface priceFeed
	) internal view returns (uint256 giftPriceInUSD, uint256 commissionInUSD) {
		giftPriceInUSD = amount.getConversionRate(priceFeed);
		commissionInUSD = _calculateCommission(giftPriceInUSD, commissionRate);
	}

	// TODO commission rate? Grades? Roles?
	function getCommissionRate() public pure returns (uint256, uint256) {
		return (100, 75);
	}

	function _calculateCommission(uint256 amount, uint256 commissionRate)
		internal
		pure
		returns (uint256)
	{
		uint256 minimumValue = 10000;
		if (amount < minimumValue) revert Gifty__error_2(amount, minimumValue);

		// Division by 10000 since the decimals is 2
		return (amount * commissionRate) / 10000;
	}

	/************ OWNER'S FUNCTIONS *************/

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

	function deleteTokens(address[] calldata tokens) external onlyOwner {
		for (uint256 i; i < tokens.length; i++) {
			address[] memory allowedTokens = s_allowedTokens;

			// Since token index can be 0
			uint256 tokenIndex = 777;

			// Search for the token index to delete
			for (uint256 j; j < allowedTokens.length; j++) {
				if (allowedTokens[j] == tokens[i]) {
					tokenIndex = j;
					break;
				}
			}

			// If the index is not found, the token is not in the system.
			if (tokenIndex == 777) revert Gifty__error_1(tokens[i]);

			_deleteToken(tokens[i], tokenIndex);
		}
	}

	function changePriceFeedForToken(address token, AggregatorV3Interface aggregatorForToken)
		public
		onlyOwner
	{
		s_priceFeeds[token] = aggregatorForToken;
		emit PriceFeedChanged(token, address(aggregatorForToken));
	}

	function splitCommission() external onlyOwner {}

	/************ PRIVATE FUNCTIONS *************/

	function _getETHAddress() private pure returns (address) {
		return 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
	}

	function _addToken(address token) private {
		// Checking whether the address which are trying to add is a contract?
		if (!token.isContract()) revert Gifty__error_0(token);

		// Change token status and push to array of available tokens
		s_isTokenAllowed[token] = true;
		s_allowedTokens.push(token);

		emit TokenAdded(token);
	}

	function _deleteToken(address tokenToBeDeleted, uint256 tokenIndex) private {
		/*
		  We take the last element in the available tokens
		  and change its place with the token being deleted.
		 */

		uint256 lastElementIndex = s_allowedTokens.length - 1;
		s_allowedTokens[tokenIndex] = s_allowedTokens[lastElementIndex];

		// Delete token from allowedTokensList and change status
		s_allowedTokens.pop();
		delete s_isTokenAllowed[tokenToBeDeleted];

		// Transfer commission to PiggyBox
		IERC20(tokenToBeDeleted).safeTransfer(s_piggyBox, s_giftyCommission[tokenToBeDeleted]);
		delete s_giftyCommission[tokenToBeDeleted];

		emit TokenDeleted(tokenToBeDeleted);
	}
}
