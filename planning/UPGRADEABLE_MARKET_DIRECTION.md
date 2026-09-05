# Next vault: adjustable creation fees and upgradeability

**Superseded / not active:** the owner subsequently chose to retain the current immutable custody/marketplace and its 5% sales fee. Do not implement or deploy this proposal, and do not migrate assets on its basis. Retained as historical design research only.

Status: local design only, 4 September 2026. The owner has proposed a new upgradeable contract and can withdraw/redeposit the two Satoshi Ethscriptions currently in custody. No replacement has been implemented or deployed; no assets, listings, fees, or production settings have changed.

## Product direction

Build a replacement market capable of charging an optional creation fee per expedition, adjustable as the collection's size or demand changes. Some hunts can remain free. This charges for using Ethscribe's intake service, not exclusive permission to create an Ethscription: independent protocol creation remains possible.

Adjustable prices are ordinary contract settings; they do not themselves require upgradeability. The proposed upgrade mechanism is a separate, much broader power to evolve custody and settlement code. That power must be disclosed to depositors. The old vault is immutable and cannot be converted into a proxy in place.

## Proposed minimum design

- One stable proxy address for the new market, using a reviewed OpenZeppelin ERC-1967/UUPS implementation pattern. Do not put the existing constructor-based V2 behind a proxy unchanged.
- Explicit initialization, initialized parent modules, a locked implementation contract, and upgrade/storage-layout validation. Define initialization of counters and accounting instead of relying on constructor-time field values.
- A per-expedition creation fee in wei, including zero, with public change events and displayed gas costs separately. Show USD as an estimate rather than introducing a mandatory dollar-price oracle.
- Preserve a top-level canonical Data URI transaction into the new proxy for direct creation. Delegation executes at that address; the researcher remains the protocol creator. Test this with protocol-compatible indexing before launch.
- Existing-Ethscription deposits do not pay a creation fee. Withdrawals do not pay a platform exit fee; Ethereum gas still applies. Keep single and batch withdrawals, including unregistered direct creations.
- Treat trading fees separately. A creation-fee-only launch would set the new trading fee to zero; changing the old market's fixed 5% is impossible. If trading fees can change later, bind the disclosed rate and recipient to each listing/offer so existing agreements are not repriced silently.
- Do not charge for an expedition assignment signature. Association with the site's historical record remains offchain and keyed by Ethscription ID.

## Per-hunt fees need authenticated membership

The website's selected expedition is not an onchain fact. A caller-supplied cheap collection ID must not determine the price of an expensive collection's payload.

For known-byte targets, the smallest candidate design is a registry mapping the SHA-256 of each complete canonical Data URI to an authorized expedition, with the fee looked up from that expedition. Compute the hash from `msg.data` inside the fallback. An absent mapping is not the same as a deliberately free hunt; reject unregistered creation payloads in this path. Use a unique assignment for a canonical payload rather than letting it enter through whichever hunt is cheapest.

This registry concerns the protocol payload; the site's independent decoded-file SHA-256 still identifies alternate-wrapper matches. Do not append a collection ID, quote, or signature to the Data URI: that changes the payload being Ethscribed. Registration and ongoing configuration also cost gas, which matters for a $1 service.

