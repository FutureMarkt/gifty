import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../../fixtures/GiftyFixture";
import { NonZeroAddress } from "../../TestHelper";

describe("Delete token emergency", function () {
	let sampleToken: string;

	it("Not owner", async function () {
		const { gifty, signers, giftyToken } = await loadFixture(GiftyFixture);

		sampleToken = giftyToken.address;
		await gifty.addTokens([sampleToken], [NonZeroAddress]);

		await expect(
			gifty.connect(signers[2]).deleteTokenEmergency(sampleToken)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("Token deleted", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await gifty.addTokens([sampleToken], [NonZeroAddress]);

		await gifty.deleteTokenEmergency(sampleToken);
		const allowedTokens: any[] = await gifty.getAllowedTokens();

		expect(allowedTokens.includes(sampleToken)).false;
	});

	// Since internal _deleteToken tested in deleteTokens.test.ts -> thats all tests
});
