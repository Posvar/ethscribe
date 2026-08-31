// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {EthscribeMarketV1} from "../src/EthscribeMarketV1.sol";
import {TestBase, VmTest} from "./TestBase.sol";

contract EthscribeMarketHandler {
    VmTest private constant VM = VmTest(address(uint160(uint256(keccak256("hevm cheat code")))));

    address public constant SELLER = address(0xA11CE);
    address public constant BUYER = address(0xB0B);
    address public constant BIDDER = address(0xB1D);

    EthscribeMarketV1 public immutable market;

    bytes32[4] private _ethscriptionIds;
    uint256[] private _offerIds;

    constructor(EthscribeMarketV1 market_) {
        market = market_;
        _ethscriptionIds[0] = keccak256("artifact-0");
        _ethscriptionIds[1] = keccak256("artifact-1");
        _ethscriptionIds[2] = keccak256("artifact-2");
        _ethscriptionIds[3] = keccak256("artifact-3");

        VM.deal(BUYER, 1_000_000 ether);
        VM.deal(BIDDER, 1_000_000 ether);
    }

    function deposit(uint256 seed) external {
        bytes32 ethscriptionId = _id(seed);
        VM.prank(SELLER);
        // A failed duplicate deposit is an expected no-op in a randomized sequence.
        (bool success,) = address(market).call(abi.encodePacked(ethscriptionId));
        success;
    }

    function createListing(uint256 seed, uint96 rawPrice) external {
        bytes32 ethscriptionId = _id(seed);
        (,, bool active) = market.potentialDeposits(SELLER, ethscriptionId);
        if (!active || market.blocksRemainingUntilTransfer(SELLER, ethscriptionId) != 0) return;

        uint128 price = uint128(1 + (uint256(rawPrice) % 10 ether));
        VM.prank(SELLER);
        try market.createListing(ethscriptionId, price, address(0), 0, keccak256("expedition-001")) {} catch {}
    }

    function buy(uint256 seed) external {
        bytes32 ethscriptionId = _id(seed);
        (uint128 price,, uint64 listingNonce,,,,) = market.listings(SELLER, ethscriptionId);
        if (price == 0) return;

        VM.prank(BUYER);
        try market.buy{value: price}(SELLER, ethscriptionId, listingNonce, price) {} catch {}
    }

    function createOffer(uint256 seed, uint96 rawAmount) external {
        bytes32 ethscriptionId = _id(seed);
        (,, bool active) = market.potentialDeposits(SELLER, ethscriptionId);
        if (!active || market.blocksRemainingUntilTransfer(SELLER, ethscriptionId) != 0) return;

        uint128 amount = uint128(1 + (uint256(rawAmount) % 10 ether));
        VM.prank(BIDDER);
        try market.createOffer{value: amount}(SELLER, ethscriptionId, 0, keccak256("expedition-001")) returns (
            uint256 offerId
        ) {
            _offerIds.push(offerId);
        } catch {}
    }

    function cancelOffer(uint256 seed) external {
        if (_offerIds.length == 0) return;
        uint256 offerId = _offerIds[seed % _offerIds.length];
        (address bidder,,,,,,,, EthscribeMarketV1.OfferState state) = market.offers(offerId);
        if (state != EthscribeMarketV1.OfferState.Active) return;

        VM.prank(bidder);
        try market.cancelOffer(offerId) {} catch {}
    }

    function acceptOffer(uint256 seed) external {
        if (_offerIds.length == 0) return;
        uint256 offerId = _offerIds[seed % _offerIds.length];
        (, address seller,,,,,,, EthscribeMarketV1.OfferState state) = market.offers(offerId);
        if (state != EthscribeMarketV1.OfferState.Active) return;

        VM.prank(seller);
        try market.acceptOffer(offerId) {} catch {}
    }

    function withdraw(uint256 seed) external {
        bytes32 ethscriptionId = _id(seed);
        (,, bool active) = market.potentialDeposits(SELLER, ethscriptionId);
        if (!active || market.blocksRemainingUntilTransfer(SELLER, ethscriptionId) != 0) return;

        VM.prank(SELLER);
        try market.withdrawEthscription(ethscriptionId, SELLER) {} catch {}
    }

    function claim(uint256 seed) external {
        address account = seed % 3 == 0 ? SELLER : seed % 3 == 1 ? BIDDER : market.feeRecipient();
        if (market.claimable(account) == 0) return;

        VM.prank(account);
        try market.claim(payable(account)) {} catch {}
    }

    function advance(uint8 additionalBlocks, uint16 additionalSeconds) external {
        VM.roll(block.number + 1 + (uint256(additionalBlocks) % 10));
        VM.warp(block.timestamp + 1 + (uint256(additionalSeconds) % 1 days));
    }

    function ethscriptionIdAt(uint256 index) external view returns (bytes32) {
        return _ethscriptionIds[index];
    }

    function offerCount() external view returns (uint256) {
        return _offerIds.length;
    }

    function offerIdAt(uint256 index) external view returns (uint256) {
        return _offerIds[index];
    }

    function _id(uint256 seed) private view returns (bytes32) {
        return _ethscriptionIds[seed % _ethscriptionIds.length];
    }
}

