// Fixtures
import { GiftyTokenFixture } from "./fixtures/GiftyTokenFixture";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

// Types || classes
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

// Functions
import { expect } from "chai";

// Variables for test
const amount: BigNumber = ethers.utils.parseEther("100000");

// TODO:
// When gifty contract will be created write test, it can burn tokens

describe("GiftyToken | burn", function () {
  it("Not Gifty account can't burn tokens", async function () {
    const { signers, giftyToken } = await loadFixture(GiftyTokenFixture);

    await expect(
      giftyToken.burn(signers[0].address, amount)
    ).to.be.revertedWithCustomError(
      giftyToken,
      "GiftyToken__OnlyAGiftyContractCanPerformThisAction"
    );
  });

  //   it("", async function () {
  //     const { giftyToken } = await loadFixture(GiftyTokenFixture);
  //     expect().eq();
  //   });

  //   it("", async function () {
  //     const { giftyToken } = await loadFixture(GiftyTokenFixture);
  //     expect().eq();
  //   });

  //   it(" received correctly", async function () {
  //     const { giftyToken } = await loadFixture(GiftyTokenFixture);
  //     expect().eq();
  //   });
});
