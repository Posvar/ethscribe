# Expedition 000 — EBURP story and evidence

Research checked 5 September 2026. The owner subsequently approved publication of Expedition 000 on the same date. No deployment, contract change, transaction, or alteration of the existing EBURP app was performed for the research itself; publication does not expand the evidence claims below.

The complete page-ready narrative is in [src/eburpStory.js](../../src/eburpStory.js). It preserves the story’s three distinct layers: the original mobile-game lineage, the later source-file release, and Jeremy Posvar’s collector-led archive. The source dates below must not be collapsed into one supposed creation date for every sprite.

## Evidence ledger

| Date | What the evidence establishes | What it does not establish |
| --- | --- | --- |
| 2005 | Matt Hall dates the first phone game to this year in his [2010 retrospective](https://web.archive.org/web/20101113223953/http:/larvalabs.com/blog/larvalabs/our-first-mobile-game). | A specific release day, or that later EBURP PNGs are identical to its handset files. |
| 11 November 2010 | Publication of that retrospective. | A 2010 launch date for the original game or an Android release date. |
| 1 November 2013, 14:34:37 UTC | GitHub reports creation of the public [pents90/eburp repository](https://api.github.com/repos/pents90/eburp). | The date every included image was first drawn. |
| 1 November 2013, 14:37:54 UTC | Author and committer timestamps of John Watkinson’s [root commit](https://github.com/pents90/eburp/commit/dca3cf9a56c955ad87063253d8a34eaa38fcc002), `dca3cf9a56c955ad87063253d8a34eaa38fcc002`. The commit includes the icon files. | Independent authentication of the Git clock, or a first-ever creation claim. |
| June 2017 | The studio dates CryptoPunks’ launch to this month on its [official project page](https://www.larvalabs.com/cryptopunks). | That EBURP and CryptoPunks are the same artwork or that the present collection is endorsed. |
| 12 October 2023 | Publication date of [Jeremy Posvar’s collection essay](https://medium.com/@Posvar/the-eburp-collection-bridging-larvalabs-pixel-past-to-blockchain-present-d9e20f00bd01). | A creation timestamp for all Ethscriptions, or their present ownership. |

## Corrections and attribution

- The existing `C:/dev/EBURP/src/App.js` story and collector essay say **2004**. Prefer **2005**, with the dated creator account cited. No primary evidence for a 1992 Gurk/EBURP release was found; the studio’s [1990s college history](https://www.larvalabs.com/about) is not an asset date.
- The [contemporary sales sheet](https://www.larvalabs.com/public/images/blog/sidekickdev/gurkinfosheet.pdf) corroborates J2ME/MIDP-era phone constraints and the game’s scale. It does not display a publication date. The small download and large world are the historical story—not a claim about any individual PNG’s size.
- Credit the early Gurk collaboration to **Matt Hall and John Watkinson**. Credit publication of EBURP to **John Watkinson**, identified by his [GitHub profile](https://github.com/pents90) and commit metadata. The inspected evidence does not identify the individual artist of every sprite; avoid assigning every pixel to either founder alone.
- The [first-commit README](https://github.com/pents90/eburp/blob/dca3cf9a56c955ad87063253d8a34eaa38fcc002/README.md) explicitly places the engine in **Gurk III**. Reference-file dates belong to that source history, even when a character’s design may be older.
- A shared creative lineage is well supported. A claim that each sprite directly inspired a specific CryptoPunk is not. Do not import promotional statements about guaranteed collectible value or future appreciation.

## Collection boundaries

Read-only inspection of `C:/dev/EBURP/public/eburp.csv` found 216 entries. Its first 92 (`item_index < 92`) contain 9 Hero, 65 Enemy and 18 NPC records, consistent with the collector’s described core. The other 124 remain outside that core.

The founder essay attributes the burn decision to John Watkinson’s wishes. No public correspondence proving that request was inspected. The shortened page narrative now states the curator-confirmed preservation and subsequent burn transfer directly, and omits the private-request attribution. This editorial change is not a new independent verification of every burn or current owner. Recording a file does not establish a right to sell its copyright; a burn transfer also does not delete the bytes from chain history.

Current custody, every creation timestamp, the alleged burn destinations and all source-byte matches require the separate per-asset data audit. Do not mark these checks complete merely because the CSV contains transaction IDs. Date requests to the official Ethscriptions API were rate-limited during this story pass and stopped to avoid competing with the data audit; this document makes no new custody verification claim. In particular, **the essay’s date must not be substituted for a blockchain timestamp**.

## Source history and rights boundary

The inspected repository’s latest master commit is `bbe1ae37ad1d6bb5ed3cceb17c0d4b2dd33b0b38`, dated 17 June 2014. GitHub’s later `pushed_at` timestamp is not a sprite-release date. Pin candidate files to the initial 2013 commit where their byte identity is confirmed; otherwise state the revision actually compared.

The [README’s reuse section](https://github.com/pents90/eburp/blob/dca3cf9a56c955ad87063253d8a34eaa38fcc002/README.md) permits use of included project material, asks users not to reuse the Gurk game name, and distinguishes included files from other Gurk graphics/music. The inspected [recursive tree](https://api.github.com/repos/pents90/eburp/git/trees/bbe1ae37ad1d6bb5ed3cceb17c0d4b2dd33b0b38?recursive=1) contains no LICENSE, COPYING or COPYRIGHT file; GitHub’s license metadata is null. Describe this wording directly. Do not invent a MIT, GPL, CC0 or public-domain designation, and do not present this research as a legal opinion.

Use the historical brands descriptively. This is an independent collector’s retrospective, not a Larva Labs-authorized launch. The 124 archival records must not silently join the tradable core. Exact-byte provenance, Ethscription recognition, current ownership and rights are separate questions; one cannot stand in for another.

## Integration contract

`src/eburpStory.js` exports `eburpStory` with `intro`, `chapters`, and `rightsNote`. Each chapter has `id`, `date`, `title`, `paragraphs`, and `sources`; each source has `title` and `url`. A paragraph is either a plain string or `{ segments: [{ text, url? }] }` for safe inline links. Render strings as React text and linked segments as anchors after requiring HTTPS; do not inject HTML. The collector credit uses `@posvar` linked to `https://x.com/posvar`. The reviewed narrative is approved for the public Expedition 000 route and linked from its Docs page. The narrative intentionally does not supply inferred creation timestamps, marketplace status or individual asset provenance badges.

## Editorial simplification

The current page has five chapters. At the curator’s request, it omits the redundant sentence contrasting the retrospective’s publication date with the game’s release, and removes the entire “The artifact, not a redraw.” chapter. The dated historical headings, source evidence, rights note and separate per-asset byte audit remain intact. The 2023 chapter retains the 92-character breakdown—nine heroes, 65 enemies and 18 non-player characters—and describes the other 124 preserved Ethscriptions as subsequently sent to the Ethereum burn address, part of the archive rather than the tradable core.
