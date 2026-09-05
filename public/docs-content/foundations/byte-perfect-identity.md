# Byte-perfect identity

“Byte perfect” means two files contain the same ordered bytes. Matching appearance, dimensions, filename, or decoded text is not enough.

Ethscribe compares SHA-256 digests of the decoded artifact bytes. This digest identifies the file within the catalogue.

## File identity and protocol identity

| Identity | What is hashed | What it distinguishes |
|---|---|---|
| File identity | The decoded original file | An exact byte match against the target |
| Protocol content identity | The complete UTF-8 Data URI interpreted by the protocol | One content representation, including its wrapper |

Two wrappers can describe the same XPM bytes:

```text
data:image/x-xpixmap;base64,<payload>
data:image/x-xpm;base64,<same payload>
```

Those complete strings differ, even though their decoded file hashes match. MIME parameters and alternative encodings can create similar distinctions for PNG or JPEG too.

Gzip transport alone is not necessarily a new protocol identity: the protocol interprets the decompressed Data URI. Extensions such as attachments also need their own decoding rules before making comparisons. Ethscribe's current target flow uses its explicit canonical wrapper.

## What the site verifies today

For supported candidates, the browser calculates byte length and raw-file SHA-256. A known target is tested against its server-side reference commitment. Before a Finding is recorded, the server independently retrieves the indexed content, checks the required wrapper, decodes it, and reproduces its hashes.

The existence check searches the canonical content and disclosed common aliases. This is a bounded check, not a complete scan of every historical Ethscription.

The current site does not have a protocol-wide index grouping all files by decoded-byte identity. It must not translate “no match found in these checks” into “these bytes have never been Ethscribed.”

## What first means

For the target's canonical payload, without duplicate opt-in, the Ethscriptions protocol recognizes the first valid creation in Ethereum transaction order.

A stronger claim—earliest appearance of these raw bytes across every valid wrapper—would require a historical backfill covering all relevant creation paths and decoding rules, plus an explicit reorganization policy. That index is planned.

The protocol rules, including duplicate opt-in, are documented in the [official specification](https://docs.ethscriptions.com/overview/protocol-specification).

## Known and unknown targets

A known-file target has an expected digest from a selected historical source. Matching it establishes equality with that reference, not independent proof that the reference's attribution is correct.

A lost-file target has no established digest. It instead publishes identifying clues and needs evidence connecting recovered bytes to the historical artifact.

Open known targets withhold their reference hashes for the hunt. This is a gameplay boundary; after an exact Finding is recognized, its digest can be inspected publicly.

## Changes that matter

Resaving a PNG, changing an ICO's contents, editing XPM whitespace, or converting line endings can change the raw-file hash without visibly changing the image. A reconstruction from matching pixels is not an exact copy of the source file.

Renaming a file without changing its contents does **not** change its byte identity. Historical filenames and paths are provenance facts about that file.

## Previews are separate

An enlarged image or generated XPM preview helps visitors inspect the work. Its pixels are not substituted for the original bytes. The artifact remains the original file, hashed before any display transformation.
