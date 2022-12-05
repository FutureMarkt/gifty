// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

/* Interfaces */
import {IGiftyEvents, IGiftyErrors} from "./interfaces/Gifty/IGifty.sol";
import {IGiftyToken} from "./interfaces/IGiftyToken.sol";

/* External contracts interfaces */
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {IUniswapV3PoolImmutables} from "@uniswap/v3-core/contracts/interfaces/pool/IUniswapV3PoolImmutables.sol";

/* External contracts */
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/* Libraries */
import {ExternalAccountsInteraction} from "./GiftyLibraries/ExternalAccountsInteraction.sol";

/* External libraries */
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

abstract contract GiftyController is IGiftyEvents, IGiftyErrors, Ownable, Initializable {
	using ExternalAccountsInteraction for address;
	using ExternalAccountsInteraction for address payable;
	using SafeERC20 for IERC20;
	using SafeCast for uint256;

	// Information about each token
	struct TokenInfo {
		uint248 indexInTheArray; // 31 bytes --| position in the array of all allowed tokens
		bool isTokenAllowed; // 1 byte --------| is token allowed
	}

	// Gift refund settings used in the contract.
	struct GiftRefundSettings {
		uint120 refundGiftWithCommissionThreshold; // 15 bytes -| The number of blocks after the gift is given, when the giver can refund the gift with commission.
		uint120 freeRefundGiftThreshold; // 15 bytes -----------| The number of blocks after which the giver can refund the gift for free.
		uint16 giftRefundCommission; // 2 bytes ----------------| The amount of commission in percent, which will be taken in case of refunding a gift with commission
	}

	// TODO write comments
	struct UniswapOracleConfig {
		address pool;
		address anotherTokenInPool;
		uint32 secondsAgo;
	}

	// list of all allowed tokens in the Gifty project
	address[] internal s_allowedTokens;

	// Each token allowed for gift has its own structure of information.
	mapping(address => TokenInfo) internal s_tokenInfo; /* Address of token  => TokenInfo */

	// The main token of the Gifty
	address internal s_giftyToken;

	// The contract to which the EARNED* commission from all gifts is transferred.
	// EARNED - commission after all burning deductions and other manipulations.
	address payable private s_piggyBox;

	// To get the price in usd, we use the Chainlink Data Feeds,
	// each token has its own contract for displaying the price of tokens in relation to the USD.
	mapping(address => AggregatorV3Interface) internal s_priceFeeds;

	// minimum gift price in USD
	uint96 internal s_minGiftPriceInUsd;

	// gift refund settings.
	GiftRefundSettings internal s_giftRefundSettings;

	// TODO write comments
	UniswapOracleConfig internal s_uniConfig;

	// We save the amount of each asset the contract received as a commission.
	mapping(address => uint256)
		internal s_giftyCommission; /* asset address */ /* earned commission */

	/**
	 * @dev It is used to compare the lengths of two arrays,
	 * @dev if they are not equal it gives an error.
	 *
	 * @param a - length of first array
	 * @param b - length of second array
	 */
	modifier compareLengths(uint256 a, uint256 b) {
		if (a != b) revert Gifty__error_10(a, b);
		_;
	}

	/**
	 * @notice Used to validate given address, arg != address(0)
	 * @param arg - address to be validated
	 */
	modifier notZeroAddress(address arg) {
		if (arg == address(0)) revert Gifty__error_8();
		_;
	}

	// Initializes controller contract
	//prettier-ignore
	function initializeGiftyController(
		address giftyToken,
		address payable piggyBox,
        address uniswapV3Pool,
        uint32 secondsAgo,
		uint256 minGiftPriceInUsd,
		uint256 refundGiftWithCommissionThreshold,
		uint256 freeRefundGiftThreshold,
		uint256 giftRefundCommission
	) internal onlyInitializing notZeroAddress(giftyToken) {
		s_giftyToken = giftyToken;
		emit GiftyTokenChanged(giftyToken);

		changePiggyBox(piggyBox);
        changeUniswapConfig(uniswapV3Pool, secondsAgo);
		changeMinimalGiftPrice(minGiftPriceInUsd);
		changeRefundSettings(refundGiftWithCommissionThreshold, freeRefundGiftThreshold, giftRefundCommission /* SHOULD BE WITH 2 DECIMALS*/);
	}

	/**
	 * @notice Changes the gift refund settings
	 * @notice The function is only available to the owner.
	 * @notice all given args should be a non-zero
	 *
	 * @param refundGiftWithCommissionThreshold - New number of blocks after the gift is given, when the giver can refund the gift with commission.
	 * @param freeRefundGiftThreshold - New number of blocks after which the giver can refund the gift for free.
	 * @param giftRefundCommission - New amount of commission in percent, which will be taken in case of refunding a gift with commission
	 */
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
	 * @notice The function is only available to the owner.
	 *
	 * @param minGiftPrice - new minimal gift price.
	 */
	function changeMinimalGiftPrice(uint256 minGiftPrice) public onlyOwner {
		if (minGiftPrice == 0) revert Gifty__error_8();

		s_minGiftPriceInUsd = minGiftPrice.toUint96();
		emit MinimumGiftPriceChanged(minGiftPrice);
	}

	/**
	 * @notice Adds the tokens available for the gift to the platform.
	 * @notice The function is only available to the owner.
	 * @notice The arrays passed as arguments must be of the same length.
	 *
	 * @param tokens - an array of token addresses to be added
	 * @param priceFeeds - an array of price feed's addresses to get the price to each token to be added.
	 */
	function addTokens(
		address[] memory tokens,
		address[] memory priceFeeds
	)
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

	/**
	 * @notice Removing tokens from the list of allowed tokens.
	 * @notice Also sends the earned commission to the piggyBox contract.
	 * @notice The function is only available to the owner.
	 *
	 * @param tokensToBeDeleted - an array of tokens to be deleted.
	 */
	function deleteTokens(address[] calldata tokensToBeDeleted) external onlyOwner {
		for (uint256 i; i < tokensToBeDeleted.length; i++) {
			address currentTokenToBeDeleted = tokensToBeDeleted[i];

			_deleteToken(currentTokenToBeDeleted);

			// TODO write tests to transfered commission (tokens)
			// Transfer commission to PiggyBox

			uint256 earnedCommission = s_giftyCommission[currentTokenToBeDeleted];
			if (earnedCommission > 0)
				_transferAssetCommissionToPiggyBox(currentTokenToBeDeleted, earnedCommission);
		}
	}

	/**
	 * @notice Change PiggyBox contract which receive earned funds
	 * @notice The function is only available to the owner.
	 *
	 * @param newPiggyBox - address of new piggyBox contract
	 */
	function changePiggyBox(
		address payable newPiggyBox
	) public onlyOwner notZeroAddress(newPiggyBox) {
		s_piggyBox = newPiggyBox;
		emit PiggyBoxChanged(newPiggyBox);
	}

	// TODO implement changing comission rate, now we get comission value from the function, but we should have possibility to change values without upgrading contract
	function changeCommissionRate(uint256 newCommissionRate) external onlyOwner {}

	/**
	 * @notice Transferring the earned commission of a particular token to PiggiBox
	 * @notice The function is only available to the owner.
	 *
	 * @param token - the address of the token, the earned commission in which you want to transfer
	 * @param amount - number of tokens to be transfered
	 */
	function transferToPiggyBoxTokens(address token, uint256 amount) external onlyOwner {
		// TODO to be tested
		_transferAssetCommissionToPiggyBox(token, amount);
	}

	/**
	 * @notice Transferring the earned ETH commission to PiggiBox
	 * @notice The function is only available to the owner.
	 *
	 * @param amount - number of ETH to be transfered
	 */
	function transferToPiggyBoxETH(uint256 amount) external onlyOwner {
		// TODO to be tested
		_transferAssetCommissionToPiggyBox(_getETHAddress(), amount);
	}

	/**
	 * @notice Removing a token from the system, only without transferring funds to the piggyBox contract.
	 * @notice For a situation where token transfer is blocked and it is not possible to delete a token with the basic function.
	 * @notice The function is only available to the owner.
	 *
	 * @param beingDeletedToken - the address of the token to be deleted in an emergency.
	 */
	function deleteTokenEmergency(address beingDeletedToken) external onlyOwner {
		_deleteToken(beingDeletedToken);
	}

	/**
	 * @notice Each token, in addition to GFT, uses PriceFeed to get the price in dollar terms.
	 * @notice The function changes the PriceFeed for a specific token.
	 *
	 * @notice The function is only available to the owner.
	 * @notice The arrays passed as arguments must be of the same length.
	 *
	 * @param tokens - an array of token addresses to which the new PriceFeed will be assigned
	 * @param priceFeeds - An array of PriceFeeds addresses that will be used to retrieve the price in USD.
	 */
	function changePriceFeedsForTokens(
		address[] memory tokens,
		address[] memory priceFeeds
	)
		external
		onlyOwner
		// The lengths of the arrays must match since each token must be assigned a price feed
		compareLengths(tokens.length, priceFeeds.length)
	{
		for (uint256 i; i < tokens.length; i++) {
			_changePriceFeedForToken(tokens[i], priceFeeds[i]);
		}
	}

	/**
	 * @notice Changes config of the Uniswap pool interaction, which is used to get the price of a GFT token
	 * @notice The function is only available to the owner.
	 * @notice One of the tokens in the pool must be a GFT token.
	 *
	 * @param pool - address of the pool, should be non-zero address
	 * @param secondsAgo - the number of seconds used to get the TWAP price.
	 */
	function changeUniswapConfig(
		address pool,
		uint32 secondsAgo
	) public onlyOwner notZeroAddress(pool) {
		address giftyToken = s_giftyToken;

		address token0 = IUniswapV3PoolImmutables(pool).token0();
		address token1 = IUniswapV3PoolImmutables(pool).token1();
		address anotherTokenInPool = token0 == giftyToken ? token1 : token0;

		if (token0 == giftyToken || token1 == giftyToken) {
			s_uniConfig = UniswapOracleConfig({
				pool: pool,
				anotherTokenInPool: anotherTokenInPool,
				secondsAgo: secondsAgo
			});
		} else revert Gifty__error_23();

		emit UniswapConfigChanged(pool, anotherTokenInPool, secondsAgo);
	}

	// TODO
	function splitCommission() external onlyOwner {}

	/* --------------------Internal functions-------------------- */
	function _getPriceFeed(address asset) internal view returns (AggregatorV3Interface priceFeed) {
		priceFeed = s_priceFeeds[asset];
		if (address(priceFeed) == address(0)) revert Gifty__error_4(asset);
	}

	/* --------------------Private functions-------------------- */
	function _addToken(address token) private {
		// Checking whether the address which are trying to add is a contract?
		if (!token.isContract()) revert Gifty__error_0(token);

		// The current length is the future index for the added token
		uint256 newIndex = s_allowedTokens.length;

		// Push token to the array of allowed tokens and set token information
		s_allowedTokens.push(token);
		s_tokenInfo[token] = TokenInfo({
			isTokenAllowed: true,
			indexInTheArray: newIndex.toUint248()
		});

		emit TokenAdded(token);
	}

	function _deleteToken(address beingDeletedToken) private {
		// Get the index of the token being deleted
		TokenInfo memory tokenBeingDeletedInfo = s_tokenInfo[beingDeletedToken];

		// Is there a token in the system at the moment? If not revert
		if (!tokenBeingDeletedInfo.isTokenAllowed) revert Gifty__error_1(beingDeletedToken);

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

		delete s_tokenInfo[beingDeletedToken];
		delete s_priceFeeds[beingDeletedToken];

		emit TokenDeleted(beingDeletedToken);
	}

	function _changePriceFeedForToken(
		address token,
		address aggregatorForToken
	) private notZeroAddress(token) notZeroAddress(aggregatorForToken) {
		s_priceFeeds[token] = AggregatorV3Interface(aggregatorForToken);
		emit PriceFeedChanged(token, aggregatorForToken);
	}

	function _transferAssetCommissionToPiggyBox(address asset, uint256 amount) private {
		if (amount == 0) revert Gifty__error_8();

		uint256 giftyCommissionBalance = s_giftyCommission[asset];
		if (amount > giftyCommissionBalance) revert Gifty__error_6(amount, giftyCommissionBalance);

		if (asset == _getETHAddress()) {
			s_piggyBox.sendETH(amount);
		} else {
			IERC20(asset).safeTransfer(s_piggyBox, amount);
		}

		// unchecked - since the above was a check that the balance is greater than the amount being transferred
		unchecked {
			s_giftyCommission[asset] -= amount;
		}

		emit AssetTransferedToPiggyBox(asset, amount);
	}

	function _getETHAddress() internal pure returns (address) {
		// About this address:
		// https://ethereum.stackexchange.com/questions/87352/why-does-this-address-have-a-balance
		return 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
	}

	/* --------------------Getter functions-------------------- */

	function getGiftyToken() external view returns (address) {
		return s_giftyToken;
	}

	function getPiggyBox() external view returns (address) {
		return s_piggyBox;
	}

	function getTokenInfo(address token) external view returns (TokenInfo memory) {
		return s_tokenInfo[token];
	}

	function getMinimalGiftPrice() external view returns (uint256) {
		return s_minGiftPriceInUsd;
	}

	function getRefundSettings() external view returns (GiftRefundSettings memory) {
		return s_giftRefundSettings;
	}

	function getGiftyEarnedCommission(address asset) external view returns (uint256) {
		return s_giftyCommission[asset];
	}

	function getAllowedTokens() external view returns (address[] memory) {
		return s_allowedTokens;
	}

	function getAmountOfAllowedTokens() external view returns (uint256) {
		return s_allowedTokens.length;
	}

	function getPriceFeedForToken(address token) external view returns (address) {
		return address(_getPriceFeed(token));
	}

	function getUniswapConfig() external view returns (UniswapOracleConfig memory) {
		return s_uniConfig;
	}
}
