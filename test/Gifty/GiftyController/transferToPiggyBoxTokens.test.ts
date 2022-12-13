import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";
import { getCommissionAmount } from "../../TestHelper";

const tokenAmount: BigNumber = ethers.utils.parseEther("100");
const tokenCommission: BigNumber = ethers.utils.parseEther("1");

describe("GiftyController | transferToPiggyBoxTokens", function () {
	it("Caller not the owner should be reverted", async function () {
		const { gifty, signers, testToken } = await loadFixture(GiftyFixture);

		await expect(
			gifty
				.connect(signers[0])
				.transferToPiggyBoxTokens(testToken.address, 0)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("If transfering value equal to zero should be reverted", async function () {
		const { gifty, receiver, testToken } = await loadFixture(GiftyFixture);

		await gifty.giftToken(
			receiver.address,
			testToken.address,
			tokenAmount
		);

		await expect(
			gifty.transferToPiggyBoxTokens(testToken.address, 0)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_8");
	});

	it("Given amount should be transfered to the PiggyBox contract", async function () {
		const { gifty, receiver, testToken, piggyBox } = await loadFixture(
			GiftyFixture
		);

		await gifty.giftToken(
			receiver.address,
			testToken.address,
			tokenAmount
		);

		const earnedCommission: BigNumber =
			await gifty.getGiftyEarnedCommission(testToken.address);
		await expect(
			gifty.transferToPiggyBoxTokens(testToken.address, earnedCommission)
		).to.changeTokenBalances(
			testToken,
			[gifty.address, piggyBox.address],
			["-" + earnedCommission, earnedCommission]
		);
	});

	it("Gifty earned commission decreased after successfull withdrawal", async function () {
		const { gifty, receiver, testToken } = await loadFixture(GiftyFixture);

		await gifty.giftToken(
			receiver.address,
			testToken.address,
			tokenAmount
		);

		const giftyBalanceBefore: BigNumber =
			await gifty.getGiftyEarnedCommission(testToken.address);

		await gifty.transferToPiggyBoxTokens(
			testToken.address,
			giftyBalanceBefore
		);

		const giftyBalanceAfter: BigNumber =
			await gifty.getGiftyEarnedCommission(testToken.address);

		expect(giftyBalanceAfter.add(giftyBalanceBefore)).eq(
			giftyBalanceBefore
		);
	});

	it("AssetTransferedToPiggyBox emmited after successfull withdrawal", async function () {
		const { gifty, receiver, testToken } = await loadFixture(GiftyFixture);

		await gifty.giftToken(
			receiver.address,
			testToken.address,
			tokenAmount
		);

		const amount: BigNumber = await gifty.getGiftyEarnedCommission(
			testToken.address
		);

		await expect(gifty.transferToPiggyBoxTokens(testToken.address, amount))
			.to.emit(gifty, "AssetTransferedToPiggyBox")
			.withArgs(testToken.address, amount);
	});
});
