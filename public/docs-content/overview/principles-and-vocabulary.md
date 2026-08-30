# Principles and vocabulary

## Product principles

1. **Curated, not comprehensive.** Ethscribe indexes recognized targets and credible research, not every inscription.
2. **Evidence before popularity.** Votes surface work; they do not create facts.
3. **Exactness is explicit.** A visual match is not a byte-perfect match.
4. **Transparent centralization.** Early curator authority is named, bounded by a public rubric, and expressed through signed decisions.
5. **Trustless where money moves.** Contract custody and settlement should not depend on curator discretion.
6. **Research remains correctable.** Frozen decisions remain auditable while later corrections can be appended.
7. **No fake functionality.** Pre-contract interactions must say what is local, off-chain, or unavailable.
8. **No token before need.** Reputation and economic security follow observed behavior.
9. **Ownership is not intellectual property.** An Accession does not transfer copyright or authorship.
10. **Cadence follows quality.** Weekly expeditions precede daily ones.

## Vocabulary

| Term | Meaning |
|---|---|
| Expedition | A bounded public hunt for one artifact or a defined corpus |
| Season | A thematic group of expeditions |
| Target | The exact artifact definition and evidence boundary for an expedition |
| Finding | An Ethscription submitted as a candidate |
| Dossier | The signed claim, sources, timeline, and evidence for a Finding |
| Field Note | A signed corroboration, correction, challenge, or additional source |
| Finalist | A Finding advanced for formal eligibility review |
| Accession | The accepted Finding that enters the permanent catalogue |
| Hunter | A wallet that submits a Finding |
| Curator | The wallet or Safe that signs an eligibility decision |
| Patron | A collector who bids on an eligible Finding |
| Cartographer | The author of an expedition proposal selected for the queue |
| Byte perfect | Exactly matching decoded file bytes |
| Known-byte gap | A target whose authoritative bytes and hash are known but not yet represented in the collection |
| Lost-byte target | A historically attested artifact whose authoritative bytes are not currently known |
| No Accession | A valid conclusion when no Finding meets the rubric |

## Status language

The product should distinguish the following statements:

| Statement | Required support |
|---|---|
| `Not yet in this collection` | No accepted matching Accession in Ethscribe |
| `Raw-byte match` | Decoded payload hash equals the target hash |
| `Earliest known raw-byte match` | Complete historical raw-byte index and deterministic ordering |
| `Historically eligible` | Curator decision against the frozen expedition rubric |
| `Ethscribed` | A valid Ethscription exists; this alone says nothing about historical significance |

Until the protocol-wide raw-byte backfill is complete, Ethscribe must not convert `not in this collection` into `never previously Ethscribed`.
