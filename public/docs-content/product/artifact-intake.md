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

For a lost target, no expected raw hash exists. Ethscribe cannot automatically recognize the file before someone presents candidate bytes. A Finding supplies those bytes and the provenance case; Ethscribe then calculates `rawSha256`, checks for earlier indexed matches, and begins evidence review.

## Path 1 — submit against an expedition target

Every open artifact target should expose an inline **Ethscribe + Submit** action.

1. Connect a wallet and choose a file.
2. Calculate its byte length, signature, `rawSha256`, and candidate data URI locally.
3. Compare known targets before asking for a transaction.
4. Check the official API for the exact protocol content and Ethscribe's raw-byte index for equivalent wrappers.
5. If no suitable Ethscription exists, create one to the hunter's wallet.
6. After creation is confirmed, transfer the resulting `ethscriptionId` to the vault.
7. Sign the target assignment and initial Dossier.
8. Reconcile the contract deposit against the official indexer before showing `Escrow verified`.

The initial implementation uses two explicit wallet transactions—create, then deposit—because the EVM cannot read the transaction hash of the currently executing creation transaction. The site presents this as one guided flow without disguising the two confirmations.

If the connected wallet already owns a byte-perfect Ethscription, the flow skips creation and goes directly to deposit and assignment.

## Path 2 — generic vault intake

The global **Ethscribe** action lets a wallet preserve something before deciding which expedition it belongs to.

1. Upload and inspect the file.
2. Create the Ethscription if an appropriate one does not already exist.
3. Deposit it into the vault without an expedition assignment.
4. View it under **My Vault**.
5. Later assign it to an active target by signing an assignment record.

An unassigned vault item is not a Finding, Finalist, or Accession. It is simply a user-controlled escrow position.

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

### Current gated transaction release

The live `/wallet` route reads fixed market state from Ethereum mainnet, lists directly owned Ethscriptions from the official API, and checks each custody candidate against both sources. It also contains the first Deposit → Verify → Withdraw transaction slice behind a server-side operational gate. Deposits additionally require an unpaused contract; verified withdrawals remain available through the interface during a contract pause when the interface gate is enabled. The gate was enabled for the first production custody pilot and remained enabled afterward at the owner's direction; the live status panel is authoritative for current state.

Every transaction is validated, checked for a raw-ID selector collision, simulated before wallet submission, and reconciled after its receipt. This release does not yet include signed target assignments, decoded-byte indexing, listings, offers, purchases, or claims. Those omissions are visible product states, not inferred from an empty custody list. See the [Controlled custody pilot](../reference/custody-pilot.md).

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
