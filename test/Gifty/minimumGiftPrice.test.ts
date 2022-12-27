import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "../fixtures/GiftyFixture";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import {
	OneEther,
	getConvertedPrice,
	getCommissionAmount,
} from "../TestHelper";

describe("Gifty | minimumGiftPrice", function () {
	it("If the gift price is too small - revert", async function () {
		const { gifty, receiver } = await loadFixture(GiftyFixture);

		const smallGift = 100; // WEI
		const smallGiftWithCommission = 101; // WEI

		await expect(
			gifty.giftETH(receiver.address, smallGift, {
				value: smallGiftWithCommission,
			})
		).to.be.revertedWithCustomError(gifty, "Gifty__tooLowGiftPrice");
	});

	it("If gift price is ok - there should be no revert", async function () {
		const { gifty, receiver, ethMockAggregator } = await loadFixture(
			GiftyFixture
		);

		const price = await getConvertedPrice(ethMockAggregator);
		const {
			thresholds: { t1 },
		} = await gifty.getCommissionSettings();

		const minGiftPrice: BigNumber = ethers.utils.parseEther(t1.toString());

		// Multiplication first to get the correct result

		// ex:
		// price = 1500000000000000000000
		// minGiftPrice = 15000000000000000000
		// price.div(minGiftPrice) => error

		// ok ex:
		// price = 1500000000000000000000
		// minGiftPrice = 15000000000000000000
		// price.mul(ETH).div(price) => 10000000000000000 (0.01 ETH)

		const smallGift = minGiftPrice.mul(OneEther).div(price);

		const [rate]: BigNumber[] = await gifty.getCommissionRate(
			minGiftPrice
		);

		const commission: BigNumber = getCommissionAmount(smallGift, rate);
		const smallGiftWithCommission = smallGift.add(commission);

		await expect(
			gifty.giftETH(receiver.address, smallGift, {
				value: smallGiftWithCommission,
			})
		).not.to.be.revertedWithCustomError(
			gifty,
			"Gifty__commissionNotPayed"
		);
	});
});
