# Expedition 002: You've Got History

**The sounds of going online, 1992–2000.**

[Enter Expedition 002](/expeditions/youve-got-history). Submissions are open for its unresolved exact-file targets.

Before the feed, there was a sound: the desktop waking up, a voice announcing mail, a door opening when a friend arrived. This expedition recovers the original files behind those moments—not modern recordings of them.

## The 17-file reference collection

| Reference release | Exact WAV files | Targets |
|---|---|---|
| Windows 3.1 retail 3.10.103, 1992 | TADA.WAV, CHIMES.WAV, CHORD.WAV, DING.WAV | 4 |
| AOL 1.0 for Windows, 1993 | WELCOME.WAV, GOTMAIL.WAV, GOODBYE.WAV, IM.WAV, FILEDONE.WAV | 5 |
| ICQ 1.02 Beta, 1996 | Sounds/Message.wav | 1 |
| MSN Messenger 1.0.0863, 1999 | type.wav, online.wav, newemail.wav | 3 |
| AIM 4.1.2010, 2000 | Sounds/DOOROPEN.WAV, Sounds/DoorSlam.wav, Sounds/imrcv.wav, Sounds/imsend.wav | 4 |

Windows is the desktop prologue, not a claim that its system alerts were internet protocols. This is a deliberately bounded collection of specific release files, not an exhaustive list of every iconic sound or every sound shipped by those applications.

Each target publishes its complete raw-file SHA-256, original size, format, and source context. The original archives and member hashes are documented in the [research notebook](https://github.com/Posvar/ethscribe/blob/main/research/expedition-002/README.md) and [17-file reference manifest](https://github.com/Posvar/ethscribe/blob/main/research/expedition-002/targets.csv). That manifest includes the dated research availability scan, not a live guarantee that a target remains unclaimed.

## Submit a file or an existing Ethscription

The completion grid shows all 17 slots: green means a recognized Ethscription, and **Open** means no accepted match is in the expedition's catalogue yet. Select a slot to open its record. The grid, records, and progress count update together when a verified Finding is accepted; green does not by itself mean the artifact is deposited or listed for sale.

1. Open an unresolved record and choose **Submit a Finding**.
2. Choose **Upload** for a file recovered from its original source, or **Existing Ethscription** for one you own.
3. Test it. The site checks the complete bytes and file size against that target, locks the canonical WAV wrapper, and checks known protocol matches before preparing any gas action.
4. If eligible, create directly into market custody or deposit your existing matching Ethscription. Your wallet must approve the transaction.
5. Wait for Ethereum and custody verification, then sign and publish the Finding. This final signature costs no gas and explicitly names **Expedition 002 and the selected target**.

The record and expedition count update after the server accepts the exact-match Finding. Ethscribing alone does not complete that assignment. A confirmed transaction awaiting indexing should be rechecked, not repeated. See [Your first Finding](../product/first-finding.md) for transaction recovery and the race-condition receipt.

## Five AOL artifacts already recognized

The founder's June 2023 Ethscriptions match all five native WAVs in the preserved AOL 1.0 Windows distribution. The linked audio is available in the expedition. These recognized records do not need replacement Findings.

If you currently own one, connect that wallet and open its record to **Deposit into marketplace**. The site checks current ownership; being the original creator is not sufficient if the asset has since transferred. Deposit moves the existing Ethscription, not a new copy. Price setting and withdrawal remain in [Field Wallet](/wallet).

The defensible description of the founder's mail sound is **the exact GOTMAIL.WAV preserved in AOL 1.0 for Windows**. It is not a proved claim to the earliest recording or every earlier development build. The 1989 voice-recording story and the 1993 Windows release date describe different historical events.

## Never change the bytes

The whole original WAV is the target: RIFF headers, audio samples, sample-rate fields, padding, and any additional metadata chunks.

- Losslessly extract the native file from its documented software archive.
- Do not trim silence, resample, normalize, strip metadata, repair headers, or re-export through an audio editor.
- A recording that sounds identical but has different file bytes does not match.

The interface fixes the submission encoding to `data:audio/wav;base64,`. Base64 preserves the decoded file exactly. The full Data URI hash and decoded-file hash remain separate identities.

Checks cover the canonical wrapper and three common aliases: audio/x-wav, audio/wave, and audio/vnd.wave. They do not exhaust all possible wrappers or reserve a payload. If another checked wrapper already contains the bytes, the site will not silently mint a second version to manufacture priority.

## Evidence and ownership limits

MSN and AIM source installers have verifiable Microsoft and AOL signatures. AOL, Windows 3.1 and ICQ references come from preserved, unsigned packages, with internal manifests and cross-version evidence where available. Exact-file equality is deterministic; those different historical authentication limits remain visible in each record.

The AIM targets are tied to **4.1.2010 in 2000**. They are not labeled as proven 1997 launch bytes. No target's mutable filesystem timestamp is treated as independent proof of its first public appearance.

An Ethscription does not grant copyright, historical authorship, or exclusive access to a recording. The curated reference definition, a signed submission and protocol ownership are separate claims.

## What is outside this hunt

The Windows 95 Brian Eno startup file was recovered and hashed but remains deferred: its complete 135,876 bytes exceed the current 90,000-byte creation path. It has not been shortened or converted to fit, and it is not one of these 17 targets.

Generic modem-handshake recordings and unpinned soundboard exports are excluded. A familiar sound is not automatically one deterministic historical file.

This expedition uses the existing immutable marketplace. There is no new contract or creation fee: creation and deposit cost Ethereum gas, and sales use the existing 5% marketplace fee.
