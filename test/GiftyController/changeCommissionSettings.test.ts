import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { commissionSettings } from "../TestHelper";

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

		expect(contractCommissions.full.l1).eq(
			commissionSettings.commissions.full.l1
		);
		expect(contractCommissions.reduced.l1).eq(
			commissionSettings.commissions.reduced.l1
		);

		expect(contractCommissions.full.l2).eq(
			commissionSettings.commissions.full.l2
		);
		expect(contractCommissions.reduced.l2).eq(
			commissionSettings.commissions.reduced.l2
		);

		expect(contractCommissions.full.l3).eq(
			commissionSettings.commissions.full.l3
		);
		expect(contractCommissions.reduced.l3).eq(
			commissionSettings.commissions.reduced.l3
		);

		expect(contractCommissions.full.l4).eq(
			commissionSettings.commissions.full.l4
		);
		expect(contractCommissions.reduced.l4).eq(
			commissionSettings.commissions.reduced.l4
		);
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

	it("ReducedCommissionsChanged should be emmited after setting value", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changeCommissionSettings(
				commissionSettings.thresholds,
				commissionSettings.commissions
			)
		).to.emit(gifty, "ReducedCommissionsChanged");
	});

	it("FullCommissionsChanged should be emmited after setting value", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changeCommissionSettings(
				commissionSettings.thresholds,
				commissionSettings.commissions
			)
		).to.emit(gifty, "FullCommissionsChanged");
	});
});
