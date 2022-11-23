import { ethers } from "hardhat";

import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import {
	OneEther,
	OneEtherGiftWithCommission,
	getConvertedPrice,
	EthAddress,
} from "../../TestHelper";
import { BigNumber } from "ethers";

describe("Gifty | giftETH", function () {
	const giftAmount: BigNumber = OneEther;

	it("Giver equal to receiver should be reverted", async function () {
		const { gifty, owner } = await loadFixture(GiftyFixture);

		await expect(
			gifty.giftETH(owner.address, giftAmount, {
				value: OneEtherGiftWithCommission,
			})
		).to.be.revertedWithCustomError(gifty, "Gifty__error_11");
	});

	it("Giver assigned correctly | owner", async function () {
		const { gifty, owner, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		const { giver } = await gifty.getExactGift(0);
		expect(giver).eq(owner.address);
	});

	it("Giver assigned correctly | other account", async function () {
		const { gifty, owner, receiver } = await loadFixture(GiftyFixture);

		await gifty.connect(receiver).giftETH(owner.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		const { giver } = await gifty.getExactGift(0);
		expect(giver).eq(receiver.address);
	});

	it("Receiver assigned correctly | owner", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		const { receiver: receiverFromContract } = await gifty.getExactGift(0);
		expect(receiverFromContract).eq(receiver.address);
	});

	it("Receiver assigned correctly | other", async function () {
		const { gifty, receiver, owner } = await loadFixture(GiftyFixture);

		await gifty.connect(receiver).giftETH(owner.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		const { receiver: receiverFromContract } = await gifty.getExactGift(0);
		expect(receiverFromContract).eq(owner.address);
	});

	it("Amount assigned correctly | owner", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		const { amount } = await gifty.getExactGift(0);
		expect(amount).eq(giftAmount);
	});

	it("Amount assigned correctly | other", async function () {
		const { gifty, receiver, owner } = await loadFixture(GiftyFixture);

		await gifty.connect(receiver).giftETH(owner.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});
		const { amount } = await gifty.getExactGift(0);
		expect(amount).eq(giftAmount);
	});

	it("Gift token assigned correctly | should be 0xE address", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		const { asset } = await gifty.getExactGift(0);
		expect(asset).eq(EthAddress);
	});

	it("Gift type assigned correctly | should be ETH", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		const { giftType } = await gifty.getExactGift(0);
		expect(giftType).eq(1); // ETH
	});

	it("Time of gift should be assigned correctly", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});
		const currentBlock = await ethers.provider.getBlockNumber();

		const { giftedAtBlock } = await gifty.getExactGift(0);

		expect(giftedAtBlock).eq(currentBlock);
	});

	it("Gift claim status should be false", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		const { isClaimed } = await gifty.getExactGift(0);

		expect(isClaimed).false;
	});

	it("Gift refunded status should be false", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		const { isRefunded } = await gifty.getExactGift(0);

		expect(isRefunded).false;
	});

	it("Giver should has a giftId in userInfo.givenGifts", async function () {
		const { gifty, receiver, owner } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		const giftId: BigNumber = (await gifty.getGiftsAmount()).sub(1);
		const { givenGifts } = await gifty.getUserInfo(owner.address);

		expect(givenGifts[givenGifts.length - 1]).eq(giftId);
	});

	it("Receiver should has a giftId in userInfo.receivedGifts", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		const giftId: BigNumber = (await gifty.getGiftsAmount()).sub(1);
		const { receivedGifts } = await gifty.getUserInfo(receiver.address);

		expect(receivedGifts[receivedGifts.length - 1]).eq(giftId);
	});

	it("giftETH should emit GiftCreated", async function () {
		const { gifty, receiver, owner } = await loadFixture(GiftyFixture);

		await expect(
			gifty.giftETH(receiver.address, giftAmount, {
				value: OneEtherGiftWithCommission,
			})
		)
			.to.emit(gifty, "GiftCreated")
			.withArgs(owner.address, receiver.address, EthAddress, giftAmount);
	});

	it("The next gift will receive the corresponding index", async function () {
		const { gifty, receiver, owner } = await loadFixture(GiftyFixture);

		// First gift
		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		const giftIdBefore: BigNumber = (await gifty.getGiftsAmount()).sub(1);
		// Second gift
		await gifty.connect(receiver).giftETH(owner.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		const giftId: BigNumber = (await gifty.getGiftsAmount()).sub(1);

		expect(giftId).eq(giftIdBefore.add(1));
	});

	it("Several gift contained in the all gift array after next gift", async function () {
		const { gifty, receiver, owner } = await loadFixture(GiftyFixture);

		// First gift
		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		// Second gift
		await gifty.connect(receiver).giftETH(owner.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		const gifts: any[] = await gifty.getAllGifts();

		expect(gifts.length).eq(2);
	});

	it("All information about next gift will saved correctly", async function () {
		const { gifty, receiver, owner, ethMockAggregator } =
			await loadFixture(GiftyFixture);

		// First gift
		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		// Second gift
		await gifty.connect(receiver).giftETH(owner.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});
		const currentBlock: number = await ethers.provider.getBlockNumber();
		const currentTimeStamp: number = (await ethers.provider.getBlock(currentBlock)).timestamp;


		const giftId: BigNumber = (await gifty.getGiftsAmount()).sub(1);
		const latestGift: any[] = await gifty.getExactGift(giftId);
		const ethPrice = await getConvertedPrice(ethMockAggregator);

		const expectedResult = [
			receiver.address,
			owner.address,
			ethPrice,
			giftAmount,
			EthAddress,
			1, // Gift type - ETH
			currentBlock,
			currentTimeStamp,
			false,
		];

		for (let i = 0; i < expectedResult.length; i++) {
			expect(latestGift[i]).eq(expectedResult[i]);
		}
	});
});
