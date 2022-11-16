import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftTokenFixture } from "../fixtures/GiftTokenFixture";
import { OneEther } from "../../TestHelper";
import { BigNumber } from "ethers";

// Since main functionality tested in claimGift_ETH we should test only token receiving
describe("Claim token", function () {
	const giftAmount: BigNumber = OneEther;

	it("When a non-receiver of a gift tries to claim tx should be reverted", async function () {
		const { gifty, receiver, testToken } = await loadFixture(
			GiftTokenFixture
		);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		await expect(gifty.claimGift(0)).to.be.revertedWithCustomError(
			gifty,
			"Gifty__error_12"
		);
	});

	it("When the gift was already claimed tx should be reverted", async function () {
		const { gifty, receiver, testToken } = await loadFixture(
			GiftTokenFixture
		);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		await gifty.connect(receiver).claimGift(0);

		await expect(
			gifty.connect(receiver).claimGift(0)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_13");
	});

	it("When the gift was refunded tx should be reverted", async function () {
		const { gifty, receiver, testToken } = await loadFixture(
			GiftTokenFixture
		);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		await gifty.refundGift(0);

		await expect(
			gifty.connect(receiver).claimGift(0)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_14");
	});

	it("Exact amount of tokens should be transfered to receiver", async function () {
		const { gifty, receiver, testToken } = await loadFixture(
			GiftTokenFixture
		);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		const { amount } = await gifty.getExactGift(0);

		await expect(
			gifty.connect(receiver).claimGift(0)
		).to.changeTokenBalances(
			testToken,
			[receiver.address, gifty.address],
			[amount, "-" + giftAmount]
		);
	});

	it("Gift status changed to claimed", async function () {
		const { gifty, receiver, testToken } = await loadFixture(
			GiftTokenFixture
		);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);
		await gifty.connect(receiver).claimGift(0);

		const { isClaimed } = await gifty.getExactGift(0);

		expect(isClaimed).true;
	});

	it("GiftClaimed emmited when token claimed", async function () {
		const { gifty, receiver, testToken } = await loadFixture(
			GiftTokenFixture
		);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		await expect(gifty.connect(receiver).claimGift(0))
			.to.emit(gifty, "GiftClaimed")
			.withArgs(0);
	});
});
