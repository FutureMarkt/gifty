// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./interfaces/IGifty.sol";

contract Gifty is IGifty {
    function giftETH(address receiver, uint256 amount)
        external
        payable
        override
    {}

    function giftETHWithGFTCommission(address receiver)
        external
        payable
        override
    {}

    function giftToken(
        address receiver,
        address tokenToGift,
        address tokenToPayCommission,
        uint256 amount
    ) external override {}

    function claimGift(address from, uint256 nonce) external override {}

    function addReceiverAddressToGift(address receiver, uint256 nonce)
        external
        override
    {}

    function changeCommissionRate(uint256 newCommissionRate)
        external
        override
    {}

    function changePiggyBox(address newPiggyBox) external override {}

    function changeTokenStatus(address tokenAddress) external override {}

    function changeTokenStatuses(address[] calldata tokensAddress)
        external
        override
    {}

    function version() external pure override returns (uint256) {
        return 1;
    }
}
