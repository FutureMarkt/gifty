import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { commissionSettings, FullComissionRate } from "../TestHelper";

describe("Gifty | changeFullCommissions", function () {
	it("Caller not the owner should be reverted", async function () {
		const { gifty, signers } = await loadFixture(GiftyFixture);

		await expect(
			gifty
				.connect(signers[0])
				.changeFullComission(commissionSettings.commissions.full)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("Every lvl of commission changed correctly", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		const newFullCommissionSettings: FullComissionRate = {
			l1: 500,
			l2: 1000,
			l3: 1500,
			l4: 2000,
		};

		await gifty.changeFullComission(newFullCommissionSettings);

		const {
			commissions: { full },
		} = await gifty.getCommissionSettings();

		expect(full.l1).eq(newFullCommissionSettings.l1);
		expect(full.l2).eq(newFullCommissionSettings.l2);
		expect(full.l3).eq(newFullCommissionSettings.l3);
		expect(full.l4).eq(newFullCommissionSettings.l4);
	});

	it("FullCommissionsChanged emited when changeFullComission executed", async function () {
		const { gifty } = await loadFixture(GiftyFixture);
		await expect(
			gifty.changeFullComission(commissionSettings.commissions.full)
		)
			.to.emit(gifty, "FullCommissionsChanged")
			.withArgs(
				commissionSettings.commissions.full.l1,
				commissionSettings.commissions.full.l2,
				commissionSettings.commissions.full.l3,
				commissionSettings.commissions.full.l4
			);
	});
});
