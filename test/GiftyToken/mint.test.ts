import { GiftyTokenFixture } from "./fixtures/GiftyTokenFixture";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import { expect } from "chai";
import { OneEther } from "../TestHelper";

const amount: BigNumber = OneEther;

// TODO:
// When gifty contract will be created write test, it can mint tokens

describe("GiftyToken | mint", function () {
	it("Not Gifty account can't mint tokens", async function () {
		const { signers, giftyToken } = await loadFixture(GiftyTokenFixture);

		await expect(
			giftyToken.mint(signers[0].address, amount)
		).to.be.revertedWithCustomError(
			giftyToken,
			"GiftyToken__OnlyAGiftyContractCanPerformThisAction"
		);
	});

	//   it("", async function () {
	//     const { giftyToken } = await loadFixture(GiftyTokenFixture);
	//     expect().eq();
	//   });

	//   it("", async function () {
	//     const { giftyToken } = await loadFixture(GiftyTokenFixture);
	//     expect().eq();
	//   });

	//   it("", async function () {
	//     const { giftyToken } = await loadFixture(GiftyTokenFixture);
	//     expect().eq();
	//   });
});
