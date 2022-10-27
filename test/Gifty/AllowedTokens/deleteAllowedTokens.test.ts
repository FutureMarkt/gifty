import { expect } from "chai";
import { BigNumber } from "ethers";

import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";

let sampleToken: string;

describe("Delete token", function () {
	it("Delete token should delete them from allowed tokens", async function () {
		const { gifty, giftyToken } = await loadFixture(GiftyFixture);

		sampleToken = giftyToken.address;

		// Add
		await gifty.addTokens([sampleToken]);
		const lengthBefore: BigNumber = await gifty.getAmountOfAllowedTokens();

		// Deltete
		await gifty.deleteToken(0);
		const lengthAfter: BigNumber = await gifty.getAmountOfAllowedTokens();

		expect(lengthBefore.sub(1)).eq(lengthAfter);
	});

	it("If you pass an incorrect token index -> an error will be reverted", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		// Add
		await gifty.addTokens([sampleToken]);

		// Deltete
		expect(gifty.deleteToken([0])).to.be.revertedWithCustomError(
			gifty,
			"Gifty__error_1"
		);
	});

	it("Delete token should delete isAllowed flag", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		// Add
		await gifty.addTokens([sampleToken]);

		// Deltete
		await gifty.deleteToken(0);

		const isAllowed = await gifty.isTokenAllowed(sampleToken);
		expect(isAllowed).false;
	});

	it("After successfully deleting the token, TokenDeleted should be emmited", async function () {
		const { gifty } = await loadFixture(GiftyFixture);
		await gifty.addTokens([sampleToken]);

		await expect(gifty.deleteToken(0))
			.emit(gifty, "TokenDeleted")
			.withArgs(sampleToken);
	});
});
