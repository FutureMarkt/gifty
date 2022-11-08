import { ethers } from "hardhat";

import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "./fixtures/GiftyFixture";
import {
	OneEther,
	OneEtherGiftWithCommission,
	EthAddress,
} from "../TestHelper";
import { BigNumber } from "ethers";

describe.only("Gifty | giftETH", function () {
	const giftAmount: BigNumber = OneEther;

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

	it("Gift token assigned correctly | should be ETH address", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		const { giftToken } = await gifty.getExactGift(0);
		expect(giftToken).eq(EthAddress);
	});

	it("Gift type assigned correctly | should be ETH (1)", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		const { giftType } = await gifty.getExactGift(0);
		expect(giftType).eq(1);
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
});
