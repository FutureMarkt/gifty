// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IGiftyAction} from "./exactInterfaces/IGiftyAction.sol";
import {IGiftyGetters} from "./exactInterfaces/IGiftyGetters.sol";
import {IGiftyControllerActions} from "./exactInterfaces/IGiftyControllerActions.sol";
import {IGiftyControllerGetters} from "./exactInterfaces/IGiftyControllerGetters.sol";

import {IGiftyErrors} from "./errors/IGiftyErrors.sol";
import {IGiftyEvents} from "./events/IGiftyEvents.sol";

/// @title The interface for the Gifty
/// @dev The logic of Gifty interface is broken up into many smaller pieces
interface IGifty is
	IGiftyAction,
	IGiftyGetters,
	IGiftyControllerActions,
	IGiftyControllerGetters,
	IGiftyEvents,
	IGiftyErrors
{

}
