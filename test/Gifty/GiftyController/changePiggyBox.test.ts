import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";
import { ZeroAddress } from "../../TestHelper";

describe("changePiggyBox", function () {
	it("Not owner", async function () {
		const { gifty, signers } = await loadFixture(GiftyFixture);

		await expect(
			gifty.connect(signers[2]).changePiggyBox(ZeroAddress)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("If new piggyBox is zero address - revert", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changePiggyBox(ZeroAddress)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_8");
	});

	it("PiggyBox changed setted", async function () {
		const { gifty, ethMockAggregator } = await loadFixture(GiftyFixture);

		const examplePiggyBox = ethMockAggregator.address;

		await gifty.changePiggyBox(examplePiggyBox);

		const piggyBox = await gifty.getPiggyBox();

		expect(piggyBox).eq(examplePiggyBox);
	});

	it("To emit PiggyBoxChanged", async function () {
		const { gifty, ethMockAggregator } = await loadFixture(GiftyFixture);

		const examplePiggyBox = ethMockAggregator.address;

		await expect(gifty.changePiggyBox(examplePiggyBox))
			.to.emit(gifty, "PiggyBoxChanged")
			.withArgs(examplePiggyBox);
	});
});
