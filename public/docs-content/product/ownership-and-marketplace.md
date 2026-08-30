# Ownership and marketplace

Ethscribe turns an accepted historical Finding into an ownable Accession. The market is a funding and custody layer around the research record—not the source of historical truth.

## What an Accession is

An Accession is the eligible Finding selected by an expedition's auction and preserved with its frozen provenance record. It includes references to:

- the winning Ethscription;
- the decoded-byte identity;
- the accepted Dossier revision;
- the curator decision;
- the expedition and rubric versions;
- the settlement transaction; and
- later ownership history.

An Accession does not confer copyright, trademark, authorship, or exclusivity over copies of the underlying file.

## Site-first boundary

The first release builds the mission, expedition, timeline, evidence, and wallet experience before accepting custody or bids. Transaction-dependent controls are labeled as upcoming until a reviewed contract is deployed.

This order lets real research behavior inform the contract instead of encoding speculative workflows permanently.

## Proposed HuntHouse contract

The later marketplace contract has a deliberately narrow role:

- register an expedition and immutable timing parameters;
- accept eligible Ethscription deposits;
- guarantee defined withdrawal paths;
- accept a curator-signed eligibility root;
- accept binding bids on eligible Findings;
- refund losing bids;
- settle payment and artifact transfer atomically;
- route a fixed 5% fee; and
- activate the next prepared expedition.

Research text, sources, comments, rankings, and presentation remain off-chain and wallet-signed.

## Proposed auction flow

```text
Hunter deposits artifact
  -> curator finalizes eligible set
  -> bidding opens
  -> highest valid bid wins
  -> 95% routes to seller
  -> 5% routes by the frozen fee split
  -> artifact transfers to patron
  -> accession record is indexed
```

The exact auction format, reserve rules, bid extension, and cancellation policy must be specified and tested before contract deployment. The interface must show the actual contract state, not an application database's approximation.

## Safety invariants

The contract design should prioritize:

1. A depositor can recover an artifact when no valid settlement is possible.
2. Losing bidders can recover funds without curator cooperation.
3. Settlement cannot transfer an artifact without the corresponding payment.
4. The active fee split and eligibility commitment cannot change mid-auction.
5. No privileged address can seize arbitrary deposits or bids.
6. Reentrancy, replay, signature-domain, and denial-of-service cases are tested.
7. Emergency controls are narrow, visible, and time-bounded.

Independent review and conservative value limits are required before meaningful assets are accepted.

## Primary and secondary trading

V1 focuses on the primary accession auction because it closes the expedition loop and funds future work. A secondary marketplace is a later feature. Until it exists, ownership can still move through the underlying Ethscriptions protocol, but external transfers need to be indexed so the Accession page reflects the current owner.

No perpetual royalty should be promised unless it can be enforced transparently without restricting ordinary custody.

## Market signals have limits

Headline bid volume can be manipulated through self-bidding or related wallets. Ethscribe may report unique bidders, funding relationships visible on-chain, and net economic exposure, but it must not present price as authentication or independent demand.
