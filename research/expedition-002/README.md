# Expedition 002: You've Got History

**The sounds of going online, 1992–2000.**

Status: reference research for the public Expedition 002 release, authorized September 4, 2026. [Open the expedition](https://ethscri.be/expeditions/youve-got-history) or read the [submission guide](../../public/docs-content/expedition-002/youve-got-history.md). Existing custody/marketplace contracts and 5% sales fee remain unchanged. The earlier Macintosh, DOOM, and Pokémon placeholder expeditions have been removed.

## The result, in plain English

The founder's **You've Got Mail** Ethscription really does contain the **exact complete `GOTMAIL.WAV` preserved in AOL 1.0 for Windows**. The inspection did not find an earlier differing Windows WAV that disproves the identification. That is narrower—and more defensible—than “the earliest recording ever” or “the first WAV ever made.”

There is also a useful surprise: all **five** sounds in that AOL release already have canonical Ethscriptions created by, and currently indexed to, the founder's `0x1f01…9e37` wallet. The complete file bytes were verified on each returned record, not inferred from a familiar title or sound.

The reference collection contains **17 deterministic native files**. Every target has actual extracted bytes, an exact raw SHA-256, a fixed complete Data URI hash, and a named release/member to reproduce it from. This is a deliberately defined set, not a claim that history supplies one exhaustive list of “the most iconic internet sounds.”

## Is the founder's WAV the earliest?

| Evidence | Finding |
| --- | --- |
| Ethscription | [#351032](https://ethscriptions.com/ethscriptions/0x7802ddffee8b4a11a14f60c824135f9aa119a82e021246d022eec8eff8ddb357), created June 29, 2023 |
| Preserved source | AOL 1.0 for Windows, `AOL_1.0.img/GOTMAIL.WA_`, losslessly expanded to `GOTMAIL.WAV` |
| Complete WAV | 9,946 bytes; PCM; mono; **11,000 Hz**, 8-bit; approximately 0.90009 seconds |
| Raw SHA-256 | `de26a6726130fedd92a220dce0246b8f0d1ab3b1b040ec56800f99903259a679` |
| Full canonical Data URI SHA-256 | `df99609184eff13a9b1453b60309a55f480538dd32b66312b831524096e5e003` |
| Cross-version evidence | All five compressed sound members are byte-identical in the preserved AOL 1.1 Windows disk |
| Onchain cross-check | Creation transaction input independently read through Ethereum JSON-RPC; its complete Data URI hash agrees with the official index and extracted file |

AOL's [contemporaneous Windows announcement](https://technologizer.com/2010/05/24/aol-anniversary/index.html), preserved as a republication of its company press release, establishes January 20, 1993 general availability. The [company's remembrance of Elwood Edwards](https://www.aol.com/remembering-elwood-edwards-aols-legendary-voice-that-welcomed-us-all-online-140111983.html) places the spoken recording in 1989. These are different dates for different claims: recording a voice does not establish when this particular RIFF/WAVE file was encoded or shipped.

The August 1992 FAT timestamps are mutable packaging metadata, not independent proof of an earlier public release. Uninspected pre-release disks, development builds, other platforms and original recording masters remain outside the proved claim. Both AOL disk images come from the same third-party archive, without publisher signatures or a documented physical-media chain of custody.

**Recommended catalogue wording:** “The exact You've Got Mail WAV preserved in AOL 1.0 for Windows.” See the complete [AOL evidence](aol.md) and [AOL manifest](aol.json).

## A bounded 17-file expedition

The story progresses from the desktop that brought people online to the voices, presence notifications and messages that made it social. Windows is explicitly a **desktop prologue**, not a claim that its alerts were internet protocols.

| Chapter / reference release | Exact target files | Count | Evidence boundary |
| --- | --- | ---: | --- |
| 1992 — Windows 3.1 retail 3.10.103 | `TADA.WAV`, `CHIMES.WAV`, `CHORD.WAV`, `DING.WAV` | 4 | Complete four-file system-event family in its own `SETUP.INF`; preserved unsigned disks |
| 1993 — AOL 1.0 for Windows | `WELCOME.WAV`, `GOTMAIL.WAV`, `GOODBYE.WAV`, `IM.WAV`, `FILEDONE.WAV` | 5 | Complete five-file family in its own installer manifest; unchanged in the preserved 1.1 disk |
| 1996 — ICQ 1.02 Beta | `Sounds/Message.wav` | 1 | Native file, internal version/path evidence, exact match in separately retrieved ICQ 99b; unsigned packages |
| 1999 — MSN Messenger 1.0.0863 | `type.wav`, `online.wav`, `newemail.wav` | 3 | Valid Microsoft signature on launch-version package; explicit event mappings; matches signed 1.0.0893 |
| 2000 — AIM 4.1.2010 | `Sounds/DOOROPEN.WAV`, `Sounds/DoorSlam.wav`, `Sounds/imrcv.wav`, `Sounds/imsend.wav` | 4 | Valid AOL signature on package and original installation paths; **not proven 1997 launch bytes** |

One sortable list with all 17 exact hashes, filenames, source records and observed canonical status: [target manifest (CSV)](targets.csv). Full audio properties and source chains: [Windows](windows.json), [AOL](aol.json), [ICQ/MSN/AIM](messaging.json). Detailed extraction and authenticity notes: [Windows](windows.md), [AOL](aol.md), [messaging](messaging.md).

The valid MSN and AIM signatures are substantially stronger vendor-authenticity evidence than an uploader's label. Root independently repeated Windows' signature checks on the untouched packages. That still does not establish the earliest-ever use of a recording, a copyright license, or the authenticity of an unrelated export that happens to sound similar.

## What is already Ethscribed?

The [official-index snapshot](availability.json), completed September 5, 2026 at 03:25:58 UTC (September 4 Pacific), records **five canonical matches and 12 canonical payloads not found**, with no incomplete checks. It also checks three other common WAV wrappers for each file; none returned additional matches. Every positive match has its returned complete URI and decoded raw bytes rehashed before being accepted into this research snapshot.

The founder's existing AOL family:

| Sound | Existing Ethscription | Creation |
| --- | --- | --- |
| You've Got Mail | [#351032](https://ethscriptions.com/ethscriptions/0x7802ddffee8b4a11a14f60c824135f9aa119a82e021246d022eec8eff8ddb357) | June 29, 2023 |
| File's Done | [#351800](https://ethscriptions.com/ethscriptions/0x7d99913f826988bc374353f6e516a548be235e416a8b4866375a01507e1c11cc) | June 30, 2023 |
| Goodbye | [#351802](https://ethscriptions.com/ethscriptions/0xf3a837e9baccec7fbefaa0310c09d011b55e3eeaa29391a4ac9b153c98676f20) | June 30, 2023 |
| Instant message | [#351804](https://ethscriptions.com/ethscriptions/0x44b41bdd3767b3df87039eb558e27924c54c5891d05c52824387a4a76af66663) | June 30, 2023 |
| Welcome | [#351805](https://ethscriptions.com/ethscriptions/0xa8fc46cc129c693191dffb6d23c74869d8e25fd20ee7cc2a102afda758593e84) | June 30, 2023 |

“Not found” means the official index did not contain **that queried complete Data URI at the recorded check time**. It does not mean no one ever Ethscribed those bytes through an arbitrary MIME parameter, wrapper, encoding, attachment or compression scheme. Failed/rate-limited checks remain `unavailable`, never `not-found`. Recheck immediately before any future creation transaction; a race is still possible between checking and inclusion.

An existing Ethscription is not automatically deposited, listed or authenticated by a contract. The five verified AOL IDs are recognized seed records in the catalogue; new targets require a verified signed Finding for their expedition assignment. Recognition, custody and listing remain separate product states. Merely browsing or playing existing audio does not move assets.

## Byte-perfect is non-negotiable

The target is the **complete historical file**, not a waveform-equivalence class.

- Preserve RIFF headers, `fmt ` parameters, `data`, optional chunks, trailing bytes and padding exactly.
- Do not resample, trim silence, normalize volume, strip metadata, repair sample rates, convert formats, or re-export through an audio editor.
- Losslessly extracting a native WAV from its original software archive is allowed. The archive/member hashes retain the evidence trail back to the compressed source.
- Use the fixed submission wrapper `data:audio/wav;base64,`. Base64 encodes the exact original file; it does not modify its decoded bytes. Raw-file SHA-256 and full-URI SHA-256 remain distinct identities.
- Filename case or installed filename aliases do not change content hashes, but the historical path is still documented.
- Playback is a presentation of the original, never a replacement reference file. Browsers may process playback internally; no browser-produced export becomes a target.

## Deliberately excluded or deferred

**Windows 95: The Microsoft Sound, Brian Eno.** The original file is recovered and hashed, with internal metadata identifying Eno and the Windows 95 product. Its `mssound.wav` filename is mapped by the original installer to `The Microsoft Sound.wav`. It is **135,876 bytes**, beyond the current site's **90,000-byte raw-file creation limit**. Keep the entire file intact in the [deferred reference](windows.json); do not trim metadata or transcode it to fit. This is a limitation of the present product path, not a blanket protocol impossibility. It could be reconsidered if a separately approved byte-preserving path or verified existing Ethscription becomes usable.

**“The modem handshake.”** A familiar generated acoustic event is not automatically one historical file. An arbitrary modern recording or soundboard export does not supply the release-boundary provenance needed here. A specific contemporary shipped recording could become a separately researched target.

**“The first AIM sounds.”** Current verified bytes are tied to 4.1.2010. An older 1.0.386 installer was retrieved but not successfully decoded in this investigation. That is unfinished research, not permission to backdate the 2000 package's files.

**Unpinned generic nostalgia clips, later voice packs, Mac ROM/resource exports, game sound rips and transformed copies.** These require their own precise original-container definitions and source evidence. They are not placeholders in this corpus.

## Public release and reproducibility

Open `/expeditions/youve-got-history` or its card on `/expeditions`. The page groups the 17 records by release, exposes full hashes/source context, and plays audio only from linked recognized Ethscriptions. Unlinked reference audio remains sealed. The source archives and extracted WAVs are not in `public/` or bundled in production.

The public route includes the existing upload / existing-Ethscription submission flow. The server and browser share [the frozen sound target commitments](../../shared/soundTargets.json), and every check, signed assignment and storage path is scoped to its expedition. Current owners can deposit the five recognized AOL artifacts without replacing their Findings. The old placeholder expeditions are not reintroduced. For local development, `npm.cmd start` still disables publishing and wallet transactions; development byte checks use the live read-only target API.

Reproduce the byte checks without executing old software:

1. Follow the package/download/extraction notes in the three family reports. Pin archive, image, installer and member hashes before extracting. Use trusted archive parsers, not the historical client installers or generated install scripts.
2. Inspect an extracted file with `node scripts/sound-research.mjs wav PATH_TO_FILE`.
3. Run `node --test scripts/sound-research.test.mjs` for parser, identity and safe-path tests.
4. After restoring the documented scratch paths, run `node scripts/check-sound-availability.mjs` for a read-only, rate-limited official-index scan. It validates all 17 local references against their manifest hashes before querying. `--save-snapshot` writes a new ignored scratch snapshot; `--retry-unavailable` retries only incomplete entries. Neither option publishes anything or sends a transaction.

## Release decisions and follow-up work

1. The owner approved publishing the 17-file expedition and opening submissions. Retain the explicit source-confidence levels; independently imaged physical media would strengthen the unsigned AOL/Windows/ICQ evidence.
2. Publication approval is not a copyright license. Byte identity, source authenticity and Ethscription ownership do not supply permission to commercially redistribute a recording or use product branding. No underlying sound ownership is asserted.
3. Target validation, signed Finding assignment, custody reconciliation and wallet links now distinguish Expeditions 001 and 002. The contracts are unchanged, and wrong-byte candidates are rejected before requesting gas.
4. The five existing founder IDs are catalogue seeds; their current owners can deposit them without re-creating the files. Availability checks are scoped to canonical payloads and disclosed aliases, never represented as a complete global raw-byte search.
5. The optional `scripts/check-sound-finding-memory.mjs` verifies all 17 original WAVs through signed publication with in-memory index/custody/storage, plus altered-byte and unverified-custody rejection cases. Browser tests and live post-deploy read/byte checks supplement this; no real wallet signature or funds movement is performed automatically.
