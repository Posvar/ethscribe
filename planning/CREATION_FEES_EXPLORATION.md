# Optional creation fees — design exploration

**Deferred:** the owner subsequently chose to keep the existing infrastructure and 5% marketplace sales fee. No new creation-fee contract or asset migration is part of the current plan. The options below are retained for reference only.

Status: local planning only. No contract, fee, environment setting, public documentation, or deployed site has been changed. Reviewed 4 September 2026.

Latest direction: the owner subsequently proposed an upgradeable replacement with adjustable per-hunt creation fees and confirmed that the two existing Satoshi artifacts can be withdrawn/redeposited. [Next-vault design](UPGRADEABLE_MARKET_DIRECTION.md) records that proposal and the gates before implementation/deployment. Configurable fees and authority to replace contract logic are separate design choices; the analysis below remains the comparison of alternatives.

## Short answer

The current marketplace is **not upgradeable**. A paid creation service is possible, but adding its fee to today's creation transaction is not a configuration change. Preserve the current vault and its exits; validate the business case before choosing a separately deployed creation service or a replacement intake vault.

For the business model, a creation fee is more directly attributable than hoping for secondary sales. However, one-time fees on a deliberately finite collection produce finite revenue. The value users would pay for is the research, trusted catalogue, preflight, and convenient transaction flow—not exclusive permission to Ethscribe.

## What is deployed today

