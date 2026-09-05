# Ownership and marketplace

The marketplace lets a recognized Ethscription change hands while its historical record stays attached to the expedition. Research establishes the claim; protocol ownership and the contract determine custody and payment.

## What you own

An **Accession** is an artifact recognized in Ethscribe's catalogue and linked to its Ethscription and evidence. It can be recognized before any sale.

Buying transfers the Ethscription under the protocol's rules. It does not transfer copyright, authorship, or exclusive access to the historical file. Its bytes can remain publicly accessible.

## Sell from Field Wallet

If a recognized expedition artifact is still in your wallet, first open its recovered target, connect the **current owning wallet**, and choose **Deposit into marketplace**. This deposits the already identified Ethscription. Its existing catalogue assignment remains intact; there is no new file upload, creation, or Finding signature. Wait for the confirmed deposit's ownership checks to finish before continuing.

1. Open [Field Wallet](/wallet) and select **Marketplace custody**.
2. If a direct creation has not been registered for trading, choose **Register for sale** and wait for confirmation and custody verification.
3. Set a fixed price in ETH and approve the listing transaction.
4. The listing appears in the corresponding recovered artifact's expedition record.
5. Change the price, cancel the listing, or withdraw the artifact from your wallet controls.

Registration is a one-time step per deposit that records the now-known Ethscription ID for settlement. It is not a second creation or a sale. Canceling a listing leaves custody unchanged. Withdrawal cancels an attached listing.

A contract deposit by itself does not make an artifact eligible for Ethscribe's curated catalogue. The first-party deposit flow begins within an expedition target.

## Buy from an artifact record

A recovered target shows its current listing when one is available. The site checks custody, sale terms, network, and service availability before preparing a purchase.

The buyer reviews the exact ETH price, plus network gas. The transaction binds the seller, Ethscription ID, listing nonce, and expected price. A changed listing cannot be purchased using stale terms.

After confirmation, the interface waits for the official Ethscriptions index to report the buyer as owner. The purchase is not an expedition submission and does not rewrite the original Finding.

## Proceeds and the 5% fee

Each completed sale credits 95% to the seller and 5% to the fee recipient captured when the listing was created. The fee is a marketplace settlement fee, not an enforceable royalty on transfers or trades elsewhere.

Proceeds stay in the contract until claimed. The wallet shows the connected address's **claimable credit** and a claim action that sends it to that wallet. Claiming requires an Ethereum transaction and gas.

For a 1 ETH sale, 0.95 ETH is credited to the seller and 0.05 ETH to the treasury. The buyer pays network gas separately. The fee recipient claims its own balance; it cannot claim the seller's credit.

Funds accumulate before transfer so an address that rejects ETH does not block settlement or someone else's refund. Claim and withdrawal methods remain callable while new intake is paused.

## Contract state and protocol ownership

The active contract is [EthscribeMarketV2 on Ethereum mainnet](../reference/mainnet-deployment.md). It inherits the initial market's fixed-price settlement and adds direct creation and its withdrawal path.

The contract stores potential deposits, prices, offers, and claimable balances. **It cannot read Ethscriptions ownership directly.** The site reconciles the claimed depositor against the official index before allowing a purchase. A potential deposit or successful Ethereum transaction alone is insufficient proof of valid custody.

Conditional transfer events protect an artifact from a false previous-owner claim. They do not make an arbitrary direct contract listing safe to buy: payment execution and protocol interpretation are distinct. The first-party ownership checks are part of the marketplace's trust boundary.

## What remains outside the contract

Expedition IDs, target definitions, decoded-file hashes, source claims, signed Findings, and historical review live outside the custody contract. A stored `contextHash` is an opaque commitment supplied with a position; the contract does not authenticate its history or verify curator approval.

There is no complete protocol-wide raw-byte index. The current marketplace uses Ethereum read services and the official Ethscriptions API; running a separate protocol indexer is not required for this release.

## Offers and auctions

The contract contains seller-scoped funded-offer methods, including cancellation and credit accounting. There is no complete public funded-offer workflow in the current interface. Auctions and bids on unescrowed artifacts are not current product features.

Funded pre-escrow bids would require additional ownership and settlement design. A recognized artifact is not automatically available for sale.

## Immutability and future rewards

The market is non-upgradeable. Its 5% rate is fixed. Administration can pause intake and use two-step changes for ownership and the fee recipient; it cannot rewrite the deployed settlement code.

A later rewards distributor could receive future fees and allocate them to researchers or expedition authors. Existing listings retain their captured recipient. Those reward rules are proposals, not entitlements in the current release.

Changes to custody or settlement behavior require a separate contract deployment and voluntary user migration. The legacy market remains available for its exits.

## Release assurance

The repository contains automated contract tests and deployment/source-verification records. No independent security audit is documented. The recorded first custody test covers deposit and withdrawal on the legacy market; it does not establish that every present market path has been independently reviewed or exercised end to end.

See [the historical custody test](../reference/custody-pilot.md) and [phased development](../roadmap/phased-development.md) for the evidence and remaining work.
