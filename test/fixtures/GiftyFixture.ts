import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { time } from "@nomicfoundation/hardhat-network-helpers";

import * as dataHelper from "../../dataHelper";
import * as testHelper from "../TestHelper";
import * as typechain from "../../typechain-types";

export async function GiftyFixture() {
	// Get signers for tests
	const [owner, receiver, ...signers]: SignerWithAddress[] =
		await ethers.getSigners();

	// Deploy Aggregator Price Feed mock
	const ethMockAggregator: typechain.MockV3Aggregator =
		await new typechain.MockV3Aggregator__factory(owner).deploy(
			testHelper.mockAggregatorDecimals,
			testHelper.mockAggregatorAnswerETH
		);

	// Deploy Aggregator Price Feed mock
	const tokenMockAggregator: typechain.MockV3Aggregator =
		await new typechain.MockV3Aggregator__factory(owner).deploy(
			testHelper.mockAggregatorDecimals,
			testHelper.mockAggregatorAnswerToken
		);

	const uniswapPoolMock: typechain.UniswapV3OracleMock =
		await new typechain.UniswapV3OracleMock__factory(owner).deploy();

	const testToken: typechain.MockToken =
		await new typechain.MockToken__factory(owner).deploy();

	const anotherTestToken: typechain.MockToken =
		await new typechain.MockToken__factory(owner).deploy();

	// Deploy gifty token
	const giftyToken: typechain.GiftyToken =
		await new typechain.GiftyToken__factory(owner).deploy(
			dataHelper.initialSupplyReceiver,
			dataHelper.initialSupply
		);

	await uniswapPoolMock.initialize(testToken.address, giftyToken.address, {
		time: await time.latest(),
		tick: 0,
		liquidity: "1000000000000000000",
	});

	await uniswapPoolMock.grow(300);
	await uniswapPoolMock.advanceTime(1800); // 30 min

	// Deploy piggyBox
	const piggyBox: typechain.PiggyBox = await new typechain.PiggyBox__factory(
		owner
	).deploy();

	const initialTokens: string[] = [testToken.address];
	const initialAggregatorsAddress: string[] = [tokenMockAggregator.address];

	// Deploy gifty main contract
	const gifty: typechain.Gifty = await new typechain.Gifty__factory(
		owner
	).deploy();

	await gifty.initialize(
		giftyToken.address,
		piggyBox.address,
		uniswapPoolMock.address,
		testHelper.secondsAgo, // 30 min
		testHelper.refundParams,
		testHelper.commissionSettings.thresholds,
		testHelper.commissionSettings.commissions
	);

	await gifty.changePriceFeedsForTokens(
		[testHelper.EthAddress],
		[ethMockAggregator.address]
	);

	await gifty.addTokens(initialTokens, initialAggregatorsAddress);

	// Changing the address of the gifty in the token contract and piggyBox
	await giftyToken.changeGiftyAddress(gifty.address);
	await piggyBox.changeGifty(gifty.address);

	await testToken.approve(gifty.address, ethers.constants.MaxUint256);
	await giftyToken.approve(gifty.address, ethers.constants.MaxUint256);

	const attacker: typechain.Attacker = await new typechain.Attacker__factory(
		owner
	).deploy();

	const viewer: typechain.GiftyViewer =
		await new typechain.GiftyViewer__factory(owner).deploy(gifty.address);

	return {
		// Signers
		owner,
		receiver,
		signers,

		// Main Gifty contracts
		gifty,
		giftyToken,
		piggyBox,

		// Test contracts
		testToken,
		anotherTestToken,

		ethMockAggregator,
		tokenMockAggregator,
		uniswapPoolMock,

		attacker,
		viewer,
	};
}
