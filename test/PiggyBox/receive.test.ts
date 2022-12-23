import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";

describe("PiggyBox | receive", function () {
	it("PiggyBoxFunded must be emmited", async function () {
		const { piggyBox, signers } = await loadFixture(GiftyFixture);

		const amount: number = 1000;

		await expect(
			signers[0].sendTransaction({ to: piggyBox.address, value: amount })
		)
			.emit(piggyBox, "PiggyBoxFunded")
			.withArgs(signers[0].address, amount);
	});
});
