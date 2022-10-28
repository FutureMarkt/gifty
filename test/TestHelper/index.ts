import { ethers } from "hardhat";
import { BigNumber } from "ethers";

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
