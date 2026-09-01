# EthscribeMarketV2 threat model

This document records the security boundary of `EthscribeMarketV2` and its inherited V1 settlement system. It is not an audit report. Deployment and source verification do not imply that valuable custody or trading has been approved.

## Assets at risk

- Ethscriptions interpreted by the protocol as owned by the market contract;
- ETH locked in active offers;
- seller proceeds, refunded offers, and fees held as claimable balances;
- a hunter's attribution and withdrawal path for a direct creation; and
- user confidence in the provenance context presented by the first-party application.

## Protocol boundary

Ethscriptions ownership is derived outside the EVM from Ethereum transaction input and protocol event logs. The contract cannot query that derived state or read the hash of its own containing transaction. A contract call succeeding is therefore not, by itself, proof that an artifact was created or transferred.

The first-party application treats the official indexer as a required external view and fails closed when it is unavailable, behind the independently read Ethereum head, or inconsistent with contract state.

## Intake paths

### Existing-ID deposits

Raw calldata containing one or more packed 32-byte IDs records depositor-scoped **potential** deposits. Any caller can record any ID under its own key; this is not ownership proof.

The application must require:

1. official `current_owner == market`;
2. official `previous_owner == depositor`;
3. an active matching potential-deposit record; and
4. the five-block cooldown.

A forged record may exist onchain but must never receive a verified badge, listing control, or funded offer in the first-party interface.

### Direct-to-vault creation

Raw calldata beginning with lowercase `data:` is handled as a creation attempt before packed-ID parsing. The contract emits:

1. an ordinary attempt log committing to `sha256(msg.data)`; and
2. a lower-priority ESIP-3 creation for an ESIP-6 Finding Receipt owned by `msg.sender`.

Under the official protocol ordering, valid unique transaction input is evaluated before creation events. The canonical artifact therefore wins when available, with `msg.sender` as creator and the market as initial owner. If uniqueness fails, the ESIP-6 receipt becomes the transaction's Ethscription instead.

The contract cannot distinguish a uniqueness race from some other invalid direct input. The first-party interface prevents malformed input and labels a receipt as a race outcome only after it generated a syntactically valid canonical Data URI and performed its preflight. A direct caller who bypasses the interface may spend gas and receive only a receipt.

No direct-creation deposit record is possible in the same call because the EVM cannot access the containing transaction hash. The application verifies this custody form only when the official record names:

- the connected wallet as `creator` and `previous_owner`;
- the market as `initial_owner` and `current_owner`; and
- a creation block outside the five-block safety window.

A direct creation is not eligible for contract listings or funded offers until its previous owner registers the known ID through the ordinary fallback path.

### Race-safe Finding Receipt

The receipt commits to the attempted canonical `content_sha`. It proves the existence and ordering of the attempt, not recovery of the historical artifact. It is owned by the hunter rather than the market and cannot satisfy Finding custody checks.

This guarantee depends on current protocol behavior:

- transaction input is processed before ESIP-3 creation events;
- only the first valid Ethscription in one Ethereum transaction is saved; and
- `rule=esip6` removes the ordinary content-uniqueness requirement.

Any future protocol change to those rules requires review before V2 remains an enabled intake destination.

## Withdrawal paths

Registered deposits use the inherited nonce-aware withdrawal path, which clears listing state before emitting an ESIP-2 conditional transfer.

An unregistered direct creation uses `withdrawUnregisteredEthscription`, or up to 100 use `withdrawBatchUnregisteredEthscriptions`. The contract cannot prove the caller was the direct creator, so each method emits an ESIP-2 transfer conditioned on `previousOwner == msg.sender`. The official protocol ignores a false claim. If that caller has an active registered deposit record for an ID, V2 rejects the unregistered exit and requires the ordinary single or batch registered-withdrawal path so listing and nonce state cannot be bypassed.

These exits remain callable while intake is paused. The first-party interface still requires reconciled official ownership before preparing either withdrawal.

## Trust assumptions

### Official Ethscriptions indexer

The indexer is trusted to implement the public protocol rules and report creator, initial owner, current owner, previous owner, content hash, and block correctly. The application compares indexer height with an independently read Ethereum RPC head. It does not currently operate a separate full protocol indexer.

### Direct callers

The contract cannot protect a buyer who deliberately bypasses reconciliation and purchases from a forged potential-deposit record. Exact seller, ID, nonce, and price checks prevent term substitution; they cannot supply offchain ownership truth.

