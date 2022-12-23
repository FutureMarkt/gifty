import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { SwapSettings, ZeroAddress } from "../TestHelper";
import { FeeAmount } from "../fixtures/createPool";

describe("PiggyBox | changeSwapSettings", function () {
	let swapSettingsExample: SwapSettings;

	before(async function () {
		const { router, weth9, testToken } = await loadFixture(GiftyFixture);

		swapSettingsExample = {
			router: router.address,
			weth9: weth9.address,
			middleToken: testToken.address,
			swapFeeToMiddleToken: FeeAmount.MEDIUM,
			swapFeeToGFT: FeeAmount.MEDIUM,
		};
	});

	it("Caller not the owner should be reverted", async function () {
		const { piggyBox, signers } = await loadFixture(GiftyFixture);

		await expect(
			piggyBox
				.connect(signers[0])
				.changeSwapSettings(swapSettingsExample)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("If router address is zero - revert", async function () {
		const { piggyBox } = await loadFixture(GiftyFixture);

		const settingsWithRouterZero: SwapSettings = {
			...swapSettingsExample,
			router: ZeroAddress,
		};

		await expect(
			piggyBox.changeSwapSettings(settingsWithRouterZero)
		).to.be.revertedWithCustomError(
			piggyBox,
			"PiggyBox__oneOfTheAddressIsZero"
		);
	});

	it("If weth9 address is zero - revert", async function () {
		const { piggyBox } = await loadFixture(GiftyFixture);

		const settingsWithRouterZero: SwapSettings = {
			...swapSettingsExample,
			weth9: ZeroAddress,
		};

		await expect(
			piggyBox.changeSwapSettings(settingsWithRouterZero)
		).to.be.revertedWithCustomError(
			piggyBox,
			"PiggyBox__oneOfTheAddressIsZero"
		);
	});

	it("If swapFeeToMiddleToken isn't correct - revert", async function () {
		const { piggyBox } = await loadFixture(GiftyFixture);

		const settingsWithRouterZero: SwapSettings = {
			...swapSettingsExample,
			swapFeeToMiddleToken: 0,
		};

		await expect(
			piggyBox.changeSwapSettings(settingsWithRouterZero)
		).to.be.revertedWithCustomError(
			piggyBox,
			"PiggyBox__incorrectUniswapFee"
		);
	});

	it("If swapFeeToGFT isn't correct - revert", async function () {
		const { piggyBox } = await loadFixture(GiftyFixture);

		const settingsWithRouterZero: SwapSettings = {
			...swapSettingsExample,
			swapFeeToGFT: 0,
		};

		await expect(
			piggyBox.changeSwapSettings(settingsWithRouterZero)
		).to.be.revertedWithCustomError(
			piggyBox,
			"PiggyBox__incorrectUniswapFee"
		);
	});

	it("All props changed correctly", async function () {
		const { piggyBox } = await loadFixture(GiftyFixture);

		await piggyBox.changeSwapSettings(swapSettingsExample);

		const {
			router,
			weth9,
			middleToken,
			swapFeeToMiddleToken,
			swapFeeToGFT,
		} = await piggyBox.getSwapSettings();

		expect(router).eq(swapSettingsExample.router);
		expect(weth9).eq(swapSettingsExample.weth9);
		expect(middleToken).eq(swapSettingsExample.middleToken);
		expect(swapFeeToMiddleToken).eq(
			swapSettingsExample.swapFeeToMiddleToken
		);
		expect(swapFeeToGFT).eq(swapSettingsExample.swapFeeToGFT);
	});

	it("SwapSettingsChanged should be emmited after setting value", async function () {
		const { piggyBox } = await loadFixture(GiftyFixture);

		await expect(piggyBox.changeSwapSettings(swapSettingsExample))
			.to.emit(piggyBox, "SwapSettingsChanged")
			.withArgs(
				swapSettingsExample.router,
				swapSettingsExample.weth9,
				swapSettingsExample.middleToken,
				swapSettingsExample.swapFeeToMiddleToken,
				swapSettingsExample.swapFeeToGFT
			);
	});
});
