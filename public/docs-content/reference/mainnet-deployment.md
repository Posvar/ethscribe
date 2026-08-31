# Mainnet deployment

`EthscribeMarketV1` is deployed to Ethereum mainnet at [`0x44c241ac86724D64a33558b03A637a63D9a30B02`](https://etherscan.io/address/0x44c241ac86724D64a33558b03A637a63D9a30B02).

> **Current release state:** deployed, immutable, source-verified, and paused. The contract has not received an independent audit and is not yet approved for valuable artifact custody or trading.

## Deployment record

| Field | Value |
|---|---|
| Network | Ethereum mainnet, chain ID `1` |
| Contract | `EthscribeMarketV1` |
| Address | `0x44c241ac86724D64a33558b03A637a63D9a30B02` |
| Transaction | [`0xf69d8219…16df`](https://etherscan.io/tx/0xf69d821904353eb57de9a28d4732ea96ca4f3198f289523dd6a9551517ae16df) |
| Block | `25873370` |
| Deployer | `0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba` |
| Initial owner | `0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba` |
| Initial fee recipient | `0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba` |
| Initial state | Paused |
| Fixed fee | `500` basis points, or 5% |
| Transfer cooldown | `5` Ethereum blocks |
| Compiler | Solidity `0.8.36` |
| OpenZeppelin | Contracts `5.7.0` |
| Runtime size | `12,432` bytes |
| Runtime code hash | `0xde21a161a4fc418b78fda504b4dbcdeff64d4bbca4d3caa0742419c0888a31b6` |
| Source commit | [`687ed2d`](https://github.com/Posvar/ethscribe/commit/687ed2dd94f71347ee69a5df5d16d0903306b671) |
| Source verification | Sourcify [`exact_match`](https://repo.sourcify.dev/contracts/full_match/1/0x44c241ac86724D64a33558b03A637a63D9a30B02/metadata.json) |

The canonical machine-readable record is [`contracts/deployments/mainnet.json`](https://github.com/Posvar/ethscribe/blob/main/contracts/deployments/mainnet.json). Sourcify matched the deployed bytecode exactly to the published compiler input and source.

## What paused means

The constructor paused the market in the same transaction that created it. While paused, new deposits, listings, offers, purchases, and offer acceptance are blocked. User exits remain designed to stay available: withdrawals, listing cancellation, offer cancellation, and ETH claims do not depend on the market being unpaused.

There were no assets, listings, offers, or claimable balances at deployment. Unpausing requires a separate owner transaction and is not part of the deployment release.

## Gates before unpause

1. Integrate the deployed address into the first-party wallet and marketplace interface.
2. Reconcile every potential deposit against the official Ethscriptions indexer.
3. Complete integration tests against the deployed address.
4. Obtain an independent contract security review and resolve or explicitly accept findings.
5. Publish the low-value launch procedure and recovery guidance.
6. Reconfirm owner, fee recipient, bytecode, and paused state immediately before a separate unpause transaction.

Mainnet presence should not be interpreted as an audit, endorsement, or invitation to send Ethscriptions directly to the contract.
