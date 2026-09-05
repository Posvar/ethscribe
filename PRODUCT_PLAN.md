# Ethscribe Product Plan

**Category:** Ownable digital archaeology  
**Product:** `ethscri.be`  
**Status:** Public experiment with Expeditions 001 and 002, expedition-scoped signed Findings, and an active immutable marketplace
**Updated:** September 4, 2026

## Current product baseline

MVP and V1 are one wallet-native release. The current experiment asks whether people enjoy recovering historically significant files, documenting provenance, and collecting the resulting Ethscriptions.

The implemented public routes are Mission, Expeditions, the active Satoshi and sound expeditions, Field Wallet, and Docs. Public proposals are closed. Ethscribing and existing-asset deposits begin inside an expedition target; there is no general-purpose creation utility or arbitrary wallet deposit action.

The submission sequence is candidate test → create or deposit → wait for protocol/custody verification → sign and publish the Finding. Testing and the assignment signature cost no gas. A direct creation enters market custody with the researcher as protocol creator. It can be withdrawn without listing; a later one-time registration supplies the Ethscription ID needed to list it for sale.

For an already-recognized artifact, its current owning wallet can deposit the existing Ethscription directly from that expedition record. No re-upload, new Ethscription, or replacement Finding is required. The catalogue association follows the existing Ethscription ID into Field Wallet; listing remains a separate action.

Field Wallet provides inventory, assignment display, individual withdrawals, registration, fixed-price listing changes, and proceeds claims. A recovered artifact displays its available listing and purchase controls in the expedition. The immutable market charges 5% at settlement; seller proceeds and fees accrue to their respective claimable balances.

The active contract is `EthscribeMarketV2` at `0x65a6771a4f82bcc1fad26CC944cA673dDE2c4614`. Its version number describes a deployment, not a separate product release. Batch withdrawal and funded offers exist at contract level; the current interface does not provide complete public workflows for them. No independent security audit is documented.

## Current trust and identity boundaries

- Historical references and target definitions are curated. A hash match proves equality with the chosen reference, not independent authorship.
- Protocol uniqueness is scoped to the canonical complete Data URI without duplicate opt-in. Ethereum itself does not reject repeated payloads.
- Candidate checks cover the target and disclosed wrappers. There is no complete historical index of raw-byte matches across every encoding.
- A signed Finding attributes a claim to a wallet. Its timestamp is not proof of first historical discovery.
- A green target means a matching Ethscription has been recognized in the catalogue. Live escrow and sale status are separate checks.
- Lost-file candidates do not enter exact-match completion automatically. Public review and correction tooling remain work to build.
- The contract cannot read Ethscriptions ownership. Official-index reconciliation is part of the first-party trading boundary.
- An Accession is a recognized catalogue artifact whether or not it has sold. It does not confer copyright or exclusive access to copies.

## Next development priorities

### Expedition 002 release — known-byte sounds

The Macintosh, DOOM, and Pokémon placeholder expeditions have been removed. The owner approved publishing Expedition 002 and opening submissions on September 4, 2026. Its targets are exact, recoverable historical audio files—not speculative missing resources or modern recordings.

**You've Got History — the sounds of going online, 1992–2000.** The reference set has 17 files: four Windows 3.1 system-event WAVs, all five AOL 1.0 Windows sounds, ICQ 1.02 Beta's Message.wav, three MSN Messenger 1.0.0863 sounds, and four AIM 4.1.2010 sounds. Every reference has extracted bytes, a precise software release, pinned source/member hashes, raw and canonical-URI hashes, and reproducible extraction notes. Signed MSN/AIM installers provide stronger publisher authentication than the preserved unsigned disk images; these confidence levels stay explicit.

**Never change the historical bytes.** Preserve the complete original file including headers, metadata and padding. Do not resample, trim, normalize, strip metadata or re-export. Lossless extraction from its original software archive is permitted and documented. Windows 95's verified 135,876-byte Microsoft Sound remains a deferred reference because it exceeds the current 90,000-byte creation limit; no transformation or infrastructure change is authorized to make it fit.

The founder's You've Got Mail Ethscription `0x7802ddffee8b4a11a14f60c824135f9aa119a82e021246d022eec8eff8ddb357` exactly matches the complete `GOTMAIL.WAV` in the inspected AOL 1.0 Windows distribution. This supports that version-specific claim, not absolute priority over all recordings, development builds, or platforms. Evidence, reference manifests, and exclusions live in [Expedition 002 research](research/expedition-002/README.md).

