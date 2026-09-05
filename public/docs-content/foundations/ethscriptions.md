# Ethscriptions primer

Ethscriptions is a protocol for creating and transferring digital artifacts using Ethereum data. Ethscribe uses it to give recovered historical files a public creation record and a transferable owner.

Ethscribe is this project and catalogue. Ethscriptions is the underlying protocol.

## From a file to an Ethscription

A supported file can be represented by a Data URI such as:

```text
data:image/png;base64,<original file bytes encoded as base64>
```

A valid creation is interpreted under protocol rules. Its ID is the Ethereum creation transaction hash. That remains the convention for contract-event creations: the protocol recognizes at most one Ethscription per transaction, prioritizing valid calldata over events.

For Ethscribe's direct-to-market creation, the connected wallet is creator and the market contract is initial owner. A later signed Finding links that Ethscription to a target; the protocol does not know the expedition.

## First come, first scribe

Ordinary duplicate detection compares the SHA-256 of complete protocol content. The first valid occurrence is recognized and a later duplicate is ignored. Ethereum itself can include both transactions; the uniqueness rule belongs to Ethscriptions.

The protocol also allows content to opt into duplication using `rule=esip6`. Ethscribe's target wrappers do not include that parameter. A fallback Finding Receipt uses it to record an attempt if canonical creation loses a race.

See the [official creation rules](https://docs.ethscriptions.com/overview/protocol-specification), [ESIP-3 ordering](https://docs.ethscriptions.com/esips/accepted-esips/esip-3-smart-contract-ethscription-creations), and [ESIP-6 duplicate opt-in](https://docs.ethscriptions.com/esips/accepted-esips/esip-6-opt-in-ethscription-non-uniqueness).

## Ownership and indexing

Protocol-aware services interpret Ethereum transactions and events to reconstruct creation and transfers. The owner shown by the index is different from a marketplace's unverified deposit claim.

Ethscribe uses the official index and reads market contract state before presenting a position as usable for a sale or withdrawal. An Ethereum receipt may arrive before the index reflects it.

The contract's conditional transfer events require the correct previous owner. For a deeper explanation, see [ownership and marketplace](../product/ownership-and-marketplace.md).

## What it does and does not establish

An Ethscription records protocol content and its Ethereum chronology. It supports ownership history under the protocol.

It does not establish who authored a file decades earlier, that a source is authentic, that the work is important, or that copyright has transferred. It also does not prove the raw bytes are absent from other valid wrappers.

Historical evidence and [decoded-byte identity](byte-perfect-identity.md) provide those separate research layers.

## Scope of support

The protocol includes contract creation, bulk transfers, gzip transport, and attachments. Ethscribe's current expedition flow supports its specifically defined target formats and wrappers. It is not a complete decoder or historical index of every accepted extension.

Primary references are collected in [Sources and further reading](../reference/sources.md).
