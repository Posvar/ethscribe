# Expedition 002 — verified messaging-client bytes

Research performed locally on 4 September 2026. See [messaging.json](messaging.json) for the machine-readable target hashes, raw package hashes, exact paths, codecs and durations. Installer and sound binaries remain under ignored `.tools/research/sounds/messaging/`; none have been added to the site or public repository.

## Recommendation: eight small native WAV targets

| Client | Selected shipped files | Evidence |
| --- | --- | --- |
| Mirabilis ICQ 1.02 Beta | `Sounds/Message.wav` | Exact extraction from preserved installer; embedded executable and script identify 1.02 Beta. Byte-identical in a separately retrieved ICQ 99b installer. Both packages lack verified vendor signatures. |
| MSN Messenger Service 1.0.0863 | `type.wav`, `online.wav`, `newemail.wav` | **Valid Microsoft Authenticode signature** on original self-extractor. Included INF proves New Message / Contact Online / New Mail event mappings. All three match later signed build 1.0.0893 exactly. |
| AOL Instant Messenger 4.1.2010 | `Sounds/DOOROPEN.WAV`, `Sounds/DoorSlam.wav`, `Sounds/imrcv.wav`, `Sounds/imsend.wav` | **Valid AOL Authenticode signature** on original self-extractor. Included Wise install script proves paths; embedded `aim.exe` version is 4.1.2010. |

All eight are ordinary PCM WAVs, 4,454–19,180 raw bytes, comfortably below the site's current 90,000-byte raw-file creation limit. There is no need for lossy conversion or protocol compression. Use the expedition's fixed `data:audio/wav;base64,` wrapper; the full Data URI SHA-256 and decoded raw-file SHA-256 are separate values in the manifest.

This is a defensible **selected shipping-file corpus**, not a claim to have found the universal first recording or every encoding of each sound. The early internet's audio history has no naturally definitive finite set; the expedition defines one by naming exact releases and paths.

## What establishes the history?

### MSN: a genuine launch-release corpus

Microsoft's [21 July 1999 launch announcement](https://news.microsoft.com/source/1999/07/21/microsoft-launches-msn-messenger-service/) says downloads begin at midnight July 22, describes contact and mail alerts, and lists the first four supported languages. The preserved English self-extractor identifies itself as MSN Messenger Service 1.0.0863, its application files date to July 17, and Windows verifies Microsoft's signature. It is therefore much stronger evidence than a soundboard export.

