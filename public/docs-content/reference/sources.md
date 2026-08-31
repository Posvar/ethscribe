# Sources and further reading

This page collects the primary technical references behind the whitepaper and starting points for Expedition 001. Per-artifact historical citations belong in the live expedition record.

## Ethscriptions protocol

- [Ethscriptions documentation](https://docs.ethscriptions.com/)
- [Protocol specification](https://docs.ethscriptions.com/overview/protocol-specification)
- [Quick start](https://docs.ethscriptions.com/overview/quick-start)
- [Accepted ESIPs](https://docs.ethscriptions.com/esips/accepted-esips)
- [Ethscriptions API V2 reference](https://api-docs.ethscriptions.com/reference)
- [ESIP-1: Smart-contract Ethscription transfers](https://docs.ethscriptions.com/esips/accepted-esips/esip-1-smart-contract-ethscription-transfers)
- [ESIP-2: Safe trustless smart-contract escrow](https://docs.ethscriptions.com/esips/accepted-esips/esip-2-safe-trustless-smart-contract-ethscription-escrow)
- [ESIP-3: Smart-contract Ethscription creations](https://docs.ethscriptions.com/esips/accepted-esips/esip-3-smart-contract-ethscription-creations)
- [ESIP-6: Opt-in Ethscription non-uniqueness](https://docs.ethscriptions.com/esips/accepted-esips/esip-6-opt-in-ethscription-non-uniqueness)
- [ESIP-7: Gzipped calldata in Ethscription creation](https://docs.ethscriptions.com/esips/accepted-esips/esip-7-support-gzipped-calldata-in-ethscription-creation)
- [ESIP-8: Ethscription attachments](https://docs.ethscriptions.com/esips/accepted-esips/esip-8-ethscription-attachments-aka-blobscriptions)

Protocol behavior should be verified against current accepted specifications and chain data before implementation. A documentation summary is not a substitute for protocol validation.

## Marketplace reference

- [ittybits marketplace proxy `0xa8Ee…D36`](https://etherscan.io/address/0xa8Ee53258865c55a521727127D8a64c414163D36#code)
- [Current verified ittybits implementation `0x3893…78D`](https://etherscan.io/address/0x3893F7792A4219Fc5407887d4e6F0831E083C78D#code)

The deployed ittybits source is the behavioral reference for ESIP-2 escrow, potential-deposit tracking, cooldowns, listings, bids, and withdrawals. Ethscribe's proposed differences are documented under [Ownership and marketplace](../product/ownership-and-marketplace.md).

## Ethereum standards

- [EIP-1193: Ethereum Provider JavaScript API](https://eips.ethereum.org/EIPS/eip-1193)
- [EIP-712: Typed structured data hashing and signing](https://eips.ethereum.org/EIPS/eip-712)

## Expedition 001

- [Satoshi Nakamoto, “New icon/logo,” BitcoinTalk, 24 February 2010](https://bitcointalk.org/index.php?topic=64.0)
- Historical Bitcoin release archives and source trees, linked from each artifact record
- Exact hashes and byte lengths derived from the files identified in the expedition manifest

Archived copies should supplement primary links when available, with access dates and provenance notes. A screenshot is not a substitute for a recoverable underlying file.

## Publishing system

- [GitBook Git Sync content configuration](https://docs.gitbook.com/integrations/git-sync/content-configuration)
- [GitBook custom domains](https://docs.gitbook.com/publishing-documentation/custom-domain)

Ethscribe's `.gitbook.yaml`, `README.md`, and `SUMMARY.md` follow GitBook's Git Sync content structure. The same Markdown is rendered on `ethscri.be/docs`.

## Documentation status

This documentation describes the phased architecture and the deployed, paused V1 marketplace as of 31 August 2026. Statements labeled “proposed,” “planned,” or “later” are not deployed contract behavior. Live product and contract surfaces take precedence over roadmap prose once released, and material changes should be reflected here with repository history.
