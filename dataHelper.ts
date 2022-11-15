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

export const minGiftPriceInUsd: BigNumber = ethers.utils.parseEther("15");
export const ethAddress: string = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// block time == 2 sec (Matic)
export const giftRefundWithCommissionThresholdInBlocks = 43200; // 1 day
export const giftRefundWithoutCommissionThresholdInBlocks = 1296000; // 1 month
export const refundGiftCommission = 1000; // 10 with 2 decimals%
