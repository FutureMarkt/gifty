import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";
import { commissionSettings } from "../../TestHelper";

describe("GiftyController | changeCommissionSettings", function () {
	it("Caller not the owner should be reverted", async function () {
		const { gifty, signers } = await loadFixture(GiftyFixture);

		await expect(
			gifty
				.connect(signers[0])
				.changeCommissionSettings(
					commissionSettings.thresholds,
					commissionSettings.commissions
				)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("Successfully changed commissions thresholds", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await gifty.changeCommissionSettings(
			commissionSettings.thresholds,
			commissionSettings.commissions
		);

		const { thresholds: contractThresholds } =
			await gifty.getCommissionSettings();

		expect(contractThresholds.t1).eq(commissionSettings.thresholds.t1);
		expect(contractThresholds.t2).eq(commissionSettings.thresholds.t2);
		expect(contractThresholds.t3).eq(commissionSettings.thresholds.t3);
		expect(contractThresholds.t4).eq(commissionSettings.thresholds.t4);
	});

	it("Successfully changed commissions amounts", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await gifty.changeCommissionSettings(
			commissionSettings.thresholds,
			commissionSettings.commissions
		);

		const { commissions: contractCommissions } =
			await gifty.getCommissionSettings();

		expect(contractCommissions.l1.full).eq(
			commissionSettings.commissions.l1.full
		);
		expect(contractCommissions.l1.reduced).eq(
			commissionSettings.commissions.l1.reduced
		);

		expect(contractCommissions.l2.full).eq(
			commissionSettings.commissions.l2.full
		);
		expect(contractCommissions.l2.reduced).eq(
			commissionSettings.commissions.l2.reduced
		);

		expect(contractCommissions.l3.full).eq(
			commissionSettings.commissions.l3.full
		);
		expect(contractCommissions.l3.reduced).eq(
			commissionSettings.commissions.l3.reduced
		);

		expect(contractCommissions.l4.full).eq(
			commissionSettings.commissions.l4.full
		);
		expect(contractCommissions.l4.reduced).eq(
			commissionSettings.commissions.l4.reduced
		);
	});

	it("ComissionSizesChanged should be emmited after setting value", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changeCommissionSettings(
				commissionSettings.thresholds,
				commissionSettings.commissions
			)
		).to.emit(gifty, "ComissionsChanged");
	});

	it("ComissionThresholdsChanged should be emmited after setting value", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changeCommissionSettings(
				commissionSettings.thresholds,
				commissionSettings.commissions
			)
		).to.emit(gifty, "ComissionThresholdsChanged");
	});
});
