// из контракта гифти выводим деньги на пигги, там у пигги есть функция сплита комиссии. ИДЕТ ПРОЦЕНТНЫЙ минт берн и последняя часть отправляется по адресу, который указал овнер

// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

/* Contracts */
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/* Libraries */
import {SafeERC20Upgradeable, IERC20Upgradeable, AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {SafeCastUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/math/SafeCastUpgradeable.sol";

// Interfaces
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IGiftyToken} from "./interfaces/IGiftyToken.sol";

error PiggyBox__onlyGiftyCanSendETH();
error PiggyBox__incorrectPercentage(uint256 operationPercentage);
error PiggyBox__routerAddressIsZero();
error PiggyBox__incorrectUniswapFee();
error PiggyBox__decimalsIsZero();
error PiggyBox__giftyTokenIsZero();
error PiggyBox__receivedAmountFromSwapEq0();
error PiggyBox__staticcalFailed();
error PiggyBox__toLowAmount(uint256 balance, uint256 minimumValue);

//! delete
import "hardhat/console.sol";

contract PiggyBox is OwnableUpgradeable, UUPSUpgradeable {
	using SafeERC20Upgradeable for IERC20Upgradeable;
	using SafeERC20Upgradeable for IGiftyToken;
	using AddressUpgradeable for address payable;
	using SafeCastUpgradeable for uint256;

	struct SplitSettings {
		uint16 mintPercentage; // 2 bytes ----|
		uint16 burnPercentage; // 2 bytes ----|
		uint8 decimals; // 1 byte ------------|
	}

	struct SwapSettings {
		address router;
		address middleToken;
		uint24 swapFeeToMiddleToken;
		uint24 swapFeeToGFT;
	}

	address private s_gifty; // 20 bytes ---------------|
	SplitSettings private s_splitSettings; // 5 bytes --|

	address private s_giftyToken;
	SwapSettings private s_swapSettings;

	event GiftyChanged(address indexed gifty);
	event PiggyBoxFunded(uint256 amount);
	event TokenWithdrawn(address indexed token, address indexed to, uint256 amount);
	event ETHWithdrawn(address indexed to, uint256 amount);
	event SplitSettingsChanged(uint256 mintPercentage, uint256 burnPercentage, uint256 decimals);
	event SwapSettingsChanged(
		address router,
		uint256 swapRateToMiddleToken,
		uint256 swapRateToGFT
	);
	event GiftyTokenChanged(address newGiftyToken);

	function initialize(address giftyToken) external initializer {
		__UUPSUpgradeable_init();
		__Ownable_init();

		s_giftyToken = giftyToken;
	}

	function changeGiftyToken(address newGiftyToken) public onlyOwner {
		if (newGiftyToken == address(0)) revert PiggyBox__giftyTokenIsZero();
		s_giftyToken = newGiftyToken;
		emit GiftyTokenChanged(newGiftyToken);
	}

	function setSettings(
		address gifty,
		SplitSettings memory splitSettings,
		SwapSettings memory swapSettings
	) external onlyOwner {
		changeGifty(gifty);
		changeSplitSettings(splitSettings);
		changeSwapSettings(swapSettings);
	}

	function changeGifty(address gifty) public onlyOwner {
		s_gifty = gifty;
		emit GiftyChanged(gifty);
	}

	function changeSplitSettings(SplitSettings memory splitSettings) public onlyOwner {
		uint256 operationPercentage = splitSettings.mintPercentage + splitSettings.burnPercentage;
		if (operationPercentage > 10000) revert PiggyBox__incorrectPercentage(operationPercentage);
		if (splitSettings.decimals == 0) revert PiggyBox__decimalsIsZero();

		s_splitSettings = splitSettings;
		emit SplitSettingsChanged(
			splitSettings.mintPercentage,
			splitSettings.burnPercentage,
			splitSettings.decimals
		);
	}

	function changeSwapSettings(SwapSettings memory swapSettings) public onlyOwner {
		if (swapSettings.router == address(0)) revert PiggyBox__routerAddressIsZero();
		if (
			!isValidaUniswapFee(swapSettings.swapFeeToMiddleToken) ||
			!isValidaUniswapFee(swapSettings.swapFeeToGFT)
		) revert PiggyBox__incorrectUniswapFee();

		s_swapSettings = swapSettings;

		emit SwapSettingsChanged(
			swapSettings.router,
			swapSettings.swapFeeToMiddleToken,
			swapSettings.swapFeeToGFT
		);
	}

	function isValidaUniswapFee(uint256 fee) private pure returns (bool isValid) {
		if (fee == 500 || fee == 3000 || fee == 10000) isValid = true;
	}

	receive() external payable {
		if (msg.sender != s_gifty) revert PiggyBox__onlyGiftyCanSendETH();
		emit PiggyBoxFunded(msg.value);
	}

	function _sendToken(address token, address to, uint256 amount) private {
		IERC20Upgradeable(token).safeTransfer(to, amount);
		emit TokenWithdrawn(token, to, amount);
	}

	function _sendETH(address payable to, uint256 amount) private {
		to.sendValue(amount);
		emit ETHWithdrawn(to, amount);
	}

	function getGiftyAddress() external view returns (address) {
		return s_gifty;
	}

	function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}

	function splitEarnedCommission(
		address[] memory tokensToBeSwapped,
		address leftoversTo
	) external onlyOwner {
		SwapSettings memory swapSettings = s_swapSettings;
		address GFT = s_giftyToken;

		uint256 amountOfSwaps = tokensToBeSwapped.length;

		for (uint256 i; i < amountOfSwaps; i++) {
			swapToGFT(tokensToBeSwapped[i], GFT, swapSettings);
		}

		_splitCommission(leftoversTo);
	}

	function _calculatePercentage(
		uint256 amount,
		uint256 percentage,
		uint256 decimals
	) private pure returns (uint256) {
		return (amount * percentage) / (100 * 10 ** decimals);
	}

	function _splitCommission(address leftoversTo) private {
		SplitSettings memory splitSettings = s_splitSettings;

		uint256 minimumValue = 10000;
		uint256 balance = _getTokenBalance(s_giftyToken);

		if (balance < minimumValue) revert PiggyBox__toLowAmount(balance, minimumValue);

		uint256 totalPercantageToOperation = splitSettings.burnPercentage +
			splitSettings.mintPercentage;
		IGiftyToken GFT = IGiftyToken(s_giftyToken);

		if (totalPercantageToOperation != 0) {
			if (splitSettings.burnPercentage != 0) {
				uint256 amountToBurn = _calculatePercentage(
					balance,
					splitSettings.burnPercentage,
					s_splitSettings.decimals
				);
				GFT.burn(address(this), amountToBurn);
			} else {
				uint256 amountToMint = _calculatePercentage(
					balance,
					splitSettings.mintPercentage,
					s_splitSettings.decimals
				);
				GFT.mint(address(this), amountToMint);
			}
		}

		uint256 leftovers = _calculatePercentage(
			balance,
			(100 * 10 ** s_splitSettings.decimals) - totalPercantageToOperation,
			s_splitSettings.decimals
		);

		GFT.safeTransfer(leftoversTo, leftovers);
	}

	function swapToGFT(address tokenIn, address GFT, SwapSettings memory swapSettings) private {
		uint256 amountToSwap = IERC20Upgradeable(tokenIn).balanceOf(address(this));
		uint256 received;

		if (tokenIn == swapSettings.middleToken) {
			received = swapExactInputSingle(
				swapSettings.router,
				tokenIn,
				GFT,
				amountToSwap,
				swapSettings.swapFeeToGFT
			);
		} else {
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

		if (received == 0) revert PiggyBox__receivedAmountFromSwapEq0();
	}

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

	function _getTokenBalance(address token) private view returns (uint256) {
		(bool success, bytes memory data) = token.staticcall(
			abi.encodeWithSelector(IERC20Upgradeable.balanceOf.selector, address(this))
		);
		if (!success || data.length < 32) revert PiggyBox__staticcalFailed();

		return abi.decode(data, (uint256));
	}

	function getSplitSettings() external view returns (SplitSettings memory) {
		return s_splitSettings;
	}

	function getSwapSettings() external view returns (SwapSettings memory) {
		return s_swapSettings;
	}
}
