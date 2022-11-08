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
		uint128 totalTurnoverInUSD; // ----|
		uint128 commissionPayedInUSD; //---|
	}

	// TODO: thats all?
	struct UserInfo {
		uint256[] givenGifts;
		uint256[] receivedGifts;
		FinancialInfo finInfo;
	}

	struct Gift {
		address giver;
		address receiver;
		uint256 amount;
		IERC20 giftToken; // 20 bytes ----------------|
		uint80 giftedAtBlock; // 10 bytes ------------|
		TypeOfGift giftType; // 1 byte (uint8) -------|
		bool isClaimed; // 1 byte --------------------|
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
	event SurplusesClaimed(address indexed claimer, uint256 amount);

	modifier validateReceiver(address receiver) {
		if (receiver == msg.sender) revert Gifty__error_11();
		_;
	}

	modifier validateGiftPrice(address gift, uint256 amount) {
		_validateMinimumGiftPrice(gift, amount);
		_;
	}

	constructor(
		IGiftyToken giftyToken,
		address payable piggyBox,
		uint256 minGiftPriceInUsd,
		address[] memory tokenForPriceFeeds,
		AggregatorV3Interface[] memory priceFeeds,
		AggregatorV3Interface priceFeedForETH,
		uint256 refundGiftWithCommissionThreshold,
		uint256 freeRefundGiftThreshold,
		uint256 giftRefundCommission
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
		validateGiftPrice(_getETHAddress(), amount)
	{
		// TODO to be tested first
		_chargeCommission(amount, TypeOfCommission.ETH);
		_createGift(receiver, amount, IERC20(_getETHAddress()), TypeOfGift.ETH);
	}

	function giftETHWithGFTCommission(address receiver)
		external
		payable
		nonReentrant
		validateReceiver(receiver)
		validateGiftPrice(_getETHAddress(), msg.value)
	{}

	function giftToken(
		address receiver,
		address tokenToGift,
		uint256 amount
	) external validateReceiver(receiver) validateGiftPrice(tokenToGift, amount) {}

	function giftTokenWithGFTCommission(
		address receiver,
		address tokenToGift,
		uint256 amount
	) external validateReceiver(receiver) validateGiftPrice(tokenToGift, amount) {}

	function claimGift(address from, uint256 nonce) external nonReentrant {}

	function claimSurplusesETH() external {
		uint256 surpluses = s_commissionSurplusesETH[msg.sender];
		if (surpluses == 0) revert Gifty__error_7();

		// TODO test reentrancy
		delete s_commissionSurplusesETH[msg.sender];

		payable(msg.sender).sendETH(surpluses);
		emit SurplusesClaimed(msg.sender, surpluses);
	}

	/* --------------------Internal functions-------------------- */

	function _validateMinimumGiftPrice(address mainGift, uint256 amount) internal view {
		AggregatorV3Interface priceFeed = _getPriceFeed(mainGift);

		uint256 currentGiftPriceUSD = amount.getConversionRate(priceFeed);
		uint256 minimumGiftPriceUSD = s_minGiftPriceInUsd;

		if (minimumGiftPriceUSD > currentGiftPriceUSD)
			revert Gifty__error_9(currentGiftPriceUSD, minimumGiftPriceUSD);
	}

	function _chargeCommission(uint256 amount, TypeOfCommission commissionType) internal {
		// Get a commission interest rate for the gift.
		(
			uint256 commissionRate, /* uint256 commissionRateGFT */

		) = getCommissionRate();

		if (commissionType == TypeOfCommission.GFT) {
			// TODO commission GFT TOKEN: 25% free
		} else if (commissionType == TypeOfCommission.TOKEN) {
			// TODO commission token - 100% paid from token
		} else {
			if (msg.value < amount) revert Gifty__error_5(amount, msg.value);

			address ETH = _getETHAddress();
			/* 
                When giving ETH and paying commission in ETH - 
                commission it will be charged from the delta, which is calculated by the formula:
                total transferred - the amount of the gift.
                The excess will be returned to the sender.
            */
			uint256 commissionPaid;
			unchecked {
				commissionPaid = msg.value - amount;
			}

			// What is the commission amount for this gift?
			uint256 commissionShouldBePaid = _calculateCommission(amount, commissionRate);

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
				s_giftyCommission[ETH] += commissionShouldBePaid;
			}

			// Get price feed (ETH / USD)
			// About this address:
			// https://ethereum.stackexchange.com/questions/87352/why-does-this-address-have-a-balance
			AggregatorV3Interface priceFeedETH = _getPriceFeed(ETH);

			// Calculate and update financial information in dollar terms
			_updateTheUserFinInfo(amount, commissionRate, priceFeedETH);
		}
	}

	function _calculateGiftPriceAndCommissionInUSD(
		uint256 amount,
		uint256 commissionRate,
		AggregatorV3Interface priceFeed
	) internal view returns (uint256 giftPriceInUSD, uint256 commissionInUSD) {
		giftPriceInUSD = amount.getConversionRate(priceFeed);
		commissionInUSD = _calculateCommission(giftPriceInUSD, commissionRate);
	}

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

	function _updateTheUserFinInfo(
		uint256 amount,
		uint256 commissionRate,
		AggregatorV3Interface priceFeed
	) internal {
		/*
            Calculate the equivalent of the gift amount and commission in USD,
            for accounting in the personal account and issuing statuses.
        */
		(uint256 giftPriceInUSD, uint256 commissionInUSD) = _calculateGiftPriceAndCommissionInUSD(
			amount,
			commissionRate,
			priceFeed
		);

		// Updating the user's financial information
		FinancialInfo storage currentUserFinInfo = s_userInformation[msg.sender].finInfo;

		currentUserFinInfo.totalTurnoverInUSD += giftPriceInUSD.toUint128();
		currentUserFinInfo.commissionPayedInUSD += commissionInUSD.toUint128();
	}

	function _createGift(
		address receiver,
		uint256 amount,
		IERC20 currentTokenToGift,
		TypeOfGift currentGiftType
	) internal {
		Gift memory newGift = Gift({
			giver: msg.sender,
			receiver: receiver,
			amount: amount,
			giftToken: currentTokenToGift,
			giftType: currentGiftType,
			giftedAtBlock: (block.number).toUint80(),
			isClaimed: false
		});

		uint256 newGiftIndex = s_allGifts.length;
		s_allGifts.push(newGift);

		s_userInformation[msg.sender].givenGifts.push(newGiftIndex);
		s_userInformation[receiver].receivedGifts.push(newGiftIndex);

		emit GiftCreated(msg.sender, receiver, address(currentTokenToGift), amount);
	}

	/* --------------------Getter functions-------------------- */

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
