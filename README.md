# Decentralized Crowdfunding • Smart Contract & Web3 Demo

Blockchain coursework for a three-person group: **Đề W — crowdfunding with a funding goal and deadline**. The repository includes Solidity contracts, local EVM tests, a JavaScript sandbox, and a MetaMask connector. This is an educational implementation, not an independently audited production platform.

## Quick start

### 1. Web demo
Open [demo/index.html](demo/index.html) in a browser, or serve locally:

```bash
npm run serve
# or: npx serve demo
```

* **Sandbox:** JavaScript simulation with Creator/Alice/Bob/Charlie and controllable simulated time. It does not execute Solidity or change a blockchain timestamp.
* **MetaMask:** interact with a deployed campaign on a supported connected network. Confirm the chain ID and contract address. Browser tests with a mocked provider do not prove a real wallet transaction was signed/broadcast.
* The classroom layout prioritizes desktop/projector use, with light/dark themes, funding/time/permission guards, contribution accounting and separate RPC status/transaction history.

### 2. Tests

```bash
npm test
npm run test:mock     # 18 JavaScript model tests; no EVM execution
npm run test:evm      # 41 Hardhat EVM tests
npm run test:coverage # optional coverage measurement; not a claimed 100% result
```

Verified on 2026-11-11: **18 model + 41 EVM tests pass**. Hardhat also discovers the model test file, so its console output appears again during the EVM command; this is not another 18 distinct tests.

The EVM suite checks core flows, deadline/authorization boundaries, full withdrawal/re-pledging, transfer-failure rollback/retry, nested refund, forced ETH, and selected factory behavior. Its deterministic fuzz covers 80 active-period pledge/unpledge operations with four actors and seed `0xC0FFEE`; `balance == pledged` is checked only in that scope, not after claim or forced ETH. Test counts do not establish full statement/branch/custom-error coverage.

Three representative tests per member, with commands and before/after evidence, are documented in [report section 3.3](docs/report/03_trien_khai_va_thuc_nghiem.md).

### 3. Static analysis

```bash
slither --version
solc --version
slither contracts/Crowdfunding.sol --solc solc
slither contracts/CrowdfundingFactory.sol --solc solc
```

The recorded run uses Slither 0.11.6 and solc 0.8.20: **0 High/Medium**, 13 result instances for Crowdfunding and 16 for Factory including its dependency. There are four detector categories, not four findings; the runs overlap and must not be summed as independent issues. See [raw JSON, source hashes and triage](docs/security/slither-report.md). Static analysis is not an audit or a security guarantee.

### 4. Reproducible local EVM demo

```bash
npm ci
npm run demo:node      # terminal 1: loopback RPC, chain ID 31337
npm run demo:deploy    # terminal 2: two fresh campaigns, 0.01 ETH goal / 600 seconds
npm run demo:evidence  # optional: fresh pair, automated RPC receipts and state snapshots
```

Keep the node running. `demo:evidence` advances time for the entire local node; run it before preparing fresh campaigns for manual wallet use. Scripts only target the configured localhost RPC/chain and use public, unlocked test accounts. Never fund these accounts on a real network. Recorded local receipts do **not** demonstrate a MetaMask signature or Sepolia broadcast. See [wallet walkthrough and failure handling](docs/local-demo.md) and [actual evidence/requirements matrix](docs/report/06_doi_chieu_va_minh_chung.md).

The Web3 amount field supports contributions and partial/full pre-deadline withdrawals; MAX fills a contribution amount from wallet balance, not the recorded withdrawable pledge.

### 5. CLI simulation

```bash
npm run simulate
```

The CLI is another model-based illustration; use the EVM suite to demonstrate Solidity behavior.

## Contract behavior and limitations

| Topic | Implemented behavior |
| --- | --- |
| Contributions | `pledge()` and ordinary empty-calldata ETH transfers through `receive()` update per-address accounting before the deadline. Values are in wei. |
| Early withdrawal | `unpledge(amount)` withdraws part/all of the caller's recorded contribution while `timestamp < endAt`. |
| Settlement | Reaching the goal before the deadline still leaves the campaign Active. At/after the deadline, only the creator may claim if `pledged >= goal`. No automatic transaction runs when time passes. |
| Successful claim | Transfers actual contract balance, including oversubscription/forced ETH present at claim time. The `claimed` flag changes; contribution accounting remains. |
| Refund | After failure, each backer calls `refund()`. It pays the recorded contribution, not gas already spent. |
| CEI and guard | Transfer functions use a custom storage-based guard, validate call success and revert on failure. Tests check rollback and retry at unpledge/claim/refund/sweep. This is not an imported OpenZeppelin guard. |
| Forced ETH | SELFDESTRUCT can transfer ETH after EIP-6780; same-transaction creation concerns code/storage deletion. `sweepExcessEther()` allows only the creator to take positive `balance - pledged`, without requiring expiry. It is not a universal recovery mechanism for every post-settlement transfer. |
| Accounting | `pledged == sum(pledgedAmount)` is distinct from actual balance. Forced ETH and successful claim demonstrate why balance need not equal pledged. |
| Gas choices | Immutable values, custom errors and guard placement have technical motivations. No fixed gas saving is claimed without a controlled benchmark. |

