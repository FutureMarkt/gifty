import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";
import { NonZeroAddress, ZeroAddress } from "../../TestHelper";
import {
	MockToken,
	MockToken__factory,
	UniswapV3OracleMock,
	UniswapV3OracleMock__factory,
} from "../../../typechain-types";

describe("GiftyController | chnageUniswapConfig", function () {
	it("Caller not the owner should be reverted", async function () {
		const { gifty, signers } = await loadFixture(GiftyFixture);

		await expect(
			gifty.connect(signers[0]).changeUniswapConfig(NonZeroAddress, 0)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("If pool equal to address zero should be reverted", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changeUniswapConfig(ZeroAddress, 0)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_8");
	});

	it("Pool correctly changed", async function () {
		const { gifty, owner, giftyToken } = await loadFixture(GiftyFixture);

		const newSecondsAgo: number = 10;

		const newPool: UniswapV3OracleMock =
			await new UniswapV3OracleMock__factory(owner).deploy();

		const newToken: MockToken = await new MockToken__factory(
			owner
		).deploy();

		await newPool.initialize(newToken.address, giftyToken.address, {
			tick: 0,
			time: 0,
			liquidity: 100,
		});

		await gifty.changeUniswapConfig(newPool.address, newSecondsAgo);

		const { pool } = await gifty.getUniswapConfig();

		expect(pool).eq(newPool.address);
	});

	it("AnotherTokenInPool correctly changed", async function () {
		const { gifty, owner, giftyToken } = await loadFixture(GiftyFixture);

		const newSecondsAgo: number = 10;

		const newPool: UniswapV3OracleMock =
			await new UniswapV3OracleMock__factory(owner).deploy();

		const newToken: MockToken = await new MockToken__factory(
			owner
		).deploy();

		await newPool.initialize(newToken.address, giftyToken.address, {
			tick: 0,
			time: 0,
			liquidity: 100,
		});

		await gifty.changeUniswapConfig(newPool.address, newSecondsAgo);

		const { anotherTokenInPool } = await gifty.getUniswapConfig();

		expect(anotherTokenInPool).eq(newToken.address);
	});

	it("SecondsAgo correctly changed", async function () {
		const { gifty, owner, giftyToken } = await loadFixture(GiftyFixture);

		const newSecondsAgo: number = 10;

		const newPool: UniswapV3OracleMock =
			await new UniswapV3OracleMock__factory(owner).deploy();

		const newToken: MockToken = await new MockToken__factory(
			owner
		).deploy();

		await newPool.initialize(newToken.address, giftyToken.address, {
			tick: 0,
			time: 0,
			liquidity: 100,
		});

		await gifty.changeUniswapConfig(newPool.address, newSecondsAgo);

		const { secondsAgo } = await gifty.getUniswapConfig();

		expect(secondsAgo).eq(newSecondsAgo);
	});

	it("All props correctly changed, when GFT token is token0", async function () {
		const { gifty, owner, giftyToken } = await loadFixture(GiftyFixture);

		const newSecondsAgo: number = 10;

		const newPool: UniswapV3OracleMock =
			await new UniswapV3OracleMock__factory(owner).deploy();

		const newToken: MockToken = await new MockToken__factory(
			owner
		).deploy();

		await newPool.initialize(giftyToken.address, newToken.address, {
			tick: 0,
			time: 0,
			liquidity: 100,
		});

		await gifty.changeUniswapConfig(newPool.address, newSecondsAgo);

		const { pool, anotherTokenInPool, secondsAgo } =
			await gifty.getUniswapConfig();

		expect(pool).eq(newPool.address);
		expect(anotherTokenInPool).eq(newToken.address);
		expect(secondsAgo).eq(newSecondsAgo);
	});

	it("If GFT token does not exist in the pool should be reverted", async function () {
		const { gifty, owner } = await loadFixture(GiftyFixture);

		const newSecondsAgo: number = 10;

		const newPool: UniswapV3OracleMock =
			await new UniswapV3OracleMock__factory(owner).deploy();

		const newToken0: MockToken = await new MockToken__factory(
			owner
		).deploy();

		const newToken1: MockToken = await new MockToken__factory(
			owner
		).deploy();

		await newPool.initialize(newToken0.address, newToken1.address, {
			tick: 0,
			time: 0,
			liquidity: 100,
		});

		await expect(
			gifty.changeUniswapConfig(newPool.address, newSecondsAgo)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_23");
	});
});
