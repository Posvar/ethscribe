# Threat model

Ethscribe assumes an attacker may control a hunter, many apparent researcher wallets, and one or more bidding wallets. It also assumes that archives can disappear, indexers can be wrong, web services can be compromised, and curators can make mistakes.

The goal is not to make historical judgment trustless. It is to expose each trust boundary and keep an attack in one layer from silently controlling another.

## False Finding with collusion

**Attack:** A hunter submits incorrect bytes, uses many wallets to endorse the claim, and adds circular corroboration.

**V1 controls:**

- endorsement count affects discovery only;
- sources must support named propositions and remain inspectable;
- Field Notes are signed and challenges stay visible;
- the rubric is frozen before submissions;
- a named curator signs an evidence-based decision; and
- `Insufficient evidence` and `No Accession` are valid outcomes.

**Residual risk:** The curator can be deceived or dishonest. Public reasoning and later corrections make this legible; a small Safe or expert panel is introduced only when volume or trust warrants it.

## Bid-based legitimacy attack

**Attack:** Related wallets place large bids on a false or low-value Finding to imply authenticity or demand.

**Controls:** Eligibility is finalized before bidding. Price never contributes to evidence status. The interface can report unique bidders, related funding visible on-chain, and net exposure rather than presenting gross bids as independent demand.

**Residual risk:** Economic relationships can be hidden. Market activity remains a market signal, never historical proof.

## Sybil spam and brigading

**Attack:** Many wallets flood submissions, endorsements, proposals, or challenges.

**Controls:** Rate limits, deposits or small fees where necessary, structured evidence requirements, reputation as a discovery aid, moderation, and a curated queue. Wallet count alone grants no adjudication power.

## Curator abuse or key compromise

**Attack:** A curator approves an ineligible artifact, suppresses a competitor, or loses the signing key.

**Controls:** Frozen rubrics, signed reasons, public conflicts, abstention, explicit deadlines, and separation from custody. Later phases move to a Safe and rotating domain experts.

**Residual risk:** V1 depends on curator judgment. The system states that fact instead of hiding it behind low-participation governance.

## Custody theft or trapped assets

**Attack:** A contract or privileged operator transfers deposits improperly or prevents withdrawals.

**Controls:** Minimal contract scope, guaranteed withdrawal paths, no arbitrary curator transfer, atomic settlement, comprehensive tests, independent review, conservative limits, and permissionless recovery functions where possible.

## Signature replay and record substitution

**Attack:** A valid signature is reused for another chain, expedition, Finding, or payload.

**Controls:** Typed-data domain separation, explicit identifiers and revisions, payload hashes, deadlines, nonce or idempotency rules where needed, and exact Dossier/rubric hashes in curator decisions.

## Malicious files and links

**Attack:** A submitted artifact exploits a decoder, executes in the site origin, or uses server-side URL fetching to reach internal services.

**Controls:** Inert storage, sandboxed previews, strict content limits, maintained decoding libraries, no unsandboxed HTML execution, outbound-fetch allowlists, network egress controls, and malware scanning appropriate to displayed formats.

## Index poisoning or incomplete history

**Attack:** A candidate appears unique because the index omitted an older wrapper, creation path, or reorganization.

**Controls:** Protocol-wide historical backfill, accepted-ESIP coverage, deterministic ordering, reorg handling, coverage reporting, parser versioning, and cautious language until the index is complete.

## Storage tampering or disappearance

**Attack:** Hosted dossiers are changed or removed.

**Controls:** Signed immutable objects, content hashes, revision chains, exportable records, backups, redundant storage in later phases, and public verification tooling.

## Governance capture

**Attack:** A token holder or voting bloc turns Ethscribe into an uncurated marketplace or directs rewards to itself.

**Controls:** No token in V1, narrow governance scope later, nontransferable contribution history where useful, transparent queues, and gradual decentralization tied to demonstrated expertise and risk.

## Security posture by layer

| Layer | Primary assurance |
|---|---|
| Historical claim | Sources, rubric, public curation |
| Artifact identity | Reproducible decoded-byte hash |
| Protocol chronology | Ethereum data and complete indexing |
| Research integrity | Typed signatures and immutable revisions |
| Custody and payment | Reviewed smart contract |
| Discovery and moderation | Transparent application policy |

No layer is allowed to claim the assurance of another.
