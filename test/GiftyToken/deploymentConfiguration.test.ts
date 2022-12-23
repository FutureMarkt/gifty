// Fixtures
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

// Types || classes
import { BigNumber } from "ethers";

// Functions
import { expect } from "chai";

// Data
import { initialSupplyReceiver, initialSupply } from "../../dataHelper";

describe("GiftyToken | Check deployment configuration", function () {
	it("Owner setted correctly", async function () {
		const { signers, giftyToken } = await loadFixture(GiftyFixture);

		const ownerAddress: string = signers[0].address;
		const contractOwner: string = await giftyToken.owner();

		expect(contractOwner).eq(ownerAddress);
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
		const { giftyToken } = await loadFixture(GiftyFixture);

		const receiverBalance: BigNumber = await giftyToken.balanceOf(
			initialSupplyReceiver
		);

		expect(receiverBalance).eq(initialSupply);
	});
});
