import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { NonZeroAddress, ZeroAddress } from "../TestHelper";
import { BigNumber } from "ethers";
import {
	giftRefundWithCommissionThresholdInBlocks,
	giftRefundWithoutCommissionThresholdInBlocks,
	minGiftPriceInUsd,
	refundGiftCommission,
} from "../../dataHelper";
import { Gifty, Gifty__factory } from "../../typechain-types";

describe("Gifty | Initialize configuration", function () {
	it("Version is equal to 1", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		const version: BigNumber = await gifty.version();
		expect(version).eq(1);
	});

	it("Refund with commission threshold equal to value from dataHelper", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		const { refundGiftWithCommissionThreshold } =
			await gifty.getRefundSettings();

		expect(refundGiftWithCommissionThreshold).eq(
			giftRefundWithCommissionThresholdInBlocks
		);
	});

	it("Refund (commission free) threshold equal to value from dataHelper", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		const { freeRefundGiftThreshold } = await gifty.getRefundSettings();

		expect(freeRefundGiftThreshold).eq(
			giftRefundWithoutCommissionThresholdInBlocks
		);
	});

	it("Refund fee equal to value from dataHelper", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		const { giftRefundCommission } = await gifty.getRefundSettings();

		expect(giftRefundCommission).eq(refundGiftCommission);
	});

	it("If price feed is zero address - revert", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		expect(gifty.getPriceFeedForToken(NonZeroAddress))
			.to.be.revertedWithCustomError(gifty, "Gifty__error_4")
			.withArgs(NonZeroAddress);
	});

	it("Gifty token setted correctly", async function () {
		const { gifty, giftyToken } = await loadFixture(GiftyFixture);

		const gTokenFromContract: string = await gifty.getGiftyToken();

		expect(gTokenFromContract).eq(giftyToken.address);
	});

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
				minGiftPriceInUsd,
				giftRefundWithCommissionThresholdInBlocks,
				giftRefundWithoutCommissionThresholdInBlocks,
				refundGiftCommission
			)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_8");
	});
});
