import { ethers } from "hardhat";
import {
	abi as FACTORY_ABI,
	bytecode as FACTORY_BYTECODE,
} from "../UniswapArtifacts/UniswapV3Factory.json";

import {
	abi as WETH9_ABI,
	bytecode as WETH9_BYTECODE,
} from "../UniswapArtifacts/WETH9.json";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
	IUniswapV3Factory,
	IWETH9,
	MockTimeSwapRouter,
	MockTimeSwapRouter__factory,
} from "../../typechain-types";

async function uniswapV3FactoryFixture(
	owner: SignerWithAddress
): Promise<IUniswapV3Factory> {
	const UniV3Factory_factory = new ethers.ContractFactory(
		FACTORY_ABI,
		FACTORY_BYTECODE,
		owner
	);

	return (await UniV3Factory_factory.deploy()) as IUniswapV3Factory;
}

async function wethFixture(owner: SignerWithAddress): Promise<IWETH9> {
	const weth_factory = new ethers.ContractFactory(
		WETH9_ABI,
		WETH9_BYTECODE,
		owner
	);

	return (await weth_factory.deploy()) as IWETH9;
}

export async function UniswapRouterFixture(owner: SignerWithAddress): Promise<{
	router: MockTimeSwapRouter;
	weth9: IWETH9;
	factory: IUniswapV3Factory;
}> {
	const weth9 = await wethFixture(owner);
	const factory = await uniswapV3FactoryFixture(owner);

	const router: MockTimeSwapRouter = await new MockTimeSwapRouter__factory(
		owner
	).deploy(factory.address, weth9.address);

	return { router, weth9, factory };
}