Current Ethereum mainnet market: [`0x65a6771a4f82bcc1fad26CC944cA673dDE2c4614`](https://etherscan.io/address/0x65a6771a4f82bcc1fad26CC944cA673dDE2c4614).

Evidence in this repository:

- [EthscribeMarketV2.sol](../contracts/src/EthscribeMarketV2.sol) inherits ordinary V1 contracts, not a proxy, and exposes no implementation upgrade mechanism.
- Its direct-creation/deposit fallback rejects every nonzero `msg.value` with `UnexpectedEther`. Sending a $1-equivalent ETH payment to that path would revert.
- [EthscribeMarketV1.sol](../contracts/src/EthscribeMarketV1.sol) fixes `FEE_BPS = 500`: the 5% settlement fee cannot be switched off or replaced by a creation fee. Changing the fee recipient changes who receives fees, not the rate or custody logic.
- The owner can pause intake/trading, transfer ownership in two steps, and propose a replacement fee recipient. These are administration controls, not upgradeability.

A read-only public mainnet `eth_getCode` check returned 14,497 runtime bytes with hash `0x26ea3f0b035afc64c065097307bf438cde1f9c9ec4c41bb906b805d1958b2ad3`, matching [the deployment record](../contracts/deployments/mainnet-v2.json). The historical Sourcify metadata URL returned 404 during this check; this note does not claim a new independent source-verification result.

Consequently, an optional creation fee would be **additional** to the present 5% market fee if that artifact later sells in this market. Replacing the market's percentage requires a new settlement contract, not just a new creation contract.

## Why a transparent “fee router” is not enough

The current user-created flow places the Data URI in the **top-level Ethereum transaction input**. Protocol creator is the transaction sender and initial owner is its recipient. Sending that transaction to a fee router makes the router the initial owner; forwarding the same bytes through an internal EVM call does not reproduce the original transaction-to-vault relationship. These conclusions follow from the protocol's input and ownership rules. [Protocol specification](https://docs.ethscriptions.com/overview/protocol-specification.md).

Alternatively, ESIP-3 permits a contract to emit a creation event with the researcher as initial owner. The **emitting contract**, not the paying researcher, is then the protocol creator. Only one Ethscription can be created per Ethereum transaction; valid top-level input takes priority over events. [ESIP-3](https://docs.ethscriptions.com/esips/accepted-esips/esip-3-smart-contract-ethscription-creations.md).

Do not make that ESIP-3 event's initial owner the existing market and assume the user can withdraw: the creator contract is then the protocol previous owner, while the current market's conditional exit is bound to the caller as previous owner. A later user-owned transfer into the market establishes the correct user previous-owner relationship. [ESIP-2 escrow rules](https://docs.ethscriptions.com/esips/accepted-esips/esip-2-safe-trustless-smart-contract-ethscription-escrow.md).

## Practical architecture choices

These are proposed designs, not implemented features or audited guarantees.

| Choice | Researcher experience | Main tradeoff |
| --- | --- | --- |
| Separate paid ESIP-3 creator; keep existing market | Pay and create into their wallet; after verification, deposit into the existing market | Least disruption to custody. Creation contract is protocol creator; market deposit is a separate transaction. |
| Separate paid raw-input receiver | Pay and create into the receiver with the researcher still protocol creator; withdraw, then deposit into the market | Preserves creator attribution but adds temporary custody and additional transactions. Not a compelling $1 convenience flow. |
| New fee-aware market/intake vault | Pay and create directly into the new market in one transaction | Closest to today's UX, but requires a new reviewed contract and support for exits from both vaults. Existing assets need not be forcibly migrated. |
| Separate voluntary support payment in the UI | Continue current free creation; offer an explicit contribution separately | Useful demand experiment, not an atomic creation fee or guaranteed revenue. Another wallet transaction adds friction. |

**Recommendation:** do not replace custody solely to test monetization. If paid creation demand becomes convincing and wallet-first creation is acceptable, prototype the separate ESIP-3 creator and retain the current marketplace. If one-transaction creation straight into market custody is non-negotiable—or the 5% fee must disappear—design a new immutable vault deliberately. Do not pretend a forwarding adapter can preserve all of today's semantics.

For an eventual paid service, quote a fixed ETH amount and show an approximate USD conversion, with gas disclosed separately. A strict $1 peg needs a price source, freshness rules, and protection against a quote changing before execution. That extra machinery is not necessary to test a small convenience fee.

## The paid-duplicate problem must be resolved first

Fresh duplicate checks reduce risk but cannot reserve a canonical payload against another transaction landing first. Contract execution can succeed and collect the fee while the protocol rejects the requested duplicate. An EVM-only creation contract cannot inspect the independently derived protocol state to atomically refund just those failures. The official ESIP-6 rationale explicitly identifies paid contract creation as an example of this problem. [ESIP-6](https://docs.ethscriptions.com/esips/accepted-esips/esip-6-opt-in-ethscription-non-uniqueness.md).

Today's lower-priority Finding Receipt records a creation attempt if the canonical payload loses the race. It does **not** mean the customer received the historical original, and should not be marketed as fulfilling that purchase. Adding `rule=esip6` to the artifact itself would abandon this hunt's one-canonical-payload premise.

Before charging, choose and disclose a failure policy: for example, refund the service fee after indexed failure, while warning that Ethereum gas is unrecoverable. Fully automated conditional release/refund would introduce an attestor, oracle, dispute mechanism, or other trust assumption. Merely postponing withdrawal of the payment does not tell the contract which creation won. Do not add that architecture before its revenue warrants it.

## Economics: useful experiment, not yet a business engine

Illustration, not a revenue forecast:

- 151 unique, still-unclaimed targets × $1 per successful paid creation = at most **$151 gross creation fees** for that one set, before any operator costs or refunds. If gas is paid separately, it is an additional buyer cost rather than service revenue.
- Already-Ethscribed targets and people choosing a free permissionless route reduce that amount.
- Ten comparable fully paid sets would gross $1,510. Ongoing revenue requires a sustainable supply of worthwhile new corpora, different services, or a higher willingness to pay.
- Do not fabricate extra editions, alternate wrappers, or arbitrary re-encodings solely to replenish scarcity. That conflicts with exact-data archaeology.

Measure visitors who start preflight, successful first claims, repeat researchers, and willingness to pay for the experience before investing in fee contracts. Sponsorship of a researched expedition could finance a small finite corpus without charging every hunter; it remains a separate option, not an assumption of this plan.

## Pokémon is an exciting example, with two important gates

**Historical scope.** Japan's first games were Red and Green in 1996; Red and Blue reached North America in 1998. A hunt called “the first sprites” must select a specific region, edition, revision, and source artifact rather than treating these as one identical release. [The Pokémon Company's history](https://corporate.pokemon.com/en-us/about/).

**Exact-byte identity.** A modern PNG exported from a cartridge sprite is a derivative encoding, not automatically the original stored byte sequence. Define whether the artifact is a byte range extracted unchanged from a specific cartridge revision, an original distributed file, or a reproducibly decoded representation. The latter can be useful, but must be labelled differently. The community [pokered source repository](https://github.com/pret/pokered) demonstrates reproducible Red/Blue builds with published ROM hashes; it is a technical research lead, not an official licence, proof that an arbitrary sprite PNG is original, or a source of already-validated targets for this site.

**Rights.** Owning a cartridge, locating original bytes, or obtaining an Ethscription does not transfer copyright or a commercial licence. Pokémon's [published legal information](https://www.pokemon.com/us/legal/information) does not grant general commercial use of its intellectual property. A paid archive of extracted game art needs a rights review before publication. Fair use depends on the particular use and multiple factors; neither “archaeology” nor a low fee establishes it automatically. [U.S. Copyright Office guidance](https://www.copyright.gov/fair-use/more-info.html). This is a product-risk flag, not a legal opinion; obtain qualified advice before a commercial launch.

Use public-domain or explicitly permissioned material for the first paid experiment. Keep a Pokémon concept research-only until the release definition, extraction evidence, and rights position are settled.

## Release gate for any future paid hunt

1. Confirm demand and a sensible revenue ceiling for the actual number of distinct targets.
2. Freeze source/version, raw hashes, and canonical wrappers; complete a rights review.
3. Choose creator attribution and wallet-first versus direct-custody UX explicitly.
4. Decide whether the existing 5% trading fee remains; disclose all fees accurately.
5. Resolve duplicate-race/refund policy before accepting payment.
6. Review and test the new contract, including malicious content, duplicate attempts, paused intake, withdrawals, fee bounds, replay protection, and stale quotes.
7. Request explicit deployment approval. None is implied by this exploration.
