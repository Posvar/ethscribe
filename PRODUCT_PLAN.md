# Ethscribe Product Plan

**Category:** Ownable digital archaeology  
**Product:** `ethscri.be`  
**Status:** Site-first MVP/V1 plan  
**Updated:** August 30, 2026

## Executive summary

Ethscribe is a recurring digital-archaeology game and marketplace. Each hunt asks the public to find the exact bytes of a historically important digital artifact, ethscribe those bytes, and build a transparent provenance case. The best eligible finding becomes a permanent Accession that collectors can acquire.

The first version should be Web3-native without pretending to be trustless in the one area that is inherently subjective: historical curation.

> **MVP/V1 trust model: trusted curation, trustless ownership and settlement.**

Wallets identify participants. Ethscriptions contain the artifacts. Dossiers are off-chain but wallet-signed. Community activity surfaces evidence and finalists. A named curator wallet or Safe decides factual eligibility against a public rubric. Later, a small marketplace contract will enforce custody, bids, settlement, withdrawals, and fees.

The site will be built and deployed before the marketplace contract. This provides a real public product, lets the first hunts establish the interaction model, and prevents contract design from freezing assumptions that have not yet been tested.

## Product promise

> Find the bytes. Prove the history. Own the artifact.

An Accession represents ownership of a recognized Ethscription and its public provenance record. It does not represent copyright, authorship, or exclusive access to the underlying file.

The strongest claim Ethscribe should make is:

> This is the earliest accepted Ethscription containing the exact decoded file bytes established by this hunt's evidence and curation process.

Ethscription uniqueness applies to the complete data URI. Ethscribe must separately calculate the decoded-file hash so differently encoded data URIs containing identical bytes can be recognized.

## Product principles

1. **Curated, not comprehensive.** Ethscribe indexes Accessions and credible Findings, not every Ethscription.
2. **Evidence before popularity.** Votes surface work; they do not manufacture historical truth.
3. **One clear object per hunt.** V1 produces at most one Accession, or `No Accession`.
4. **Transparent centralization.** Early curator decisions are signed, explained, and public.
5. **Trustless where money moves.** The later contract controls custody and settlement; the curator cannot redirect assets or bids.
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
| `/` | Active Hunt, urgency, leading Findings, and explanation of the product. |
| `/hunts` | Active, upcoming, concluded, unresolved, and No Accession hunts. |
| `/hunts/:slug` | Hunt brief, rubric, timeline, Findings, Field Notes, and later auction. |
| `/findings/:id` | Artifact preview, byte facts, dossier, sources, revisions, challenges, and owner. |
| `/collection` | Permanent Accessions and frozen provenance records. |
| `/propose` | Structured proposal for a future Hunt. |
| `/about` | Ethscriptions, byte-perfect verification, ownership limits, and curation policy. |

The first shell may implement these as anchored sections and UI states before routing and persistent data are added.

### Home page

The home page should answer five questions immediately:

1. What is Ethscribe?
2. What is today's active Hunt?
3. What exact artifact is being sought?
4. How can I participate?
5. What does the winning artifact become?

Required sections:

- Brand header and Connect Wallet control
- Hero statement: ownable digital archaeology
- Active Hunt dossier with historical source
- Status strip showing chain, stage, and deadlines
- Candidate artifact board or target checklist
- Four-step participation explanation
- Permanent Collection preview
- Next-Hunt proposal preview
- Clear disclaimer separating Ethscription ownership from IP rights

### Active Hunt page

Each Hunt must contain:

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

### Submit Finding flow

Before the contract:

1. Connect wallet.
2. Enter the Ethscription transaction hash.
3. Application verifies that it exists and shows its content.
4. Enter the historical claim.
5. Add source URLs and notes.
6. Sign the canonical dossier payload.
7. Store the signed dossier through a Netlify Function.

After the contract:

8. Deposit the Ethscription into the Hunt vault.
9. Confirm the deposit and publish the Finding.

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

### Marketplace contract boundary

The site is designed now around a small later contract, tentatively `HuntHouse`, with these responsibilities:

- Register a Hunt and its timing
- Accept and return Ethscriptions
- Accept the curator's signed eligibility root
- Accept bids on eligible Findings
- Refund losing bids
- Transfer the winning Ethscription
- Split the 5% fee
- Settle permissionlessly
- Activate the next queued Hunt

Research data, comments, source URLs, ranking, and presentation remain off-chain and signed.

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
- Present Genesis Hunt 001: Satoshi's Workshop
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

### Phase 3 — live Genesis Hunts

- Publish the frozen Hunt rubric
- Open real Finding submissions
- Run three to five weekly Hunts
- Curate Finalists with signed decisions
- Measure return behavior and collector interest
- Refine schemas and states before contract work

### Phase 4 — marketplace completion

- Specify `HuntHouse` invariants and withdrawal behavior
- Implement comprehensive contract tests
- Obtain independent contract review
- Deploy with conservative value limits
- Enable deposits and binding bids in the existing UI
- Activate atomic settlement and fee routing
- Run the first primary Accession auction

## Roadmap after MVP/V1

### V2 — optimistic curation

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
- Settlement automatically activates the next community-selected Hunt
- Monthly Seasons create coherent exhibitions
- Fees sustain Hunt authors, researchers, challengers, and operations
- Multiple frontends and redundant dossier storage
- Governance is limited to parameters, safety, and upgrades

The protocol reaches Vn when the founder can stop proposing Hunts and handling ordinary reviews without the cadence, quality, or revenue loop stopping.

## Initial economics

V1 uses one visible 5% marketplace fee. The initial conceptual split is:

| Recipient | Percentage of sale |
|---|---:|
| Seller | 95.0% |
| Ethscribe operations | 3.0% |
| Next-Hunt pool | 1.0% |
| Hunt proposal author | 0.5% |
| Research/community reserve | 0.5% |

The community reserve accumulates until there is enough activity to define fair distribution rules. No token or promised yield is required.

## Genesis Season

Suggested first sequence:

1. **Satoshi's Workshop** — recover and document Satoshi's original released icon files.
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
- [ ] Design the signed dossier schema
- [ ] Implement Azure-backed Functions after the shell is live
