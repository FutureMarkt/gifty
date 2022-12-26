import { ethers, upgrades } from "hardhat";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { BigNumber } from "ethers";

import { time } from "@nomicfoundation/hardhat-network-helpers";

import * as testHelper from "../TestHelper";
import * as typechain from "../../typechain-types";

import { UniswapRouterFixture } from "./UniswapFixture";
import { createPool, FeeAmount } from "./createPool";

export async function GiftyFixture() {
	// Get signers for tests
	const [owner, receiver, ...signers]: SignerWithAddress[] =
		await ethers.getSigners();

	const { ethMockAggregator, tokenMockAggregator } =
		await aggregatorsFixture(owner);

	const { weth9, factory, router, uniswapPoolMock, nftDescriptor, nft } =
		await uniswapFixture(owner);

	const { testToken, anotherTestToken } = await testTokensFixture(owner);

	// Deploy gifty token
	const giftyToken: typechain.GiftyToken = await giftyTokenFixture(
		owner,
		owner.address,
		ethers.utils.parseEther("1000000")
	);

	await initializeUniswapPool(uniswapPoolMock, testToken, giftyToken);

	const initialTokens: string[] = [testToken.address];
	const initialAggregatorsAddress: string[] = [tokenMockAggregator.address];

	const piggyBox: typechain.PiggyBox = await piggyBoxFixture(owner);

	const gifty: typechain.Gifty = await deployGifty(
		owner,
		giftyToken,
		piggyBox,
		uniswapPoolMock,
		ethMockAggregator,
		initialTokens,
		initialAggregatorsAddress
	);

	// Changing the address of the gifty in the token contract and piggyBox
	await giftyToken.changePiggyBox(piggyBox.address);
	await piggyBox.setSettings(
		gifty.address,
		giftyToken.address,
		testHelper.spllitCommissionSettings,
		{
			router: router.address,
			weth9: weth9.address,
			middleToken: weth9.address,
			swapFeeToMiddleToken: FeeAmount.MEDIUM,
			swapFeeToGFT: FeeAmount.MEDIUM,
		}
	);

	await testToken.approve(gifty.address, ethers.constants.MaxUint256);
	await giftyToken.approve(gifty.address, ethers.constants.MaxUint256);
	await giftyToken.approve(nft.address, ethers.constants.MaxUint256);
	await weth9.approve(nft.address, ethers.constants.MaxUint256);

	await weth9.approve(router.address, ethers.constants.MaxUint256);
	await giftyToken.approve(router.address, ethers.constants.MaxUint256);
	await testToken.approve(router.address, ethers.constants.MaxUint256);

	await weth9.deposit({ value: ethers.utils.parseEther("1000") });

	await createPool(owner, weth9.address, giftyToken.address, nft);

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

		// UniV3
		uniswapPoolMock,
		factory,
		router,
		weth9,
		nftDescriptor,
		nft,

		attacker,
		viewer,
	};
}

async function aggregatorsFixture(owner: SignerWithAddress) {
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

	return { ethMockAggregator, tokenMockAggregator };
}

async function uniswapFixture(owner: SignerWithAddress) {
	const uniswapPoolMock: typechain.UniswapV3OracleMock =
		await new typechain.UniswapV3OracleMock__factory(owner).deploy();

	const { weth9, factory, router } = await UniswapRouterFixture(owner);

	const nftDescriptorLib: typechain.NFTDescriptor =
		await new typechain.NFTDescriptor__factory(owner).deploy();

	const positionDescriptorFactory = await ethers.getContractFactory(
		"NonfungibleTokenPositionDescriptor",
		{
			libraries: {
				NFTDescriptor: nftDescriptorLib.address,
			},
		}
	);

	const nftDescriptor: typechain.NonfungibleTokenPositionDescriptor =
		(await positionDescriptorFactory.deploy(
			weth9.address,
			"0x4554480000000000000000000000000000000000000000000000000000000000"
		)) as typechain.NonfungibleTokenPositionDescriptor;

	const nft: typechain.MockTimeNonfungiblePositionManager =
		await new typechain.MockTimeNonfungiblePositionManager__factory(
			owner
		).deploy(factory.address, weth9.address, nftDescriptor.address);

	return { weth9, factory, router, uniswapPoolMock, nftDescriptor, nft };
}

async function testTokensFixture(owner: SignerWithAddress) {
	const testToken: typechain.MockToken =
		await new typechain.MockToken__factory(owner).deploy();

	const anotherTestToken: typechain.MockToken =
		await new typechain.MockToken__factory(owner).deploy();

	return { testToken, anotherTestToken };
}

async function initializeUniswapPool(
	uniswapPoolMock: typechain.UniswapV3OracleMock,
	testToken: typechain.MockToken,
	giftyToken: typechain.GiftyToken
) {
	await uniswapPoolMock.initialize(testToken.address, giftyToken.address, {
		time: await time.latest(),
		tick: 0,
		liquidity: "1000000000000000000",
	});

	await uniswapPoolMock.grow(300);
	await uniswapPoolMock.advanceTime(1800); // 30 min
}

async function deployGifty(
	owner: SignerWithAddress,
	giftyToken: typechain.GiftyToken,
	piggyBox: typechain.PiggyBox,
	uniswapPoolMock: typechain.UniswapV3OracleMock,
	ethMockAggregator: typechain.MockV3Aggregator,
	initialTokens: string[],
	initialAggregatorsAddress: string[]
) {
	// Deploy gifty main contract
	const gifty: typechain.Gifty = (await upgrades.deployProxy(
		new typechain.Gifty__factory(owner),
		[
			giftyToken.address,
			piggyBox.address,
			uniswapPoolMock.address,
			testHelper.secondsAgo, // 30 min
			testHelper.refundParams,
			testHelper.commissionSettings.thresholds,
			testHelper.commissionSettings.commissions,
		],
		{ kind: "uups" }
	)) as typechain.Gifty;

	await gifty.changePriceFeedsForTokens(
		[testHelper.EthAddress],
		[ethMockAggregator.address]
	);

	await gifty.addTokens(initialTokens, initialAggregatorsAddress);

	return gifty;
}

async function piggyBoxFixture(owner: SignerWithAddress) {
	// Deploy piggyBox
	const piggyBox: typechain.PiggyBox = (await upgrades.deployProxy(
		new typechain.PiggyBox__factory(owner),
		{ kind: "uups" }
	)) as typechain.PiggyBox;

	return piggyBox;
}

export async function giftyTokenFixture(
	owner: SignerWithAddress,
	initialSupplyReceiver: string,
	initialSupply: BigNumber
) {
	return (await upgrades.deployProxy(
		new typechain.GiftyToken__factory(owner),
		[initialSupplyReceiver, initialSupply],
		{ kind: "uups" }
	)) as typechain.GiftyToken;
}
