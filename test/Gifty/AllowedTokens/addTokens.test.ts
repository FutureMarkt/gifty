import { expect } from "chai";

import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";

import { ZeroAddress, NonZeroAddress } from "../../TestHelper";
import { MockToken, MockToken__factory } from "../../../typechain-types";

let sampleToken: string;

describe("Add token", function () {
	it("Not an owner can't successfully execute function", async function () {
		const { signers, gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty
				.connect(signers[1])
				.addTokens([ZeroAddress], [NonZeroAddress])
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("If the potential token is not a contract should be reverted", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.addTokens([ZeroAddress], [NonZeroAddress])
		).to.be.revertedWithCustomError(gifty, "Gifty__error_0");
	});

	it("After successfully adding the token, the status should be true", async function () {
		const { gifty, giftyToken } = await loadFixture(GiftyFixture);

		sampleToken = giftyToken.address;

		await gifty.addTokens([sampleToken], [NonZeroAddress]);
		const { isTokenAllowed } = await gifty.getTokenInfo(sampleToken);

		expect(isTokenAllowed).true;
	});

	it("After successfully adding the token, amount of allowed tokens should be increased", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		const allowedAmountBefore = await gifty.getAmountOfAllowedTokens();
		await gifty.addTokens([sampleToken], [NonZeroAddress]);
		const allowedAmountAfter = await gifty.getAmountOfAllowedTokens();

		expect(allowedAmountBefore.add(1)).eq(allowedAmountAfter);
	});

	it("After successfully adding the token, should be added to the array of allowed tokens", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await gifty.addTokens([sampleToken], [NonZeroAddress]);
		const addedToken: string[] = await gifty.getAllowedTokens();

		expect(addedToken[addedToken.length - 1]).eq(sampleToken);
	});

	it("After successfully adding the token, TokenAdded should be emmited", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(gifty.addTokens([sampleToken], [NonZeroAddress]))
			.emit(gifty, "TokenAdded")
			.withArgs(sampleToken);
	});

	it("Add many tokens - works correctly (2 tokens)", async function () {
		const { owner, gifty, giftyToken } = await loadFixture(GiftyFixture);

		const newMockToken: MockToken = await new MockToken__factory(
			owner
		).deploy();

		const tokensExample: string[] = [
			giftyToken.address,
			newMockToken.address,
		];

		// Create new arr with tokensExample.length length and fill every element with NonZeroAddress
		const priceFeedsForTokens: string[] = new Array(
			tokensExample.length
		).fill(NonZeroAddress);

		await gifty.addTokens(tokensExample, priceFeedsForTokens);

		for (let i = 0; i < tokensExample.length; i++) {
			const { isTokenAllowed } = await gifty.getTokenInfo(
				tokensExample[i]
			);
			expect(isTokenAllowed).true;
		}

		const amountOfAllowedTokens = await gifty.getAmountOfAllowedTokens();

		expect(amountOfAllowedTokens).eq(tokensExample.length);
	});

	it("Add many tokens - works correctly (15 tokens)", async function () {
		const { owner, gifty, giftyToken } = await loadFixture(GiftyFixture);

		const exampleTokenAmount: number = 15;
		const tokensExample: string[] = [giftyToken.address];

		for (let i = 0; i < exampleTokenAmount; i++) {
			const newMockToken: MockToken = await new MockToken__factory(
				owner
			).deploy();

			tokensExample.push(newMockToken.address);
		}

		const priceFeedsForTokens: string[] = new Array(
			tokensExample.length
		).fill(NonZeroAddress);

		await gifty.addTokens(tokensExample, priceFeedsForTokens);

		for (let i = 0; i < tokensExample.length; i++) {
			const { isTokenAllowed } = await gifty.getTokenInfo(
				tokensExample[i]
			);
			expect(isTokenAllowed).true;
		}

		const amountOfAllowedTokens = await gifty.getAmountOfAllowedTokens();
		expect(amountOfAllowedTokens).eq(tokensExample.length);
	});

	it("Add many tokens - assign a correct index (15 tokens)", async function () {
		const { owner, gifty, giftyToken } = await loadFixture(GiftyFixture);

		const exampleTokenAmount: number = 15;
		const tokensExample: string[] = [giftyToken.address];

		for (let i = 0; i < exampleTokenAmount; i++) {
			const newMockToken: MockToken = await new MockToken__factory(
				owner
			).deploy();

			tokensExample.push(newMockToken.address);
		}

		const priceFeedsForTokens: string[] = new Array(
			tokensExample.length
		).fill(NonZeroAddress);

		await gifty.addTokens(tokensExample, priceFeedsForTokens);

		for (let i = 0; i < exampleTokenAmount; i++) {
			const allowedTokens: string[] = await gifty.getAllowedTokens();

			const { indexInTheArray } = await gifty.getTokenInfo(
				allowedTokens[i]
			);

			expect(allowedTokens[indexInTheArray.toNumber()]).eq(
				allowedTokens[i]
			);
		}
	});
});
