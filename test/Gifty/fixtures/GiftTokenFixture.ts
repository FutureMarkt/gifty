import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
	initialSupplyReceiver,
	initialSupply,
	minGiftPriceInUsd,
} from "../../../dataHelper";

import {
	mockAggregatorDecimals,
	mockAggregatorAnswerETH,
	mockAggregatorAnswerToken,
	giftRefundWithCommissionThresholdInBlocks,
	giftRefundWithoutCommissionThresholdInBlocks,
	refundGiftCommission,
} from ".././../TestHelper";

import {
	Gifty,
	GiftyToken,
	PiggyBox,
	PiggyBox__factory,
	Gifty__factory,
	GiftyToken__factory,
	MockV3Aggregator,
	MockV3Aggregator__factory,
	MockToken,
	MockToken__factory,
} from "../../../typechain-types";

export async function GiftTokenFixture() {
	// Get signers for tests
	const signers: SignerWithAddress[] = await ethers.getSigners();
	const [owner, receiver]: SignerWithAddress[] = signers;

	// Deploy Aggregator Price Feed mock
	const ethMockAggregator: MockV3Aggregator =
		await new MockV3Aggregator__factory(owner).deploy(
			mockAggregatorDecimals,
			mockAggregatorAnswerETH
		);

	// Deploy Aggregator Price Feed mock
	const tokenMockAggregator: MockV3Aggregator =
		await new MockV3Aggregator__factory(owner).deploy(
			mockAggregatorDecimals,
			mockAggregatorAnswerToken
		);

	// Deploy piggyBox
	const piggyBox: PiggyBox = await new PiggyBox__factory(owner).deploy();

	// Deploy gifty token
	const giftyToken: GiftyToken = await new GiftyToken__factory(
		signers[0]
	).deploy(initialSupplyReceiver, initialSupply);

	const testToken: MockToken = await new MockToken__factory(owner).deploy();

	const initialTokens: string[] = [testToken.address];
	const initialAggregatorsAddress: string[] = [tokenMockAggregator.address];

	const uniswapFactory: string = "";
	const stablecoin: string = "";
	const fee: number = 3000;

	// Deploy gifty main contract
	const gifty: Gifty = await new Gifty__factory(owner).deploy(
		giftyToken.address,
		piggyBox.address,
		minGiftPriceInUsd,
		giftRefundWithCommissionThresholdInBlocks,
		giftRefundWithoutCommissionThresholdInBlocks,
		refundGiftCommission,
		ethMockAggregator.address,
		uniswapFactory,
		stablecoin,
		fee
	);
	await gifty.addTokens(initialTokens, initialAggregatorsAddress);

	// Changing the address of the gifty in the token contract and piggyBox
	await giftyToken.changeGiftyAddress(gifty.address);
	await piggyBox.changeGifty(gifty.address);

	await testToken.approve(gifty.address, ethers.constants.MaxUint256);

	return {
		signers,
		owner,
		receiver,
		gifty,
		piggyBox,
		giftyToken,
		testToken,
		ethMockAggregator,
		tokenMockAggregator,
	};
}
