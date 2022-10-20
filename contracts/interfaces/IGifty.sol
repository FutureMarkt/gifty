// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IGifty {
    function createGift(
        address receiver,
        address tokenAddress,
        uint256 amount
    ) external;

    function receiveGift(address from, uint256 nonce) external;

    function changeCommission(uint256 newCommissionRate) external;

    function changePiggyBox(address newPiggyBox) external;

    function changeTokenStatus(address tokenAddress) external;

    function changeTokenStatuses(address[] calldata tokensAddress) external;
}