Direct callers are also responsible for constructing a protocol-valid canonical Data URI. V2 guarantees a successful EVM call for lowercase `data:` input while unpaused, not that arbitrary input becomes the intended canonical artifact.

### Owner

The owner can pause or unpause intake and trading, start a two-step ownership transfer, and propose a new fee recipient. The owner cannot:

- emit an outgoing transfer on behalf of an arbitrary previous owner;
- withdraw a depositor's artifact through contract state;
- take active offer principal;
- take another account's claimable ETH;
- change the fixed 5% fee; or
- renounce ownership and permanently strand pause control.

### Fee recipient

The fee recipient receives only the 5% credits snapshotted into newly created listings and offers. A proposed replacement must accept the role. Existing positions retain their original recipient.

## Defended failure modes

| Threat | Control |
|---|---|
| Fake existing-ID deposit | Depositor-scoped records plus mandatory official-indexer reconciliation |
| False unregistered withdrawal | ESIP-2 enforces the actual previous owner; active registered state blocks the shortcut |
| Canonical creation race | Lower-priority ESIP-6 Finding Receipt preserves an onchain attempt record |
| Data URI parsed as a packed ID | Lowercase `data:` routing has priority even when byte length is divisible by 32 |
| Former owner acts against a later deposit | Deposit generation nonce invalidates stale listings and offers |
| Buyer terms change before mining | Buyer supplies expected listing nonce and exact price |
| Recipient rejects ETH | Pull payments; caller may claim to another recipient |
| Reentrancy during ETH claim | State clears before the guarded external call |
| Pause traps users | Both withdrawal paths, offer cancellation, and claims stay open |
| Fee recipient changes mid-sale | Recipient snapshots into each listing and offer |
| Smart wallets excluded | No `tx.origin` checks |
| Contract insolvency | Locked offers and claimable balances are tracked separately and invariant-tested |
| Upgrade-key compromise | No proxy or implementation upgrade authority exists |
| Unverified deployment receives intake | Every deployment starts paused |

## Known limitations

### Offchain truth remains offchain

`contextHash` is an opaque commitment. V2 neither validates curator approval nor interprets historical claims. The application is responsible for linking only recognized records.

### No funded pre-escrow bidding

Offers require a seller-scoped active deposit and cooldown. Recognized but non-escrowed artifacts may collect only nonbinding interest in the current product.

### Stale offers require bidder action

If an artifact leaves through another position, competing offers become unexecutable against a new deposit generation. Each bidder retains unconditional cancellation and claim rights.

### Forced ETH

Direct ETH transfers are rejected, but ETH can be forced into any EVM contract. Forced ETH is surplus with no admin recovery path and does not enter liabilities.

### Function-selector collision

An existing Ethscription ID whose first four bytes match a callable market selector enters Solidity dispatch instead of the packed-ID fallback. The interface maintains the exact V2 selector set, simulates deposits, and refuses a known collision. Direct Data URI creation is unaffected because its calldata begins with `data:` rather than an Ethscription ID.

### No automated incentive allocation

V2 credits one fee recipient. Proposer, researcher, and validator rewards require treasury policy or a separate auditable distributor. Native per-sale splits require another immutable market version.

### No independent audit yet

Unit, fuzz, invariant, official-parser review, and local integration tests reduce implementation risk but do not replace an independent security review. Mainnet value acceptance remains gated on review and low-value transaction exercises.

## Tested invariants and properties

1. Contract ETH balance equals active-offer principal plus claimable balances in ordinary flows.
2. The sum of active offer amounts equals `lockedOfferTotal`.
3. The sum of known participant credits equals `totalClaimable`.
4. Every active listing references the current active deposit generation.
5. The fee remains exactly 500 basis points.
6. Pausing does not prevent artifact withdrawals, offer cancellations, or ETH claims.
7. A fake depositor cannot consume another depositor's registered state.
8. A withdrawal and redeposit invalidate offers from the previous generation.
9. Data URI routing takes precedence over packed-ID parsing.
10. Every direct attempt emits the exact ordered receipt fallback committed to its canonical content hash.
11. An active registered deposit cannot use the unregistered direct-creation exit.
12. Inherited listing purchase settlement still reconciles seller proceeds, fee credit, and ESIP-2 transfer shape.
