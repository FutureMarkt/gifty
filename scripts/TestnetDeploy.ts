import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";

import * as dataHelper from "../dataHelper";
import * as testHelper from "../test/TestHelper";
import * as typechain from "../typechain-types";

async function main() {
	console.log("Start");
	const [owner]: SignerWithAddress[] = await ethers.getSigners();
	console.log("Signers");

	// Deploy Aggregator Price Feed mock
	const ethPriceFeed: string = "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e";

	// Deploy Aggregator Price Feed mock
	const tokenMockAggregator: typechain.MockV3Aggregator =
		await new typechain.MockV3Aggregator__factory(owner).deploy(
			testHelper.mockAggregatorDecimals,
			testHelper.mockAggregatorAnswerToken
		);

	await tokenMockAggregator.deployed();
	console.log(`tokenMockAggregator: ${tokenMockAggregator.address}`);

	const uniswapPoolMock: typechain.UniswapV3OracleMock =
		await new typechain.UniswapV3OracleMock__factory(owner).deploy();
	await uniswapPoolMock.deployed();
	console.log(`uniswapPoolMock: ${uniswapPoolMock.address}`);

	const testToken: typechain.MockToken =
		await new typechain.MockToken__factory(owner).deploy();
	await testToken.deployed();
	console.log(`testToken: ${testToken.address}`);

	// Deploy gifty token
	const giftyToken: typechain.GiftyToken =
		await new typechain.GiftyToken__factory(owner).deploy(
			dataHelper.initialSupplyReceiver,
			dataHelper.initialSupply
		);
	await giftyToken.deployed();
	console.log(`giftyToken: ${giftyToken.address}`);

	const uniInitilizeTx = await uniswapPoolMock.initialize(
		testToken.address,
		giftyToken.address,
		{
			time: (await ethers.provider.getBlock("latest")).timestamp,
			tick: 0,
			liquidity: "1000000000000000000",
		}
	);
	await uniInitilizeTx.wait(2);
	console.log("Uni initialized");

	const growTx = await uniswapPoolMock.grow(300);
	await growTx.wait(2);
	console.log("Uni grow");

	const advanceTimeTx = await uniswapPoolMock.advanceTime(1800); // 30 min
	await advanceTimeTx.wait(2);
	console.log("Uni advance time");

	// Deploy piggyBox
	const piggyBox: typechain.PiggyBox = await new typechain.PiggyBox__factory(
		owner
	).deploy();
	await piggyBox.deployed();
	console.log(`piggyBox: ${piggyBox.address}`);

	const initialTokens: string[] = [testToken.address];
	const initialAggregatorsAddress: string[] = [tokenMockAggregator.address];

	// Deploy gifty main contract
	const gifty: typechain.Gifty = await new typechain.Gifty__factory(
		owner
	).deploy();
	await gifty.deployed();
	console.log(`gifty: ${gifty.address}`);

	const initialize = await gifty.initialize(
		giftyToken.address,
		piggyBox.address,
		uniswapPoolMock.address,
		testHelper.secondsAgo, // 30 min
		testHelper.refundParams,
		testHelper.commissionSettings.thresholds,
		testHelper.commissionSettings.commissions
	);
	await initialize.wait(2);
	console.log("Gifty initialized");

	const changePriceFeedTx = await gifty.changePriceFeedsForTokens(
		[testHelper.EthAddress],
		[ethPriceFeed]
	);
	await changePriceFeedTx.wait(2);
	console.log("changePriceFeedTx");

	const addTokenTx = await gifty.addTokens(
		initialTokens,
		initialAggregatorsAddress
	);
	await addTokenTx.wait(2);
	console.log("addTokenTx");

	// Changing the address of the gifty in the token contract and piggyBox
	const changeGFTAddress = await giftyToken.changeGiftyAddress(
		gifty.address
	);
	await changeGFTAddress.wait(2);
	console.log("changeGFTAddress");

	const changeGifty = await piggyBox.changeGifty(gifty.address);
	await changeGifty.wait(2);
	console.log("changeGifty");
}

main().catch((e: any) => {
	console.error(e);
	process.exit(1);
});
