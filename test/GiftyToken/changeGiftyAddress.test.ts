// Fixtures
import { GiftyTokenFixture } from "./fixtures/GiftyTokenFixture";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

// Types || classes
import { ethers } from "hardhat";

// Functions
import { expect } from "chai";

// Variables for test
const zeroAddress: string = ethers.constants.AddressZero;

describe("GiftyToken | changeGiftyAddress", function () {
	it("Not an owner can't successfully exucute function", async function () {
		const { signers, giftyToken } = await loadFixture(GiftyTokenFixture);

		await expect(
			giftyToken.connect(signers[1]).changeGiftyAddress(zeroAddress)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("Revert if newGiftyAddress is not a contract", async function () {
		const { giftyToken } = await loadFixture(GiftyTokenFixture);

		await expect(
			giftyToken.changeGiftyAddress(zeroAddress)
		).to.be.revertedWithCustomError(
			giftyToken,
			"GiftyToken__ChangingTheGiftyContractAddressToANonContractAddress"
		);
	});

	it("Successfulle chnaged Gifty contract address if all conditions are met", async function () {
		const { giftyToken } = await loadFixture(GiftyTokenFixture);

		// Due to the fact that the Gifty contract has not yet been created,
		// we give the address of the token contract.
		const giftyAddressSamle: string = giftyToken.address;

		await giftyToken.changeGiftyAddress(giftyAddressSamle);

		const newGiftyAddress: string = await giftyToken.getGiftyAddress();

		expect(newGiftyAddress).eq(giftyAddressSamle);
	});

	it("GiftyAddressChanged emmited after address changing", async function () {
		const { giftyToken } = await loadFixture(GiftyTokenFixture);
		const giftyAddressSamle: string = giftyToken.address;

		await expect(giftyToken.changeGiftyAddress(giftyAddressSamle))
			.emit(giftyToken, "GiftyAddressChanged")
			.withArgs(giftyAddressSamle);
	});
});
