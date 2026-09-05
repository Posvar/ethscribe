# Expedition 000 — EBURP: Before the Punks

Status: **public release approved by the owner on 5 September 2026**, following local review. Release verification is separate from the historical preview test records below.

Public route: `https://ethscri.be/expeditions/eburp`. Local review remains available at the same path on the development server.

## Product intent

Make Ethscribe the durable home for the existing EBURP collection’s story and original artifacts before the owner decides whether to sunset `eburp.art`. Expedition 000 is a completed retrospective, not a new hunt, not a request to create replacement Ethscriptions, and not an assertion that everything is available to buy.

The directory retains live Expeditions 002 and 001 first. A separate completed-expeditions section introduces 000 with the shared card layout, a COMPLETE badge, sprite contact sheet, and catalogue/core/archive counts. Other unpublished concepts remain private development work, not new public expeditions.

## Release experience

- Hero: the title, a concise introduction, recorded-collection counts, and 24 original core sprites enlarged with pixel-preserving display. Each sprite opens its file record.
- Collection: Tradeable Core 92 selected by default; separate Burned Archive 124. All sprites in the selected group appear in a smaller image-only grid, without pagination. Search/type filters remain available; names, types and numbers appear in expanded records and accessible button labels.
- Original PNGs are the visual focus, on white backgrounds, without resaving, color conversion, metadata stripping, or raster regeneration.
- Selecting a character expands its Satoshi-style record immediately below the current grid row. Deep links select the right group and record. Close/Escape restores keyboard focus.
- Records show original names and descriptions, file format/size/raw SHA-256, recorded creation transaction, Owner Wallet and source evidence. Fresh ID and protocol hash checks precede owner display. Verified immutable creator/date may come from the research record; current ownership never comes from a historical snapshot.
- The five-chapter story covers Gurk’s early mobile constraints, Matt Hall’s one-copy retrospective, the 2013 EBURP source release, creative lineage before CryptoPunks, and the 2023 collection/archive decision. The owner’s revised copy links @posvar, removes the redundant 2010 date sentence and drops the artifact-versus-redraw chapter. The original catalogue link is removed from the visitor source list but retained in research evidence.
- Nearby source links and verification notes explain what is established and what remains attributed or unchecked.

## Evidence and boundaries

The read-only import is `C:/dev/EBURP/public/eburp.csv`: 315,496 bytes, SHA-256 `1ab04fec5ff5c5586741b4503d69ae5538ee8963477693db7db59939d33cbebc`.

| Scope | Established in this pass | Not established by that evidence |
| --- | --- | --- |
| All 216 | Unique original 16 × 16 PNGs, IDs and catalogue metadata; no missing indices | Current custody or sale availability |
| Core 92 | Raw-file equality with pinned source downloads and repository archive; Git blob equality with the 2013 first commit | That these exact PNGs shipped in the original 2005 game |
| Archive 124 | Existing catalogue payloads and IDs, retained separately | Publisher source filenames, blanket reuse permission, newly checked burn ownership |
| Official creation records | 62 IDs, complete Data URIs, raw files and protocol hashes freshly matched | Fresh API verification of the other 154 records |

The official API rate-limited the research; further requests stopped. Unchecked does not mean invalid or missing. The site’s completion counter counts catalogued Ethscription IDs, not successful requests from this audit. The approved publication retains those limits; it does not silently mark the unchecked records verified. Later research can finish those checks when the service allows them, while transaction flows require fresh relevant checks.

The first core source commit is `dca3cf9a56c955ad87063253d8a34eaa38fcc002`, dated 1 November 2013. A separately checked later revision is `bbe1ae37ad1d6bb5ed3cceb17c0d4b2dd33b0b38`, dated 17 June 2014. Repository history supplies a version-specific reference, not an independent timestamp certificate or proof of the art’s first creation.

Use **2005** for the first Gurk game, following Hall’s retrospective rather than the old EBURP page’s 2004 wording. State the Gurk III / 2013-file distinction explicitly. Do not call these CryptoPunks or imply a new Larva Labs release or endorsement.

The core README’s informal reuse wording applies to material included in the source project and explicitly excludes other commercial Gurk art/music. It is not a standardized license grant covering the 124 archive files. Their reported burn at John Watkinson’s request is attributed to Jeremy Posvar’s 2023 essay; the private request itself was not independently inspected. The source’s `Wario` Hero Class value is retained, not silently corrected.

Detailed evidence: [audit](../research/expedition-000/README.md), [manifest](../research/expedition-000/manifest.json), [story notes](../research/expedition-000/STORY.md).

