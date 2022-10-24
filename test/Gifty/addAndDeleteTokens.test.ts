import { ethers } from "hardhat";
import { expect } from "chai";

import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "./fixtures/GiftyFixture";

import { BigNumber } from "ethers";

const zeroAddress: string = ethers.constants.AddressZero;
let sampleToken: string;

describe("Gifty | Add and delete allowed tokens", function () {
	describe("Add token", function () {
		it("Not an owner can't successfully execute function", async function () {
			const { signers, gifty } = await loadFixture(GiftyFixture);

			await expect(
				gifty.connect(signers[1]).addTokens([zeroAddress])
			).to.be.revertedWith("Ownable: caller is not the owner");
		});

		it("If the potential token is not a contract should be reverted", async function () {
			const { gifty } = await loadFixture(GiftyFixture);

			await expect(
				gifty.addTokens([zeroAddress])
			).to.be.revertedWithCustomError(
				gifty,
				"Gifty__youAreTryingToAddANonContractToTheAllowedTokens"
			);
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

	describe("Delete token", function () {
		it("Delete token should delete them from allowed tokens", async function () {
			const { gifty } = await loadFixture(GiftyFixture);

			// Add
			await gifty.addTokens([sampleToken]);
			const lengthBefore: BigNumber =
				await gifty.getAmountOfAllowedTokens();

			// Deltete
			await gifty.deleteTokens([0]);
			const lengthAfter: BigNumber =
				await gifty.getAmountOfAllowedTokens();

			expect(lengthBefore.sub(1)).eq(lengthAfter);
		});

		it("Delete token should delete isAllowed flag", async function () {
			const { gifty } = await loadFixture(GiftyFixture);

			// Add
			await gifty.addTokens([sampleToken]);

			// Deltete
			await gifty.deleteTokens([0]);

			const isAllowed = await gifty.isTokenAllowed(sampleToken);

			expect(isAllowed).false;
		});

		it("After successfully deleting the token, TokenDeleted should be emmited", async function () {
			const { gifty } = await loadFixture(GiftyFixture);
			await gifty.addTokens([sampleToken]);

			await expect(gifty.deleteTokens([0]))
				.emit(gifty, "TokenDeleted")
				.withArgs(sampleToken);
		});
	});

	describe("Add and delete array of tokens", function () {
		it("Add many tokens - works correctly", async function () {
			const { gifty, giftyToken } = await loadFixture(GiftyFixture);

			const tokensExample: string[] = [
				gifty.address,
				giftyToken.address,
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

			const amountOfAllowedTokens =
				await gifty.getAmountOfAllowedTokens();

			expect(amountOfAllowedTokens).eq(2);
		});

		it("Delete many tokens - works correctly", async function () {
			const { gifty, giftyToken } = await loadFixture(GiftyFixture);
			const tokensExample: string[] = [
				gifty.address,
				giftyToken.address,
			];

			//Add
			await gifty.addTokens(tokensExample);

			// Delete
			await gifty.deleteTokens([1, 0]);

			const isAllowed0 = await gifty.isTokenAllowed(tokensExample[0]);
			const isAllowed1 = await gifty.isTokenAllowed(tokensExample[1]);

			expect(isAllowed0).false;
			expect(isAllowed1).false;

			const amountOfAllowedTokens =
				await gifty.getAmountOfAllowedTokens();

			expect(amountOfAllowedTokens).eq(0);
		});

		it("Delete many tokens | If the token sequence is non-decreasing, throw an error.", async function () {
			const { gifty, giftyToken } = await loadFixture(GiftyFixture);
			const tokensExample: string[] = [
				gifty.address,
				giftyToken.address,
			];

			//Add
			await gifty.addTokens(tokensExample);

			// Delete
			await expect(
				gifty.deleteTokens([0, 1])
			).to.be.revertedWithCustomError(
				gifty,
				"Gfity__theTokenIndexesShouldGoInDecreasingOrder"
			);
		});
	});
});
