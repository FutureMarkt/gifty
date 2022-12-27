import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { ethAddress } from "../../dataHelper";
import { createPool, FeeAmount } from "../fixtures/createPool";
import {
	maxApprove,
	spllitCommissionSettings,
	ZeroAddress,
} from "../TestHelper";
import { setStorageAt } from "@nomicfoundation/hardhat-network-helpers";

async function splitEarnedCommissionFixture() {
	const {
		owner,
		gifty,
		receiver,
		piggyBox,
		testToken,
		giftyToken,
		nft,
		router,
		weth9,
		...params
	} = await loadFixture(GiftyFixture);

	await maxApprove(testToken, router.address);

	await createPool(owner, weth9.address, testToken.address, nft);

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
		owner,
		gifty,
		receiver,
		piggyBox,
		testToken,
		amount,
		tokensToBeSwapped,
		earnedCommissions,
		router,
		nft,
		weth9,
		giftyToken,
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

	it("ETH and token should be splitted", async function () {
		const { piggyBox, tokensToBeSwapped, owner, weth9, testToken } =
			await loadFixture(splitEarnedCommissionFixture);

		const ethBalanceBefore: BigNumber = await ethers.provider.getBalance(
			piggyBox.address
		);

		const testTokenBalanceBefore: BigNumber = await testToken.balanceOf(
			piggyBox.address
		);

		const splitTx = await piggyBox.splitEarnedCommission(
			tokensToBeSwapped,
			owner.address
		);

		await expect(splitTx).to.changeEtherBalance(
			piggyBox.address,
			"-" + ethBalanceBefore
		);

		await expect(splitTx).to.changeTokenBalance(
			testToken,
			piggyBox.address,
			"-" + testTokenBalanceBefore
		);
	});

	it("If token eq to ETH => deposit ETH to WETH", async function () {
		const { piggyBox, tokensToBeSwapped, owner, weth9 } =
			await loadFixture(splitEarnedCommissionFixture);

		const ethBalanceBefore: BigNumber = await ethers.provider.getBalance(
			piggyBox.address
		);

		const splitTx = await piggyBox.splitEarnedCommission(
			[tokensToBeSwapped[0]],
			owner.address
		);

		// ETH amount equivalent to WETh
		await expect(splitTx).to.changeEtherBalance(
			piggyBox.address,
			"-" + ethBalanceBefore
		);

		await expect(splitTx)
			.to.emit(weth9, "Deposit")
			.withArgs(piggyBox.address, ethBalanceBefore);
	});

	it("If token balance eq 0 -> must be reverted (WETH)", async function () {
		const { piggyBox, tokensToBeSwapped, owner, weth9 } =
			await loadFixture(splitEarnedCommissionFixture);

		// Reset balance
		await piggyBox.splitEarnedCommission(
			[tokensToBeSwapped[0]],
			owner.address
		);

		await expect(
			piggyBox.splitEarnedCommission(
				[tokensToBeSwapped[0]],
				owner.address
			)
		)
			.to.be.revertedWithCustomError(
				piggyBox,
				"PiggyBox__tokenBalanceIsZero"
			)
			// Since eth address replaced with weth
			.withArgs(weth9.address);
	});

	it("If token balance eq 0 -> must be reverted (Token)", async function () {
		const { piggyBox, owner, giftyToken } = await loadFixture(
			splitEarnedCommissionFixture
		);

		await expect(
			piggyBox.splitEarnedCommission([giftyToken.address], owner.address)
		)
			.to.be.revertedWithCustomError(
				piggyBox,
				"PiggyBox__tokenBalanceIsZero"
			)
			// Since eth address replaced with weth
			.withArgs(giftyToken.address);
	});

	it("if middle token -> singleTransfer", async function () {
		const { piggyBox, owner, tokensToBeSwapped, giftyToken } =
			await loadFixture(splitEarnedCommissionFixture);

		const splitTx = await piggyBox.splitEarnedCommission(
			[tokensToBeSwapped[0]],
			owner.address
		);

		await expect(splitTx).to.changeTokenBalance(
			giftyToken,
			piggyBox.address,
			"2976015022589517399"
		);
	});

	it("if not middle token -> multiTransfer", async function () {
		const { piggyBox, owner, tokensToBeSwapped, giftyToken } =
			await loadFixture(splitEarnedCommissionFixture);

		const splitTx = await piggyBox.splitEarnedCommission(
			[tokensToBeSwapped[1]],
			owner.address
		);

		await expect(splitTx).to.changeTokenBalance(
			giftyToken,
			piggyBox.address,
			"2952631946425699812"
		);
	});

	it("If value less than minValue -> revert", async function () {
		const { piggyBox, owner, tokensToBeSwapped, testToken } =
			await loadFixture(splitEarnedCommissionFixture);

		// Calculate and change value in mapping {_balances} (0 slot)
		const concatedKeyAndSlot = ethers.utils.defaultAbiCoder.encode(
			["address", "uint256"],
			[piggyBox.address, 0]
		);

		const index = ethers.utils.solidityKeccak256(
			["bytes"],
			[concatedKeyAndSlot]
		);

		const lowValue = ethers.utils.hexZeroPad(
			ethers.utils.hexlify(1000),
			32
		);

		await setStorageAt(testToken.address, index, lowValue);

		await expect(
			piggyBox.splitEarnedCommission(
				[tokensToBeSwapped[1]],
				owner.address
			)
		)
			.to.be.revertedWithCustomError(piggyBox, "PiggyBox__toLowAmount")
			.withArgs(993, 10000);
	});

	it("If totalPercantage to operation eq 0 full amount should be transfered to leftoverTo", async function () {
		const {
			receiver,
			piggyBox,
			tokensToBeSwapped,
			giftyToken,
			testToken,
		} = await loadFixture(splitEarnedCommissionFixture);

		// Set all settings to 0
		await piggyBox.changeSplitSettings({
			...spllitCommissionSettings,
			mintPercentage: 0,
		});

		const splitTx = await piggyBox.splitEarnedCommission(
			[tokensToBeSwapped[1]],
			receiver.address
		);

		const splitReceipt = await splitTx.wait(1);

		const piggySplitEvent = splitReceipt.events?.find(
			(event) =>
				event.address == giftyToken.address &&
				event.topics[2] ==
					ethers.utils.hexZeroPad(piggyBox.address, 32).toLowerCase()
		);

		let amount: BigNumber;

		if (piggySplitEvent == undefined) {
			throw new Error("Split event not founded!");
		} else {
			amount = BigNumber.from(piggySplitEvent?.data);
		}

		const piggyBalanceAfter: BigNumber = await testToken.balanceOf(
			piggyBox.address
		);

		const receiverBalanceAfter: BigNumber = await giftyToken.balanceOf(
			receiver.address
		);

		// Full amount were transfered
		expect(piggyBalanceAfter).eq(0);

		// Balance increased to received amount
		expect(receiverBalanceAfter).eq(amount);
	});

	it("When burn percantage is not 0 -> amount must be burned", async function () {
		const { receiver, piggyBox, tokensToBeSwapped, giftyToken } =
			await loadFixture(splitEarnedCommissionFixture);

		// Set all settings to 0
		await piggyBox.changeSplitSettings({
			...spllitCommissionSettings,
			burnPercentage: 5000,
			mintPercentage: 0,
		});

		const splitTx = await piggyBox.splitEarnedCommission(
			[tokensToBeSwapped[1]],
			receiver.address
		);

		const splitReceipt = await splitTx.wait(1);

		const gftTransfer = splitReceipt.events?.find(
			(event) =>
				event.address == giftyToken.address &&
				event.topics[2] ==
					ethers.utils.hexZeroPad(piggyBox.address, 32).toLowerCase()
		);

		const gftBurn = splitReceipt.events?.find(
			(event) =>
				event.address == giftyToken.address &&
				event.topics[2] ==
					ethers.utils.hexZeroPad(ZeroAddress, 32).toLowerCase()
		);

		let amountReceived: BigNumber = BigNumber.from(gftTransfer?.data);
		let amountBurned: BigNumber = BigNumber.from(gftBurn?.data);

		expect(amountBurned).eq(amountReceived.div(2));
	});

	it("When burn percantage is not 0 -> leftovers should be transfered", async function () {
		const { receiver, piggyBox, tokensToBeSwapped, giftyToken } =
			await loadFixture(splitEarnedCommissionFixture);

		// Set all settings to 0
		await piggyBox.changeSplitSettings({
			...spllitCommissionSettings,
			burnPercentage: 5000,
			mintPercentage: 0,
		});

		const splitTx = await piggyBox.splitEarnedCommission(
			[tokensToBeSwapped[1]],
			receiver.address
		);

		const splitReceipt = await splitTx.wait(1);

		const gftTransfer = splitReceipt.events?.find(
			(event) =>
				event.address == giftyToken.address &&
				event.topics[2] ==
					ethers.utils.hexZeroPad(piggyBox.address, 32).toLowerCase()
		);

		let amount: BigNumber = BigNumber.from(gftTransfer?.data);

		const receiverBalance: BigNumber = await giftyToken.balanceOf(
			receiver.address
		);
		expect(receiverBalance).eq(amount.div(2));
	});
});