contract EthscribeMarketV1InvariantTest is TestBase {
    struct FuzzSelector {
        address addr;
        bytes4[] selectors;
    }

    struct FuzzArtifactSelector {
        string artifact;
        bytes4[] selectors;
    }

    struct FuzzInterface {
        address addr;
        string[] artifacts;
    }

    address private constant OWNER = address(0x0A11);
    address private constant FEE_RECIPIENT = address(0xFEE);

    EthscribeMarketV1 private market;
    EthscribeMarketHandler private handler;
    address[] private _targetContracts;

    function setUp() public {
        market = new EthscribeMarketV1(OWNER, FEE_RECIPIENT);
        vm.prank(OWNER);
        market.unpause();
        handler = new EthscribeMarketHandler(market);
        _targetContracts.push(address(handler));
    }

    /// @dev Foundry's invariant runner calls this standard target discovery function.
    function targetContracts() external view returns (address[] memory) {
        return _targetContracts;
    }

    function targetArtifactSelectors() external pure returns (FuzzArtifactSelector[] memory) {
        return new FuzzArtifactSelector[](0);
    }

    function targetArtifacts() external pure returns (string[] memory) {
        return new string[](0);
    }

    function excludeArtifacts() external pure returns (string[] memory) {
        return new string[](0);
    }

    function targetSenders() external pure returns (address[] memory) {
        return new address[](0);
    }

    function excludeSenders() external pure returns (address[] memory) {
        return new address[](0);
    }

    function excludeContracts() external pure returns (address[] memory) {
        return new address[](0);
    }

    function targetInterfaces() external pure returns (FuzzInterface[] memory) {
        return new FuzzInterface[](0);
    }

    function targetSelectors() external pure returns (FuzzSelector[] memory) {
        return new FuzzSelector[](0);
    }

    function excludeSelectors() external pure returns (FuzzSelector[] memory) {
        return new FuzzSelector[](0);
    }

    function invariant_EveryWeiIsAccountedFor() public view {
        assertEq(address(market).balance, market.totalLiabilities(), "balance must equal liabilities");
        assertEq(market.totalLiabilities(), market.totalClaimable() + market.lockedOfferTotal(), "liability components");
    }

    function invariant_ClaimableTotalMatchesKnownParticipants() public view {
        uint256 knownClaimable =
            market.claimable(handler.SELLER()) + market.claimable(handler.BIDDER()) + market.claimable(FEE_RECIPIENT);
        assertEq(market.totalClaimable(), knownClaimable, "claimable participant sum");
    }

    function invariant_LockedOfferTotalMatchesActiveOffers() public view {
        uint256 activeOfferTotal;
        uint256 count = handler.offerCount();
        for (uint256 i = 0; i < count; ++i) {
            uint256 offerId = handler.offerIdAt(i);
            (,,,,, uint128 amount,,, EthscribeMarketV1.OfferState state) = market.offers(offerId);
            if (state == EthscribeMarketV1.OfferState.Active) activeOfferTotal += amount;
        }
        assertEq(market.lockedOfferTotal(), activeOfferTotal, "active offer sum");
    }

    function invariant_ListingsAlwaysReferenceAnActiveDepositGeneration() public view {
        for (uint256 i = 0; i < 4; ++i) {
            bytes32 ethscriptionId = handler.ethscriptionIdAt(i);
            (uint128 price, uint64 listingDepositNonce,,,,,) = market.listings(handler.SELLER(), ethscriptionId);
            if (price == 0) continue;

            (, uint64 activeDepositNonce, bool active) = market.potentialDeposits(handler.SELLER(), ethscriptionId);
            assertTrue(active, "listing deposit must remain active");
            assertEq(uint256(listingDepositNonce), uint256(activeDepositNonce), "listing deposit generation");
        }
    }

    function invariant_ProtocolFeeIsFixedAtFivePercent() public view {
        assertEq(uint256(market.FEE_BPS()), 500, "fixed fee");
        assertEq(uint256(market.BPS_DENOMINATOR()), 10_000, "basis point denominator");
    }
}
