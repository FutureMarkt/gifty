import { expect } from "chai";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { ZeroAddress } from "../TestHelper";
import { ethers } from "hardhat";

import { signHardhat } from "../../scripts/EIP-712/signTypedData";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

interface ISignature {
	v: number;
	r: string;
	s: string;
}

async function signDataAndGetSplittedSig(
	signer: SignerWithAddress,
	verifyingContract: string,
	receiver: string,
	giftId?: number
): Promise<ISignature> {
	const signature: string = await signHardhat(signer, verifyingContract, {
		receiver: receiver,
		giftId: giftId ?? 0,
	});

	return ethers.utils.splitSignature(signature);
}

const giftAmount: BigNumber = ethers.utils.parseEther("1000");

describe.only("Gifty | claimGiftWithPermit", function () {
	it("Gift already has receiver - revert", async function () {
		const { gifty, owner, receiver, signers, giftyToken } =
			await loadFixture(GiftyFixture);

		await gifty.giftTokenWithGFTCommission(
			receiver.address,
			giftyToken.address,
			giftAmount
		);

		const { v, r, s } = await signDataAndGetSplittedSig(
			owner,
			gifty.address,
			receiver.address
		);

		await expect(
			gifty.connect(signers[0]).claimGiftWithPermit(0, v, r, s)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_25");
	});

	it("Signed receiver is not equal to caller", async function () {
		const { gifty, owner, receiver, signers, giftyToken } =
			await loadFixture(GiftyFixture);

		await gifty.giftTokenWithGFTCommission(
			ZeroAddress,
			giftyToken.address,
			giftAmount
		);

		const { v, r, s } = await signDataAndGetSplittedSig(
			owner,
			gifty.address,
			receiver.address
		);

		await expect(
			gifty.connect(signers[0]).claimGiftWithPermit(0, v, r, s)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_26");
	});

	it("Signed and given giftId are deferrent", async function () {
		const { gifty, owner, receiver, signers, giftyToken } =
			await loadFixture(GiftyFixture);

		await gifty.giftTokenWithGFTCommission(
			ZeroAddress,
			giftyToken.address,
			giftAmount
		);

		await gifty.giftTokenWithGFTCommission(
			ZeroAddress,
			giftyToken.address,
			giftAmount
		);

		const { v, r, s } = await signDataAndGetSplittedSig(
			owner,
			gifty.address,
			receiver.address,
			1
		);

		await expect(
			gifty.connect(receiver).claimGiftWithPermit(0, v, r, s)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_26");
	});

	it("Gift receiver are changed", async function () {
		const { gifty, owner, receiver, giftyToken } = await loadFixture(
			GiftyFixture
		);

		await gifty.giftTokenWithGFTCommission(
			ZeroAddress,
			giftyToken.address,
			giftAmount
		);

		const { v, r, s } = await signDataAndGetSplittedSig(
			owner,
			gifty.address,
			receiver.address
		);

		await gifty.connect(receiver).claimGiftWithPermit(0, v, r, s);

		const { receiver: giftReceiver } = await gifty.getExactGift(0);

		expect(giftReceiver).eq(receiver.address);
	});

	it("Gift claimed", async function () {
		const { gifty, owner, receiver, giftyToken } = await loadFixture(
			GiftyFixture
		);

		await gifty.giftTokenWithGFTCommission(
			ZeroAddress,
			giftyToken.address,
			giftAmount
		);

		const { v, r, s } = await signDataAndGetSplittedSig(
			owner,
			gifty.address,
			receiver.address
		);

		await expect(
			gifty.connect(receiver).claimGiftWithPermit(0, v, r, s)
		).to.changeTokenBalance(giftyToken, receiver.address, giftAmount);
	});

	it("Gift already claimed - revert", async function () {
		const { gifty, owner, receiver, giftyToken } = await loadFixture(
			GiftyFixture
		);

		await gifty.giftTokenWithGFTCommission(
			ZeroAddress,
			giftyToken.address,
			giftAmount
		);

		const { v, r, s } = await signDataAndGetSplittedSig(
			owner,
			gifty.address,
			receiver.address
		);

		await gifty.connect(receiver).claimGiftWithPermit(0, v, r, s);

		await expect(
			gifty.connect(receiver).claimGift(0)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_13");
	});

	it("Gift already refunded - revert", async function () {
		const { gifty, owner, receiver, giftyToken } = await loadFixture(
			GiftyFixture
		);

		await gifty.giftTokenWithGFTCommission(
			ZeroAddress,
			giftyToken.address,
			giftAmount
		);

		const { v, r, s } = await signDataAndGetSplittedSig(
			owner,
			gifty.address,
			receiver.address
		);

		await gifty.refundGift(0);

		await expect(
			gifty.connect(receiver).claimGiftWithPermit(0, v, r, s)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_14");
	});

	it("Signature from another signer - revert", async function () {
		const { gifty, signers, receiver, giftyToken } = await loadFixture(
			GiftyFixture
		);

		await gifty.giftTokenWithGFTCommission(
			ZeroAddress,
			giftyToken.address,
			giftAmount
		);

		const { v, r, s } = await signDataAndGetSplittedSig(
			signers[0],
			gifty.address,
			receiver.address
		);

		await expect(
			gifty.connect(receiver).claimGiftWithPermit(0, v, r, s)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_26");
	});

	it("Gift does not exist - revert", async function () {
		const { gifty, signers, receiver, giftyToken } = await loadFixture(
			GiftyFixture
		);

		const { v, r, s } = await signDataAndGetSplittedSig(
			signers[0],
			gifty.address,
			receiver.address
		);

		await expect(
			gifty.connect(receiver).claimGiftWithPermit(0, v, r, s)
		).to.be.revertedWithPanic("0x32");
	});
});
