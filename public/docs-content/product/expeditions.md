# Expeditions

An Expedition is a bounded public search for one or more historically meaningful digital artifacts. It combines a research brief, a byte-verification target, a participation window, and a permanent outcome.

Expeditions are exhibitions people can enter, not open-ended upload categories.

## Anatomy of an expedition

Every expedition publishes:

- an ID, title, theme, and one-sentence challenge;
- historical context and why the target matters;
- included and excluded dates, sources, formats, and variants;
- a frozen eligibility rubric;
- known target hashes, or a precise explanation of why bytes are unknown;
- source and evidence requirements;
- submission, review, and later auction windows;
- the curator identity and decision policy; and
- `No Accession` as a valid outcome.

The brief must be useful before a wallet is connected. Research is the product; trading comes later.

## Two compatible hunt shapes

### Deterministic gap

The expected bytes are already known from an authoritative source, but no matching Ethscription has been secured by the expedition. Hunters compete on discovery, protocol chronology, and successful submission—not on debating what the file is.

### Lost artifact

The historical record establishes that an artifact existed, but its bytes are not known. Hunters search archives and build a provenance case. Because no expected hash exists, curator review carries more weight.

An expedition may contain both, as Expedition 001 does, but the interface labels them distinctly.

## Lifecycle

```text
Draft -> Announced -> Open -> Evidence review -> Finalists
      -> Auction -> Accession
                   or No Accession
```

- **Draft:** the author and curator assemble sources and test the rubric.
- **Announced:** the brief and opening time are public; target rules are frozen.
- **Open:** wallets submit Findings and add Field Notes.
- **Evidence review:** new submissions close while challenges and responses settle.
- **Finalists:** the curator signs the eligible set and reasons.
- **Auction:** eligible artifacts may receive binding bids after the marketplace launches.
- **Accession:** settlement recognizes one winner for the defined target.
- **No Accession:** no candidate met the rubric or reserve conditions.

## Cadence

Ethscribe begins with multi-day or weekly expeditions. A daily opening cadence is a long-term outcome, not a launch promise. It becomes appropriate only when the queue, review capacity, participant supply, and collector demand can sustain it.

Monthly or quarterly Seasons can group related expeditions into coherent exhibitions without forcing every expedition to resolve on the same schedule.

## Completion counts

Progress is derived from artifact records. For a known corpus:

```text
completion = secured byte identities / known byte identities
```

The numerator must eventually reconcile against indexed vault or marketplace state. A lost artifact whose bytes remain unknown is shown as unresolved, not silently counted as an ordinary deterministic gap.

## Permanent outcomes

The public record preserves:

- the frozen brief and rubric;
- all eligible Findings and signed revisions;
- material Field Notes and challenges;
- the curator's signed decision;
- the winning Accession, if any;
- settlement and ownership history; and
- later corrections or disputes.

Low-quality or ineligible submissions need not enter the permanent collection, but their signed records can remain available in an audit archive according to the moderation and retention policy.
