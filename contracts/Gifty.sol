// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

// ! EXAMPLE
/* -------------------- -------------------- */

/* --------------------Gifty-------------------- */
import "./interfaces/IGifty.sol";
import "./GiftyController.sol";

/* --------------------Libs-------------------- */
import "./GiftyLibraries/PriceConverter.sol";

/* --------------------Utils-------------------- */
import "./utils/ReentrancyGuard.sol";

contract Gifty is IGifty, GiftyController, ReentrancyGuard {
	using ExternalAccountsInteraction for address payable;
	using PriceConverter for uint256;
	using SafeERC20 for IERC20;
	using SafeCast for uint256;

	enum TypeOfCommission {
		DEFAULT, // 0
		ETH,
		GFT,
		TOKEN
	}

	/**
	 * @notice ETH - Native cryptocurrency of blockchain
	 * @notice FT - Fungigle tokens, backward compatible with ERC-20
	 * @notice NFT - Non-fungible token
	 */
	enum TypeOfGift {
		DEFAULT, // 0
		ETH,
		FT,
		NFT
	}

	struct FinancialInfo {
		uint128 totalTurnoverInUSD; // -----|
		uint128 commissionPayedInUSD; // ---|
	}

	// TODO: thats all?
	struct UserInfo {
		uint256[] givenGifts;
		uint256[] receivedGifts;
		FinancialInfo finInfo;
	}

	// prettier-ignore
	struct Gift {
		address giver;
		address receiver;       // -----| uint96 - In order to rest against the maximum value,
		uint96 amountInUSD;     // -----| the user needs to give a gift in the amount of $79_228_162_514,26...35
		uint256 amount;
		IERC20 asset;           // 20 bytes ----------------|
		TypeOfGift giftType;    // 1 byte (uint8) ----------|
		uint72 giftedAtBlock;   // 9 bytes -----------------|
		bool isClaimed;         // 1 byte ------------------|
		bool isRefunded;        // 1 byte ------------------|
	}

	Gift[] internal s_allGifts;

	/** @notice All related address information */
	mapping(address => UserInfo) internal s_userInformation;

	/** @notice The amount that the user overpaid when giving ETH */
	mapping(address => uint256) private s_commissionSurplusesETH;

	event GiftCreated(
		address indexed giver,
		address indexed receiver,
		address indexed giftedToken,
		uint256 amount
	);
	event GiftClaimed(uint256 giftId);
	event SurplusesClaimed(address indexed claimer, uint256 amount);
	event GiftRefunded(uint256 giftId);

	modifier validateReceiver(address receiver) {
		if (receiver == msg.sender) revert Gifty__error_11();
		_;
	}

	constructor(
		IGiftyToken giftyToken,
		address payable piggyBox,
		uint256 minGiftPriceInUsd,
		uint256 refundGiftWithCommissionThreshold,
		uint256 freeRefundGiftThreshold,
		uint256 giftRefundCommission,
		address[] memory tokenForPriceFeeds,
		AggregatorV3Interface[] memory priceFeeds,
		AggregatorV3Interface priceFeedForETH
	)
		GiftyController(
			giftyToken,
			piggyBox,
			minGiftPriceInUsd,
			tokenForPriceFeeds,
			priceFeeds,
			priceFeedForETH,
			refundGiftWithCommissionThreshold,
			freeRefundGiftThreshold,
			giftRefundCommission
		)
	{}

	function giftETH(address receiver, uint256 amount)
		external
		payable
		nonReentrant
		validateReceiver(receiver)
	{
		address ETH = _getETHAddress();
		uint256 giftPriceInUSD = _calculateGiftPrice(ETH, amount);

		_validateMinimalGiftPrice(giftPriceInUSD);
		_chargeCommission(ETH, amount, giftPriceInUSD, TypeOfCommission.ETH);
		_createGift(receiver, ETH, amount, giftPriceInUSD, TypeOfGift.ETH);
	}

	function giftETHWithGFTCommission(address receiver)
		external
		payable
		nonReentrant
		validateReceiver(receiver)
	{
		// address ETH = _getETHAddress();
		// uint256 giftPriceInUSD = _calculateGiftPrice(ETH, msg.value);
	}

	function giftToken(
		address receiver,
		address tokenToGift,
		uint256 amount
	) external validateReceiver(receiver) {
		// uint256 giftPriceInUSD = _calculateGiftPrice(tokenToGift, amount);
	}

	function giftTokenWithGFTCommission(
		address receiver,
		address tokenToGift,
		uint256 amount
	) external validateReceiver(receiver) {
		// uint256 giftPriceInUSD = _calculateGiftPrice(tokenToGift, amount);
	}

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

	function refundGift(uint256 giftId) external nonReentrant {
		Gift memory currentGift = s_allGifts[giftId];

		_validateGiftUnpacking(currentGift.giver, currentGift.isClaimed, currentGift.isRefunded);

		GiftRefundSettings memory refundSettings = s_giftRefundSettings;
		uint256 blockDifference = block.number - currentGift.giftedAtBlock;

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
			_updateTheUserFinInfo(
				currentGift.amountInUSD,
				refundSettings.giftRefundCommission,
				true
			);
		}
		// More blocks have passed than the free withdrawal threshold
		else if (blockDifference > refundSettings.freeRefundGiftThreshold) {
			refundAmount = currentGift.amount;
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
	) internal {
		// Get a commission interest rate for the gift.
		(
			uint256 commissionRate, /* uint256 commissionRateGFT */

		) = getCommissionRate();

		if (commissionType == TypeOfCommission.GFT) {
			// TODO commission GFT TOKEN: 25% free
		} else if (commissionType == TypeOfCommission.TOKEN) {
			// TODO commission token - 100% paid from token
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
			_updateTheUserFinInfo(amountInUSD, commissionRate, false);
		}
	}

	function _updateTheUserFinInfo(
		uint256 giftPriceInUSD,
		uint256 commissionRate,
		bool isRefund
	) internal {
		/*
            Calculate the equivalent of the gift amount and commission in USD,
            for accounting in the personal account and issuing statuses.
        */
		uint256 commissionInUSD = _calculateCommission(giftPriceInUSD, commissionRate);

		// Updating the user's financial information
		FinancialInfo storage currentUserFinInfo = s_userInformation[msg.sender].finInfo;

		if (!isRefund) {
			currentUserFinInfo.totalTurnoverInUSD += giftPriceInUSD.toUint128();
			currentUserFinInfo.commissionPayedInUSD += commissionInUSD.toUint128();
		} else {
			currentUserFinInfo.totalTurnoverInUSD -= giftPriceInUSD.toUint128();
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
			giftedAtBlock: (block.number).toUint72(),
			isClaimed: false,
			isRefunded: false
		});

		uint256 newGiftIndex = s_allGifts.length;
		s_allGifts.push(newGift);

		s_userInformation[msg.sender].givenGifts.push(newGiftIndex);
		s_userInformation[receiver].receivedGifts.push(newGiftIndex);

		emit GiftCreated(msg.sender, receiver, assetToGift, assetAmount);
	}

	function _sendGift(
		TypeOfGift giftType,
		IERC20 token,
		uint256 amount
	) internal {
		if (giftType == TypeOfGift.FT) {
			token.safeTransfer(msg.sender, amount);
		} else if (giftType == TypeOfGift.ETH) {
			payable(msg.sender).sendETH(amount);
		} else {
			// NFT or revert
		}
	}

	function _calculateCommission(uint256 amount, uint256 commissionRate)
		internal
		pure
		returns (uint256)
	{
		uint256 minimumValue = 10000;
		if (amount < minimumValue) revert Gifty__error_2(amount, minimumValue);

		uint256 decimals = 2;
		return (amount * commissionRate) / (100 * 10**decimals);
	}

	function _calculateGiftPrice(address asset, uint256 amount) internal view returns (uint256) {
		AggregatorV3Interface assetPriceFeed = _getPriceFeed(asset);
		return amount.getConversionRate(assetPriceFeed);
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

	function version() external pure returns (uint256) {
		return 1;
	}
}
