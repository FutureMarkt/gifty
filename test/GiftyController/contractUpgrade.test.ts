import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import {
	NewGiftyVersionMock,
	NewGiftyVersionMock__factory,
} from "../../typechain-types";

import { GiftyFixture } from "../fixtures/GiftyFixture";

import { BigNumber } from "ethers";
import { upgrades } from "hardhat";

describe("GiftyController | Upgrade", function () {
	it("Caller not the owner should be reverted", async function () {
		const { owner, gifty, signers } = await loadFixture(GiftyFixture);

		const giftyV2: NewGiftyVersionMock =
			await new NewGiftyVersionMock__factory(owner).deploy();

		await expect(
			gifty.connect(signers[0]).upgradeTo(giftyV2.address)
		).to.be.revertedWith("Ownable: caller is not the owner");
	});

	it("Contract upgraded", async function () {
		const { owner, gifty } = await loadFixture(GiftyFixture);

		const newVersionFactory: NewGiftyVersionMock__factory =
			new NewGiftyVersionMock__factory(owner);

		const upgradedContract: NewGiftyVersionMock =
			(await upgrades.upgradeProxy(gifty.address, newVersionFactory, {
				kind: "uups",
			})) as NewGiftyVersionMock;

		const version: BigNumber = await upgradedContract.version();

		expect(version).eq(2);
	});
});