**Infrastructure decision: keep what is deployed.** No new creator, upgradeable vault, migration, or creation fee is planned for this pass. Continue the existing free direct-to-custody creation flow and immutable 5% sales fee. The [fee exploration](planning/CREATION_FEES_EXPLORATION.md) and [replacement-vault discussion](planning/UPGRADEABLE_MARKET_DIRECTION.md) are deferred historical options, not active implementation instructions.

The public expedition at `/expeditions/youve-got-history` and its directory card use the existing creation/deposit/Finding flow. `shared/soundTargets.json` is the shared browser/server commitment source; WAV files always use `data:audio/wav;base64,`. Target validation and signed assignments explicitly bind expedition plus target, and Azure stores each expedition's Findings under its own prefix. The five recognized AOL IDs support owner deposits and wallet links without replacement Findings. New accepted Findings update the sound catalogue and progress; owner deposits and sales remain separate states.

Reference WAVs, disk images, and installers stay in ignored research storage; tracked evidence contains hashes and source metadata. Only recognized Ethscriptions supply audio playback. Local development remains read-only. Publication approval is not a copyright grant, and no new contract, migration or creation fee is introduced.

### Delivery priorities

1. Make the first complete user journey legible and recoverable, including interrupted sessions and slow indexing.
2. Exercise creation, assignment, registration, listing, purchase, withdrawal, and claim with explicit outcomes.
3. Obtain independent review of custody, settlement, and transaction preparation.
4. Improve signature inspection, evidence export, and a visible lost-file review/correction process.
5. Measure independent participation and repeat interest across the two expeditions before further expansion or reopening proposals.

The current roadmap is maintained in [Phased development](public/docs-content/roadmap/phased-development.md). Visitor-facing behavior is documented in [Your first Finding](public/docs-content/product/first-finding.md) and [Ownership and marketplace](public/docs-content/product/ownership-and-marketplace.md).

## Earlier design notes — retained for context

The sections below preserve the original brainstorming and delivery assumptions. They are historical design material, not a description of implemented screens or commitments. Where they discuss auctions, tokens, dossier revisions, public proposals, automatic scheduling, contributor splits, or pre-contract milestones, the current baseline and linked roadmap above take precedence.

## Executive summary

Ethscribe is a recurring digital-archaeology game and marketplace. Each hunt asks the public to find the exact bytes of a historically important digital artifact, ethscribe those bytes, and build a transparent provenance case. The best eligible finding becomes a permanent Accession that collectors can acquire.

The first version should be Web3-native without pretending to be trustless in the one area that is inherently subjective: historical curation.

> **MVP/V1 trust model: trusted curation, trustless ownership and settlement.**

Wallets identify participants. Ethscriptions contain the artifacts. Dossiers are off-chain but wallet-signed. Community activity surfaces evidence and finalists. A named curator wallet or Safe decides factual eligibility against a public rubric. The immutable marketplace candidate enforces custody, offers, settlement, withdrawals, and fees without attempting to decide historical truth.

The site was built and deployed before the marketplace contract. The contract candidate now keeps the custody boundary small while application and incentive assumptions continue to develop outside it.

## Product promise

> Find the bytes. Establish the provenance. Own the artifact.

Ethscribe turns historically significant digital files into Accessions—recognized, transferable onchain artifacts backed by public evidence and an auditable chain of custody.

An Accession represents ownership of a recognized Ethscription and its public provenance record. It does not represent copyright, authorship, or exclusive access to the underlying file.

The strongest claim Ethscribe should make is:

> This is the earliest accepted Ethscription containing the exact decoded file bytes established by this hunt's evidence and curation process.

Ethscription uniqueness applies to the complete data URI. Ethscribe must separately calculate the decoded-file hash so differently encoded data URIs containing identical bytes can be recognized.

## Product principles

1. **Curated, not comprehensive.** Ethscribe indexes Accessions and credible Findings, not every Ethscription.
2. **Evidence before popularity.** Votes surface work; they do not manufacture historical truth.
3. **One clear object per hunt.** V1 produces at most one Accession, or `No Accession`.
4. **Transparent centralization.** Early curator decisions are signed, explained, and public.
5. **Trustless where money moves.** The marketplace contract controls custody and settlement; the curator cannot redirect assets or offers.
6. **Research remains editable.** Dossiers can improve until a deadline; frozen versions and later corrections remain auditable.
7. **No token in V1.** Reputation and financial incentives are added only after actual behavior identifies a need.
8. **No fake functionality.** The live shell clearly distinguishes available features from upcoming contract actions.
9. **Build the habit gradually.** Begin with weekly hunts; daily openings are earned by sustained supply and participation.

