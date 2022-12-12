import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";
import { commissionSettings } from "../../TestHelper";

describe("GiftyController | changeFeeSettings", function () {
	it("Caller not the owner should be reverted", async function () {
		const { gifty, signers } = await loadFixture(GiftyFixture);

		await expect(
			gifty
				.connect(signers[0])
				.changeFeeSettings(commissionSettings.commissions)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("Successfully changed CommissionSizes", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await gifty.changeFeeSettings(commissionSettings.commissions);
		const { commissions } = await gifty.getCommissionSettings();

		expect(commissions.full.l1).eq(commissionSettings.commissions.full.l1);
		expect(commissions.reduced.l1).eq(
			commissionSettings.commissions.reduced.l1
		);

		expect(commissions.full.l2).eq(commissionSettings.commissions.full.l2);
		expect(commissions.reduced.l2).eq(
			commissionSettings.commissions.reduced.l2
		);

		expect(commissions.full.l3).eq(commissionSettings.commissions.full.l3);
		expect(commissions.reduced.l3).eq(
			commissionSettings.commissions.reduced.l3
		);

		expect(commissions.full.l4).eq(commissionSettings.commissions.full.l4);
		expect(commissions.reduced.l4).eq(
			commissionSettings.commissions.reduced.l4
		);
	});

	it("FullCommissionsChanged should be emmited after setting value", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changeFeeSettings(commissionSettings.commissions)
		).to.emit(gifty, "FullCommissionsChanged");
	});

	it("ReducedCommissionsChanged should be emmited after setting value", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changeFeeSettings(commissionSettings.commissions)
		).to.emit(gifty, "ReducedCommissionsChanged");
	});
});
