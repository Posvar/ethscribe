# First custody test: historical record

This page records a completed August 31, 2026 test on the legacy market. It is not an instruction to change today's pause state, and its former wallet deposit flow has since been replaced by expedition-based intake.

The active contract and current exit methods are documented in [Mainnet deployment](mainnet-deployment.md). The current visitor flow starts with [Your first Finding](../product/first-finding.md).

## Pilot 001

One disposable Ethscription was deposited and withdrawn through the production interface.

| Item | Record |
|---|---|
| Test wallet | `jeremy.eth` / `0x1f01D99a90AD0C752e7765de29c386a169BD9E37` |
| Ethscription | `0x5a57d369ff4b6c34c6da3459cef71e534bfae6cdabb245805c177691481e534f` / #6304100 |
| Unpause | [Transaction](https://etherscan.io/tx/0x6200a5c92430236e464812541ed071b093224744b86c3cef5feee08fc035e52f), block 25,877,344 |
| Deposit | [Transaction](https://etherscan.io/tx/0xfcd8e9f1d16dbccac8a8d4251af1eba46c779d11b2ee9c793fe9b9a221c1674c), block 25,877,362, nonce 1 |
| Withdrawal | [Transaction](https://etherscan.io/tx/0x3620aa99638e596abbe8d7c48b6afb33fa90f9829d040bbd96176eda1a7f7342), block 25,877,374 |

After deposit, the contract and official index agreed on custody and the five-block cooldown completed. After withdrawal, the index reported the test wallet as current owner, the deposit became inactive, and escrow disappeared from the wallet inventory. The recorded balances, locked offers, claims, and liabilities were zero.

At the owner's direction, the contract was left unpaused after the test. That is the historical outcome, not a live status assertion.

The [machine-readable execution record](https://github.com/Posvar/ethscribe/blob/main/contracts/deployments/custody-pilot-001.json) is preserved in the repository.

## What this established

The exercise validated the legacy deposit, verification, and withdrawal path for that test asset and wallet. It did not test all current direct-creation, listing, purchase, offer, or payment-claim paths, and it was not an independent contract audit.

## Current verification priorities

The next complete transaction rehearsal should cover the active market's creation or existing-asset intake, signed assignment, optional sale registration, listing, purchase, resulting ownership, and proceeds claim. Interrupted sessions and slow index responses also need explicit recovery checks.

The [roadmap](../roadmap/phased-development.md) tracks those priorities without presenting this older test as proof of the full marketplace.
