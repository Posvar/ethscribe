# Welcome to Ethscribe

Ethscribe is an experiment in **ownable digital archaeology**: a place to recover historically significant files, establish their provenance, and collect their exact bytes as Ethscriptions.

> Find the bytes. Establish the provenance. Own the artifact.

A tiny icon, an early software asset, or a file rescued from an old archive can carry a remarkable story. The hunt is to recover the file itself, with evidence connecting it to that story. A matching thumbnail is only the beginning.

## Start with the first expedition

[The Lost Pixels of Satoshi](/expeditions/lost-pixels-of-satoshi) explores Bitcoin's earliest icon systems. Its timeline contains known files to recover and one attested PNG whose original bytes remain unknown.

You can explore without connecting a wallet. To participate, open an unresolved target and choose **Submit a Finding**. Test a local file or an Ethscription you already own before preparing a transaction.

[Follow the first-finding guide](product/first-finding.md) for the complete flow, including what costs gas and when the expedition updates.

## What is available

| Available in this release | What it does |
|---|---|
| Expeditions and artifact timeline | Shows historical context, recovered files, and gaps |
| Candidate testing | Checks supported files against the target and checks known protocol duplicates before gas |
| Wallet connection | Identifies the researcher and opens transaction or signature requests |
| Expedition submission | Creates directly into market custody, or deposits an existing matching Ethscription, then publishes a signed Finding |
| Field Wallet | Shows personal and market-held Ethscriptions, assignments, withdrawal controls, listings, and claimable proceeds |
| Fixed-price marketplace | Shows eligible listings within recovered artifact records and provides a purchase flow |

Public expedition proposals are closed. Research revisions, community challenges, researcher rewards, auctions, funded-offer screens, and automatic expedition scheduling remain proposed work. The [roadmap](roadmap/phased-development.md) separates those ideas from the current product.

## What the evidence establishes

| Record | What it tells you |
|---|---|
| Historical sources | Why the file matters and where it came from |
| Decoded-file SHA-256 | Whether a candidate matches the exact reference bytes |
| Ethscription record | Creation order and ownership under the Ethscriptions protocol |
| Signed Finding | Which wallet submitted the claim against an expedition target |

A hash establishes byte equality; it does not establish authorship. A wallet signature attributes a submission; it does not make its historical claim true.

## First come, first scribe

Each target specifies one canonical Data URI, the format in which its bytes are submitted. For that payload, without duplicate opt-in, the Ethscriptions protocol recognizes the first valid creation. Ethereum itself does not enforce this uniqueness rule.

Another wrapper can contain the same underlying bytes. Ethscribe compares decoded file hashes for the records it checks, but does not yet search every historical Ethscription under every possible wrapper. “No known duplicate found” is a scoped check, not a global guarantee.

## Ownership and the experiment

An **Accession** is a recognized artifact in the expedition catalogue, linked to an Ethscription and its evidence. Ownership can change without changing the file. Buying does not transfer copyright, historical authorship, or control over copies elsewhere.

Ethscribe currently depends on curated target definitions, its hosted records, Ethereum read services, and the official Ethscriptions index. Marketplace custody and payment rules live in an immutable contract. The contract is source-verified; no independent security audit is documented. [Ownership and marketplace](product/ownership-and-marketplace.md) explains this boundary.

The experiment asks whether people return for the research, contribute useful discoveries, and value collecting the resulting artifacts. Further development follows what participants actually find useful.

## Read next

- [Your first Finding](product/first-finding.md)
- [The Lost Pixels of Satoshi](expedition-001/the-lost-pixels-of-satoshi.md)
- [Byte-perfect identity](foundations/byte-perfect-identity.md)
- [Ownership and marketplace](product/ownership-and-marketplace.md)
- [Frequently asked questions](reference/faq.md)
- [Phased development](roadmap/phased-development.md)
