# Mainnet custody pilot checklist

This operator checklist supplements the public [Controlled custody pilot](../public/docs-content/reference/custody-pilot.md). It does not authorize an unpause transaction.

## Before the window

- [ ] Record the reviewed Git commit and Netlify deploy ID.
- [ ] Run `forge fmt --check`, the default contract suite, and the mainnet-fork integration test.
- [ ] Confirm `MARKET_UI_TRANSACTIONS_ENABLED=true` is limited to the scheduled pilot deploy.
- [ ] Confirm contract `0x44c241ac86724D64a33558b03A637a63D9a30B02` is paused.
- [ ] Confirm owner `0x4B2EEfe5515d3464F1F7B7b713dCD4eC74954Bba` is connected through a browser or hardware signer.
- [ ] Record the separate test-wallet address and disposable Ethscription ID.
- [ ] Confirm the test wallet is the official current owner of the test Ethscription.
- [ ] Confirm the ID does not trigger the interface's selector-collision rejection.

## Transaction record

- [ ] Owner `unpause()` transaction:
- [ ] Test-wallet deposit transaction:
- [ ] Owner `pause()` transaction:
- [ ] Contract deposit block and nonce:
- [ ] Official-indexer custody verification time:
- [ ] Test-wallet withdrawal transaction:
- [ ] Official-indexer return verification time:

## Closeout

- [ ] Contract is paused.
- [ ] Potential deposit is inactive.
- [ ] Test wallet is official current owner.
- [ ] `lockedOfferTotal == 0`.
- [ ] `totalClaimable == 0`.
- [ ] Contract ETH balance equals its recorded liabilities plus any documented forced surplus.
- [ ] No listing or offer exists for the test ID.
- [ ] Interface gate is returned to `false` and redeployed.
- [ ] Findings and transaction links are attached to the public release record.
