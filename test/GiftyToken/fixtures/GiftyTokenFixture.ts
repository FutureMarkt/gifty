import { ethers } from "hardhat";
import { GiftyToken, GiftyToken__factory } from "../../../typechain-types";
import { initialSupplyReceiver, initialSupply } from "../../../dataHelper";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export async function GiftyTokenFixture() {
	// Get all aviable signers
	const signers: SignerWithAddress[] = await ethers.getSigners();

	// Deploy giftyToken contracts and get instance
	const giftyToken: GiftyToken = await new GiftyToken__factory(
		signers[0]
	).deploy(initialSupplyReceiver, initialSupply);

	return { signers, giftyToken };
}
