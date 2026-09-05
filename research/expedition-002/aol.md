# AOL's earliest Windows sound set: byte-level findings

Research date: 4 September 2026. Local research only; no publication, transactions, or copyrighted sound files added to the public site or tracked source.

## The user's file matches

The WAV decoded from Ethscription `0x7802ddffee8b4a11a14f60c824135f9aa119a82e021246d022eec8eff8ddb357` matches the complete expanded `GOTMAIL.WAV` from a preserved **America Online 1.0 for Windows** distribution. This is equality of the entire file, including the RIFF header and padding—not merely a matching phrase or waveform.

| Property | Both files |
| --- | --- |
| Raw file size | 9,946 bytes |
| Raw file SHA-256 | `de26a6726130fedd92a220dce0246b8f0d1ab3b1b040ec56800f99903259a679` |
| Format | RIFF/WAVE, uncompressed PCM, mono, 11,000 Hz, 8-bit |
| Audio data | 9,901 bytes, about 0.90009 seconds, followed by RIFF alignment padding |
| Canonical prefix | `data:audio/wav;base64,` |
| Full canonical Data URI SHA-256 | `df99609184eff13a9b1453b60309a55f480538dd32b66312b831524096e5e003` |

Defensible description: **“The exact You've Got Mail WAV preserved in AOL 1.0 for Windows.”** The evidence supports the user's identification; this investigation did not uncover an earlier differing Windows WAV.

It does **not** prove this is the earliest recording, the first copy ever produced, or the first digital container on every platform. Earlier Macintosh implementations used other sound containers; converting one into a WAV today would create a new file, not an earlier historical WAV. Windows 1.0 launch software, recording history, and absolute worldwide first-Ethscription status are three separate questions.

## Dated historical context

AOL's own retrospective credits Elwood Edwards with recording four spoken prompts in **1989**. That supports the recording story, not a 1989 date for this particular WAV container. [AOL Staff remembrance](https://www.aol.com/remembering-elwood-edwards-aols-legendary-voice-that-welcomed-us-all-online-140111983.html).

AOL's announcement dated **20 January 1993** describes general availability of its Windows client and specifically explains that users hear mail arrivals and completed downloads. The text is a primary company press release, but its surviving copy inspected here is a 2010 republication by Harry McCracken, not an AOL-hosted or publisher-signed original. [AOL/PRNewswire announcement reproduced at Technologizer](https://technologizer.com/2010/05/24/aol-anniversary/index.html).

The disk's five compressed sound files carry **26 August 1992** FAT modification dates. These mutable, timezone-unspecified filesystem values show internal packaging metadata, **not proof of public release in 1992**. Other files on the inspected 1.0 disk date to January 1993; `WAOL.EXE`'s embedded version strings read `1.00.001`. Do not use the archive's broad “1992” product heading to backdate this specific Windows release. [WinWorld's mixed DOS/Windows catalog](https://winworldpc.com/product/aol/10).

## A small, genuinely bounded target set

`AOL.INF`, section `[app.main]`, explicitly lists exactly these five bundled sound members. Printable strings in `INSTALL.EXE` also map their expanded filenames to the Windows sound event names below. Neither executable was run.

| Expanded file | Installed event | Bytes | PCM specification | Duration |
| --- | --- | ---: | --- | ---: |
| `WELCOME.WAV` | Welcome | 13,450 | mono, 22,000 Hz, 8-bit | 0.6093 s |
| `GOTMAIL.WAV` | You've Got Mail | 9,946 | mono, 11,000 Hz, 8-bit | 0.9001 s |
| `GOODBYE.WAV` | Goodbye | 5,450 | mono, 11,000 Hz, 8-bit | 0.4914 s |
| `IM.WAV` | IM | 10,600 | mono, 11,000 Hz, 8-bit | 0.9596 s |
| `FILEDONE.WAV` | File's Done | 7,802 | mono, 11,000 Hz, 8-bit | 0.7053 s |

Full raw and protocol hashes, compressed-member hashes, timestamps, archive hashes, source URLs and IDs are in [aol.json](./aol.json). No WAV has been transcoded, normalized, resampled, or re-saved. Note the unusual exact rates **11,000/22,000**, not 11,025/22,050; “correcting” them changes the artifact.

All five compressed sound members are also byte-identical in a separately downloaded **AOL 1.1 Windows** disk image. This corroborates continued shipping within a later version, but both images come from WinWorld. It is **not independent physical-media custody or publisher cryptographic authentication**. [AOL 1.0 preserved artifact](https://winworldpc.com/download/45c2a9c3-9348-18c3-9a11-c3a4e284a2ef), [AOL 1.1 preserved artifact](https://winworldpc.com/download/465e32c3-8518-c39a-11c3-a4e284a2c3a5).

The core five are a complete family, not five arbitrary nostalgia-download picks. They can anchor a larger sound expedition whose other families have similarly fixed release boundaries. `DROP.WAV`, later alternate voices, arbitrary modem recordings and re-encoded soundboard clips are **not** part of this five-file release set.

## Reproduction chain

1. Download the catalog's preserved 7z archive. Pin its SHA-256 before extracting: `7d9d9b4fa973919f7c31b8d2305019ef7d330f9022b5ea0d10b303a6349838ff`.
2. Extract `AOL_1.0.img`, SHA-256 `7645ab777bce1c6820c5e89b7a903bac74750b5968e01402f90196b30b908163`. Windows' built-in `tar.exe` can unpack this 7z.
3. Read the FAT12 image without booting it. The root members `WELCOME.WA_`, `GOODBYE.WA_`, `IM.WA_`, `GOTMAIL.WA_` and `FILEDONE.WA_` are SZDD-compressed files. The local read-only filesystem parser is `.tools/research/sounds/aol/extract-fat12.cjs`.
4. Use the trusted operating-system `expand.exe`, not the archive's installer, to decompress each member—for example `expand.exe GOTMAIL.WA_ GOTMAIL.WAV`.
5. Hash the entire expanded file. Keep all headers, sample bytes and alignment padding intact. The local `.tools/research/sounds/aol/inspect-wav.cjs` reports full-file SHA-256, canonical Data URI SHA-256, RIFF chunk sizes and PCM format.
6. For 1.1 corroboration, pin archive SHA-256 `78b9fcc65a7fe0d999f15ebd25ffb18e362a640e0e717a18acb1f420ee162a32`, extract `AOL_1.1.img` with SHA-256 `957f3b63668c0a1e489318963fc4cd64ee8ff158134a1c6b6ea63a0fade45ca5`, and compare each compressed member against the 1.0 hashes.

Research downloads and extracted payloads remain in ignored `.tools/research/sounds/aol/`. Archive-mirror availability is not a license to commercially republish its contents. Provenance, Ethscription ownership and copyright permission remain distinct checks.

## Confidence limits and useful next corroboration

- Raw-file equality: established against the inspected disk and the user's decoded file.
- Complete installed sound family for this preserved distribution: established from its own installer manifest and event strings.
- Historical release association: supported by internal version/date consistency and contemporaneous company announcement; subject to mirror provenance limits.
- “Earliest Windows WAV ever”: not proved. A pre-release disk or earlier development build could exist; no absolute negative claim is warranted.
- Other files still available to Ethscribe: must be checked against the current official index using fixed canonical payloads and known aliases; unknown alternate wrappers cannot be globally ruled out by those queries.
- Stronger archival attestation: compare a separately imaged physical 1.0 floppy with documented ownership, or an independently preserved contemporary release archive. Two releases from the same mirror are helpful, but not equivalent to that.
