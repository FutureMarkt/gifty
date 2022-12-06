import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";

describe("GiftyController | changeCommissionThresholds", function () {
	const newThresholdsSettings = {
		threshold1: 10,
		threshold2: 20,
		threshold3: 30,
		threshold4: 40,
	};

	it("Caller not the owner should be reverted", async function () {
		const { gifty, signers } = await loadFixture(GiftyFixture);

		await expect(
			gifty
				.connect(signers[0])
				.changeCommissionThresholds(newThresholdsSettings)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("Successfully changed CommissionThresholds", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await gifty.changeCommissionThresholds(newThresholdsSettings);

		const { thresholds } = await gifty.getCommissionSettings();

		expect(thresholds.threshold1).eq(newThresholdsSettings.threshold1);
		expect(thresholds.threshold2).eq(newThresholdsSettings.threshold2);
		expect(thresholds.threshold3).eq(newThresholdsSettings.threshold3);
		expect(thresholds.threshold4).eq(newThresholdsSettings.threshold4);
	});

	it("ComissionThresholdsChanged should be emmited after setting value", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changeCommissionThresholds(newThresholdsSettings)
		).to.emit(gifty, "ComissionThresholdsChanged");
	});
});
