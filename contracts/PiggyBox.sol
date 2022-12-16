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

	address private s_gifty;

	event GiftyChanged(address indexed gifty);
	event PiggyBoxFunded(uint256 amount);
	event TokenWithdrawn(address indexed token, address indexed to, uint256 amount);
	event ETHWithdrawn(address indexed to, uint256 amount);

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

	function getGiftyAddress() external view returns (address) {
		return s_gifty;
	}
}
