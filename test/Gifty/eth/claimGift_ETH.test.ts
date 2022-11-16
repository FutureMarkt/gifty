import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { OneEther, OneEtherGiftWithCommission } from "../../TestHelper";
import { BigNumber } from "ethers";

describe("Gifty | Claim ETH", function () {
	const giftAmount: BigNumber = OneEther;

	it("When a non-receiver of a gift tries to claim tx should be reverted", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		await expect(gifty.claimGift(0)).to.be.revertedWithCustomError(
			gifty,
			"Gifty__error_12"
		);
	});

	it("When the gift was already claimed tx should be reverted", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		await gifty.connect(receiver).claimGift(0);

		await expect(
			gifty.connect(receiver).claimGift(0)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_13");
	});

	it("When the gift was refunded tx should be reverted", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		await gifty.refundGift(0);

		await expect(
			gifty.connect(receiver).claimGift(0)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_14");
	});

	it("The gift is successfully claimed and balance was changed", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		await expect(
			gifty.connect(receiver).claimGift(0)
		).to.changeEtherBalances(
			[gifty.address, receiver.address],
			["-" + giftAmount, giftAmount]
		);
	});

	it("The gift isClaimed status was changed after claim", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		await gifty.connect(receiver).claimGift(0);

		const { isClaimed } = await gifty.getExactGift(0);
		expect(isClaimed).true;
	});

	it("When the gift is claimed an event GiftClaimed should be emitted", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		await expect(gifty.connect(receiver).claimGift(0))
			.to.emit(gifty, "GiftClaimed")
			.withArgs(0);
	});

	it("Reentrancy attack to claim", async function () {
		const { gifty, attacker } = await loadFixture(GiftyFixture);

		await gifty.giftETH(attacker.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		await gifty.giftETH(attacker.address, giftAmount, {
			value: OneEtherGiftWithCommission.mul(5),
		});

		await expect(
			attacker.attack(gifty.address, 0, 1, { gasLimit: 30000000 })
		).to.be.revertedWithCustomError(
			gifty,
			"ExternalAccountsInteraction__lowLevelTransferIsFailed"
		);
	});
});
