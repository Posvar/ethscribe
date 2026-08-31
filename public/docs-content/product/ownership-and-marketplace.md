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

## Proposed V1 contract boundary

The working name is `EthscribeMarketV1`. It combines a minimal ESIP-2 vault with fixed-price sales, funded offers, and curated-sale authorization.

### Vault responsibilities

- Record potential single and ESIP-5 bulk deposits.
- Apply a confirmation cooldown.
- Emit ESIP-2 transfers for withdrawal and settlement.
- Cancel attached listings when an item leaves.
- Preserve depositor withdrawal without curator cooperation.
- Expose batch reads for wallet inventory.

### Market responsibilities

- Create and cancel fixed-price listings.
- Buy a verified escrow position.
- Place, replace, expire, and withdraw funded bids.
- Support bids placed before escrow under the safe two-phase model below.
- Accrue seller proceeds and refunds as pull payments.
- Apply a fee no greater than 5%.
- Commit an optional curated-sale `contextHash`.

### Responsibilities kept off-chain

- expedition and target assignment;
- raw-byte decoding and matching;
- official owner and previous-owner reconciliation;
- eligibility and Dossier review;
- artifact ranking and presentation;
- proposal queues; and
- historical corrections.

## Proposed storage model

The exact packing can change during implementation, but the semantic model is:

```text
PotentialDeposit
  depositor
  ethscriptionId
  receivedBlock
  state

Listing
  seller
  ethscriptionId
  price
  onlyBuyer
  expiry
  contextHash

Bid
  bidId
  bidder
  ethscriptionId
  targetOwner
  amount
  expiry
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

Withdrawing cancels the depositor's listing and releases market locks under explicit rules. It never deletes another seller's or bidder's unrelated position.

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

## Bidding on an artifact before escrow

It is technically possible to hold a bid against a known `ethscriptionId` before the contract owns it. The ittybits implementation does **not** currently do this: its `_enterBidForIttybit` rejects the bid unless its potential-deposit mapping already contains the targeted seller and ID.

The difficulty is settlement, not bid storage. Ethereum contracts cannot query who currently owns an Ethscription. If a contract paid whenever the targeted address merely submitted the ID as calldata, a former owner could fake a deposit after transferring the real artifact away. The outgoing ESIP-2 event would be ignored by indexers, but the ETH payment would already have occurred inside the EVM.

### Recommended V1: buyer-finalized standing bid

Ethscribe can safely support the desired experience with two-phase completion:

1. A bidder funds a standing bid for `(ethscriptionId, targetOwner, expiry)`.
2. The bid appears on the recognized artifact page even though the asset is not escrowed.
3. The target owner signals acceptance and transfers the Ethscription to the vault.
4. The site waits for indexer confirmation that the contract is current owner and the target owner is previous owner.
5. After the cooldown, the bidder finalizes settlement.
6. The contract accrues payment and emits the ESIP-2 transfer to the bidder.

The seller cannot unilaterally release the bid funds. The bidder's final transaction is the onchain confirmation that the verified deposit exists. If the bidder does not finalize before the acceptance window expires, the seller can withdraw the artifact and the bidder can recover the ETH.

This adds one interaction but requires no ownership oracle and prevents a stale owner from stealing a standing bid.

### Later alternative: attested automatic settlement

A trusted indexer signer or decentralized oracle could attest that the contract owns the asset and identify its valid previous owner. Anyone could then finalize using that EIP-712 attestation. This gives the seller the one-sided “deposit and accept” experience, but it moves a trust assumption into financial settlement and is therefore deferred.

### Open bids without a target owner

An open artifact bid can target only `ethscriptionId`, allowing whichever verified owner escrows it to respond. It uses the same buyer-finalized flow. The interface must distinguish:

- **Owner-targeted bid** — intended for the currently indexed owner;
- **Open artifact bid** — intended for any future verified depositor; and
- **Escrow bid** — the artifact is already verified in the vault.

Every bid has an expiry and immediate bidder withdrawal while it is not in an accepted settlement window.

## Curated Accession sales

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

The contract does not interpret the historical fields. It verifies a curator authorization or finalized root, freezes the associated fee terms, and emits the commitment at settlement. The public Dossier explains the bytes behind the hash.

## Fee model

The initial ceiling remains 5%. A generic secondary trade can route a simple protocol fee. A curated primary Accession sale may use the documented split:

| Recipient | Share of sale |
|---|---:|
| Seller | 95.0% |
| Ethscribe operations | 3.0% |
| Next-expedition pool | 1.0% |
| Expedition proposal author | 0.5% |
| Research/community reserve | 0.5% |

Recipients and basis points are committed when the curated sale opens. No admin can rewrite them after a bid is funded.

## Upgrade and administration recommendation

The ittybits address is an upgradeable proxy. Ethscribe should decide this boundary explicitly instead of inheriting it accidentally.

The preferred V1 posture is:

- an immutable or minimally upgradeable vault core;
- a Safe for bounded configuration and emergency pause;
- a delay on fee or implementation changes;
- withdrawals available during pause;
- a hard 5% fee ceiling; and
- no admin function capable of transferring arbitrary deposits or bidder funds.

If a proxy is retained, its admin, implementation, delay, and upgrade history must be visible in the interface.

## Contract invariants

1. A potential depositor can never transfer another depositor's valid artifact through contract state alone.
2. Pausing cannot trap an ordinary withdrawal or claimable ETH.
3. `address(this).balance` always covers locked bids plus claimable balances.
4. Each bid can be settled, refunded, or active—never more than one.
5. A listing or bid expiry cannot be extended without the funder's authorization.
6. Settlement clears market state before accruing payment and emitting transfer.
7. Fee basis points never exceed the immutable ceiling.
8. Curator authority cannot move artifacts or funds.
9. A pre-escrow seller cannot release bid funds without bidder finalization or a separately disclosed ownership attestation.
10. Invalid potential deposits never appear as verified inventory in the first-party interface.

## Test plan before deployment

- Unit tests for every deposit, withdrawal, listing, bid, expiry, refund, and fee path.
- Fuzz tests for balance conservation and state exclusivity.
- Invariant tests across batch operations and replacement bids.
- Adversarial tests with fake deposits from many claimed owners.
- Former-owner attacks against pre-escrow bids.
- Reentrancy and reverting-recipient tests.
- Pause, expiry, and emergency-withdrawal tests.
- ESIP-2 event-order and five-block cooldown integration tests.
- Indexer reconciliation tests using a local fork or official indexer fixture.
- Independent review before mainnet value is accepted.

## Delivery sequence

1. Freeze functional requirements and exact bid state machine.
2. Build an executable Foundry specification around the invariants.
3. Implement the ESIP-2 vault and wallet inventory first.
4. Add fixed-price listings and escrow-only bids.
5. Add buyer-finalized pre-escrow standing bids.
6. Integrate signed `contextHash` authorizations for Accessions.
7. Run fork tests against the ittybits behavioral reference.
8. Obtain independent review and deploy with conservative limits.

The contract is ready for implementation only after the pre-escrow state transitions, expiry behavior, fee authorization, and upgrade posture are frozen in tests.
