import { expect } from "chai";

import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";

import { ZeroAddress } from "../../TestHelper";

let sampleToken: string;

describe("Add token", function () {
	it("Not an owner can't successfully execute function", async function () {
		const { signers, gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.connect(signers[1]).addTokens([ZeroAddress])
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("If the potential token is not a contract should be reverted", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.addTokens([ZeroAddress])
		).to.be.revertedWithCustomError(gifty, "Gifty__error_0");
	});

	it("After successfully adding the token, the status should be true", async function () {
		const { gifty, giftyToken } = await loadFixture(GiftyFixture);

		sampleToken = giftyToken.address;

		await gifty.addTokens([sampleToken]);
		const isAllowed = await gifty.isTokenAllowed(sampleToken);

		expect(isAllowed).true;
	});

	it("After successfully adding the token, amount of allowed tokens should be increased", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await gifty.addTokens([sampleToken]);
		const allowedAmount = await gifty.getAmountOfAllowedTokens();

		expect(allowedAmount).eq(1);
	});

	it("After successfully adding the token, should be added to the array of allowed tokens", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await gifty.addTokens([sampleToken]);
		const [addedToken] = await gifty.getAllowedTokens();

		expect(addedToken).eq(sampleToken);
	});

	it("After successfully adding the token, TokenAdded should be emmited", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(gifty.addTokens([sampleToken]))
			.emit(gifty, "TokenAdded")
			.withArgs(sampleToken);
	});
});
