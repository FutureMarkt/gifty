// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {Gifty} from "../Gifty.sol";

contract NewGiftyVersionMock is Gifty {
	function version() external pure override returns (uint256) {
		return 2;
	}
}
