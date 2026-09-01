// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {EthscribeMarketV2} from "../src/EthscribeMarketV2.sol";
import {TestBase, VmTest} from "./TestBase.sol";

/// @notice Optional integration test against the immutable V2 mainnet deployment.
/// @dev Set ETHEREUM_RPC_URL locally to exercise this test. Every write occurs only
///      inside the disposable Foundry fork; no signing key or mainnet transaction is used.
contract EthscribeMarketV2MainnetForkTest is TestBase {
    EthscribeMarketV2 private constant MARKET = EthscribeMarketV2(payable(0x65a6771a4f82bcc1fad26CC944cA673dDE2c4614));
    address private constant OWNER = 0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba;
    address private constant HUNTER = address(0xB0B);
    bytes32 private constant RUNTIME_CODE_HASH = 0x26ea3f0b035afc64c065097307bf438cde1f9c9ec4c41bb906b805d1958b2ad3;
    bytes32 private constant FIRST_ID = keccak256("ethscribe-v2-mainnet-fork-first");
    bytes32 private constant SECOND_ID = keccak256("ethscribe-v2-mainnet-fork-second");
    bytes32 private constant CREATE_EVENT_SIGNATURE =
        keccak256("ethscriptions_protocol_CreateEthscription(address,string)");
    bytes32 private constant DIRECT_ATTEMPT_SIGNATURE = keccak256("DirectCreationAttempt(address,bytes32,uint256)");

    bool private forkReady;

    function setUp() public {
        string memory rpcUrl = vm.envOr("ETHEREUM_RPC_URL", string(""));
        if (bytes(rpcUrl).length == 0) return;
        vm.createSelectFork(rpcUrl);
        forkReady = true;
    }

    function test_DeployedV2ConfigurationAndBothBatchExitPaths() public {
        if (!forkReady) return;

        assertTrue(address(MARKET).code.length > 0, "deployed runtime code");
        assertEq(address(MARKET).codehash, RUNTIME_CODE_HASH, "exact deployed runtime");
        assertEq(MARKET.owner(), OWNER, "deployed owner");
        assertEq(MARKET.feeRecipient(), OWNER, "deployed fee recipient");
        assertEq(MARKET.MARKET_VERSION(), 2, "deployed version");
        assertEq(MARKET.FEE_BPS(), 500, "fixed fee");
        assertEq(MARKET.TRANSFER_COOLDOWN_BLOCKS(), 5, "cooldown");
        assertEq(MARKET.MAX_BATCH_SIZE(), 100, "batch bound");

        if (MARKET.paused()) {
            vm.prank(OWNER);
            MARKET.unpause();
        }

        bytes memory dataUri = bytes("data:image/x-xpixmap;base64,QUJDRA==");
        vm.recordLogs();
        _rawCallAs(HUNTER, dataUri);
        VmTest.Log[] memory creationLogs = vm.getRecordedLogs();
        assertEq(creationLogs.length, 2, "attempt and receipt logs");
        assertEq(creationLogs[0].topics[0], DIRECT_ATTEMPT_SIGNATURE, "attempt first");
        assertEq(creationLogs[1].topics[0], CREATE_EVENT_SIGNATURE, "receipt second");

        bytes32[] memory ids = new bytes32[](2);
        ids[0] = FIRST_ID;
        ids[1] = SECOND_ID;

        vm.prank(HUNTER);
        MARKET.withdrawBatchUnregisteredEthscriptions(ids, HUNTER);

        _rawCallAs(HUNTER, abi.encodePacked(FIRST_ID, SECOND_ID));
        (,, bool firstActive) = MARKET.potentialDeposits(HUNTER, FIRST_ID);
        (,, bool secondActive) = MARKET.potentialDeposits(HUNTER, SECOND_ID);
        assertEq(firstActive, true, "first registered deposit");
        assertEq(secondActive, true, "second registered deposit");

        vm.roll(block.number + MARKET.TRANSFER_COOLDOWN_BLOCKS());
        vm.prank(HUNTER);
        MARKET.withdrawBatchEthscriptions(ids, HUNTER);

        (,, firstActive) = MARKET.potentialDeposits(HUNTER, FIRST_ID);
        (,, secondActive) = MARKET.potentialDeposits(HUNTER, SECOND_ID);
        assertEq(firstActive, false, "first registered exit");
        assertEq(secondActive, false, "second registered exit");
    }

    function _rawCallAs(address sender, bytes memory data) private {
        vm.prank(sender);
        (bool success, bytes memory returnData) = address(MARKET).call(data);
        if (!success) {
            assembly ("memory-safe") {
                revert(add(returnData, 32), mload(returnData))
            }
        }
    }
}
