import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "./fixtures/GiftyFixture";
import { ZeroAddress } from "../TestHelper";
import { BigNumber } from "ethers";
import { Gifty__factory } from "../../typechain-types";

describe("Gifty | controller", function () {
	const expectedValue: number = 100;

	it("When contract constructed and giftyToken address eq 0 revert", async function () {
		const { owner } = await loadFixture(GiftyFixture);

		// Deploy gifty main contract
		await expect(
			new Gifty__factory(owner).deploy(
				ZeroAddress,
				ZeroAddress,
				0,
				0,
				0,
				0,
				[],
				[],
				ZeroAddress
			)
		).to.be.reverted;
	});

	describe("changeRefundSettings", function () {
		it("Not owner", async function () {
			const { gifty, signers } = await loadFixture(GiftyFixture);

			await expect(
				gifty.connect(signers[2]).changeRefundSettings(0, 0, 0)
			).to.be.revertedWith("Ownable: caller is not the owner");
		});

		it("One of the params eq to 0 (1)", async function () {
			const { gifty } = await loadFixture(GiftyFixture);

			await expect(
				gifty.changeRefundSettings(0, expectedValue, expectedValue)
			).to.be.revertedWithCustomError(gifty, "Gifty__error_8");
		});

		it("One of the params eq to 0 (2)", async function () {
			const { gifty } = await loadFixture(GiftyFixture);

			await expect(
				gifty.changeRefundSettings(expectedValue, 0, expectedValue)
			).to.be.revertedWithCustomError(gifty, "Gifty__error_8");
		});

		it("One of the params eq to 0 (3)", async function () {
			const { gifty } = await loadFixture(GiftyFixture);

			await expect(
				gifty.changeRefundSettings(expectedValue, expectedValue, 0)
			).to.be.revertedWithCustomError(gifty, "Gifty__error_8");
		});

		it("RefundGiftWithCommissionThreshold setted", async function () {
			const { gifty } = await loadFixture(GiftyFixture);

			await gifty.changeRefundSettings(expectedValue, 1, 1);

			const { refundGiftWithCommissionThreshold } =
				await gifty.getRefundSettings();

			expect(refundGiftWithCommissionThreshold).eq(expectedValue);
		});

		it("FreeRefundGiftThreshold setted", async function () {
			const { gifty } = await loadFixture(GiftyFixture);

			await gifty.changeRefundSettings(1, expectedValue, 1);

			const { freeRefundGiftThreshold } =
				await gifty.getRefundSettings();

			expect(freeRefundGiftThreshold).eq(expectedValue);
		});

		it("GiftRefundCommission setted", async function () {
			const { gifty } = await loadFixture(GiftyFixture);

			await gifty.changeRefundSettings(1, 1, expectedValue);

			const { giftRefundCommission } = await gifty.getRefundSettings();

			expect(giftRefundCommission).eq(expectedValue);
		});

		it("To emit RefundSettingsChanged", async function () {
			const { gifty } = await loadFixture(GiftyFixture);

			await expect(
				gifty.changeRefundSettings(
					expectedValue,
					expectedValue,
					expectedValue
				)
			)
				.to.emit(gifty, "RefundSettingsChanged")
				.withArgs(expectedValue, expectedValue, expectedValue);
		});
	});

	describe("changeMinimalGiftPrice", function () {
		it("Not owner", async function () {
			const { gifty, signers } = await loadFixture(GiftyFixture);

			await expect(
				gifty.connect(signers[2]).changeMinimalGiftPrice(expectedValue)
			).to.be.revertedWith("Ownable: caller is not the owner");
		});

		it("If new min price is zero - revert", async function () {
			const { gifty } = await loadFixture(GiftyFixture);

			await expect(
				gifty.changeMinimalGiftPrice(0)
			).to.be.revertedWithCustomError(gifty, "Gifty__error_8");
		});

		it("New price setted", async function () {
			const { gifty } = await loadFixture(GiftyFixture);

			await gifty.changeMinimalGiftPrice(expectedValue);
			const minGiftPrice: BigNumber = await gifty.getMinGiftPrice();

			expect(minGiftPrice).eq(expectedValue);
		});

		it("To emit MinimumGiftPriceChanged", async function () {
			const { gifty } = await loadFixture(GiftyFixture);

			await expect(gifty.changeMinimalGiftPrice(expectedValue))
				.to.emit(gifty, "MinimumGiftPriceChanged")
				.withArgs(expectedValue);
		});
	});

	describe("changePiggyBox", function () {
		it("Not owner", async function () {
			const { gifty, signers } = await loadFixture(GiftyFixture);

			await expect(
				gifty.connect(signers[2]).changePiggyBox(ZeroAddress)
			).to.be.revertedWith("Ownable: caller is not the owner");
		});

		it("If new piggyBox is zero address - revert", async function () {
			const { gifty } = await loadFixture(GiftyFixture);

			await expect(
				gifty.changePiggyBox(ZeroAddress)
			).to.be.revertedWithCustomError(gifty, "Gifty__error_8");
		});

		it("PiggyBox changed setted", async function () {
			const { gifty, ethMockAggregator } = await loadFixture(
				GiftyFixture
			);

			const examplePiggyBox = ethMockAggregator.address;

			await gifty.changePiggyBox(examplePiggyBox);

			const piggyBox = await gifty.getPiggyBox();

			expect(piggyBox).eq(examplePiggyBox);
		});

		it("To emit PiggyBoxChanged", async function () {
			const { gifty, ethMockAggregator } = await loadFixture(
				GiftyFixture
			);

			const examplePiggyBox = ethMockAggregator.address;

			await expect(gifty.changePiggyBox(examplePiggyBox))
				.to.emit(gifty, "PiggyBoxChanged")
				.withArgs(examplePiggyBox);
		});
	});
});
