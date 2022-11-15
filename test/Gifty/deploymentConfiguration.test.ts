import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "./fixtures/GiftyFixture";
import { NonZeroAddress, ZeroAddress } from "../TestHelper";
import { BigNumber } from "ethers";
import { Gifty__factory } from "../../typechain-types";
import {
	giftRefundWithCommissionThresholdInBlocks,
	giftRefundWithoutCommissionThresholdInBlocks,
	refundGiftCommission,
} from "../../dataHelper";

describe("Gifty | Deployment configuration", function () {
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

	it("When contract constructed and giftyToken address eq 0 revert", async function () {
		const { owner } = await loadFixture(GiftyFixture);

		// Deploy gifty main contract
		await expect(
			new Gifty__factory(owner).deploy(
				ZeroAddress,
				ZeroAddress,
				0,
				0,
				0,
				0,
				[],
				[],
				ZeroAddress
			)
		).to.be.reverted;
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
});
