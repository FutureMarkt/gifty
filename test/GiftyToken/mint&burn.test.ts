import { GiftyFixture } from "../fixtures/GiftyFixture";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { BigNumber } from "ethers";
import {
	EthAddress,
	SplitCommission,
	spllitCommissionSettings,
} from "../TestHelper";

import { expect } from "chai";
import { ethers } from "hardhat";
import { Gifty, PiggyBox } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const amount: BigNumber = ethers.utils.parseEther("1000");

async function prepareFixture(
	gifty: Gifty,
	receiver: SignerWithAddress,
	piggyBox: PiggyBox,
	mintPercantage: number,
	burnPercantage: number
) {
	await gifty.giftETH(receiver.address, amount, {
		value: amount.mul(2),
	});

	const earnedAmount: BigNumber = await gifty.getGiftyEarnedCommission(
		EthAddress
	);

	await gifty.transferToPiggyBoxETH(earnedAmount);

	const newSettings: SplitCommission = {
		...spllitCommissionSettings,
		mintPercentage: mintPercantage,
		burnPercentage: burnPercantage,
	};

	await piggyBox.changeSplitSettings(newSettings);
}
describe("GiftyToken | mint/burn", function () {
	it("Not piggyBox account can't burn tokens", async function () {
		const { signers, giftyToken } = await loadFixture(GiftyFixture);

		await expect(
			giftyToken.burn(signers[0].address, amount)
		).to.be.revertedWithCustomError(
			giftyToken,
			"GiftyToken__onlyPiggyBox"
		);
	});

	it("Not Gifty account can't mint tokens", async function () {
		const { signers, giftyToken } = await loadFixture(GiftyFixture);

		await expect(
			giftyToken.mint(signers[0].address, amount)
		).to.be.revertedWithCustomError(
			giftyToken,
			"GiftyToken__onlyPiggyBox"
		);
	});

	it("Tokens were successfully minted", async function () {
		const { gifty, receiver, piggyBox, giftyToken } = await loadFixture(
			GiftyFixture
		);

		await prepareFixture(gifty, receiver, piggyBox, 10_000 /* 100% */, 0);

		const balanceBefore: BigNumber = await giftyToken.balanceOf(
			piggyBox.address
		);

		await piggyBox.splitEarnedCommission([EthAddress], receiver.address);

		const balanceAfter: BigNumber = await giftyToken.balanceOf(
			piggyBox.address
		);

		expect(balanceAfter).gt(balanceBefore);
	});

	it("Tokens were successfully burned", async function () {
		const { gifty, receiver, piggyBox, giftyToken } = await loadFixture(
			GiftyFixture
		);

		await giftyToken.transfer(piggyBox.address, amount);

		await prepareFixture(gifty, receiver, piggyBox, 0, 10_000 /* 100% */);

		const balanceBefore: BigNumber = await giftyToken.balanceOf(
			piggyBox.address
		);

		await piggyBox.splitEarnedCommission([EthAddress], receiver.address);

		const balanceAfter: BigNumber = await giftyToken.balanceOf(
			piggyBox.address
		);

		expect(balanceBefore).gt(balanceAfter);
	});
});