## Product vocabulary

| Term | Meaning |
|---|---|
| **Season** | A thematic group of hunts, initially monthly or quarterly. |
| **Hunt** | A bounded challenge to recover a historically important digital artifact. |
| **Finding** | An Ethscription submitted as a candidate for the active Hunt. |
| **Dossier** | The signed claim, sources, timeline, and supporting evidence for a Finding. |
| **Field Note** | A corroboration, correction, challenge, or additional source. |
| **Finalist** | A Finding surfaced by the community for curator eligibility review. |
| **Accession** | The eligible Finding that wins the collector auction. |
| **Curator** | The public wallet or Safe that signs eligibility decisions. |
| **Hunter** | The wallet that submits a Finding. |
| **Patron** | A collector who bids on an eligible Finding. |
| **Byte Perfect** | Exact decoded bytes matched to authoritative historical evidence. |

## The V1 loop

```text
Hunt opens
    |
    v
Hunters ethscribe and submit Findings
    |
    v
Community adds evidence, endorsements, and challenges
    |
    v
A small finalist set reaches curator review
    |
    v
Eligible Findings enter the auction
    |
    v
Highest eligible bid becomes the Accession
    |
    v
Fee funds Ethscribe and the next Hunt
    |
    v
Next queued Hunt opens
```

## Simple attack model

The protocol should assume one participant may control the submitter, many apparent researcher wallets, and a bidding wallet.

V1 handles that without building a new proof-of-stake system:

- Endorsement count affects discovery only.
- An endorsement provides no factual authority.
- Challenges and Field Notes are public and wallet-signed.
- Only the curator's signed eligibility decision admits a Finalist to the auction.
- Bids occur after eligibility and cannot change it.
- A self-bid may distort price but cannot validate provenance.
- The application reports unique bidders and obvious related funding where detectable, rather than treating headline price as proof of demand.
- The curator follows a hunt-specific rubric frozen before submissions open.
- Every decision includes a short public reason.

This accepts one explicit trust assumption: early users trust the curator to apply the published rules honestly. That is preferable to hiding the same authority behind a small, inexpensive, easily captured governance token.

If curator trust or workload becomes a demonstrated bottleneck, V2 introduces optimistic acceptance and a small council. Staking, random juries, and external courts are reserved for a later stage in which Accessions are valuable enough to attract serious coordinated attacks.

## MVP and V1 are one product release

MVP and V1 are not separate products. They are one release delivered in two implementation milestones:

### Milestone A: participation site

Launch the complete public experience before the contract:

- Wallet connection
- Active Hunt and countdown
- Historical brief and public rubric
- Artifact and source presentation
- Findings and dossier interface
- Community evidence and challenge model
- Finalist comparison
- Permanent-collection preview
- Future-Hunt proposal interface
- Clear marketplace preview

During the shell launch, transaction-dependent actions are marked `Opening soon`. The UI and information architecture are real; fake deposits, fake bids, and fake ownership are not shown as completed actions.

### Milestone B: marketplace settlement

Add the smallest audited contract that enables:

- Ethscription vault deposit
- Guaranteed withdrawal paths
- Curator-signed eligible Finding list
- Binding bids
- Refunds
- Atomic payment and Ethscription transfer
- Fixed 5% fee routing
- Permissionless settlement
- Automatic activation of the next queued Hunt

Milestone B completes V1 but does not require redesigning the site.

## Detailed MVP/V1 site plan

### Primary audience

The first audience spans three overlapping groups:

- Crypto-history and Ethscriptions collectors
- Digital-preservation, retrocomputing, and internet-history researchers
- Curious participants attracted to a recurring puzzle and public discovery process

The experience should explain itself without assuming knowledge of Ethscriptions.

### Information architecture

The site launches with these top-level destinations:

| Route | Purpose |
|---|---|
| `/` | Permanent site mission, field method, active-expedition preview, and future fieldwork. |
| `/expeditions` | Active, upcoming, concluded, unresolved, and No Accession expeditions. |
| `/expeditions/:slug` | Expedition brief, corpus timeline, artifact records, Findings, Field Notes, and later auction. |
| `/findings/:id` | Artifact preview, byte facts, dossier, sources, revisions, challenges, and owner. |
| `/collection` | Permanent Accessions and frozen provenance records. |
| `/wallet` | Connected wallet's directly owned Ethscriptions, vault positions, assignments, listings, bids, and proceeds. |
| `/expeditions/propose` | Reserved for a future proposal notebook; currently hidden and routed back to `/expeditions`. |
| `/about` | Ethscriptions, byte-perfect verification, ownership limits, and curation policy. |
| `/docs` | Git-backed project documentation and living whitepaper, using the same Markdown source as GitBook. |

