# Byte-perfect identity

“Byte perfect” means that two files contain exactly the same ordered bytes. A matching appearance, filename, pixel grid, or decoded text is not enough.

Ethscribe calculates a decoded-file digest for every candidate:

```text
rawSha256 = SHA-256(decoded artifact bytes)
```

That digest is the artifact's identity inside the Ethscribe catalogue.

## Why the data-URI hash is not enough

Consider two valid wrappers for the same bytes:

```text
data:image/x-xpixmap;base64,<payload>
data:image/x-xpm;base64,<same payload>
```

Their complete strings differ, so their Ethscriptions protocol hashes differ. Once decoded, however, the payload bytes can have the same `rawSha256`. Ethscribe groups them beneath one artifact record while preserving both protocol records.

Other wrapper differences can produce the same result:

- MIME-type aliases;
- base64 versus permitted non-base64 forms;
- capitalization or parameters where the protocol accepts them;
- gzip transport that expands to the same content; and
- attachment structures defined by later ESIPs.

## The verification pipeline

For each submitted candidate, Ethscribe should:

1. Locate the creation in Ethereum and validate it under the applicable protocol rules.
2. Recover the complete content representation.
3. Decode transport and data-URI encoding without altering the payload.
4. Record byte length, signature, dimensions where applicable, and `rawSha256`.
5. Compare the digest against the hunt's target and the historical raw-byte index.
6. Preserve the wrapper, transaction location, decoding method, and software version used.

Every transformation must be deterministic and reproducible.

## Historical order

“Not found in this collection” is a local statement. “Earliest known raw-byte match” is a protocol-wide historical statement and requires more work.

Before making the stronger claim, the index must backfill all eligible creation paths and sort them by canonical Ethereum order:

```text
block number
  -> transaction index
     -> event log index, when applicable
```

The backfill must cover direct calldata creations and relevant accepted ESIPs. It must then remain current as new blocks arrive and survive chain reorganizations according to an explicit confirmation policy.

Until that work is complete, Ethscribe should say:

> No matching decoded bytes are currently indexed by Ethscribe.

It should not say:

> These bytes have never been Ethscribed.

## Target manifests

A deterministic hunt can publish an expected artifact manifest containing:

```text
artifactId
canonicalFilename
expectedRawSha256
expectedByteLength
expectedMediaSignature
sourceReferences
evidenceGrade
```

A lost-file hunt cannot publish an expected hash because the bytes are unknown. It instead publishes a bounded historical description: filename, date range, context, attesting sources, and the evidence required to show that recovered bytes are the referenced file.

## Rendering is secondary

Browsers do not natively display every historical format. XPM is a useful example: it is source code containing a pixel map, not a commonly supported web image type. Ethscribe may parse XPM client-side and render a PNG or canvas preview, but the preview is derivative. The original XPM bytes remain the artifact.

The interface must label generated previews and never substitute their hash for `rawSha256`.

## File equivalence is intentionally strict

The following are different artifacts unless a hunt explicitly defines another relationship:

- a PNG re-saved with different metadata;
- an ICO with reordered image entries;
- an XPM with changed whitespace;
- an image reconstructed from matching pixels; and
- a byte-identical file stored under another filename.

The last pair has one byte identity but may have multiple historical names. Ethscribe stores names as claims about the artifact, not as part of its byte identity.
