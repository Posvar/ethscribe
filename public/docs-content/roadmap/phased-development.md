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

**Status:** in progress; the public shell and documentation are live deliverables.

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

- Freeze `EthscribeMarketV1` invariants, bid states, and withdrawal behavior.
- Build comprehensive contract and integration tests.
- Obtain independent contract review.
- Deploy with conservative value limits.
- Enable deposits, binding bids, refunds, settlement, and fee routing.
- Complete the first primary Accession auction.

**Release gate:** every asset and fund path is tested, failure recovery does not require curator goodwill, and the live UI is reconciled to contract state.

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
