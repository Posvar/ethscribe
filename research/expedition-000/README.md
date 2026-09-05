# Expedition 000 — EBURP collection audit

Research date: 5 September 2026. Local import of an existing collection; no new ethscription, transfer, contract call, or deployment was performed. The source repository at `C:/dev/EBURP` was read only and was not modified.

**Publication update:** the owner approved publishing Expedition 000 on Ethscribe on 5 September 2026. The [public collection guide](https://ethscri.be/docs/expedition-000/eburp-before-the-punks) and [full story](https://ethscri.be/expeditions/eburp#eburp-story) accompany the original catalogue. This approval does not change the audit results below. Existing core owners can voluntarily use Ethscribe's existing escrow after fresh ownership and payload checks; no replacement Ethscription IDs, new contract, chain migration or automatic transfer is involved. The 124-character archive remains non-trading, and the original EBURP site is not changed by this release.

[manifest.json](./manifest.json) records the source CSV's exact images and metadata. Treat its complete-collection status as **216 catalogued Ethscription IDs**, not as proof that all 216 have just been verified onchain, share the same source rights, or are held by this site's marketplace.

## Exact inventory

| Source group | Indices | Enemy | Hero | NPC | Total |
| --- | --- | ---: | ---: | ---: | ---: |
| Core | 0–91 | 65 | 9 | 18 | 92 |
| Archive | 92–215 | 77 | 3 | 44 | 124 |
| Entire CSV | 0–215 | 142 | 12 | 62 | 216 |

- No missing indices, duplicate indices, duplicate Ethscription IDs, or duplicate raw PNG SHA-256 values.
- All 216 decoded files are PNGs with **16 × 16** native dimensions. Lengths range from **182 to 4,445 bytes**.
- Hero Class values are preserved: Archer 4, Warrior 3, Mage 4, and **Wario 1**. The latter is the source value, not an automatic correction to Warrior. Non-hero classes are blank.
- Names, descriptions, Type, Hero Class, external URLs, and Data URI strings are copied from the CSV without editorial rewriting.
- The current EBURP app labels its groups **Core 92** and **Burned 124**, based on the index threshold. The manifest uses `collectionGroup: core | archive` so that an inherited UI label is not silently promoted into new proof of current burn ownership.

## Source CSV

Read with the EBURP site's existing PapaParse dependency and the same `header: true, skipEmptyLines: true` settings. Parsing produced zero errors and 216 valid rows.

```text
Local source: C:/dev/EBURP/public/eburp.csv
Repository: https://github.com/Posvar/EBURP
Local repository HEAD: da15d3f2222e7ac8458fc8c3e3004e0ca50d9d2d
CSV bytes: 315496
CSV SHA-256: 1ab04fec5ff5c5586741b4503d69ae5538ee8963477693db7db59939d33cbebc
```

The file hash identifies exactly what was imported, independently of the local repository's commit. Each Data URI uses `data:image/png;base64,`; its decoded raw PNG is separately SHA-256 hashed. PNG compression, transparency, embedded metadata and color profiles have **not** been normalized or stripped. A visually identical export with different bytes does not match this record.

For source comparisons, the original CSV URL is retained in `originalSourceUrl`; `sourceUrl` pins the referenced path to a commit. Archive rows have no external source URL in the CSV, so their `sourcePath`, `sourceUrl`, and `filename` remain null. No historical filenames have been invented from character names.

## What the upstream repository proves

The source is [pents90/eburp](https://github.com/pents90/eburp), the Eight-Bit Universal Role Playing engine used for Gurk III.

All **92 core PNG files** were downloaded individually at pinned commit [`bbe1ae37ad1d6bb5ed3cceb17c0d4b2dd33b0b38`](https://github.com/pents90/eburp/commit/bbe1ae37ad1d6bb5ed3cceb17c0d4b2dd33b0b38), dated **17 June 2014**, and compared byte for byte with their CSV PNGs. Every declared source path, file length, and raw hash matched. Those artifacts have `verifiedSourceMatch: true` and a timestamped `sourceVerification` record.

The same 92 files also match their members in the separately downloaded repository ZIP (37,228,426 bytes; SHA-256 `5f266877d4cf1ff06680685b6f38da85c7c412a05da145e4ee2716a5866a586f`). ZIP entries were read in place, without running code or rewriting the files. GitHub's generated archive packaging may change; pinned file content remains the stronger target identity.

A second check used the repository's parentless **first commit**, [`dca3cf9a56c955ad87063253d8a34eaa38fcc002`](https://github.com/pents90/eburp/commit/dca3cf9a56c955ad87063253d8a34eaa38fcc002), attributed to John Watkinson and dated **1 November 2013, 14:37:54 UTC**. The Git tree was untruncated. For each CSV PNG, the Git blob SHA-1 was computed from `blob <length>\0` plus the unchanged native bytes and compared with the tree's path, object hash, and size:

- All **92 core** PNGs match their declared paths in that first commit.
- None of the **124 archive** PNGs matches any of the first tree's **664 PNG blobs**.

The first-commit comparison is recorded separately as `firstCommitVerification`. It corroborates that these exact core files occur in the first public repository revision; it does not date the artwork's creation to 2013 or prove a particular earlier game-release build. Git history and author timestamps are source evidence, not independent timestamp certificates.

The absence of a matching archive PNG in that tree is not proof of where those files originated. The archive remains an existing collection's unsourced historical section, not a newly source-authenticated corpus.

## Official Ethscriptions verification

The public endpoint used was:

```text
https://api.ethscriptions.com/v2/ethscriptions/<Ethscription_ID>
```

**62 core records** were successfully verified. For each, all four checks passed:

1. Official transaction hash equals the CSV Ethscription ID.
2. Full official Data URI equals the CSV Data URI exactly.
3. Decoded official PNG equals the CSV native PNG byte for byte.
4. Official protocol content hash equals SHA-256 of the complete CSV Data URI.

Those records have `verifiedEthscription: true`, `protocolVerification.status: verified-official-record`, check timestamps, creation dates, creator addresses, and ethscription numbers. The successfully checked sample was created on **11 August 2023**, between 20:57:35 and 22:19:11 UTC, by `0x1f01d99a90ad0c752e7765de29c386a169bd9e37`. This is explicitly a sample range, not a newly verified date claim for the full collection.

The API began rate limiting the audit. Further checking was stopped, with **154 records not freshly verified** in this manifest: 30 remaining core items and all 124 archive items. Their CSV IDs remain catalogued; `not-checked` is not interpreted as invalid, missing, unethscribed, burned, or unowned. Do not repeatedly retry the API or bypass its limit to fill these fields.

`currentOwnerSnapshot`, when present, contains only a dated API observation. It is deliberately not called `currentOwner`, and it must **not** drive live listing, deposit, withdrawal, or custody badges. A transaction flow must obtain fresh official ownership and reconcile the relevant contract. No claim is made that these artifacts presently belong to Ethscribe's marketplace.

## Rights and historical limits

The [pinned upstream README](https://github.com/pents90/eburp/blob/bbe1ae37ad1d6bb5ed3cceb17c0d4b2dd33b0b38/README.md) offers use of project-included material, reserves the Gurk name, and explicitly excludes unrelated graphics or music from the commercial Gurk series. No standardized SPDX license or separate license file is asserted here.

That project permission must not be generalized to the **124 archive files without source URLs**. Nor does an Ethscription transfer grant copyright, trademark rights, an author's endorsement, or exclusive access to the original digital file. The source CSV's names and descriptions are the collector's catalogue metadata, not independently authenticated statements from the original artists.

This manifest concerns file-level provenance and collection identity. Historical claims about a game's original release year, creators' wider careers, or why items were archived should cite their own primary evidence rather than being inferred from PNGs or CSV row numbers.

## Local integrity check

No wallet or network is required to validate the imported manifest:

```sh
node research/expedition-000/verify-manifest.cjs
```

This checks all native payload lengths, dimensions, hashes, IDs, index coverage, group counts, and recorded verification totals. The original CSV remains untouched. Research download/inspection material lives only under ignored `.tools/research/eburp/`.
