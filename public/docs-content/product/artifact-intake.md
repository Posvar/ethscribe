# Ethscribe, deposit, and assign

Artifacts can enter Ethscribe through the site or arrive from anywhere else in the Ethscriptions ecosystem. The product should recognize the bytes either way.

Three actions remain distinct:

| Action | Result |
|---|---|
| Ethscribe | Creates protocol content and an `ethscriptionId` |
| Deposit | Transfers custody to the marketplace vault while preserving a depositor withdrawal path |
| Assign | Connects the Ethscription to an expedition target through a signed off-chain record |

The contract does not need to understand expeditions. It escrows and trades Ethscription IDs. The site and signed research records determine what an artifact is claimed to represent.

## Can Ethscribe detect an artifact created elsewhere?

Yes, with an important distinction.

The official API can look up an Ethscription by ID, list assets owned by a wallet, filter by `content_sha`, and test whether a `content_sha` exists. That hash identifies the **complete data URI**. If Ethscribe knows the precise data URI wrapper as well as the file bytes, the API provides a fast existence check.

The API does not currently expose Ethscribe's wrapper-independent `rawSha256` as a search key. The same decoded bytes can appear under another valid MIME label, encoding, gzip wrapper, attachment, or ESIP-6 form and receive another `content_sha`.

Therefore:

- a known target can be checked immediately against its expected canonical data-URI hashes;
- a wrapper-independent “has this exact file ever appeared?” answer requires Ethscribe's decoded-byte index;
- an off-site Ethscription discovered by that index can be attached to the correct artifact record whether or not it ever entered the marketplace contract; and
- `earliest raw-byte match` remains unavailable until the historical raw-byte backfill is complete.

This is not only an XPM issue. PNG and JPEG have widely used conventional MIME labels, so their canonical check is usually more useful, but the protocol permits any syntactically valid MIME type plus valid Data URI parameters and encoding forms. XPM merely makes the ambiguity more visible because no single MIME label is universally dominant.

Each expedition therefore freezes an accepted wrapper per target. The embedded action generates that wrapper automatically and the signed Finding verifier rejects a different prefix. Expedition 001 uses `data:image/x-xpixmap;base64,` for every XPM target and `data:image/png;base64,` for PNG targets. The site may check a small explicit set of known aliases as a warning, but that is not represented as a protocol-wide raw-byte search.

For a lost target, no expected raw hash exists. Ethscribe cannot automatically recognize the file before someone presents candidate bytes. A Finding supplies those bytes and the provenance case; Ethscribe then calculates `rawSha256`, checks for earlier indexed matches, and begins evidence review.

## Path 1 — submit against an expedition target

Every open artifact target should expose an inline **Ethscribe + Submit** action.

1. Connect a wallet and choose a file.
2. Calculate its byte length, signature, `rawSha256`, and candidate data URI locally.
3. Compare known targets before asking for a transaction.
4. For an expedition submission, send the locally calculated candidate hash to the match-only target validator. The expected hash remains server-side while the target is open.
5. Only after the target matches, check the official API for the exact frozen protocol content and, for XPM, a disclosed set of known alternate wrappers.
5. If no suitable Ethscription exists, create one to the hunter's wallet.
6. After creation is confirmed, transfer the resulting `ethscriptionId` to the vault.
7. Sign the target assignment and initial Dossier.
8. Reconcile the contract deposit against the official indexer before showing `Escrow verified`.

The initial implementation uses two explicit wallet transactions—create, then deposit—because the EVM cannot read the transaction hash of the currently executing creation transaction. The site presents this as one guided flow without disguising the two confirmations.

If the connected wallet already owns a byte-perfect Ethscription, the flow skips creation and goes directly to deposit and assignment.

## Path 2 — personal Ethscribe, then optional handoff

The global **Ethscribe** action lets a wallet preserve something before deciding whether it belongs to an expedition.

1. Upload and inspect the file.
2. Create the Ethscription if an appropriate one does not already exist.
3. Verify that the official indexer recognizes the transaction and the connected wallet as owner.
4. Stop with the Ethscription in the wallet for safekeeping; no vault transfer, listing, or target assignment occurs by default.
5. Optionally continue into a compatible active target. Known-byte targets appear only when the raw hash and frozen wrapper match; bytes-unknown targets appear only when the file type matches their frozen wrapper.
6. If a target is selected, deposit the existing ID and sign the Finding assignment.

A personal Ethscription is not a Finding, Finalist, or Accession. It remains an ordinary wallet-held Ethscription unless its owner explicitly continues into an expedition.

## Path 3 — deposit an existing Ethscription

The wallet experience queries the official API by `current_owner` and shows Ethscriptions directly controlled by the connected address.

1. Connect a wallet and open **My Ethscriptions**.
2. Select one or more owned assets.
3. Transfer them to the vault, using ESIP-5 bulk transfer where appropriate.
4. Wait for indexer reconciliation and the contract cooldown.
5. Keep them unassigned, attach them to targets, list them, or accept bids after escrow is verified.

This mirrors the useful ittybits custody experience while adding byte identity and expedition assignment above it.

## My Vault

The wallet dashboard combines three sources:

- potential deposits recorded by contract events;
- actual `current_owner` state from the Ethscriptions indexer; and
- signed target assignments from Ethscribe storage.

Only positions where the indexer confirms contract custody and the previous owner matches the depositor receive `Escrow verified`. Potential or invalid deposits stay visible as diagnostic records but cannot be presented as saleable inventory.

### Current transaction release

The live `/wallet` route reads fixed market state from Ethereum mainnet, lists directly owned Ethscriptions from the official API, and checks each custody candidate against both sources. It also contains the first Deposit → Verify → Withdraw transaction slice behind a server-side operational gate. Deposits additionally require an unpaused contract; verified withdrawals remain available through the interface during a contract pause when the interface gate is enabled. The gate was enabled for the first production custody pilot and remained enabled afterward at the owner's direction; the live status panel is authoritative for current state.

The live `/ethscribe` route now creates standard, uncompressed calldata Ethscriptions to the connected wallet. Each open Expedition 001 target exposes the same engine with its accepted wrapper locked. The embedded path is deliberately two transactions: create to self, verify the new transaction-hash ID, then transfer that existing ID to the V1 market. A gas-free personal signature binds verified custody to the target, and a Netlify Function independently checks the signature, official content URI, decoded hash, frozen wrapper, and reconciled contract custody before writing an immutable Finding record to Azure.

Every transaction is validated, simulated before wallet submission, and reconciled after its receipt. The standard creation path is capped at approximately 90 KB of source file bytes; gzip, blobs, and larger-file creation are deferred. The site does not yet provide a protocol-wide decoded-byte index, public Finding pages, listings, offers, purchases, or claims. See the [Controlled custody pilot](../reference/custody-pilot.md).

## Withdrawal guarantee

The depositor can withdraw an uncommitted artifact without curator permission. Withdrawal cancels its listing and safely releases or cancels associated market state. An artifact may be temporarily locked only during a narrowly defined settlement transition that already has a funded counterparty and an expiry.

Research assignment survives withdrawal: the artifact can remain recognized by Ethscribe while custody returns to its owner.

## Assignments are off-chain by design

A signed assignment contains:

```text
schemaVersion
ethscriptionId
rawSha256
expeditionId
targetId
submitter
dossierHash
createdAt
signature
```

Keeping these fields out of the vault contract allows research to be corrected and one artifact to participate in later scholarship without making custody logic understand changing historical taxonomies. Curated sales can pass an opaque `contextHash` into settlement when a permanent link is useful onchain.
