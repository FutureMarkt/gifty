import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import {
	EthAddress,
	getConvertedPrice,
	getCommissionAmount,
	getPriceOfExactETHAmount,
	OneEther,
} from "../../TestHelper";

describe("Gifty | giftETHWithGFTCommission", function () {
	it("If gift to yourself - should be reverted", async function () {
		const { gifty, owner } = await loadFixture(GiftyFixture);

		await expect(
			gifty.giftETHWithGFTCommission(owner.address)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_11");
	});

	it("Address of gifted asset specified as ETH", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);
		await gifty.giftETHWithGFTCommission(receiver.address, {
			value: OneEther,
		});

		const { asset } = await gifty.getExactGift(0);
		expect(asset).eq(EthAddress);
	});

	it("Transfered amount of ETH assigned to giftValue", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);
		await gifty.giftETHWithGFTCommission(receiver.address, {
			value: OneEther,
		});

		const { amount } = await gifty.getExactGift(0);
		expect(amount).eq(OneEther);
	});

	it("Gift price calculated correctly", async function () {
		const { gifty, receiver, ethMockAggregator } = await loadFixture(
			GiftyFixture
		);

		const giftPrice: BigNumber = await getConvertedPrice(
			ethMockAggregator
		);

		await gifty.giftETHWithGFTCommission(receiver.address, {
			value: OneEther,
		});

		const { amountInUSD } = await gifty.getExactGift(0);
		expect(amountInUSD).eq(giftPrice);
	});

	it("GFT tokens comission charged correctly", async function () {
		const { gifty, receiver, giftyToken, ethMockAggregator } =
			await loadFixture(GiftyFixture);

		await gifty.giftETHWithGFTCommission(receiver.address, {
			value: OneEther,
		});

		const giftyEarnedAmount: BigNumber =
			await gifty.getGiftyEarnedCommission(giftyToken.address);

		// Since from test purposes token price in pool equal to 1 USD
		const giftPrice: BigNumber = await getConvertedPrice(
			ethMockAggregator
		);

		const [, reducedRate]: BigNumber[] = await gifty.getCommissionRate(
			giftPrice
		);

		const expectedEarnedCommission: BigNumber =
			await getPriceOfExactETHAmount(
				ethMockAggregator,
				getCommissionAmount(OneEther, reducedRate)
			);

		expect(giftyEarnedAmount).eq(expectedEarnedCommission);
	});

	it("GFT tokens comission charged correctly | Big value of ETH", async function () {
		const { gifty, receiver, giftyToken, ethMockAggregator } =
			await loadFixture(GiftyFixture);

		const ethAmount: BigNumber = OneEther.mul(10);

		await gifty.giftETHWithGFTCommission(receiver.address, {
			value: ethAmount,
		});

		const giftyEarnedAmount: BigNumber =
			await gifty.getGiftyEarnedCommission(giftyToken.address);

		// Since from test purposes token price in pool equal to 1 USD
		const giftPrice: BigNumber = await getPriceOfExactETHAmount(
			ethMockAggregator,
			ethAmount
		);

		const [, reducedRate]: BigNumber[] = await gifty.getCommissionRate(
			giftPrice
		);

		const expectedEarnedCommission: BigNumber =
			await getPriceOfExactETHAmount(
				ethMockAggregator,
				getCommissionAmount(ethAmount, reducedRate)
			);

		expect(giftyEarnedAmount).eq(expectedEarnedCommission);
	});

	it("GFT tokens comission charged correctly | Low value of ETH", async function () {
		const { gifty, receiver, giftyToken, ethMockAggregator } =
			await loadFixture(GiftyFixture);

		const ethAmount: BigNumber = ethers.utils.parseUnits("1", 17);

		await gifty.giftETHWithGFTCommission(receiver.address, {
			value: ethAmount,
		});

		const giftyEarnedAmount: BigNumber =
			await gifty.getGiftyEarnedCommission(giftyToken.address);

		// Since from test purposes token price in pool equal to 1 USD
		const giftPrice: BigNumber = await getPriceOfExactETHAmount(
			ethMockAggregator,
			ethAmount
		);

		const [, reducedRate]: BigNumber[] = await gifty.getCommissionRate(
			giftPrice
		);

		const expectedEarnedCommission: BigNumber =
			await getPriceOfExactETHAmount(
				ethMockAggregator,
				getCommissionAmount(ethAmount, reducedRate)
			);

		expect(giftyEarnedAmount).eq(expectedEarnedCommission);
	});

	it("Gifty GFT balance increased", async function () {
		const { gifty, receiver, giftyToken, owner, ethMockAggregator } =
			await loadFixture(GiftyFixture);

		const ethPrice: BigNumber = await getConvertedPrice(ethMockAggregator);

		const [, reducedRate]: BigNumber[] = await gifty.getCommissionRate(
			ethPrice
		);

		const commissionShouldBeEarned: BigNumber =
			await getPriceOfExactETHAmount(
				ethMockAggregator,
				getCommissionAmount(OneEther, reducedRate)
			);

		await expect(
			gifty.giftETHWithGFTCommission(receiver.address, {
				value: OneEther,
			})
		).to.changeTokenBalances(
			giftyToken,
			[owner.address, gifty.address],
			["-" + commissionShouldBeEarned, commissionShouldBeEarned]
		);
	});

	it("All props in Gift filled correctly", async function () {
		const { gifty, receiver, owner, ethMockAggregator } =
			await loadFixture(GiftyFixture);

		const giftPrice: BigNumber = await getConvertedPrice(
			ethMockAggregator
		);

		await gifty.giftETHWithGFTCommission(receiver.address, {
			value: OneEther,
		});

		const lastBlockNumber: number = await time.latestBlock();
		const lastTimeStamp: number = await time.latest();

		const gift = await gifty.getExactGift(0);

		expect(gift.giver).eq(owner.address);
		expect(gift.receiver).eq(receiver.address);
		expect(gift.amountInUSD).eq(giftPrice);
		expect(gift.amount).eq(OneEther);
		expect(gift.asset).eq(EthAddress);
		expect(gift.giftType).eq(1 /* ETH */);
		expect(gift.giftedAtBlock).eq(lastBlockNumber);
		expect(gift.giftedAtTime).eq(lastTimeStamp);
		expect(gift.isClaimed).false;
		expect(gift.isRefunded).false;
	});

	it("Value equal to 0 should be reverted", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await expect(
			gifty.giftETHWithGFTCommission(receiver.address)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_9");
	});

	it("The user finInfo updated correctly (totalTurnoverInUSD)", async function () {
		const { gifty, owner, receiver, ethMockAggregator } =
			await loadFixture(GiftyFixture);

		const giftPrice: BigNumber = await getConvertedPrice(
			ethMockAggregator
		);

		await gifty.giftETHWithGFTCommission(receiver.address, {
			value: OneEther,
		});

		const {
			finInfo: { totalTurnoverInUSD },
		} = await gifty.getUserInfo(owner.address);

		expect(totalTurnoverInUSD).eq(giftPrice);
	});

	it("The user finInfo updated correctly (commissionPayedInUSD)", async function () {
		const { gifty, owner, receiver, ethMockAggregator } =
			await loadFixture(GiftyFixture);

		const giftPrice: BigNumber = await getConvertedPrice(
			ethMockAggregator
		);

		const [, reducedRate]: BigNumber[] = await gifty.getCommissionRate(
			giftPrice
		);

		const expectedPayedCommission: BigNumber = getCommissionAmount(
			giftPrice,
			reducedRate
		);

		await gifty.giftETHWithGFTCommission(receiver.address, {
			value: OneEther,
		});

		const {
			finInfo: { commissionPayedInUSD },
		} = await gifty.getUserInfo(owner.address);

		expect(commissionPayedInUSD).eq(expectedPayedCommission);
	});
});
