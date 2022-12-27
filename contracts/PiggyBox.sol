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

	struct SplitSettings {
		uint16 mintPercentage; // 2 bytes ----|
		uint16 burnPercentage; // 2 bytes ----|
		uint8 decimals; // 1 byte ------------|
	}

	struct SwapSettings {
		address router;
		address weth9;
		address middleToken;
		uint24 swapFeeToMiddleToken;
		uint24 swapFeeToGFT;
	}

	/* --------------------State variables-------------------- */

	address private s_giftyToken;
	address private s_gifty; // 20 bytes ---------------|
	SplitSettings private s_splitSettings; // 5 bytes --|
	SwapSettings private s_swapSettings;

	/* --------------------Modifiers-------------------- */

	modifier notZeroAddress(address target) {
		if (target == address(0)) revert PiggyBox__oneOfTheAddressIsZero();
		_;
	}

	/* --------------------Functions available to all-------------------- */

	function initialize() external initializer {
		__UUPSUpgradeable_init();
		__Ownable_init();
	}

	receive() external payable {
		emit PiggyBoxFunded(msg.sender, msg.value);
	}

	/* --------------------Functions available only to owner-------------------- */

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

	function changeGifty(address gifty) public onlyOwner notZeroAddress(gifty) {
		s_gifty = gifty;
		emit GiftyChanged(gifty);
	}

	function changeGiftyToken(
		address newGiftyToken
	) public onlyOwner notZeroAddress(newGiftyToken) {
		s_giftyToken = newGiftyToken;
		emit GiftyTokenChanged(newGiftyToken);
	}

	function changeSplitSettings(SplitSettings memory splitSettings) public onlyOwner {
		if (splitSettings.decimals == 0) revert PiggyBox__decimalsIsZero();

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

	function changeSwapSettings(
		SwapSettings memory swapSettings
	) public onlyOwner notZeroAddress(swapSettings.router) notZeroAddress(swapSettings.weth9) {
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

	function splitEarnedCommission(
		address[] memory tokensToBeSwapped,
		address leftoversTo
	) external onlyOwner {
		SwapSettings memory swapSettings = s_swapSettings;
		address GFT = s_giftyToken;

		uint256 amountOfSwaps = tokensToBeSwapped.length;

		// Swap each token to GFT
		for (uint256 i; i < amountOfSwaps; i++) {
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

	function swapToGFT(address tokenIn, address GFT, SwapSettings memory swapSettings) private {
		// If the token is equal to ETH mask, first convert it to WETH
		if (tokenIn == _getETHAddress()) {
			tokenIn = swapSettings.weth9;
			IWETH9(tokenIn).deposit{value: address(this).balance}();
		}

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
			// Otherwise, we do the exchange through other pools
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

	function _splitCommission(
		address leftoversTo,
		address GFT
	) private returns (uint256 mintAmount, uint256 burnAmount, uint256 sendAmount) {
		SplitSettings memory splitSettings = s_splitSettings;

		uint256 minimumValue = 10000;
		uint256 balance = _getTokenBalance(GFT);

		// Validation minimum value for correct division into fractions.
		if (balance < minimumValue) revert PiggyBox__toLowAmount(balance, minimumValue);

		// Obtaining the total amount of interest for the token emission manipulation, there can only be one operation.
		uint256 totalPercantageToOperation = splitSettings.burnPercentage +
			splitSettings.mintPercentage;

		if (totalPercantageToOperation != 0) {
			if (splitSettings.mintPercentage == 0) {
				burnAmount = _calculatePercentage(
					balance,
					splitSettings.burnPercentage,
					splitSettings.decimals
				);

				IGiftyToken(GFT).burn(address(this), burnAmount);
			} else {
				mintAmount = _calculatePercentage(
					balance,
					splitSettings.mintPercentage,
					splitSettings.decimals
				);

				IGiftyToken(GFT).mint(address(this), mintAmount);
			}
		}

		uint256 maxPercantage = (100 * (10 ** splitSettings.decimals));

		sendAmount = _calculatePercentage(
			balance,
			maxPercantage - totalPercantageToOperation,
			splitSettings.decimals
		);

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

	// Normal token exchange through multiple liquidity pools via UniswapV3
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

	// Replacing balanceOf
	function _getTokenBalance(address token) private view returns (uint256) {
		(bool success, bytes memory data) = token.staticcall(
			abi.encodeWithSelector(IERC20Upgradeable.balanceOf.selector, address(this))
		);
		if (!success || data.length < 32) revert PiggyBox__staticcalFailed();

		return abi.decode(data, (uint256));
	}

	function _calculatePercentage(
		uint256 amount,
		uint256 percentage,
		uint256 decimals
	) private pure returns (uint256) {
		return (amount * percentage) / (100 * (10 ** decimals));
	}

	function _getETHAddress() private pure returns (address) {
		// About this address:
		// https://ethereum.stackexchange.com/questions/87352/why-does-this-address-have-a-balance
		return 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
	}

	function isValidUniswapFee(uint256 fee) private pure returns (bool isValid) {
		if (fee == 500 || fee == 3000 || fee == 10000) isValid = true;
	}

	function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}

	/* --------------------Getter functions-------------------- */

	function getGifty() external view returns (address) {
		return s_gifty;
	}

	function getGiftyToken() external view returns (address) {
		return s_giftyToken;
	}

	function getSplitSettings() external view returns (SplitSettings memory) {
		return s_splitSettings;
	}

	function getSwapSettings() external view returns (SwapSettings memory) {
		return s_swapSettings;
	}
}
