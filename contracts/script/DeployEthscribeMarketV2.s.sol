// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {EthscribeMarketV2} from "../src/EthscribeMarketV2.sol";

interface IVmScriptV2 {
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Run with a browser or hardware wallet. Never pass a raw private key.
contract DeployEthscribeMarketV2 {
    IVmScriptV2 private constant VM = IVmScriptV2(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run(address initialOwner, address initialFeeRecipient) external returns (EthscribeMarketV2 market) {
        VM.startBroadcast();
        market = new EthscribeMarketV2(initialOwner, initialFeeRecipient);
        VM.stopBroadcast();
    }
}
