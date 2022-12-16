import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { GiftRefundSettings } from "../TestHelper";

describe("GiftyController | changeRefundSettings", function () {
	const expectedValue: number = 100;
	const someValue: number = 1;

	let params: GiftRefundSettings = {
		refundGiftWithCommissionThreshold: someValue,
		freeRefundGiftThreshold: someValue,
		giftRefundCommission: someValue,
	};

	beforeEach(() => {
		params = {
			refundGiftWithCommissionThreshold: someValue,
			freeRefundGiftThreshold: someValue,
			giftRefundCommission: someValue,
		};
	});

	it("Caller not the owner should be reverted", async function () {
		const { gifty, signers } = await loadFixture(GiftyFixture);

		await expect(
			gifty.connect(signers[2]).changeRefundSettings(params)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("One of the params eq to 0 (1)", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		params.refundGiftWithCommissionThreshold = 0;

		await expect(
			gifty.changeRefundSettings(params)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_8");
	});

	it("One of the params eq to 0 (2)", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		params.freeRefundGiftThreshold = 0;

		await expect(
			gifty.changeRefundSettings(params)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_8");
	});

	it("One of the params eq to 0 (3)", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		params.giftRefundCommission = 0;

		await expect(
			gifty.changeRefundSettings(params)
		).to.be.revertedWithCustomError(gifty, "Gifty__error_8");
	});

	it("RefundGiftWithCommissionThreshold setted", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		params.refundGiftWithCommissionThreshold = expectedValue;

		await gifty.changeRefundSettings(params);

		const { refundGiftWithCommissionThreshold } =
			await gifty.getRefundSettings();

		expect(refundGiftWithCommissionThreshold).eq(expectedValue);
	});

	it("FreeRefundGiftThreshold setted", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		params.freeRefundGiftThreshold = expectedValue;

		await gifty.changeRefundSettings(params);

		const { freeRefundGiftThreshold } = await gifty.getRefundSettings();

		expect(freeRefundGiftThreshold).eq(expectedValue);
	});

	it("GiftRefundCommission setted", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		params.giftRefundCommission = expectedValue;

		await gifty.changeRefundSettings(params);

		const { giftRefundCommission } = await gifty.getRefundSettings();

		expect(giftRefundCommission).eq(expectedValue);
	});

	it("To emit RefundSettingsChanged", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		params = {
			refundGiftWithCommissionThreshold: expectedValue,
			freeRefundGiftThreshold: expectedValue,
			giftRefundCommission: expectedValue,
		};

		await expect(gifty.changeRefundSettings(params))
			.to.emit(gifty, "RefundSettingsChanged")
			.withArgs(expectedValue, expectedValue, expectedValue);
	});
});
