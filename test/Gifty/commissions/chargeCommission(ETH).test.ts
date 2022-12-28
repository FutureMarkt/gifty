import { expect } from "chai";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";
import * as testHelper from "../../TestHelper";

describe("Gifty | commissions", function () {
	describe("ChargeCommission | ETH", function () {
		const giftAmount: BigNumber = testHelper.OneEther;

		it("A simple function call, without checks", async function () {
			const { gifty, receiver } = await loadFixture(GiftyFixture);

			await gifty.giftETH(receiver.address, testHelper.OneEther, {
				value: testHelper.OneEtherGiftWithCommission,
			});
		});

		it("Gifty's balance has been increased", async function () {
			const { gifty, receiver } = await loadFixture(GiftyFixture);

			await expect(
				gifty.giftETH(receiver.address, giftAmount, {
					value: testHelper.OneEtherGiftWithCommission,
				})
			).to.changeEtherBalance(
				gifty.address,
				testHelper.OneEtherGiftWithCommission
			);
		});

		it("The correct commission was taken", async function () {
			const { gifty, receiver, ethMockAggregator } = await loadFixture(
				GiftyFixture
			);

			const giftPrice: BigNumber =
				await testHelper.getPriceOfExactETHAmount(
					ethMockAggregator,
					giftAmount
				);

			// Get commission rate for gift
			const [commissionRate]: BigNumber[] =
				await gifty.getCommissionRate(giftPrice);

			// Calculate Gifty commission from this gift
			const commissionAmount: BigNumber = testHelper.getCommissionAmount(
				giftAmount,
				commissionRate
			);

			// Giving a gift
			await gifty.giftETH(receiver.address, giftAmount, {
				value: testHelper.OneEtherGiftWithCommission,
			});

			// Gifty balance (commission)
			const ethCommissionBalance: BigNumber =
				await gifty.getGiftyEarnedCommission(testHelper.EthAddress);

			expect(ethCommissionBalance).eq(commissionAmount);
		});

		it("If the transferred amount of ETH is lt the amount of the gift - revert", async function () {
			const { gifty, receiver } = await loadFixture(GiftyFixture);

			await expect(
				gifty.giftETH(receiver.address, giftAmount, {
					value: 1,
				})
			).revertedWithCustomError(gifty, "Gifty__amountLtValue");
		});

		it("If the transferred commission is too small - revert", async function () {
			const { gifty, receiver } = await loadFixture(GiftyFixture);

			await expect(
				gifty.giftETH(receiver.address, giftAmount, {
					value: testHelper.OneEther.add(1),
				})
			).revertedWithCustomError(gifty, "Gifty__commissionNotPayed");
		});

		it("If the transferred commission is gt Gifty commission, write delta - for the possibility of withdrawal", async function () {
			const { gifty, owner, receiver, ethMockAggregator } =
				await loadFixture(GiftyFixture);

			// Imagine that the user transferred more funds than needed.
			const bigCommission: BigNumber = testHelper.OneEther;

			const giftAmountWithBigCommission: BigNumber =
				giftAmount.add(bigCommission);

			const giftPrice: BigNumber =
				await testHelper.getPriceOfExactETHAmount(
					ethMockAggregator,
					giftAmount
				);

			// Get commission rate for gift
			const [commissionRate]: BigNumber[] =
				await gifty.getCommissionRate(giftPrice);

			const commissionAmount: BigNumber = testHelper.getCommissionAmount(
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

		it("Gifty's commission calculated and writen correctly", async function () {
			const { gifty, receiver, ethMockAggregator } = await loadFixture(
				GiftyFixture
			);

			const giftPrice = await testHelper.getPriceOfExactETHAmount(
				ethMockAggregator,
				giftAmount
			);

			const [rate] = await gifty.getCommissionRate(giftPrice);

			const expectedEarnedCommission: BigNumber =
				testHelper.getCommissionAmount(giftAmount, rate);

			await gifty.giftETH(receiver.address, giftAmount, {
				value: testHelper.OneEtherGiftWithCommission,
			});

			const giftyEtherBalance: BigNumber =
				await gifty.getGiftyEarnedCommission(testHelper.EthAddress);

			expect(expectedEarnedCommission).eq(giftyEtherBalance);
		});

		it("The total turnover of the user's funds increased in the dollar equivalent of a gift", async function () {
			const { gifty, owner, receiver, ethMockAggregator } =
				await loadFixture(GiftyFixture);

			const ethPriceWith18Decimals: BigNumber =
				await testHelper.getConvertedPrice(ethMockAggregator);

			await gifty.giftETH(receiver.address, giftAmount, {
				value: testHelper.OneEtherGiftWithCommission,
			});

			// Get user turnover after gift
			const {
				finInfo: { totalTurnoverInUSD },
			} = await gifty.getUserInfo(owner.address);
			// Calculate expected turnover
			const expectedTurnover: BigNumber = ethPriceWith18Decimals
				.mul(giftAmount)
				.div(testHelper.OneEther);

			expect(totalTurnoverInUSD).eq(expectedTurnover);
		});

		it("The total commission payed of the user's funds increased in the dollar equivalent of a commission payed", async function () {
			const { gifty, owner, receiver, ethMockAggregator } =
				await loadFixture(GiftyFixture);

			const ethPriceWith18Decimals: BigNumber =
				await testHelper.getConvertedPrice(ethMockAggregator);

			const giftPrice: BigNumber =
				await testHelper.getPriceOfExactETHAmount(
					ethMockAggregator,
					giftAmount
				);

			// Get commission rate for gift
			const [commissionRate]: BigNumber[] =
				await gifty.getCommissionRate(giftPrice);

			const commissionAmount: BigNumber = testHelper.getCommissionAmount(
				giftAmount,
				commissionRate
			);

			await gifty.giftETH(receiver.address, giftAmount, {
				value: testHelper.OneEtherGiftWithCommission,
			});

			const {
				finInfo: { commissionPayedInUSD },
			} = await gifty.getUserInfo(owner.address);

			// Calculate expected commission payed
			const expectedCommissionPayed: BigNumber = ethPriceWith18Decimals
				.mul(commissionAmount)
				.div(testHelper.OneEther);

			expect(commissionPayedInUSD).eq(expectedCommissionPayed);
		});
	});

	it("If gift less then 10000 b.p. - revert", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		/**
		 * In contact, there is a limit on the minimum amount of the gift (it can be either $10 or $15),
		 * but we need to provide for a situation if the commission is canceled
		 * and so that the mathematics in the contract still remains.
		 */
		testHelper.commissionSettings.thresholds.t1 = 0;
		await gifty.changeCommissionThresholds(
			testHelper.commissionSettings.thresholds
		);

		await expect(
			gifty.giftETH(receiver.address, 9999, { value: 10100 })
		).revertedWithCustomError(gifty, "Gifty__ltMinValue");
	});
});
