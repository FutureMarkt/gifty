import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "./fixtures/GiftyFixture";
import { BigNumber } from "ethers";

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
});
