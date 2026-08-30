# Frequently asked questions

## Is Ethscribe an NFT marketplace?

No. Ethscribe is a curated digital-archaeology institution with a planned market for accepted Ethscriptions. The research brief, exact-byte verification, and provenance record come first. It does not index every asset someone wants to sell.

## What is an Ethscription?

It is a digital artifact created and transferred under the Ethscriptions protocol using Ethereum data. See the [Ethscriptions primer](../foundations/ethscriptions.md) and the official [protocol specification](https://docs.ethscriptions.com/overview/protocol-specification).

## What does “byte perfect” mean?

The decoded bytes match exactly, as measured by SHA-256. Looking identical is not enough. Metadata, container structure, source whitespace, or one changed bit produces a different byte identity.

## Can the same file bytes be Ethscribed more than once?

The protocol identifies the complete data URI. The same decoded bytes can potentially appear under different valid wrappers, MIME types, or protocol mechanisms. Ethscribe calculates `rawSha256` to group those equivalent payloads and find the earliest indexed raw-byte match.

## Does `content_sha` identify the raw file?

No. The official API's content hash identifies complete protocol content. Ethscribe separately decodes supported content and hashes the artifact bytes.

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

## Can a lost file have an expected hash?

No. If the bytes are genuinely lost, no authoritative target digest exists. The expedition instead freezes identifying criteria and requires a stronger provenance case for any recovered candidate.

## Will an XPM display in a browser?

Usually not natively. XPM is textual source data. Ethscribe can safely parse it and generate a pixelated preview, while preserving and hashing the original XPM bytes as the artifact.

## What is live now?

The Git-backed public site, mission, method, wallet connection, Expedition 001 research timeline, artifact inspection, and project documentation. Signed participation, persistent storage, a protocol-wide raw-byte index, contract custody, and bidding follow in the documented phases.

## How can I participate?

Explore the current expedition, inspect its unresolved records, preserve promising files without modification, and document source custody. Signed Finding and proposal workflows will become the formal entry points as Phase 2 launches.

## Can anyone propose an expedition?

That is the intended participation model. Proposals are permissionless to submit but curated before they enter the prepared queue. A proposal needs a bounded question, historical importance, sources, and a workable acceptance rubric.

## Why the name ethscri.be?

The name keeps the ownership mechanism visible: exact historical bytes are “ethscribed” into Ethereum's public record. The domain also supports a simple invitation—find it, prove it, ethscribe it.
