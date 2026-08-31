// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {EthscribeMarketV1} from "../src/EthscribeMarketV1.sol";
import {TestBase} from "./TestBase.sol";

/// @notice Optional integration test against the immutable deployed address.
/// @dev Set ETHEREUM_RPC_URL locally to exercise this test. All writes occur only
///      inside the disposable Foundry fork; no signing key or mainnet transaction is used.
contract EthscribeMarketV1MainnetForkTest is TestBase {
    EthscribeMarketV1 private constant MARKET = EthscribeMarketV1(payable(0x44c241ac86724D64a33558b03A637a63D9a30B02));
    address private constant OWNER = 0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba;
    address private constant TEST_DEPOSITOR = address(0xD3F0517);
    bytes32 private constant TEST_ID = keccak256("ethscribe-mainnet-fork-custody-test");

    bool private forkReady;

    function setUp() public {
        string memory rpcUrl = vm.envOr("ETHEREUM_RPC_URL", string(""));
        if (bytes(rpcUrl).length == 0) return;
        vm.createSelectFork(rpcUrl);
        forkReady = true;
    }

    function test_DeployedAddressCanRehearseDepositCooldownAndPausedExit() public {
        if (!forkReady) return;

        assertTrue(address(MARKET).code.length > 0, "deployed runtime code");
        assertEq(MARKET.owner(), OWNER, "deployed owner");
        assertEq(MARKET.MARKET_VERSION(), 1, "deployed version");
        assertEq(MARKET.paused(), true, "production snapshot paused");

        vm.prank(OWNER);
        MARKET.unpause();

        vm.prank(TEST_DEPOSITOR);
        (bool deposited,) = address(MARKET).call(abi.encodePacked(TEST_ID));
        assertTrue(deposited, "fork deposit call");

        (uint256 receivedBlock, uint64 nonce, bool active) = MARKET.potentialDeposits(TEST_DEPOSITOR, TEST_ID);
        assertEq(receivedBlock, block.number, "fork deposit block");
        assertEq(nonce, 1, "fork deposit nonce");
        assertTrue(active, "fork deposit active");

        vm.prank(OWNER);
        MARKET.pause();
        vm.roll(block.number + MARKET.TRANSFER_COOLDOWN_BLOCKS());

        vm.prank(TEST_DEPOSITOR);
        MARKET.withdrawEthscription(TEST_ID, TEST_DEPOSITOR);
        (,, bool activeAfterWithdrawal) = MARKET.potentialDeposits(TEST_DEPOSITOR, TEST_ID);
        assertEq(activeAfterWithdrawal, false, "fork withdrawal consumed deposit");
        assertEq(MARKET.paused(), true, "exit succeeded while paused");
    }
}