The public shell separates the permanent mission at `/`, the reverse-chronological expedition archive at `/expeditions`, and Expedition 001 at `/expeditions/lost-pixels-of-satoshi`. The archive begins with active work and retains concluded expeditions below it so their records and assets remain discoverable.

Global navigation remains stable across routes: `Mission | Expeditions | Wallet`, followed by the wallet control. Method remains a homepage section rather than a global destination, and Docs remains available from the homepage and footer. Public expedition proposals are withheld until the participation model is ready. On an expedition route, a secondary context row identifies the active child (`Expedition 001: The Lost Pixels of Satoshi`). This becomes the expedition selector/dropdown when multiple expeditions exist; timeline-specific tools do not enter the global navigation.

### Documentation and whitepaper

Project documentation is maintained as GitBook-compatible Markdown in `public/docs-content`, with `.gitbook.yaml` and `SUMMARY.md` defining the published structure. The application renders that same source at `/docs`, keeping the first-party site, Git history, and an optional GitBook publication synchronized without duplicate editing.

The documentation covers the mission, protocol foundations, byte-perfect identity, evidence limits, Expedition mechanics, dossiers, curation, marketplace boundaries, economics, phased roadmap, autonomy plan, FAQ, and sources. It distinguishes shipped behavior from proposed phases and should be updated whenever a material trust assumption, contract parameter, or public claim changes.

### Home page

The home page should answer five durable questions immediately:

1. What is Ethscribe?
2. What kinds of digital history belong here?
3. How does byte-perfect authentication work?
4. What active expeditions can I enter?
5. What does a verified artifact become?

Required sections:

- Brand header and Connect Wallet control
- Hero statement: ownable digital archaeology
- Explicit mission section covering discovery, authentication, preservation, and ownership
- Four-step field method
- Active-expedition preview linking to its own route
- Future-expedition preview extending beyond internet history
- Next-Hunt proposal preview
- Clear disclaimer separating Ethscription ownership from IP rights

The home page must not inherit the visual subject or historical scope of the featured expedition. An expedition may be about Bitcoin, the early web, or pre-internet software without redefining the Ethscribe mission.

### Active Expedition page

Each expedition must contain:

- Title, ID, Season, status, and timeline
- One-sentence challenge
- Historical context
- Exact eligibility rubric
- Eligible file types and date/source boundaries
- Required evidence
- Known ambiguities
- Submission deadline
- Review/finalist deadline
- Auction window when enabled
- Current Findings
- Field Notes and challenges
- Curator identity and decision policy
- `No Accession` as a valid outcome

The expedition timeline is the primary catalogue interface. Every artifact pill expands its evidence record directly beneath its historical moment. Secured pills are fully green; all artifacts that still need Ethscribing are white. A lost-byte target is distinguished by explanatory copy and an explicit `BYTES UNKNOWN` label, not by treating it as a third completion color. Exact-byte targets remain clue-driven while open: their preview, raw source URL, and expected SHA-256 are sealed, and the browser receives only a match or mismatch from the server. The accepted Accession reveals the complete source and hash record.

Completion figures must be derived state, never separately edited content. In the shell, `secured / known` and its progress bar derive from the curated artifact manifest. After contract launch, the same UI derives secured status from indexed marketplace/vault state, reconciled against the manifest's raw-byte identities, so each accepted accession automatically updates the count and bar.

### Finding page

Each Finding contains:

- Ethscription transaction hash and number when available
- Current owner and submitter
- Artifact preview
- Actual MIME signature
- Decoded byte length
- SHA-256 of decoded bytes
- Creation block and timestamp
- Claim summary
- Versioned dossier
- Primary and secondary sources
- Wallet-signed Field Notes
- Endorsement count as a social signal
- Challenge status
- Curator decision and reason
- Auction state when eligible

### Artifact intake and Finding flow

The vault is expedition-agnostic. It stores Ethscription custody and market state; signed off-chain records connect an `ethscriptionId` to an Expedition and target.

The release supports three intake paths:

1. **Inline Ethscribe + Submit.** From an artifact target, upload a file, verify its raw hash, create it directly into market custody when needed, and sign its target assignment and Dossier.
2. **Generic Ethscribe.** Create an artifact directly into the vault without listing or assigning it. After indexer verification, the user may keep it vaulted, withdraw it, or continue into a compatible active target.
3. **Deposit an existing Ethscription.** Query assets owned by the connected wallet, select one or more, transfer them to the vault, and optionally assign them to targets.

