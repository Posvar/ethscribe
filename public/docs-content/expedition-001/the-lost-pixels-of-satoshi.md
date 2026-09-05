# Expedition 001: The Lost Pixels of Satoshi

The first expedition maps Satoshi Nakamoto's early Bitcoin icon work as exact files rather than familiar-looking images.

> Complete the byte-perfect record of Bitcoin's earliest visual identity—and recover the one attested file whose bytes remain lost.

## Why this expedition

Bitcoin's early icons survive across source releases, archived pages, forum posts, and modern copies. Small differences matter: an ICO container can contain several embedded images, an XPM is source text rather than a PNG, and a visually identical reconstruction is not the historical file.

The corpus makes the Ethscribe method concrete:

- historical sources define the targets;
- decoded hashes distinguish exact files from lookalikes;
- Ethscriptions create public chronology and ownership; and
- a timeline turns technical evidence into an exhibition.

## Current corpus map

The defined corpus contains:

| State | Count | Meaning |
|---|---:|---|
| Known byte-perfect targets | 22 | Distinct file targets in the defined corpus |
| Attested lost target | 1 | `bitcoin20x20.png`, described in the record but not recovered |

The supporting research also maps fourteen image components within historical ICO containers. The live expedition calculates recovered and unresolved counts from the target manifest and exact Findings, so those changing totals are not duplicated here.

A green target is a recognized match in the catalogue. Its current market custody and availability for purchase are checked separately; recognition does not disappear simply because the owner withdraws or sells it.

These figures describe Ethscribe's curated expedition state. They are not yet a protocol-wide claim that matching decoded bytes have never appeared under another data-URI wrapper. Each target nevertheless freezes one accepted creation wrapper: `data:image/x-xpixmap;base64,` for XPM and `data:image/png;base64,` for PNG.

## Historical arc

### November 2008 — before the icon

The surviving pre-release material establishes the environment before a distinct Bitcoin identity asset appears.

### January 2009 — the BC coin ships

Satoshi's release of Bitcoin v0.1.0 introduces the six-frame Windows icon that becomes the first known Bitcoin identity artifact in this corpus.

### 5 November 2009 — Bitcoin reaches Unix

A 48-pixel XPM brings the icon into the Unix-oriented client. XPM preserves the image as textual source bytes; the browser preview on Ethscribe is a generated rendering, not a replacement artifact.

### 7 November 2009 — hand-tuned XPM sizes

Separate 16, 20, 32, and 48-pixel XPM assets appear, documenting deliberate work at each display size.

### 8 February 2010 — the lost attachment

Satoshi describes a hand-tuned 20 × 20 BC PNG with full transparency. Its original bytes remain the expedition's unresolved recovery target.

### 24 February–2 March 2010 — the ₿ coin is revealed

Satoshi publishes a new icon/logo set in the “New icon/logo” forum thread and releases the work to the public domain. The post supplies important contemporaneous context for the familiar gold Bitcoin images.

### 21 June 2010 — the source tree catches up

The source history introduces the new ICO, favicon, revised XPMs, and an 80-pixel XPM. The timeline connects these file variants to the earlier announcement rather than treating every similar-looking icon as the same bytes.

### November 2010 — the end of an era

Bitboy's orange, tilted mark defines the later community era. It is outside this expedition's Satoshi-focused scope.

## The real lost-file hunt

`bitcoin20x20.png` is attested by the historical record, but its canonical bytes have not been established in the current corpus. That makes it different from the deterministic gaps:

- there is no expected `rawSha256` to match;
- a reconstructed 20×20 image is not automatically the original;
- filenames or visual similarity alone are insufficient; and
- a successful Finding needs direct custody or source evidence connecting the bytes to the attested attachment.

The expedition record should remain `BYTES UNKNOWN` until a candidate satisfies the frozen recovery rubric.

## What hunters can do now

- Inspect each timeline artifact and its historical clues and file facts.
- Search historical releases, mirrors, archives, source trees, and personal collections.
- Compare decoded bytes, not screenshots.
- Preserve original containers and neighboring files.
- Document exactly where a candidate came from and every transformation performed.
- Upload exact candidates directly within any unresolved target. Known files are rejected before gas when their raw hash is wrong; the lost target accepts a PNG candidate for provenance review because no authoritative hash exists yet.
- Create directly into market custody, or deposit an existing matching Ethscription through the target flow, then publish a signed Finding after custody reconciliation.

## Acceptance standard

For a known target, a Finding must match the expected decoded bytes and required wrapper and pass protocol and custody checks. Those checks do not prove earliest raw-byte appearance across every alternate wrapper. For the lost target, the candidate needs evidence linking its original bytes to the attested attachment. Public challenge and signed review tooling is planned; merely submitting a PNG does not resolve it.

An accepted result is an Ethscribe Accession, not a declaration of copyright or authorship.

## Core primary sources

- [Satoshi Nakamoto, “New icon/logo,” BitcoinTalk, 24 February 2010](https://bitcointalk.org/index.php?topic=64.0)
- Historical Bitcoin source packages and their preserved file trees, cited per artifact in the live timeline
- [Ethscriptions protocol specification](https://docs.ethscriptions.com/overview/protocol-specification)

The timeline is a living research interface. While an exact-byte target is open, it publishes historical clues and acceptance rules but seals the expected hash, primary-source location, and preview. Candidate files are hashed locally and checked by a match-only server validator before any gas action is prepared. When a matching artifact is accepted, its expected hash, source location, Ethscription links, and provenance record become public permanently.

For transparency, sealing is a gameplay boundary rather than a claim of cryptographic secrecy for this already-researched seed expedition: some target data existed in earlier public site and repository history. Future expeditions must place commitments in private server configuration before their first public commit. Acceptance integrity never depends on hiding a hash; the server re-verifies the signed Finding against the frozen commitment and the indexed onchain bytes.

Each recovered record keeps its image and available listing prominent, followed by:

1. **File information** — format, byte length, and the decoded raw-file SHA-256.
2. **Ethscription transaction** — the creation ID, time, ethscribing wallet, and explorer links.

Unresolved targets show their file information and compact submission entry instead of empty transaction or listing sections.

Tiny raster assets are enlarged with nearest-neighbor scaling for inspection. Their native dimensions remain labeled, and the scaled preview never substitutes for the historical file.
