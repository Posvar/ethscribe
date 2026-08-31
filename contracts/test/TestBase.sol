// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

interface VmTest {
    struct Log {
        bytes32[] topics;
        bytes data;
        address emitter;
    }

    function assume(bool condition) external;
    function bound(uint256 value, uint256 min, uint256 max) external pure returns (uint256 result);
    function deal(address account, uint256 newBalance) external;
    function envOr(string calldata name, string calldata defaultValue) external view returns (string memory value);
    function createSelectFork(string calldata urlOrAlias) external returns (uint256 forkId);
    function expectRevert(bytes4 revertData) external;
    function expectRevert(bytes calldata revertData) external;
    function getRecordedLogs() external returns (Log[] memory logs);
    function prank(address sender) external;
    function recordLogs() external;
    function roll(uint256 newHeight) external;
    function startPrank(address sender) external;
    function stopPrank() external;
    function warp(uint256 newTimestamp) external;
}

abstract contract TestBase {
    VmTest internal constant vm = VmTest(address(uint160(uint256(keccak256("hevm cheat code")))));

    error AssertionFailed(string message);

    function assertTrue(bool condition, string memory message) internal pure {
        if (!condition) revert AssertionFailed(message);
    }

    function assertEq(uint256 actual, uint256 expected, string memory message) internal pure {
        if (actual != expected) revert AssertionFailed(message);
    }

    function assertEq(address actual, address expected, string memory message) internal pure {
        if (actual != expected) revert AssertionFailed(message);
    }

    function assertEq(bytes32 actual, bytes32 expected, string memory message) internal pure {
        if (actual != expected) revert AssertionFailed(message);
    }

    function assertEq(bool actual, bool expected, string memory message) internal pure {
        if (actual != expected) revert AssertionFailed(message);
    }
}
