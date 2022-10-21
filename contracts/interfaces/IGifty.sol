// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IGifty {
    function giftETH(address receiver, uint256 amount) external payable;

    function giftETHWithGFTCommission(address receiver) external payable;

    function giftToken(
        address receiver,
        address tokenToGift,
        address tokenToPayCommission,
        uint256 amount
    ) external;

    function claimGift(address from, uint256 nonce) external;

    function addReceiverAddressToGift(address receiver, uint256 nonce) external;

    function changeCommissionRate(uint256 newCommissionRate) external;

    function changePiggyBox(address newPiggyBox) external;

    function changeTokenStatus(address tokenAddress) external;

    function changeTokenStatuses(address[] calldata tokensAddress) external;

    function splitCommission() external;

    function version() external pure returns (uint256);
}
