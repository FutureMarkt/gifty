import { ethers } from "hardhat";
import type { BigNumber } from "ethers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

// TODO Change this values
export const initialSupply: BigNumber = ethers.utils.parseEther("1000000");
export const initialSupplyReceiver: Promise<string> = ethers
	.getSigners()
	.then((signers: SignerWithAddress[]) => {
		return signers[0].address;
	});

export const mockAggregatorDecimals: number = 8;
export const mockAggregatorAnswer: BigNumber = ethers.utils.parseUnits(
	"1500",
	8
);

export const ethAddress: string = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
