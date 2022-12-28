// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

/* Contracts */
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ERC20Upgradeable, AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

///  @notice Will return in case of an attempt to access a function that is only available to PiggyBox
error GiftyToken__onlyPiggyBox();

/// @notice Will return when trying to change PiggyBox to a zero address
error GiftyToken__notAContract();

/// @author FutureMarkt
contract GiftyToken is ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
	// PiggyBox
	address private s_piggyBox;

	/**
	 * @notice Emmited when PiggyBox changed.
	 * @param piggyBox - new PiggyBox
	 */
	event PiggyBoxChanged(address indexed piggyBox);

	/// @notice Modifier of access to functions that are available only to the PiggyBox contract
	modifier onlyPiggyBox() {
		if (msg.sender != s_piggyBox) revert GiftyToken__onlyPiggyBox();
		_;
	}

	function initialize(
		address initialSupplyReceiver,
		uint256 initialSupply
	) external initializer {
		__UUPSUpgradeable_init();
		__Ownable_init();
		__ERC20_init("GiftyToken", "GFT");

		_mint(initialSupplyReceiver, initialSupply);
	}

	/**
	 * @notice Creation of new tokens. The function is only available to the PiggyBox contract.
	 *
	 * @param to: recipient's address
	 * @param amount: number of tokens to be created
	 */
	function mint(address to, uint256 amount) external onlyPiggyBox {
		_mint(to, amount);
	}

	/**
	 * @notice Burning tokens from a specific address. The function is only available to the PiggyBox contract.
	 *
	 * @param from: the address from which the tokens will be debited
	 * @param amount: number of tokens to be debited
	 */
	function burn(address from, uint256 amount) external onlyPiggyBox {
		_burn(from, amount);
	}

	/**
	 * @notice Changes the address of the PiggyBox contract in the token contract.
	 * The function is available only to the contract owner.
	 *
	 * @param piggyBox: address of new PiggyBox contract
	 */
	function changePiggyBox(address piggyBox) external onlyOwner {
		if (!AddressUpgradeable.isContract(piggyBox)) revert GiftyToken__notAContract();

		s_piggyBox = piggyBox;
		emit PiggyBoxChanged(piggyBox);
	}

	/**
	 * @notice The function of getting the PiggyBox address
	 * @return address: address of the PiggyBox contract
	 */
	function getPiggyBox() external view returns (address) {
		return s_piggyBox;
	}

	function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}
