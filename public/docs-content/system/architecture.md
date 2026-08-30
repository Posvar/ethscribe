# Architecture

Ethscribe is designed as a progressively decentralized web application. The current public shell is static and Git-backed; participation services and the marketplace are added only when their trust boundaries are clear.

## System map

```text
Browser
  |-- React site and documentation
  |-- wallet via EIP-1193
  |-- same-origin API calls
  v
Netlify
  |-- static deployment from GitHub
  |-- Functions: validation, signatures, rate limits
  v
Azure Blob Storage
  |-- expedition records
  |-- immutable dossier revisions
  |-- field notes and proposals

Ethereum + Ethscriptions index
  |-- creations and transfers
  |-- raw-byte decoding/indexing
  |-- later HuntHouse custody and settlement
```

## Frontend

The React application provides:

- the permanent mission and method;
- expedition catalogues and artifact timelines;
- wallet connection through an injected EIP-1193 provider;
- safe local previews for historical formats such as XPM;
- Finding, evidence, and proposal workflows as they launch; and
- these docs, rendered from the same Markdown used by GitBook.

The production build deploys from the `main` branch to Netlify. Client code never receives storage credentials.

## Git-backed documentation

Canonical documentation lives in `public/docs-content`. The repository's `.gitbook.yaml` points GitBook Git Sync at that directory, while `SUMMARY.md` defines its navigation. The live application reads the same files at `/docs`.

This creates one source of truth: changes are reviewed with code, deploy on the site, and can publish to a connected GitBook space without copy-paste drift.

## Netlify Functions

Functions become the only browser-facing interface to persistent storage. They will:

- validate request schemas and sizes;
- verify wallet signatures and signing domains;
- resolve and normalize Ethscriptions records;
- calculate decoded-byte hashes;
- read and write expedition, Dossier, Field Note, and proposal records;
- issue narrow, short-lived asset URLs where required; and
- apply moderation, rate limiting, and abuse controls.

Functions should fail closed on ambiguous signatures, unsupported protocol content, and schema versions they do not understand.

## Azure Blob Storage

The planned account is `ethscribe` and the container is `ethscribe-assets`. A logical layout is:

```text
expeditions/{expedition-id}/expedition.json
expeditions/{expedition-id}/findings/{finding-id}/finding.json
expeditions/{expedition-id}/findings/{finding-id}/dossiers/{revision}.json
expeditions/{expedition-id}/findings/{finding-id}/field-notes/{note-id}.json
expeditions/{expedition-id}/assets/{asset-name}
proposals/{proposal-id}.json
collection/{accession-id}.json
```

Signed objects are immutable by identifier where practical. Mutable indexes may point to the latest signed revision.

## Secrets and configuration

Expected server-side variables are:

```text
AZURE_STORAGE_ACCOUNT_NAME=ethscribe
AZURE_STORAGE_CONTAINER=ethscribe-assets
AZURE_STORAGE_SAS_TOKEN=<secret>
```

The SAS token must never use a `REACT_APP_*` name or enter the compiled bundle. Before writes launch, its scope, permissions, expiry, and rotation procedure should be reduced to the minimum needed by Functions.

## Ethereum services

The indexer is a separate correctness boundary from the website. It must reproduce protocol creation and transfer state, decode supported content forms, calculate `rawSha256`, and reconcile marketplace deposits.

The later HuntHouse contract handles custody, bids, refunds, fee routing, and settlement. Historical prose and source evidence remain off-chain but cryptographically linked through signed hashes.

## Availability and portability

The public record should not depend on one frontend. Long-term resilience includes exportable JSON schemas, redundant content storage, reproducible index code, and multiple readers for signed dossiers. Ethereum remains the custody and event layer; Ethscribe's value is the transparent catalogue built around it.
