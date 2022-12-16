import { expect } from "chai";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { ZeroAddress } from "../TestHelper";
import { ethers } from "hardhat";

import { signHardhat } from "../../scripts/EIP-712/signTypedData";

const giftAmount: BigNumber = ethers.utils.parseEther("1000");

describe.only("Gifty | claimGiftWithPermit", function () {
	it("Test", async function () {
		const { gifty, owner, receiver, giftyToken } = await loadFixture(
			GiftyFixture
		);

		await gifty.giftTokenWithGFTCommission(
			ZeroAddress,
			giftyToken.address,
			giftAmount
		);

		const sig: string = await signHardhat(owner, gifty.address, {
			receiver: receiver.address,
			giftId: 0,
		});

		const { v, r, s } = ethers.utils.splitSignature(sig);

		await expect(
			gifty.connect(receiver).claimGiftWithPermit(0, v, r, s)
		).to.changeTokenBalance(giftyToken, receiver.address, giftAmount);
	});
});
