import { GiftyFixture } from "../fixtures/GiftyFixture";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { expect } from "chai";
import { ZeroAddress } from "../TestHelper";

describe("GiftyToken | Getters", function () {
	it("Get Gifty address", async function () {
		const { giftyToken } = await loadFixture(GiftyFixture);

		const giftyAddress: string = await giftyToken.getPiggyBox();

		/**
		 * Due to the fact that the address of the Gifty contract is not initialized during deployment,
		 * initially it will be equal to the zero address
		 */
		expect(giftyAddress).eq(ZeroAddress);
	});
});
