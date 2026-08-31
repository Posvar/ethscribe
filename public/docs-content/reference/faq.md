# Frequently asked questions

## Is Ethscribe an NFT marketplace?

No. Ethscribe is a curated digital-archaeology institution with a planned market for accepted Ethscriptions. The research brief, exact-byte verification, and provenance record come first. It does not index every asset someone wants to sell.

## What is an Ethscription?

It is a digital artifact created and transferred under the Ethscriptions protocol using Ethereum data. See the [Ethscriptions primer](../foundations/ethscriptions.md) and the official [protocol specification](https://docs.ethscriptions.com/overview/protocol-specification).

## What does “byte perfect” mean?

The decoded bytes match exactly, as measured by SHA-256. Looking identical is not enough. Metadata, container structure, source whitespace, or one changed bit produces a different byte identity.

## Can the same file bytes be Ethscribed more than once?

The protocol identifies the complete data URI. The same decoded bytes can potentially appear under different valid wrappers, MIME types, or protocol mechanisms. Ethscribe calculates `rawSha256` to group those equivalent payloads and find the earliest indexed raw-byte match.

PNG and JPEG conventions reduce accidental variation but do not eliminate it: MIME aliases, parameters, percent encoding, gzip, attachments, and opt-in protocol rules can still change protocol identity without changing the eventual file bytes. Expedition actions therefore freeze and generate one accepted wrapper.

## Does `content_sha` identify the raw file?

No. The official API's content hash identifies complete protocol content. Ethscribe separately decodes supported content and hashes the artifact bytes.

## Can Ethscribe recognize a matching artifact created outside the site?

Yes. For a known complete data URI, the official API can find its `content_sha` immediately. Finding the same decoded bytes under every possible wrapper requires Ethscribe's raw-byte index. The artifact can be recognized and assigned to a target whether or not it was created through the site or deposited in the market contract.

For a lost target, there is no expected byte hash to query. Someone must first submit candidate bytes and a provenance case as a Finding.

## Is Ethscribe's “earliest” claim complete today?

Not until the protocol-wide raw-byte backfill covers all relevant creation paths and accepted ESIPs. The current interface can state whether a match is in the curated collection. Stronger chronology language is deliberately gated on index coverage.

## Why use a curator instead of voting?

Historical truth is vulnerable to sybil voting and requires domain judgment. V1 lets votes surface work while a named curator applies a frozen public rubric and signs a reason. Custody and settlement later move to a contract so the curator does not control funds.

## Could a curator still be wrong?

Yes. Decisions, evidence, and challenges remain public. Later evidence can append a correction or dispute. The product does not claim that an auction makes scholarship infallible.

## Why not launch a token for researchers?

A token would encourage speculation and sybil behavior before contribution quality can be measured. V1 uses wallet-signed records. More complex reputation or bonds appear only if a demonstrated problem requires them.

## What do I own if I buy an Accession?

You own the recognized Ethscription under the protocol's transfer rules. You do not automatically acquire copyright, trademark, authorship, exclusive access to the bytes, or a license to commercialize the historical work.

## Does the marketplace contract need to know about expeditions?

No. The V1 candidate stores Ethscription IDs, depositors, listings, offers, and payment state. Wallet-signed records connect those assets to expedition targets and Dossiers. A sale may anchor an opaque context hash without teaching the contract historical taxonomy or making the hash itself proof of curatorial approval.

## Can someone bid before an Ethscription is escrowed?

Not with funds in V1. A recognized, non-escrowed artifact may collect a nonbinding interest signal, but executable offers begin only after the official API confirms contract custody. Funded pre-escrow bids are technically possible with a two-phase flow, but Solidity cannot inspect Ethscriptions ownership directly and the added stale-owner, cancellation, and bidder-finalization states are deferred until demand justifies them.

## Does the marketplace require a separate indexer?

Not for escrow-first V1. The app reads market contract events and uses the official Ethscriptions API to reconcile `current_owner` and `previous_owner` before showing verified custody. Ethscribe's future decoded-byte index is still needed for wrapper-independent archaeological claims, but that is separate from bidding and settlement.

## Can a lost file have an expected hash?

No. If the bytes are genuinely lost, no authoritative target digest exists. The expedition instead freezes identifying criteria and requires a stronger provenance case for any recovered candidate.

## Will an XPM display in a browser?

Usually not natively. XPM is textual source data. Ethscribe can safely parse it and generate a pixelated preview, while preserving and hashing the original XPM bytes as the artifact.

## What is live now?

The Git-backed public site, mission, method, wallet connection, Expedition 001 research timeline, artifact inspection, project documentation, personal Ethscription creation, verified market custody, and signed target Finding intake. A protocol-wide raw-byte index, public Finding review pages, listings, offers, settlement, and bidding remain incomplete.

## How can I participate?

Explore the current expedition, inspect an unresolved target, preserve the candidate without modification, and use its embedded **Ethscribe + Submit** flow. To preserve an unrelated file first, use the global **Ethscribe** page; after creation it offers a compatible expedition handoff without moving the file unless you choose to continue.

## Can anyone propose an expedition?

That is the intended participation model. Proposals are permissionless to submit but curated before they enter the prepared queue. A proposal needs a bounded question, historical importance, sources, and a workable acceptance rubric.

## Why the name ethscri.be?

The name keeps the ownership mechanism visible: exact historical bytes are “ethscribed” into Ethereum's public record. The domain also supports a simple invitation—find it, prove it, ethscribe it.
