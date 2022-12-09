import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";
import { commissionSettings } from "../../TestHelper";

describe("GiftyController | changeCommissionSizes", function () {
	it("Caller not the owner should be reverted", async function () {
		const { gifty, signers } = await loadFixture(GiftyFixture);

		await expect(
			gifty
				.connect(signers[0])
				.changeCommissionSizes(commissionSettings.commissions)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("Successfully changed CommissionSizes", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await gifty.changeCommissionSizes(commissionSettings.commissions);
		const { commissions } = await gifty.getCommissionSettings();

		expect(commissions.l1.full).eq(commissionSettings.commissions.l1.full);
		expect(commissions.l1.reduced).eq(
			commissionSettings.commissions.l1.reduced
		);

		expect(commissions.l2.full).eq(commissionSettings.commissions.l2.full);
		expect(commissions.l2.reduced).eq(
			commissionSettings.commissions.l2.reduced
		);

		expect(commissions.l3.full).eq(commissionSettings.commissions.l3.full);
		expect(commissions.l3.reduced).eq(
			commissionSettings.commissions.l3.reduced
		);

		expect(commissions.l4.full).eq(commissionSettings.commissions.l4.full);
		expect(commissions.l4.reduced).eq(
			commissionSettings.commissions.l4.reduced
		);
	});

	it("ComissionSizesChanged should be emmited after setting value", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changeCommissionSizes(commissionSettings.commissions)
		).to.emit(gifty, "ComissionsChanged");
	});
});
