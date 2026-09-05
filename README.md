# Ethscribe

Ownable digital archaeology: Ethscribe turns historically significant digital files into Accessions—recognized, transferable onchain artifacts backed by public evidence and an auditable chain of custody.

The current release includes Expeditions 001 and 002, historical artifact records, wallet connection, target-specific creation and existing-asset deposit, signed Finding intake, Field Wallet inventory, fixed-price listings and purchases, withdrawals, and proceeds claims. Public expedition proposals are closed. The [roadmap](./public/docs-content/roadmap/phased-development.md) separates current capabilities from proposed research and automation features.

## Documentation

The living whitepaper is published at `https://ethscri.be/docs`. Its canonical Markdown source lives in [`public/docs-content`](./public/docs-content), and `.gitbook.yaml` makes that same directory ready for optional GitBook Git Sync. The site renders this source directly. Keep [`SUMMARY.md`](./public/docs-content/SUMMARY.md) and [`src/docsNavigation.js`](./src/docsNavigation.js) aligned when adding a page. Start with [Your first Finding](./public/docs-content/product/first-finding.md) for the current visitor workflow.

## Local development

Requires Node.js 22.12 or newer, as specified in `package.json`.

```bash
npm ci
npm start
```

The Vite development server listens at `http://localhost:3000` and proxies public reads to the production `/api` routes. Target byte checks are allowed, but publishing and wallet transactions are disabled in development. Production `/api` routes are Netlify Functions and redirects; the production build uses the marketplace's live operational checks.

Expedition 002 is public at `/expeditions/youve-got-history`, with 17 byte-perfect sound targets, source records, native playback for recognized Ethscriptions, and the existing upload / existing-Ethscription submission flow. `shared/soundTargets.json` pins the frontend and server's filenames, sizes, decoded hashes, canonical protocol hashes and WAV wrapper. The five founder AOL IDs are recognized without replacement Findings. Each expedition's API and storage prefix are separately scoped; Field Wallet links to the correct record. Local development still disables publishing and transactions for both expeditions.

## Verification

```bash
npm test
npm run test:functions
npm run build
```

The production bundle is written to `build/`.

## Deployment

Netlify configuration lives in `netlify.toml`:

- Build command: `npm run build`
- Publish directory: `build`
- SPA fallback: `/index.html`
- Production domain: `https://ethscri.be`

The connected Netlify site builds the `main` branch on GitHub push. A local audit or preview is not a deployment; push only when publishing has been authorized.

## Azure asset storage

Azure credentials must remain server-side and must never use a `REACT_APP_` or `VITE_` prefix. The signed Finding function reads:

```text
AZURE_STORAGE_ACCOUNT_NAME=ethscribe
AZURE_STORAGE_CONTAINER=ethscribe-assets
AZURE_STORAGE_SAS_TOKEN=<secret>
```

The browser never reads or receives the SAS token. The configured SAS must support the server's Finding creation, read, and list operations within the named container. Restrict its resource scope, permissions, and expiry to the server's needs. Store deployment signing material only in the ignored private deployment workspace; `.gitignore` is a safeguard, not a replacement for checking staged files.

Expedition 001's open exact-byte targets use the secret-scoped Functions variable `EXPEDITION_001_TARGET_HASHES`. It contains a base64-encoded JSON map of target IDs to raw SHA-256 commitments (plain JSON remains supported for local tests). The public bundle sends a candidate hash to `/api/targets/check` and receives only eligibility; those reference hashes and raw source URLs are revealed after accession. Expedition 002 deliberately publishes its reference hashes in the shared manifest and needs no new environment setting. Both candidate checks and signed Findings name their expedition; `GET /api/findings?expedition=youve-got-history` reads only sound Findings, while an unspecified expedition preserves the 001 API default.

Research binaries remain in ignored `.tools/research/sounds`, never in public assets. `node --test scripts/sound-research.test.mjs` tests the research parser; with locally recovered references present, `node scripts/check-sound-finding-memory.mjs` exercises all 17 real WAVs through signed Finding verification using in-memory storage and mocked index/custody data. It sends no transactions or network requests.

## Historical sources

- [Satoshi Nakamoto’s February 24, 2010 Bitcointalk post](https://bitcointalk.org/index.php?topic=64.msg504#msg504)
- [Public Nakamoto Archive](https://github.com/lugaxker/nakamoto-archive)

Historical assertions should be backed by primary sources, exact hashes, and reproducible evidence. A visual match alone is not sufficient for accession.