Creation uses one direct-to-vault transaction. The connected wallet remains the protocol creator and the V2 market becomes initial owner. Because preflight cannot reserve uniqueness before mining, the same call emits a lower-priority ESIP-6 Finding Receipt: canonical input wins when unique; otherwise the hunter receives a timestamped receipt committed to the attempted protocol hash. Existing owned assets skip creation and use the ordinary deposit path.

Inline target actions, the global `Ethscribe` action, and the wallet's Expedition preflight share the same transaction engine. Every expedition target freezes one accepted Data URI wrapper; the embedded UI generates it and the Finding verifier enforces it. For an exact-byte target, the browser hashes locally and a server-side sealed commitment returns only eligibility before protocol duplicate checks or gas actions continue. The global flow lets the user choose a valid MIME type, then test compatible targets after creation or discovery of an existing wallet-owned match. `My Wallet` separates direct holdings from verified market custody, and custody alone never creates a Finding.

Preflight is progressively disclosed. The default result is one decision-oriented checkpoint—target matched, no known duplicate found, ready to Ethscribe. Raw and protocol hashes, the exact prefix, and individual wrapper checks remain available under `Technical checks`. A duplicate or mismatch expands into the relevant blocking explanation automatically.

Before the contract, a Finding remains non-custodial:

1. Connect wallet.
2. Enter the Ethscription transaction hash.
3. Verify and decode its content.
4. Enter the historical claim and sources.
5. Sign the canonical Dossier and target assignment.
6. Store the records through a Netlify Function.

After the contract, the user can also deposit before or after assignment. The wallet dashboard reconciles potential-deposit events with the official indexer's `current_owner` and `previous_owner` fields before displaying `Escrow verified`.

If a target's raw bytes are known, a private server-side commitment can first determine whether a candidate is eligible without publishing the answer during the hunt. After that match, the official API can quickly test known complete data-URI hashes. It cannot search by Ethscribe's wrapper-independent `rawSha256`; that requires the historical decoded-byte index. This limitation applies even to conventional PNG/JPEG wrappers, though XPM aliases make it more visible. The live client checks the frozen wrapper plus a disclosed set of common XPM aliases and explicitly avoids claiming exhaustive raw-byte uniqueness. If target bytes are unknown, automatic exact matching is impossible; a researcher must submit candidate bytes and a reproducible provenance case.

### Review flow

V1 includes three lightweight actions:

- **Endorse** — “This deserves finalist attention.”
- **Add evidence** — attach a source or explanatory Field Note.
- **Challenge** — explain a concrete reason the Finding fails the Hunt rubric.

These are wallet-signed public records. They do not have token weight and do not automatically approve or reject a Finding.

### Curator flow

The curator dashboard is intentionally narrow:

1. Review the highest-signal Findings and all challenged Findings.
2. Compare each against the frozen Hunt rubric.
3. Sign `Eligible`, `Ineligible`, or `Insufficient evidence`.
4. Add a short public reason.
5. Publish the Finalist set.

The curator cannot transfer deposited Ethscriptions or withdraw auction funds.

### Future-Hunt flow

V1 keeps topic selection simple:

1. Any connected wallet may submit a structured Hunt proposal.
2. Visitors endorse good proposals.
3. The curator selects a proposal into a prepared queue.
4. The selected Cartographer is named publicly.
5. When the associated Hunt later completes a primary sale, the author may receive a fixed portion of the 5% fee.

The contract eventually opens the next queued Hunt during settlement. The first queue should contain enough founder-prepared hunts to operate for several weeks without daily intervention.

## V1 visual direction

The experience should feel like a museum archive crossed with a terminal and a field notebook:

- Off-white paper rather than generic dark-mode crypto styling
- Black rules, grids, accession numbers, and monospaced evidence labels
- Acid green from the existing Ethscribe identity as the single action color
- Large editorial serif headlines paired with utilitarian sans-serif copy
- Pixel rendering for small historical digital artifacts
- Visible timestamps, hashes, file dimensions, and dossier language
- Restrained motion emphasizing scanning, countdowns, and status transitions

The product must not look like a generic NFT grid or a memecoin launcher.

## Site-first technical architecture

### Frontend

- React application already present in this repository
- Responsive CSS without a large component framework
- Native EIP-1193 wallet connection initially
- Static seed data for the first live shell
- Netlify-hosted production build
- Later client calls to same-origin Netlify Functions

