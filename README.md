# Ethscribe

Ownable digital archaeology: Ethscribe turns historically significant digital files into Accessions—recognized, transferable onchain artifacts backed by public evidence and an auditable chain of custody.

The first release is intentionally site-first. It establishes the brand, the Genesis Hunt, archival sourcing, wallet-based researcher identity, and honest pre-contract participation flows. Custody, listings, and settlement arrive with the marketplace-contract milestone described in [PRODUCT_PLAN.md](./PRODUCT_PLAN.md).

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

Azure credentials must remain server-side and must never use a `REACT_APP_` prefix. Netlify Functions will read these variables when submissions are implemented:

```text
AZURE_STORAGE_ACCOUNT_NAME=ethscribe
AZURE_STORAGE_CONTAINER=ethscribe-assets
AZURE_STORAGE_SAS_TOKEN=<secret>
```

The current site does not read or expose the SAS token. The three variable names above are configured on the linked Netlify project. Before asset uploads are enabled, restrict the SAS permissions and expiry to the minimum required by the server-side function.

## Historical sources

- [Satoshi Nakamoto’s February 24, 2010 Bitcointalk post](https://bitcointalk.org/index.php?topic=64.msg504#msg504)
- [Public Nakamoto Archive](https://github.com/lugaxker/nakamoto-archive)

Historical assertions should be backed by primary sources, exact hashes, and reproducible evidence. A visual match alone is not sufficient for accession.
