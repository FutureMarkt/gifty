// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./interfaces/IGifty.sol";
import "./interfaces/IGiftyToken.sol";

import "./GiftyLibraries/ExternalAccountsInteraction.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error Gifty__YouAreTryingToAddANonContractToTheAllowedTokens();

contract Gifty is IGifty, Ownable {
    using ExternalAccountsInteraction for address;

    struct TokenInfo {
        uint248 index;
        bool isAllowed;
    }

    address private s_piggyBox;
    IGiftyToken private s_giftyToken;

    mapping(address => TokenInfo) private s_tokenInfo;
    address[] private s_allowedTokens;

    event PiggyBoxChanged(address indexed newPiggyBox);
    event TokenAdded(address indexed token);
    event TokenDeleted(address indexed token);

    function giftETH(address receiver, uint256 amount) external payable {}

    function giftETHWithGFTCommission(address receiver) external payable {}

    function giftToken(
        address receiver,
        address tokenToGift,
        address tokenToPayCommission,
        uint256 amount
    ) external {}

    function claimGift(address from, uint256 nonce) external {}

    function addReceiverAddressToGift(address receiver, uint256 nonce)
        external
    {}

    function changeCommissionRate(uint256 newCommissionRate)
        external
        onlyOwner
    {}

    function changePiggyBox(address newPiggyBox) external onlyOwner {
        s_piggyBox = newPiggyBox;
        emit PiggyBoxChanged(newPiggyBox);
    }

    function changeTokenStatus(address tokenAddress) public onlyOwner {
        _changeTokenStatus(tokenAddress);
    }

    function changeTokenStatuses(address[] calldata tokensAddress)
        external
        onlyOwner
    {
        uint256 tokensToAdd = tokensAddress.length;

        for (uint256 i; i < tokensToAdd; i++) {
            _changeTokenStatus(tokensAddress[i]);
        }
    }

    function splitCommission() external onlyOwner {}

    function version() external pure returns (uint256) {
        return 1;
    }

    function _changeTokenStatus(address tokenAddress) private {
        // Checking whether the address which are trying to add is a contract?
        if (!tokenAddress.isContract())
            revert Gifty__YouAreTryingToAddANonContractToTheAllowedTokens();

        // Get information about this token in our contract
        TokenInfo memory currentTokenInfo = s_tokenInfo[tokenAddress];

        /**
         * If the token has already been added to the contract at the moment,
         * remove it from the available tokens.
         */
        if (currentTokenInfo.isAllowed) {
            /**
             * We take the last element in the available tokens
             * and change its place with the token being deleted.
             */
            uint256 lastElement = s_allowedTokens.length - 1;

            s_allowedTokens[currentTokenInfo.index] = s_allowedTokens[
                lastElement
            ];

            // Deleting information about the token
            // We delete a specific index, instead of using .pop() as it is cheaper.
            delete s_allowedTokens[lastElement];
            delete s_tokenInfo[tokenAddress];

            emit TokenDeleted(tokenAddress);

            /**
             * If the token has not been added to the contract yet,
             * add it to the list of available tokens.
             */
        } else {
            /**
             * We add the token to the array of available tokens
             * and add TokenInfo structure.
             */
            s_allowedTokens.push(tokenAddress);
            uint248 newTokenIndex = uint248(s_allowedTokens.length - 1);

            s_tokenInfo[tokenAddress] = TokenInfo({
                index: newTokenIndex,
                isAllowed: true
            });

            emit TokenAdded(tokenAddress);
        }
    }
}
