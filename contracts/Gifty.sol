// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

/* Internal contracts */
import "./GiftyController.sol";

/* External libraries */
import {PriceConverter} from "./GiftyLibraries/PriceConverter.sol";
import {OracleLibrary} from "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";

contract Gifty is GiftyController {
	using ExternalAccountsInteraction for address payable;
	using PriceConverter for *;
	using SafeERC20 for IERC20;
	using SafeCast for uint256;

	/* --------------------Data types-------------------- */

	enum TypeOfCommission {
		DEFAULT, // Default value (0)
		ETH, // The commission is paid in native currency
		GFT, // The commission is paid in Gifty token
		TOKEN // The commission is paid in the token that the user gives
	}

	enum TypeOfGift {
		DEFAULT, // Default value (0)
		ETH, // Native cryptocurrency of blockchain
		FT // Fungigle tokens, backward compatible with ERC-20
	}

	// Financial information in the user profile
	// prettier-ignore
	struct FinancialInfo {
		uint128 totalTurnoverInUSD;   // ---| The total price of gifts which user made
		uint128 commissionPayedInUSD; // ---| The total amount paid by the user as commission
	}

	// Each user's personal account
	struct UserInfo {
		uint256[] givenGifts; // An array of indexes of gifts that the user gave
		uint256[] receivedGifts; //  An array of gift indexes that the user received
		FinancialInfo finInfo; // Described above, the structure of FinancialInfo
	}

	// prettier-ignore
	// Gift structure, each gift is represented by this structure
	struct Gift {
		address giver;          //                            Address of gift sender
		address receiver;       // 20 bytes ----------------| Address of the gift recipient
		uint96 amountInUSD;     // 12 bytes ----------------| Gift price in dollars. uint96 - In order to rest against the maximum value, the user needs to give a gift in the amount of $79_228_162_514,26...35
		uint256 amount;         //                            Quantitative representation of the gift
		IERC20 asset;           // 20 bytes ----------------| The address of the gift token, if it is ETH - the address will be represented by address(e)
		TypeOfGift giftType;    // 1 byte (uint8) ----------| Described above, enum TypeOfGift
		uint32 giftedAtBlock;   // 4 bytes -----------------| The number of the block in which the gift is sent.
		uint40 giftedAtTime;   	// 5 bytes -----------------| The timestamp when the gift was given. (Not used in the contract, but needed for the frontend)
		bool isClaimed;         // 1 byte ------------------| Has this gift been picked up yet?
		bool isRefunded;        // 1 byte ------------------| Did the giver return the gift?
	}

	// All gifts that have ever been given through the contract
	Gift[] internal s_allGifts;

	// The structure of information about the user associated with his address.
	mapping(address => UserInfo) internal s_userInformation;

	// The amount that the user overpaid when giving ETH
	mapping(address => uint256) private s_commissionSurplusesETH;

	/* --------------------Modifiers-------------------- */

	// Check that the giver is not giving a gift to himself.
	modifier validateReceiver(address receiver) {
		if (receiver == msg.sender) revert Gifty__error_11();
		_;
	}

	/* --------------------Functions-------------------- */

	function initialize(
		address giftyToken,
		address payable piggyBox,
		address uniswapV3Pool,
		uint32 secondsAgo,
		GiftRefundSettings memory refundSettings,
		CommissionThresholds memory thresholds,
		Commissions memory commissions
	) external onlyOwner initializer {
		initializeGiftyController(
			giftyToken,
			piggyBox,
			uniswapV3Pool,
			secondsAgo,
			refundSettings,
			thresholds,
			commissions
		);
	}

	/**
	 * @notice The gift of native currency.
	 * @notice The commission amount must also be added to the amount of the gift sent.
     * @notice The price of the gift must exceed the minimum threshold.
	 * @notice A gift cannot be given to yourself.
	 * @notice No re-entry can be performed.

	 * @param receiver - Address to whom you want to send the gift
	 * @param amount - How much do you want to give the receiver
	 */
	function giftETH(
		address receiver,
		uint256 amount
	) external payable nonReentrant validateReceiver(receiver) {
		address ETH = _getETHAddress();
		uint256 giftPriceInUSD = _getPriceOfAsset(ETH, amount);

		_chargeCommission(ETH, amount, giftPriceInUSD, TypeOfCommission.ETH);
		_createGift(receiver, ETH, amount, giftPriceInUSD, TypeOfGift.ETH);
	}

	function giftETHWithGFTCommission(
		address receiver
	) external payable nonReentrant validateReceiver(receiver) {
		address ETH = _getETHAddress();
		uint256 giftValue = msg.value;
		uint256 giftPriceInUSD = _getPriceOfAsset(ETH, giftValue);

		uint256 chargedCommission = _chargeCommission(
			ETH,
			giftValue,
			giftPriceInUSD,
			TypeOfCommission.GFT
		);

		_transferIn(s_giftyToken, msg.sender, chargedCommission);
		_createGift(receiver, ETH, giftValue, giftPriceInUSD, TypeOfGift.ETH);
	}

	/**
	 * @notice Token gifting function.
	 * @notice The token you are trying to gift must be included in the allowed tokens.
	 * @notice The price of the gift must exceed the minimum gift price threshold.
	 * @notice You will be charged the amount of tokens equal to the number of tokens to the gift + commission.
	 * @notice The amount of the gift may be less than the amount you specified in case the token you are sending has an internal commission.
	 *
	 * @param receiver - Address to whom you want to send the gift
	 * @param token - The address of the token you want to give
	 * @param amount - How much do you want to give the receiver
	 */
	function giftToken(
		address receiver,
		address token,
		uint256 amount
	) external validateReceiver(receiver) {
		_giftToken(receiver, token, amount, TypeOfCommission.TOKEN);
	}

	// TODO
	function giftTokenWithGFTCommission(
		address receiver,
		address token,
		uint256 amount
	) external validateReceiver(receiver) {
		_giftToken(receiver, token, amount, TypeOfCommission.GFT);
	}

	/**
	 * @notice Receive the gift that was sent to you.
	 *
	 * @notice The gift should be intended for you.
	 * @notice The gift should not be taken away already.
	 * @notice The gift should not already be refunded.
	 *
	 * @param giftId - The index of the gift you want to claim.
	 */
	function claimGift(uint256 giftId) external nonReentrant {
		Gift memory currentGift = s_allGifts[giftId];

		// Condition validation
		_validateGiftUnpacking(
			currentGift.receiver,
			currentGift.isClaimed,
			currentGift.isRefunded
		);

		_sendGift(currentGift.giftType, currentGift.asset, currentGift.amount);

		s_allGifts[giftId].isClaimed = true;
		emit GiftClaimed(giftId);
	}

	/**
	 * @notice A function to return a gift that you have sent.
	 *
	 * @notice You can return your gift if no more than refundSettings.refundGiftWithCommissionThreshold have passed, then it can be returned with a commission.
	 * @notice You can also return a gift if more than refundSettings.freeRefundGiftThreshold has passed since the gift was given, without commission.
	 *
	 * @param giftId - The index of the gift you want to refund.
	 */
	function refundGift(uint256 giftId) external nonReentrant {
		Gift memory currentGift = s_allGifts[giftId];

		_validateGiftUnpacking(currentGift.giver, currentGift.isClaimed, currentGift.isRefunded);

		GiftRefundSettings memory refundSettings = s_giftRefundSettings;
		uint256 blockDifference = _blockNumber() - currentGift.giftedAtBlock;

		uint256 refundAmount;

		// Fewer blocks have passed than the threshold value
		if (blockDifference < refundSettings.refundGiftWithCommissionThreshold) {
			uint256 commissionAmount = _calculateCommission(
				currentGift.amount,
				refundSettings.giftRefundCommission
			);

			refundAmount = currentGift.amount - commissionAmount;

			s_giftyCommission[address(currentGift.asset)] += commissionAmount;

			// Calculate and update financial information in dollar terms
			_updateTheUserFinInfoRefund(
				currentGift.amountInUSD,
				refundSettings.giftRefundCommission,
				false
			);
		}
		// More blocks have passed than the free withdrawal threshold
		else if (blockDifference > refundSettings.freeRefundGiftThreshold) {
			refundAmount = currentGift.amount;
			_updateTheUserFinInfoRefund(
				currentGift.amountInUSD,
				refundSettings.giftRefundCommission,
				true
			);
		}
		// else revert (refundGiftWithCommissionThreshold < diff < freeRefundGiftThreshold)
		else revert Gifty__error_15();

		_sendGift(currentGift.giftType, currentGift.asset, refundAmount);

		s_allGifts[giftId].isRefunded = true;
		emit GiftRefunded(giftId);
	}

	function claimSurplusesETH() external nonReentrant {
		uint256 surpluses = s_commissionSurplusesETH[msg.sender];
		if (surpluses == 0) revert Gifty__error_7();

		payable(msg.sender).sendETH(surpluses);
		delete s_commissionSurplusesETH[msg.sender];

		emit SurplusesClaimed(msg.sender, surpluses);
	}

	/* --------------------Internal functions-------------------- */

	function _giftToken(
		address receiver,
		address token,
		uint256 amount,
		TypeOfCommission commissionType
	) private {
		if (!s_tokenInfo[token].isTokenAllowed) revert Gifty__error_16(token);

		uint256 giftPriceInUSD = _getPriceOfAsset(token, amount);

		uint256 chargedCommission = _chargeCommission(
			token,
			amount,
			giftPriceInUSD,
			commissionType
		);

		uint256 amountToGift;
		if (commissionType == TypeOfCommission.GFT) {
			_transferIn(s_giftyToken, msg.sender, chargedCommission);
			amountToGift = _transferIn(token, msg.sender, amount);
		} else {
			uint256 transferedAmount = _transferIn(token, msg.sender, amount + chargedCommission);
			amountToGift = transferedAmount - chargedCommission;
		}

		_createGift(receiver, token, amountToGift, giftPriceInUSD, TypeOfGift.FT);
	}

	/* --------------------Internal functions-------------------- */

	function _chargeCommission(
		address asset,
		uint256 assetAmount,
		uint256 priceInUSD,
		TypeOfCommission commissionType
	) internal returns (uint256 commissionCharged) {
		// Get a commission interest rate for the gift.
		(uint256 commissionRate, uint256 reducedCommissionRate) = getCommissionRate(priceInUSD);

		// Here will be stored commission rate for this gift
		uint256 commissionRateForThisGift;

		if (commissionType == TypeOfCommission.GFT) {
			address GFT = s_giftyToken;

			// If the asset is already GFT, then we can calculate the percentage from assetAmount
			if (asset == GFT)
				commissionCharged = _calculateCommission(assetAmount, reducedCommissionRate);
				// In other cases, you need to get the number of GFT tokens using a more complex calculation.
			else commissionCharged = _getCommissionAmountInGFT(priceInUSD, reducedCommissionRate);

			// Increase earned GFT token by charged commission from this gift
			s_giftyCommission[GFT] += commissionCharged;

			// Assign a reduced commission value to calculate the user's financial information
			commissionRateForThisGift = reducedCommissionRate;
		} else if (commissionType == TypeOfCommission.TOKEN) {
			commissionCharged = _calculateCommission(assetAmount, commissionRate);

			s_giftyCommission[asset] += commissionCharged;
			commissionRateForThisGift = commissionRate;
		} else {
			if (msg.value < assetAmount) revert Gifty__error_5(assetAmount, msg.value);

			/* 
                When giving ETH and paying commission in ETH - 
                commission it will be charged from the delta, which is calculated by the formula:
                total transferred - the amount of the gift.
                The excess will be returned to the sender.
            */
			uint256 commissionPaid;
			unchecked {
				commissionPaid = msg.value - assetAmount;
			}

			// What is the commission amount for this gift?
			uint256 commissionShouldBePaid = commissionCharged = _calculateCommission(
				assetAmount,
				commissionRate
			);

			// Delta less commission? If so, revert.
			if (commissionPaid < commissionShouldBePaid)
				revert Gifty__error_3(commissionPaid, commissionShouldBePaid);
			/*
                Delta more commission? If yes, then let the user then withdraw it.

                * We do not transfer the excess immediately,
                * because the gift can be made through a contract that does not support receiving ETH.
            */
			else if (commissionPaid > commissionShouldBePaid) {
				unchecked {
					s_commissionSurplusesETH[msg.sender] += (commissionPaid -
						commissionShouldBePaid);
				}
			}

			// We replenish the balance of the Gifty in the amount of the commission.
			unchecked {
				s_giftyCommission[asset] += commissionShouldBePaid;
			}

			commissionRateForThisGift = commissionRate;
		}

		// Calculate and update financial information in dollar terms
		_updateTheUserFinInfo(priceInUSD, commissionRateForThisGift);
	}

	function _getCommissionAmountInGFT(
		uint256 priceInUSD,
		uint256 commissionRate
	) private view returns (uint256) {
		// Get amount of the commission in ETH with reduced rate
		uint256 commissionPriceInUSD = _calculateCommission(priceInUSD, commissionRate);

		// Сache Uniswap config to memory
		UniswapOracleConfig memory uniConfig = s_uniConfig;

		// Convert comission price from USD to GFT
		return
			_getPriceOfExactAmountUniswapV3(
				uniConfig.pool,
				uniConfig.anotherTokenInPool,
				s_giftyToken,
				uniConfig.secondsAgo,
				commissionPriceInUSD
			);
	}

	/* --------------------Interaction with gifts functions-------------------- */

	// Universal Gift creation.
	function _createGift(
		address receiver,
		address assetToGift,
		uint256 assetAmount,
		uint256 giftPriceInUSD,
		TypeOfGift currentGiftType
	) internal {
		Gift memory newGift = Gift({
			giver: msg.sender,
			receiver: receiver,
			amountInUSD: giftPriceInUSD.toUint96(),
			amount: assetAmount,
			asset: IERC20(assetToGift),
			giftType: currentGiftType,
			giftedAtBlock: _blockNumber(),
			giftedAtTime: _blockTimestamp(),
			isClaimed: false,
			isRefunded: false
		});

		uint256 newGiftIndex = s_allGifts.length;
		s_allGifts.push(newGift);

		s_userInformation[msg.sender].givenGifts.push(newGiftIndex);
		s_userInformation[receiver].receivedGifts.push(newGiftIndex);

		emit GiftCreated(msg.sender, receiver, assetToGift, assetAmount, newGiftIndex);
	}

	// Validation of access to the gift interaction.
	function _validateGiftUnpacking(
		address unpacker,
		bool isClaimed,
		bool isRefunded
	) internal view {
		if (unpacker != msg.sender) revert Gifty__error_12();
		else if (isClaimed) revert Gifty__error_13();
		else if (isRefunded) revert Gifty__error_14();
	}

	// Universal sending of a gift depending on its type.
	function _sendGift(TypeOfGift giftType, IERC20 token, uint256 amount) internal {
		if (giftType == TypeOfGift.FT) {
			token.safeTransfer(msg.sender, amount);
		} else if (giftType == TypeOfGift.ETH) {
			payable(msg.sender).sendETH(amount);
		}
		// TODO In future here can be NFT or something else
		else revert("Not complited yet");
	}

	/* --------------------FinInfo updates functions -------------------- */

	function _updateTheUserFinInfo(uint256 giftPriceInUSD, uint256 commissionRate) internal {
		/*
            Calculate the equivalent of the gift amount and commission in USD,
            for accounting in the personal account and issuing statuses.
        */
		uint256 commissionInUSD = _calculateCommission(giftPriceInUSD, commissionRate);

		// Updating the user's financial information
		FinancialInfo storage currentUserFinInfo = s_userInformation[msg.sender].finInfo;

		currentUserFinInfo.totalTurnoverInUSD += giftPriceInUSD.toUint128();
		currentUserFinInfo.commissionPayedInUSD += commissionInUSD.toUint128();
	}

	function _updateTheUserFinInfoRefund(
		uint256 giftPriceInUSD,
		uint256 commissionRate,
		bool isCommissionFreeRefund
	) internal {
		FinancialInfo storage currentUserFinInfo = s_userInformation[msg.sender].finInfo;

		currentUserFinInfo.totalTurnoverInUSD -= giftPriceInUSD.toUint128();

		if (!isCommissionFreeRefund) {
			uint256 commissionInUSD = _calculateCommission(giftPriceInUSD, commissionRate);
			currentUserFinInfo.commissionPayedInUSD += commissionInUSD.toUint128();
		}
	}

	/* --------------------Token interaction functions-------------------- */

	// A safe version of transferFrom token transfer, as some may have an internal commission.
	// Returns the number of tokens by which the contract balance has increased.
	function _transferIn(
		address token,
		address sender,
		uint256 amount
	) internal returns (uint256) {
		uint256 assetBalanceBefore = _getTokenBalance(token);
		IERC20(token).safeTransferFrom(sender, address(this), amount);
		uint256 assetBalanceAfter = _getTokenBalance(token);

		return assetBalanceAfter - assetBalanceBefore;
	}

	// A secure version of getting a balance.
	function _getTokenBalance(address token) internal view returns (uint256) {
		(bool success, bytes memory data) = token.staticcall(
			abi.encodeWithSelector(IERC20.balanceOf.selector, address(this))
		);

		if (!success || data.length < 32) revert Gifty__error_19();
		return abi.decode(data, (uint256));
	}

	// Depending on the passed asset, we get the price using Chainlink PriceFeed or the UniswapV3 oracle
	function _getPriceOfAsset(
		address asset,
		uint256 amount
	) internal view returns (uint256 price) {
		address GFT = s_giftyToken;

		if (asset == GFT) {
			UniswapOracleConfig memory uniConfig = s_uniConfig;
			price = _getPriceOfExactAmountUniswapV3(
				uniConfig.pool,
				GFT,
				uniConfig.anotherTokenInPool,
				uniConfig.secondsAgo,
				amount
			);
		} else {
			AggregatorV3Interface assetPriceFeed = _getPriceFeed(asset);
			price = amount.getConversionRate(assetPriceFeed);
		}
	}

	// Get TWAP price from UniswapV3 pool
	function _getPriceOfExactAmountUniswapV3(
		address pool,
		address tokenIn,
		address tokenOut,
		uint32 secondsAgo,
		uint256 amount
	) internal view returns (uint256) {
		(int24 tick, ) = OracleLibrary.consult(pool, secondsAgo);
		uint256 amountOut = OracleLibrary.getQuoteAtTick(
			tick,
			amount.toUint128(),
			tokenIn,
			tokenOut
		);

		if (amountOut == 0) revert Gifty__error_22();

		return amountOut;
	}

	/* --------------------Retrieving information from the block header functions-------------------- */

	// Get block.number converted to Uint32
	function _blockNumber() internal view returns (uint32) {
		return block.number.toUint32();
	}

	// Get block.timestamp converted to Uint40
	function _blockTimestamp() internal view returns (uint40) {
		return block.timestamp.toUint40();
	}

	/* --------------------Commission calculating-------------------- */

	// Calculating the commission.
	// The minimum amount is 10000, since values less than that are subject to lossy rounding.
	// commissionRate must be with 2 decimals
	function _calculateCommission(
		uint256 amount,
		uint256 commissionRate
	) internal pure returns (uint256) {
		uint256 minimumValue = 10000;
		if (amount < minimumValue) revert Gifty__error_2(amount, minimumValue);

		uint256 decimals = 2;
		return (amount * commissionRate) / (100 * 10 ** decimals);
	}

	/* --------------------Getter functions-------------------- */

	/**
	 * @dev Return values of the commission rate with decimals 2
	 *
	 * @return uint256 - The usual commission rate
	 * @return uint256 - Reduced commission rate when the user pays in GFT tokens.
	 */
	function getCommissionRate(uint256 giftPriceInUSD) public view returns (uint256, uint256) {
		CommissionSettings memory settings = s_commissionSettings;

		// price < threshold 1
		if (settings.thresholds.t1.to18Decimals(0) > giftPriceInUSD)
			revert Gifty__error_9(giftPriceInUSD, settings.thresholds.t1.to18Decimals(0));
		// threshold 1 < price < threshold 2
		else if (giftPriceInUSD < settings.thresholds.t2.to18Decimals(0))
			return (settings.commissions.full.l1, settings.commissions.reduced.l1);
		// threshold 2 < price < threshold 3
		else if (giftPriceInUSD < settings.thresholds.t3.to18Decimals(0))
			return (settings.commissions.full.l2, settings.commissions.reduced.l2);
		// threshold 3 < price < threshold 4
		else if (giftPriceInUSD < settings.thresholds.t4.to18Decimals(0))
			return (settings.commissions.full.l3, settings.commissions.reduced.l3);
		// price > threshold 4
		else return (settings.commissions.full.l4, settings.commissions.reduced.l4);
	}

	function getGiftsAmount() external view returns (uint256) {
		return s_allGifts.length;
	}

	function getAllGifts() external view returns (Gift[] memory) {
		return s_allGifts;
	}

	function getExactGift(uint256 giftId) external view returns (Gift memory) {
		return s_allGifts[giftId];
	}

	function getOverpaidETHAmount(address user) external view returns (uint256) {
		return s_commissionSurplusesETH[user];
	}

	function getUserInfo(address user) external view returns (UserInfo memory) {
		return s_userInformation[user];
	}

	function version() external pure returns (uint256) {
		return 1;
	}
}