**Security gate: prevent the free deposit branch becoming a paid-creation bypass.** The protocol strips NUL bytes when interpreting calldata and also recognizes gzipped creation input. Merely checking whether raw input begins with `data:` is insufficient: `da\0ta:...` padded to a multiple of 32 bytes could resemble packed transfer IDs to the contract while being recognized as creation by the indexer. Validate/reject noncanonical creation forms consistently across *all* fallback branches, including the free existing-ID transfer path. Test NUL insertion/padding, invalid UTF-8, gzip, and malformed content against the official parser; a raw SHA-256 membership lookup alone does not close this boundary. Do not claim this is solved before implementing and testing the classification. [Official protocol parsing rules](https://docs.ethscriptions.com/overview/protocol-specification.md).

This mechanism does **not** automatically support the lost-byte case: a payload whose bytes are unknown cannot already have a reference hash in the registry. Keep unknown-byte recovery out of the first paid-intake design until an explicit authorization flow is selected. Signed method calls or event-based creation are alternatives with different attribution and workflow tradeoffs, not a transparent drop-in fix.

Price updates must not silently charge more than the submitted transaction value. Define stale-quote behavior before implementation: either honor a bounded previous-price window or reject a mismatched value, disclosing that a mined reverted transaction still costs gas. A UI refresh alone does not eliminate this race.

## Upgrade authority and exits

Use a separate upgrade authority with a proposed 48-hour public timelock. Routine fee administration should not require a code upgrade. Retain emergency intake/trading pause, but not an ordinary admin pause on withdrawals or already-credited balances. A hardware-backed solo admin is possible; this proposal does not require a Safe.

Keep upgrade scheduling, cancellation, execution, and fee-setting roles explicit. An immediate admin bypass would defeat the delay. A notice period reduces risk; it does not make an upgradeable vault trustless. After execution, replacement logic can change withdrawal behavior or economic limits, so limits in replaceable logic are not immutable guarantees. Test access control and the timelock itself, including attempts to replace the authority or shorten the delay.

## Migration of the two existing artifacts

1. Finish contract tests and review, then request explicit deployment approval. Keep the current vault usable meanwhile.
2. Inventory the two Ethscription IDs and their current custody, listings, offers, and claimable balances. Do not guess which IDs the user intends to move.
3. Cancel/resolve affected sale positions as appropriate, then let the owner withdraw to their wallet using the current vault. Do not withdraw directly into the new vault: its protocol previous owner would be the old contract, not the researcher. Registered and unregistered custody use different withdrawal paths; batch only compatible records together. Registered withdrawal cancels that deposit's listing, but existing credits and offers remain obligations of the old contract and do not move with an artifact.
4. Verify the protocol index recognizes wallet ownership, then deposit the same IDs into the new vault. Do **not** create new Ethscriptions or alter their wrappers.
5. Preserve expedition/target associations by ID, reconcile new custody, and explicitly recreate desired listings. Existing Finding signatures bind `custodyContract`; keep the original signed evidence intact rather than rewriting its signed fields. Reconcile present custody separately and collect a new authorization if a new signed action is needed. Withdrawals/deposits do not migrate listing terms automatically.
6. Switch the site's intake only after a real owner-approved deposit/verify/withdraw test. Keep old-vault withdrawal and credit-claim access available for remaining obligations.

## Unresolved paid-creation risk

A new proxy cannot fix protocol-level duplicate races. Someone else may create the payload first; the paid transaction may succeed without winning the intended artifact. The receipt is evidence of an attempt, not delivery of the historical original. Decide a service-fee refund policy before charging. Gas cannot be recovered, and automatic protocol-dependent refunds require an explicit offchain trust/verification mechanism. See [the fee exploration](CREATION_FEES_EXPLORATION.md).

If paid-creation funds remain refundable pending verification, account for them as a separate reserved liability until released. The contract balance also holds seller credits and locked bids: those funds must never finance a creation refund or be treated as withdrawable fee revenue. An operator-funded refund policy is a different, explicitly disclosed commitment, not contract-enforced protection.

## Implementation/release gates

Port and extend the existing vault tests for initializer safety, upgrade authorization, storage preservation, custody reconciliation, batch exits, paused exits, listing/offer accounting, zero/nonzero fees, incorrect hunt membership, alternate wrappers, stale prices, duplicate races, and migration across both contracts. Keep local prototypes separate from deployed V1/V2 sources. A successful EVM transaction alone is never evidence that the protocol accepted the intended artifact.

Primary implementation references: [OpenZeppelin proxy patterns](https://docs.openzeppelin.com/contracts/5.x/api/proxy), [writing upgradeable contracts](https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable), and [access control/timelocks](https://docs.openzeppelin.com/contracts/5.x/access-control). These describe mechanisms, not an audit of this proposed design.
