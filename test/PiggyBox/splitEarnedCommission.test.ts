import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { EthAddress, OneEther } from "../TestHelper";
import { ethAddress } from "../../dataHelper";

async function splitEarnedCommissionFixture() {
	const { gifty, receiver, piggyBox, ...params } = await loadFixture(
		GiftyFixture
	);

	const amount: BigNumber = ethers.utils.parseEther("1000");

	await gifty.giftETH(receiver.address, amount, {
		value: amount.mul(2),
	});

	const earnedAmount: BigNumber = await gifty.getGiftyEarnedCommission(
		EthAddress
	);

	await gifty.transferToPiggyBoxETH(earnedAmount);

	const tokensToBeSwapped: Array<string> = [ethAddress];

	return {
		gifty,
		receiver,
		piggyBox,
		amount,
		tokensToBeSwapped,
		...params,
	};
}

describe("PiggyBox | splitEarnedCommission", function () {
	it("Caller not the owner should be reverted", async function () {
		const { piggyBox, signers } = await loadFixture(GiftyFixture);

		await expect(
			piggyBox
				.connect(signers[0])
				.splitEarnedCommission([], signers[0].address)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("Caller not the owner should be reverted", async function () {
		const { piggyBox, tokensToBeSwapped, owner } = await loadFixture(
			splitEarnedCommissionFixture
		);

		// TODO
		await piggyBox.splitEarnedCommission(tokensToBeSwapped, owner.address);
	});
});
