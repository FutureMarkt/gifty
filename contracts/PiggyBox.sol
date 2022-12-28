// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

/* Contracts */
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/* Libraries */
import {SafeERC20Upgradeable, IERC20Upgradeable, AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {SafeCastUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/math/SafeCastUpgradeable.sol";

// Interfaces
import {IPiggyBoxErrors} from "./interfaces/PiggyBox/IPiggyBoxErrors.sol";
import {IPiggyBoxEvents} from "./interfaces/PiggyBox/IPiggyBoxEvents.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IGiftyToken} from "./interfaces/IGiftyToken.sol";
import {IWETH9} from "./interfaces/Uniswap/IWETH9.sol";

contract PiggyBox is IPiggyBoxEvents, IPiggyBoxErrors, OwnableUpgradeable, UUPSUpgradeable {
	using SafeERC20Upgradeable for IERC20Upgradeable;
	using SafeERC20Upgradeable for IGiftyToken;
	using AddressUpgradeable for address payable;
	using SafeCastUpgradeable for uint256;

	/* --------------------Data types-------------------- */

	// Settings for splitting earned commission
	struct SplitSettings {
		uint16 mintPercentage; // 2 bytes ----|
		uint16 burnPercentage; // 2 bytes ----|
		uint8 decimals; // 1 byte ------------|
	}

	// Token swap settings for UniswapV3
	struct SwapSettings {
		address router;
		address weth9;
		address middleToken; // 20 bytes --------|
		uint24 swapFeeToMiddleToken; // 3 bytes -|
		uint24 swapFeeToGFT; // 3 bytes ---------|
	}

	/* --------------------State variables-------------------- */

	// Gifty main contract
	address private s_gifty;
	// GFT token
	address private s_giftyToken;

	SwapSettings private s_swapSettings; // ------|
	SplitSettings private s_splitSettings; // ----|

	/* --------------------Modifiers-------------------- */

	// Checking the address that it is not address(0)
	modifier notZeroAddress(address target) {
		if (target == address(0)) revert PiggyBox__oneOfTheAddressIsZero();
		_;
	}

	/* --------------------Functions available to all-------------------- */

	/// @dev Contract initialization, can be executed only once.
	function initialize() external initializer {
		__UUPSUpgradeable_init();
		__Ownable_init();
	}

	receive() external payable {
		emit PiggyBoxFunded(msg.sender, msg.value);
	}

	/* --------------------Functions available only to owner-------------------- */

	/**
	 * @notice Set the main settings of the contract.
	 * @notice The function is only available to the owner.
	 *
	 * @param gifty - gifty contract address.
	 * @param giftyToken - GFT address
	 * @param splitSettings - Settings for splitting earned commission
	 * @param swapSettings - Token swap settings for UniswapV3
	 */

	function setSettings(
		address gifty,
		address giftyToken,
		SplitSettings memory splitSettings,
		SwapSettings memory swapSettings
	) external onlyOwner {
		changeGifty(gifty);
		changeGiftyToken(giftyToken);
		changeSplitSettings(splitSettings);
		changeSwapSettings(swapSettings);
	}

	/**
	 * @notice Set {s_gifty} Gifty contract address.
	 * @notice The function is only available to the owner.
	 *
	 * @param gifty - Gifty address (!address(0))
	 */
	function changeGifty(address gifty) public onlyOwner notZeroAddress(gifty) {
		s_gifty = gifty;
		emit GiftyChanged(gifty);
	}

	/**
	 * @notice Set {s_giftyToken} GFT contract address.
	 * @notice The function is only available to the owner.
	 *
	 * @param newGiftyToken - GFT address (!address(0))
	 */
	function changeGiftyToken(
		address newGiftyToken
	) public onlyOwner notZeroAddress(newGiftyToken) {
		s_giftyToken = newGiftyToken;
		emit GiftyTokenChanged(newGiftyToken);
	}

	/**
	 * @notice Set {s_splitSettings} splitSettings.
	 * @notice The function is only available to the owner.
	 *
	 * @param splitSettings - new splitSettings
	 * @param splitSettings - decimals must be not zero
	 * @param splitSettings - the maximum value of totalPercantage(mint+burn) must be no more than 100% with decimals
	 */
	function changeSplitSettings(SplitSettings memory splitSettings) public onlyOwner {
		if (splitSettings.decimals == 0) revert PiggyBox__decimalsIsZero();

		if (!(splitSettings.mintPercentage == 0 || splitSettings.burnPercentage == 0))
			revert PiggyBox__oneOfTheParamsMustBeZero();

		uint256 operationPercentage = splitSettings.mintPercentage + splitSettings.burnPercentage;
		if (operationPercentage > (100 * (10 ** splitSettings.decimals)))
			revert PiggyBox__incorrectPercentage(operationPercentage);

		s_splitSettings = splitSettings;

		emit SplitSettingsChanged(
			splitSettings.mintPercentage,
			splitSettings.burnPercentage,
			splitSettings.decimals
		);
	}

	/**
	 * @notice Set {s_swapSettings} swap settings.
	 * @notice The function is only available to the owner.
	 *
	 * @param swapSettings - router, weth9, middleToken - must be a non-zero address
	 * @param swapSettings - swapFeeToMiddleToken and swapFeeToGFT must be valid UnsiwapV3 percantage
	 */
	function changeSwapSettings(
		SwapSettings memory swapSettings
	)
		public
		onlyOwner
		notZeroAddress(swapSettings.router)
		notZeroAddress(swapSettings.weth9)
		notZeroAddress(swapSettings.middleToken)
	{
		if (
			!isValidUniswapFee(swapSettings.swapFeeToMiddleToken) ||
			!isValidUniswapFee(swapSettings.swapFeeToGFT)
		) revert PiggyBox__incorrectUniswapFee();

		s_swapSettings = swapSettings;

		emit SwapSettingsChanged(
			swapSettings.router,
			swapSettings.weth9,
			swapSettings.middleToken,
			swapSettings.swapFeeToGFT,
			swapSettings.swapFeeToMiddleToken
		);
	}

	/**
	 * @notice Swap the tokens to GFT and split the received amount in accordance with splitSettings.
	 * @notice The function is only available to the owner.
	 *
	 * @param tokensToBeSwapped - Array of tokens to be used during swap/split
	 * @param leftoversTo - Receiver address of leftovers
	 */
	function splitEarnedCommission(
		address[] memory tokensToBeSwapped,
		address leftoversTo
	) external onlyOwner {
		// Cache vars
		SwapSettings memory swapSettings = s_swapSettings;
		address GFT = s_giftyToken;

		// Swap each token to GFT
		for (uint256 i; i < tokensToBeSwapped.length; i++) {
			swapToGFT(tokensToBeSwapped[i], GFT, swapSettings);
		}

		// Split earned GFT amount
		(uint256 mintedAmount, uint256 burnedAmount, uint256 sentAmount) = _splitCommission(
			leftoversTo,
			GFT
		);

		emit CommissionSplitted(leftoversTo, sentAmount, mintedAmount, burnedAmount);
	}

	/* --------------------Private / Internal functions-------------------- */

	// Exchanges the passed token to GFT via the liquidity pool of UniswapV3
	// tokenIn - token to be swapped
	// GFT - GFT address
	// swapSettings - swap settings
	function swapToGFT(address tokenIn, address GFT, SwapSettings memory swapSettings) private {
		// If the token is equal to ETH mask, first convert it to WETH
		if (tokenIn == _getETHAddress()) {
			tokenIn = swapSettings.weth9;
			IWETH9(tokenIn).deposit{value: address(this).balance}();
		}

		// Validate balance
		uint256 amountToSwap = _getTokenBalance(tokenIn);
		if (amountToSwap == 0) revert PiggyBox__tokenBalanceIsZero(tokenIn);

		uint256 received;

		// If there is already a liquidity pool with a GFT token, we do the exchange directly.
		if (tokenIn == swapSettings.middleToken) {
			received = swapExactInputSingle(
				swapSettings.router,
				tokenIn,
				GFT,
				amountToSwap,
				swapSettings.swapFeeToGFT
			);
		} else {
			// Otherwise, we do the exchange through multi pools
			received = swapExactInputMulti(
				swapSettings.router,
				tokenIn,
				swapSettings.swapFeeToMiddleToken,
				swapSettings.middleToken,
				swapSettings.swapFeeToGFT,
				GFT,
				amountToSwap
			);
		}

		// Check that the result of the exchange is not 0
		if (received == 0) revert PiggyBox__receivedAmountFromSwapEq0();
	}

	// Split GFT tokens according to the splitSettings
	// leftoversTo - Receiver address of leftovers
	// GFT - GFT address
	// returns:
	// {mintAmount} - amount of GFT minted,
	// {burnAmount} - amount of burned GFT,
	// {sendAmount} - amount of GFT transfered to {leftoversTo}
	function _splitCommission(
		address leftoversTo,
		address GFT
	) private returns (uint256 mintAmount, uint256 burnAmount, uint256 sendAmount) {
		SplitSettings memory splitSettings = s_splitSettings;

		// Minimum value for accurate calculations
		uint256 minimumValue = 10000;
		uint256 balance = _getTokenBalance(GFT);

		// Validation minimum value for correct division into fractions.
		if (balance < minimumValue) revert PiggyBox__toLowAmount(balance, minimumValue);

		if (splitSettings.mintPercentage > 0) {
			mintAmount = _calculatePercentage(
				balance,
				splitSettings.mintPercentage,
				splitSettings.decimals
			);

			IGiftyToken(GFT).mint(address(this), mintAmount);

			sendAmount = balance + mintAmount;
		} else if (splitSettings.burnPercentage > 0) {
			burnAmount = _calculatePercentage(
				balance,
				splitSettings.burnPercentage,
				splitSettings.decimals
			);

			IGiftyToken(GFT).burn(address(this), burnAmount);

			sendAmount = balance - burnAmount;
		} else sendAmount = balance;

		// Sending leftovers to the target address
		IERC20Upgradeable(GFT).safeTransfer(leftoversTo, sendAmount);
	}

	// Simple single token exchange via UniswapV3
	function swapExactInputSingle(
		address router,
		address tokenIn,
		address tokenOut,
		uint256 amountIn,
		uint24 fee
	) private returns (uint256 amountOut) {
		IERC20Upgradeable(tokenIn).safeApprove(router, amountIn);

		ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
			tokenIn: tokenIn,
			tokenOut: tokenOut,
			fee: fee,
			recipient: address(this),
			deadline: block.timestamp,
			amountIn: amountIn,
			amountOutMinimum: 0,
			sqrtPriceLimitX96: 0
		});

		amountOut = ISwapRouter(router).exactInputSingle(params);
	}

	// Sipmple token exchange through multiple liquidity pools via UniswapV3
	function swapExactInputMulti(
		address router,
		address tokenIn,
		uint24 feeToMiddle,
		address tokenMiddle,
		uint24 feeToGFT,
		address tokenOut,
		uint256 amountIn
	) private returns (uint amountOut) {
		IERC20Upgradeable(tokenIn).safeApprove(router, amountIn);

		ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
			path: abi.encodePacked(tokenIn, feeToMiddle, tokenMiddle, feeToGFT, tokenOut),
			recipient: address(this),
			deadline: block.timestamp,
			amountIn: amountIn,
			amountOutMinimum: 0
		});

		amountOut = ISwapRouter(router).exactInput(params);
	}

	// Replacing balanceOf function
	function _getTokenBalance(address token) private view returns (uint256) {
		(bool success, bytes memory data) = token.staticcall(
			abi.encodeWithSelector(IERC20Upgradeable.balanceOf.selector, address(this))
		);
		if (!success || data.length < 32) revert PiggyBox__staticcalFailed();

		return abi.decode(data, (uint256));
	}

	// Simple percantage calculation with decimals
	function _calculatePercentage(
		uint256 amount,
		uint256 percentage,
		uint256 decimals
	) private pure returns (uint256) {
		return (amount * percentage) / (100 * (10 ** decimals));
	}

	// Get ETH mask
	function _getETHAddress() private pure returns (address) {
		// About this address:
		// https://ethereum.stackexchange.com/questions/87352/why-does-this-address-have-a-balance
		return 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
	}

	// Validate UniswapV3 fees
	function isValidUniswapFee(uint256 fee) private pure returns (bool isValid) {
		if (fee == 500 || fee == 3000 || fee == 10000) isValid = true;
	}

	function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}

	/* --------------------Getter functions-------------------- */

	/// @return Gifty address
	function getGifty() external view returns (address) {
		return s_gifty;
	}

	/// @return GFT address
	function getGiftyToken() external view returns (address) {
		return s_giftyToken;
	}

	/// @return Split settings
	function getSplitSettings() external view returns (SplitSettings memory) {
		return s_splitSettings;
	}

	/// @return Swap settings
	function getSwapSettings() external view returns (SwapSettings memory) {
		return s_swapSettings;
	}
}
