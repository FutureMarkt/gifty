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
// When gifty contract will be created write test, it can mint tokens

describe("GiftyToken | mint", function () {
  it("Not Gifty account can't mint tokens", async function () {
    const { signers, giftyToken } = await loadFixture(GiftyTokenFixture);

    await expect(
      giftyToken.mint(signers[0].address, amount)
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

  //   it("", async function () {
  //     const { giftyToken } = await loadFixture(GiftyTokenFixture);
  //     expect().eq();
  //   });
});
