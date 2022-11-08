// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

/* --------------------Interfaces-------------------- */
import "./interfaces/IGiftyController.sol";
import "./interfaces/IGiftyToken.sol";

/* --------------------Libs-------------------- */
import "./GiftyLibraries/ExternalAccountsInteraction.sol";

/* --------------------OpenZeppelin-------------------- */
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/* --------------------ChainLink-------------------- */
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/* --------------------Error list-------------------- */
import "./Errors.sol";

contract GiftyController is IGiftyController, Ownable {
	using ExternalAccountsInteraction for address;
	using ExternalAccountsInteraction for address payable;
	using SafeERC20 for IERC20;
	using SafeCast for uint256;

	/**
	 * @notice Information about each token
	 * @notice indexInTheArray - position in s_allowedTokens
	 * @notice isTokenAllowed - is token in system
	 */
	struct TokenInfo {
		uint248 indexInTheArray; //--|
		bool isTokenAllowed; //    --|
	}

	// TODO add comments
	struct GiftRefundSettings {
		uint120 refundGiftWithCommissionThreshold; // 15 bytes -|
		uint120 freeRefundGiftThreshold; // 15 bytes -----------|
		uint16 giftRefundCommission; // 2 bytes ----------------|
	}

	GiftRefundSettings internal s_giftRefundSettings;

	/** @notice The main token of the platform */
	IGiftyToken internal s_giftyToken;

	/**
	 * @notice The contract to which the EARNED* commission from all gifts is transferred.
	 * @notice EARNED - commission after all burning deductions and other manipulations.
	 */
	address payable private s_piggyBox;

	/** @notice minimum gift price in USD */
	uint96 internal s_minGiftPriceInUsd;

	/** @notice list of all allowed tokens in the Gifty project */
	address[] internal s_allowedTokens;

	/**
	 * @notice Mapping of allowed tokens - will return the "true" if the token is in the Gifty project.
	 * @notice address - address of potential token
	 */
	mapping(address => TokenInfo) internal s_tokenInfo;

	/**
	 * @notice To get the price in usd, we use the Chainlink Data Feeds,
	 * @notice each token has its own contract for displaying the price of tokens in relation to the USD.
	 */
	mapping(address => AggregatorV3Interface) internal s_priceFeeds;

	/**
	 * @notice We save the amount of each token the contract received as a commission.
	 * @notice key - token address
	 * @notice value - received commission
	 */
	mapping(address => uint256) internal s_giftyCommission;

	/**
	 * @notice It is emitted when changing the address of the piggyBox.
	 * @param newPiggyBox - new address of the piggyBox
	 */
	event PiggyBoxChanged(address indexed newPiggyBox);

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
	 * @notice Emitted when the tokens has been sent to piggyBox
	 * @param token - the token that was sent.
	 * @param amount - number of tokens sent
	 */
	event TokenTransferedToPiggyBox(address indexed token, uint256 amount);

	/**
	 * @notice Emitted when the ETH has been sent to piggyBox
	 * @param amount - number of tokens sent
	 */
	event ETHTransferedToPiggyBox(uint256 amount);

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
	 * @notice It is used to compare the lengths of two arrays,
	 * @notice if they are not equal it gives an error.
	 *
	 * @param a - length of first array
	 * @param b - length of second array
	 */
	modifier compareLengths(uint256 a, uint256 b) {
		if (a != b) revert Gifty__error_10(a, b);
		_;
	}

	/**
	 * @param giftyToken - native platform token.
	 * @param piggyBox - contract that will receive the earned funds.
	 * @param minGiftPriceInUsd - the minimum price of a gift in dollars.
	 *
	 * @param tokensToBeAdded - array of token addresses that will be initially added to the contract.
	 * @param priceFeeds - array of priceFeeds for tokens that will be initially added to the contract.
	 *
	 * @dev The number of array elements in tokensToBeAdded and priceFeeds must be identical.
	 *
	 * TODO change to INITIALIZER in upgradeable version
	 */
	constructor(
		IGiftyToken giftyToken,
		address payable piggyBox,
		uint256 minGiftPriceInUsd,
		address[] memory tokensToBeAdded,
		AggregatorV3Interface[] memory priceFeeds,
		AggregatorV3Interface priceFeedForETH,
		uint256 refundGiftWithCommissionThreshold,
		uint256 freeRefundGiftThreshold,
		uint256 giftRefundCommission
	) {
		// The address must not be zero address
		if (address(giftyToken) == address(0)) revert Gifty__error_8();
		s_giftyToken = giftyToken;

		changeRefundSettings(
			refundGiftWithCommissionThreshold,
			freeRefundGiftThreshold,
			giftRefundCommission
		);
		changeMinimalGiftPrice(minGiftPriceInUsd);
		changePiggyBox(piggyBox);
		addTokens(tokensToBeAdded, priceFeeds);
		_changePriceFeedForToken(_getETHAddress(), priceFeedForETH);
	}

	function changeRefundSettings(
		uint256 refundGiftWithCommissionThreshold,
		uint256 freeRefundGiftThreshold,
		uint256 giftRefundCommission
	) public onlyOwner {
		if (
			refundGiftWithCommissionThreshold == 0 ||
			freeRefundGiftThreshold == 0 ||
			giftRefundCommission == 0
		) revert Gifty__error_8();

		s_giftRefundSettings = GiftRefundSettings(
			refundGiftWithCommissionThreshold.toUint120(),
			freeRefundGiftThreshold.toUint120(),
			giftRefundCommission.toUint16()
		);

		emit RefundSettingsChanged(
			refundGiftWithCommissionThreshold,
			freeRefundGiftThreshold,
			giftRefundCommission
		);
	}

	/**
	 * @notice Changes the minimum price of the gift.
	 * @notice aviable only for owner.
	 *
	 * @param minGiftPrice - new minimal gift price.
	 */
	function changeMinimalGiftPrice(uint256 minGiftPrice) public onlyOwner {
		// TODO to be tested
		if (minGiftPrice == 0) revert Gifty__error_8();

		s_minGiftPriceInUsd = minGiftPrice.toUint96();
		emit MinimumGiftPriceChanged(minGiftPrice);
	}

	function changePiggyBox(address payable newPiggyBox) public onlyOwner {
		// TODO to be tested
		if (newPiggyBox == address(0)) revert Gifty__error_8();

		s_piggyBox = newPiggyBox;
		emit PiggyBoxChanged(newPiggyBox);
	}

	function addTokens(address[] memory tokens, AggregatorV3Interface[] memory priceFeeds)
		public
		onlyOwner
		// The lengths of the arrays must match since each token must be assigned a price feed
		compareLengths(tokens.length, priceFeeds.length)
	{
		for (uint256 i; i < tokens.length; i++) {
			_addToken(tokens[i]);
			_changePriceFeedForToken(tokens[i], priceFeeds[i]);
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

	function changeCommissionRate(uint256 newCommissionRate) external onlyOwner {}

	function transferToPiggyBoxTokens(address token, uint256 amount) external onlyOwner {
		// TODO to be tested
		_transferToPiggyBoxTokens(token, amount);
	}

	function transferToPiggyBoxETH(uint256 amount) external onlyOwner {
		// TODO to be tested
		_transferToPiggyBoxETH(amount);
	}

	function deleteTokenEmergency(address BeingDeletedToken) external onlyOwner {
		_deleteToken(BeingDeletedToken);
	}

	function changePriceFeedsForTokens(
		address[] memory tokens,
		AggregatorV3Interface[] memory priceFeeds
	)
		external
		// The lengths of the arrays must match since each token must be assigned a price feed
		compareLengths(tokens.length, priceFeeds.length)
	{
		for (uint256 i; i < tokens.length; i++) {
			_changePriceFeedForToken(tokens[i], priceFeeds[i]);
		}
	}

	function splitCommission() external onlyOwner {}

	/* --------------------Internal functions-------------------- */
	function _getPriceFeed(address token) internal view returns (AggregatorV3Interface priceFeed) {
		priceFeed = s_priceFeeds[token];
		if (address(priceFeed) == address(0)) revert Gifty__error_4(token);
	}

	/* --------------------Private functions-------------------- */
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

	function _changePriceFeedForToken(address token, AggregatorV3Interface aggregatorForToken)
		private
	{
		if (token == address(0) || address(aggregatorForToken) == address(0))
			revert Gifty__error_8();

		s_priceFeeds[token] = aggregatorForToken;
		emit PriceFeedChanged(token, address(aggregatorForToken));
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

	function _getETHAddress() internal pure returns (address) {
		return 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
	}

	/* --------------------Getter functions-------------------- */

	function getGiftyToken() external view returns (IGiftyToken) {
		return s_giftyToken;
	}

	function getPiggyBox() external view returns (address) {
		return s_piggyBox;
	}

	function getGiftyBalance(address token) external view returns (uint256) {
		return s_giftyCommission[token];
	}

	function getMinGiftPrice() external view returns (uint256) {
		return s_minGiftPriceInUsd;
	}

	function getTokenInfo(address token) external view returns (TokenInfo memory) {
		return s_tokenInfo[token];
	}

	function getAllowedTokens() external view returns (address[] memory) {
		return s_allowedTokens;
	}

	function getAmountOfAllowedTokens() external view returns (uint256) {
		return s_allowedTokens.length;
	}

	function getPriceFeedForToken(address token) external view returns (AggregatorV3Interface) {
		return s_priceFeeds[token];
	}
}
