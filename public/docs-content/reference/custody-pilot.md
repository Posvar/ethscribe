# Controlled custody pilot

The first mainnet transaction exercise is deliberately limited to one disposable, low-value Ethscription moving into and back out of the immutable V1 market. It is not a marketplace launch.

> **Current state:** Pilot 001 completed successfully on August 31, 2026. The owner deliberately left the contract unpaused and the interface gate enabled afterward. This is not a marketplace launch or approval for valuable custody. Contract activity is public and discoverable onchain even when site traffic is low.

## Pilot 001 execution record

| Item | Record |
|---|---|
| Test wallet | `jeremy.eth` / `0x1f01D99a90AD0C752e7765de29c386a169BD9E37` |
| Ethscription | `0x5a57d369ff4b6c34c6da3459cef71e534bfae6cdabb245805c177691481e534f` / #6304100 |
| Unpause | [`0x6200a5…e52f`](https://etherscan.io/tx/0x6200a5c92430236e464812541ed071b093224744b86c3cef5feee08fc035e52f), block 25,877,344 |
| Deposit | [`0xfcd8e9…674c`](https://etherscan.io/tx/0xfcd8e9f1d16dbccac8a8d4251af1eba46c779d11b2ee9c793fe9b9a221c1674c), block 25,877,362, nonce 1 |
| Withdrawal | [`0x3620aa…7342`](https://etherscan.io/tx/0x3620aa99638e596abbe8d7c48b6afb33fa90f9829d040bbd96176eda1a7f7342), block 25,877,374 |

The production UI performed both wallet transactions. After the deposit receipt, contract state and the official indexer agreed that the market held the artifact, and the five-block cooldown completed. After withdrawal, the official indexer returned ownership to `jeremy.eth`, the contract deposit became inactive, escrow disappeared from the wallet, and contract balance, locked offers, claims, and liabilities were all zero.

The recommended procedure below pauses immediately after deposit. At the owner's direction, Pilot 001 instead remained unpaused through withdrawal and afterward. That deliberate deviation is recorded here; obscurity of the website is not a security boundary.

## Why two gates exist

The contract pause and the interface transaction gate solve different problems:

| Gate | Effect |
|---|---|
| Contract `paused()` | Prevents deposits and new market activity at the immutable settlement layer |
| `MARKET_UI_TRANSACTIONS_ENABLED` | Prevents the first-party interface from preparing any transaction |

Both must permit intake before a Deposit button becomes active. Once the interface gate is enabled, a contract pause still permits verified withdrawals because V1 exit functions intentionally survive a pause.

Netlify must store `MARKET_UI_TRANSACTIONS_ENABLED` as a server-side Function variable. It defaults to `false`; changing it requires a new deploy. It must never use a `REACT_APP_` prefix.

## What the interface verifies

For a deposit, the browser prepares a zero-ETH transaction whose recipient is the market and whose raw calldata is the 32-byte Ethscription ID. Before the wallet opens, the interface:

1. confirms the connected wallet is on Ethereum mainnet;
2. validates the wallet and Ethscription ID shapes;
3. rejects an ID whose first four bytes collide with any V1 function selector; and
4. simulates the exact transaction with `eth_estimateGas`.

A successful receipt begins reconciliation; it does not create a verified-custody claim. Ethscribe waits until:

- the official indexer is healthy;
- `current_owner` is the V1 market;
- `previous_owner` is the depositing wallet;
- the matching contract deposit is active; and
- the five-block cooldown has elapsed.

The withdrawal button appears only on a reconciled position. It simulates `withdrawEthscription(bytes32,address)` with the connected wallet as recipient. After confirmation, Ethscribe waits until the official indexer reports the artifact directly owned by that wallet and the escrow candidate is gone.

## Pre-pilot gates

- [ ] The exact production UI commit is published and its build passes.
- [ ] The deployed-address fork rehearsal passes against an Ethereum mainnet RPC.
- [ ] An independent reviewer has reviewed the immutable contract and material findings are resolved or V1 is abandoned while paused.
- [ ] Contract address, owner, fee recipient, version, fee, cooldown, bytecode, balances, liabilities, and paused state are reconfirmed.
- [ ] The test wallet is not the owner wallet.
- [ ] The test Ethscription is newly created, disposable, and has no historical or financial value.
- [ ] The test wallet holds only the ETH needed for expected gas.
- [ ] No listing, offer, purchase, or valuable custody is attempted.

## Rehearse without mainnet writes

Set a local `ETHEREUM_RPC_URL` and run the optional fork integration test:

```powershell
cd contracts
..\.tools\foundry\forge.exe test --match-contract EthscribeMarketV1MainnetForkTest -vv
```

The test forks the deployed address, impersonates the known public owner only inside the disposable fork, unpauses, records a potential deposit, mines the cooldown, pauses, and withdraws. It uses no signing key and cannot mutate mainnet.

## Mainnet pilot sequence

1. Set `MARKET_UI_TRANSACTIONS_ENABLED=true` for Netlify Functions and deploy.
2. Verify the live wallet says `PILOT READY`, `PAUSED`, and that Deposit remains disabled.
3. Reconfirm the market has zero unexpected assets or liabilities.
4. From the owner wallet, explicitly submit `unpause()`.
5. From the separate test wallet, refresh `/wallet` and select **Deposit to market** on the disposable artifact.
6. Review the exact destination, zero ETH value, calldata, gas, and network in the wallet.
7. Submit the deposit and record its transaction hash.
8. As soon as the deposit transaction succeeds, use the owner wallet to submit `pause()` again. Waiting for indexer reconciliation does not require intake to remain open.
9. Wait for at least five blocks and official-indexer reconciliation.
10. Require the site to show `Verified custody`; save the contract record, official record, and transaction links.
11. From the test wallet, select **Withdraw to this wallet** while the market is paused.
12. Wait until the official indexer reports the test wallet as current owner and Ethscribe reports withdrawal verified.
13. Reconfirm the deposit is inactive, contract liabilities are unchanged, and the contract remains paused.
14. Set `MARKET_UI_TRANSACTIONS_ENABLED=false` and deploy again.

Any disagreement, unexplained revert, unexpected asset movement, nonzero liability, indexer ambiguity, or interface error stops the pilot. Keep the contract paused, preserve transaction hashes and logs, and investigate before attempting another deposit.

## Pilot completion does not launch trading

A successful custody round trip validates only Deposit → Verify → Withdraw. Fixed-price sales, offers, claims, and curated Accession settlement require their own reviewed test sequence before public marketplace activity.
