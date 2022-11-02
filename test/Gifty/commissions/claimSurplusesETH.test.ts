import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";

import {
	GiverContractCanNotReceiverETH,
	GiverContractCanNotReceiverETH__factory,
} from "../../../typechain-types";
import {
	OneEther,
	EthAddress,
	PercentFromEther,
	getCommissionAmount,
	OneEtherGiftWithCommission,
} from "../../TestHelper";

const giftAmount = OneEther;

describe("Gifty | claimSurplusesETH.test", function () {
	it("Successful withdrawal of the overpaid amount", async function () {
		const { gifty, owner, receiver } = await loadFixture(GiftyFixture);
		const giftWithBigCommission: BigNumber =
			OneEtherGiftWithCommission.add(PercentFromEther);

		await gifty.giftETH(receiver.address, giftAmount, {
			value: giftWithBigCommission,
		});

		await expect(gifty.claimSurplusesETH()).to.changeEtherBalance(
			owner.address,
			PercentFromEther
		);
	});

	it.only("If transfer failed - revert", async function () {
		const { gifty, owner } = await loadFixture(GiftyFixture);

		const middleContract: GiverContractCanNotReceiverETH =
			await new GiverContractCanNotReceiverETH__factory(owner).deploy(
				gifty.address
			);

		const commission: BigNumber = PercentFromEther;

		const giftWithBigCommission: BigNumber =
			OneEtherGiftWithCommission.add(commission);

		await middleContract.giftETH(giftAmount, commission, {
			value: giftWithBigCommission,
		});

		await expect(
			middleContract.claimSurplusesETH()
		).to.be.revertedWithCustomError(
			gifty,
			"ExternalAccountsInteraction__lowLevelTransferIsFailed"
		);
	});
});
