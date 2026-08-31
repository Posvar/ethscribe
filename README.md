# Ethscribe

Ownable digital archaeology: Ethscribe turns historically significant digital files into Accessions—recognized, transferable onchain artifacts backed by public evidence and an auditable chain of custody.

The current release establishes the brand, Genesis Hunt, archival sourcing, wallet-based researcher identity, personal Ethscription creation, verified market custody, and signed Finding intake. Listings and settlement remain behind the marketplace milestones described in [PRODUCT_PLAN.md](./PRODUCT_PLAN.md).

## Documentation

The living whitepaper is published at `https://ethscri.be/docs`. Its canonical Markdown source lives in [`public/docs-content`](./public/docs-content), and `.gitbook.yaml` makes that same directory ready for GitBook Git Sync. Update the source once; the first-party docs and connected GitBook publication share the same history and navigation.

## Local development

Requires Node.js 20 or newer.

```bash
npm ci
npm start
```

The development server opens at `http://localhost:3000`.

## Verification

```bash
npm test -- --watchAll=false
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

The connected Netlify site should build the `main` branch on every GitHub push.

## Azure asset storage

Azure credentials must remain server-side and must never use a `REACT_APP_` prefix. The signed Finding function reads:

```text
AZURE_STORAGE_ACCOUNT_NAME=ethscribe
AZURE_STORAGE_CONTAINER=ethscribe-assets
AZURE_STORAGE_SAS_TOKEN=<secret>
```

The browser never reads or receives the SAS token. The three variable names above are configured on the linked Netlify project. The SAS must allow creation/write of Finding JSON blobs in the named container; restrict its permissions, resource scope, and expiry to the minimum required by the server-side function.

Open exact-byte targets use the secret-scoped Functions variable `EXPEDITION_001_TARGET_HASHES`. It contains a base64-encoded JSON map of target IDs to raw SHA-256 commitments (plain JSON remains supported for local tests). The public bundle sends a candidate hash to `/api/targets/check` and receives only eligibility; expected hashes and raw source URLs are revealed in the public record only after accession.

## Historical sources

- [Satoshi Nakamoto’s February 24, 2010 Bitcointalk post](https://bitcointalk.org/index.php?topic=64.msg504#msg504)
- [Public Nakamoto Archive](https://github.com/lugaxker/nakamoto-archive)

Historical assertions should be backed by primary sources, exact hashes, and reproducible evidence. A visual match alone is not sufficient for accession.
