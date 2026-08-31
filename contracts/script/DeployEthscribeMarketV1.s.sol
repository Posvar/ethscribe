// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {EthscribeMarketV1} from "../src/EthscribeMarketV1.sol";

interface IVmScript {
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Run with a named encrypted account or a hardware wallet. Never pass a raw private key.
contract DeployEthscribeMarketV1 {
    IVmScript private constant VM = IVmScript(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run(address initialOwner, address initialFeeRecipient) external returns (EthscribeMarketV1 market) {
        VM.startBroadcast();
        market = new EthscribeMarketV1(initialOwner, initialFeeRecipient);
        VM.stopBroadcast();
    }
}
