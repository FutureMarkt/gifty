import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import {
	getCommissionAmount,
	getPriceOfExactETHAmount,
	NonZeroAddress,
} from "../../TestHelper";
import {
	UniswapV3OracleMock,
	UniswapV3OracleMock__factory,
} from "../../../typechain-types";

import { time } from "@nomicfoundation/hardhat-network-helpers";

const amount: BigNumber = ethers.utils.parseEther("50");

describe("Gfity | giftTokenWithGFTCommission", function () {
	describe("The main currency of the gift is NOT GFT", function () {
		it("If receiver is equal to giver - revert", async function () {
			const { gifty, owner, testToken } = await loadFixture(
				GiftyFixture
			);

			await expect(
				gifty.giftTokenWithGFTCommission(
					owner.address,
					testToken.address,
					amount
				)
			).to.be.revertedWithCustomError(gifty, "Gifty__error_11");
		});

		it("If token does't allowed - revert", async function () {
			const { gifty, receiver } = await loadFixture(GiftyFixture);

			await expect(
				gifty.giftTokenWithGFTCommission(
					receiver.address,
					NonZeroAddress,
					amount
				)
			).to.be.revertedWithCustomError(gifty, "Gifty__error_16");
		});

		it("Commission correctly charged", async function () {
			const {
				gifty,
				receiver,
				testToken,
				tokenMockAggregator,
				giftyToken,
			} = await loadFixture(GiftyFixture);

			await gifty.giftTokenWithGFTCommission(
				receiver.address,
				testToken.address,
				amount
			);

			const earnedGFT = await gifty.getGiftyEarnedCommission(
				giftyToken.address
			);

			const giftPriceInUSD: BigNumber = await getPriceOfExactETHAmount(
				tokenMockAggregator,
				amount
			);

			const [, rate]: BigNumber[] = await gifty.getCommissionRate(
				giftPriceInUSD
			);

			// Since for tests 1 USD == 1 GFT
			const comissionPayed: BigNumber = getCommissionAmount(
				giftPriceInUSD,
				rate
			);

			expect(earnedGFT).eq(comissionPayed);
		});

		it("TotalTurnover is correct", async function () {
			const { gifty, receiver, testToken, tokenMockAggregator, owner } =
				await loadFixture(GiftyFixture);

			await gifty.giftTokenWithGFTCommission(
				receiver.address,
				testToken.address,
				amount
			);

			const {
				finInfo: { totalTurnoverInUSD },
			} = await gifty.getUserInfo(owner.address);

			const giftPriceInUSD: BigNumber = await getPriceOfExactETHAmount(
				tokenMockAggregator,
				amount
			);

			expect(totalTurnoverInUSD).eq(giftPriceInUSD);
		});

		it("TotalCommissionPayedInUSD is correct", async function () {
			const { gifty, receiver, testToken, tokenMockAggregator, owner } =
				await loadFixture(GiftyFixture);

			await gifty.giftTokenWithGFTCommission(
				receiver.address,
				testToken.address,
				amount
			);

			const {
				finInfo: { commissionPayedInUSD },
			} = await gifty.getUserInfo(owner.address);

			const giftPriceInUSD: BigNumber = await getPriceOfExactETHAmount(
				tokenMockAggregator,
				amount
			);

			const [, rate]: BigNumber[] = await gifty.getCommissionRate(
				giftPriceInUSD
			);

			// Since for tests 1 USD == 1 GFT
			const comissionPayed: BigNumber = getCommissionAmount(
				giftPriceInUSD,
				rate
			);

			expect(commissionPayedInUSD).eq(comissionPayed);
		});

		it("Gift | From/to is correct", async function () {
			const { gifty, receiver, testToken, owner } = await loadFixture(
				GiftyFixture
			);

			await gifty.giftTokenWithGFTCommission(
				receiver.address,
				testToken.address,
				amount
			);
			const { giver, receiver: receiverFromContract } =
				await gifty.getExactGift(0);

			expect(giver).eq(owner.address);
			expect(receiverFromContract).eq(receiver.address);
		});

		it("Gift | AmountInUSD detected correctly", async function () {
			const { gifty, receiver, testToken, tokenMockAggregator } =
				await loadFixture(GiftyFixture);

			await gifty.giftTokenWithGFTCommission(
				receiver.address,
				testToken.address,
				amount
			);

			const { amountInUSD } = await gifty.getExactGift(0);

			const giftPrice: BigNumber = await getPriceOfExactETHAmount(
				tokenMockAggregator,
				amount
			);

			expect(amountInUSD).eq(giftPrice);
		});

		it("Gift | Amount is correct", async function () {
			const { gifty, receiver, testToken } = await loadFixture(
				GiftyFixture
			);

			await gifty.giftTokenWithGFTCommission(
				receiver.address,
				testToken.address,
				amount
			);

			const { amount: amountInGift } = await gifty.getExactGift(0);

			expect(amountInGift).eq(amount);
		});

		it("Gift | Asset is correct", async function () {
			const { gifty, receiver, testToken } = await loadFixture(
				GiftyFixture
			);

			await gifty.giftTokenWithGFTCommission(
				receiver.address,
				testToken.address,
				amount
			);

			const { asset } = await gifty.getExactGift(0);

			expect(asset).eq(testToken.address);
		});

		it("Gift | GiftType is correct", async function () {
			const { gifty, receiver, testToken } = await loadFixture(
				GiftyFixture
			);

			await gifty.giftTokenWithGFTCommission(
				receiver.address,
				testToken.address,
				amount
			);

			const { giftType } = await gifty.getExactGift(0);

			expect(giftType).eq(2 /* FT */);
		});

		it("Gift | GiftType is correct", async function () {
			const { gifty, receiver, testToken } = await loadFixture(
				GiftyFixture
			);

			await gifty.giftTokenWithGFTCommission(
				receiver.address,
				testToken.address,
				amount
			);

			const { giftType } = await gifty.getExactGift(0);

			expect(giftType).eq(2 /* FT */);
		});
	});

	describe("The main currency of the gift is GFT", function () {
		it("Asset price detected correctly", async function () {
			const { gifty, receiver, giftyToken } = await loadFixture(
				GiftyFixture
			);

			await gifty.giftTokenWithGFTCommission(
				receiver.address,
				giftyToken.address,
				amount
			);

			// 1 GFT == 1 USD for tests
			const { amountInUSD } = await gifty.getExactGift(0);
			expect(amountInUSD).eq(amount);
		});

		it("Commission calculated correctly", async function () {
			const { gifty, receiver, giftyToken } = await loadFixture(
				GiftyFixture
			);

			await gifty.giftTokenWithGFTCommission(
				receiver.address,
				giftyToken.address,
				amount
			);

			const earnedCommission: BigNumber =
				await gifty.getGiftyEarnedCommission(giftyToken.address);

			// 1 GFT == 1 USD for tests
			const [, rate]: BigNumber[] = await gifty.getCommissionRate(
				amount
			);

			const expectedEarnedCommission: BigNumber = getCommissionAmount(
				amount,
				rate
			);

			expect(earnedCommission).eq(expectedEarnedCommission);
		});

		it("Gifty balance increased to commission + giftAmount", async function () {
			const { gifty, owner, receiver, giftyToken } = await loadFixture(
				GiftyFixture
			);

			// 1 GFT == 1 USD for tests
			const [, rate]: BigNumber[] = await gifty.getCommissionRate(
				amount
			);

			const commissionEarned: BigNumber = getCommissionAmount(
				amount,
				rate
			);

			const fullGiftAmount: BigNumber = amount.add(commissionEarned);

			await expect(
				gifty.giftTokenWithGFTCommission(
					receiver.address,
					giftyToken.address,
					amount
				)
			).to.changeTokenBalances(
				giftyToken,
				[owner.address, gifty.address],
				["-" + fullGiftAmount, fullGiftAmount]
			);
		});

		it("AmountToGift is correct", async function () {
			const { gifty, receiver, giftyToken } = await loadFixture(
				GiftyFixture
			);

			await gifty.giftTokenWithGFTCommission(
				receiver.address,
				giftyToken.address,
				amount
			);

			const { amount: giftedAmount } = await gifty.getExactGift(0);

			expect(giftedAmount).eq(amount);
		});
	});
});
