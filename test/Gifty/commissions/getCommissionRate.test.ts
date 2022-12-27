import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";
import { commissionSettings } from "../../TestHelper";

import { ethers } from "hardhat";
import { BigNumber } from "ethers";

const parseEther: Function = ethers.utils.parseEther;

describe("Gifty | getCommissionRate", function () {
	it("If giftPrice less than t1 - revert", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		const t1: BigNumber = BigNumber.from("15000000000000000000");

		const giftPriceInUSD: number = 1;

		await expect(gifty.getCommissionRate(giftPriceInUSD))
			.to.be.revertedWithCustomError(gifty, "Gifty__tooLowGiftPrice")
			.withArgs(giftPriceInUSD, t1);
	});

	it("If gift price in USD between t1 and t2 => commissions are correct", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		// Git price equal to 16 USD: t1(15 USD) < giftPrice < t2(100 USD)
		const giftPriceInUSD: BigNumber = parseEther("16");

		const rates: BigNumber[] = await gifty.getCommissionRate(
			giftPriceInUSD
		);

		expect(rates[0]).eq(commissionSettings.commissions.full.l1);
		expect(rates[1]).eq(
			commissionSettings.commissions.reduced.l1.toString()
		);
	});

	it("If gift price in USD between t2 and t3 => commissions are correct", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		// Git price equal to 16 USD: t1(15 USD) < giftPrice < t2(100 USD)
		const giftPriceInUSD: BigNumber = parseEther("101");

		const rates: BigNumber[] = await gifty.getCommissionRate(
			giftPriceInUSD
		);

		expect(rates[0]).eq(commissionSettings.commissions.full.l2);
		expect(rates[1]).eq(
			commissionSettings.commissions.reduced.l2.toString()
		);
	});

	it("If gift price in USD between t3 and t4 => commissions are correct", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		// Git price equal to 16 USD: t1(15 USD) < giftPrice < t2(100 USD)
		const giftPriceInUSD: BigNumber = ethers.utils.parseEther("1001");

		const rates: BigNumber[] = await gifty.getCommissionRate(
			giftPriceInUSD
		);

		expect(rates[0]).eq(commissionSettings.commissions.full.l3);
		expect(rates[1]).eq(
			commissionSettings.commissions.reduced.l3.toString()
		);
	});

	it("If gift price in USD > t4 => commissions are correct", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		// Git price equal to 16 USD: t1(15 USD) < giftPrice < t2(100 USD)
		const giftPriceInUSD: BigNumber = ethers.utils.parseEther("10001");

		const rates: BigNumber[] = await gifty.getCommissionRate(
			giftPriceInUSD
		);

		expect(rates[0]).eq(commissionSettings.commissions.full.l4);
		expect(rates[1]).eq(
			commissionSettings.commissions.reduced.l4.toString()
		);
	});
});
