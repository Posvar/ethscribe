# Phased development

Ethscribe grows in response to demonstrated behavior. The roadmap adds complexity only when a working product reveals the need for it.

## Phase 0 — foundation

**Outcome:** a reproducible, Git-backed production deployment.

- Establish the React application and visual identity.
- Connect the repository to the existing Netlify project and `ethscri.be`.
- Preserve server-side Azure configuration without exposing secrets.
- Document the product, trust model, and delivery gates.

**Status:** complete.

## Phase 1 — public museum and field guide

**Outcome:** anyone can understand the mission and explore the first expedition.

- Separate the permanent mission from expedition-specific storytelling.
- Publish the Satoshi artifact timeline with expandable evidence records.
- Add real wallet connection without fake transactional state.
- Publish a GitBook-compatible whitepaper and integrated docs.
- Clearly label known gaps, secured artifacts, and bytes-unknown targets.

**Status:** complete. The museum shell, first expedition, wallet connection, evidence records, and integrated documentation are live.

## Phase 2 — persistent participation

**Outcome:** wallets can create durable research records without marketplace custody.

- Add Netlify Functions and Azure-backed storage.
- Implement canonical EIP-712 Dossier signatures.
- Verify Ethscriptions and calculate decoded-byte hashes.
- Publish Finding pages, Dossier revisions, Field Notes, and proposals.
- Add abuse controls and curator review tooling.
- Begin the protocol-wide raw-byte index.

**Release gate:** independent users can submit and verify signed records without privileged database edits.

## Phase 3 — live genesis expeditions

**Outcome:** prove that the research loop creates repeat participation.

- Freeze and publish expedition rubrics.
- Run three to five multi-day or weekly expeditions.
- Curate Finalists with signed decisions.
- Measure cross-expedition retention, collaborative research, and credible collector intent.
- Refine schemas and rules from observed edge cases.

**Release gate:** at least ten independent hunters contribute credible work, users improve others' Findings, the proposal queue has usable depth, and curator reasoning remains consistent.

## Phase 4 — V1 marketplace

**Outcome:** trusted eligibility connects to trustless custody and settlement.

- Freeze `EthscribeMarketV1` invariants, offer states, and withdrawal behavior.
- Build comprehensive contract and integration tests.
- Rehearse deployment locally; use Sepolia when its public-chain exercise is worth the extra step, or record a deliberate skip in favor of a paused mainnet deployment.
- Integrate official-indexer reconciliation into every first-party market action.
- Obtain independent contract review.
- Deploy the exact reviewed commit paused, with explicitly reviewed owner and fee-recipient wallets.
- Enable deposits, binding offers, refunds, settlement, and fee routing.
- Complete the first primary Accession auction.

**Current status:** the immutable contract, unit/fuzz/invariant suite, threat model, and deployment record are public. V1 is deployed to Ethereum mainnet and source-verified. The wallet integrates fail-closed official-indexer reconciliation, and the first disposable Deposit → Verify → Withdraw pilot completed through the production UI on August 31, 2026. The owner left the contract unpaused and pilot interface enabled afterward. Independent review, settlement controls, and the low-value settlement procedure remain incomplete; the contract is not approved for valuable custody.

**Release gate:** every asset and fund path is tested, failure recovery does not require curator goodwill, and the live UI is reconciled to contract and official-indexer state.

## V2 — optimistic curation

Introduced only if review volume becomes a measured bottleneck:

- unchallenged Findings can advance under strict conditions;
- any concrete challenge triggers review;
- a curator Safe replaces one key;
- contribution history helps surface expertise; and
- community proposals more directly populate the prepared queue.

## V3 — distributed expertise

Introduced only after repeat contributors establish useful domain knowledge:

- rotating domain-specific panels;
- nontransferable contribution reputation;
- transparent appeals to a wider council;
- reviewer and challenger rewards;
- concurrent expeditions; and
- secondary Accession trading.

## V4 — cryptoeconomic security

Introduced only when value at risk attracts serious coordinated attacks:

- submission and challenge bonds;
- slashable typed attestations;
- randomized adjudicator panels;
- expanding appeals or external arbitration;
- security budgets proportional to value; and
- watchtower rewards.

## Vn — autonomous institution

The mature system can open one new multi-day expedition each day while Seasons create larger exhibitions. Settlement events advance a community-sourced queue, fees sustain contributors and operations, storage has redundant readers, and ordinary operation no longer requires the founder.

Autonomy is achieved when stopping founder proposals and routine reviews does not stop cadence, quality, safety, or revenue.

## Explicitly deferred

- a native token;
- proof-of-stake historical validation;
- fully permissionless expedition topics;
- daily cadence at launch;
- AI adjudication of historical truth;
- unbounded royalties;
- cross-chain scope; and
- broad DAO governance.

These are possible tools, not milestones the project must eventually adopt.