The package is preserved in the [MSN Messenger Clients collection](https://archive.org/details/MSNMessengerClientsReup), discovered through the [NINA client catalogue](https://wiki.nina.chat/wiki/Clients/Windows_Live_Messenger). The archive's SHA-1 matches the downloaded file. Authenticity rests principally on the **valid Microsoft package signature and its contents**, not the uploader's description. Its three sounds carry December 4, 1998 cabinet timestamps; those are not proof of when the sounds were composed, first recorded, or first used in another product.

`msmsgs.inf` installs the sounds to the Messenger program directory and explicitly maps:

```text
New Message    -> type.wav
Contact Online -> online.wav
New Mail       -> newemail.wav
```

The same WAV files survive unchanged in signed 1.0.0893, retrieved using Escargot's [explicitly unpatched download](https://escargot.chat/download/msn/lang/en/). Do not use a community-patched executable as the reference package.

### AIM: authentic 2000 bytes, not yet proven launch-1997 bytes

The [preserved client catalogue](https://wiki.nina.chat/wiki/Clients/AOL_Instant_Messenger) provides the 4.1.2010 self-extractor. Windows verifies its AOL, Inc. signature. The internal executable reports 4.1.2010 and a June 9, 2000 PE build timestamp. That timestamp is internal metadata, not a separately established public release date.

AOL's four native event WAVs provide the meaningful pairings of presence (door opening/closing) and conversation (message received/sent). The installer also contains other sounds, but these four keep the set focused.

AIM 1.0.386 was downloaded as an earlier comparison candidate, but its InstallShield self-extractor has not yet been decoded. It has **not** been shown that the selected four WAVs are identical to any 1997 version. Retain the visible label **AIM 4.1.2010 · 2000** rather than “the first AIM sounds.”

### ICQ: exact early bytes with an explicit authenticity limitation

[OldVersion's preserved ICQ 1.02 Beta package](https://www.oldversion.com/windows/icq/icq-1-02-beta/) contains a Wise script identifying 1.02 Beta and an executable containing `Beta 1.02`, Mirabilis LTD product metadata, and a December 9, 1996 PE build timestamp. The script assigns extracted payload `00000032.EWI` to `Sounds/Message.wav`. The payload is a complete, ordinary 9,996-byte WAV, not an invented modern export.

The same file was independently extracted as payload `00000138.EWI` from a [preserved ICQ 99b installer](https://archive.org/details/icq-original-old-versions), and the raw SHA-256 matches. This establishes cross-version continuity. It does not magically produce a vendor signature for an unsigned 1996 installer or prove an unbroken custody chain back to Mirabilis.

Call the target **ICQ 1.02 Beta — Message.wav**, with the familiar “uh-oh” nickname only after human playback confirmation. Do not claim that this is the November launch build, the first ever encoding, or that a software build timestamp proves the sound's recording date.

## Reproduce without installing historical software

The tools used are an archive parser and decompressor, not the historical client executables. No ICQ, AIM or MSN installer was executed. Use a controlled scratch directory; never run generated install/rename scripts.

### MSN

Use [7-Zip](https://www.7-zip.org/download.html), tested with 23.01:

```powershell
Get-AuthenticodeSignature .\msn-1.0.0863.exe
Get-FileHash .\msn-1.0.0863.exe -Algorithm SHA256
7z x .\msn-1.0.0863.exe -o.\msn-1.0.0863
```

7-Zip locates `.rsrc/RCDATA/CABINET` (239,071 bytes, LZX:21) and extracts the original members. Hash the WAV files as extracted; do not resave from an audio editor.

### AIM

1. Verify the signed **outer** 2,277,216-byte package first.
2. The Wise PE begins at byte offset **4076** inside it. Copy the exact suffix starting there into a scratch `aim-4.1-inner.exe`; do not execute either file. This is a byte-extraction operation, not a rebuilt historical artifact.
3. Use [WiseUnpacker 3.0.0](https://github.com/mnadareski/WiseUnpacker/releases/tag/3.0.0):

```powershell
WiseUnpacker.exe -x -o=.\aim-output .\aim-4.1-inner.exe
```

The sounds are in `MAINDIR/Sounds`. `WiseScript.bin` supplies the original `%MAINDIR%` installation paths. The local `inspect-sounds.cjs` helper documents the observed offset and computes WAV metadata. The untouched signed outer package, not the extracted inner suffix, is the authenticity anchor.

### ICQ

Use Veit Kannegieser's original [E_WISE distribution](https://www.kannegieser.net/veit/programm/e_wise.arj), retrieved through the [author's program directory](https://www.kannegieser.net/veit/programm/), and extract the ARJ with 7-Zip. The tested `E_WISE_W.EXE` SHA-256 is `f25cf0f24f9aa398fa54b0a3559d670db7c3a12f44340a2730d35584772354df`.

```powershell
E_WISE_W.EXE .\icq-1.02-beta.download .\icq-output
```

Read `00000000.TXT` to map extraction payloads to original filenames. Hash `00000032.EWI` directly: despite its temporary extraction name, the bytes are a RIFF/WAVE file. **Do not execute `00000000.BAT` or `.CMD`:** they contain renames and deletions which are unnecessary for research. For the ICQ 99b comparison, `00000138.EWI` is the matching `Sounds/Message.wav`.

## Still separate from byte verification

- No official Ethscriptions availability lookup was performed by this subtask. Root research handles those checks collectively; arbitrary MIME wrappers cannot be ruled out by checking a few aliases.
- This corpus is a selection of shipped files, not a guarantee that any target remains unethscribed.
- A sound's copyright and commercial reuse rights do not disappear because a vendor package is preserved or signed. No license to redistribute these recordings is asserted.
- A canonical wrapper defines the hunt's accepted submission encoding; it does not turn an Ethereum transaction itself into global deduplication of all decoded bytes.