Passing tests and zero High/Medium static findings do not establish safety in every state. A receiver may reject ETH; refund isolation does not make that receiver capable of accepting funds. Contract escrow also does not guarantee project delivery after disbursement.

## Classroom scenarios

* **TV1:** reset, Alice pledges 3 ETH, withdraws 1 ETH, inspect the remaining 2 ETH and an invalid withdrawal.
* **TV2:** the sufficient-funding preset creates **4 + 3 + 3 = 10 ETH at day 6.9**. Creator cannot claim yet. Select **7.0d**; compare an unauthorized wallet with the creator, then claim.
* **TV3:** failed preset creates **3/10 ETH at day 7.2**; Alice refunds once. Use EVM tests, not sandbox animation, for rollback/reentrancy evidence.
* **Optional oversubscription:** separate preset creates **12/10 ETH at day 7.2**. This is distinct from the 11 ETH EVM test.

## Project structure

```text
contracts/
  Crowdfunding.sol               # Main campaign contract
  CrowdfundingFactory.sol        # Independent campaigns and list pagination
  testing/Attackers.sol          # Test-only callbacks/forced ETH/rejecting receiver
test/
  Crowdfunding.test.js           # 18 model tests
  Crowdfunding.evm.test.js       # 41 EVM tests
demo/                           # Desktop sandbox and MetaMask connector
docs/
  group_report.md               # Responsibilities, demo and oral-defense guide
  report/                       # Four-part Vietnamese report
  security/                     # Static-analysis report and raw JSON
 hardhat.config.js              # solc 0.8.20; optimizer enabled, 200 runs
```

Test helpers are not production wallets or deployment targets. `RejectingReceiver` deliberately has permissionless test controls.

## Sepolia deployment through Remix

1. Open [Remix](https://remix.ethereum.org/) and copy [Crowdfunding.sol](contracts/Crowdfunding.sol).
2. Select compiler **0.8.20**, compile and record the actual compiler/optimizer settings used.
3. Choose **Injected Provider — MetaMask** with Sepolia selected.
4. Set constructor arguments:
   * `_creator`: intended beneficiary, or `0x0000000000000000000000000000000000000000` to use the deployer.
   * `_goal`: wei, e.g. `1000000000000000000` for 1 ETH.
   * `_durationSeconds`: 1–31,536,000 seconds; e.g. `600` for a 10-minute demo or `604800` for 7 days.
5. Deploy, confirm in the wallet and record chain ID, contract address and deployment receipt. Paste the address into the Web3 connector.
6. For any claimed live demonstration, retain transaction hashes/receipts and compare state before/after. Signed/pending is not confirmed; a mined reverted transaction can still cost gas. Reading `goal()` alone does not authenticate the target bytecode.

## Group responsibilities — 3 members

Each member owns Solidity reasoning, relevant tests, report content, demo and oral defense for one Blockchain flow:

| Member | Required core | Advanced follow-up |
| --- | --- | --- |
| 1 | Contributions/early withdrawal: `pledge`, `unpledge`, ETH/wei and mapping | `receive`, events, contributor counting and unpledge rollback/retry |
| 2 | Goal/deadline/state, creator permission and `claim` | Claim rollback/retry, factory, pagination and gas choices |
| 3 | `refund`, CEI, guard, refund rollback and isolation | Nested refund, forced ETH, sweep, fuzz and Slither |

Web3, UI and slides are shared supporting work, not any member's only technical topic. Member 2 coordinates Web3 integration; each member verifies their own flow. Cross-review follows 1 → 2 → 3 → 1. Each person prepares a before/after table and three representative EVM tests, with results ready for reference rather than requiring all three to run during a 3–4 minute presentation. Each member supplies their own results/limitations for the conclusion; member 3 consolidates them. This is a responsibility plan, not a claim of historical code authorship or verified contribution percentages.

See [the detailed assignment and defense checklist](docs/group_report.md), [nine-slide speaking content](docs/defense-slides.md), [references](docs/report/05_tai_lieu_tham_khao.md) and [requirements/evidence appendix](docs/report/06_doi_chieu_va_minh_chung.md). Names/student IDs, final document export and manual-wallet verification remain group sign-off tasks, not automatically completed by this plan.
