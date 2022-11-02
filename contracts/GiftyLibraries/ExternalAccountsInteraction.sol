// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

error ExternalAccountsInteraction__lowLevelTransferIsFailed();
error ExternalAccountsInteraction__theAmountOfETHBeingSentIsMoreThanTheBalance();

library ExternalAccountsInteraction {
	function isContract(address potentialContract) internal view returns (bool) {
		return potentialContract.code.length > 0;
	}

	function sendETH(address payable to, uint256 amount) internal {
		if (amount > address(this).balance)
			revert ExternalAccountsInteraction__theAmountOfETHBeingSentIsMoreThanTheBalance();

		(bool isSuccessed, ) = to.call{value: amount}("");
		if (!isSuccessed) revert ExternalAccountsInteraction__lowLevelTransferIsFailed();
	}
}
