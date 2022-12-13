import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";
import { commissionSettings } from "../../TestHelper";

describe("GiftyController | changeCommissionThresholds", function () {
	it("Caller not the owner should be reverted", async function () {
		const { gifty, signers } = await loadFixture(GiftyFixture);

		await expect(
			gifty
				.connect(signers[0])
				.changeCommissionThresholds(commissionSettings.thresholds)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("Successfully changed CommissionThresholds", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await gifty.changeCommissionThresholds(commissionSettings.thresholds);

		const { thresholds } = await gifty.getCommissionSettings();

		expect(thresholds.t1).eq(commissionSettings.thresholds.t1);
		expect(thresholds.t2).eq(commissionSettings.thresholds.t2);
		expect(thresholds.t3).eq(commissionSettings.thresholds.t3);
		expect(thresholds.t4).eq(commissionSettings.thresholds.t4);
	});

	it("ComissionThresholdsChanged should be emmited after setting value", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changeCommissionThresholds(commissionSettings.thresholds)
		).to.emit(gifty, "ComissionThresholdsChanged");
	});
});
