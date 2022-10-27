import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";

import {
	OneEther,
	EthAddress,
	getCommissionAmount,
	OneEtherGiftWithCommission,
} from "../../TestHelper";

describe("Gifty | GiftETH", function () {
	describe("ChargeCommission | ETH", function () {
		const giftAmount: BigNumber = OneEther;

		it("A simpl function call, without checks", async function () {
			const { gifty, owner } = await loadFixture(GiftyFixture);

			await gifty.giftETH(owner.address, OneEther, {
				value: OneEtherGiftWithCommission,
			});
		});

		it("Gifty's balance has been increased", async function () {
			const { gifty, receiver } = await loadFixture(GiftyFixture);

			await expect(
				gifty.giftETH(receiver.address, giftAmount, {
					value: OneEtherGiftWithCommission,
				})
			).to.changeEtherBalance(gifty.address, OneEtherGiftWithCommission);
		});

		it("The correct commission was taken", async function () {
			const { gifty, receiver } = await loadFixture(GiftyFixture);

			// Get commission rate for gift
			const [commissionRate]: BigNumber[] =
				await gifty.getCommissionRate();

			// Calculate Gifty commission from this gift
			const commissionAmount: BigNumber = getCommissionAmount(
				giftAmount,
				commissionRate
			);

			// Giving a gift
			await gifty.giftETH(receiver.address, giftAmount, {
				value: OneEtherGiftWithCommission,
			});

			// Gifty balance (commission)
			const ethCommissionBalance: BigNumber =
				await gifty.getGiftyBalance(EthAddress);

			expect(ethCommissionBalance).eq(commissionAmount);
		});

		it("If the transferred amount of ETH is lt the amount of the gift - revert", async function () {
			const { gifty, receiver } = await loadFixture(GiftyFixture);

			await expect(
				gifty.giftETH(receiver.address, giftAmount, {
					value: 1,
				})
			).revertedWithCustomError(gifty, "Gifty__error_5");
		});

		it("If the transferred commission is too small - revert", async function () {
			const { gifty, receiver } = await loadFixture(GiftyFixture);

			await expect(
				gifty.giftETH(receiver.address, giftAmount, {
					value: OneEther.add(1),
				})
			).revertedWithCustomError(gifty, "Gifty__error_3");
		});

		it("If the transferred commission is gt Gifty commission, write delta - for the possibility of withdrawal", async function () {
			const { gifty, owner, receiver } = await loadFixture(GiftyFixture);

			// Imagine that the user transferred more funds than needed.
			const bigCommission: BigNumber = OneEther;

			const giftAmountWithBigCommission: BigNumber =
				giftAmount.add(bigCommission);

			// Get commission rate and calculate commission
			const [commissionRate]: BigNumber[] =
				await gifty.getCommissionRate();

			const commissionAmount: BigNumber = getCommissionAmount(
				giftAmount,
				commissionRate
			);

			await gifty.giftETH(receiver.address, giftAmount, {
				value: giftAmountWithBigCommission,
			});

			const expectedOverpaidAmount: BigNumber =
				bigCommission.sub(commissionAmount);

			const overpaidAmount: BigNumber = await gifty.getOverpaidETHAmount(
				owner.address
			);

			// Did the overpaid funds register correctly?
			expect(expectedOverpaidAmount).eq(overpaidAmount);
		});

		it("The total turnover of the user's funds increased in the dollar equivalent of a gift", async function () {
			const { gifty, owner, receiver, ethMockAggregator } =
				await loadFixture(GiftyFixture);

			// Get ETH price and convert to 18 decimals
			const ethPrice: BigNumber = await ethMockAggregator.latestAnswer();
			const ethPriceWith18Decimals: BigNumber = ethers.utils.parseUnits(
				ethPrice.toString(),
				10
			);

			await gifty.giftETH(receiver.address, giftAmount, {
				value: OneEtherGiftWithCommission,
			});

			// Get user turnover after gift
			const turnoverUSD: BigNumber = (
				await gifty.getUserInfo(owner.address)
			).finInfo.totalTurnoverInUSD;

			// Calculate expected turnover
			const expectedTurnover: BigNumber = ethPriceWith18Decimals
				.mul(giftAmount)
				.div(OneEther);

			expect(turnoverUSD).eq(expectedTurnover);
		});

		it("The total turnover of the user's funds increased in the dollar equivalent of a gift", async function () {
			const { gifty, owner, receiver, ethMockAggregator } =
				await loadFixture(GiftyFixture);

			// Get ETH price and convert to 18 decimals
			const ethPrice: BigNumber = await ethMockAggregator.latestAnswer();
			const ethPriceWith18Decimals: BigNumber = ethers.utils.parseUnits(
				ethPrice.toString(),
				10
			);

			// Get commission rate and calculate commission
			const [commissionRate]: BigNumber[] =
				await gifty.getCommissionRate();

			const commissionAmount: BigNumber = getCommissionAmount(
				giftAmount,
				commissionRate
			);

			await gifty.giftETH(receiver.address, giftAmount, {
				value: OneEtherGiftWithCommission,
			});

			const payedCommissionInUsd: BigNumber = (
				await gifty.getUserInfo(owner.address)
			).finInfo.commissionPayedInUSD;

			// Calculate expected turnover
			const expectedCommissionPayed: BigNumber = ethPriceWith18Decimals
				.mul(commissionAmount)
				.div(OneEther);

			expect(payedCommissionInUsd).eq(expectedCommissionPayed);
		});
	});
});
