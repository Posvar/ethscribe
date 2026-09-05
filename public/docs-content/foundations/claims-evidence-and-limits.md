# Claims, evidence, and limits

Ethscribe separates three records that are often blurred together:

| Record | Question it answers |
|---|---|
| Artifact | What are the exact bytes? |
| Dossier | Why do we believe the historical claim? |
| Ethscription | When did this protocol content appear on Ethereum, and who owns it now? |

No one record can substitute for the others.

## Evidence hierarchy

An expedition defines its own rubric, but the default hierarchy is:

1. **Contemporaneous primary material** — original archives, releases, source trees, signed messages, or timestamped posts from the relevant period.
2. **Authoritative later preservation** — institutional archives, maintained project repositories, or direct statements by participants.
3. **Independent technical corroboration** — reproducible hashes, package manifests, commit history, binary structure, or multiple independently preserved copies.
4. **Credible secondary scholarship** — careful historical research that identifies its sources.
5. **Uncorroborated recollection or resemblance** — useful as a lead, insufficient as proof.

A visually convincing file can still fail if its custody or source is unclear. An exact hash can still fail if the expected target hash was derived from an unreliable copy.

## Evidence grades

The fuller review model should give accepted claims a plain-language grade. These are proposed research labels, not a set of review states implemented throughout the current interface:

- **Verified** — exact bytes match a frozen target supported by strong primary evidence.
- **Strongly attested** — evidence connects the bytes to the claim, but no authoritative target hash existed in advance.
- **Plausible** — credible evidence exists, with a material unresolved gap.
- **Disputed** — credible sources conflict or a substantive challenge remains open.
- **Refuted** — evidence demonstrates that the claim fails the expedition rubric.
- **Bytes unknown** — the historical artifact is attested, but no candidate bytes have been accepted.

These labels describe the evidence, not market value.

## Source requirements

A dossier should identify:

- the exact proposition each source supports;
- whether the source is primary or secondary;
- the source URL, archive URL, and access date;
- relevant file path, release, post, commit, or page location;
- known transformations between the source and submitted bytes; and
- conflicts, uncertainty, and missing links.

Screenshots are illustrations, not sufficient provenance when an underlying document or file can be cited.

## Lost artifacts

For an attested-but-lost artifact, the expedition freezes the identification criteria before submissions open. A candidate may need to satisfy a combination of:

- exact historical filename;
- expected dimensions or format;
- a period-correct container or source location;
- direct linkage to an archived release or participant;
- internal metadata or neighboring files; and
- independent corroboration.

The absence of a target hash raises the evidentiary burden. Popular voting cannot resolve it.

## Corrections and disagreement

Historical knowledge changes. Ethscribe currently stores signed Finding assignments. A public dossier revision and Field Note system is planned; the current site does not yet provide those tools.

An Accession is a recognized catalogue artifact, whether or not it has sold. It is not a guarantee that every historical interpretation is correct. The intended review system will append corrections or disputed attributions while preserving the original decision and any sale history.

## Ownership and rights

Owning an Ethscription means owning the protocol artifact under the protocol's transfer rules. It does not automatically transfer:

- copyright;
- trademark rights;
- a right of publicity;
- authorship credit;
- control of copies elsewhere; or
- permission to commercialize the underlying work.

Every marketplace surface should state this clearly. Expedition authors must also consider whether reproducing source material is lawful and appropriate. Where full bytes cannot be republished, Ethscribe can preserve hashes, metadata, citations, and a defensible preview while documenting the limitation.

## The curator's claim

The strongest normal conclusion is deliberately narrow:

> This recognized Ethscription contains the exact decoded file bytes established by this expedition's reference and evidence.

It does not claim that Ethscribe created the work, owns its intellectual property, or is the only institution capable of authenticating it. An earliest-across-all-wrappers claim requires a complete raw-byte index that this release does not have.
