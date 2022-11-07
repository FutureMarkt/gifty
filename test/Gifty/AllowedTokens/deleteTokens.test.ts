import { expect } from "chai";
import { BigNumber } from "ethers";

import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";

import { MockToken, MockToken__factory } from "../../../typechain-types";
import { NonZeroAddress } from "../../TestHelper";

let sampleToken: string, listOfAllowedTokens: string[];

describe("Delete token", function () {
	it("Delete token should delete them from allowed tokens", async function () {
		const { gifty, giftyToken } = await loadFixture(GiftyFixture);

		sampleToken = giftyToken.address;

		// Add
		await gifty.addTokens([sampleToken], [NonZeroAddress]);
		const lengthBefore: BigNumber = await gifty.getAmountOfAllowedTokens();

		// Deltete
		await gifty.deleteTokens([sampleToken]);
		const lengthAfter: BigNumber = await gifty.getAmountOfAllowedTokens();

		expect(lengthBefore.sub(1)).eq(lengthAfter);
	});

	it("When token does not exist into allowed token - revert", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.deleteTokens([sampleToken])
		).to.be.revertedWithCustomError(gifty, "Gifty__error_1");
	});

	it("Delete token should delete isAllowed flag", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		// Add
		await gifty.addTokens([sampleToken], [NonZeroAddress]);

		// Deltete
		await gifty.deleteTokens([sampleToken]);

		const { isTokenAllowed } = await gifty.getTokenInfo(sampleToken);
		expect(isTokenAllowed).false;
	});

	it("After successfully deleting the token, TokenDeleted should be emmited", async function () {
		const { gifty } = await loadFixture(GiftyFixture);
		await gifty.addTokens([sampleToken], [NonZeroAddress]);

		await expect(gifty.deleteTokens([sampleToken]))
			.emit(gifty, "TokenDeleted")
			.withArgs(sampleToken);
	});

	it("Delete many tokens - works correctly", async function () {
		const { owner, gifty, giftyToken } = await loadFixture(GiftyFixture);

		const newMockToken: MockToken = await new MockToken__factory(
			owner
		).deploy();

		const tokensExample: string[] = [
			giftyToken.address,
			newMockToken.address,
		];

		const priceFeedsForTokens: string[] = new Array(
			tokensExample.length
		).fill(NonZeroAddress);

		await gifty.addTokens(tokensExample, priceFeedsForTokens);

		// Delete
		await gifty.deleteTokens(tokensExample);

		for (let i = 0; i < tokensExample.length; i++) {
			const { isTokenAllowed } = await gifty.getTokenInfo(
				tokensExample[i]
			);
			expect(isTokenAllowed).false;
		}

		const amountOfAllowedTokens = await gifty.getAmountOfAllowedTokens();
		expect(amountOfAllowedTokens).eq(0);
	});

	it("Delete many tokens - deleted exact tokens", async function () {
		const { gifty, giftyToken, owner } = await loadFixture(GiftyFixture);

		// Create testTokens
		const tokensExample: string[] = [giftyToken.address];

		for (let i = 0; i < 4; i++) {
			const testToken: MockToken = await new MockToken__factory(
				owner
			).deploy();

			tokensExample.push(testToken.address);
		}

		const priceFeedsForTokens: string[] = new Array(
			tokensExample.length
		).fill(NonZeroAddress);

		await gifty.addTokens(tokensExample, priceFeedsForTokens);

		const listOfAllowedTokens: string[] = await gifty.getAllowedTokens();

		// For example we delete 2 tokens from the middle of the array
		const tokensToBeDeleted: string[] = listOfAllowedTokens.slice(1, 3);

		// Delete
		await gifty.deleteTokens(tokensToBeDeleted);

		// Is the exact tokens deleted?
		for (let i = 0; i < tokensToBeDeleted.length; i++) {
			const { isTokenAllowed } = await gifty.getTokenInfo(
				tokensToBeDeleted[i]
			);
			expect(isTokenAllowed).false;
		}

		// Is length correct?
		const amountOfAllowedTokens = await gifty.getAmountOfAllowedTokens();

		expect(amountOfAllowedTokens).eq(3);
	});

	it("Delete many tokens - from the middle of the array", async function () {
		const { gifty, giftyToken, owner } = await loadFixture(GiftyFixture);

		// Create testTokens
		const tokensExample: string[] = [giftyToken.address];

		for (let i = 0; i < 20; i++) {
			const testToken: MockToken = await new MockToken__factory(
				owner
			).deploy();

			tokensExample.push(testToken.address);
		}

		const priceFeedsForTokens: string[] = new Array(
			tokensExample.length
		).fill(NonZeroAddress);

		await gifty.addTokens(tokensExample, priceFeedsForTokens);

		listOfAllowedTokens = await gifty.getAllowedTokens();

		// For example we delete 2 tokens from the middle of the array
		const tokensToBeDeleted: string[] = listOfAllowedTokens.slice(7, 15);

		// Delete
		await gifty.deleteTokens(tokensToBeDeleted);

		for (let i = 0; i < tokensToBeDeleted.length; i++) {
			const { isTokenAllowed } = await gifty.getTokenInfo(
				tokensToBeDeleted[i]
			);
			expect(isTokenAllowed).false;
		}

		// Is length correct?
		const amountOfAllowedTokens = await gifty.getAmountOfAllowedTokens();

		expect(amountOfAllowedTokens).eq(
			tokensExample.length - tokensToBeDeleted.length
		);
	});

	it("Deleting from different parts of the array", async function () {
		const { gifty, giftyToken, owner } = await loadFixture(GiftyFixture);

		// Create testTokens
		const tokensExample: string[] = [giftyToken.address];

		for (let i = 0; i < 20; i++) {
			const testToken: MockToken = await new MockToken__factory(
				owner
			).deploy();

			tokensExample.push(testToken.address);
		}

		const priceFeedsForTokens: string[] = new Array(
			tokensExample.length
		).fill(NonZeroAddress);

		await gifty.addTokens(tokensExample, priceFeedsForTokens);

		const tokensToBeDeleted: string[] = [
			listOfAllowedTokens[2],
			listOfAllowedTokens[6],
			listOfAllowedTokens[10],
			listOfAllowedTokens[14],
			listOfAllowedTokens[19],
		];

		// Delete
		await gifty.deleteTokens(tokensToBeDeleted);

		for (let i = 0; i < tokensToBeDeleted.length; i++) {
			const { isTokenAllowed } = await gifty.getTokenInfo(
				tokensToBeDeleted[i]
			);
			expect(isTokenAllowed).false;
		}

		// Is length correct?
		const amountOfAllowedTokens = await gifty.getAmountOfAllowedTokens();

		expect(amountOfAllowedTokens).eq(
			tokensExample.length - tokensToBeDeleted.length
		);
	});

	it("Deleted tokens are no longer present in the allowedTokens", async function () {
		const { gifty, giftyToken, owner } = await loadFixture(GiftyFixture);

		// Create testTokens
		const tokensExample: string[] = [giftyToken.address];

		for (let i = 0; i < 20; i++) {
			const testToken: MockToken = await new MockToken__factory(
				owner
			).deploy();

			tokensExample.push(testToken.address);
		}

		const priceFeedsForTokens: string[] = new Array(
			tokensExample.length
		).fill(NonZeroAddress);

		await gifty.addTokens(tokensExample, priceFeedsForTokens);

		const tokensToBeDeleted: string[] = [
			listOfAllowedTokens[2],
			listOfAllowedTokens[6],
			listOfAllowedTokens[10],
			listOfAllowedTokens[14],
			listOfAllowedTokens[19],
		];

		// Delete
		await gifty.deleteTokens(tokensToBeDeleted);

		const allowedTokens: string[] = await gifty.getAllowedTokens();

		for (let i = 0; i < tokensToBeDeleted.length; i++) {
			const isTokenIntoArray: boolean = allowedTokens.includes(
				tokensToBeDeleted[i]
			);

			expect(isTokenIntoArray).false;
		}
	});

	it("The token that was replaced by a place remained in the array", async function () {
		const { gifty, giftyToken, owner } = await loadFixture(GiftyFixture);

		// Create testTokens
		const tokensExample: string[] = [giftyToken.address];

		for (let i = 0; i < 20; i++) {
			const testToken: MockToken = await new MockToken__factory(
				owner
			).deploy();

			tokensExample.push(testToken.address);
		}

		const priceFeedsForTokens: string[] = new Array(
			tokensExample.length
		).fill(NonZeroAddress);

		await gifty.addTokens(tokensExample, priceFeedsForTokens);

		// Delete token with index 2
		const tokensToBeDeleted: string[] = [listOfAllowedTokens[2]];

		const allowedTokensBefore: string[] = await gifty.getAllowedTokens();

		// Delete
		await gifty.deleteTokens(tokensToBeDeleted);

		const allowedTokensAfter: string[] = await gifty.getAllowedTokens();

		expect(allowedTokensAfter[2]).eq(
			allowedTokensBefore[allowedTokensBefore.length - 1]
		);
	});
});
