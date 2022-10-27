import { GiftyTokenFixture } from "./fixtures/GiftyTokenFixture";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { BigNumber } from "ethers";
import { OneEther } from "../TestHelper";

import { expect } from "chai";

const amount: BigNumber = OneEther;

// TODO:
// When gifty contract will be created write test, it can burn tokens

describe("GiftyToken | burn", function () {
	it("Not Gifty account can't burn tokens", async function () {
		const { signers, giftyToken } = await loadFixture(GiftyTokenFixture);

		await expect(
			giftyToken.burn(signers[0].address, amount)
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

	//   it(" received correctly", async function () {
	//     const { giftyToken } = await loadFixture(GiftyTokenFixture);
	//     expect().eq();
	//   });
});
