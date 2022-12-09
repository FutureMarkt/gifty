import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyUint } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

import { GiftyFixture } from "../../fixtures/GiftyFixture";
import { commissionSettings } from "../../TestHelper";

import { ethers } from "hardhat";
import { BigNumber } from "ethers";

describe("Gifty | getCommissionRate", function () {
	it("If giftPrice less than t1 - revert", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		const t1: BigNumber = BigNumber.from("15000000000000000000");

		const giftPriceInUSD: number = 1;

		await expect(gifty.getCommissionRate(giftPriceInUSD))
			.to.be.revertedWithCustomError(gifty, "Gifty__error_9")
			.withArgs(giftPriceInUSD, t1);
	});

	it("If gift price in USD between t1 and t2 => commissions are correct", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		// Git price equal to 16 USD: t1(15 USD) < giftPrice < t2(100 USD)
		const giftPriceInUSD: BigNumber = ethers.utils.parseEther("16");

		const rates: BigNumber[] = await gifty.getCommissionRate(
			giftPriceInUSD
		);

		expect(rates[0]).eq(commissionSettings.commissions.l1.full);
		expect(rates[1]).eq(commissionSettings.commissions.l1.reduced);
	});

	it("If gift price in USD between t2 and t3 => commissions are correct", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		// Git price equal to 16 USD: t1(15 USD) < giftPrice < t2(100 USD)
		const giftPriceInUSD: BigNumber = ethers.utils.parseEther("101");

		const rates: BigNumber[] = await gifty.getCommissionRate(
			giftPriceInUSD
		);

		expect(rates[0]).eq(commissionSettings.commissions.l2.full);
		expect(rates[1]).eq(commissionSettings.commissions.l2.reduced);
	});

	it("If gift price in USD between t3 and t4 => commissions are correct", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		// Git price equal to 16 USD: t1(15 USD) < giftPrice < t2(100 USD)
		const giftPriceInUSD: BigNumber = ethers.utils.parseEther("1001");

		const rates: BigNumber[] = await gifty.getCommissionRate(
			giftPriceInUSD
		);

		expect(rates[0]).eq(commissionSettings.commissions.l3.full);
		expect(rates[1]).eq(commissionSettings.commissions.l3.reduced);
	});

	it("If gift price in USD > t4 => commissions are correct", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		// Git price equal to 16 USD: t1(15 USD) < giftPrice < t2(100 USD)
		const giftPriceInUSD: BigNumber = ethers.utils.parseEther("10001");

		const rates: BigNumber[] = await gifty.getCommissionRate(
			giftPriceInUSD
		);

		expect(rates[0]).eq(commissionSettings.commissions.l4.full);
		expect(rates[1]).eq(commissionSettings.commissions.l4.reduced);
	});
});
