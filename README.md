# Ethscribe

Ownable digital archaeology: a curated archive and future marketplace for historically significant, byte-perfect digital artifacts inscribed on Ethereum.

The first release is intentionally site-first. It establishes the brand, the Genesis Hunt, archival sourcing, wallet-based researcher identity, and honest pre-contract participation flows. Custody, listings, and settlement arrive with the marketplace-contract milestone described in [PRODUCT_PLAN.md](./PRODUCT_PLAN.md).

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
AZURE_STORAGE_ACCOUNT=ethscribe
AZURE_STORAGE_CONTAINER=ethscribe-assets
AZURE_STORAGE_SAS_TOKEN=<secret>
```

The current site does not read or expose the SAS token. Before asset uploads are enabled, confirm the existing Netlify variable name matches `AZURE_STORAGE_SAS_TOKEN` and restrict the SAS permissions and expiry to the minimum required by the server-side function.

## Historical sources

- [Satoshi Nakamoto’s February 24, 2010 Bitcointalk post](https://bitcointalk.org/index.php?topic=64.msg504#msg504)
- [Public Nakamoto Archive](https://github.com/lugaxker/nakamoto-archive)

Historical assertions should be backed by primary sources, exact hashes, and reproducible evidence. A visual match alone is not sufficient for accession.
