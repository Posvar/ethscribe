# Marketplace browse — release notes

Status: reviewed locally; publication approved by the owner on 6 September 2026. This release changes no contracts and sends no wallet transactions.

Route: `/marketplace`. The desktop and mobile navigation insert Marketplace between Expeditions and Wallet. Production includes the marketplace and approved 000/001/002 expeditions. Browser Wars and Skin Deep remain separate local drafts, absent from the public repository and production build.

## Browse experience

- No wallet connection required. Default: all recognized escrow assets, price low to high.
- Search names, files, release context, expedition titles, IDs and Ethscription numbers.
- All escrow / Listed toggle; expedition and friendly file-type filters.
- Exact-wei low/high price sorting, newest creation and alphabetical sorting. Items without an active price follow priced items in either price direction. Expired listings do not count as listed; missing reads are unknown, not zero-price listings.
- Grid/list switch, square white previews, pixel-sharp images, existing audio/text/HTML media support. Four cards across on desktop; mobile filters collapse.
- Filtering/sorting happens across all loaded inventory pages before 24-item display pagination. URL query parameters preserve the browse controls.
- Cards link to their expedition record and existing, independently revalidated marketplace controls. No new quick-buy or bulk-buy action is introduced.
- Refresh once per minute while visible, on window focus, and manually. Refresh failure labels the previous snapshot as stale. A missing Finding feed or bounded inventory scan is explicitly partial, never an authoritative empty result.

## Data boundary

The new read-only server helper lists the active immutable vault's current holdings in pages of 50, then batch-reads deposit and listing state through Ethereum RPC. It reuses existing custody reconciliation. It does not scan every known historical asset, require an independent indexer, or change contracts.

The browser joins these holdings against recognized Satoshi targets, the sounds catalogue, exact public Findings, and the 92 EBURP core records. It requires the expected recorded Ethscription ID and pinned protocol hash where available. Unrecognized contract deposits, directly owned assets, and the 124 EBURP archive records are not marketplace catalogue entries.

The initial browse snapshot is informational, not trade authorization. Indexer lag does not erase the gallery; its custody warning remains visible. The artifact page must recheck the current price, seller and custody before any purchase. Nonzero `onlyBuyer` listings are labelled reserved.

Vite serves `/api/market/browse` through the local read-only handler before its production-read proxy. It rejects non-GET requests. Existing local transaction and publication locks remain enabled. The inventory drain stops at 20 pages and announces partial coverage if reached; global sorting then applies only to that disclosed loaded subset.

## Release boundary

Only the marketplace DEV gates are removed; unapproved expedition drafts stay private. `/api/market/browse` routes to the read-only Netlify handler, and public Docs explain the browse flow. Reassess caching and server-side filtering if the curated vault grows beyond this bounded client-side dataset.

Current checks include exact-byte catalogue joins, archive exclusion, arbitrary deposits, all-page sorting, wei precision, listing expiry, malformed/looping cursors, unavailable reads, query controls, pagination, mobile/desktop nav and production route availability. Browser review uses public read-only snapshots plus clearly test-only fixtures for audio and larger datasets; no fabricated assets are shown in the actual gallery.