### Netlify Functions

Functions become the only browser-facing interface to Azure Storage. They will:

- Read and write Hunt documents
- Read and write signed dossier revisions
- Validate wallet signatures
- Query and normalize Ethscriptions data
- Store Field Notes and Hunt proposals
- Generate short-lived asset URLs if private Blob access is required
- Enforce schemas, size limits, rate limits, and allowed content types

The Azure SAS token must never be compiled into the React bundle or exposed through a `REACT_APP_*` variable.

### Azure Blob Storage

**Account:** `ethscribe`  
**Container:** `ethscribe-assets`

Proposed logical layout:

```text
hunts/{hunt-id}/hunt.json
hunts/{hunt-id}/findings/{finding-id}/finding.json
hunts/{hunt-id}/findings/{finding-id}/dossiers/{revision}.json
hunts/{hunt-id}/findings/{finding-id}/field-notes/{note-id}.json
hunts/{hunt-id}/assets/{asset-name}
proposals/{proposal-id}.json
collection/{accession-id}.json
```

JSON objects should be immutable by identifier where practical. Mutable indexes can point to the latest signed revision.

Expected server-side environment variables:

```text
AZURE_STORAGE_ACCOUNT_NAME=ethscribe
AZURE_STORAGE_CONTAINER=ethscribe-assets
AZURE_STORAGE_SAS_TOKEN=<secret>
```

The linked Netlify project uses these exact variable names. The account and container may be safe configuration values, but keeping all three server-side makes environments explicit. The SAS token remains server-only and should be narrowed to the minimum permissions and duration required before uploads are enabled.

### Data integrity

Every signed document should use a canonical schema including:

```text
schemaVersion
documentType
huntId
findingId
revision
authorAddress
createdAt
payloadHash
signature
```

The server validates the signature and stores the submitted document without rewriting its signed fields.

### Raw-byte identity and historical-first indexing

Ethscriptions Protocol uniqueness is based on the SHA-256 of the complete UTF-8 data URI. The MIME type, Data URI parameters, encoding, and ESIP-6 rule are therefore part of protocol identity. They are not part of Ethscribe artifact identity.

Ethscribe defines:

```text
rawSha256 = SHA-256(decoded artifact bytes)
```

The same decoded bytes wrapped as `image/x-xpixmap`, `image/x-xpm`, or another syntactically valid Data URI are one Ethscribe artifact even when the protocol recognizes multiple Ethscriptions. Ethscribe must:

1. Decode every submitted Ethscription and calculate `rawSha256` itself.
2. Collapse matching raw hashes beneath one artifact record.
3. Backfill every historical Ethscription exposed by the official indexer, including calldata, ESIP-3 event creations, ESIP-7 gzip transport, ESIP-6 duplicates, and ESIP-8 attachments.
4. Maintain the index continuously by block, transaction index, and event-log index.
5. Label an inscription `earliest known raw-byte match` only after the historical backfill is complete.

The official API's `content_sha` hashes the complete Data URI and cannot answer whether identical decoded bytes were previously Ethscribed under another wrapper. Until the Ethscribe raw-byte index is complete, the site may say `not in this collection`; it must not claim `never previously Ethscribed`.

### Marketplace contract boundary

`EthscribeMarketV1` established the immutable marketplace on Ethereum mainnet at `0x44c241ac86724D64a33558b03A637a63D9a30B02`. `EthscribeMarketV2` inherits that settlement system and adds direct-to-vault creation, Finding Receipts, conditional exits for unregistered direct creations, and bounded batch withdrawal for both custody forms. The behavioral starting point remains the verified ittybits proxy at `0xa8Ee53258865c55a521727127D8a64c414163D36`, particularly its ESIP-2 escrow, depositor-keyed potential deposits, five-block cooldown, bulk transfers, listings, offers, and 5% fee ceiling.

Ethscribe changes the boundary in several ways:

- The vault remains unaware of Expeditions and targets.
- Target assignments and Dossiers remain signed off-chain.
- The interface reconciles every potential deposit against official indexer ownership.
- Contract wallets are supported rather than excluded with `tx.origin`.
- Seller proceeds and refunds use pull payments.
- Pausing never disables ordinary artifact or ETH withdrawals.
- Curated settlement anchors an opaque `contextHash` and frozen fee terms.
- Funded offers are available in the first-party interface only after official-indexer reconciliation and registered deposit state confirm escrow.

