import { GiftyFixture } from "../fixtures/GiftyFixture";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { expect } from "chai";

import { ZeroAddress } from "../TestHelper";

describe("GiftyToken | changePiggyBox", function () {
	it("Not an owner can't successfully exucute function", async function () {
		const { giftyToken, signers } = await loadFixture(GiftyFixture);

		await expect(
			giftyToken.connect(signers[1]).changePiggyBox(ZeroAddress)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("Revert if newPiggyBox is not a contract", async function () {
		const { giftyToken } = await loadFixture(GiftyFixture);

		await expect(
			giftyToken.changePiggyBox(ZeroAddress)
		).to.be.revertedWithCustomError(
			giftyToken,
			"GiftyToken__notAContract"
		);
	});

	it("Successfulle chnage piggyBox if all conditions are met", async function () {
		const { giftyToken, piggyBox } = await loadFixture(GiftyFixture);

		await giftyToken.changePiggyBox(piggyBox.address);

		const newPiggyBox: string = await giftyToken.getPiggyBox();

		expect(newPiggyBox).eq(piggyBox.address);
	});

	it("PiggyBoxChanged emmited", async function () {
		const { giftyToken, piggyBox } = await loadFixture(GiftyFixture);

		await expect(giftyToken.changePiggyBox(piggyBox.address))
			.emit(giftyToken, "PiggyBoxChanged")
			.withArgs(piggyBox.address);
	});
});
