// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title EthscribeMarketV1
/// @notice ESIP-2 vault and marketplace for Ethscriptions.
/// @dev Ethscriptions ownership is interpreted by an offchain indexer. A potential deposit
///      is not proof that the depositor owned the Ethscription. First-party clients MUST
///      reconcile current_owner == address(this) and previous_owner == depositor before
///      presenting a deposit, listing, or offer as valid.
contract EthscribeMarketV1 is Ownable2Step, Pausable, ReentrancyGuard {
    uint32 public constant MARKET_VERSION = 1;
    uint16 public constant FEE_BPS = 500;
    uint16 public constant BPS_DENOMINATOR = 10_000;
    uint64 public constant TRANSFER_COOLDOWN_BLOCKS = 5;
    uint256 public constant MAX_BATCH_SIZE = 100;
    uint256 private constant ETHSCRIPTION_ID_BYTES = 32;

    enum OfferState {
        None,
        Active,
        Cancelled,
        Accepted
    }

    enum ReleaseKind {
        Withdrawal,
        FixedPriceSale,
        AcceptedOffer
    }

    struct PotentialDeposit {
        uint256 receivedBlock;
        uint64 nonce;
        bool active;
    }

    struct Listing {
        uint128 price;
        uint64 depositNonce;
        uint64 listingNonce;
        uint64 expiry;
        address onlyBuyer;
        address feeRecipient;
        bytes32 contextHash;
    }

    struct Offer {
        address bidder;
        address seller;
        address feeRecipient;
        bytes32 ethscriptionId;
        bytes32 contextHash;
        uint128 amount;
        uint64 depositNonce;
        uint64 expiry;
        OfferState state;
    }

    error AmountTooLarge();
    error BatchTooLarge();
    error CooldownActive(uint256 additionalBlocksNeeded);
    error DepositAlreadyActive();
    error DepositNotActive();
    error DirectEtherNotAccepted();
    error EtherTransferFailed();
    error FeeRecipientOnly();
    error InvalidBatchLength();
    error InvalidDepositDataLength();
    error InvalidExpiry();
    error InvalidPrice();
    error ListingNotActive();
    error ListingExpired();
    error ListingRestricted();
    error ListingTermsChanged();
    error NoClaimableBalance();
    error OfferExpired();
    error OfferNotActive();
    error SelfPurchase();
    error StaleDeposit();
    error UnauthorizedBidder();
    error UnauthorizedSeller();
    error UnexpectedEther();
    error ZeroAddress();
    error ZeroEthscriptionId();
    error OwnershipRenunciationDisabled();

    /// @dev ESIP-2 event consumed by Ethscriptions indexers.
    event ethscriptions_protocol_TransferEthscriptionForPreviousOwner(
        address indexed previousOwner, address indexed recipient, bytes32 indexed ethscriptionId
    );

    event PotentialDepositRecorded(
        address indexed depositor, bytes32 indexed ethscriptionId, uint64 indexed depositNonce, uint256 receivedBlock
    );
    event PotentialDepositReleased(
        address indexed depositor,
        address indexed recipient,
        bytes32 indexed ethscriptionId,
        uint64 depositNonce,
        ReleaseKind kind
    );
    event ListingCreated(
        address indexed seller,
        bytes32 indexed ethscriptionId,
        uint64 indexed listingNonce,
        uint64 depositNonce,
        uint128 price,
        address onlyBuyer,
        uint64 expiry,
        address feeRecipient,
        bytes32 contextHash
    );
    event ListingCancelled(address indexed seller, bytes32 indexed ethscriptionId, uint64 indexed listingNonce);
    event FixedPriceSale(
        address indexed seller,
        address indexed buyer,
        bytes32 indexed ethscriptionId,
        uint64 listingNonce,
        uint256 price,
        uint256 fee,
        address feeRecipient,
        bytes32 contextHash
    );
    event OfferCreated(
        uint256 indexed offerId,
        address indexed bidder,
        address indexed seller,
        bytes32 ethscriptionId,
        uint64 depositNonce,
        uint128 amount,
        uint64 expiry,
        address feeRecipient,
        bytes32 contextHash
    );
    event OfferCancelled(uint256 indexed offerId, address indexed bidder, uint256 amount);
    event OfferAccepted(
        uint256 indexed offerId,
        address indexed seller,
        address indexed bidder,
        bytes32 ethscriptionId,
        uint256 amount,
        uint256 fee,
        address feeRecipient,
        bytes32 contextHash
    );
    event FundsCredited(address indexed account, uint256 amount);
    event FundsClaimed(address indexed account, address indexed recipient, uint256 amount);
    event FeeRecipientChangeStarted(address indexed currentRecipient, address indexed pendingRecipient);
    event FeeRecipientChanged(address indexed previousRecipient, address indexed newRecipient);

    mapping(address depositor => mapping(bytes32 ethscriptionId => PotentialDeposit)) public potentialDeposits;
    mapping(address seller => mapping(bytes32 ethscriptionId => Listing)) public listings;
    mapping(address seller => mapping(bytes32 ethscriptionId => uint64)) public listingNonceCounters;
    mapping(uint256 offerId => Offer) public offers;
    mapping(address account => uint256) public claimable;

    address public feeRecipient;
    address public pendingFeeRecipient;
    uint256 public nextOfferId = 1;
    uint256 public lockedOfferTotal;
    uint256 public totalClaimable;

    constructor(address initialOwner, address initialFeeRecipient) Ownable(initialOwner) {
        if (initialFeeRecipient == address(0)) revert ZeroAddress();
        feeRecipient = initialFeeRecipient;
        emit FeeRecipientChanged(address(0), initialFeeRecipient);
        _pause();
    }

    /// @notice Records one or more packed 32-byte potential Ethscription IDs.
    /// @dev A raw Ethscription transfer uses this fallback. No ownership conclusion is made here.
    fallback() external payable whenNotPaused {
        if (msg.value != 0) revert UnexpectedEther();
        uint256 dataLength = msg.data.length;
        if (dataLength == 0 || dataLength % ETHSCRIPTION_ID_BYTES != 0) revert InvalidDepositDataLength();

        uint256 count = dataLength / ETHSCRIPTION_ID_BYTES;
        if (count > MAX_BATCH_SIZE) revert BatchTooLarge();

        for (uint256 i = 0; i < count; ++i) {
            bytes32 ethscriptionId;
            assembly ("memory-safe") {
                ethscriptionId := calldataload(shl(5, i))
            }
            _recordPotentialDeposit(msg.sender, ethscriptionId);
        }
    }

    receive() external payable {
        revert DirectEtherNotAccepted();
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function renounceOwnership() public view override onlyOwner {
        revert OwnershipRenunciationDisabled();
    }

    function proposeFeeRecipient(address nextRecipient) external onlyOwner {
        if (nextRecipient == address(0)) revert ZeroAddress();
        pendingFeeRecipient = nextRecipient;
        emit FeeRecipientChangeStarted(feeRecipient, nextRecipient);
    }

    function acceptFeeRecipient() external {
        if (msg.sender != pendingFeeRecipient) revert FeeRecipientOnly();
        address previousRecipient = feeRecipient;
        feeRecipient = msg.sender;
        pendingFeeRecipient = address(0);
        emit FeeRecipientChanged(previousRecipient, msg.sender);
    }

    function blocksRemainingUntilTransfer(address depositor, bytes32 ethscriptionId) public view returns (uint256) {
        PotentialDeposit storage deposit = potentialDeposits[depositor][ethscriptionId];
        if (!deposit.active) revert DepositNotActive();

        uint256 blocksPassed = block.number - uint256(deposit.receivedBlock);
        return blocksPassed < TRANSFER_COOLDOWN_BLOCKS ? TRANSFER_COOLDOWN_BLOCKS - blocksPassed : 0;
    }

    function withdrawEthscription(bytes32 ethscriptionId, address recipient) external nonReentrant {
        _withdrawEthscription(msg.sender, ethscriptionId, recipient);
    }

    function withdrawBatchEthscriptions(bytes32[] calldata ethscriptionIds, address recipient) external nonReentrant {
        uint256 length = ethscriptionIds.length;
        if (length == 0 || length > MAX_BATCH_SIZE) revert InvalidBatchLength();
        if (recipient == address(0)) revert ZeroAddress();

        for (uint256 i = 0; i < length; ++i) {
            _withdrawEthscription(msg.sender, ethscriptionIds[i], recipient);
        }
    }

    function createListing(bytes32 ethscriptionId, uint128 price, address onlyBuyer, uint64 expiry, bytes32 contextHash)
        external
        whenNotPaused
        returns (uint64 listingNonce)
    {
        if (price == 0) revert InvalidPrice();
        if (expiry != 0 && expiry <= block.timestamp) revert InvalidExpiry();

        PotentialDeposit storage deposit = _requireTransferReady(msg.sender, ethscriptionId);
        listingNonce = ++listingNonceCounters[msg.sender][ethscriptionId];

        listings[msg.sender][ethscriptionId] = Listing({
            price: price,
            depositNonce: deposit.nonce,
            listingNonce: listingNonce,
            expiry: expiry,
            onlyBuyer: onlyBuyer,
            feeRecipient: feeRecipient,
            contextHash: contextHash
        });

        emit ListingCreated(
            msg.sender, ethscriptionId, listingNonce, deposit.nonce, price, onlyBuyer, expiry, feeRecipient, contextHash
        );
    }

    function cancelListing(bytes32 ethscriptionId) external {
        _cancelListing(msg.sender, ethscriptionId, true);
    }

    function buy(address seller, bytes32 ethscriptionId, uint64 expectedListingNonce, uint128 expectedPrice)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        if (seller == msg.sender) revert SelfPurchase();

        Listing memory listing = listings[seller][ethscriptionId];
        if (listing.price == 0) revert ListingNotActive();
        if (listing.listingNonce != expectedListingNonce || listing.price != expectedPrice) {
            revert ListingTermsChanged();
        }
        if (listing.onlyBuyer != address(0) && listing.onlyBuyer != msg.sender) revert ListingRestricted();
        if (listing.expiry != 0 && block.timestamp >= listing.expiry) revert ListingExpired();
        if (msg.value != listing.price) revert InvalidPrice();

        PotentialDeposit storage deposit = _requireTransferReady(seller, ethscriptionId);
        if (deposit.nonce != listing.depositNonce) revert StaleDeposit();

        uint64 depositNonce = deposit.nonce;
        _consumeDeposit(seller, ethscriptionId);
        uint256 fee = _creditSaleProceeds(seller, listing.feeRecipient, msg.value);

        emit ethscriptions_protocol_TransferEthscriptionForPreviousOwner(seller, msg.sender, ethscriptionId);
        emit PotentialDepositReleased(seller, msg.sender, ethscriptionId, depositNonce, ReleaseKind.FixedPriceSale);
        emit FixedPriceSale(
            seller,
            msg.sender,
            ethscriptionId,
            listing.listingNonce,
            msg.value,
            fee,
            listing.feeRecipient,
            listing.contextHash
        );
    }

    function createOffer(address seller, bytes32 ethscriptionId, uint64 expiry, bytes32 contextHash)
        external
        payable
        whenNotPaused
        returns (uint256 offerId)
    {
        if (seller == msg.sender) revert SelfPurchase();
        if (msg.value == 0) revert InvalidPrice();
        if (msg.value > type(uint128).max) revert AmountTooLarge();
        if (expiry != 0 && expiry <= block.timestamp) revert InvalidExpiry();

        PotentialDeposit storage deposit = _requireTransferReady(seller, ethscriptionId);
        offerId = nextOfferId++;
        offers[offerId] = Offer({
            bidder: msg.sender,
            seller: seller,
            feeRecipient: feeRecipient,
            ethscriptionId: ethscriptionId,
            contextHash: contextHash,
            amount: uint128(msg.value),
            depositNonce: deposit.nonce,
            expiry: expiry,
            state: OfferState.Active
        });
        lockedOfferTotal += msg.value;

        emit OfferCreated(
            offerId,
            msg.sender,
            seller,
            ethscriptionId,
            deposit.nonce,
            uint128(msg.value),
            expiry,
            feeRecipient,
            contextHash
        );
    }

    function cancelOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        if (offer.state != OfferState.Active) revert OfferNotActive();
        if (offer.bidder != msg.sender) revert UnauthorizedBidder();

        uint256 amount = offer.amount;
        offer.state = OfferState.Cancelled;
        lockedOfferTotal -= amount;
        _credit(offer.bidder, amount);

        emit OfferCancelled(offerId, offer.bidder, amount);
    }

    function acceptOffer(uint256 offerId) external nonReentrant whenNotPaused {
        Offer storage storedOffer = offers[offerId];
        if (storedOffer.state != OfferState.Active) revert OfferNotActive();

        Offer memory offer = storedOffer;
        if (offer.seller != msg.sender) revert UnauthorizedSeller();
        if (offer.expiry != 0 && block.timestamp >= offer.expiry) revert OfferExpired();

        PotentialDeposit storage deposit = _requireTransferReady(msg.sender, offer.ethscriptionId);
        if (deposit.nonce != offer.depositNonce) revert StaleDeposit();

        storedOffer.state = OfferState.Accepted;
        lockedOfferTotal -= offer.amount;
        uint64 depositNonce = deposit.nonce;
        _consumeDeposit(msg.sender, offer.ethscriptionId);
        uint256 fee = _creditSaleProceeds(msg.sender, offer.feeRecipient, offer.amount);

        emit ethscriptions_protocol_TransferEthscriptionForPreviousOwner(msg.sender, offer.bidder, offer.ethscriptionId);
        emit PotentialDepositReleased(
            msg.sender, offer.bidder, offer.ethscriptionId, depositNonce, ReleaseKind.AcceptedOffer
        );
        emit OfferAccepted(
            offerId,
            msg.sender,
            offer.bidder,
            offer.ethscriptionId,
            offer.amount,
            fee,
            offer.feeRecipient,
            offer.contextHash
        );
    }

    function claim(address payable recipient) external nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        uint256 amount = claimable[msg.sender];
        if (amount == 0) revert NoClaimableBalance();

        claimable[msg.sender] = 0;
        totalClaimable -= amount;

        emit FundsClaimed(msg.sender, recipient, amount);

        // The caller chooses the recipient and can withdraw only its own credit.
        // forge-lint: disable-next-line(low-level-calls, arbitrary-send-eth)
        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert EtherTransferFailed();
    }

    function totalLiabilities() public view returns (uint256) {
        return totalClaimable + lockedOfferTotal;
    }

    function surplus() external view returns (uint256) {
        return address(this).balance - totalLiabilities();
    }

    function _recordPotentialDeposit(address depositor, bytes32 ethscriptionId) internal {
        if (ethscriptionId == bytes32(0)) revert ZeroEthscriptionId();
        PotentialDeposit storage deposit = potentialDeposits[depositor][ethscriptionId];
        if (deposit.active) revert DepositAlreadyActive();

        uint64 nextNonce = deposit.nonce + 1;
        deposit.receivedBlock = block.number;
        deposit.nonce = nextNonce;
        deposit.active = true;

        emit PotentialDepositRecorded(depositor, ethscriptionId, nextNonce, block.number);
    }

    function _withdrawEthscription(address depositor, bytes32 ethscriptionId, address recipient) internal {
        if (recipient == address(0)) revert ZeroAddress();
        PotentialDeposit storage deposit = _requireTransferReady(depositor, ethscriptionId);
        uint64 depositNonce = deposit.nonce;

        _consumeDeposit(depositor, ethscriptionId);
        emit ethscriptions_protocol_TransferEthscriptionForPreviousOwner(depositor, recipient, ethscriptionId);
        emit PotentialDepositReleased(depositor, recipient, ethscriptionId, depositNonce, ReleaseKind.Withdrawal);
    }

    function _requireTransferReady(address depositor, bytes32 ethscriptionId)
        internal
        view
        returns (PotentialDeposit storage deposit)
    {
        deposit = potentialDeposits[depositor][ethscriptionId];
        if (!deposit.active) revert DepositNotActive();

        uint256 remaining = blocksRemainingUntilTransfer(depositor, ethscriptionId);
        if (remaining != 0) revert CooldownActive(remaining);
    }

    function _consumeDeposit(address depositor, bytes32 ethscriptionId) internal {
        PotentialDeposit storage deposit = potentialDeposits[depositor][ethscriptionId];
        deposit.active = false;
        deposit.receivedBlock = 0;
        _cancelListing(depositor, ethscriptionId, false);
    }

    function _cancelListing(address seller, bytes32 ethscriptionId, bool requireActive) internal {
        Listing memory listing = listings[seller][ethscriptionId];
        if (listing.price == 0) {
            if (requireActive) revert ListingNotActive();
            return;
        }

        delete listings[seller][ethscriptionId];
        emit ListingCancelled(seller, ethscriptionId, listing.listingNonce);
    }

    function _creditSaleProceeds(address seller, address saleFeeRecipient, uint256 grossAmount)
        internal
        returns (uint256 fee)
    {
        fee = grossAmount * FEE_BPS / BPS_DENOMINATOR;
        _credit(seller, grossAmount - fee);
        if (fee != 0) _credit(saleFeeRecipient, fee);
    }

    function _credit(address account, uint256 amount) internal {
        if (amount == 0) return;
        claimable[account] += amount;
        totalClaimable += amount;
        emit FundsCredited(account, amount);
    }
}
