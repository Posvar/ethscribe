# Findings and dossiers

A Finding is a candidate Ethscription submitted to an Expedition. Its Dossier is the versioned, wallet-signed argument that connects the exact bytes to the historical claim.

The two are linked but distinct: an on-chain artifact cannot explain itself, and an eloquent dossier cannot repair the wrong bytes.

## Finding record

A Finding should expose:

| Field | Purpose |
|---|---|
| Ethscription ID | Locates the protocol creation |
| Creator and current owner | Establishes protocol custody |
| Complete content hash | Identifies the protocol content |
| `rawSha256` | Identifies the decoded artifact bytes |
| Byte length and signature | Supports reproducible inspection |
| Creation location and time | Establishes Ethereum chronology |
| Expedition target | States the claim being entered |
| Dossier revision | Links the current signed research record |
| Review status | Shows challenges and curator decision |
| Market state | Shows deposit, bid, or settlement state when enabled |

## Dossier contents

The signed payload should include:

```text
schemaVersion
documentType
expeditionId
findingId
revision
artifactRawSha256
claimSummary
sourceReferences[]
knownUncertainties[]
authorAddress
createdAt
previousRevisionHash
payloadHash
signature
```

Canonical serialization rules are part of the schema. The server validates a signature and stores the signed fields without rewriting them.

## Revisions

Researchers need to improve a case as new evidence arrives. Each Dossier revision therefore:

- receives a deterministic hash;
- points to the preceding revision;
- retains its original author and signature;
- remains readable after a newer revision is published; and
- freezes at the expedition deadline for eligibility review.

Later corrections can append to the permanent record without pretending the original decision never happened.

## Field Notes

A Field Note is a small, signed contribution attached to a Finding. Its type is explicit:

- **Corroboration** — adds independent support.
- **Source** — contributes a primary or secondary reference.
- **Correction** — fixes a factual or technical detail.
- **Challenge** — identifies a concrete rubric failure.
- **Response** — addresses an existing challenge.

An endorsement is a discovery signal, not an evidence type.

## Submission before the marketplace

The participation release can support a non-custodial flow:

1. Connect a wallet.
2. Enter an Ethscription identifier.
3. Verify and decode the artifact.
4. Build the historical claim and source list.
5. Review the canonical payload.
6. Sign and publish the Dossier.

No interface should imply that an artifact has been deposited, sold, or accessioned before those operations exist on-chain.

## Submission after the marketplace

When the vault contract is live, an eligible submission also deposits the Ethscription under an explicit withdrawal policy. The indexed deposit state becomes part of the Finding record. Research remains off-chain and signed; custody and settlement become on-chain.

## Moderation

Ethscribe is curated and may hide spam, abuse, irrelevant uploads, or unsafe links from normal discovery. Moderation is not permission to alter signed research. Hidden records retain their hashes and audit status where lawful; curator eligibility remains a separate decision.
