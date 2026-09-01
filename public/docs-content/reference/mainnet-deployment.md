# Mainnet deployment

`EthscribeMarketV2` is the active-release contract on Ethereum mainnet at [`0x65a6771a4f82bcc1fad26CC944cA673dDE2c4614`](https://etherscan.io/address/0x65a6771a4f82bcc1fad26CC944cA673dDE2c4614).

> **Current release state:** V2 is active, immutable, and exact-match source-verified. It supports direct-to-vault creation, registered market deposits, and user-controlled exits for both custody forms. It has not received an independent audit and is not approved for valuable artifact custody or marketplace trading. Consult the live wallet status before relying on operational state.

## Version 2 deployment record

| Field | Value |
|---|---|
| Network | Ethereum mainnet, chain ID `1` |
| Contract | `EthscribeMarketV2` |
| Address | `0x65a6771a4f82bcc1fad26CC944cA673dDE2c4614` |
| Deployment transaction | [`0x44129d4a...734f`](https://etherscan.io/tx/0x44129d4a381a4a6c19ee6151eb1497c49af621c500e5aa4a3a61bf7fb764734f) |
| Deployment block | `25883357` |
| Deployer | `0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba` |
| Initial owner | `0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba` |
| Initial fee recipient | `0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba` |
| Initial state | Paused |
| Activation transaction | [`0xac50eae8...180af`](https://etherscan.io/tx/0xac50eae83068897ebdc4ce3e1f637a26101b4d7790cdaa220b4a3017378180af) |
| Activation block | `25883396` |
| Current release state | Active |
| Fixed fee | `500` basis points, or 5% |
| Transfer cooldown | `5` Ethereum blocks |
| Maximum batch size | `100` Ethscriptions |
| Compiler | Solidity `0.8.36` |
| OpenZeppelin | Contracts `5.7.0` |
| Runtime size | `14,497` bytes |
| Runtime code hash | `0x26ea3f0b035afc64c065097307bf438cde1f9c9ec4c41bb906b805d1958b2ad3` |
| Source commit | [`b2339be`](https://github.com/Posvar/ethscribe/commit/b2339be570a3f75ff3478dd945db20cb22e940cf) |
| Source verification | Sourcify [`exact_match`](https://repo.sourcify.dev/contracts/full_match/1/0x65a6771a4f82bcc1fad26CC944cA673dDE2c4614/metadata.json) |

The canonical machine-readable record is [`contracts/deployments/mainnet-v2.json`](https://github.com/Posvar/ethscribe/blob/main/contracts/deployments/mainnet-v2.json). The runtime hash read from mainnet exactly matches the artifact built from the frozen source commit.

## Custody and exits

V2 has two intentionally separate custody forms:

| Custody form | How it enters | How it exits |
|---|---|---|
| Registered market deposit | An existing Ethscription ID is sent through the fallback path, creating depositor, nonce, cooldown, and listing state | `withdrawEthscription` or `withdrawBatchEthscriptions` |
| Unregistered direct creation | Canonical Data URI calldata creates the Ethscription with the connected wallet as creator and V2 as initial owner | `withdrawUnregisteredEthscription` or `withdrawBatchUnregisteredEthscriptions` |

Each batch method accepts at most 100 IDs. A wallet containing both forms uses two batch transactions, one for each form. This separation prevents a direct-exit call from bypassing an active listing or registered deposit state. Both exit paths remain callable while the market is paused.

The contract cannot query the Ethscriptions indexer. The application therefore prepares any withdrawal only after the official record confirms the connected wallet is the required previous owner and V2 is the current owner. ESIP-2 makes an incorrect previous-owner claim ineffective at the protocol layer.

## Direct-to-vault creation

Canonical Data URI calldata is the highest-priority creation candidate in a transaction. When unique, the official protocol record names the connected wallet as creator and V2 as initial owner. The same transaction emits a lower-priority ESIP-6 Finding Receipt committed to the canonical content SHA-256. If the canonical payload loses an unavoidable same-block uniqueness race, the receipt becomes the transaction's Ethscription instead, giving the hunter an onchain record rather than a successful transaction with no indexed result.

Direct creations are not eligible for listing or offers until their owner registers the known Ethscription ID through the ordinary market-deposit path. That registration creates the nonce and state needed for settlement.

## Legacy Version 1

`EthscribeMarketV1` remains immutable at [`0x44c241ac86724D64a33558b03A637a63D9a30B02`](https://etherscan.io/address/0x44c241ac86724D64a33558b03A637a63D9a30B02). It was deployed in block `25873370` by [transaction `0xf69d8219...16df`](https://etherscan.io/tx/0xf69d821904353eb57de9a28d4732ea96ca4f3198f289523dd6a9551517ae16df) from exact source commit [`687ed2d`](https://github.com/Posvar/ethscribe/commit/687ed2dd94f71347ee69a5df5d16d0903306b671) and has Sourcify [`exact_match`](https://repo.sourcify.dev/contracts/full_match/1/0x44c241ac86724D64a33558b03A637a63D9a30B02/metadata.json) verification.

V1 remains available for exits; new first-party intake moves to V2. The machine-readable V1 record remains at [`contracts/deployments/mainnet.json`](https://github.com/Posvar/ethscribe/blob/main/contracts/deployments/mainnet.json), and its first production custody exercise remains recorded at [`contracts/deployments/custody-pilot-001.json`](https://github.com/Posvar/ethscribe/blob/main/contracts/deployments/custody-pilot-001.json).

Mainnet presence, source verification, and automated testing should not be interpreted as an audit, endorsement, or invitation to custody valuable assets.
