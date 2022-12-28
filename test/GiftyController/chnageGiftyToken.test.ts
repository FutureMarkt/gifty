import { expect } from "chai";

import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";

import { ethers } from "hardhat";
import { BigNumber } from "ethers";

import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { ZeroAddress, NonZeroAddress } from "../TestHelper";

import {
	UniswapV3OracleMock,
	UniswapV3OracleMock__factory,
} from "../../typechain-types";

async function createNewPool(
	owner: SignerWithAddress,
	token0: string,
	token1: string
): Promise<UniswapV3OracleMock> {
	const newPool: UniswapV3OracleMock =
		await new UniswapV3OracleMock__factory(owner).deploy();

	await newPool.initialize(token0, token1, {
		time: await time.latest(),
		tick: 0,
		liquidity: "1000000000000000000",
	});

	return newPool;
}

const secAgo: number = 1800;

describe("GiftyController | changeGiftyToken", function () {
	it("Caller not the owner should be reverted", async function () {
		const { gifty, signers } = await loadFixture(GiftyFixture);

		await expect(
			gifty
				.connect(signers[0])
				.changeGiftyToken(NonZeroAddress, NonZeroAddress, secAgo)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("If newGiftyToken is zero address - revert", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changeGiftyToken(ZeroAddress, NonZeroAddress, secAgo)
		).to.be.revertedWithCustomError(gifty, "Gifty__zeroParam");
	});

	it("If pool is zero address - revert", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changeGiftyToken(NonZeroAddress, ZeroAddress, secAgo)
		).to.be.revertedWithCustomError(gifty, "Gifty__zeroParam");
	});

	it("If giftyToken already exist should be called deleteToken", async function () {
		const { owner, gifty, giftyToken, anotherTestToken, testToken } =
			await loadFixture(GiftyFixture);

		const newGiftyToken = anotherTestToken;

		const newPool: UniswapV3OracleMock = await createNewPool(
			owner,
			newGiftyToken.address,
			testToken.address
		);

		await expect(
			gifty.changeGiftyToken(
				anotherTestToken.address,
				newPool.address,
				secAgo
			)
		)
			.to.emit(gifty, "TokenDeleted")
			.withArgs(giftyToken.address);
	});

	it("If earned commission exist -> should be transfered to piggyBox", async function () {
		const {
			owner,
			receiver,
			gifty,
			giftyToken,
			anotherTestToken,
			testToken,
			piggyBox,
		} = await loadFixture(GiftyFixture);

		const newGiftyToken = anotherTestToken;

		const newPool: UniswapV3OracleMock = await createNewPool(
			owner,
			newGiftyToken.address,
			testToken.address
		);

		const giftAmount: BigNumber = ethers.utils.parseEther("1000");

		await gifty.giftTokenWithGFTCommission(
			receiver.address,
			giftyToken.address,
			giftAmount
		);

		const earnedCommission: BigNumber =
			await gifty.getGiftyEarnedCommission(giftyToken.address);

		await expect(
			gifty.changeGiftyToken(
				anotherTestToken.address,
				newPool.address,
				secAgo
			)
		).to.changeTokenBalances(
			giftyToken,
			[gifty.address, piggyBox.address],
			["-" + earnedCommission, earnedCommission]
		);
	});

	it("Gifty token replaced", async function () {
		const { gifty, owner, anotherTestToken, testToken } =
			await loadFixture(GiftyFixture);

		const newGiftyToken = anotherTestToken;

		const newPool: UniswapV3OracleMock = await createNewPool(
			owner,
			newGiftyToken.address,
			testToken.address
		);

		await gifty.changeGiftyToken(
			anotherTestToken.address,
			newPool.address,
			secAgo
		);

		const replacedToken: string = await gifty.getGiftyToken();

		expect(replacedToken).eq(newGiftyToken.address);
	});

	it("New GiftyToken added to the array of allowed tokens", async function () {
		const { gifty, owner, anotherTestToken, testToken } =
			await loadFixture(GiftyFixture);

		const newGiftyToken = anotherTestToken;

		const newPool: UniswapV3OracleMock = await createNewPool(
			owner,
			newGiftyToken.address,
			testToken.address
		);

		await gifty.changeGiftyToken(
			anotherTestToken.address,
			newPool.address,
			secAgo
		);

		const allTokens: string[] = await gifty.getAllowedTokens();

		const isNewGiftyTokenIncludedToAllowedTokens: boolean =
			allTokens.includes(newGiftyToken.address);

		expect(isNewGiftyTokenIncludedToAllowedTokens).true;
	});

	it("GiftyTokenChanged emmited", async function () {
		const { gifty, owner, anotherTestToken, testToken } =
			await loadFixture(GiftyFixture);

		const newGiftyToken = anotherTestToken;

		const newPool: UniswapV3OracleMock = await createNewPool(
			owner,
			newGiftyToken.address,
			testToken.address
		);

		await expect(
			gifty.changeGiftyToken(
				anotherTestToken.address,
				newPool.address,
				secAgo
			)
		)
			.to.emit(gifty, "GiftyTokenChanged")
			.withArgs(newGiftyToken.address);
	});

	it("Uniswap config updated", async function () {
		const { gifty, owner, anotherTestToken, testToken } =
			await loadFixture(GiftyFixture);

		const newGiftyToken = anotherTestToken;

		const newPool: UniswapV3OracleMock = await createNewPool(
			owner,
			newGiftyToken.address,
			testToken.address
		);

		await gifty.changeGiftyToken(
			anotherTestToken.address,
			newPool.address,
			secAgo
		);

		const { secondsAgo, pool, anotherTokenInPool } =
			await gifty.getUniswapConfig();

		expect(secondsAgo).eq(secAgo);
		expect(pool).eq(newPool.address);
		expect(anotherTokenInPool).eq(testToken.address);
	});
});
