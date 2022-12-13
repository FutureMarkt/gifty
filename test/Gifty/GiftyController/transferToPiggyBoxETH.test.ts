import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";
import {
	EthAddress,
	OneEther,
	OneEtherGiftWithCommission,
} from "../../TestHelper";
import { BigNumber } from "ethers";
import { ethAddress } from "../../../dataHelper";

describe("GiftyController | transferToPiggyBoxETH", function () {
	const expectedValue: number = 100;

	it("Caller not the owner should be reverted", async function () {
		const { gifty, signers } = await loadFixture(GiftyFixture);

		await expect(
			gifty.connect(signers[2]).transferToPiggyBoxETH(expectedValue)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("Amount to transfer gt balance - revert", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(gifty.transferToPiggyBoxETH(expectedValue))
			.to.be.revertedWithCustomError(gifty, "Gifty__error_6")
			.withArgs(expectedValue, 0);
	});

	it("PiggyBox received ETH", async function () {
		const { gifty, piggyBox, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, OneEther, {
			value: OneEtherGiftWithCommission,
		});

		const amountToTransfer: string = (
			await gifty.getGiftyEarnedCommission(EthAddress)
		).toString();

		await expect(
			gifty.transferToPiggyBoxETH(amountToTransfer)
		).to.changeEtherBalances(
			[piggyBox.address, gifty.address],
			[amountToTransfer, "-" + amountToTransfer]
		);
	});

	it("Transfer reduce internal gifty balance", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, OneEther, {
			value: OneEtherGiftWithCommission,
		});

		const balanceBefore: BigNumber = await gifty.getGiftyEarnedCommission(
			EthAddress
		);

		const transferAmount: BigNumber = balanceBefore.sub(expectedValue);

		await gifty.transferToPiggyBoxETH(transferAmount);

		const balanceAfter: BigNumber = await gifty.getGiftyEarnedCommission(
			EthAddress
		);

		expect(balanceAfter).eq(expectedValue);
	});

	it("To emit AssetTransferedToPiggyBox", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		await gifty.giftETH(receiver.address, OneEther, {
			value: OneEtherGiftWithCommission,
		});

		await expect(gifty.transferToPiggyBoxETH(expectedValue))
			.to.emit(gifty, "AssetTransferedToPiggyBox")
			.withArgs(ethAddress, expectedValue);
	});
});
