import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import {MockV3Aggregator} from "../../typechain-types";

export interface GiftRefundSettings {
	refundGiftWithCommissionThreshold: number;
	freeRefundGiftThreshold: number;
	giftRefundCommission: number;
}



export interface CommissionThresholds {
    t1: number,
    t2: number,
    t3: number,
    t4: number
}

export interface commissionLvl {
    full: number,
    reduced: number
}

export interface Commissions {
    l1: commissionLvl,
    l2: commissionLvl,
    l3: commissionLvl,
    l4: commissionLvl,

}

export interface CommissionSettings {
    thresholds: CommissionThresholds,
    commissions: Commissions
}

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



export const refundParams: GiftRefundSettings = {
    refundGiftWithCommissionThreshold: giftRefundWithCommissionThresholdInBlocks,
    freeRefundGiftThreshold: giftRefundWithoutCommissionThresholdInBlocks,
    giftRefundCommission: refundGiftCommission
    }
    

    
export const commissionSettings: CommissionSettings = {
    thresholds: {
        t1: 15,
        t2: 100,
        t3: 1000,
        t4: 10000,
    },

    commissions: {
        l1: {
            full: 125,
            reduced: 100
        },

        l2: {
            full: 100,
            reduced: 75
        },

        l3: {
            full: 75,
            reduced: 50
        },
          
        l4: {
            full: 50,
            reduced: 25
        },
           
    },
}

export const secondsAgo: number = 1800;




// Functions
export const getCommissionAmount = (giftAmount: BigNumber,commissionRate: BigNumber) => giftAmount.mul(commissionRate).div(10000);
export async function getConvertedPrice(aggregator: MockV3Aggregator) {
	const price: BigNumber = await aggregator.latestAnswer();
	const decimals: number = await aggregator.decimals();

	if (decimals === 18) {
		return price;
	} else {
		const powDifferent: BigNumber = BigNumber.from(10).pow(18 - decimals);
		return price.mul(powDifferent);
	}
}

export async function getPriceOfExactETHAmount(aggregator: MockV3Aggregator, amount: BigNumber | number) {
    const ethPrice: BigNumber = await getConvertedPrice(aggregator);
    return ethPrice.mul(amount).div(OneEther);
}
