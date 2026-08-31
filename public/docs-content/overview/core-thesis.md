# The core thesis

Ethscribe is built around five propositions.

## 1. The artifact is the bytes

For a byte-perfect target, the primary technical identity is:

```text
rawSha256 = SHA-256(decoded artifact bytes)
```

Filenames, MIME labels, Data URI wrappers, marketplace metadata, and visual thumbnails can all change without changing those decoded bytes. Conversely, a single changed byte creates a different artifact identity even when the files render identically.

## 2. The story is the evidence

A hash proves equality, not significance. It cannot explain who created a file, where it appeared, whether it was contemporaneous, or why a particular version is canonical.

Historical claims therefore require a dossier containing:

- Primary sources whenever possible.
- A reproducible chain of custody.
- Relevant dates and version boundaries.
- Known ambiguities and competing candidates.
- Exact target hashes when authoritative bytes survive.
- Signed revisions, challenges, and curator decisions.

## 3. The chain establishes chronology and custody

Ethereum can establish when an Ethscription was created, how it moved, and which address currently controls it. A marketplace contract can provide deterministic custody and settlement.

Ethereum does not independently establish that a file was created by a historical figure or used in a particular event. That remains an evidence question.

## 4. Recognition creates the collectible

The raw file may be copyable. The accepted catalogue position is not.

An **Accession** combines:

```text
exact artifact identity
        +
accepted historical dossier
        +
recognized Ethscription
        +
public ownership record
```

This is closer to a museum accession, first edition, or pedigreed collectible than to a claim of exclusive media access.

## 5. The institution should earn autonomy

It is easy to design a token, jury network, or complicated governance system before a product has users. It is harder to prove that those mechanisms solve a real bottleneck.

Ethscribe begins with transparent curation and a small contract boundary. Distribution is introduced only as participation, curator workload, adversarial value, and community expertise justify it.

The long-term goal is an institution whose ordinary cadence no longer requires its founder:

- Community proposals replenish the expedition queue.
- Researchers and challengers improve evidence.
- Curators rotate by domain.
- A settlement event triggers activation of the next expedition.
- Fees fund contributors and operations.

Autonomy is an outcome of a working flywheel, not a launch-day aesthetic.
