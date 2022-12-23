import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { spllitCommissionSettings, SplitCommission } from "../TestHelper";

describe("PiggyBox | changeSpllitSettings", function () {
	it("Caller not the owner should be reverted", async function () {
		const { piggyBox, signers } = await loadFixture(GiftyFixture);

		await expect(
			piggyBox
				.connect(signers[0])
				.changeSplitSettings(spllitCommissionSettings)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("If totalPercantage gt max amount - revert", async function () {
		const { piggyBox } = await loadFixture(GiftyFixture);

		await expect(
			piggyBox.changeSplitSettings({
				mintPercentage: 10001,
				burnPercentage: 0,
				decimals: 2,
			})
		)
			.to.be.revertedWithCustomError(
				piggyBox,
				"PiggyBox__incorrectPercentage"
			)
			.withArgs(10001);
	});

	it("If decimals is zero - revert", async function () {
		const { piggyBox } = await loadFixture(GiftyFixture);

		await expect(
			piggyBox.changeSplitSettings({
				mintPercentage: 3000,
				burnPercentage: 0,
				decimals: 0,
			})
		).to.be.revertedWithCustomError(piggyBox, "PiggyBox__decimalsIsZero");
	});

	it("All props changed correctly", async function () {
		const { piggyBox } = await loadFixture(GiftyFixture);

		const newSplitSettings: SplitCommission = {
			mintPercentage: 0,
			burnPercentage: 1500,
			decimals: 2,
		};

		await piggyBox.changeSplitSettings(newSplitSettings);

		const { burnPercentage, mintPercentage, decimals } =
			await piggyBox.getSplitSettings();

		expect(burnPercentage).eq(newSplitSettings.burnPercentage);
		expect(mintPercentage).eq(newSplitSettings.mintPercentage);
		expect(decimals).eq(newSplitSettings.decimals);
	});

	it("SplitSettingsChanged should be emmited after setting value", async function () {
		const { piggyBox } = await loadFixture(GiftyFixture);

		await expect(piggyBox.changeSplitSettings(spllitCommissionSettings))
			.to.emit(piggyBox, "SplitSettingsChanged")
			.withArgs(
				spllitCommissionSettings.mintPercentage,
				spllitCommissionSettings.burnPercentage,
				spllitCommissionSettings.decimals
			);
	});
});
