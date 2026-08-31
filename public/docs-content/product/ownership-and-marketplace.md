# Ownership and marketplace

Ethscribe turns an accepted historical Finding into an ownable Accession. The marketplace is the custody and funding layer around the research record—not the source of historical truth.

## What an Accession is

An Accession is an accepted Ethscription preserved with its frozen provenance record. It references:

- the Ethscription ID and decoded-byte identity;
- the accepted Dossier revision;
- the curator decision and rubric version;
- the relevant expedition and target;
- the settlement transaction, when sold; and
- later ownership history.

An Accession does not confer copyright, trademark, authorship, or exclusivity over copies of the underlying file.

## Contract starting point: ittybits

The reference implementation is the verified ittybits marketplace proxy at [`0xa8Ee53258865c55a521727127D8a64c414163D36`](https://etherscan.io/address/0xa8Ee53258865c55a521727127D8a64c414163D36#code). At the time of this plan, Etherscan identifies it as a `TransparentUpgradeableProxy` using implementation [`0x3893F7792A4219Fc5407887d4e6F0831E083C78D`](https://etherscan.io/address/0x3893F7792A4219Fc5407887d4e6F0831E083C78D#code).

Useful patterns to retain:

- ESIP-2 conditional transfers keyed by the claimed previous owner;
- potential-deposit storage keyed by depositor and Ethscription ID;
- a five-block transfer cooldown;
- bulk deposits and withdrawals;
- listings keyed by Ethscription ID and seller;
- funded bids and explicit locked-balance accounting;
- private listings; and
- a maximum 5% marketplace fee.

The contract also makes the protocol's central limitation explicit: Solidity cannot read the Ethscriptions indexer's ownership state. It can record potential deposits, but the interface must reconcile those records against the official indexer before presenting an asset as validly escrowed.

Ethscribe should use the deployed contract as a studied starting point, not copy it unchanged.

## What changes for Ethscribe

### Expedition-agnostic vault

The contract does not need expedition IDs, target IDs, Dossiers, votes, or historical claims. Those relationships remain signed off-chain data.

The contract knows only:

- `ethscriptionId`;
- potential depositor;
- deposit block and custody state;
- listing or bid terms;
- opaque `contextHash` where a sale needs to anchor a curated record; and
- payment and fee recipients.

This lets a wallet deposit an artifact now and assign it to an expedition later without moving it or mutating contract taxonomy.

### Contract wallets remain supported

The ittybits implementation restricts some bid entry to EOAs with `tx.origin == msg.sender`. Ethscribe should avoid that restriction so Safe accounts and modern smart wallets can participate. Reentrancy protection, explicit callbacks, and pull payments address contract-interaction risk without excluding contract wallets categorically.

### Pull payments

Seller proceeds, refunds, and fee allocations should accrue to withdrawable balances before any external call. A recipient that rejects ETH must not block an artifact settlement or another bidder's refund.

### Withdrawals survive a pause

An emergency pause may stop new deposits, listings, bids, and sales. It must not trap ordinary withdrawals or claimable ETH. The escape path is part of the core invariant.

### Frozen sale terms

Global administration must not alter the price, fee, or recipients of an active sale. Each listing or accepted curator authorization commits to its own terms and expiry.

## V1 contract deployment

The public implementation is [`EthscribeMarketV1`](https://github.com/Posvar/ethscribe/tree/main/contracts). It combines a minimal ESIP-2 vault with fixed-price sales and funded escrow-first offers. The immutable contract is [deployed to Ethereum mainnet](../reference/mainnet-deployment.md), source-verified, and custody round-trip tested. It is not independently audited or approved for valuable custody.

### Vault responsibilities

- Record potential single and ESIP-5 bulk deposits.
- Apply a confirmation cooldown.
- Emit ESIP-2 transfers for withdrawal and settlement.
- Cancel attached listings when an item leaves.
- Preserve depositor withdrawal without curator cooperation.
- Expose public state for wallet inventory and indexed event reconciliation.

### Market responsibilities

- Create and cancel fixed-price listings.
- Buy a verified escrow position.
- Place and cancel independently identified funded offers.
- Prevent an expired offer from being accepted while preserving the bidder's cancellation path.
- Use seller-scoped funded bids; the first-party interface enables them only after official-indexer reconciliation confirms escrow.
- Accrue seller proceeds and refunds as pull payments.
- Apply an immutable 5% fee.
- Emit an optional opaque `contextHash` supplied with the market position.

### Responsibilities kept off-chain

- expedition and target assignment;
- raw-byte decoding and matching;
- official owner and previous-owner reconciliation;
- eligibility and Dossier review;
- artifact ranking and presentation;
- proposal queues; and
- historical corrections.

## Implemented storage model

The candidate uses the following semantic model:

```text
PotentialDeposit
  receivedBlock
  depositGenerationNonce
  active

Listing
  price
  depositGenerationNonce
  listingNonce
  onlyBuyer
  expiry
  feeRecipient
  contextHash

Offer
  offerId
  bidder
  seller
  ethscriptionId
  amount
  depositGenerationNonce
  expiry
  feeRecipient
  contextHash
  state

claimable[address]
lockedBidTotal
```

Potential deposits remain keyed by `(depositor, ethscriptionId)` because several addresses can send identical calldata while only one may have made the valid protocol transfer. The indexer decides which transfer is real; ESIP-2 makes invalid outgoing claims ineffective at the protocol layer.

## Deposit and withdrawal

An existing owner transfers one or more Ethscription IDs to the contract. The fallback records each ID against `msg.sender` and starts the cooldown. The site separately verifies:

1. the Ethscription exists;
2. `current_owner` is the market contract;
3. `previous_owner` is the recorded depositor; and
4. the cooldown has elapsed.

Only then does the interface show `Escrow verified`.

A withdrawal emits:

```solidity
ethscriptions_protocol_TransferEthscriptionForPreviousOwner(
  depositor,
  recipient,
  ethscriptionId
)
```

Withdrawing cancels the depositor's listing. Existing funded offers become unexecutable against that deposit generation, but each bidder retains an unconditional cancellation and claim path. A withdrawal never deletes another wallet's offer or credit.

## Creating through the site

The safest first implementation guides the user through two transactions:

1. create the Ethscription to the user's wallet; and
2. transfer its resulting transaction-hash ID to the vault.

This produces the same final escrow state as depositing an existing Ethscription and avoids pretending that a contract can read the hash of the transaction currently executing.

A later direct-to-vault creation path is possible, but it requires careful fallback handling and a follow-up registration because the EVM cannot access its own Ethereum transaction hash. It is not necessary for the first contract.

## Fixed-price settlement

```text
verified escrow
  -> seller creates listing
  -> buyer supplies exact listing terms and ETH
  -> listing is invalidated
  -> seller and fee balances accrue
  -> ESIP-2 transfer event sends artifact to buyer
  -> settlement event anchors contextHash
```

Checks-effects-interactions ordering and pull payments prevent external recipients from interrupting the state transition.

## V1 bidding: escrow first

The first-party V1 interface accepts a funded bid only after the official API confirms that the marketplace contract is the Ethscription's `current_owner` and the recorded seller is its `previous_owner`. The contract cannot perform that API check; every bid therefore names the seller and Ethscription ID explicitly, and direct callers are responsible for the same verification. This follows the useful boundary in ittybits and keeps every financial settlement inside one understandable state machine:

```text
owner deposits
  -> official API confirms escrow
  -> bidder funds an offer
  -> seller accepts or bidder withdraws
  -> payment accrues and artifact transfers
```

A recognized artifact that is not escrowed may still show a nonbinding **Register interest** action. That can collect a wallet signature or notification preference off-chain, but it does not lock ETH, advertise an executable bid, or imply that the current owner has agreed to sell.

### Why funded pre-escrow bids are deferred

Storing a bid against any known `ethscriptionId` is easy. Settling it safely is not. Solidity cannot query current Ethscriptions ownership. A former owner can submit convincing-looking deposit calldata after transferring the real artifact away; the protocol indexer would ignore the invalid outgoing transfer, but an incautious contract could already have released the buyer's ETH.

A buyer-finalized, two-phase flow can avoid that theft: the owner deposits, the app confirms custody through the official API, and the bidder later finalizes. It is technically viable, but it adds acceptance windows, cancellation rules, stale-owner handling, bidder liveness, and additional reconciliation states. That is too much surface area for the first marketplace release.

### Does this require a separate indexer?

No separately operated marketplace indexer is required for the escrow-first V1. The app can read contract events and query the official Ethscriptions API before displaying `Escrow verified`. It must handle API delay or downtime conservatively, but it does not need to reconstruct the full protocol itself.

The future wrapper-independent raw-byte index is a different concern. Ethscribe eventually needs that archaeology index to determine the earliest decoded-byte match across MIME types and Data URI wrappers. Pre-escrow bidding neither creates nor removes that requirement.

A later release can revisit funded pre-escrow bids if demonstrated demand justifies the extra state machine. An ownership attestation or buyer-finalized settlement must be explicit before that design handles value.

## Linking a sale to an Accession record

Generic deposits and trades need no curator. A sale that becomes an official Accession should carry an opaque authorization commitment such as:

```text
contextHash = keccak256(
  expeditionId,
  targetId,
  ethscriptionId,
  rawSha256,
  dossierHash,
  curatorDecisionHash,
  feeTermsHash
)
```

V1 does not verify a curator signature or finalized root. It stores and emits the opaque `contextHash` supplied by the listing or offer creator. The first-party application decides whether that hash corresponds to a recognized, signed Accession record and must never imply that arbitrary contract calldata received curatorial approval.

Native curator authorization can be considered in a later market version after the signed-research format is proven in public.

## Fee and incentive boundary

Every V1 settlement allocates 95% to the seller and 5% to the fee recipient snapshotted when the listing or offer was created. The fee itself and its denominator are immutable.

The solo-operated beta can begin with a dedicated treasury EOA. Later, the owner can propose a Safe or separate reward distributor and that recipient must accept the role. This lets future activity fund proposers, researchers, validators, and operations without placing custody under upgrade authority. Active positions keep their original recipient.

If exact per-sale recipient splits must execute inside settlement, that is a `MarketV2` change rather than a mutable V1 parameter.

## Immutability, administration, and migration

The ittybits address is an upgradeable proxy. Ethscribe's candidate intentionally chooses a different boundary: immutable custody with explicit version migration.

The candidate adopts:

- an immutable, non-proxy vault and market;
- a dedicated owner EOA for the solo beta, with an optional later move to a Safe;
- two-step ownership and fee-recipient changes;
- withdrawals available during pause;
- an immutable 5% fee; and
- no admin function capable of transferring arbitrary deposits or bidder funds.

Product evolution is versioned rather than performed behind a proxy. If settlement rules change, V1 can stop accepting new activity while its exits remain open, and users can voluntarily move to a separately deployed V2. Revenue-distribution changes generally require only a new fee recipient, not a new custody contract.

Every deployment begins paused. Publishing and verifying the address therefore does not open deposits or trading; unpause is a separate owner action after the first-party integration is ready.

## Contract invariants

1. A potential depositor can never transfer another depositor's valid artifact through contract state alone.
2. Pausing cannot trap an ordinary withdrawal or claimable ETH.
3. `address(this).balance` always covers locked offers plus claimable balances.
4. Each offer can be accepted, cancelled, or active—never more than one.
5. A listing or offer expiry cannot be extended without the funder's authorization.
6. Settlement clears market state before accruing payment and emitting transfer.
7. Fee basis points remain exactly 500.
8. Curator authority cannot move artifacts or funds.
9. An offer names its intended seller and Ethscription ID explicitly; the contract never substitutes an ownership claim for the bidder.
10. Invalid potential deposits never appear as verified inventory in the first-party interface.

## Test and release status

Implemented tests cover deposits, withdrawals, listings, offers, expiry, refunds, fees, fake depositors, smart wallets, reverting recipients, pause exits, deposit-generation replay, ESIP-2 event shape, and the five-block cooldown. Stateful invariants exercise randomized market sequences and reconcile every ordinary-flow wei against locked offers and claimable balances.

Still required before mainnet value is accepted:

- an independent security review;
- the controlled low-value mainnet custody round trip;
- transaction slices and tests for listings, purchases, offers, cancellation, and claims;
- low-value end-to-end settlement checks; and
- a separate, explicitly reviewed unpause transaction.

## Delivery sequence

1. Keep the verified mainnet deployment paused and the interface transaction gate closed by default.
2. Complete the independently rehearsed Deposit → Verify → Withdraw interface slice.
3. Obtain an independent review and resolve findings.
4. Review and submit a separate short-window unpause for the [controlled custody pilot](../reference/custody-pilot.md).
5. Re-pause, complete the withdrawal, and close the interface gate.
6. Add and rehearse low-value settlement controls before beta activity.
7. Route future fees to a separate rewards layer only after contribution rules are proven.
8. Reconsider funded pre-escrow bids or native per-sale splits only after real demand.

The contract is live on mainnet. Following the first successful custody pilot, the owner deliberately left it unpaused with the pilot interface enabled. This state is not approval for valuable custody or trading; the live wallet status is authoritative.
