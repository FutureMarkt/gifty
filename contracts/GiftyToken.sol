// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @notice This error will be returned if a function is called that is only available to the Gifty contract,
 * but the caller is not.
 */
error GiftyToken__OnlyAGiftyContractCanPerformThisAction();

/**
 * The error will be returned when trying to change the address of the Gifty contract
 * to an address that is not a contract.
 */
error GiftyToken__ChangingTheGiftyContractAddressToANonContractAddress();

/**
 * @author FutureMarkt
 * @title TODO
 */
contract GiftyToken is ERC20, Ownable {
    /// @notice Gifty contract address
    address private s_gifty;

    /**
     * @notice The event will be emitted when the address of the Gifty is changed
     * @param newGiftyAddress - new Gifty address
     */

    event GiftyAddressChanged(address indexed newGiftyAddress);

    // TODO: will be changed to upgradeable version
    constructor(address initialSupplyReceiver, uint256 initialSupply)
        ERC20("GiftyToken", "GFT")
    {
        _mint(initialSupplyReceiver, initialSupply);
    }

    /// @notice Modifier of access to functions that are available only to the Gifty contract
    modifier onlyGiftyContract() {
        if (msg.sender != s_gifty)
            revert GiftyToken__OnlyAGiftyContractCanPerformThisAction();

        _;
    }

    /**
     * @notice Creation of new tokens. The function is only available to the Gifty contract.
     *
     * @param to: recipient's address
     * @param amount: number of tokens to be created
     */
    function mint(address to, uint256 amount) external onlyGiftyContract {
        _mint(to, amount);
    }

    /**
     * @notice Burning tokens from a specific address. The function is only available to the Gifty contract.
     *
     * @param from: the address from which the tokens will be debited
     * @param amount: number of tokens to be debited
     */
    function burn(address from, uint256 amount) external onlyGiftyContract {
        _burn(from, amount);
    }

    /**
     * @notice Changes the address of the Gifty contract in the token contract.
     * The function is available only to the contract owner.
     *
     * @param newGiftyAddress: address of new Gifty contract
     */
    function changeGiftyAddress(address newGiftyAddress) external onlyOwner {
        if (newGiftyAddress.code.length == 0)
            revert GiftyToken__ChangingTheGiftyContractAddressToANonContractAddress();

        s_gifty = newGiftyAddress;
        emit GiftyAddressChanged(newGiftyAddress);
    }

    /**
     * @notice The function of getting the Gifty address
     * @return address: address of the Gifty contract
     */
    function getGiftyAddress() external view returns (address) {
        return s_gifty;
    }
}
