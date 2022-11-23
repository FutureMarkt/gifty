import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GiftyFixture } from "./fixtures/GiftyFixture";
import { ethers } from "ethers";
import { BigNumber } from "ethers";



describe("Gifty | Getters", function () {
    const giftAmount: BigNumber = ethers.utils.parseUnits("1", 17);
    const giftCommission: BigNumber = ethers.utils.parseUnits("1", 16);
    const giftWithComission: BigNumber = giftAmount.add(giftCommission);

    describe("getReceivedGiftBatche", function () {
        it("If offset more then array length - revert", async function () {
            const { gifty, receiver } = await loadFixture(GiftyFixture);

            for (let i = 1; i < 8; i++) {
                await gifty.giftETH(receiver.address, giftAmount.mul(i), {
                    value: giftWithComission.mul(i),
                });
            }

            await expect(gifty.getReceivedGiftBatche(receiver.address, 10, 1)).to.be.revertedWithCustomError(gifty, "Gifty__error_17").withArgs(10, 7);
        });

        it("Get one gift | 1st from start of array", async function () {
            const { gifty, receiver } = await loadFixture(GiftyFixture);

            for (let i = 1; i < 8; i++) {
                await gifty.giftETH(receiver.address, giftAmount.mul(i), {
                    value: giftWithComission.mul(i),
                });
            }

            const gifts: any[] = await gifty.getReceivedGiftBatche(receiver.address, 6, 1);

            expect(gifts[0].amount).eq(giftAmount);
        });

        it("Get two gift | 1st and 2nd from start of array", async function () {
            const { gifty, receiver } = await loadFixture(GiftyFixture);

            for (let i = 1; i < 8; i++) {
                await gifty.giftETH(receiver.address, giftAmount.mul(i), {
                    value: giftWithComission.mul(i),
                });
            }

            const gifts: any[] = await gifty.getReceivedGiftBatche(receiver.address, 5, 2);

            expect(gifts[0].amount).eq(giftAmount.mul(2));
            expect(gifts[1].amount).eq(giftAmount);
        });


        it("Get Batche in correct order", async function () {
            const { gifty, receiver } = await loadFixture(GiftyFixture);

            for (let i = 1; i < 11; i++) {
                await gifty.giftETH(receiver.address, giftAmount.mul(i), {
                    value: giftWithComission.mul(i),
                });
            }

            const gifts: any[] = await gifty.getReceivedGiftBatche(receiver.address, 5, 5);

            const maxElement = 5;
            for (let i = 0; i < maxElement; i++) {
                expect(gifts[i].amount).eq(giftAmount.mul(maxElement - i));
            }
        });
    })
});
