import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

const amount: BigNumber = ethers.utils.parseEther("10");

describe("Gfity | giftTokenWithGFTCommission", function () {
	it("If receiver is equal to giver - revert", async function () {
		const { gifty, owner, testToken } = await loadFixture(GiftyFixture);

		await expect(
			gifty.giftTokenWithGFTCommission(
				owner.address,
				testToken.address,
				amount
			)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_11");
	});

	it("If receiver is equal to giver - revert", async function () {
		const { gifty, owner, testToken } = await loadFixture(GiftyFixture);

		await gifty.giftTokenWithGFTCommission(
			owner.address,
			testToken.address,
			amount
		);
	});
});
