# Windows' system-event WAV files: deterministic release records

Research date: 4 September 2026. These are release-bounded references, not claims to the first digital alert, first Windows sound, or earliest recording of each melody. No historical installer was executed and no copyrighted payload was added to tracked source or the public site.

## Four targets from Windows 3.1 retail

The inspected artifact is the preserved English **Microsoft Windows 3.1 (3.10.103), 3.5-inch retail floppy set**. Microsoft's own retrospective dates Windows 3.1's shipment to **6 April 1992**. That establishes the release date; it does not timestamp individual bytes or cryptographically authenticate the mirror. [Microsoft's 1992 history](https://learn.microsoft.com/en-us/shows/history/history-of-microsoft-1992).

The set's own `SETUP.INF` supplies both the destination filenames/sizes and event mappings:

| Native WAV | Media member | Expanded bytes | Default event in SETUP.INF | Duration |
| --- | --- | ---: | --- | ---: |
| `TADA.WAV` | `Disk03.img/TADA.WA_` | 27,804 | Windows Start | 1.258957 s |
| `CHIMES.WAV` | `Disk03.img/CHIMES.WA_` | 15,920 | Windows Exit | 0.720000 s |
| `CHORD.WAV` | `Disk03.img/CHORD.WA_` | 24,982 | Exclamation, Critical Stop, Question, Asterisk | 1.130975 s |
| `DING.WAV` | `Disk05.img/DING.WA_` | 11,598 | Default Beep | 0.523991 s |

`SETUP.INF` lines 857–860 list these files, disk numbers, and exact expanded sizes. Lines 1268–1274 map them to the `Sounds` section of `WIN.INI`. Its preserved SHA-256 is `6ec98d9a1ea4d679a675a7620a38b2371c67cc47e85ad012f895747d3ca8f790`.

All four files are **uncompressed PCM, mono, 22,050 Hz, 8-bit**. Each whole file comprises a RIFF/WAVE header, a 16-byte `fmt ` chunk, and its original `data` chunk; inspection found no trailing bytes outside the declared RIFF length. Four event families do not imply four different artists; no unsupported authorship is assigned.

Full-file and canonical-Data-URI hashes are fixed in [windows.json](./windows.json). The canonical expedition prefix is `data:audio/wav;base64,`. The accepted target is the expanded native WAV, not the `.WA_` compression envelope, an MP3, a recording of a PC speaker, or a WAV re-saved by an audio editor.

This is a bounded and reproducible subset: the four system-event WAVs listed in the original installer. The adjacent `CANYON.MID` entry is not part of this WAV family. A separate investigation would be required to claim priority over Windows 3.0 Multimedia Extensions, development builds, localized/OEM variants, or other operating systems.

## Reproduction and provenance

The [preserved Windows 3.1 catalog record](https://winworldpc.com/download/41574932-18c3-9a11-c3a4-e284a2c3a570) provides the archive. The researcher-pinned SHA-256 is `1669bd0a505024ed1b852c1d77a71fcbcbd6dcf4fddd78163e780c7778225cd5`; its SHA-512 matches the mirror's catalog checksum. This is mirror integrity, not a Microsoft signature.

1. Extract the 7z archive to obtain `Microsoft Windows 3.1 (3.10.103) (3.5)/Disk01.img` through `Disk06.img`.
2. Verify the required image hashes against `windows.json` and read their FAT filesystems without booting the disks.
3. Extract `SETUP.INF` from disk 1; extract the three `.WA_` files from disk 3 and `DING.WA_` from disk 5.
4. Decompress the native SZDD files using a trusted archive tool or the operating system's `expand.exe`. Do not run the historical setup program. For example: `expand.exe TADA.WA_ TADA.WAV`.
5. Hash the **entire** expanded file and compare the installer-declared size, manifest SHA-256, RIFF length, and PCM parameters. `node scripts/sound-research.mjs wav PATH` reports those properties without rewriting the asset.

Archive and image hashes, compressed member hashes, installer hashes, source URLs, and local research paths are in the JSON manifest. The original software artifacts are preserved on a third-party mirror; no original publisher-signed checksums or documented physical-media chain of custody were available in this inspection. This limits absolute historical authenticity claims but does not make the byte comparison ambiguous.

## Deferred: The Microsoft Sound, Windows 95

The original `mssound.wav` was also recovered from a preserved **Windows 95 OEM RTM** CD image. Its full-file size is **135,876 bytes** and SHA-256 is:

`9d667f61d830fc908405d2392a2d695abd046437a2859e9289984fae2e62c0a2`

This artifact supplies unusually good internal context:

- `layout.inf` line 959 identifies `mssound.wav`, source index 9, and the exact 135,876-byte size.
- `motown.inf` lines 338 and 340 assign it to Windows' startup event. Lines 390 and 1477 rename the distributed short filename to **`The Microsoft Sound.wav`** during installation.
- The WAV's native `LIST/INFO` tags name **Brian Eno**, **The Microsoft Sound**, **Microsoft Windows 95**, and **1995 Microsoft Corporation**.
- The complete file has `fmt `, `data`, `DISP`, and `LIST` chunks. Those metadata/display chunks and RIFF padding are part of its byte identity and must not be stripped.

The audio is mono 22,050 Hz, 8-bit PCM, with 135,005 audio-data bytes—about **6.122676 seconds**. The Library of Congress' 2025 National Recording Registry recognizes Eno's Windows startup chime; this independently supports cultural significance and authorship, **not this precise file's SHA-256**. [Library of Congress entry](https://www.loc.gov/programs/national-recording-preservation-board/recording-registry/registry-by-induction-years/2025/). Microsoft dates Windows 95's launch to **24 August 1995**. [Microsoft anniversary account](https://blogs.windows.com/windows-insider/2020/08/24/looking-back-the-25th-anniversary-of-windows-95/).

The bytes are known, but the target is deliberately in `deferredTargets`, not the launch-capable target list: **135,876 exceeds the site's current 90,000-raw-byte standard creation limit** in `src/ethscriptionCreation.js`. This is a limitation of the current product path, not a universal statement about what the protocol can preserve. The research does not authorize raising limits, adding compression, changing contracts, truncating metadata, or transcoding the recording merely to make it fit.

### Windows 95 reproduction

Use the [preserved OEM RTM catalog record](https://winworldpc.com/download/07c3a63e-c2b4-6e04-11c3-a6e280947e52), archive SHA-256 `be2a76ecc9098e6717a03e292d9bbac8bce53ce3e7cc0011cb040112c5611adc`. Extract `Microsoft Windows 95 (OEM) (RTM).iso`, SHA-256 `4cf4dc217b52338482d4a50997ac107abe63156bfe00bc65998124d265bcbace`. Extract the `WIN95` directory's cabinet set, then use trusted 7-Zip cabinet extraction for `mssound.wav`, keeping the adjacent cabinets available because the archive is multi-volume. `layout.inf` and `motown.inf` can likewise be extracted from the cabinet sets without installation. Their hashes are recorded in the manifest.

The local research files remain under ignored `.tools/research/sounds/windows/`. Preserving bytes or owning an Ethscription does not grant copyright permission to commercially redistribute these recordings.
