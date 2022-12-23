import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { ZeroAddress } from "../TestHelper";

describe("PiggyBox | changeGiftyToken", function () {
	it("Caller not the owner should be reverted", async function () {
		const { piggyBox, signers, giftyToken } = await loadFixture(
			GiftyFixture
		);

		await expect(
			piggyBox.connect(signers[0]).changeGiftyToken(giftyToken.address)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("If new giftyToken is zeroAddress - revert", async function () {
		const { piggyBox } = await loadFixture(GiftyFixture);

		await expect(
			piggyBox.changeGiftyToken(ZeroAddress)
		).to.be.revertedWithCustomError(
			piggyBox,
			"PiggyBox__oneOfTheAddressIsZero"
		);
	});

	it("GiftyToken address changed", async function () {
		const { piggyBox, testToken } = await loadFixture(GiftyFixture);

		const newGiftyToken: string = testToken.address;
		await piggyBox.changeGiftyToken(newGiftyToken);

		const updatedGiftyToken: string = await piggyBox.getGiftyToken();

		expect(updatedGiftyToken).eq(newGiftyToken);
	});

	it("GiftyTokenChanged must be emmited", async function () {
		const { piggyBox, testToken } = await loadFixture(GiftyFixture);

		const newGiftyToken: string = testToken.address;

		await expect(piggyBox.changeGiftyToken(newGiftyToken))
			.emit(piggyBox, "GiftyTokenChanged")
			.withArgs(newGiftyToken);
	});
});
