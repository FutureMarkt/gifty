import { expect } from "chai";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("GiftyToken | Getters", function () {
	it("Get PiggyBox", async function () {
		const { giftyToken, piggyBox } = await loadFixture(GiftyFixture);

		const giftyAddress: string = await giftyToken.getPiggyBox();
		expect(giftyAddress).eq(piggyBox.address);
	});
});
