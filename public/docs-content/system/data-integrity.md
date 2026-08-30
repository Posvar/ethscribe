# Data integrity and signatures

Ethscribe stores research off-chain because dossiers evolve and source material is too large and expressive for ordinary Ethereum storage. Integrity comes from deterministic schemas, wallet signatures, immutable revisions, and public verification—not from treating a mutable database as authoritative.

## Canonical signed document

Every signed record should share an envelope:

```text
schemaVersion
documentType
chainId
verifyingDomain
expeditionId
findingId
revision
authorAddress
createdAt
previousRevisionHash
payloadHash
signature
```

The inner payload varies by document type. Canonical serialization specifies field order or an unambiguous typed-data structure, character encoding, normalization rules, integer representation, null handling, and array ordering.

## Signing model

EIP-712 typed structured data is preferred for user-facing signatures because the wallet can display a meaningful domain and record type. The domain must prevent signatures from being replayed across:

- chains;
- deployments;
- document types;
- expeditions; and
- incompatible schema versions.

A user sees the human-readable record before signing. The server recovers the signer, verifies that it matches `authorAddress`, recalculates the payload hash, and rejects expired or malformed submissions.

## Immutable revisions

The storage service never rewrites fields covered by a signature. A corrected Dossier becomes a new object and references the previous revision hash. The application may maintain a mutable “latest” pointer, but every version remains independently addressable and verifiable.

Published curator decisions similarly reference the exact Dossier and rubric hashes reviewed.

## Artifact verification record

The byte-verification result should retain enough detail to reproduce it:

```text
ethscriptionId
creationLocation
completeContentSha256
contentEncoding
declaredMediaType
decoderVersion
rawByteLength
rawSha256
detectedFileSignature
derivedDimensions
verifiedAtBlock
```

Derived previews have their own hashes and are never confused with the artifact bytes.

## Index consistency

The indexer should:

- process canonical chain order deterministically;
- wait an explicit number of confirmations for final presentation states;
- roll back orphaned blocks on reorganization;
- checkpoint progress and preserve parser versions;
- reconcile against at least one independent Ethereum data source;
- re-run historical ranges when protocol interpretation changes; and
- publish index coverage before making earliest-match claims.

Any application cache is disposable. It must be possible to rebuild ownership and identity state from Ethereum plus the signed record archive.

## Storage controls

Server endpoints enforce:

- strict schemas and supported version allowlists;
- content-type and byte-size limits;
- normalized, allowlisted outbound fetching;
- malware-safe handling of arbitrary historical files;
- rate limits by address, IP, and operation;
- idempotency keys for writes; and
- append-only audit logs for privileged moderation.

Untrusted artifacts must never execute as active HTML or script in the Ethscribe origin. Previews use safe decoders, sandboxing, or inert downloads.

## Verification by others

Long-term credibility requires downloadable signed JSON, documented hashing rules, source links, and open verification code. A user should be able to confirm a Dossier signature and raw-byte digest without trusting the current Ethscribe interface.
