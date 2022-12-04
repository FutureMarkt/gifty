import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import type { MockV3Aggregator } from "../../typechain-types";

export const OneEther: BigNumber = ethers.constants.WeiPerEther;
export const PercentFromEther: BigNumber = OneEther.div(100);
export const OneEtherGiftWithCommission: BigNumber = OneEther.add(PercentFromEther);

export const ZeroAddress: string = "0x0000000000000000000000000000000000000000";
export const NonZeroAddress: string = "0x0000000000000000000000000000000000000001";
export const EthAddress: string = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export const mockAggregatorDecimals: number = 8;
export const mockAggregatorAnswerETH: BigNumber = ethers.utils.parseUnits("1500",8);
export const mockAggregatorAnswerToken: BigNumber = ethers.utils.parseUnits("50",8);

// block time == 2 sec (Matic)
export const giftRefundWithCommissionThresholdInBlocks = 43200; // 1 day
export const giftRefundWithoutCommissionThresholdInBlocks= 1296000; // 1 month
export const refundGiftCommission = 1000; // 10 with 2 decimals%

// Functions
export const getCommissionAmount = (giftAmount: BigNumber,commissionRate: BigNumber) => giftAmount.mul(commissionRate).div(10000);
export async function getConvertedPrice(aggregator: MockV3Aggregator) {
	const price: BigNumber = await aggregator.latestAnswer();
	const decimals: number = await aggregator.decimals();

	if (decimals === 18) {
		return price;
	} else {
		const powDiff: BigNumber = BigNumber.from(10).pow(18 - decimals);
		return price.mul(powDiff);
	}
}


export const secondsAgo: number = 1800;