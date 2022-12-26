import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { EthAddress, OneEther } from "../TestHelper";
import { ethAddress } from "../../dataHelper";

async function splitEarnedCommissionFixture() {
	const { gifty, receiver, piggyBox, testToken, ...params } =
		await loadFixture(GiftyFixture);

	const amount: BigNumber = ethers.utils.parseEther("1000");

	const tokensToBeSwapped: string[] = [ethAddress, testToken.address];
	const earnedCommissions: BigNumber[] = new Array(2);

	// Create two gifts to earn some commissions for tests
	await gifty.giftETH(receiver.address, amount, {
		value: amount.mul(2),
	});
	earnedCommissions[0] = await gifty.getGiftyEarnedCommission(
		tokensToBeSwapped[0]
	);

	await gifty.giftToken(receiver.address, testToken.address, amount);
	earnedCommissions[1] = await gifty.getGiftyEarnedCommission(
		tokensToBeSwapped[1]
	);

	// Transfer commission to PiggyBox
	await gifty.transferToPiggyBoxETH(earnedCommissions[0]);
	await gifty.transferToPiggyBoxTokens(
		[testToken.address],
		[earnedCommissions[1]]
	);

	return {
		gifty,
		receiver,
		piggyBox,
		testToken,
		amount,
		tokensToBeSwapped,
		earnedCommissions,
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

	it.only("Two tokens should be splitted", async function () {
		const { piggyBox, tokensToBeSwapped, owner, testToken } =
			await loadFixture(splitEarnedCommissionFixture);

		const balanceBefore: BigNumber = await testToken.balanceOf(
			piggyBox.address
		);

		const splitTx = await piggyBox.splitEarnedCommission(
			tokensToBeSwapped,
			owner.address
		);

		await expect(splitTx).to.changeTokenBalance(
			tokensToBeSwapped[0],
			piggyBox.address,
			-balanceBefore
		);
	});
});
