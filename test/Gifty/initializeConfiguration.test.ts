import { expect } from "chai";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { ZeroAddress, secondsAgo } from "../TestHelper";
import { Gifty, Gifty__factory } from "../../typechain-types";
import { refundParams, commissionSettings } from "../TestHelper";

describe("Gifty | Initialize configuration", function () {
	it("If giftyToken in initializer equal to zero address - revert", async function () {
		const { owner, piggyBox, uniswapPoolMock } = await loadFixture(
			GiftyFixture
		);

		const gifty: Gifty = await new Gifty__factory(owner).deploy();
		await expect(
			gifty.initialize(
				ZeroAddress,
				piggyBox.address,
				uniswapPoolMock.address,
				1800,
				refundParams,
				commissionSettings.thresholds,
				commissionSettings.commissions
			)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_8");
	});

	it("Initialize should be called once", async function () {
		const { gifty, piggyBox, uniswapPoolMock, giftyToken } =
			await loadFixture(GiftyFixture);

		await expect(
			gifty.initialize(
				giftyToken.address,
				piggyBox.address,
				uniswapPoolMock.address,
				1800,
				refundParams,
				commissionSettings.thresholds,
				commissionSettings.commissions
			)
		).to.be.revertedWith("Initializable: contract is already initialized");
	});

	it("Gifty token initialized correctly", async function () {
		const { gifty, giftyToken } = await loadFixture(GiftyFixture);

		const giftyTokenFromContract: string = await gifty.getGiftyToken();
		expect(giftyTokenFromContract).eq(giftyToken.address);
	});

	it("PiggyBox initialized correctly", async function () {
		const { gifty, piggyBox } = await loadFixture(GiftyFixture);

		const piggyBoxFromContract: string = await gifty.getPiggyBox();
		expect(piggyBoxFromContract).eq(piggyBox.address);
	});

	it("UniswapV3Config initialized correctly", async function () {
		const { gifty, uniswapPoolMock, testToken } = await loadFixture(
			GiftyFixture
		);

		const {
			pool,
			anotherTokenInPool,
			secondsAgo: secondsAgoFromContract,
		} = await gifty.getUniswapConfig();

		expect(pool).eq(uniswapPoolMock.address);
		expect(anotherTokenInPool).eq(testToken.address);
		expect(secondsAgoFromContract).eq(secondsAgo);
	});

	it("Refund with commission threshold equal to value from dataHelper", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		const { refundGiftWithCommissionThreshold } =
			await gifty.getRefundSettings();

		expect(refundGiftWithCommissionThreshold).eq(
			refundParams.refundGiftWithCommissionThreshold
		);
	});

	it("Refund (commission free) threshold equal to value from dataHelper", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		const { freeRefundGiftThreshold } = await gifty.getRefundSettings();
		expect(freeRefundGiftThreshold).eq(
			refundParams.freeRefundGiftThreshold
		);
	});

	it("Refund fee equal to value from dataHelper", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		const { giftRefundCommission } = await gifty.getRefundSettings();
		expect(giftRefundCommission).eq(refundParams.giftRefundCommission);
	});

	it("Version is equal to 1", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		const version: BigNumber = await gifty.version();
		expect(version).eq(1);
	});
});
