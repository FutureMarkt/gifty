// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";

import "@openzeppelin/contracts/utils/math/SafeCast.sol";

error UniV3PriceOracle__priceIsZero();

library UniV3PriceOracle {
	using SafeCast for uint256;

	function getPriceOfExactAmount(
		uint256 amount,
		address tokenIn,
		address tokenOut,
		uint24 fee,
		uint32 secondsAgo
	) internal view returns (uint256) {
		address pool = IUniswapV3Factory(0x1F98431c8aD98523631AE4a59f267346ea31F984).getPool(
			tokenIn,
			tokenOut,
			fee
		);

		(int24 tick, ) = OracleLibrary.consult(pool, secondsAgo);
		uint256 price = OracleLibrary.getQuoteAtTick(tick, amount.toUint128(), tokenIn, tokenOut);

		if (price == 0) revert UniV3PriceOracle__priceIsZero();

		return price;
	}
}
