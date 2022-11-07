import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import type { MockV3Aggregator } from "../../typechain-types";

export const OneEther: BigNumber = ethers.constants.WeiPerEther;
export const PercentFromEther: BigNumber = OneEther.div(100);
export const OneEtherGiftWithCommission: BigNumber =
	OneEther.add(PercentFromEther);

export const ZeroAddress: string = ethers.constants.AddressZero;
export const EthAddress: string = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export const getCommissionAmount = (
	giftAmount: BigNumber,
	commissionRate: BigNumber
) => giftAmount.mul(commissionRate).div(10000);

export const mockAggregatorDecimals: number = 8;
export const mockAggregatorAnswer: BigNumber = ethers.utils.parseUnits(
	"1500",
	8
);

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
