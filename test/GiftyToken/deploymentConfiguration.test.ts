// Fixtures
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

// Ethers

import { ethers } from "hardhat";
import { BigNumber } from "ethers";

// Functions
import { expect } from "chai";

// Deploy
import { giftyTokenFixture } from "../fixtures/GiftyFixture";

describe("GiftyToken | Deployment configuration", function () {
	it("Owner setted correctly", async function () {
		const { owner, giftyToken } = await loadFixture(GiftyFixture);

		const contractOwner: string = await giftyToken.owner();
		expect(contractOwner).eq(owner.address);
	});

	it("Token name is correct", async function () {
		const { giftyToken } = await loadFixture(GiftyFixture);

		const giftyTokenName: string = "GiftyToken";
		const giftyNameInContract: string = await giftyToken.name();

		expect(giftyNameInContract).eq(giftyTokenName);
	});

	it("Token symbol is correct", async function () {
		const { giftyToken } = await loadFixture(GiftyFixture);

		const giftyTokenSymbol: string = "GFT";
		const giftySymbolInContract: string = await giftyToken.symbol();

		expect(giftySymbolInContract).eq(giftyTokenSymbol);
	});

	it("InitialSupply received correctly", async function () {
		const { owner, receiver, giftyToken } = await loadFixture(
			GiftyFixture
		);

		const initialAmount: BigNumber = ethers.utils.parseEther("1000000");

		const newGiftyToken = await giftyTokenFixture(
			owner,
			receiver.address,
			initialAmount
		);

		const receiverBalance: BigNumber = await newGiftyToken.balanceOf(
			receiver.address
		);

		expect(receiverBalance).eq(initialAmount);
	});
});
