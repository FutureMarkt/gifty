// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

// ! EXAMPLE
/* -------------------- -------------------- */

/* --------------------Interfaces-------------------- */
import "./interfaces/IGifty.sol";
import "./interfaces/IGiftyToken.sol";

/* --------------------Libs-------------------- */
import "./GiftyLibraries/ExternalAccountsInteraction.sol";
import "./GiftyLibraries/PriceConverter.sol";

/* --------------------Utils-------------------- */
import "./utils/ReentrancyGuard.sol";

/* --------------------OpenZeppelin-------------------- */
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/* --------------------ChainLink-------------------- */
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/* --------------------Error list-------------------- */
import "./Errors.sol";

// TODO add to constructor / initializer addToPriceFeed address of ETH: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE

contract Gifty is IGifty, Ownable, ReentrancyGuard {
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
	address payable private s_piggyBox;

	/// @notice The main token of the platform
	IGiftyToken private s_giftyToken;

	mapping(address => uint256) private s_giftyCommission;

	/**
	 * @notice Mapping of allowed tokens - will return the "true" if the token is in the Gifty project.
	 * address - address of potential token
	 */

	struct TokenInfo {
		uint248 indexInTheArray;
		bool isTokenAllowed;
	}

	mapping(address => TokenInfo) internal s_tokenInfo;

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

	event TokenTransferedToPiggyBox(address indexed token, uint256 amount);
	event ETHTransferedToPiggyBox(uint256 amount);

	constructor(IGiftyToken giftyToken, address payable piggyBox) {
		s_giftyToken = giftyToken;
		s_piggyBox = piggyBox;
	}

	function giftETH(address receiver, uint256 amount) external payable nonReentrant {
		// TODO to be tested 1
		_chargeCommission(amount, TypeOfCommission.ETH);
		_createGift(receiver, amount, TypeOfGift.ETH);
	}

	function giftETHWithGFTCommission(address receiver) external payable nonReentrant {}

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
		if (surpluses == 0) revert Gifty__error_7();

		// TODO test reentrancy
		delete s_commissionSurplusesETH[msg.sender];

		payable(msg.sender).sendETH(surpluses);
		emit SurplusesClaimed(msg.sender, surpluses);
	}

	/* --------------------OnlyOwner functions-------------------- */

	function changeCommissionRate(uint256 newCommissionRate) external onlyOwner {}

	function changePiggyBox(address payable newPiggyBox) external onlyOwner {
		// TODO to be tested
		s_piggyBox = newPiggyBox;
		emit PiggyBoxChanged(newPiggyBox);
	}

	function transferToPiggyBoxTokens(address token, uint256 amount) external onlyOwner {
		// TODO to be tested
		_transferToPiggyBoxTokens(token, amount);
	}

	function transferToPiggyBoxETH(uint256 amount) external onlyOwner {
		// TODO to be tested
		_transferToPiggyBoxETH(amount);
	}

	function addTokens(address[] calldata tokens) external onlyOwner {
		for (uint256 i; i < tokens.length; i++) {
			_addToken(tokens[i]);
		}
	}

	function deleteTokens(address[] calldata tokens) external onlyOwner {
		for (uint256 i; i < tokens.length; i++) {
			_deleteToken(tokens[i]);

			// TODO write tests to transfered commission (tokens)
			// Transfer commission to PiggyBox
			_transferToPiggyBoxTokens(tokens[i], s_giftyCommission[tokens[i]]);
		}
	}

	function deleteTokenEmergency(address BeingDeletedToken) external onlyOwner {
		_deleteToken(BeingDeletedToken);
	}

	function changePriceFeedForToken(address token, AggregatorV3Interface aggregatorForToken)
		public
		onlyOwner
	{
		s_priceFeeds[token] = aggregatorForToken;
		emit PriceFeedChanged(token, address(aggregatorForToken));
	}

	function splitCommission() external onlyOwner {}

	/* --------------------Internal functions-------------------- */

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
					s_commissionSurplusesETH[msg.sender] += (commissionPaid -
						commissionShouldBePaid);
				}
			}

			// We replenish the balance of the Gifty in the amount of the commission.
			unchecked {
				s_giftyCommission[ETH] += commissionShouldBePaid;
			}

			// Get price feed (ETH / USD)
			// About this address:
			// https://ethereum.stackexchange.com/questions/87352/why-does-this-address-have-a-balance
			AggregatorV3Interface priceFeedETH = _getPriceFeed(ETH);

			// Calculate and update financial information in dollar terms
			_updateTheUserFinInfo(amount, commissionRate, priceFeedETH);
		}
	}

	function _getPriceFeed(address token) internal view returns (AggregatorV3Interface priceFeed) {
		priceFeed = s_priceFeeds[token];
		if (address(priceFeed) == address(0)) revert Gifty__error_4(token);
	}

	function _updateTheUserFinInfo(
		uint256 amount,
		uint256 commissionRate,
		AggregatorV3Interface priceFeed
	) internal {
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
			currentUserFinInfo.totalTurnoverInUSD += giftPriceInUSD;
			currentUserFinInfo.commissionPayedInUSD += commissionInUSD;
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
	/**
	 * @dev Return values of the commission rate with decimals 2
	 *
	 * @return uint256 - The usual commission rate
	 * @return uint256 - Reduced commission rate when the user pays in GFT tokens.
	 */
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

		uint256 decimals = 2;
		return (amount * commissionRate) / (100 * 10**decimals);
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

	/* --------------------Private functions-------------------- */

	function _getETHAddress() private pure returns (address) {
		return 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
	}

	function _addToken(address token) private {
		// Checking whether the address which are trying to add is a contract?
		if (!token.isContract()) revert Gifty__error_0(token);

		// The current length is the future index for the added token
		uint256 newIndex = s_allowedTokens.length;

		// Push token to the array of allowed tokens and set token information
		s_allowedTokens.push(token);
		s_tokenInfo[token] = TokenInfo({isTokenAllowed: true, indexInTheArray: uint248(newIndex)});

		emit TokenAdded(token);
	}

	function _deleteToken(address BeingDeletedToken) private {
		// Get the index of the token being deleted
		TokenInfo memory tokenBeingDeletedInfo = s_tokenInfo[BeingDeletedToken];

		// Is there a token in the system at the moment? If not revert
		if (!tokenBeingDeletedInfo.isTokenAllowed) revert Gifty__error_1(BeingDeletedToken);

		/*
		  We take the last element in the available tokens
		  and change its place with the token being deleted.
		 */
		uint256 lastElementIndex = s_allowedTokens.length - 1;

		// The address of the token that will take the place of the token to be deleted
		address tokenToSwap = s_allowedTokens[lastElementIndex];

		// Replacing the token in the array
		s_allowedTokens[tokenBeingDeletedInfo.indexInTheArray] = tokenToSwap;

		// Changing the index of the token in its information
		s_tokenInfo[tokenToSwap].indexInTheArray = tokenBeingDeletedInfo.indexInTheArray;

		// Delete the last element in the array (tokenToSwap), since it took the place of the deleted token
		s_allowedTokens.pop();
		delete s_tokenInfo[BeingDeletedToken];

		emit TokenDeleted(BeingDeletedToken);
	}

	function _transferToPiggyBoxTokens(address token, uint256 amount) private {
		uint256 giftyCommissionBalance = s_giftyCommission[token];
		if (amount > giftyCommissionBalance) revert Gifty__error_6(amount, giftyCommissionBalance);

		IERC20(token).safeTransfer(s_piggyBox, amount);

		// unchecked - since the above was a check that the balance is greater than the amount being transferred
		unchecked {
			s_giftyCommission[token] -= amount;
		}

		emit TokenTransferedToPiggyBox(token, amount);
	}

	function _transferToPiggyBoxETH(uint256 amount) private {
		address ETH = _getETHAddress();

		uint256 giftyCommissionBalance = s_giftyCommission[ETH];
		if (amount > giftyCommissionBalance) revert Gifty__error_6(amount, giftyCommissionBalance);

		s_piggyBox.sendETH(amount);

		// unchecked - since the above was a check that the balance is greater than the amount being transferred
		unchecked {
			s_giftyCommission[ETH] -= amount;
		}

		emit ETHTransferedToPiggyBox(amount);
	}

	/* --------------------Getter functions-------------------- */

	function getTokenInfo(address token) external view returns (TokenInfo memory) {
		return s_tokenInfo[token];
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
}
