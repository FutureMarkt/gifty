import { expect } from "chai";
import { loadFixture, mine } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";
import { BigNumber } from "ethers";
import {
	OneEther,
	refundGiftCommission,
	giftRefundWithoutCommissionThresholdInBlocks,
	giftRefundWithCommissionThresholdInBlocks,
	getCommissionAmount,
	getConvertedPrice,
} from "../../TestHelper";

describe("Gifty | refundGift | Token", function () {
	const giftAmount: BigNumber = OneEther;
	const refundGiftCommissionBN = BigNumber.from(refundGiftCommission);

	it("When a non-giver of a gift tries to refund gift - tx should be reverted", async function () {
		const { gifty, receiver, testToken, signers } = await loadFixture(
			GiftyFixture
		);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		await expect(
			gifty.connect(signers[2]).refundGift(0)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_12");
	});

	it("When a receiver of a gift tries to refund gift - tx should be reverted", async function () {
		const { gifty, receiver, testToken } = await loadFixture(GiftyFixture);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		await expect(
			gifty.connect(receiver).refundGift(0)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_12");
	});

	it("When the gift was already claimed - tx should be reverted", async function () {
		const { gifty, receiver, testToken } = await loadFixture(GiftyFixture);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);
		await gifty.connect(receiver).claimGift(0);

		await expect(gifty.refundGift(0)).to.be.revertedWithCustomError(
			gifty,
			"Gifty__error_13"
		);
	});

	it("When the gift was already refunded - tx should be reverted", async function () {
		const { gifty, receiver, testToken } = await loadFixture(GiftyFixture);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);
		await gifty.refundGift(0);

		await expect(gifty.refundGift(0)).to.be.revertedWithCustomError(
			gifty,
			"Gifty__error_14"
		);
	});

	it("Less then threshold blocks passed - commission should be collected", async function () {
		const { gifty, receiver, testToken, owner } = await loadFixture(
			GiftyFixture
		);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		// refundGiftCommission with 2 decimals
		const fee: BigNumber = getCommissionAmount(
			giftAmount,
			refundGiftCommissionBN
		);

		const refundedAmount: BigNumber = giftAmount.sub(fee);

		await expect(gifty.refundGift(0)).to.changeTokenBalances(
			testToken,
			[owner.address, gifty.address],
			[refundedAmount, "-" + refundedAmount]
		);
	});

	it("Less then threshold blocks passed, gifty earned commission should be increased", async function () {
		const { gifty, receiver, testToken } = await loadFixture(GiftyFixture);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		// Get earned commission before refund
		const earnedBefore: BigNumber = await gifty.getGiftyEarnedCommission(
			testToken.address
		);

		await gifty.refundGift(0);

		// Get earned commission after refund
		const earnedAfter: BigNumber = await gifty.getGiftyEarnedCommission(
			testToken.address
		);

		// Calculate delta between before and after
		const earnedCommissionDelta: BigNumber = earnedAfter.sub(earnedBefore);

		// Calculate fee
		const fee: BigNumber = getCommissionAmount(
			giftAmount,
			refundGiftCommissionBN
		);

		expect(earnedCommissionDelta).eq(fee);
	});

	it("Greater then free refund threshold blocks passed, 0 fee", async function () {
		const { gifty, receiver, testToken, owner } = await loadFixture(
			GiftyFixture
		);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);
		await mine(giftRefundWithoutCommissionThresholdInBlocks + 1);

		await expect(gifty.refundGift(0)).to.changeTokenBalances(
			testToken,
			[owner.address, gifty.address],
			[giftAmount, "-" + OneEther]
		);
	});

	it("Greater then free refund threshold blocks passed, not increase earned amount", async function () {
		const { gifty, receiver, testToken } = await loadFixture(GiftyFixture);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		await mine(giftRefundWithoutCommissionThresholdInBlocks + 1);

		const earnedBefore: BigNumber = await gifty.getGiftyEarnedCommission(
			testToken.address
		);

		await gifty.refundGift(0);

		const earnedAfter: BigNumber = await gifty.getGiftyEarnedCommission(
			testToken.address
		);

		expect(earnedBefore).eq(earnedAfter);
	});

	it("Block passed gt refund with fee and lt fee free refund should be reverted", async function () {
		const { gifty, receiver, testToken } = await loadFixture(GiftyFixture);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);
		await mine(giftRefundWithCommissionThresholdInBlocks + 1);

		await expect(gifty.refundGift(0)).to.be.revertedWithCustomError(
			gifty,
			"Gifty__error_15"
		);
	});

	it("Refund with fee, turnover should be reduced", async function () {
		const { gifty, receiver, testToken, owner, tokenMockAggregator } =
			await loadFixture(GiftyFixture);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		const { totalTurnoverInUSD: turnoverBefore } = (
			await gifty.getUserInfo(owner.address)
		).finInfo;

		await gifty.refundGift(0);

		const { totalTurnoverInUSD: turnoverAfter } = (
			await gifty.getUserInfo(owner.address)
		).finInfo;

		const oneTokenPrice: BigNumber = await getConvertedPrice(
			tokenMockAggregator
		);

		const turnoverReducedBy: BigNumber = turnoverBefore.sub(turnoverAfter);

		expect(turnoverReducedBy).eq(oneTokenPrice);
	});

	it("Refund with fee, commission payed should be increased", async function () {
		const { gifty, receiver, testToken, owner, tokenMockAggregator } =
			await loadFixture(GiftyFixture);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		const { commissionPayedInUSD: commissionPayedBefore } = (
			await gifty.getUserInfo(owner.address)
		).finInfo;

		await gifty.refundGift(0);

		const { commissionPayedInUSD: commissionPayedAfter } = (
			await gifty.getUserInfo(owner.address)
		).finInfo;

		const commissionPayedDelta: BigNumber = commissionPayedAfter.sub(
			commissionPayedBefore
		);

		// Calculation
		const oneTokenPrice: BigNumber = await getConvertedPrice(
			tokenMockAggregator
		);

		const refundCommissionUSD = getCommissionAmount(
			oneTokenPrice,
			refundGiftCommissionBN
		);

		expect(commissionPayedDelta).eq(refundCommissionUSD);
	});

	it("After refund status should be refunded", async function () {
		const { gifty, receiver, testToken, owner, tokenMockAggregator } =
			await loadFixture(GiftyFixture);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		await gifty.refundGift(0);

		const { isRefunded } = await gifty.getExactGift(0);

		expect(isRefunded).true;
	});

	it("GiftRefunded should be emmited after refund", async function () {
		const { gifty, receiver, testToken, owner, tokenMockAggregator } =
			await loadFixture(GiftyFixture);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		await expect(gifty.refundGift(0))
			.to.emit(gifty, "GiftRefunded")
			.withArgs(0);
	});
});
