# Economics and flywheel

The product loop is designed to fund the next act of discovery without requiring a native token.

```text
Good expedition idea
  -> public hunt
  -> useful research and an accepted artifact
  -> collector auction
  -> fee funds operations and future fieldwork
  -> next prepared expedition opens
```

The loop only works if the research is worth returning for even when no trade occurs.

## V1 market fee

The immutable marketplace candidate uses one visible 5% fee. On every settlement, 95% becomes claimable by the seller and 5% becomes claimable by the fee recipient frozen into that listing or offer.

At launch, the fee recipient should be an Ethscribe Safe. The following remains a conceptual treasury allocation rather than a split enforced by `EthscribeMarketV1`:

| Recipient | Share of sale |
|---|---:|
| Seller | 95.0% |
| Ethscribe operations | 3.0% |
| Next-expedition pool | 1.0% |
| Expedition proposal author | 0.5% |
| Research/community reserve | 0.5% |

These internal percentages are proposed policy, not V1 settlement parameters. Once participation is understood, a separate public rewards distributor can receive fees from newly created market positions and make allocations auditable. Exact per-sale native splits would require a later market version.

## Incentives by role

### Hunter

A hunter can receive sale proceeds for submitting the winning artifact. The opportunity is strongest when the bytes are historically meaningful, scarce within the protocol, and supported by excellent research.

### Researcher

Researchers gain a signed public contribution record. The community reserve may later reward valuable evidence and challenges, but V1 does not invent a scoring formula before real behavior exists.

### Cartographer

The author of a selected expedition proposal can receive a defined share of that expedition's eventual primary sale. This rewards good briefs, bounded targets, and source preparation—not merely catchy topics.

### Patron

A patron acquires the recognized Ethscription and helps finance preservation. The purchase is ownership of the protocol artifact and its place in Ethscribe's collection, subject to the rights limitations described elsewhere.

### Ethscribe

The operations share supports indexing, storage, research tooling, curation, contract maintenance, and presentation.

## Why no token in V1

A token would create immediate speculation, sybil incentives, regulatory and operational burden, and pressure to treat token weight as expertise. None of those solves the launch problem: producing credible expeditions and high-quality evidence.

Wallet-signed contribution history can be measured first. Nontransferable reputation or bonded roles can be introduced later if a specific abuse or allocation problem justifies them.

## Starting the loop

Automation still needs initial inventory. The founder should prepare a queue of several well-researched expeditions before the first live auction. Each queued expedition includes a tested rubric, source pack, curator commitment, and timing parameters.

A settlement event can then trigger application automation to activate the next prepared entry. Community proposals replenish the queue, while curation prevents it from becoming an unbounded upload feed.

## Economic health metrics

Gross volume alone is insufficient. Useful signals include:

- credible Findings from independent hunters;
- researchers adding evidence to someone else's work;
- return participation across expeditions;
- unrelated bidders with real net exposure;
- usable community-authored proposals entering the queue;
- curator time per Finding;
- disputes resolved through the published rubric; and
- operating cost covered by repeat, non-self-funded sales.

Contract work is warranted only when participation and collector interest make settlement a real missing capability.
