// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./GiftyController.sol";
import "./interfaces/IGifty.sol";
import "./utils/ReentrancyGuard.sol";
import "./GiftyLibraries/PriceConverter.sol";
import "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";

contract Gifty is IGifty, GiftyController, ReentrancyGuard {
	using ExternalAccountsInteraction for address payable;
	using PriceConverter for uint256;
	using SafeERC20 for IERC20;
	using SafeCast for uint256;

	/* --------------------Data types-------------------- */

	/**
	 * @param DEFAULT - never used
	 * @param ETH - The commission is paid in native currency
	 * @param GFT - The commission is paid in Gifty token
	 * @param TOKEN - The commission is paid in the token that the user gives
	 */
	enum TypeOfCommission {
		DEFAULT, // Default value (0)
		ETH,
		GFT,
		TOKEN
	}

	/**
	 * @param DEFAULT - never used
	 * @param ETH - Native cryptocurrency of blockchain
	 * @param FT - Fungigle tokens, backward compatible with ERC-20
	 * @param NFT - Non-fungible token
	 */
	enum TypeOfGift {
		DEFAULT, // Default value (0)
		ETH,
		FT,
		NFT
	}

	/**
	 * @notice Financial information in the user profile
	 *
	 * @param totalTurnoverInUSD - The total amount of gifts the user made
	 * @param commissionPayedInUSD - The total amount paid by the user as commission
	 */
	// prettier-ignore
	struct FinancialInfo {
		uint128 totalTurnoverInUSD;   // ---|
		uint128 commissionPayedInUSD; // ---|
	}

	/**
	 * @notice Each user's personal account
	 *
	 * @param givenGifts - An array of indexes of gifts that the user gave
	 * @param receivedGifts - An array of gift indexes that the user received
	 * @param finInfo - Described above, the structure of FinancialInfo
	 */
	struct UserInfo {
		uint256[] givenGifts;
		uint256[] receivedGifts;
		FinancialInfo finInfo;
	}

	/**
	 * @notice Gift structure, each gift is represented by this structure
	 *
	 * @param giver - Address of gift sender
	 * @param receiver - Address of the gift recipient
	 * @param amountInUSD - Gift value in dollars. uint96 - In order to rest against the maximum value, the user needs to give a gift in the amount of $79_228_162_514,26...35
	 * @param amount - Quantitative representation of the gift
	 * @param asset - The address of the gift token, if it is ETH - the address will be represented by address(e)
	 * @param giftType - Described above, enum TypeOfGift
	 * @param giftedAtBlock - The number of the block in which the gift is sent.
	 * @param giftedAtTime - The time of the block when the gift was given. (Not used in the contract, but needed for the frontend)
	 * @param isClaimed - Has this gift been picked up yet?
	 * @param isClaimed - Did the giver return the gift?
	 */
	// prettier-ignore
	struct Gift {
		address giver;
		address receiver;       // 20 bytes -----| 
		uint96 amountInUSD;     // 12 bytes -----| 
		uint256 amount;
		IERC20 asset;           // 20 bytes ----------------|
		TypeOfGift giftType;    // 1 byte (uint8) ----------|
		uint32 giftedAtBlock;   // 4 bytes -----------------|
		uint40 giftedAtTime;   	// 5 bytes -----------------|
		bool isClaimed;         // 1 byte ------------------|
		bool isRefunded;        // 1 byte ------------------|
	}

	/** @notice All gifts that have ever been given through the contrakt. */
	Gift[] internal s_allGifts;

	/** @notice The structure of information about the user associated with his address. */
	mapping(address => UserInfo) internal s_userInformation;

	/** @notice The amount that the user overpaid when giving ETH */
	mapping(address => uint256) private s_commissionSurplusesETH;

	/* --------------------Events-------------------- */

	/**
	 * @notice Emmited when giving a gift
	 
     * @param giver - Who gave the gift
	 * @param receiver - Who the gift is intended for
	 * @param giftedAsset - What was presented? ETH - address(e)
	 * @param amount - How many giftedAssets were given
	 * @param giftId - The index of the gift in the array of all gifts
	 */
	event GiftCreated(
		address indexed giver,
		address indexed receiver,
		address indexed giftedAsset,
		uint256 amount,
		uint256 giftId
	);

	/**
	 * @notice Emitted when a gift is received
	 *
	 * @param giftId - The index of the gift in the array of all gifts
	 */
	event GiftClaimed(uint256 giftId);

	/**
	 * @notice Emmited when the user has taken the surplus of the paid ETH
	 *
	 * @param claimer - Who took the surplus
	 * @param amount - How much of the surplus was taken
	 */
	event SurplusesClaimed(address indexed claimer, uint256 amount);

	/**
	 * @notice Emeitted when the giver has refund his gift back.
	 * @param giftId - Index of the gift that was withdrawn
	 */
	event GiftRefunded(uint256 giftId);

	/* --------------------Modifiers-------------------- */
	modifier validateReceiver(address receiver) {
		if (receiver == msg.sender) revert Gifty__error_11();
		_;
	}

	/* --------------------Functions-------------------- */

	// TODO change to initializer in upgradeable version
	constructor(
		IGiftyToken giftyToken,
		address payable piggyBox,
		uint256 minGiftPriceInUsd,
		uint256 refundGiftWithCommissionThreshold,
		uint256 freeRefundGiftThreshold,
		uint256 giftRefundCommission,
		AggregatorV3Interface priceFeedForETH,
		address uniswapFactory,
		address stablecoin,
		uint24 uniswapFee
	)
		GiftyController(
			giftyToken,
			piggyBox,
			minGiftPriceInUsd,
			refundGiftWithCommissionThreshold,
			freeRefundGiftThreshold,
			giftRefundCommission,
			priceFeedForETH,
			stablecoin,
			uniswapFactory,
			uniswapFee
		)
	{}

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
		uint256 giftPriceInUSD = _calculateGiftPrice(ETH, amount);

		_validateMinimalGiftPrice(giftPriceInUSD);
		_chargeCommission(ETH, amount, giftPriceInUSD, TypeOfCommission.ETH);
		_createGift(receiver, ETH, amount, giftPriceInUSD, TypeOfGift.ETH);
	}

	// TODO
	function giftETHWithGFTCommission(
		address receiver
	) external payable nonReentrant validateReceiver(receiver) {
		// address ETH = _getETHAddress();
		// uint256 giftPriceInUSD = _calculateGiftPrice(ETH, msg.value);
	}

	/**
	 * @notice Token gifting function.
	 * @notice The token you are trying to gift must be included in the allowed tokens.
	 * @notice The price of the gift must exceed the minimum gift price threshold.
	 * @notice You will be charged the amount of tokens equal to the number of tokens to the gift + commission.
	 * @notice The amount of the gift may be less than the amount you specified in case the token you are sending has an internal commission.
	 *
	 * @param receiver - Address to whom you want to send the gift
	 * @param asset - The address of the token you want to give
	 * @param amount - How much do you want to give the receiver
	 */
	function giftToken(
		address receiver,
		address asset,
		uint256 amount
	) external validateReceiver(receiver) {
		if (!s_tokenInfo[asset].isTokenAllowed) revert Gifty__error_16(asset);

		uint256 giftPriceInUSD = _calculateGiftPrice(asset, amount);
		_validateMinimalGiftPrice(giftPriceInUSD);

		uint256 chargedCommission = _chargeCommission(
			asset,
			amount,
			giftPriceInUSD,
			TypeOfCommission.TOKEN
		);

		uint256 transferedAmount = _transferIn(asset, msg.sender, amount + chargedCommission);

		uint256 amountToGift = transferedAmount - chargedCommission;

		_createGift(receiver, asset, amountToGift, giftPriceInUSD, TypeOfGift.FT);
	}

	// TODO
	function giftTokenWithGFTCommission(
		address receiver,
		address tokenToGift,
		uint256 amount
	) external validateReceiver(receiver) {
		// uint256 giftPriceInUSD = _calculateGiftPrice(tokenToGift, amount);
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

	function _validateGiftUnpacking(
		address unpacker,
		bool isClaimed,
		bool isRefunded
	) internal view {
		if (unpacker != msg.sender) revert Gifty__error_12();
		else if (isClaimed) revert Gifty__error_13();
		else if (isRefunded) revert Gifty__error_14();
	}

	function _chargeCommission(
		address asset,
		uint256 assetAmount,
		uint256 amountInUSD,
		TypeOfCommission commissionType
	) internal returns (uint256 commissionCharged) {
		// Get a commission interest rate for the gift.
		(uint256 commissionRate /* uint256 commissionRateGFT */, ) = getCommissionRate();

		if (commissionType == TypeOfCommission.GFT) {
			// TODO commission GFT TOKEN: 25% free
		} else if (commissionType == TypeOfCommission.TOKEN) {
			commissionCharged = _calculateCommission(assetAmount, commissionRate);

			s_giftyCommission[asset] += commissionCharged;
			_updateTheUserFinInfo(amountInUSD, commissionRate);
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
			uint256 commissionShouldBePaid = _calculateCommission(assetAmount, commissionRate);

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

			// Calculate and update financial information in dollar terms
			_updateTheUserFinInfo(amountInUSD, commissionRate);

			commissionCharged = commissionShouldBePaid;
		}
	}

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

	function _sendGift(TypeOfGift giftType, IERC20 token, uint256 amount) internal {
		if (giftType == TypeOfGift.FT) {
			token.safeTransfer(msg.sender, amount);
		} else if (giftType == TypeOfGift.ETH) {
			payable(msg.sender).sendETH(amount);
		} else {
			// NFT or revert
		}
	}

	function _calculateCommission(
		uint256 amount,
		uint256 commissionRate
	) internal pure returns (uint256) {
		uint256 minimumValue = 10000;
		if (amount < minimumValue) revert Gifty__error_2(amount, minimumValue);

		uint256 decimals = 2;
		return (amount * commissionRate) / (100 * 10 ** decimals);
	}

	function _calculateGiftPrice(address asset, uint256 amount) internal view returns (uint256) {
		AggregatorV3Interface assetPriceFeed = _getPriceFeed(asset);
		return amount.getConversionRate(assetPriceFeed);
	}

	function _blockNumber() internal view returns (uint32) {
		return block.number.toUint32();
	}

	function _blockTimestamp() internal view returns (uint40) {
		return block.timestamp.toUint40();
	}

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

	function _getTokenBalance(address token) internal view returns (uint256) {
		(bool success, bytes memory data) = token.staticcall(
			abi.encodeWithSelector(IERC20.balanceOf.selector, address(this))
		);

		if (!success || data.length < 32) revert Gifty__error_19();
		return abi.decode(data, (uint256));
	}

	function _getPriceOfExactAmountUniswapV3(
		uint256 amount,
		address tokenIn,
		address tokenOut,
		uint24 fee,
		uint32 secondsAgo
	) internal view returns (uint256) {
		address pool = s_uniswapFactory.getPool(tokenIn, tokenOut, fee);

		(int24 tick, ) = OracleLibrary.consult(pool, secondsAgo);
		uint256 price = OracleLibrary.getQuoteAtTick(tick, amount.toUint128(), tokenIn, tokenOut);

		if (price == 0) revert Gifty__error_22();

		return price;
	}

	/* --------------------Private functions-------------------- */

	function _validateMinimalGiftPrice(uint256 giftPrice) private view {
		uint256 minimalGiftPriceUSD = s_minGiftPriceInUsd;
		if (minimalGiftPriceUSD > giftPrice) revert Gifty__error_9(giftPrice, minimalGiftPriceUSD);
	}

	/* --------------------Getter functions-------------------- */

	// TODO commission rate? Grades? Roles?
	/**
	 * @dev Return values of the commission rate with decimals 2
	 *
	 * @return uint256 - The usual commission rate
	 * @return uint256 - Reduced commission rate when the user pays in GFT tokens.
	 */
	function getCommissionRate() public pure returns (uint256, uint256) {
		return (100, 75);
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

	function getRefundSettings() external view returns (GiftRefundSettings memory) {
		return s_giftRefundSettings;
	}

	function getOverpaidETHAmount(address user) external view returns (uint256) {
		return s_commissionSurplusesETH[user];
	}

	function getUserInfo(address user) external view returns (UserInfo memory) {
		return s_userInformation[user];
	}

	function getUsersReceivedGiftBatche(
		address user,
		uint256 offsetFromLastGift,
		uint256 amountOfGifts
	) external view returns (Gift[] memory) {
		uint256[] memory currentUserReceivedGifts = s_userInformation[user].receivedGifts;
		return _getExactGifts(currentUserReceivedGifts, offsetFromLastGift, amountOfGifts);
	}

	function getUsersGivenGiftBatche(
		address user,
		uint256 offsetFromLastGift,
		uint256 amountOfGifts
	) external view returns (Gift[] memory) {
		uint256[] memory currentUserGivenGifts = s_userInformation[user].givenGifts;
		return _getExactGifts(currentUserGivenGifts, offsetFromLastGift, amountOfGifts);
	}

	function _getExactGifts(
		uint256[] memory indexesOfGifts,
		uint256 offsetFromLastGift,
		uint256 amountOfGifts
	) internal view returns (Gift[] memory) {
		// If offset gt length of the given array - revert
		if (indexesOfGifts.length < offsetFromLastGift)
			revert Gifty__error_17(offsetFromLastGift, indexesOfGifts.length);

		// Get index of the first element
		uint256 indexOfFirstDesiredGift = (indexesOfGifts.length - 1) - offsetFromLastGift;

		// If amount of elements gt remaining elements - revert
		if (indexOfFirstDesiredGift + 1 < amountOfGifts) revert Gifty__error_18();

		// New array, which will be returned
		Gift[] memory result = new Gift[](amountOfGifts);

		// Fill the array with desired elements
		for (uint256 i; i < amountOfGifts; i++) {
			uint256 giftIndex = indexesOfGifts[indexOfFirstDesiredGift - i];
			result[i] = s_allGifts[giftIndex];
		}

		return result;
	}

	function version() external pure returns (uint256) {
		return 1;
	}
}
