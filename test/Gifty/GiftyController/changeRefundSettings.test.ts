import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";

describe("changeRefundSettings", function () {
	const expectedValue: number = 100;

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

		const { freeRefundGiftThreshold } = await gifty.getRefundSettings();

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
