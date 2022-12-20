// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

/* External contracts */
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/* External interfaces / libraries */
import {SafeERC20, IERC20, Address} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

error PiggyBox__onlyGiftyCanSendETH();

contract PiggyBox is Ownable {
	using SafeERC20 for IERC20;
	using Address for address payable;

	struct SplitSettings {
		address router;
		uint48 mintPercentage;
		uint48 burnPercentage;
	}

	address private s_gifty;

	SplitSettings private s_splitSettings;

	event GiftyChanged(address indexed gifty);
	event PiggyBoxFunded(uint256 amount);
	event TokenWithdrawn(address indexed token, address indexed to, uint256 amount);
	event ETHWithdrawn(address indexed to, uint256 amount);

	// function changeSplitSettings(SplitSettings memory splitSettings) public onlyOwner {
	// 	uint256 operationPercentage = splitSettings.mintPercentage + splitSettings.burnPercentage;

	// 	if (splitSettings.router == address(0)) revert Gifty__error_8();
	// 	if (operationPercentage > 1000) revert Gifty__incorrectPercentage(operationPercentage);

	// 	s_splitSettings = splitSettings;
	// 	emit SplitSettingsChanged(splitSettings.mintPercentage, splitSettings.burnPercentage);
	// }

	function changeGifty(address gifty) external onlyOwner {
		s_gifty = gifty;
		emit GiftyChanged(gifty);
	}

	function withdrawToken(IERC20 token, address to, uint256 amount) external onlyOwner {
		token.safeTransfer(to, amount);
		emit TokenWithdrawn(address(token), to, amount);
	}

	function withdrawETH(address payable to, uint256 amount) external onlyOwner {
		to.sendValue(amount);
		emit ETHWithdrawn(to, amount);
	}

	receive() external payable {
		if (msg.sender != s_gifty) revert PiggyBox__onlyGiftyCanSendETH();
		emit PiggyBoxFunded(msg.value);
	}

	// // TODO
	// function splitCommission() external onlyOwner {}

	// function _splitCommission(address assetToSell) private {
	// 	SplitSettings memory splitSettings = s_splitSettings;
	// 	IGiftyToken GFT = IGiftyToken(s_giftyToken);

	// 	GFT.burn();
	// }

	// function swapExactInputSingle(
	// 	address router,
	// 	address tokenIn,
	// 	address tokenOut,
	// 	uint256 amountIn
	// ) private returns (uint256 amountOut) {
	// 	IERC20Upgradeable(tokenIn).safeApprove(router, amountIn);

	// 	ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
	// 		tokenIn: tokenIn,
	// 		tokenOut: tokenOut,
	// 		fee: 3000,
	// 		recipient: address(this),
	// 		deadline: block.timestamp,
	// 		amountIn: amountIn,
	// 		amountOutMinimum: 0,
	// 		sqrtPriceLimitX96: 0
	// 	});

	// 	amountOut = ISwapRouter(router).exactInputSingle(params);
	// }

	// function getSplitSettings() external view returns (SplitSettings memory) {
	// 	return s_splitSettings;
	// }

	function getGiftyAddress() external view returns (address) {
		return s_gifty;
	}
}

// из контракта гифти выводим деньги на пигги, там у пигги есть функция сплита комиссии. ИДЕТ ПРОЦЕНТНЫЙ минт берн и последняя часть отправляется по адресу, который указал овнер
        