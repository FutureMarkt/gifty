import { expect } from "chai";

import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";

import { MockToken, MockToken__factory } from "../../../typechain-types";

describe("Add and delete array of tokens", function () {
	it("Add many tokens - works correctly", async function () {
		const { owner, gifty, giftyToken } = await loadFixture(GiftyFixture);

		const newMockToken: MockToken = await new MockToken__factory(
			owner
		).deploy();

		const tokensExample: string[] = [
			giftyToken.address,
			newMockToken.address,
		];

		/**
		 * In order not to create additional contracts for tests,
		 * we will take the Gifty contract itself as a second token
		 */
		await gifty.addTokens(tokensExample);

		const isAllowed0 = await gifty.isTokenAllowed(tokensExample[0]);
		const isAllowed1 = await gifty.isTokenAllowed(tokensExample[1]);

		expect(isAllowed0).true;
		expect(isAllowed1).true;

		const amountOfAllowedTokens = await gifty.getAmountOfAllowedTokens();

		expect(amountOfAllowedTokens).eq(2);
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

		//Add
		await gifty.addTokens(tokensExample);

		// Delete
		await gifty.deleteToken(1);
		await gifty.deleteToken(0);

		const isAllowed0 = await gifty.isTokenAllowed(tokensExample[0]);
		const isAllowed1 = await gifty.isTokenAllowed(tokensExample[1]);

		expect(isAllowed0).false;
		expect(isAllowed1).false;

		const amountOfAllowedTokens = await gifty.getAmountOfAllowedTokens();

		expect(amountOfAllowedTokens).eq(0);
	});

	it("Delete many tokens - deleted exact tokens", async function () {
		const { gifty, giftyToken, owner } = await loadFixture(GiftyFixture);

		// Create testTokens
		const testTokens: string[] = [giftyToken.address];

		for (let i = 0; i < 4; i++) {
			const testToken: MockToken = await new MockToken__factory(
				owner
			).deploy();

			testTokens.push(testToken.address);
		}

		//Add array of tokens to the allowedTokens
		await gifty.addTokens(testTokens);

		const listOfAllowedTokens: string[] = await gifty.getAllowedTokens();

		// For example we delete 2 tokens from the middle of the array
		const [, , tokensToBeDeleted1, tokensToBeDeleted2]: string[] =
			listOfAllowedTokens;

		// Delete
		await gifty.deleteToken([3]);
		await gifty.deleteToken([2]);

		// Is the exact tokens deleted?
		const isAllowed0 = await gifty.isTokenAllowed(tokensToBeDeleted1);
		const isAllowed1 = await gifty.isTokenAllowed(tokensToBeDeleted2);

		expect(isAllowed0).false;
		expect(isAllowed1).false;

		// Is length correct?
		const amountOfAllowedTokens = await gifty.getAmountOfAllowedTokens();

		expect(amountOfAllowedTokens).eq(3);
	});
});
