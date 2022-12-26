import bn from "bignumber.js";
import { BigNumber, BigNumberish } from "ethers";

import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

import type { MockTimeNonfungiblePositionManager } from "../../typechain-types";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 });

export enum FeeAmount {
	LOW = 500,
	MEDIUM = 3000,
	HIGH = 10000,
}

export const TICK_SPACINGS: { [amount in FeeAmount]: number } = {
	[FeeAmount.LOW]: 10,
	[FeeAmount.MEDIUM]: 60,
	[FeeAmount.HIGH]: 200,
};

// returns the sqrt price as a 64x96
export function encodePriceSqrt(
	reserve1: BigNumberish,
	reserve0: BigNumberish
): BigNumber {
	return BigNumber.from(
		new bn(reserve1.toString())
			.div(reserve0.toString())
			.sqrt()
			.multipliedBy(new bn(2).pow(96))
			.integerValue(3)
			.toString()
	);
}

export const getMinTick = (tickSpacing: number) =>
	Math.ceil(-887272 / tickSpacing) * tickSpacing;
export const getMaxTick = (tickSpacing: number) =>
	Math.floor(887272 / tickSpacing) * tickSpacing;

export async function createPool(
	signer: SignerWithAddress,
	tokenAddressA: string,
	tokenAddressB: string,
	nft: MockTimeNonfungiblePositionManager
) {
	if (tokenAddressA.toLowerCase() > tokenAddressB.toLowerCase())
		[tokenAddressA, tokenAddressB] = [tokenAddressB, tokenAddressA];

	await nft.createAndInitializePoolIfNecessary(
		tokenAddressA,
		tokenAddressB,
		FeeAmount.MEDIUM,
		encodePriceSqrt(100005, 100000) // we don't want to cross any ticks
	);

	const thousand: BigNumber = ethers.utils.parseEther("1000");

	const liquidityParams = {
		token0: tokenAddressA,
		token1: tokenAddressB,
		fee: FeeAmount.MEDIUM,
		tickLower: getMinTick(TICK_SPACINGS[FeeAmount.MEDIUM]),
		tickUpper: getMaxTick(TICK_SPACINGS[FeeAmount.MEDIUM]),
		recipient: signer.address,
		amount0Desired: thousand,
		amount1Desired: thousand,
		amount0Min: 0,
		amount1Min: 0,
		deadline: (await time.latest()) + 1,
	};

	return await nft.mint(liquidityParams);
}
