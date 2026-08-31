// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {EthscribeMarketV1} from "../src/EthscribeMarketV1.sol";
import {TestBase, VmTest} from "./TestBase.sol";

contract RejectEther {
    receive() external payable {
        revert("NO_ETH");
    }
}

contract MarketActor {
    EthscribeMarketV1 private immutable market;

    constructor(EthscribeMarketV1 market_) {
        market = market_;
    }

    function createOffer(address seller, bytes32 ethscriptionId) external payable returns (uint256) {
        return market.createOffer{value: msg.value}(seller, ethscriptionId, 0, bytes32("SMART_WALLET"));
    }

    function cancelOffer(uint256 offerId) external {
        market.cancelOffer(offerId);
    }

    function acceptFeeRecipient() external {
        market.acceptFeeRecipient();
    }

    function claim() external {
        market.claim(payable(address(this)));
    }

    receive() external payable {}
}

contract EthscribeMarketV1Test is TestBase {
    bytes32 private constant TRANSFER_EVENT_SIGNATURE =
        keccak256("ethscriptions_protocol_TransferEthscriptionForPreviousOwner(address,address,bytes32)");

    address private constant OWNER = address(0xA11CE);
    address private constant FEE_RECIPIENT = address(0xFEE);
    address private constant NEXT_FEE_RECIPIENT = address(0xBEEF);
    address private constant SELLER = address(0x5E11E2);
    address private constant BUYER = address(0xB0B);
    address private constant BIDDER = address(0xB1D);
    address private constant ATTACKER = address(0xBAD);
    bytes32 private constant ID = keccak256("ethscription-one");
    bytes32 private constant SECOND_ID = keccak256("ethscription-two");
    bytes32 private constant CONTEXT = keccak256("expedition-001/artifact-001");

    EthscribeMarketV1 private market;

    function setUp() public {
        market = new EthscribeMarketV1(OWNER, FEE_RECIPIENT);
        vm.deal(SELLER, 100 ether);
        vm.deal(BUYER, 100 ether);
        vm.deal(BIDDER, 100 ether);
        vm.deal(ATTACKER, 100 ether);
    }

    function test_ConstructorFreezesFeeAndSetsTwoStepOwner() public view {
        assertEq(market.owner(), OWNER, "owner");
        assertEq(market.feeRecipient(), FEE_RECIPIENT, "fee recipient");
        assertEq(market.MARKET_VERSION(), 1, "market version");
        assertEq(market.FEE_BPS(), 500, "fee bps");
        assertEq(market.TRANSFER_COOLDOWN_BLOCKS(), 5, "cooldown");
    }

    function test_RecordsSingleAndPackedBatchDeposits() public {
        _depositAs(SELLER, ID);
        _depositBatchAs(SELLER, SECOND_ID, keccak256("third"));

        (uint256 receivedBlock, uint64 nonce, bool active) = _deposit(ID, SELLER);
        assertEq(receivedBlock, block.number, "single received block");
        assertEq(nonce, 1, "single nonce");
        assertTrue(active, "single active");

        (, uint64 secondNonce, bool secondActive) = _deposit(SECOND_ID, SELLER);
        assertEq(secondNonce, 1, "batch nonce");
        assertTrue(secondActive, "batch active");
    }

    function test_RejectsDuplicateMalformedAndValueDeposits() public {
        _depositAs(SELLER, ID);

        vm.expectRevert(EthscribeMarketV1.DepositAlreadyActive.selector);
        _depositAs(SELLER, ID);

        vm.expectRevert(EthscribeMarketV1.InvalidDepositDataLength.selector);
        _rawCallAs(SELLER, hex"1234", 0);

        vm.expectRevert(EthscribeMarketV1.UnexpectedEther.selector);
        _rawCallAs(SELLER, abi.encodePacked(SECOND_ID), 1 wei);
    }

    function test_EnforcesCooldownAndEmitsExactEsip2Withdrawal() public {
        _depositAs(SELLER, ID);
        assertEq(market.blocksRemainingUntilTransfer(SELLER, ID), 5, "full cooldown");

        vm.prank(SELLER);
        vm.expectRevert(abi.encodeWithSelector(EthscribeMarketV1.CooldownActive.selector, 5));
        market.withdrawEthscription(ID, SELLER);

        vm.roll(block.number + 5);
        vm.recordLogs();
        vm.prank(SELLER);
        market.withdrawEthscription(ID, BUYER);

        (, uint64 nonce, bool active) = _deposit(ID, SELLER);
        assertEq(nonce, 1, "nonce retained");
        assertEq(active, false, "deposit consumed");
        _assertTransferLog(vm.getRecordedLogs(), SELLER, BUYER, ID);
    }

    function test_BatchWithdrawalEmitsTransfersAndConsumesDeposits() public {
        _readyDeposit(SELLER, ID);
        _readyDeposit(SELLER, SECOND_ID);

        bytes32[] memory ids = new bytes32[](2);
        ids[0] = ID;
        ids[1] = SECOND_ID;

        vm.recordLogs();
        vm.prank(SELLER);
        market.withdrawBatchEthscriptions(ids, BUYER);

        (,, bool firstActive) = _deposit(ID, SELLER);
        (,, bool secondActive) = _deposit(SECOND_ID, SELLER);
        assertEq(firstActive, false, "first deposit consumed");
        assertEq(secondActive, false, "second deposit consumed");

        VmTest.Log[] memory logs = vm.getRecordedLogs();
        _assertTransferLog(logs, SELLER, BUYER, ID);
        _assertTransferLog(logs, SELLER, BUYER, SECOND_ID);
    }

    function test_FixedPriceSaleUsesPullPaymentsAndConsumesDeposit() public {
        uint128 price = 2 ether;
        _readyDeposit(SELLER, ID);

        vm.prank(SELLER);
        uint64 listingNonce = market.createListing(ID, price, address(0), 0, CONTEXT);

        vm.recordLogs();
        vm.prank(BUYER);
        market.buy{value: price}(SELLER, ID, listingNonce, price);

        uint256 fee = uint256(price) * 500 / 10_000;
        assertEq(market.claimable(SELLER), uint256(price) - fee, "seller proceeds");
        assertEq(market.claimable(FEE_RECIPIENT), fee, "fee proceeds");
        assertEq(market.totalClaimable(), price, "claimable total");
        assertEq(market.totalLiabilities(), price, "liabilities");
        assertEq(address(market).balance, price, "market balance");
        _assertTransferLog(vm.getRecordedLogs(), SELLER, BUYER, ID);

        (,, bool active) = _deposit(ID, SELLER);
        assertEq(active, false, "deposit consumed");
        (uint128 listedPrice,,,,,,) = market.listings(SELLER, ID);
        assertEq(listedPrice, 0, "listing deleted");
    }

    function test_PrivateListingSlippageAndExpiryProtections() public {
        uint128 price = 1 ether;
        _readyDeposit(SELLER, ID);

        vm.prank(SELLER);
        uint64 listingNonce = market.createListing(ID, price, BUYER, uint64(block.timestamp + 1 hours), CONTEXT);

        vm.prank(BIDDER);
        vm.expectRevert(EthscribeMarketV1.ListingRestricted.selector);
        market.buy{value: price}(SELLER, ID, listingNonce, price);

        vm.prank(BUYER);
        vm.expectRevert(EthscribeMarketV1.ListingTermsChanged.selector);
        market.buy{value: price}(SELLER, ID, listingNonce + 1, price);

        vm.warp(block.timestamp + 1 hours + 1);
        vm.prank(BUYER);
        vm.expectRevert(EthscribeMarketV1.ListingExpired.selector);
        market.buy{value: price}(SELLER, ID, listingNonce, price);
    }

    function test_FeeRecipientIsTwoStepAndFrozenPerListing() public {
        uint128 price = 1 ether;
        _readyDeposit(SELLER, ID);

        vm.prank(SELLER);
        uint64 listingNonce = market.createListing(ID, price, address(0), 0, CONTEXT);

        vm.prank(OWNER);
        market.proposeFeeRecipient(NEXT_FEE_RECIPIENT);
        assertEq(market.feeRecipient(), FEE_RECIPIENT, "proposal is not acceptance");

        vm.prank(NEXT_FEE_RECIPIENT);
        market.acceptFeeRecipient();
        assertEq(market.feeRecipient(), NEXT_FEE_RECIPIENT, "new fee recipient");

        vm.prank(BUYER);
        market.buy{value: price}(SELLER, ID, listingNonce, price);

        assertEq(market.claimable(FEE_RECIPIENT), uint256(price) * 500 / 10_000, "listing snapshot honored");
        assertEq(market.claimable(NEXT_FEE_RECIPIENT), 0, "new recipient not retroactive");
    }

    function test_ContractFeeRecipientCanAcceptFutureFeesAndClaim() public {
        MarketActor feeRouter = new MarketActor(market);

        vm.prank(OWNER);
        market.proposeFeeRecipient(address(feeRouter));
        feeRouter.acceptFeeRecipient();
        assertEq(market.feeRecipient(), address(feeRouter), "contract recipient accepted");

        _readyDeposit(SELLER, ID);
        vm.prank(SELLER);
        uint64 listingNonce = market.createListing(ID, 1 ether, address(0), 0, CONTEXT);

        vm.prank(BUYER);
        market.buy{value: 1 ether}(SELLER, ID, listingNonce, 1 ether);
        assertEq(market.claimable(address(feeRouter)), 0.05 ether, "router fee credit");

        feeRouter.claim();
        assertEq(address(feeRouter).balance, 0.05 ether, "router claimed fee");
    }

    function test_OwnershipIsTwoStepAndCannotBeRenounced() public {
        vm.prank(OWNER);
        vm.expectRevert(EthscribeMarketV1.OwnershipRenunciationDisabled.selector);
        market.renounceOwnership();

        vm.prank(OWNER);
        market.transferOwnership(BUYER);
        assertEq(market.owner(), OWNER, "transfer awaits acceptance");
        assertEq(market.pendingOwner(), BUYER, "pending owner");

        vm.prank(BUYER);
        market.acceptOwnership();
        assertEq(market.owner(), BUYER, "new owner accepted");
    }

    function test_OfferCancellationPreservesLiabilitiesUntilClaim() public {
        _readyDeposit(SELLER, ID);

        vm.prank(BIDDER);
        uint256 offerId = market.createOffer{value: 3 ether}(SELLER, ID, 0, CONTEXT);
        assertEq(market.lockedOfferTotal(), 3 ether, "offer locked");
        assertEq(market.totalLiabilities(), 3 ether, "offer liability");

        vm.prank(BIDDER);
        market.cancelOffer(offerId);
        assertEq(market.lockedOfferTotal(), 0, "offer unlocked");
        assertEq(market.claimable(BIDDER), 3 ether, "refund claimable");
        assertEq(market.totalLiabilities(), 3 ether, "liability moved, not lost");

        uint256 beforeBalance = BIDDER.balance;
        vm.prank(BIDDER);
        market.claim(payable(BIDDER));
        assertEq(BIDDER.balance, beforeBalance + 3 ether, "refund claimed");
        assertEq(market.totalLiabilities(), 0, "liability cleared");
        assertEq(address(market).balance, 0, "market balance cleared");
    }

    function test_ExpiredOfferCannotSettleButBidderCanCancelAndClaim() public {
        _readyDeposit(SELLER, ID);

        vm.prank(BIDDER);
        uint256 offerId = market.createOffer{value: 1 ether}(SELLER, ID, uint64(block.timestamp + 1 hours), CONTEXT);

        vm.warp(block.timestamp + 1 hours);
        vm.prank(SELLER);
        vm.expectRevert(EthscribeMarketV1.OfferExpired.selector);
        market.acceptOffer(offerId);

        vm.prank(BIDDER);
        market.cancelOffer(offerId);
        assertEq(market.claimable(BIDDER), 1 ether, "expired principal refundable");

        vm.prank(BIDDER);
        market.claim(payable(BIDDER));
        assertEq(market.totalLiabilities(), 0, "expired offer fully exited");
    }

    function test_AcceptOfferSettlesAndCancelsListing() public {
        _readyDeposit(SELLER, ID);
        vm.prank(SELLER);
        market.createListing(ID, 4 ether, address(0), 0, CONTEXT);

        vm.prank(BIDDER);
        uint256 offerId = market.createOffer{value: 2 ether}(SELLER, ID, 0, CONTEXT);

        vm.recordLogs();
        vm.prank(SELLER);
        market.acceptOffer(offerId);

        (,,,,,,,, EthscribeMarketV1.OfferState state) = market.offers(offerId);
        assertEq(uint256(state), uint256(EthscribeMarketV1.OfferState.Accepted), "offer accepted");
        assertEq(market.lockedOfferTotal(), 0, "offer unlocked");
        assertEq(market.totalClaimable(), 2 ether, "proceeds claimable");
        (uint128 listedPrice,,,,,,) = market.listings(SELLER, ID);
        assertEq(listedPrice, 0, "listing cancelled");
        _assertTransferLog(vm.getRecordedLogs(), SELLER, BIDDER, ID);
    }

    function test_StaleOfferCannotConsumeLaterDeposit() public {
        _readyDeposit(SELLER, ID);
        vm.prank(BIDDER);
        uint256 offerId = market.createOffer{value: 1 ether}(SELLER, ID, 0, CONTEXT);

        vm.prank(SELLER);
        market.withdrawEthscription(ID, SELLER);
        _depositAs(SELLER, ID);
        vm.roll(block.number + 5);

        vm.prank(SELLER);
        vm.expectRevert(EthscribeMarketV1.StaleDeposit.selector);
        market.acceptOffer(offerId);

        vm.prank(BIDDER);
        market.cancelOffer(offerId);
        assertEq(market.claimable(BIDDER), 1 ether, "stale offer refundable");
    }

    function test_FakeDepositorCannotConsumeRealDepositorRecord() public {
        _depositAs(SELLER, ID);
        _depositAs(ATTACKER, ID);
        vm.roll(block.number + 5);

        vm.prank(ATTACKER);
        market.withdrawEthscription(ID, ATTACKER);

        (,, bool sellerActive) = _deposit(ID, SELLER);
        (,, bool attackerActive) = _deposit(ID, ATTACKER);
        assertTrue(sellerActive, "real depositor record remains");
        assertEq(attackerActive, false, "attacker consumes only own claim");
    }

    function test_PauseBlocksEntryButNeverWithdrawalCancellationOrClaim() public {
        _readyDeposit(SELLER, ID);
        vm.prank(BIDDER);
        uint256 offerId = market.createOffer{value: 1 ether}(SELLER, ID, 0, CONTEXT);

        vm.prank(OWNER);
        market.pause();

        vm.expectRevert(Pausable.EnforcedPause.selector);
        _depositAs(SELLER, SECOND_ID);

        vm.prank(BIDDER);
        market.cancelOffer(offerId);
        vm.prank(BIDDER);
        market.claim(payable(BIDDER));

        vm.prank(SELLER);
        market.withdrawEthscription(ID, SELLER);
        (,, bool active) = _deposit(ID, SELLER);
        assertEq(active, false, "withdrawal remains available");
    }

    function test_RevertingClaimRecipientCannotDestroyCredit() public {
        RejectEther rejectEther = new RejectEther();
        _readyDeposit(SELLER, ID);
        vm.prank(BIDDER);
        uint256 offerId = market.createOffer{value: 1 ether}(SELLER, ID, 0, CONTEXT);
        vm.prank(BIDDER);
        market.cancelOffer(offerId);

        vm.prank(BIDDER);
        vm.expectRevert(EthscribeMarketV1.EtherTransferFailed.selector);
        market.claim(payable(address(rejectEther)));

        assertEq(market.claimable(BIDDER), 1 ether, "credit restored on revert");
        assertEq(market.totalLiabilities(), 1 ether, "liability restored on revert");
    }

    function test_SmartContractWalletCanBidCancelAndClaim() public {
        MarketActor actor = new MarketActor(market);
        _readyDeposit(SELLER, ID);

        uint256 offerId = actor.createOffer{value: 1 ether}(SELLER, ID);
        actor.cancelOffer(offerId);
        actor.claim();

        assertEq(address(actor).balance, 1 ether, "contract wallet refunded");
    }

    function testFuzz_FixedSaleConservesEveryWei(uint128 rawPrice) public {
        uint128 price = uint128(1 + (uint256(rawPrice) % type(uint96).max));
        vm.deal(BUYER, uint256(price));
        _readyDeposit(SELLER, ID);

        vm.prank(SELLER);
        uint64 listingNonce = market.createListing(ID, price, address(0), 0, CONTEXT);
        vm.prank(BUYER);
        market.buy{value: price}(SELLER, ID, listingNonce, price);

        uint256 expectedFee = uint256(price) * 500 / 10_000;
        assertEq(market.claimable(FEE_RECIPIENT), expectedFee, "fee exact");
        assertEq(market.claimable(SELLER), uint256(price) - expectedFee, "seller exact");
        assertEq(market.totalLiabilities(), price, "all wei accounted");
        assertEq(address(market).balance, price, "balance covers all wei");
    }

    function _readyDeposit(address depositor, bytes32 ethscriptionId) private {
        _depositAs(depositor, ethscriptionId);
        vm.roll(block.number + 5);
    }

    function _depositAs(address depositor, bytes32 ethscriptionId) private {
        _rawCallAs(depositor, abi.encodePacked(ethscriptionId), 0);
    }

    function _depositBatchAs(address depositor, bytes32 firstId, bytes32 secondId) private {
        _rawCallAs(depositor, abi.encodePacked(firstId, secondId), 0);
    }

    function _rawCallAs(address sender, bytes memory data, uint256 value) private {
        vm.prank(sender);
        (bool success, bytes memory returnData) = address(market).call{value: value}(data);
        if (!success) {
            assembly ("memory-safe") {
                revert(add(returnData, 32), mload(returnData))
            }
        }
    }

    function _deposit(bytes32 ethscriptionId, address depositor) private view returns (uint256, uint64, bool) {
        (uint256 receivedBlock, uint64 nonce, bool active) = market.potentialDeposits(depositor, ethscriptionId);
        return (receivedBlock, nonce, active);
    }

    function _assertTransferLog(
        VmTest.Log[] memory logs,
        address previousOwner,
        address recipient,
        bytes32 ethscriptionId
    ) private view {
        bytes32 previousOwnerTopic = bytes32(uint256(uint160(previousOwner)));
        bytes32 recipientTopic = bytes32(uint256(uint160(recipient)));
        for (uint256 i = 0; i < logs.length; ++i) {
            if (
                logs[i].emitter == address(market) && logs[i].topics[0] == TRANSFER_EVENT_SIGNATURE
                    && logs[i].topics[1] == previousOwnerTopic && logs[i].topics[2] == recipientTopic
                    && logs[i].topics[3] == ethscriptionId
            ) {
                return;
            }
        }
        revert AssertionFailed("ESIP-2 transfer event not found");
    }
}
