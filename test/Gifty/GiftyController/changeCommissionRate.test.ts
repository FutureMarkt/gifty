import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";

describe("GiftyController | chnageCommissionRate", function () {
	it("Access only for owner", async function () {
		const { gifty, signers } = await loadFixture(GiftyFixture);

		await expect(
			gifty.connect(signers[0]).changeCommissionRate(10)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});
});
