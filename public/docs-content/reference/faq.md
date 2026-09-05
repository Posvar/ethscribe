# Frequently asked questions

## What is Ethscribe?

An experiment in digital archaeology: follow a historical target, recover its exact file bytes, establish provenance, and collect the recognized Ethscription. The first expedition investigates Satoshi's early Bitcoin icons.

## Do I need a wallet to explore?

No. The mission, timeline, artifact records, and local-file testing can be used without a wallet. A wallet is required to submit a Finding, manage custody, or buy.

## How do I participate?

Open an unresolved target in an [expedition](/expeditions) and choose **Submit a Finding**. Test either an original file from your device or an Ethscription you already own. The [first-finding guide](../product/first-finding.md) walks through the rest.

## What costs gas?

Browsing and candidate testing cost no gas. A Finding assignment is a message signature and also costs no gas.

Creation, deposit, registration for sale, listing changes, purchase, withdrawal, and claiming proceeds are Ethereum transactions. Their gas cost varies. The wallet shows the proposed transaction before submission.

## Why did testing pass without changing the target to green?

Testing establishes candidate eligibility only. The asset must be recognized by the protocol, enter verified custody, and have its signed Finding published before an exact-match submission updates the target.

The lost-file target never becomes authenticated from a file-format check alone.

## Why is verification still pending after my transaction succeeded?

Ethereum confirmation and Ethscriptions indexing are separate. The site also waits for the applicable five-block custody window. Ownership and contract reads must agree before further actions become available.

Keep the transaction link and let reconciliation finish. Do not repeat a confirmed creation or deposit simply because indexing is delayed.

## What if someone ethscribes my candidate before my transaction?

Preflight is not a reservation. Ethereum transaction order determines the first canonical creation under the protocol rules.

The market's fallback Finding Receipt can record your attempt if the canonical input loses that race. The receipt is not the target artifact and gas is not refunded. See [artifact intake](../product/artifact-intake.md).

## Does “first come, first scribe” mean nobody can copy the bytes?

No. The Ethscriptions protocol ordinarily rejects a later creation of the same complete Data URI. It also supports duplicate opt-in for other use cases. Ethscribe targets do not use that opt-in.

The same file bytes can appear under a different valid wrapper, and the file remains copyable elsewhere. The target's canonical payload and the catalogue's byte identity are distinct.

## What does SHA-256 prove?

It allows the site to compare exact file bytes with a reference. A renamed file can still match; a resaved image or an XPM with changed line endings may not.

A matching hash does not prove Satoshi authored the reference. That claim depends on historical sources.

## Does Ethscribe search every previously Ethscribed raw file?

No. It checks the target's canonical protocol content and disclosed aliases, and compares decoded hashes for supported candidates. It does not yet have a complete historical raw-byte index across every wrapper and creation mechanism.

“No known duplicate found” means no duplicate was found in those checks.

## Can I submit something created outside this site?

Yes, if you own it, its decoded bytes and wrapper meet the target, and it enters verified custody. Use the existing-Ethscription path inside the target.

There is no general-purpose creation page or arbitrary deposit action in Field Wallet.

## I already own an artifact shown as recovered. How do I deposit it?

Open the recognized target in its expedition, connect the wallet that currently owns the Ethscription, and choose **Deposit into marketplace**. The creator shown on the historical transaction is not necessarily its current owner.

Review and confirm the existing-ID deposit in your wallet. It costs gas, but requires no new upload, Ethscription creation, or Finding for the existing catalogue record. Wait for Ethereum confirmation and ownership reconciliation; do not resubmit a confirmed deposit while the index catches up.

Then open Field Wallet to list it or withdraw it. A deposit does not automatically set a price or offer the asset for sale.

## Why do I have to register a direct creation for sale?

The market receives the file during creation, but cannot read the containing transaction's hash to record the new Ethscription ID. A later registration transaction supplies that ID and initializes the deposit state used by listings.

It is a one-time step for that deposit. It does not create another Ethscription. Withdrawal is available without registering an otherwise verified direct creation.

## Where does my listing appear?

Manage the price in Field Wallet. The corresponding recovered artifact's record in the expedition displays the live listing and purchase action when custody and market checks pass.

An arbitrary contract deposit does not automatically receive a place in the expedition.

## Are sale proceeds sent automatically?

They become claimable credit in the contract. Open Field Wallet and use the claim action to send the balance to your wallet. A completed sale credits 95% to the seller and 5% to the marketplace fee recipient.

Canceling a listing does not require claiming anything and does not withdraw the artifact.

## Can I withdraw while intake is paused?

The contract's withdrawal and claim functions remain callable during an intake pause. Site controls additionally require working ownership reads and an enabled UI transaction gate.

See the [mainnet reference](mainnet-deployment.md) for the contract and exit methods.

## Can I withdraw several artifacts at once?

The contract supports batches of up to 100 for each custody type. Registered deposits and unregistered direct creations use different batch methods. The current Field Wallet offers individual withdrawals.

## Is an Accession ownership of the original artwork?

It is ownership of a recognized Ethscription containing the target bytes. It does not confer historical authorship, copyright, or control of all copies of the underlying work.

## Can a lost file have a reference hash?

Not until its original bytes have been established. The lost PNG target has historical identification clues; a candidate needs a provenance case, not just the right dimensions or a similar appearance.

## Will XPM, HTML, audio, or text display?

The wallet supports previews for several content types. XPM receives a generated pixel preview while its original text bytes remain the artifact. Audio uses playback controls, and plain text is displayed as text. HTML is rendered in an isolated frame with restrictions, so some interactive works may not behave exactly as on their original site.

## Can I make a bid or propose the next expedition?

Public funded-offer and auction workflows are not available yet. Expedition proposal intake is also closed. These are possible later additions, alongside research revisions and challenges.

## Is the project decentralized?

Ethscription creation and transfers follow the protocol; custody and payment rules are in an immutable contract. The current catalogue, target references, assignment storage, and interface are maintained by Ethscribe. The site relies on Ethereum read providers and the official index.

A signature proves who submitted a claim, not its truth. Review and storage decentralization are future directions rather than current guarantees.
