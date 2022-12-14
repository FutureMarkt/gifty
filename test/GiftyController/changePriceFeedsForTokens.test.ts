import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { NonZeroAddress, ZeroAddress } from "../TestHelper";

describe("GiftyController | changePriceFeedsForTokens", function () {
	let sampleToken: string;

	it("Caller not the owner should be reverted", async function () {
		const { gifty, signers, giftyToken } = await loadFixture(GiftyFixture);

		sampleToken = giftyToken.address;

		await expect(
			gifty
				.connect(signers[2])
				.changePriceFeedsForTokens([sampleToken], [NonZeroAddress])
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("If arrays has defferent length - revert", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changePriceFeedsForTokens(
				[sampleToken],
				[NonZeroAddress, NonZeroAddress]
			)
		)
			.to.be.revertedWithCustomError(
				gifty,
				"Gifty__theLengthsDoNotMatch"
			)
			.withArgs(1, 2);
	});

	it("One of the token addresses is zero address - revert", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changePriceFeedsForTokens(
				[sampleToken, ZeroAddress],
				[NonZeroAddress, NonZeroAddress]
			)
		).to.be.revertedWithCustomError(gifty, "Gifty__zeroParam");
	});

	it("One of the aggregator addresses is zero address - revert", async function () {
		const { gifty, piggyBox } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changePriceFeedsForTokens(
				[sampleToken, piggyBox.address],
				[NonZeroAddress, ZeroAddress]
			)
		).to.be.revertedWithCustomError(gifty, "Gifty__zeroParam");
	});

	it("Price feed correctly changed", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await gifty.changePriceFeedsForTokens([sampleToken], [NonZeroAddress]);

		const priceFeedForToken: string = await gifty.getPriceFeedForToken(
			sampleToken
		);
		expect(priceFeedForToken).eq(NonZeroAddress);
	});

	it("To emit PriceFeedChanged", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		await expect(
			gifty.changePriceFeedsForTokens([sampleToken], [NonZeroAddress])
		)
			.to.emit(gifty, "PriceFeedChanged")
			.withArgs(sampleToken, NonZeroAddress);
	});
});
