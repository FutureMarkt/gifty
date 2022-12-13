import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";
import {
	OneEther,
	getConvertedPrice,
	getCommissionAmount,
	getPriceOfExactETHAmount,
} from "../../TestHelper";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

describe("Gifty | giftToken", function () {
	const giftAmount: BigNumber = OneEther;

	it("Giver equal to receiver should be reverted", async function () {
		const { gifty, owner, testToken } = await loadFixture(GiftyFixture);

		await expect(
			gifty.giftToken(owner.address, testToken.address, giftAmount)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_11");
	});

	it("If token doesn't allowed should be reverted", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		const sampleToken = gifty.address;

		await expect(
			gifty.giftToken(receiver.address, sampleToken, giftAmount)
		)
			.to.be.revertedWithCustomError(gifty, "Gifty__error_16")
			.withArgs(sampleToken);
	});

	it("If gift price to low should be reverted", async function () {
		const { gifty, receiver, testToken } = await loadFixture(GiftyFixture);

		await expect(
			gifty.giftToken(receiver.address, testToken.address, 10000)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_9");
	});

	it("Correct price received from the price feed", async function () {
		const { gifty, receiver, testToken, tokenMockAggregator } =
			await loadFixture(GiftyFixture);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		const { amountInUSD: giftPriceInUSD } = await gifty.getExactGift(0);

		const priceFromPriceFeed: BigNumber = await getPriceOfExactETHAmount(
			tokenMockAggregator,
			giftAmount
		);

		expect(giftPriceInUSD).eq(priceFromPriceFeed);
	});

	it("Correct amount transfered from giver", async function () {
		const { gifty, receiver, testToken, owner, tokenMockAggregator } =
			await loadFixture(GiftyFixture);

		const giftPrice: BigNumber = await getPriceOfExactETHAmount(
			tokenMockAggregator,
			giftAmount
		);

		// Get commission rate for gift
		const [commissionRate]: BigNumber[] = await gifty.getCommissionRate(
			giftPrice
		);

		const commissionAmount: BigNumber = getCommissionAmount(
			giftAmount,
			commissionRate
		);

		const toBeTransfered: BigNumber = giftAmount.add(commissionAmount);

		await expect(
			gifty.giftToken(receiver.address, testToken.address, giftAmount)
		).to.changeTokenBalances(
			testToken,
			[owner.address, gifty.address],
			["-" + toBeTransfered, toBeTransfered]
		);
	});

	it("Should be charged correct commission", async function () {
		const { gifty, receiver, tokenMockAggregator, testToken } =
			await loadFixture(GiftyFixture);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		const giftPrice: BigNumber = await getPriceOfExactETHAmount(
			tokenMockAggregator,
			giftAmount
		);

		// Get commission rate for gift
		const [commissionRate]: BigNumber[] = await gifty.getCommissionRate(
			giftPrice
		);

		const commissionShouldBeCharged: BigNumber = getCommissionAmount(
			giftAmount,
			commissionRate
		);

		const balance = await gifty.getGiftyEarnedCommission(
			testToken.address
		);
		expect(balance).eq(commissionShouldBeCharged);
	});

	it("Total turnover in usd should be updated correctly", async function () {
		const { gifty, receiver, owner, tokenMockAggregator, testToken } =
			await loadFixture(GiftyFixture);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		const {
			finInfo: { totalTurnoverInUSD },
		} = await gifty.getUserInfo(owner.address);

		const convertedTokenPrice: BigNumber = await getConvertedPrice(
			tokenMockAggregator
		);

		// Calculate expected turnover
		const expectedTurnover: BigNumber = convertedTokenPrice
			.mul(giftAmount)
			.div(OneEther);

		expect(totalTurnoverInUSD).eq(expectedTurnover);
	});

	it("Commission payed in usd should be updated correctly", async function () {
		const { gifty, receiver, owner, tokenMockAggregator, testToken } =
			await loadFixture(GiftyFixture);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		const {
			finInfo: { commissionPayedInUSD },
		} = await gifty.getUserInfo(owner.address);

		const giftPrice: BigNumber = await getPriceOfExactETHAmount(
			tokenMockAggregator,
			giftAmount
		);

		const [rate]: BigNumber[] = await gifty.getCommissionRate(giftPrice);

		const comissionPriceInUSD: BigNumber = await getPriceOfExactETHAmount(
			tokenMockAggregator,
			getCommissionAmount(giftAmount, rate)
		);

		expect(commissionPayedInUSD).eq(comissionPriceInUSD);
	});

	it("When several gifts have been sent - the turnover increases", async function () {
		const { gifty, receiver, owner, tokenMockAggregator, testToken } =
			await loadFixture(GiftyFixture);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);
		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		const {
			finInfo: { totalTurnoverInUSD },
		} = await gifty.getUserInfo(owner.address);

		const convertedTokenPrice: BigNumber = await getConvertedPrice(
			tokenMockAggregator
		);

		// Calculate expected turnover
		const expectedTurnover: BigNumber = convertedTokenPrice
			.mul(giftAmount)
			.div(OneEther);

		expect(totalTurnoverInUSD).eq(expectedTurnover.mul(2));
	});

	it("Comission payed in usd should be updated correctly", async function () {
		const { gifty, receiver, owner, tokenMockAggregator, testToken } =
			await loadFixture(GiftyFixture);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		const {
			finInfo: { commissionPayedInUSD },
		} = await gifty.getUserInfo(owner.address);

		const convertedTokenPrice: BigNumber = await getConvertedPrice(
			tokenMockAggregator
		);

		const giftPrice: BigNumber = await getPriceOfExactETHAmount(
			tokenMockAggregator,
			giftAmount
		);

		// Get commission rate for gift
		const [commissionRate]: BigNumber[] = await gifty.getCommissionRate(
			giftPrice
		);

		const commissionAmount: BigNumber = getCommissionAmount(
			giftAmount,
			commissionRate
		);

		// Calculate expected turnover
		const expectedCommissionPayed: BigNumber = convertedTokenPrice
			.mul(commissionAmount)
			.div(OneEther);

		expect(commissionPayedInUSD).eq(expectedCommissionPayed);
	});

	it("When several gifts have been sent - commission payed increases", async function () {
		const { gifty, receiver, owner, tokenMockAggregator, testToken } =
			await loadFixture(GiftyFixture);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		const {
			finInfo: { commissionPayedInUSD },
		} = await gifty.getUserInfo(owner.address);

		const giftPrice: BigNumber = await getPriceOfExactETHAmount(
			tokenMockAggregator,
			giftAmount
		);

		// Get commission rate for gift
		const [commissionRate]: BigNumber[] = await gifty.getCommissionRate(
			giftPrice
		);

		const commissionAmount: BigNumber = getCommissionAmount(
			giftPrice,
			commissionRate
		);

		expect(commissionPayedInUSD).eq(commissionAmount.mul(2));
	});

	it("Gift amount should be correct specified", async function () {
		const { gifty, receiver, testToken } = await loadFixture(GiftyFixture);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);

		const { amount } = await gifty.getExactGift(0);
		expect(amount).eq(giftAmount);
	});

	it("Gift structure should be correct", async function () {
		const { gifty, receiver, owner, tokenMockAggregator, testToken } =
			await loadFixture(GiftyFixture);

		await gifty.giftToken(receiver.address, testToken.address, giftAmount);
		const currentBlock: number = await ethers.provider.getBlockNumber();
		const currentTimeStamp: number = (
			await ethers.provider.getBlock(currentBlock)
		).timestamp;

		const gift = await gifty.getExactGift(0);

		const convertedTokenPrice: BigNumber = await getConvertedPrice(
			tokenMockAggregator
		);

		const giftPrice: BigNumber = convertedTokenPrice
			.mul(giftAmount)
			.div(OneEther);

		const expectedGift = [
			owner.address,
			receiver.address,
			giftPrice,
			giftAmount,
			testToken.address,
			2 /* Token */,
			currentBlock,
			currentTimeStamp,
			false,
			false,
		];

		for (let i = 0; i < expectedGift.length; i++) {
			expect(gift[i]).eq(expectedGift[i]);
		}
	});

	it("GiftCreated should be emmited with correct args", async function () {
		const { gifty, receiver, owner, testToken } = await loadFixture(
			GiftyFixture
		);

		await expect(
			gifty.giftToken(receiver.address, testToken.address, giftAmount)
		)
			.to.emit(gifty, "GiftCreated")
			.withArgs(
				owner.address,
				receiver.address,
				testToken.address,
				giftAmount,
				0 // first gift
			);
	});
});
