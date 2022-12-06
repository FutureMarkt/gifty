import { expect } from "chai";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { ZeroAddress, secondsAgo } from "../TestHelper";
import { Gifty, Gifty__factory } from "../../typechain-types";
import * as dataHelper from "../../dataHelper";

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
				dataHelper.minGiftPriceInUsd,
				dataHelper.giftRefundWithCommissionThresholdInBlocks,
				dataHelper.giftRefundWithoutCommissionThresholdInBlocks,
				dataHelper.refundGiftCommission
			)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_8");
	});

	it("Only owner can initialize contract", async function () {
		const { owner, piggyBox, uniswapPoolMock, signers } =
			await loadFixture(GiftyFixture);

		const gifty: Gifty = await new Gifty__factory(owner).deploy();

		await expect(
			gifty
				.connect(signers[0])
				.initialize(
					ZeroAddress,
					piggyBox.address,
					uniswapPoolMock.address,
					1800,
					dataHelper.minGiftPriceInUsd,
					dataHelper.giftRefundWithCommissionThresholdInBlocks,
					dataHelper.giftRefundWithoutCommissionThresholdInBlocks,
					dataHelper.refundGiftCommission
				)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("Initialize should be called once", async function () {
		const { gifty, piggyBox, uniswapPoolMock } = await loadFixture(
			GiftyFixture
		);

		await expect(
			gifty.initialize(
				ZeroAddress,
				piggyBox.address,
				uniswapPoolMock.address,
				1800,
				dataHelper.minGiftPriceInUsd,
				dataHelper.giftRefundWithCommissionThresholdInBlocks,
				dataHelper.giftRefundWithoutCommissionThresholdInBlocks,
				dataHelper.refundGiftCommission
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

	it("minGiftPrice initialized correctly", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		const minGiftPriceFromContract: BigNumber =
			await gifty.getMinimalGiftPrice();
		expect(minGiftPriceFromContract).eq(dataHelper.minGiftPriceInUsd);
	});

	it("Refund with commission threshold equal to value from dataHelper", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		const { refundGiftWithCommissionThreshold } =
			await gifty.getRefundSettings();

		expect(refundGiftWithCommissionThreshold).eq(
			dataHelper.giftRefundWithCommissionThresholdInBlocks
		);
	});

	it("Refund (commission free) threshold equal to value from dataHelper", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		const { freeRefundGiftThreshold } = await gifty.getRefundSettings();
		expect(freeRefundGiftThreshold).eq(
			dataHelper.giftRefundWithoutCommissionThresholdInBlocks
		);
	});

	it("Refund fee equal to value from dataHelper", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		const { giftRefundCommission } = await gifty.getRefundSettings();
		expect(giftRefundCommission).eq(dataHelper.refundGiftCommission);
	});

	it("Version is equal to 1", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		const version: BigNumber = await gifty.version();
		expect(version).eq(1);
	});
});
