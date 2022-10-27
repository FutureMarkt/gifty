// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

error ExternalAccountsInteraction__LowLevelTransferIsFailed();

library ExternalAccountsInteraction {
	function isContract(address potentialContract) internal view returns (bool) {
		return potentialContract.code.length > 0;
	}

	function sendETH(address payable to, uint256 amount) internal {
		(bool isSuccessed, ) = to.call{value: amount}("");
		if (!isSuccessed) revert ExternalAccountsInteraction__LowLevelTransferIsFailed();
	}
}
