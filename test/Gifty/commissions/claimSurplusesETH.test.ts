import { expect } from "chai";
import { BigNumber } from "ethers";

import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";

import {
	GiverContractCanNotReceiverETH,
	GiverContractCanNotReceiverETH__factory,
} from "../../../typechain-types";

import {
	OneEther,
	PercentFromEther,
	OneEtherGiftWithCommission,
	getPriceOfExactETHAmount,
	getCommissionAmount,
} from "../../TestHelper";

import { anyUint } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

const giftAmount = OneEther;

describe("Gifty | claimSurplusesETH", function () {
	it("claimSurplusesETH revert if overpaid amount eq 0", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(gifty.claimSurplusesETH()).to.be.revertedWithCustomError(
			gifty,
			"Gifty__error_7"
		);
	});

	it("Successful withdrawal of the overpaid amount", async function () {
		const { gifty, owner, receiver, ethMockAggregator } =
			await loadFixture(GiftyFixture);

		const giftWithBigCommission: BigNumber =
			OneEtherGiftWithCommission.add(PercentFromEther);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: giftWithBigCommission,
		});

		const giftPriceInUSD: BigNumber = await getPriceOfExactETHAmount(
			ethMockAggregator,
			giftAmount
		);

		const [rate]: BigNumber[] = await gifty.getCommissionRate(
			giftPriceInUSD
		);

		const commissionAmount: BigNumber = getCommissionAmount(
			giftAmount,
			rate
		);

		await expect(gifty.claimSurplusesETH()).to.changeEtherBalance(
			owner.address,
			giftWithBigCommission.sub(commissionAmount).sub(giftAmount)
		);
	});

	it("If transfer failed - revert", async function () {
		const { gifty, owner } = await loadFixture(GiftyFixture);

		const middleContract: GiverContractCanNotReceiverETH =
			await new GiverContractCanNotReceiverETH__factory(owner).deploy(
				gifty.address
			);

		const commission: BigNumber = PercentFromEther;

		const giftWithBigCommission: BigNumber =
			OneEtherGiftWithCommission.add(commission);

		await middleContract.giftETH(giftAmount, {
			value: giftWithBigCommission,
		});

		await expect(middleContract.claimSurplusesETH()).to.be.revertedWith(
			"Address: unable to send value, recipient may have reverted"
		);
	});

	it("s_commissionSurplusesETH decreased for the user", async function () {
		const { gifty, owner, receiver } = await loadFixture(GiftyFixture);
		const giftWithBigCommission: BigNumber =
			OneEtherGiftWithCommission.add(PercentFromEther);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: giftWithBigCommission,
		});

		await gifty.claimSurplusesETH();
		const overpaidAmountAfter = await gifty.getOverpaidETHAmount(
			owner.address
		);

		expect(overpaidAmountAfter).eq(0);
	});

	it("claimSurplusesETH to emit event", async function () {
		const { gifty, owner, receiver } = await loadFixture(GiftyFixture);
		const giftWithBigCommission: BigNumber =
			OneEtherGiftWithCommission.add(PercentFromEther);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: giftWithBigCommission,
		});

		await expect(gifty.claimSurplusesETH())
			.to.emit(gifty, "SurplusesClaimed")
			.withArgs(owner.address, anyUint);
	});

	it("Reentrancy attack to claimSurplusesETH", async function () {
		const { gifty, attacker, receiver } = await loadFixture(GiftyFixture);

		await attacker.giftETH(gifty.address, receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission,
		});

		await attacker.giftETH(gifty.address, receiver.address, giftAmount, {
			value: OneEtherGiftWithCommission.mul(5),
		});

		await expect(
			attacker.attack(gifty.address, 1, 3, { gasLimit: 30000000 })
		).to.be.revertedWith(
			"Address: unable to send value, recipient may have reverted"
		);
	});
});
