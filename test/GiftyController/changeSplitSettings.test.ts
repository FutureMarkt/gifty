import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { spllitCommissionSettings, ZeroAddress } from "../TestHelper";

describe.only("GiftyController | changeSpllitSettings", function () {
	it("Caller not the owner should be reverted", async function () {
		const { gifty, signers } = await loadFixture(GiftyFixture);

		await expect(
			gifty
				.connect(signers[0])
				.changeSplitSettings(spllitCommissionSettings)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("If totalAmount gt 1000 - revert", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changeSplitSettings({
				mintPercentage: 1000,
				burnPercentage: 1000,
			})
		)
			.to.be.revertedWithCustomError(gifty, "Gifty__incorrectPercentage")
			.withArgs(2000);
	});

	it("If router address is address(0) - revert", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changeSplitSettings({
				router: ZeroAddress,
				mintPercentage: 250,
				burnPercentage: 250,
			})
		)
			.to.be.revertedWithCustomError(gifty, "Gifty__incorrectPercentage")
			.withArgs(2000);
	});

	it("дд changed split settings", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await gifty.changeSplitSettings(spllitCommissionSettings);

		const { burnPercentage, mintPercentage } =
			await gifty.getSplitSettings();

		expect(burnPercentage).eq(spllitCommissionSettings.burnPercentage);
		expect(mintPercentage).eq(spllitCommissionSettings.mintPercentage);
	});

	it("SplitSettingsChanged should be emmited after setting value", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(gifty.changeSplitSettings(spllitCommissionSettings))
			.to.emit(gifty, "SplitSettingsChanged")
			.withArgs(
				spllitCommissionSettings.mintPercentage,
				spllitCommissionSettings.burnPercentage
			);
	});
});