## Publication and remaining draft isolation

Publication approval covers the reviewed EBURP page, story, original catalogue, completed directory card, core wallet associations and public documentation. `/expeditions/eburp` becomes a public completed-collection route. Unpublished concepts remain behind compile-time development-only branches and must not appear in public routes, Docs, discovery links or production payloads. No sitemap existed in this repository at the documentation review; Docs navigation, GitBook SUMMARY and the public directory provide discovery links.

Only the selected record requests fresh market/ownership data; neither gallery bulk-queries 92 or 124 owners. Source-verified core records reuse the Satoshi marketplace/deposit component. A current owner can review a deposit, and an already-custodied seller can open Field Wallet to register, list or withdraw. Local development stays read-only; the public route uses existing production transaction guards. Archive records show ownership but never mount deposit/trading controls.

Both the initial read and the pre-deposit refresh must match the imported ID and its recorded full-Data-URI hash (`recordProtocolSha256`). This is deliberately distinct from another hunt’s preferred wrapper for future creations: recognized existing IDs can use other valid wrappers. The connected wallet must equal the current owner, not merely the creator or previous owner. Failed reads clear displayed ownership and disable controls. If the old EBURP vault holds a sprite, explain that its supported withdrawal flow must return it to the user’s wallet first; do not infer the vault’s beneficial depositor.

The public catalogue supplies 92 reviewed core associations without fabricating Findings. Associations appear only when current inventory content hashes match; they grant no custody or trading permission. Historical ownership observations remain in research only. Importing the old catalogue does not import the old market or vault into Ethscribe’s custody layer. All original Ethscription IDs remain intact; this is site/catalogue integration and voluntary use of existing escrow, not a chain migration or a new contract deployment.

The existing `C:/dev/EBURP` source project remains read-only. Approval to publish on Ethscribe does not authorize a redirect, shutdown, DNS change or deployment of `eburp.art`. Other local drafts and artwork are preserved. Publishing this retrospective does not automatically transfer an artifact, import an old listing or initiate any wallet transaction.

## Release checks and separate sunset decision

1. Preserve the owner-approved title, five-chapter story, grouping and treatment of the preservation archive.
2. Retain explicit official-record audit coverage and resolve discrepancies without guessing missing creation/custody data. Do not restart a bulk scan through an API rate limit.
3. Keep source attribution and permission limits visible, particularly for archive assets. Publication approval is not itself a copyright grant or creator endorsement.
4. Exercise the core-owner deposit and Field Wallet flow with fresh reconciliation; never treat old snapshots or the old EBURP vault as Ethscribe deposits. The archive remains non-trading. No replacement IDs or Findings are created.
5. Expose only the reviewed 000 route, catalogue and documentation; verify public builds contain 000 but exclude 003/004. Run production, link, accessibility and responsive checks before deployment. No contract change or re-ethscribing is required just to publish the retrospective.
6. Only separately, inventory `eburp.art` links and deep links, preserve originals, and choose redirects. Do not sunset the original until the destination and record links are verified.

## Verification

`node research/expedition-000/verify-manifest.cjs` checks the inventory offline. Component/data/route tests cover full native PNG hashes, first-commit blob identities, metadata preservation, verification boundaries, full grids, deep links, keyboard focus, source links, fresh ownership, hash-gated deposits, archive trading exclusion and public 000 routing. Browser review covers desktop, tablet and mobile. A fresh production build must contain the approved EBURP route and catalogue while excluding the still-unpublished comparison titles, routes and representative payloads.

### Historical local-review baselines

The records below describe earlier DEV-isolated previews. They are not the current publication gate; release checks must be repeated with public 000 and private 003/004.

Initial preview baseline: all 248 tests passed; the offline inventory check passed; the production build passed and 222 output files contained no unpublished 000/003/004 markers or sampled EBURP payloads. Browser checks at 1440, 768 and 390 pixels found no horizontal overflow, page JavaScript errors or automated WCAG A/AA violations. The source `C:/dev/EBURP` worktree remains unchanged. Repeat these checks after the current grid and ownership-flow revision; browser transaction scenarios use fixtures, not real wallet sends.

Revised grid/ownership pass: all 279 tests passed across 29 suites. The offline inventory check and production build passed; a fresh 222-file scan excludes the unpublished routes, titles, wallet wrapper and sampled original PNG payloads. Browser checks confirm all 92/124 sprites, image-only cards, owner/deposit safeguards and equal 000/001/002 directory-card widths at desktop/tablet/mobile sizes. Ownership scenarios use mocked reads; no wallet transaction was sent and no deployment was performed.
