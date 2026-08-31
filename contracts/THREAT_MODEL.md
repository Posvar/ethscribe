# EthscribeMarketV1 threat model

This document records the security boundary of the pre-deployment `EthscribeMarketV1` candidate. It is not an audit report.

## Assets at risk

- Ethscriptions interpreted by the protocol as owned by the market contract;
- ETH locked in active offers;
- seller proceeds, refunded offers, and protocol fees held as claimable balances; and
- user confidence in the provenance context presented by the first-party application.

## Trust assumptions

### Ethscriptions indexer

The contract cannot determine whether fallback calldata accompanied a valid Ethscription transfer. Any address can create a potential record for any ID under its own depositor key.

The first-party application must fail closed unless the official API confirms the deployed market as `current_owner` and the potential depositor as `previous_owner`. A forged record may exist onchain, but the application must never label it `Escrow verified`, list it as inventory, or invite a funded offer.

### Direct callers

The contract cannot protect a buyer who deliberately bypasses reconciliation and buys from a forged depositor record. Exact seller, Ethscription ID, listing nonce, and price checks prevent term substitution; they cannot supply offchain ownership truth.

### Owner

The owner can pause or unpause entry and trading, start a two-step ownership transfer, and propose a new fee recipient. The owner cannot:

- emit an outgoing transfer on behalf of an arbitrary depositor;
- withdraw a depositor's artifact;
- take active offer principal;
- take another account's claimable ETH;
- change the fixed 5% fee; or
- renounce ownership and permanently strand the pause control.

For the solo-operated beta, the owner may be a dedicated, securely backed EOA. The authority can later move to a Safe through the inherited two-step ownership transfer without redeploying the market.

### Fee recipient

The fee recipient receives only the 5% credits frozen into newly created listings and offers. A proposed replacement must accept the role. Existing positions retain their original recipient. A solo treasury EOA can be replaced later by a Safe or reward distributor.

## Defended failure modes

| Threat | Control |
|---|---|
| Fake deposit claim | Records are depositor-scoped; first-party API reconciliation is mandatory |
| Former owner withdraws a later deposit | Deposit generation nonce invalidates stale listings and offers |
| Buyer terms change before mining | Buyer supplies expected listing nonce and exact price |
| Recipient rejects ETH | Pull payments; caller may claim to another recipient |
| Reentrancy during ETH claim | State cleared before the guarded external call |
| Pause traps users | Withdrawals, listing cancellation, offer cancellation, and claims stay open |
| Fee recipient changes mid-sale | Recipient snapshots into each listing and offer |
| Smart wallets excluded | No `tx.origin` checks |
| Contract insolvency | Locked offers and claimable balances are tracked separately and invariant-tested |
| Upgrade-key compromise | No proxy or implementation upgrade authority exists |
| Unverified deployment receives deposits | Every deployment starts paused |

## Known limitations

### Offchain truth remains offchain

`contextHash` is an opaque commitment supplied by the listing or offer creator. V1 neither validates a curator signature nor interprets historical claims. The public application is responsible for linking only recognized context records.

### No funded pre-escrow bidding

Offers can be funded only after a seller-scoped potential deposit exists and the cooldown has elapsed. The first-party interface adds official API verification. Recognized but non-escrowed artifacts may collect nonbinding interest offchain.

### Stale offers require bidder action

If an artifact is withdrawn or sold through another position, other active offers cannot settle against a new deposit generation. Their bidders can cancel at any time and claim the full amount. V1 does not enumerate and automatically cancel every competing offer.

### Forced ETH

Direct ETH transfers are rejected, but ETH can be forced into any EVM contract. Forced ETH is reported as surplus and has no admin recovery path. It does not enter liabilities or affect user balances.

### Function-selector collision

Ethscription transfers use raw 32-byte calldata. In the extremely unlikely event that an ID's first four bytes collide with a callable market selector, Solidity dispatch may select that function instead of the deposit fallback. The interface must simulate deposits and surface a failure rather than claiming custody registration succeeded.

### No automated incentive allocation

V1 credits one fixed fee recipient. Proposer, researcher, and validator rewards can be paid from a Safe or a separate auditable reward distributor. Exact per-sale onchain splits require a later market version.

### No independent audit yet

Unit, fuzz, invariant, and local integration tests reduce implementation risk but do not replace an independent security review. Mainnet value acceptance remains gated on review and indexer integration.

## Tested invariants

1. Contract ETH balance equals active-offer principal plus claimable balances in all ordinary flows.
2. The sum of active offer amounts equals `lockedOfferTotal`.
3. The sum of known participant credits equals `totalClaimable`.
4. Every active listing references the current active deposit generation.
5. The protocol fee remains exactly 500 basis points.
6. Pausing does not prevent artifact withdrawals, offer cancellations, or ETH claims.
7. A fake depositor cannot consume another depositor's record.
8. A withdrawal and redeposit invalidate offers from the previous deposit generation.
