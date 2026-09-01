// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {EthscribeMarketV1} from "../src/EthscribeMarketV1.sol";
import {EthscribeMarketV2} from "../src/EthscribeMarketV2.sol";
import {TestBase, VmTest} from "./TestBase.sol";

contract EthscribeMarketV2Test is TestBase {
    bytes32 private constant CREATE_EVENT_SIGNATURE =
        keccak256("ethscriptions_protocol_CreateEthscription(address,string)");
    bytes32 private constant TRANSFER_EVENT_SIGNATURE =
        keccak256("ethscriptions_protocol_TransferEthscriptionForPreviousOwner(address,address,bytes32)");
    bytes32 private constant DIRECT_ATTEMPT_SIGNATURE = keccak256("DirectCreationAttempt(address,bytes32,uint256)");

    address private constant OWNER = address(0xA11CE);
    address private constant FEE_RECIPIENT = address(0xFEE);
    address private constant HUNTER = address(0xB0B);
    address private constant BUYER = address(0xCAFE);
    bytes32 private constant ID = keccak256("v2-artifact");
    bytes32 private constant CONTEXT = keccak256("expedition-001");

    EthscribeMarketV2 private market;

    function setUp() public {
        market = new EthscribeMarketV2(OWNER, FEE_RECIPIENT);
        vm.prank(OWNER);
        market.unpause();
        vm.deal(BUYER, 100 ether);
    }

    function test_VersionAndInheritedConfiguration() public view {
        assertEq(market.MARKET_VERSION(), 2, "market version");
        assertEq(market.owner(), OWNER, "owner");
        assertEq(market.feeRecipient(), FEE_RECIPIENT, "fee recipient");
        assertEq(market.FEE_BPS(), 500, "fee bps");
    }

    function test_DataUriCalldataSucceedsAndEmitsOrderedReceiptFallback() public {
        bytes memory dataUri = bytes("data:image/x-xpixmap;base64,QUJDRA==");
        bytes32 contentSha = sha256(dataUri);
        string memory expectedReceipt = market.receiptUri(contentSha);

        vm.recordLogs();
        _rawCallAs(HUNTER, dataUri, 0);
        VmTest.Log[] memory logs = vm.getRecordedLogs();

        assertEq(logs.length, 2, "creation emits exactly attempt and receipt logs");
        assertEq(logs[0].topics[0], DIRECT_ATTEMPT_SIGNATURE, "attempt precedes receipt");
        assertEq(logs[0].topics[1], bytes32(uint256(uint160(HUNTER))), "attempt depositor");
        assertEq(logs[0].topics[2], contentSha, "attempt content sha");
        assertEq(logs[0].topics[3], bytes32(block.number), "attempt block");

        assertEq(logs[1].topics[0], CREATE_EVENT_SIGNATURE, "ESIP-3 receipt event second");
        assertEq(logs[1].topics[1], bytes32(uint256(uint160(HUNTER))), "receipt initial owner");
        string memory actualReceipt = abi.decode(logs[1].data, (string));
        assertEq(keccak256(bytes(actualReceipt)), keccak256(bytes(expectedReceipt)), "exact receipt URI");
        assertTrue(_contains(bytes(actualReceipt), bytes(";rule=esip6,")), "receipt opts into ESIP-6");
        assertTrue(_contains(bytes(actualReceipt), bytes(_toLowerHex(contentSha))), "receipt commits canonical hash");
    }

    function test_DataUriWinsRoutingEvenWhenLengthIsOnePackedWord() public {
        bytes memory exactlyThirtyTwoBytes = bytes("data:text/plain,1234567890123456");
        assertEq(exactlyThirtyTwoBytes.length, 32, "fixture length");
        bytes32 wouldBeDepositId;
        assembly ("memory-safe") {
            wouldBeDepositId := mload(add(exactlyThirtyTwoBytes, 32))
        }

        _rawCallAs(HUNTER, exactlyThirtyTwoBytes, 0);
        (,, bool active) = market.potentialDeposits(HUNTER, wouldBeDepositId);
        assertEq(active, false, "Data URI must never be parsed as an ID");
    }

    function test_PackedExistingIdDepositStillWorks() public {
        _rawCallAs(HUNTER, abi.encodePacked(ID), 0);
        (uint256 receivedBlock, uint64 nonce, bool active) = market.potentialDeposits(HUNTER, ID);
        assertEq(receivedBlock, block.number, "deposit block");
        assertEq(uint256(nonce), 1, "deposit nonce");
        assertEq(active, true, "deposit active");
    }

    function test_InvalidFallbackDataAndEtherRevert() public {
        vm.expectRevert();
        _rawCallAs(HUNTER, bytes("not-a-data-uri"), 0);

        vm.expectRevert();
        _rawCallAs(HUNTER, bytes("data:,hello"), 1);
    }

    function test_PauseBlocksCreationButNotUnregisteredExit() public {
        vm.prank(OWNER);
        market.pause();

        vm.expectRevert();
        _rawCallAs(HUNTER, bytes("data:,hello"), 0);

        vm.recordLogs();
        vm.prank(HUNTER);
        market.withdrawUnregisteredEthscription(ID, HUNTER);
        _assertTransferLog(vm.getRecordedLogs(), HUNTER, HUNTER, ID);
    }

    function test_UnregisteredExitUsesEsip2AndCannotBypassActiveDepositState() public {
        vm.recordLogs();
        vm.prank(HUNTER);
        market.withdrawUnregisteredEthscription(ID, HUNTER);
        _assertTransferLog(vm.getRecordedLogs(), HUNTER, HUNTER, ID);

        _rawCallAs(HUNTER, abi.encodePacked(ID), 0);
        vm.prank(HUNTER);
        vm.expectRevert(EthscribeMarketV2.ActiveDepositRequiresRegisteredWithdrawal.selector);
        market.withdrawUnregisteredEthscription(ID, HUNTER);
    }

    function test_BatchUnregisteredExitEmitsEveryTransferAndIsBounded() public {
        bytes32 secondId = keccak256("v2-artifact-two");
        bytes32[] memory ids = new bytes32[](2);
        ids[0] = ID;
        ids[1] = secondId;

        vm.recordLogs();
        vm.prank(HUNTER);
        market.withdrawBatchUnregisteredEthscriptions(ids, HUNTER);
        VmTest.Log[] memory logs = vm.getRecordedLogs();
        _assertTransferLog(logs, HUNTER, HUNTER, ID);
        _assertTransferLog(logs, HUNTER, HUNTER, secondId);

        bytes32[] memory empty = new bytes32[](0);
        vm.prank(HUNTER);
        vm.expectRevert(EthscribeMarketV1.InvalidBatchLength.selector);
        market.withdrawBatchUnregisteredEthscriptions(empty, HUNTER);

        _rawCallAs(HUNTER, abi.encodePacked(ID), 0);
        vm.prank(HUNTER);
        vm.expectRevert(EthscribeMarketV2.ActiveDepositRequiresRegisteredWithdrawal.selector);
        market.withdrawBatchUnregisteredEthscriptions(ids, HUNTER);
    }

    function test_InheritedRegisteredMarketSettlementStillWorks() public {
        _rawCallAs(HUNTER, abi.encodePacked(ID), 0);
        vm.roll(block.number + 5);

        vm.prank(HUNTER);
        uint64 listingNonce = market.createListing(ID, 1 ether, address(0), 0, CONTEXT);

        vm.recordLogs();
        vm.prank(BUYER);
        market.buy{value: 1 ether}(HUNTER, ID, listingNonce, 1 ether);
        _assertTransferLog(vm.getRecordedLogs(), HUNTER, BUYER, ID);
        assertEq(market.claimable(HUNTER), 0.95 ether, "seller proceeds");
        assertEq(market.claimable(FEE_RECIPIENT), 0.05 ether, "market fee");
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
            ) return;
        }
        revert AssertionFailed("ESIP-2 transfer event not found");
    }

    function _contains(bytes memory value, bytes memory needle) private pure returns (bool) {
        if (needle.length == 0 || needle.length > value.length) return false;
        for (uint256 i = 0; i <= value.length - needle.length; ++i) {
            bool matches = true;
            for (uint256 j = 0; j < needle.length; ++j) {
                if (value[i + j] != needle[j]) {
                    matches = false;
                    break;
                }
            }
            if (matches) return true;
        }
        return false;
    }

    function _toLowerHex(bytes32 value) private pure returns (string memory) {
        bytes16 symbols = "0123456789abcdef";
        bytes memory output = new bytes(66);
        output[0] = "0";
        output[1] = "x";
        for (uint256 i = 0; i < 32; ++i) {
            uint8 current = uint8(value[i]);
            output[2 + i * 2] = symbols[current >> 4];
            output[3 + i * 2] = symbols[current & 0x0f];
        }
        return string(output);
    }
}
