import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";

describe.only("GiftyController | changeCommissionSettings", function () {
	const newCommissionSizeSettings = {
		size1: 10,
		size2: 20,
		size3: 30,
		size4: 40,
	};

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
				.changeCommissionSettings(
					newThresholdsSettings,
					newCommissionSizeSettings
				)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("Successfully changed CommissionSizes", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await gifty.changeCommissionSettings(
			newThresholdsSettings,
			newCommissionSizeSettings
		);

		const { sizes, thresholds } = await gifty.getCommissionSettings();

		expect(sizes.size1).eq(newCommissionSizeSettings.size1);
		expect(sizes.size2).eq(newCommissionSizeSettings.size2);
		expect(sizes.size3).eq(newCommissionSizeSettings.size3);
		expect(sizes.size4).eq(newCommissionSizeSettings.size4);

		expect(thresholds.threshold1).eq(newThresholdsSettings.threshold1);
		expect(thresholds.threshold2).eq(newThresholdsSettings.threshold2);
		expect(thresholds.threshold3).eq(newThresholdsSettings.threshold3);
		expect(thresholds.threshold4).eq(newThresholdsSettings.threshold4);
	});

	it("ComissionSizesChanged should be emmited after setting value", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changeCommissionSettings(
				newThresholdsSettings,
				newCommissionSizeSettings
			)
		).to.emit(gifty, "ComissionSizesChanged");
	});

	it("ComissionThresholdsChanged should be emmited after setting value", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changeCommissionSettings(
				newThresholdsSettings,
				newCommissionSizeSettings
			)
		).to.emit(gifty, "ComissionThresholdsChanged");
	});
});
