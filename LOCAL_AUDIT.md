# Local product audit — September 4, 2026

Status: local review completed; owner approved production release of the audit and recognized-artifact deposit improvements, with the transparent shovel logo revision. No contract changes or onchain transactions are part of this release.

## Review the site

Run `npm start` and open `http://127.0.0.1:3000/`. The preview is deliberately read-only. It uses public production data through the local development proxy; target byte checks are allowed, but publishing and marketplace transactions are disabled.

Start with:

1. The mission homepage: simpler introduction, explicit experiment framing, clearer type hierarchy.
2. `/expeditions`: a shorter directory header and an enlarged, pixelated artifact preview.
3. `/expeditions/lost-pixels-of-satoshi`: filter the timeline, search a filename or release, open a record from the grid, and copy its link.
4. The November 2009 `bitcoin20.xpm` record: actual public listing, exact price, original creation metadata, compact file and transaction details.
5. An open target: the submission workflow stays closed until requested. Upload and existing-Ethscription paths remain separate; testing does not imply a transaction.
6. `/wallet`: four-column desktop cards, a more compact mobile header/zero-credit state, readable controls, and keyboard-operable inventory tabs.
7. `/docs`: searchable guide titles, a first-Finding walkthrough, working deep links, and current-versus-proposed product scope.

### Recognized-artifact deposit follow-up

Open `/expeditions/lost-pixels-of-satoshi?artifact=original-bc-ico#record-original-bc-ico` with its current owning wallet connected. The marketplace card now offers **Deposit into marketplace**, followed by a review of the existing Ethscription, destination, and gas cost. Local preview permits this review but disables sending.

- Ownership comes from the current official record, not the historical creator address. It is rechecked immediately before wallet interaction.
- No file re-upload, new Ethscription, or replacement Finding is needed for a recognized catalogue entry.
- Already-escrowed owners get **Manage in Field Wallet**, including when no listing exists.
- Seed catalogue Ethscription IDs retain their expedition assignment in Field Wallet, independently of the Finding API's availability.
- Pending deposits retain their public transaction hash across closing/reopening the record in the same browser session. Rechecking does not send another deposit.
- The existing marketplace contract already supports this transfer. No contract or onchain state was changed.

## Important fixes

### Presentation and accessibility

- Increased small interface labels and metadata; corrected measured contrast failures.
- Reduced oversized directory headings and empty image space.
- Kept Mission / Expeditions / Wallet in the header and Docs in the footer.
- Added timeline search, status filters, target permalinks, and an explicit distinction between 22 known files and the additional lost PNG.
- Stopped opening the long lost-artifact record automatically on arrival.
- Fixed a mobile file-input overflow and removed duplicate headings from the embedded test workflow.
- Added skip navigation, Escape/focus behavior, network-dialog focus management, inventory-tab keyboard behavior, and a proper missing-page view.
- Bundled the seven already-recognized seed previews: all 61,042 bytes match the existing SHA-256/length commitments. No open-target answers were added to public assets.

### Transaction and data correctness

- Late wallet/page responses cannot overwrite a newly selected wallet's inventory or claimable balance.
- Failed current reads disable market actions instead of leaving stale controls usable.
- Malformed duplicate-check responses fail closed instead of becoming a false “not found.”
- Pending creations/deposits cannot be repeated through the workflow; failed post-send verification preserves its transaction link and offers a no-gas recheck.
- Custody verification queries the exact asset instead of searching only the first inventory page.
- Original Ethscription creator/time no longer come from the Finding submitter/verification time. Older records use live creation metadata when available, or a transaction reference rather than invented values.
- Purchases recheck the listing, custody, intake state, and connected wallet session before opening the wallet. Exact ETH amounts are not truncated in prices or claimable balances.
- Ethereum payment confirmation is distinguished from the official ownership index catching up.
- Public Finding listing follows Azure continuation pages. More recovery candidates cannot evict accepted exact targets; candidate output is bounded separately.
- Public filenames come from target metadata, not an unsigned upload filename.
- Upstream media/Finding reads now have response-size limits and deadlines; oversized content is rejected before full decoding.

### Documentation

- Added the first-Finding quickstart and refreshed 21 navigable guides.
- Reconciled creation, deposit, registration, listing, sale, withdrawal, and claim instructions with the implementation.
- Removed claims that proposed auctions, rewards, review governance, or dossier tooling already exist.
- Clarified canonical-payload uniqueness versus raw-byte matching, protocol recognition versus Ethereum transaction success, and ownership versus copyright.
- Preserved deployment records and historical source references. Older product-plan sections are explicitly historical.

## Verification

- Production build passes.
- Frontend regression suite: 122 tests passing, including 39 new recognized-deposit, integration, and catalogue-assignment cases, plus the transparent logo regression.
- Netlify library suite: 42 tests passing.
- All seven cached seed files pass exact byte-length/SHA-256 tests.
- Documentation validation: 22 Markdown files, 105 links, 21 navigation entries; no missing local files or navigation/SUMMARY mismatches.
- Browser checks at 1440, 768, and 390 pixels across the homepage, expedition directory, active expedition, disconnected wallet, and docs: no page errors, measured horizontal overflow, or violations in the selected WCAG A/AA rule set.
- Additional browser checks cover found-record listings on desktop/mobile, open-target submission on mobile, docs search/deep links, mobile menu Escape, the local POST guard, and a read-only connected-wallet fixture using public inventory data. Arbitrary collector HTML inside sandboxed frames is not part of the host-page accessibility claim.
- Recognized-owner deposit review additionally passes desktop/mobile browser checks with no measured overflow or selected WCAG A/AA violations; the disconnected state offers connection, not deposit. The browser owner fixture uses only a public address and cannot sign.
- New server behavior is tested locally; the preview intentionally continues reading the unchanged production APIs. No funded transaction was performed during this audit.

## Remaining boundaries and follow-up

- This is a product/code audit, not an independent smart-contract security audit. A controlled purchase → ownership confirmation → seller-claim smoke test remains important before promoting trading broadly.
- Public wallet reads can be expensive. Production edge rate limiting, request coalescing, and careful short-lived read caching should precede substantial traffic. Transaction preflight must retain fresh authoritative checks.
- Finding listing still scans Azure metadata pages; a materialized index becomes worthwhile as submission volume grows.
- The existing-Ethscription target picker still begins with the first 50 items per custody category; a paginated picker or ID lookup is a useful follow-up for large collections.
- The lost-file research review workflow, larger-file creation path, and batch-withdrawal interface remain distinct product work. Contract batch support does not imply that a bulk UI exists.
- Wallet SDK chunks remain comparatively large. Deferred wallet initialization/route splitting can improve first-load performance without changing the custody model.
- Local tooling screenshots/reports are under the ignored `.tools/browser/screenshots/` directory. Existing untracked design assets and private configuration were left untouched.

The owner has approved release. The development preview remains read-only; production uses the live marketplace's existing operational checks.
