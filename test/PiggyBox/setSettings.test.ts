import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { SplitCommission, spllitCommissionSettings } from "../TestHelper";
import { FeeAmount } from "../fixtures/createPool";

describe("PiggyBox | setSettings", function () {
	it("Caller not the owner should be reverted", async function () {
		const {
			signers,
			piggyBox,
			gifty,
			giftyToken,
			weth9,
			router,
			testToken,
		} = await loadFixture(GiftyFixture);

		await expect(
			piggyBox
				.connect(signers[0])
				.setSettings(
					gifty.address,
					giftyToken.address,
					spllitCommissionSettings,
					{
						router: router.address,
						weth9: weth9.address,
						middleToken: testToken.address,
						swapFeeToGFT: FeeAmount.MEDIUM,
						swapFeeToMiddleToken: FeeAmount.MEDIUM,
					}
				)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("Should be executed", async function () {
		const { piggyBox, gifty, giftyToken, weth9, router, testToken } =
			await loadFixture(GiftyFixture);

		await expect(
			piggyBox.setSettings(
				gifty.address,
				giftyToken.address,
				spllitCommissionSettings,
				{
					router: router.address,
					weth9: weth9.address,
					middleToken: testToken.address,
					swapFeeToGFT: FeeAmount.MEDIUM,
					swapFeeToMiddleToken: FeeAmount.MEDIUM,
				}
			)
		).not.to.be.reverted;
	});
});
