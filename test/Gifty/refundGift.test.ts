import { expect } from "chai";
import { loadFixture, mine } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "./fixtures/GiftyFixture";
import {
	EthAddress,
	OneEther,
	OneEtherGiftWithCommission,
	refundGiftCommission,
	giftRefundWithoutCommissionThresholdInBlocks,
	giftRefundWithCommissionThresholdInBlocks,
	getCommissionAmount,
	getConvertedPrice,
} from "../TestHelper";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

describe("Gifty | refundGift | ETH", function () {
	const giftAmount: BigNumber = OneEther;
	const refundGiftCommissionBN = BigNumber.from(refundGiftCommission);

	it("When a non-giver of a gift tries to refund gift - tx should be reverted", async function () {
		const { gifty, receiver, signers } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		await expect(
			gifty.connect(signers[2]).refundGift(0)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_12");
	});

	it("When a receiver of a gift tries to refund gift - tx should be reverted", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		await expect(
			gifty.connect(receiver).refundGift(0)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_12");
	});

	it("When the gift was already claimed - tx should be reverted", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		await gifty.connect(receiver).claimGift(0);

		await expect(gifty.refundGift(0)).to.be.revertedWithCustomError(
			gifty,
			"Gifty__error_13"
		);
	});

	it("When the gift was already refunded - tx should be reverted", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		await gifty.refundGift(0);

		await expect(gifty.refundGift(0)).to.be.revertedWithCustomError(
			gifty,
			"Gifty__error_14"
		);
	});

	it("Less then threshold blocks passed - commission should be collected", async function () {
		const { gifty, receiver, owner } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		// refundGiftCommission with 2 decimals
		const fee: BigNumber = getCommissionAmount(
			OneEther,
			refundGiftCommissionBN
		);

		const refundedAmount: BigNumber = OneEther.sub(fee);

		await expect(gifty.refundGift(0)).to.changeEtherBalances(
			[owner.address, gifty.address],
			[refundedAmount, "-" + refundedAmount]
		);
	});

	it("Less then threshold blocks passed, gifty earned commission should be increased", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		// Get earned commission before refund
		const earnedBefore: BigNumber = await gifty.getGiftyBalance(
			EthAddress
		);

		await gifty.refundGift(0);

		// Get earned commission after refund
		const earnedAfter: BigNumber = await gifty.getGiftyBalance(EthAddress);

		// Calculate delta between before and after
		const earnedCommissionDelta: BigNumber = earnedAfter.sub(earnedBefore);

		// Calculate fee
		const fee: BigNumber = getCommissionAmount(
			OneEther,
			refundGiftCommissionBN
		);

		expect(earnedCommissionDelta).eq(fee);
	});

	it("Greater then free refund threshold blocks passed, 0 fee", async function () {
		const { gifty, receiver, owner } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		await mine(giftRefundWithoutCommissionThresholdInBlocks + 1);

		await expect(gifty.refundGift(0)).to.changeEtherBalances(
			[owner.address, gifty.address],
			[OneEther, "-" + OneEther]
		);
	});

	it("Greater then free refund threshold blocks passed, not increase earned amount", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		await mine(giftRefundWithoutCommissionThresholdInBlocks + 1);

		const earnedBefore: BigNumber = await gifty.getGiftyBalance(
			EthAddress
		);

		await gifty.refundGift(0);

		const earnedAfter: BigNumber = await gifty.getGiftyBalance(EthAddress);

		expect(earnedBefore).eq(earnedAfter);
	});

	it("Block passed gt refund with fee and lt fee free refund should be reverted", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		await mine(giftRefundWithCommissionThresholdInBlocks + 1);

		await expect(gifty.refundGift(0)).to.be.revertedWithCustomError(
			gifty,
			"Gifty__error_15"
		);
	});

	it("Refund with fee, turnover should be reduced", async function () {
		const { gifty, receiver, owner, ethMockAggregator } =
			await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		const { totalTurnoverInUSD: turnoverBefore } = (
			await gifty.getUserInfo(owner.address)
		).finInfo;

		await gifty.refundGift(0);

		const { totalTurnoverInUSD: turnoverAfter } = (
			await gifty.getUserInfo(owner.address)
		).finInfo;

		const oneEtherPrice: BigNumber = await getConvertedPrice(
			ethMockAggregator
		);

		const turnoverReducedBy: BigNumber = turnoverBefore.sub(turnoverAfter);

		expect(turnoverReducedBy).eq(oneEtherPrice);
	});

	it("Refund with fee, commission payed should be increased", async function () {
		const { gifty, receiver, owner, ethMockAggregator } =
			await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

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
		const oneEtherPrice: BigNumber = await getConvertedPrice(
			ethMockAggregator
		);

		const refundCommissionUSD = getCommissionAmount(
			oneEtherPrice,
			refundGiftCommissionBN
		);

		expect(commissionPayedDelta).eq(refundCommissionUSD);
	});

	it("After refund status should be refunded", async function () {
		const { gifty, receiver, owner, ethMockAggregator } =
			await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		await gifty.refundGift(0);

		const { isRefunded } = await gifty.getExactGift(0);

		expect(isRefunded).true;
	});

	it("GiftRefunded should be emmited after refund", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		await expect(gifty.refundGift(0))
			.to.emit(gifty, "GiftRefunded")
			.withArgs(0);
	});

	it("Reentrancy attack to refund", async function () {
		const { gifty, attacker, receiver } = await loadFixture(GiftyFixture);

		await attacker.giftETH(
			gifty.address,
			receiver.address,
			giftAmount,

			{
				value: OneEtherGiftWithCommission,
			}
		);

		await attacker.giftETH(gifty.address, receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		await expect(
			attacker.attack(gifty.address, 0, 2, { gasLimit: 30000000 })
		).to.be.revertedWithCustomError(
			gifty,
			"ExternalAccountsInteraction__lowLevelTransferIsFailed"
		);
	});
});
