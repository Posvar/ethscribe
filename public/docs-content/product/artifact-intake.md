# Ethscribe, deposit, and assign

All new on-site creation starts inside an expedition target. There is no general-purpose Ethscribe page and no deposit button for arbitrary wallet assets. Existing Ethscriptions also enter through the relevant target: candidate testing for an unresolved target, or an owner-aware deposit action for an already recognized record.

The [first-finding guide](first-finding.md) covers the visitor experience. This page explains what each step means.

## Three distinct actions

| Action | Result | Cost |
|---|---|---|
| Test | Compares the candidate and checks known protocol matches | No gas |
| Create or deposit | Puts a new or existing Ethscription into market custody | Ethereum gas |
| Assign | Publishes a signed claim linking the Ethscription to a target | No gas |

Creating or depositing does not automatically publish the assignment or create a sale listing.

## The target defines the wrapper

Ethscriptions identifies the complete Data URI, including media type and encoding. Ethscribe separately compares the decoded file's SHA-256 with its target reference.

The interface chooses the required wrapper. Expedition 001 XPM targets use `data:image/x-xpixmap;base64,`; Expedition 002 WAV targets use `data:audio/wav;base64,`. The server rejects a Finding using another prefix even if its decoded bytes match. Sound files keep their complete original headers, metadata and samples; no conversion is performed.

The existence check covers the canonical content and a disclosed selection of aliases. It does not search all historical content across arbitrary wrappers. PNG and JPEG can also have alternate valid wrappers; this issue is not specific to XPM. See [byte-perfect identity](../foundations/byte-perfect-identity.md).

## Direct creation

The connected wallet sends the prepared file payload directly to the market contract. Under the protocol's creation rules, a valid first canonical creation records the wallet as creator, the market as initial owner, and the wallet as previous owner.

The original bytes are preserved. The contract does not decide historical eligibility and cannot read the current transaction hash to register the new ID for trading. Registration happens later, if the owner chooses to sell.

### If someone gets there first

An existence check cannot reserve content. Another Ethereum transaction may be ordered first before yours is mined.

The market emits a fallback creation event for a small **Finding Receipt** containing the attempted content hash. The protocol considers valid transaction input before creation events. If the canonical input succeeds, it is the Ethscription. If it loses the uniqueness race, the receipt can become the transaction's Ethscription instead, owned initially by the hunter.

The receipt establishes an attempt. It is not the canonical artifact, does not fill the expedition target, and does not refund gas. It uses the protocol's duplicate opt-in rule; target artifacts do not.

This behavior follows the [protocol specification](https://docs.ethscriptions.com/overview/protocol-specification), [contract creation ordering](https://docs.ethscriptions.com/esips/accepted-esips/esip-3-smart-contract-ethscription-creations), and [duplicate opt-in rule](https://docs.ethscriptions.com/esips/accepted-esips/esip-6-opt-in-ethscription-non-uniqueness).

## An existing Ethscription

For an unresolved target, choose the existing-Ethscription path. The site retrieves supported content, tests the decoded bytes and required wrapper, and checks who currently owns it.

If it is directly owned by the connected wallet, the next transaction deposits its existing ID into the market. If it is already verified in that wallet's market custody, no second deposit is needed. The next step is the signed Finding.

An artifact created outside Ethscribe is eligible on the same terms. A different wrapper or another person's ownership cannot be silently treated as a valid deposit for the submitting wallet.

## Deposit an already recognized artifact

A recovered target already has a known Ethscription ID and catalogue assignment. Its current owner can connect that wallet, open the target, and choose **Deposit into marketplace**. Eligibility for this action comes from current protocol ownership, not the original creator address.

The transaction deposits the existing ID into escrow; it does not recreate the file. No upload or new Finding is required for the record's existing assignment. After Ethereum confirmation, the site reconciles contract and indexed ownership before offering wallet management. Leave a confirmed deposit pending while the index catches up rather than submitting it again.

Listing remains a separate action in Field Wallet. The owner can also withdraw after custody verification without ever listing the artifact.

## Confirmation and custody

An Ethereum receipt establishes transaction inclusion. It does not establish valid Ethscriptions ownership on its own.

The application reconciles the official record and contract state, with the applicable five-block safety window. For a registered deposit, the market must be current owner, the submitting wallet must be previous owner, and the wallet's deposit record must be active. For an unregistered direct creation, the index must also identify the submitting wallet as creator and the market as initial owner.

If reads disagree or are unavailable, the UI waits rather than presenting the asset as ready for a market action. A slow index is not a reason to repeat a confirmed transaction.

## The signed Finding

The assignment binds the target, Ethscription ID, raw and protocol hashes, byte length, required wrapper, claim summary, primary source URL, author address, and custody contract. It uses a wallet message signature.

Before storage, the server verifies the signer, decodes indexed content, reproduces the hashes, applies target validation, and checks custody. A known-target match can update the expedition record. A lost-file candidate requires historical review and does not automatically resolve the target.

Assignments are stored off-chain. The Ethereum creation order is independent of the site's submission timestamps. A signature proves who submitted a claim; it does not prove the file's historical author or time of discovery.

## Withdrawals

Owners manage withdrawal in [Field Wallet](/wallet). The contract provides conditional transfers that require the caller to be the actual previous owner under the protocol.

Registered deposits and direct creations use separate exit methods. Both support batches of up to 100 IDs; mixed custody requires separate batches. The current wallet UI exposes individual withdrawals.

Contract withdrawal and credit-claim methods remain callable during an intake pause. First-party controls still require working read services and the UI transaction gate. Developer reference: [mainnet deployment](../reference/mainnet-deployment.md).
