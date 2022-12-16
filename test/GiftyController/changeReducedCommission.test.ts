import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { commissionSettings, FullComissionRate } from "../TestHelper";

describe("Gifty | changeReducedCommission", function () {
	it("Caller not the owner should be reverted", async function () {
		const { gifty, signers } = await loadFixture(GiftyFixture);

		await expect(
			gifty
				.connect(signers[0])
				.changeReducedCommission(
					commissionSettings.commissions.reduced
				)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("Every lvl of commission changed correctly", async function () {
		const { gifty } = await loadFixture(GiftyFixture);

		const newReducedCommissionSettings: FullComissionRate = {
			l1: 500,
			l2: 1000,
			l3: 1500,
			l4: 2000,
		};

		await gifty.changeReducedCommission(newReducedCommissionSettings);

		const {
			commissions: { reduced },
		} = await gifty.getCommissionSettings();

		expect(reduced.l1).eq(newReducedCommissionSettings.l1);
		expect(reduced.l2).eq(newReducedCommissionSettings.l2);
		expect(reduced.l3).eq(newReducedCommissionSettings.l3);
		expect(reduced.l4).eq(newReducedCommissionSettings.l4);
	});

	it("ReducedCommissionsChanged emited when changeFullComission executed", async function () {
		const { gifty } = await loadFixture(GiftyFixture);
		await expect(
			gifty.changeReducedCommission(
				commissionSettings.commissions.reduced
			)
		)
			.to.emit(gifty, "ReducedCommissionsChanged")
			.withArgs(
				commissionSettings.commissions.reduced.l1,
				commissionSettings.commissions.reduced.l2,
				commissionSettings.commissions.reduced.l3,
				commissionSettings.commissions.reduced.l4
			);
	});
});
