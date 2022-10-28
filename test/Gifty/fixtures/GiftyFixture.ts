import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
	initialSupplyReceiver,
	initialSupply,
	mockAggregatorDecimals,
	mockAggregatorAnswer,
	ethAddress,
} from "../../../dataHelper";

import {
	Gifty,
	GiftyToken,
	PiggyBox,
	PiggyBox__factory,
	Gifty__factory,
	GiftyToken__factory,
	MockV3Aggregator,
	MockV3Aggregator__factory,
} from "../../../typechain-types";

export async function GiftyFixture() {
	// Get signers for tests
	const signers: SignerWithAddress[] = await ethers.getSigners();
	const [owner, receiver]: SignerWithAddress[] = signers;

	// Deploy Aggregator Price Feed mock
	const ethMockAggregator: MockV3Aggregator =
		await new MockV3Aggregator__factory(owner).deploy(
			mockAggregatorDecimals,
			mockAggregatorAnswer
		);

	// Deploy piggyBox
	const piggyBox: PiggyBox = await new PiggyBox__factory(owner).deploy();

	// Deploy gifty token
	const giftyToken: GiftyToken = await new GiftyToken__factory(
		signers[0]
	).deploy(initialSupplyReceiver, initialSupply);

	// Deploy gifty main contract
	const gifty: Gifty = await new Gifty__factory(owner).deploy(
		giftyToken.address,
		piggyBox.address
	);

	// Changing the address of the gifty in the token contract
	await giftyToken.changeGiftyAddress(gifty.address);

	// Add eth to price feed mapping
	await gifty.changePriceFeedForToken(ethAddress, ethMockAggregator.address);

	return { signers, owner, receiver, gifty, giftyToken, ethMockAggregator };
}
