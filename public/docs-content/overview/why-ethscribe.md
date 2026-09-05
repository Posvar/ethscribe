# Why Ethscribe exists

Digital culture produces artifacts faster than institutions can preserve them. Source archives disappear. Download links rot. Forum migrations lose attachments. Application bundles are extracted and repackaged without provenance. Even when an image survives, its exact relationship to the historical event around it may be unclear.

Traditional archives address much of this problem, but Ethscribe explores a complementary model: make preservation participatory, make exact-byte verification legible, and make accepted artifacts ownable without privatizing their contents.

## Digital archaeology can be a public game

Most people will not browse a source repository looking for a 20-pixel icon. They may, however, participate when the question is framed as a hunt with a clear target, a timeline, visible gaps, and a finite outcome.

The long-term expedition model gives the work structure:

1. Define a historically meaningful target.
2. Publish the known evidence and eligibility rules.
3. Invite the public to recover or ethscribe exact files.
4. Let researchers add sources, corroborations, and challenges.
5. Accept a winning artifact or explicitly conclude `No Accession`.
6. Preserve the record and advance to the next expedition.

The current release implements target exploration, exact-file testing, signed Findings, and fixed-price trading. Public corroborations, formal challenges, and automatic progression remain planned. The game attracts attention and effort to bounded research problems; the evidence still has to support the result.

## Exact bytes matter

Two files can look identical and still differ in metadata, compression, palette order, line endings, or source declarations. Those differences can reveal when, where, and how an artifact was produced.

Ethscribe therefore treats visual resemblance as a lead, not proof. When authoritative bytes are known, a Finding must match their decoded raw-file hash. When the bytes are lost, the record remains unresolved until a candidate has credible provenance.

## Ownership can fund preservation

Public-domain and widely copied artifacts can still have meaningful provenance and ownership records. Collectors already value first editions, canonical editions, signed objects, and artifacts associated with important events even when the underlying information is public.

Ethscribe applies that pattern to digital files:

- The file can remain publicly viewable and reproducible.
- The accepted Ethscription can have a singular ownership history.
- The evidence dossier explains why that onchain object occupies a recognized catalogue slot.
- Marketplace fees can support future expeditions and operations.

This is ownership of a recognized onchain artifact—not ownership of history itself.

## Why Ethscriptions

Ethscriptions use Ethereum calldata and protocol rules to create and transfer digital artifacts. They are unusually well matched to byte-perfect archaeology because their culture already emphasizes content identity, chronological creation, and inexpensive inscription.

The protocol also forces an important design insight: protocol uniqueness is based on the complete data URI, while historical artifact identity should be based on decoded file bytes. Ethscribe adds that missing research layer rather than pretending the two are the same.

## Why curation is necessary

Without boundaries, the product becomes another open inscription feed. Ethscribe instead indexes only expedition targets, credible Findings, and accepted Accessions.

The review model should preserve these constraints as its tooling grows:

- Expeditions are scoped.
- Rubrics are published before review.
- Evidence is visible.
- Popularity only affects discovery.
- Eligibility decisions are signed and explained.
- `No Accession` remains an acceptable result.

The catalogue is valuable because inclusion is meaningful.
