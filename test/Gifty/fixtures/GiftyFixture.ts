import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { initialSupplyReceiver, initialSupply } from "../../../dataHelper";

import {
	Gifty,
	GiftyToken,
	Gifty__factory,
	GiftyToken__factory,
} from "../../../typechain-types";

export async function GiftyFixture() {
	const signers: SignerWithAddress[] = await ethers.getSigners();
	const [owner]: SignerWithAddress[] = signers;

	const gifty: Gifty = await new Gifty__factory(owner).deploy();

	const giftyToken: GiftyToken = await new GiftyToken__factory(
		signers[0]
	).deploy(initialSupplyReceiver, initialSupply);

	return { signers, owner, gifty, giftyToken };
}