The immutable, non-proxy contract accepts and returns Ethscriptions, creates and cancels listings, holds escrow-first offers, accrues refunds and proceeds through pull payments, emits ESIP-2 transfers, applies a fixed 5% fee, and settles trades. It does not decide historical eligibility or activate Expedition records itself. The application observes settlement events and advances the prepared queue.

The 5% fee recipient is a replaceable boundary, not upgrade authority over custody. The solo-operated beta can initially route fees to a dedicated treasury EOA. A later Safe or rewards distributor can become the recipient for newly created positions; active listings and offers retain the recipient they originally displayed. Exact proposer or validator splits inside each settlement require a separately deployed market version.

Core evolution is versioned. V2 is a separate immutable deployment because direct creation changes custody intake semantics; V1 remains unchanged and available for exits. Future changes use the same migration model. No proxy administrator can rewrite the rules around artifacts already escrowed in any version.

Recognized artifacts that are not escrowed may collect nonbinding, wallet-signed interest, but the current market does not lock funds against them. Because Solidity cannot read Ethscriptions ownership, funded pre-escrow bidding would require buyer-finalized settlement or a disclosed ownership attestation, plus additional cancellation and stale-owner states. It is deferred until real usage justifies that complexity.

The escrow-first marketplace does not require Ethscribe to operate a separate protocol indexer. The app can read contract events and reconcile custody through the official Ethscriptions API, failing closed when that API is delayed or unavailable. Ethscribe's future wrapper-independent raw-byte index remains a separate archaeology requirement; marketplace bidding neither creates nor removes it.

The detailed state model, invariants, attack analysis, and delivery sequence live in the public Docs under `Ownership and marketplace`.

## Delivery plan

### Phase 0 — repository and deployment foundation

- Replace the untouched Create React App screen
- Add production metadata and Netlify configuration
- Initialize Git with `main`
- Create the `Posvar/ethscribe` GitHub repository
- Push the exact production source
- Connect the existing `ethscribellc` Netlify project to GitHub
- Configure `npm run build` and `build/`
- Verify `ethscri.be` remains the production domain
- Confirm environment variable names without exposing their values

### Phase 1 — public shell

- Implement the complete visual system
- Build the responsive home page
- Present Genesis Hunt 001: The Lost Pixels of Satoshi
- Include real historical source links and clearly labeled preview data
- Implement a real wallet-connect control
- Implement navigation, Hunt detail states, and proposal/submit previews
- Deploy publicly through Git-backed Netlify

### Phase 2 — persistent participation

- Add Netlify Functions
- Connect Functions to Azure Storage
- Add signature verification
- Add Ethscription lookup and decoded-byte hashing
- Persist Hunt proposals and dossier drafts
- Implement Finding pages and signed Field Notes
- Add basic moderation and rate limiting

**Current status:** the first production slice supports direct-to-vault creation within an expedition, inline target submissions, and existing-ID deposits. A submitted Finding is stored only after server-side verification of its wallet signature, official indexed content URI, decoded raw hash, frozen target wrapper, and reconciled custody. The proposal infrastructure remains implemented but is withheld from the public site until the participation model is ready. Public Finding pages, Dossier revisions, Field Notes, proposal moderation, rate limiting, and protocol-wide raw-byte indexing remain incomplete.

### Phase 3 — live Genesis Hunts

- Publish the frozen Hunt rubric
- Expand live Finding intake into a complete public review workflow
- Run three to five weekly Hunts
- Curate Finalists with signed decisions
- Measure return behavior and collector interest
- Refine schemas and states before contract work

### Phase 4 — marketplace completion

- Freeze `EthscribeMarketV2` direct-creation, batch-exit, inherited settlement, and withdrawal behavior
- Implement comprehensive contract tests
- Rehearse the immutable deployment locally; optionally use Sepolia, or record a deliberate skip in favor of a paused mainnet deployment
- Integrate official-indexer custody reconciliation into every first-party market action
- Obtain independent contract review
- Deploy the exact reviewed commit paused, with explicitly reviewed owner and fee-recipient wallets
- Enable deposits and binding offers in the existing UI
- Activate atomic settlement and fee routing
- Run the first primary Accession auction

**Current status:** V1 was deployed from commit `687ed2d`, exact-match source verified, and exercised through a disposable Deposit → Verify → Withdraw production pilot on August 31, 2026. V2 was deployed to Ethereum mainnet from commit `b2339be` at `0x65a6771a4f82bcc1fad26CC944cA673dDE2c4614` on September 1, 2026, received Sourcify `exact_match` verification, and was activated in block `25883396`. It passed the complete default and CI-profile contract suites, official-indexer parser review, and disposable local and mainnet-fork exercises covering direct creation plus both bulk-withdrawal paths. A low-value production direct-creation exercise remains the next release step. Independent review and low-value settlement checks remain required before marketplace trading.

