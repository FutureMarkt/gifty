import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { ZeroAddress } from "../TestHelper";

describe("PiggyBox | changeGifty", function () {
	it("Caller not the owner should be reverted", async function () {
		const { piggyBox, gifty, signers } = await loadFixture(GiftyFixture);

		await expect(
			piggyBox.connect(signers[0]).changeGifty(gifty.address)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("If new gifty is zeroAddress - revert", async function () {
		const { piggyBox } = await loadFixture(GiftyFixture);

		await expect(
			piggyBox.changeGifty(ZeroAddress)
		).to.be.revertedWithCustomError(
			piggyBox,
			"PiggyBox__oneOfTheAddressIsZero"
		);
	});

	it("Gifty address changed", async function () {
		const { piggyBox, testToken } = await loadFixture(GiftyFixture);

		const newGifty: string = testToken.address;
		await piggyBox.changeGifty(newGifty);

		const updatedGifty: string = await piggyBox.getGifty();

		expect(updatedGifty).eq(newGifty);
	});

	it("GiftyChanged must be emmited", async function () {
		const { piggyBox, testToken } = await loadFixture(GiftyFixture);

		const newGifty: string = testToken.address;
		await expect(piggyBox.changeGifty(newGifty))
			.emit(piggyBox, "GiftyChanged")
			.withArgs(newGifty);
	});
});
