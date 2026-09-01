# Ethscribe, vault, and assign

Artifacts can enter Ethscribe through the site or arrive from anywhere else in the Ethscriptions ecosystem. The product recognizes the bytes either way.

Three actions remain distinct:

| Action | Result |
|---|---|
| Ethscribe | Creates protocol content and an `ethscriptionId` |
| Vault | Places the Ethscription in marketplace custody while preserving a withdrawal path for its previous owner |
| Assign | Connects the Ethscription to an expedition target through a signed off-chain Finding |

The contract does not decide what an artifact represents. It holds and trades Ethscription IDs. Expeditions, provenance claims, and curatorial decisions remain public signed records outside the custody contract.

## Can Ethscribe detect an artifact created elsewhere?

Yes, with an important distinction.

The official API can look up an Ethscription by ID, list assets owned by a wallet, and search by `content_sha`. That hash identifies the **complete Data URI**, including its media type and parameters. If Ethscribe knows the precise wrapper as well as the file bytes, the API provides a fast existence check.

The API does not currently expose Ethscribe's wrapper-independent `rawSha256` as a search key. The same decoded bytes can appear under another valid MIME label, encoding, gzip wrapper, attachment, or ESIP-6 form and receive another `content_sha`.

Therefore:

- a known target can be checked immediately against its canonical Data URI;
- the site may also check a small, disclosed set of common alternate wrappers;
- a protocol-wide “have these exact decoded bytes appeared anywhere?” answer requires Ethscribe's future decoded-byte index; and
- an off-site Ethscription can still be assigned to an artifact if it uses the target's frozen wrapper and enters verified custody.

This ambiguity is not unique to XPM. PNG and JPEG have stronger conventions, but the protocol permits other syntactically valid MIME labels and parameters. XPM makes the distinction especially visible because no single label is universal.

Each expedition therefore freezes one accepted wrapper per target. Expedition 001 uses `data:image/x-xpixmap;base64,` for XPM and `data:image/png;base64,` for PNG. The embedded interface generates the wrapper and the Finding verifier rejects a different prefix.

For a bytes-unknown target, no expected raw hash exists. Ethscribe cannot recognize the artifact before someone presents candidate bytes. A Finding supplies those bytes and a reproducible provenance case.

## Path 1 — submit against an expedition target

Every open target exposes an inline **Ethscribe + Submit** action.

1. Connect a wallet and choose the exact local file.
2. Calculate byte length, file signature, `rawSha256`, and the canonical Data URI locally.
3. Send only the candidate commitment to the match-only target validator. Exact target hashes remain sealed while the hunt is open.
4. Check the official API for the canonical protocol content and any explicitly disclosed aliases.
5. If an eligible Ethscription already exists in the connected wallet, deposit that ID into the market.
6. Otherwise, make one direct-to-vault creation transaction.
7. Wait for the official indexer and the five-block safety window.
8. Sign a gas-free Finding that binds the verified Ethscription to the target.

The normal interface reduces the background work to one ready, mismatch, or existing-content result. Exact hashes and wrapper checks remain available under **Technical checks**.

## Direct-to-vault creation

The V2 market accepts a canonical Data URI as raw transaction input. The transaction is sent:

```text
from: connected wallet
to: EthscribeMarketV2
value: 0 ETH
data: exact canonical Data URI
```

Ethscriptions processes valid transaction input before contract creation events. When the canonical content is still available, protocol state records:

```text
creator: connected wallet
initial owner: EthscribeMarketV2
current owner: EthscribeMarketV2
previous owner: connected wallet
```

This avoids MetaMask's website-originated self-addressed-calldata restriction without changing the hunter's creator attribution. It also establishes public Ethereum ordering in the same transaction that places the artifact in custody. The contract does not list the artifact or assign it to a target automatically.

### The race-safe Finding Receipt

A preflight cannot reserve content between simulation and mining. Another transaction can still claim the same non-ESIP-6 Data URI first.

For every direct attempt, V2 emits a lower-priority ESIP-3 creation containing a compact ESIP-6 Finding Receipt. Its payload commits to the attempted canonical `content_sha`.

