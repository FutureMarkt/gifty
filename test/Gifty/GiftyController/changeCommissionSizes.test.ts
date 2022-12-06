import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";

describe("GiftyController | changeCommissionSizes", function () {
	const newCommissionSizeSettings = {
		size1: 10,
		size2: 20,
		size3: 30,
		size4: 40,
	};

	it("Caller not the owner should be reverted", async function () {
		const { gifty, signers } = await loadFixture(GiftyFixture);

		await expect(
			gifty
				.connect(signers[0])
				.changeCommissionSizes(newCommissionSizeSettings)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("Successfully changed CommissionSizes", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await gifty.changeCommissionSizes(newCommissionSizeSettings);
		const { sizes } = await gifty.getCommissionSettings();

		expect(sizes.size1).eq(newCommissionSizeSettings.size1);
		expect(sizes.size2).eq(newCommissionSizeSettings.size2);
		expect(sizes.size3).eq(newCommissionSizeSettings.size3);
		expect(sizes.size4).eq(newCommissionSizeSettings.size4);
	});

	it("ComissionSizesChanged should be emmited after setting value", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changeCommissionSizes(newCommissionSizeSettings)
		).to.emit(gifty, "ComissionSizesChanged");
	});
});
