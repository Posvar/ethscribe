# Findings and dossiers

A **Finding** connects an Ethscription to a particular expedition target. Its historical claim and source evidence explain why those bytes belong in the record.

The current release implements a compact signed assignment. A fuller research dossier with revisions, multiple contributors, and challenges is planned.

## What a current Finding records

| Field | Purpose |
|---|---|
| Expedition and target | Identifies the historical claim being submitted |
| Ethscription ID | Identifies the onchain creation |
| Decoded raw-file SHA-256 | Binds the exact file bytes |
| Protocol content SHA-256 and wrapper | Binds the complete submitted Data URI |
| Byte length and filename | Supports inspection |
| Claim summary | Explains the proposed match |
| One primary source URL | Points to the evidence used by the researcher |
| Author and custody contract | Identifies the signer and the required market custody |
| Signed timestamp | Records when the assignment was prepared |

The message signature binds the target, Ethscription ID, hashes, byte length, wrapper, author, custody contract, timestamp, claim, and source URL. The filename is display metadata and is not part of the current signed message.

## Verification and publication

The server reconstructs the signed message, recovers the author address, and rejects expired or inconsistent assignments. It independently reads the indexed Ethscription, decodes its content, reproduces the hashes, and verifies both target validation and market custody.

Stored assignments are created without overwriting an existing record for the same target and Ethscription. The public Findings feed exposes the fields used by the expedition and wallet; it is not yet a full dossier viewer or a download of every stored signature.

A successful exact-target Finding can populate the corresponding expedition slot. For the lost target, accepted file format and custody are not historical authentication. Its candidate stays out of automatic exact-match completion.

## Timing and priority

Ethereum orders Ethscription creations independently of the site. A Finding's signed timestamp or server verification time is not proof that its author discovered the historical file first.

The catalogue currently merges exact Findings into its curated target map. It does not offer a decentralized voting mechanism or claim protocol-wide precedence across every alternate encoding.

## Writing a useful source claim

State where the file was recovered, the historical path or release involved, and what connects that preserved source to the target. Preserve the original archive and neighboring files where available.

A screenshot can illustrate context but normally cannot establish exact bytes. A modern reconstruction should be identified as such, even if its pixels resemble the historical work.

## Planned dossier model

Later releases may add:

- Multiple source references with archived copies and access dates.
- Append-only, signed research revisions.
- Independent corroboration, corrections, and challenges.
- Named eligibility decisions with reasons.
- Public signature inspection and durable record export.

These are development directions. The current submission form does not provide those review tools, and their existence should not be inferred from a “verified” byte match.

Read [your first Finding](first-finding.md) for the current submission steps and [curation and trust](curation-and-trust.md) for the limits of automated checks.
