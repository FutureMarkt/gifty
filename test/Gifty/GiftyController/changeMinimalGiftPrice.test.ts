import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { BigNumber } from "ethers";

describe("changeMinimalGiftPrice", function () {
	const expectedValue: number = 100;

	it("Not owner", async function () {
		const { gifty, signers } = await loadFixture(GiftyFixture);

		await expect(
			gifty.connect(signers[2]).changeMinimalGiftPrice(expectedValue)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("If new min price is zero - revert", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changeMinimalGiftPrice(0)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_8");
	});

	it("New price setted", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await gifty.changeMinimalGiftPrice(expectedValue);
		const minGiftPrice: BigNumber = await gifty.getMinGiftPrice();

		expect(minGiftPrice).eq(expectedValue);
	});

	it("To emit MinimumGiftPriceChanged", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(gifty.changeMinimalGiftPrice(expectedValue))
			.to.emit(gifty, "MinimumGiftPriceChanged")
			.withArgs(expectedValue);
	});
});
