import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "ethers";
import { BigNumber } from "ethers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";
import { secondsAgo as configSecondsAgo } from "../../TestHelper";

describe("Gifty | Getters", function () {
	const giftAmount: BigNumber = ethers.utils.parseUnits("1", 17);
	const giftCommission: BigNumber = ethers.utils.parseUnits("1", 16);
	const giftWithComission: BigNumber = giftAmount.add(giftCommission);

	describe("getUsersReceivedGiftBatche", function () {
		it("If offset more then array length - revert", async function () {
			const { gifty, receiver, viewer } = await loadFixture(
				GiftyFixture
			);

			for (let i = 1; i < 6; i++) {
				await gifty.giftETH(receiver.address, giftAmount.mul(i), {
					value: giftWithComission.mul(i),
				});
			}

			await expect(
				viewer.getUsersReceivedGiftBatche(receiver.address, 10, 1)
			)
				.to.be.revertedWithCustomError(
					viewer,
					"GiftyViewer__offsetGreaterThanLengthOfTheArray"
				)
				.withArgs(10, 5);
		});

		it("If number of remaining gifts is less than the number of desired gifts - revert", async function () {
			const { gifty, receiver, viewer } = await loadFixture(
				GiftyFixture
			);

			for (let i = 1; i < 6; i++) {
				await gifty.giftETH(receiver.address, giftAmount.mul(i), {
					value: giftWithComission.mul(i),
				});
			}

			await expect(
				viewer.getUsersReceivedGiftBatche(receiver.address, 2, 5)
			).to.be.revertedWithCustomError(
				viewer,
				"GiftyViewer__amountOfElementsGreaterThanRemainingElements"
			);
		});

		it("Get one gift | 1st from start of array", async function () {
			const { gifty, receiver, viewer } = await loadFixture(
				GiftyFixture
			);

			for (let i = 1; i < 6; i++) {
				await gifty.giftETH(receiver.address, giftAmount.mul(i), {
					value: giftWithComission.mul(i),
				});
			}

			const gifts: any[] = await viewer.getUsersReceivedGiftBatche(
				receiver.address,
				5,
				1
			);

			expect(gifts[0].amount).eq(giftAmount);
		});

		it("Get two gift | 1st and 2nd from start of array", async function () {
			const { gifty, receiver, viewer } = await loadFixture(
				GiftyFixture
			);

			for (let i = 1; i < 6; i++) {
				await gifty.giftETH(receiver.address, giftAmount.mul(i), {
					value: giftWithComission.mul(i),
				});
			}

			const desiredAmountOfGifts: number = 2;
			const gifts: any[] = await viewer.getUsersReceivedGiftBatche(
				receiver.address,
				5,
				desiredAmountOfGifts
			);

			for (let i = 0; i < desiredAmountOfGifts; i++) {
				expect(gifts[i].amount).eq(giftAmount.mul(i + 1));
			}
		});

		it("Received amount of gifts is correct", async function () {
			const { gifty, receiver, viewer } = await loadFixture(
				GiftyFixture
			);

			for (let i = 1; i < 11; i++) {
				await gifty.giftETH(receiver.address, giftAmount.mul(i), {
					value: giftWithComission.mul(i),
				});
			}

			const desiredAmountOfGifts: number = 6;
			const gifts: any[] = await viewer.getUsersReceivedGiftBatche(
				receiver.address,
				6,
				desiredAmountOfGifts
			);

			expect(gifts.length).eq(desiredAmountOfGifts);
		});

		it("Get Batche in correct order", async function () {
			const { gifty, receiver, viewer } = await loadFixture(
				GiftyFixture
			);

			for (let i = 1; i < 11; i++) {
				await gifty.giftETH(receiver.address, giftAmount.mul(i), {
					value: giftWithComission.mul(i),
				});
			}

			const desiredAmountOfGifts: number = 5;
			const gifts: any[] = await viewer.getUsersReceivedGiftBatche(
				receiver.address,
				5,
				desiredAmountOfGifts
			);

			for (let i = 0; i < desiredAmountOfGifts; i++) {
				expect(gifts[i].amount).eq(
					giftAmount.mul(desiredAmountOfGifts + i + 1)
				);
			}
		});
	});

	describe("getUsersGivenGiftBatche", function () {
		it("Get given gifts batche", async function () {
			const { gifty, receiver, owner, viewer } = await loadFixture(
				GiftyFixture
			);

			for (let i = 1; i < 6; i++) {
				await gifty.giftETH(receiver.address, giftAmount.mul(i), {
					value: giftWithComission.mul(i),
				});
			}

			const desiredAmountOfGifts: number = 3;
			const gifts: any[] = await viewer.getUsersGivenGiftBatche(
				owner.address,
				3,
				desiredAmountOfGifts
			);

			for (let i = 0; i < desiredAmountOfGifts; i++) {
				giftAmount.mul(desiredAmountOfGifts + i + 1);
			}
		});

		it("Exact gift is correct", async function () {
			const { gifty, receiver, owner, viewer } = await loadFixture(
				GiftyFixture
			);

			for (let i = 1; i < 6; i++) {
				await gifty.giftETH(receiver.address, giftAmount.mul(i), {
					value: giftWithComission.mul(i),
				});
			}

			const gifts: any[] = await viewer.getUsersGivenGiftBatche(
				owner.address,
				3,
				1
			);

			expect(gifts[0].amount).eq(giftAmount.mul(3));
		});
	});

	describe("getUniswapConfig", function () {
		it("Return correct pool value", async function () {
			const { gifty, uniswapPoolMock } = await loadFixture(GiftyFixture);
			const { pool } = await gifty.getUniswapConfig();

			expect(uniswapPoolMock.address).eq(pool);
		});

		it("Return correct anotherToken value", async function () {
			const { gifty, uniswapPoolMock } = await loadFixture(GiftyFixture);
			const { anotherTokenInPool } = await gifty.getUniswapConfig();
			const anotherTokenFromContract = await uniswapPoolMock.token0();

			expect(anotherTokenInPool).eq(anotherTokenFromContract);
		});

		it("Return correct secondsAgo value", async function () {
			const { gifty } = await loadFixture(GiftyFixture);
			const { secondsAgo } = await gifty.getUniswapConfig();

			expect(secondsAgo).eq(configSecondsAgo);
		});
	});
});
