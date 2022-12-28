import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { spllitCommissionSettings } from "../TestHelper";
import { FeeAmount } from "../fixtures/createPool";

describe("PiggyBox | InitializeSettings", function () {
	it("Owner setted correctly", async function () {
		const { piggyBox, owner } = await loadFixture(GiftyFixture);

		const ownerFromContract: string = await piggyBox.owner();
		expect(ownerFromContract).eq(owner.address);
	});

	it("Initialize must be called once", async function () {
		const { piggyBox, owner } = await loadFixture(GiftyFixture);

		await expect(piggyBox.initialize()).to.be.revertedWith(
			"Initializable: contract is already initialized"
		);
	});

	it("Gifty setted correctly", async function () {
		const { piggyBox, gifty } = await loadFixture(GiftyFixture);

		const giftyFromContract: string = await piggyBox.getGifty();
		expect(giftyFromContract).eq(gifty.address);
	});

	it("GiftyToken setted correctly", async function () {
		const { piggyBox, giftyToken } = await loadFixture(GiftyFixture);

		const giftyTokenFromContract: string = await piggyBox.getGiftyToken();
		expect(giftyTokenFromContract).eq(giftyToken.address);
	});

	it("SplitSettings setted correctly", async function () {
		const { piggyBox } = await loadFixture(GiftyFixture);

		const { mintPercentage, burnPercentage, decimals } =
			await piggyBox.getSplitSettings();

		expect(mintPercentage).eq(spllitCommissionSettings.mintPercentage);
		expect(burnPercentage).eq(spllitCommissionSettings.burnPercentage);
		expect(decimals).eq(spllitCommissionSettings.decimals);
	});

	it("SwapSettings setted correctly", async function () {
		const { piggyBox, router, weth9 } = await loadFixture(GiftyFixture);

		const {
			router: routerFromContract,
			middleToken,
			swapFeeToMiddleToken,
			swapFeeToGFT,
		} = await piggyBox.getSwapSettings();

		expect(router.address).eq(routerFromContract);
		expect(middleToken).eq(weth9.address);
		expect(swapFeeToMiddleToken).eq(FeeAmount.MEDIUM);
		expect(swapFeeToGFT).eq(FeeAmount.MEDIUM);
	});
});
