// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {EthscribeMarketV1} from "./EthscribeMarketV1.sol";

/// @title EthscribeMarketV2
/// @notice Direct-creation receiver, ESIP-2 vault, and ETH marketplace for Ethscriptions.
/// @dev A successful transaction whose calldata is a valid Data URI creates an Ethscription
///      with msg.sender as creator and this contract as initial owner. The compact ESIP-6
///      event is a lower-priority guaranteed receipt if the canonical calldata loses a race.
///      Ownership remains protocol state interpreted by an indexer; first-party clients MUST
///      reconcile current_owner == address(this) and previous_owner == the claimed depositor.
contract EthscribeMarketV2 is EthscribeMarketV1 {
    using Strings for uint256;

    bytes5 private constant DATA_URI_PREFIX = 0x646174613a; // "data:"
    string private constant RECEIPT_PREFIX =
        "data:application/vnd.ethscribe.finding-receipt+json;rule=esip6,{\"version\":1,\"canonical_content_sha256\":\"";
    string private constant RECEIPT_SUFFIX = "\"}";

    error ActiveDepositRequiresRegisteredWithdrawal();

    /// @dev ESIP-3 event consumed only when the higher-priority calldata creation is invalid.
    event ethscriptions_protocol_CreateEthscription(address indexed initialOwner, string contentURI);

    event DirectCreationAttempt(
        address indexed depositor, bytes32 indexed canonicalContentSha256, uint256 indexed receivedBlock
    );
    event UnregisteredEthscriptionReleased(
        address indexed previousOwner, address indexed recipient, bytes32 indexed ethscriptionId
    );

    constructor(address initialOwner, address initialFeeRecipient)
        EthscribeMarketV1(initialOwner, initialFeeRecipient)
    {}

    function MARKET_VERSION() public pure override returns (uint32) {
        return 2;
    }

    /// @notice Accepts either a canonical Data URI creation or packed existing Ethscription IDs.
    /// @dev Data URI calldata is processed first even when its byte length is a multiple of 32.
    fallback() external payable override whenNotPaused {
        if (msg.value != 0) revert UnexpectedEther();

        if (_startsWithDataUri()) {
            bytes32 canonicalContentSha256 = sha256(msg.data);
            emit DirectCreationAttempt(msg.sender, canonicalContentSha256, block.number);
            emit ethscriptions_protocol_CreateEthscription(msg.sender, _receiptUri(canonicalContentSha256));
            return;
        }

        uint256 dataLength = msg.data.length;
        if (dataLength == 0 || dataLength % 32 != 0) revert InvalidDepositDataLength();

        uint256 count = dataLength / 32;
        if (count > MAX_BATCH_SIZE) revert BatchTooLarge();

        for (uint256 i = 0; i < count; ++i) {
            bytes32 ethscriptionId;
            assembly ("memory-safe") {
                ethscriptionId := calldataload(shl(5, i))
            }
            _recordPotentialDeposit(msg.sender, ethscriptionId);
        }
    }

    /// @notice Releases a direct-to-vault creation that has not been registered for trading.
    /// @dev ESIP-2 enforces that msg.sender was the actual previous owner. Invalid claims emit
    ///      an ignored protocol event and cannot move another depositor's Ethscription.
    function withdrawUnregisteredEthscription(bytes32 ethscriptionId, address recipient) external nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        _withdrawUnregisteredEthscription(msg.sender, ethscriptionId, recipient);
    }

    /// @notice Releases up to MAX_BATCH_SIZE direct creations in one transaction.
    /// @dev Registered deposits use the inherited withdrawBatchEthscriptions method instead.
    function withdrawBatchUnregisteredEthscriptions(bytes32[] calldata ethscriptionIds, address recipient)
        external
        nonReentrant
    {
        uint256 length = ethscriptionIds.length;
        if (length == 0 || length > MAX_BATCH_SIZE) revert InvalidBatchLength();
        if (recipient == address(0)) revert ZeroAddress();

        for (uint256 i = 0; i < length; ++i) {
            _withdrawUnregisteredEthscription(msg.sender, ethscriptionIds[i], recipient);
        }
    }

    function receiptUri(bytes32 canonicalContentSha256) external pure returns (string memory) {
        return _receiptUri(canonicalContentSha256);
    }

    function _startsWithDataUri() private pure returns (bool) {
        if (msg.data.length < 5) return false;
        bytes5 prefix;
        assembly ("memory-safe") {
            prefix := calldataload(0)
        }
        return prefix == DATA_URI_PREFIX;
    }

    function _receiptUri(bytes32 canonicalContentSha256) private pure returns (string memory) {
        return string.concat(RECEIPT_PREFIX, uint256(canonicalContentSha256).toHexString(32), RECEIPT_SUFFIX);
    }

    function _withdrawUnregisteredEthscription(address previousOwner, bytes32 ethscriptionId, address recipient)
        private
    {
        if (potentialDeposits[previousOwner][ethscriptionId].active) {
            revert ActiveDepositRequiresRegisteredWithdrawal();
        }

        emit ethscriptions_protocol_TransferEthscriptionForPreviousOwner(previousOwner, recipient, ethscriptionId);
        emit UnregisteredEthscriptionReleased(previousOwner, recipient, ethscriptionId);
    }
}
