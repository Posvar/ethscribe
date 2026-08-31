# Ethscribe contracts

`EthscribeMarketV1` is an immutable ESIP-2 vault and ETH marketplace for Ethscriptions. V1 is deployed to Ethereum mainnet, source-verified, and paused. It has not received an independent audit and is not yet open for valuable custody or trading.

## Mainnet deployment

- Contract: [`0x44c241ac86724D64a33558b03A637a63D9a30B02`](https://etherscan.io/address/0x44c241ac86724D64a33558b03A637a63D9a30B02)
- Deployment transaction: [`0xf69d821904353eb57de9a28d4732ea96ca4f3198f289523dd6a9551517ae16df`](https://etherscan.io/tx/0xf69d821904353eb57de9a28d4732ea96ca4f3198f289523dd6a9551517ae16df)
- Deployment block: `25873370`
- Exact source commit: [`687ed2d`](https://github.com/Posvar/ethscribe/commit/687ed2dd94f71347ee69a5df5d16d0903306b671)
- Sourcify verification: [`exact_match`](https://repo.sourcify.dev/contracts/full_match/1/0x44c241ac86724D64a33558b03A637a63D9a30B02/metadata.json)
- Initial state: paused

The machine-readable record is [deployments/mainnet.json](deployments/mainnet.json). Deployment does not authorize deposits: the interface and official-indexer reconciliation are implemented behind a closed operational gate, while an independent review, the [controlled custody pilot](CUSTODY_PILOT_CHECKLIST.md), and a separate deliberate unpause remain release gates.

## Version 1 boundary

The contract provides:

- depositor-scoped potential Ethscription records;
- a five-block transfer cooldown;
- single and packed-batch deposits through the ESIP fallback path;
- single and batch withdrawals that remain available during a pause;
- fixed-price and buyer-restricted listings;
- funded, escrow-first offers;
- a fixed 5% protocol fee;
- pull-based proceeds, fees, and refunds;
- smart-contract wallet support;
- an opaque `contextHash` for linking public research records; and
- two-step owner and fee-recipient changes.

Every deployment starts paused. The owner must deliberately unpause after source verification and first-party custody reconciliation are ready.

It intentionally does not provide:

- proxy upgrades;
- funded bids before an artifact is deposited;
- onchain historical authentication or expedition voting;
- per-sale proposer or validator splits;
- arbitrary admin recovery of artifacts, bids, proceeds, or forced ETH; or
- a way to disable ordinary user exits.

The immutable market controls custody and settlement. Incentives remain a separate layer: the initial fee recipient can be a dedicated solo-operator treasury wallet, and future listings can snapshot a separately deployed rewards distributor as their fee recipient. A new market version is needed only if custody or settlement semantics change.

## Critical protocol boundary

An EVM contract cannot query the Ethscriptions indexer. Calling the fallback with an Ethscription ID records only a **potential deposit**. It does not prove that the caller owned or transferred that Ethscription.

Before the first-party interface presents a deposit, listing, or offer as valid, it must verify through the official Ethscriptions API that:

1. the Ethscription exists;
2. `current_owner` is the deployed market;
3. `previous_owner` is the recorded depositor; and
4. the five-block cooldown has elapsed.

Direct contract callers must perform the same reconciliation themselves. See [THREAT_MODEL.md](THREAT_MODEL.md).

## Reproducible toolchain

- Foundry: `v1.8.1`
- Solidity: `0.8.36`
- OpenZeppelin Contracts: exactly `5.7.0` in the contract lockfile
- EVM target: Cancun
- Optimizer: enabled, 10,000 runs

The local Foundry binaries live in the ignored `.tools/` directory. Contract outputs, caches, and broadcast records are ignored. Contract source, tests, compiler configuration, and deployment instructions are public.

From `C:\dev\ethscribe\contracts`:

```powershell
npm.cmd ci
..\.tools\foundry\forge.exe fmt --check
..\.tools\foundry\forge.exe build --sizes
..\.tools\foundry\forge.exe test -vv
..\.tools\foundry\forge.exe test --profile ci -vv
```

The default suite runs 1,024 cases per fuzz test and 256 invariant runs at a depth of 64. The CI profile raises those to 10,000 fuzz cases and 1,000 invariant runs at a depth of 128.

## Signing safety

Never place a raw private key or seed phrase in this repository, a `.env` file, source code, command-line argument, chat message, screenshot, Netlify variable, or shell history.

Preferred public-network signing methods, in order:

1. Foundry's `--browser` signer with a dedicated deployment wallet;
2. a Ledger or Trezor hardware wallet; or
3. a named encrypted Foundry keystore stored outside the repository.

The ignored `.secrets/` directory is only for local deployment notes and non-signing configuration. Git ignore is not encryption, so private keys do not belong there either.

If an encrypted Foundry keystore is needed, create it through the hidden interactive prompts—not a command containing the key:

```powershell
.\.tools\foundry\cast.exe wallet import ethscribe-deployer --interactive
```

Foundry stores the encrypted keystore outside the repository by default. Prefer the browser or hardware-wallet path when possible.

## Deployment progression

### 1. Local rehearsal

Start a disposable Anvil node and deploy using one of its unlocked test accounts. These are public development keys and must never receive real funds.

```powershell
..\.tools\foundry\anvil.exe --host 127.0.0.1 --port 8545

..\.tools\foundry\forge.exe script script/DeployEthscribeMarketV1.s.sol:DeployEthscribeMarketV1 `
  --force --rpc-url http://127.0.0.1:8545 `
  --broadcast --unlocked --sender <ANVIL_TEST_ADDRESS> `
  --sig "run(address,address)" <OWNER_TEST_ADDRESS> <FEE_RECIPIENT_TEST_ADDRESS>
```

### 2. Optional Sepolia rehearsal

Sepolia is useful for exercising browser signing and the public Ethscriptions/indexer path, but it is not a security boundary and is not mandatory for a deployment that starts paused. If used, fill out [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for Sepolia. First simulate without `--broadcast`:

```powershell
..\.tools\foundry\forge.exe script script/DeployEthscribeMarketV1.s.sol:DeployEthscribeMarketV1 `
  --force --rpc-url <SEPOLIA_RPC_URL> --sender <DEPLOYER_ADDRESS> `
  --sig "run(address,address)" <OWNER_WALLET> <FEE_RECIPIENT_WALLET>
```

After reviewing the simulation, broadcast through the browser wallet:

```powershell
..\.tools\foundry\forge.exe script script/DeployEthscribeMarketV1.s.sol:DeployEthscribeMarketV1 `
  --force --rpc-url <SEPOLIA_RPC_URL> --broadcast --browser --sender <DEPLOYER_ADDRESS> `
  --sig "run(address,address)" <OWNER_WALLET> <FEE_RECIPIENT_WALLET>
```

The browser signer keeps signing authority in the wallet. Carefully inspect the chain, deploying account, and contract-creation transaction before approving.

`--force` is intentional: it recompiles the deployment script and dependencies rather than trusting an earlier local artifact cache.

### 3. Mainnet candidate

Mainnet deployment requires all checklist items, verified source, a dedicated deployment wallet funded only for expected gas, and explicit confirmation of:

- chain ID `1`;
- the exact Git commit and compiler settings;
- deployer address;
- initial owner wallet;
- initial fee-recipient wallet;
- estimated gas and maximum fee; and
- post-deployment verification calls.

The deployed contract begins paused. Do not unpause, transfer valuable Ethscriptions, or accept offers until the website's official-indexer reconciliation is live and has been tested against the deployed address. Independent review remains required before meaningful value is accepted.

## Version migration

`EthscribeMarketV1` cannot be altered. If core settlement rules change:

1. the owner pauses new V1 deposits and trades;
2. withdrawals, offer cancellations, and ETH claims remain available;
3. a separately tested `EthscribeMarketV2` is deployed;
4. the public interface directs new activity to V2 while continuing to expose V1 exits; and
5. users move assets voluntarily.

Revenue distribution does not automatically require a market migration. The owner can propose a new fee recipient, and that recipient must accept. Listings and offers snapshot the recipient that was active when their terms were created.
