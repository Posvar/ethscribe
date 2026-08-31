# Deployment checklist

Copy this checklist into the ignored `.secrets/` workspace for each rehearsal. Do not add private keys, seed phrases, keystore passwords, or wallet recovery information.

## Candidate identity

- [ ] Target network and chain ID recorded
- [ ] Git commit recorded
- [ ] Working tree clean except documented non-contract files
- [ ] Contract: `EthscribeMarketV1`
- [ ] `MARKET_VERSION`: `1`
- [ ] Solidity: `0.8.36`
- [ ] OpenZeppelin Contracts: `5.7.0`
- [ ] Optimizer: enabled, 10,000 runs
- [ ] EVM target: Cancun
- [ ] Constructor calldata decoded and reviewed

## Addresses

- [ ] Deployer address recorded and independently checked
- [ ] Initial owner address recorded and confirmed on the target chain
- [ ] Initial owner is an Ethscribe Safe for a production deployment
- [ ] Initial fee-recipient address recorded and confirmed
- [ ] Fee recipient is a Safe or reviewed distributor for a production deployment
- [ ] No constructor address is zero
- [ ] Deployer is not accidentally assigned as owner or fee recipient

## Security gates

- [ ] Formatting check passes
- [ ] Build passes without compiler warnings
- [ ] Runtime bytecode is below the EIP-170 limit
- [ ] Default unit, fuzz, and invariant suite passes
- [ ] CI-profile fuzz and invariant suite passes
- [ ] Local Anvil broadcast and post-deployment checks pass
- [ ] Sepolia broadcast and end-to-end deposit/withdraw/trade rehearsal pass
- [ ] Official-indexer reconciliation is tested against the deployed address
- [ ] Independent reviewer findings are resolved or explicitly accepted
- [ ] Public source and threat model match the exact candidate

## Transaction review

- [ ] RPC endpoint resolves to the intended chain ID
- [ ] Deployment is simulated at the current block
- [ ] Estimated gas recorded
- [ ] Maximum fee approved before signing
- [ ] Deployment wallet contains only the intended gas budget
- [ ] Browser or hardware-wallet signer selected
- [ ] Contract-creation transaction inspected in the signer
- [ ] No raw key, mnemonic, or password appears in a command or environment file

## Post-deployment

- [ ] Deployment transaction hash recorded
- [ ] Contract address recorded
- [ ] Runtime code exists at the address
- [ ] Source verified with exact compiler settings
- [ ] `MARKET_VERSION()` returns `1`
- [ ] `FEE_BPS()` returns `500`
- [ ] `BPS_DENOMINATOR()` returns `10000`
- [ ] `TRANSFER_COOLDOWN_BLOCKS()` returns `5`
- [ ] `owner()` returns the reviewed owner Safe
- [ ] `feeRecipient()` returns the reviewed fee recipient
- [ ] `pendingFeeRecipient()` is zero
- [ ] `paused()` is reviewed for the intended launch state
- [ ] Site configuration references the correct chain and address
- [ ] No valuable artifact is deposited before UI reconciliation is live
- [ ] Deployment record and verified-source link are published