## Roadmap after MVP/V1

### Later product phase — optimistic curation

Add only when curator review becomes a real bottleneck:

- Unchallenged Findings can advance under defined conditions
- Any concrete challenge triggers curator review
- A small curator Safe replaces one individual key
- Contributor history and domain labels help surface expertise
- Community proposals populate the Hunt queue directly after approval

### V3 — distributed curation

Add only when the community has enough repeat experts:

- Rotating domain-specific curator panels
- Nontransferable contribution reputation
- Transparent appeals to a larger council
- Reviewer and challenger rewards
- Multiple overlapping Hunts
- Secondary marketplace for Accessions

### V4 — cryptoeconomic security

Add only when Accession value makes coordinated attacks economically rational:

- Submission and challenge bonds
- Slashable typed attestations
- Random adjudicator panels
- Expanding appeals or external arbitration
- Security coverage proportional to value at risk
- Watchtower rewards

### Vn — autonomous daily institution

- One new multi-day Hunt opens each day
- A settlement event automatically triggers activation of the next community-selected Hunt
- Monthly Seasons create coherent exhibitions
- Fees sustain Hunt authors, researchers, challengers, and operations
- Multiple frontends and redundant dossier storage
- Governance is limited to parameters, safety, and adoption of new contract versions

The protocol reaches Vn when the founder can stop proposing Hunts and handling ordinary reviews without the cadence, quality, or revenue loop stopping.

## Initial economics

V1 uses one visible 5% marketplace fee paid to a snapshotted fee recipient. The initial solo treasury may follow this conceptual allocation:

| Recipient | Percentage of sale |
|---|---:|
| Seller | 95.0% |
| Ethscribe operations | 3.0% |
| Next-Hunt pool | 1.0% |
| Hunt proposal author | 0.5% |
| Research/community reserve | 0.5% |

The individual percentages are treasury policy rather than splits enforced inside `EthscribeMarketV1`. A later fee-recipient contract can make rewards claimable without upgrading the custody contract. The community reserve accumulates until there is enough activity to define fair distribution rules. No token or promised yield is required.

## Genesis Season

Suggested first sequence:

1. **The Lost Pixels of Satoshi** — map Satoshi's 2009–2010 icon workshop as a timeline: 7 of 22 known byte-perfect files already secured, 15 deterministic collection gaps, 14 mapped ICO components, and one genuine lost-file hunt for the attested `bitcoin20x20.png` attachment.
2. **PNG Genesis** — locate historically significant early PNG artifacts with exact source evidence.
3. **The Disputed Artifact** — deliberately test the process with several plausible versions.
4. **Open Discovery** — search a bounded category without a predetermined target.

The first Season should publish enough context that visitors can enjoy it even if they never connect a wallet.

## MVP/V1 success criteria

The product advances to contract work only if the site demonstrates:

- At least ten independent Hunters submit credible work across Genesis Hunts
- Multiple users add evidence to another person's Finding
- Participants return for more than one Hunt
- Several unrelated collectors express credible price interest
- The community proposes enough usable Hunts to maintain a queue
- Curator decisions can be explained consistently through the published rubric
- The site attracts interest from outside the existing Ethscriptions community

The product advances beyond V1 only when contract settlement repeats safely and curator workload or trust becomes a demonstrated constraint.

## Explicitly deferred

- Native token
- Proof-of-stake reviewer network
- Random juries
- External arbitration
- Daily Hunt cadence
- Fully permissionless Hunt policies
- Complex reputation scoring
- Cross-chain artifact indexing
- Unbounded royalties
- DAO governance
- AI adjudication of historical truth

These are possible future tools, not requirements for product legitimacy.

## Immediate build checklist

- [x] Update roadmap to the simplified trust model
- [x] Build and visually verify the public shell
- [x] Add real wallet connection
- [x] Add production metadata and Netlify configuration
- [x] Create and push the GitHub repository
- [x] Connect the existing Netlify project to the repository
- [x] Deploy the shell to `ethscri.be`
- [x] Confirm the server-side Azure variable names and container setting
- [x] Build the researched Satoshi artifact timeline and client-side XPM preview
- [x] Publish the Git-backed documentation and living whitepaper at `/docs`
- [ ] Design the signed dossier schema
- [ ] Backfill a protocol-wide decoded-byte SHA-256 index before making historical-first claims
- [ ] Implement Azure-backed Functions after the shell is live