- If the canonical input is valid and unique, input wins and the receipt event is ignored by the protocol.
- If the canonical input loses the uniqueness race, the input is invalid and the receipt becomes that transaction's Ethscription.
- The receipt is initially owned by the hunter, because the market contract is its protocol creator and names the hunter as initial owner.

A receipt proves an onchain attempt and its ordering. It is not the canonical artifact, does not enter market custody, and cannot be submitted as the target's accepted file.

This guarantee depends on the official protocol rules that process transaction input before ESIP-3 events and accept `rule=esip6` content without the ordinary uniqueness condition.

## Path 2 — personal Ethscribe, then optional assignment

The global **Ethscribe** action preserves bytes without requiring an expedition decision.

1. Upload and inspect the file.
2. Create it directly into the vault if no checked wrapper already exists.
3. Verify creator attribution and direct market custody through the official indexer.
4. Keep it vaulted, withdraw it to the connected wallet, or continue into a compatible live target.
5. If a target is selected, test the same local bytes against its sealed commitment and sign a Finding.

A personal creation is not a Finding, Finalist, Accession, or listing. The vault is custody, not curatorial approval.

## Path 3 — deposit an existing Ethscription

The wallet experience queries the official API by `current_owner` and shows Ethscriptions directly controlled by the connected address.

1. Connect a wallet and open **My Wallet**.
2. Select an owned Ethscription.
3. Transfer its raw 32-byte ID to the market.
4. Wait for indexer reconciliation and the five-block cooldown.
5. Keep it unassigned, attach it to a compatible target, or later create a listing.

An existing-ID deposit creates a depositor-scoped contract record. A direct creation does not, because an EVM contract cannot read the hash of the transaction currently executing. The first-party application distinguishes the two custody forms.

## Custody verification and withdrawal

The wallet dashboard combines:

- official Ethscriptions ownership;
- potential-deposit state from the market contract; and
- signed target assignments from Ethscribe storage.

For an existing-ID deposit, verified custody requires all of the following:

1. `current_owner` is the market;
2. `previous_owner` is the connected depositor;
3. the depositor's matching contract record is active; and
4. the five-block cooldown has elapsed.

For a direct creation, verified custody requires:

1. `creator` and `previous_owner` are the connected wallet;
2. `initial_owner` and `current_owner` are the market; and
3. the five-block safety window has elapsed.

The V2 direct-creation exit emits an ESIP-2 conditional transfer naming the caller as required previous owner. The protocol ignores a false claim, so another wallet cannot use it to move the artifact. If the owner later registers that ID as an active market deposit, the ordinary registered withdrawal path must be used so listings and deposit state cannot be bypassed.

Both custody forms support bounded bulk withdrawal of up to 100 IDs in one transaction: inherited `withdrawBatchEthscriptions` handles registered deposits and `withdrawBatchUnregisteredEthscriptions` handles direct creations. A mixed wallet inventory can be withdrawn in two batch transactions, one per custody form, so registered listing state is never confused with unregistered direct custody.

Intake may be paused without disabling either withdrawal path. The interface still fails closed when the official indexer is unavailable or materially behind.

## Current release boundary

The standard browser creation path supports uncompressed Data URIs for files up to approximately 90 KB. Gzip transport, blob attachments, and larger files are deferred. The site does not yet provide a protocol-wide decoded-byte index, public Finding pages, listings, offers, purchases, or claims.

Every custody transaction is simulated before the wallet opens, checked after its Ethereum receipt, and reconciled against the official indexer. The server independently verifies a Finding's signature, complete content URI, decoded bytes, frozen wrapper, target commitment, and custody before storing it.

## Assignments remain off-chain by design

A signed Finding binds fields such as:

```text
schemaVersion
ethscriptionId
rawSha256
protocolContentSha256
expeditionId
targetId
authorAddress
custodyContract
createdAt
signature
```

Keeping these fields out of the market lets evidence and attribution evolve without teaching immutable custody code about changing historical taxonomies. A curated sale may later anchor an opaque `contextHash` when a permanent settlement link is useful.
