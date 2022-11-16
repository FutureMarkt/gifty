import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftTokenFixture } from "./fixtures/GiftTokenFixture";
import {
	OneEther,
	getConvertedPrice,
	getCommissionAmount,
} from "../TestHelper";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

describe("Gifty | giftETH", function () {
	const giftAmount: BigNumber = OneEther;
	let tokenAddress: string = "";

	it("Giver equal to receiver should be reverted", async function () {
		const { gifty, owner, testToken } = await loadFixture(
			GiftTokenFixture
		);

		tokenAddress = testToken.address;

		await expect(
			gifty.giftToken(owner.address, testToken.address, giftAmount)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_11");
	});

	it("If token doesn't allowed should be reverted", async function () {
		const { gifty, receiver } = await loadFixture(GiftTokenFixture);

		const sampleToken = gifty.address;

		await expect(
			gifty.giftToken(receiver.address, sampleToken, giftAmount)
		)
			.to.be.revertedWithCustomError(gifty, "Gifty__error_16")
			.withArgs(sampleToken);
	});

	it("If token price to low should be reverted", async function () {
		const { gifty, receiver } = await loadFixture(GiftTokenFixture);

		await expect(
			gifty.giftToken(receiver.address, tokenAddress, 10000)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_9");
	});

	it("If gift price to low should be reverted", async function () {
		const { gifty, receiver } = await loadFixture(GiftTokenFixture);

		await expect(
			gifty.giftToken(receiver.address, tokenAddress, 10000)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_9");
	});

	it("Correct amount transfered from giver", async function () {
		const { gifty, receiver, testToken, owner } = await loadFixture(
			GiftTokenFixture
		);

		const [commissionRate]: BigNumber[] = await gifty.getCommissionRate();

		const commissionAmount: BigNumber = getCommissionAmount(
			giftAmount,
			commissionRate
		);

		const toBeTransfered: BigNumber = giftAmount.add(commissionAmount);

		await expect(
			gifty.giftToken(receiver.address, tokenAddress, giftAmount)
		).to.changeTokenBalances(
			testToken,
			[owner.address, gifty.address],
			["-" + toBeTransfered, toBeTransfered]
		);
	});

	it("Should be charged correct commission", async function () {
		const { gifty, receiver } = await loadFixture(GiftTokenFixture);

		await gifty.giftToken(receiver.address, tokenAddress, giftAmount);

		const [commissionRate]: BigNumber[] = await gifty.getCommissionRate();
		const commissionShouldBeCharged: BigNumber = getCommissionAmount(
			giftAmount,
			commissionRate
		);

		const balance = await gifty.getGiftyBalance(tokenAddress);
		expect(balance).eq(commissionShouldBeCharged);
	});

	it("Total turnover in usd should be updated correctly", async function () {
		const { gifty, receiver, owner, tokenMockAggregator } =
			await loadFixture(GiftTokenFixture);

		await gifty.giftToken(receiver.address, tokenAddress, giftAmount);

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

	it("When several gifts have been sent - the turnover increases", async function () {
		const { gifty, receiver, owner, tokenMockAggregator } =
			await loadFixture(GiftTokenFixture);

		await gifty.giftToken(receiver.address, tokenAddress, giftAmount);
		await gifty.giftToken(receiver.address, tokenAddress, giftAmount);

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
		const { gifty, receiver, owner, tokenMockAggregator } =
			await loadFixture(GiftTokenFixture);

		await gifty.giftToken(receiver.address, tokenAddress, giftAmount);

		const {
			finInfo: { commissionPayedInUSD },
		} = await gifty.getUserInfo(owner.address);

		const convertedTokenPrice: BigNumber = await getConvertedPrice(
			tokenMockAggregator
		);

		const [commissionRate]: BigNumber[] = await gifty.getCommissionRate();
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
		const { gifty, receiver, owner, tokenMockAggregator } =
			await loadFixture(GiftTokenFixture);

		await gifty.giftToken(receiver.address, tokenAddress, giftAmount);

		await gifty.giftToken(receiver.address, tokenAddress, giftAmount);

		const {
			finInfo: { commissionPayedInUSD },
		} = await gifty.getUserInfo(owner.address);

		const convertedTokenPrice: BigNumber = await getConvertedPrice(
			tokenMockAggregator
		);

		const [commissionRate]: BigNumber[] = await gifty.getCommissionRate();
		const commissionAmount: BigNumber = getCommissionAmount(
			giftAmount,
			commissionRate
		);

		// Calculate expected turnover
		const expectedCommissionPayed: BigNumber = convertedTokenPrice
			.mul(commissionAmount)
			.div(OneEther);

		expect(commissionPayedInUSD).eq(expectedCommissionPayed.mul(2));
	});

	it("Gift structure should be correct", async function () {
		const { gifty, receiver, owner, tokenMockAggregator } =
			await loadFixture(GiftTokenFixture);

		await gifty.giftToken(receiver.address, tokenAddress, giftAmount);
		const gifttBlock: number = await ethers.provider.getBlockNumber();

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
			tokenAddress,
			2 /* Token */,
			gifttBlock,
			false,
			false,
		];

		for (let i = 0; i < expectedGift.length; i++) {
			expect(gift[i]).eq(expectedGift[i]);
		}
	});
});
