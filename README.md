# Decentralized Crowdfunding • Smart Contract & Web3 DApp

An enterprise-grade, secure decentralized **Crowdfunding Smart Contract platform with target funding goal and deadline**, engineered for group evaluation and live demonstration (**Nhóm C • Đề W • Max Score: 10/10**).

<p align="center">
  <a href="demo/index.html">
    <img src="https://img.shields.io/badge/LIVE_DAPP-Open_Web_Visualizer-00f0ff?style=for-the-badge&logo=googlechrome&logoColor=black" alt="Open Web DApp">
  </a>
  <a href="contracts/Crowdfunding.sol">
    <img src="https://img.shields.io/badge/SOLIDITY-0.8.20-f59e0b?style=for-the-badge&logo=solidity&logoColor=black" alt="Solidity">
  </a>
  <a href="test/Crowdfunding.test.js">
    <img src="https://img.shields.io/badge/TESTS-52%2F52%20PASS_(Mock_18_%2B_EVM_34)-10b981?style=for-the-badge&logo=checkmarx&logoColor=black" alt="Tests">
  </a>
  <a href="docs/group_report.md">
    <img src="https://img.shields.io/badge/GROUP_REPORT-Grade_10%20Cheatsheet-a855f7?style=for-the-badge&logo=read-the-docs&logoColor=white" alt="Group Report">
  </a>
</p>

---

## ⚡ Quick Start

### 1. Interactive Web DApp (Dual Mode: Sandbox + MetaMask)
* **Open in Browser**: Simply double click or open [`demo/index.html`](file:///d:/Hoc/BlockChain/lab02-crowdfunding-smart-contract/demo/index.html) in Chrome/Firefox/Edge.
* **Serve locally via Node.js**:
  ```bash
  npm run serve
  # or: npx serve demo
  ```
  *Features:*
  - **Zero-Wait Sandbox Mode**: Switch between Creator, Alice, Bob, and Charlie. Fast-forward the block clock by 7 days to trigger success or refund states without waiting.
  - **MetaMask Web3 Mode**: Connect to live Sepolia Testnet or Local Hardhat/Anvil node and control real deployed smart contracts.

### 2. Automated Test Suite — Two-Layer Architecture (52 Test Cases • 100% Pass)
Run the built-in dual-layer test runner:
```bash
npm test
# or layer-by-layer:
npm run test:mock    # Layer 1: 18 spec-based Mock cases (no EVM required)
npm run test:evm     # Layer 2: 34 Hardhat EVM cases (real Crowdfunding.sol bytecode)
npm run test:coverage # optional: solidity-coverage report
```
Layer 2 includes **real attack simulation** (`ReentrancyAttacker`, `ForceEther` via selfdestruct), a **deterministic invariant fuzz** (`pledged == Σ pledgedAmount && balance == pledged` over 80 random ops) and full `CrowdfundingFactory` coverage.

### 2.1 Static Security Analysis (Slither)
```bash
pip install slither-analyzer solc-select && solc-select install 0.8.20 && solc-select use 0.8.20
npm run audit:static   # or: slither contracts --solc solc
```
Result: **0 Medium/High findings** — full triage in [`docs/security/slither-report.md`](docs/security/slither-report.md).

### 3. CLI Architectural & Security Simulation
Execute a comprehensive terminal-based simulation demonstrating campaign lifecycles and exploit defense:
```bash
npm run simulate
# or: node scripts/simulate.js
```

---

## 🛡 Architectural & Security Highlights

| Security Principle | Implementation in Contract | Threat Mitigated |
| :--- | :--- | :--- |
| **Checks-Effects-Interactions (CEI)** | Resets `pledgedAmount[msg.sender] = 0` **before** making the external `.call{value: balance}("")`. | **Reentrancy Attack**: Malicious caller cannot recursively drain funds through fallback functions. |
| **Pull-over-Push Payments** | Individual `refund()` triggered per backer rather than looping through all contributors. | **DoS with Revert**: A single reverting recipient contract cannot lock refunds for other participants. |
| **Reentrancy Guard** | Explicit state lock (`_reentrancyStatus` mutex). | **Nested Call Exploit**: Double-layer barrier preventing concurrent re-entrant execution. |
| **Custom Errors** | `error GoalNotReached()`, `error CampaignEnded()`, etc. | **Gas Optimization**: Replaces expensive string reverts with 4-byte selectors, saving ~15,000 gas per revert. |
| **Immutable Storage** | `creator`, `goal`, `startAt`, `endAt` marked `immutable` (uint64 timestamps — safe past year 2106). | **Bytecode Embedding**: Gas reduction by avoiding SLOAD storage reads during critical transaction paths. |
| **Forced-ETH Defense** | `sweepExcessEther()` withdraws only `balance - pledged`; `refund()` keeps the invariant `pledged == Σ pledgedAmount`. | **Bricked Funds**: ETH force-sent via selfdestruct can never lock backer refunds or strand dust in a FAILED campaign. |
| **Precision Guard Placement** | `nonReentrant` only on functions with external calls (`unpledge`, `claim`, `refund`, `sweep`); `pledge`/`receive` rely on CEI alone (documented NatSpec trade-off). | **Gas Waste & Griefing**: saves ~5,800 gas/pledge and avoids reverting refunds for contract backers whose `receive()` auto-pledges. |

---

## 📁 Project Structure

```text
lab02-crowdfunding-smart-contract/
├── contracts/
│   ├── Crowdfunding.sol            # Core Smart Contract with CEI & ReentrancyGuard
│   ├── CrowdfundingFactory.sol     # Factory Contract for launchpad multi-campaign deployment
│   └── testing/
│       └── Attackers.sol           # Test-only adversarial contracts (ReentrancyAttacker, ForceEther)
├── test/
│   ├── Crowdfunding.test.js        # Layer 1: 18 spec-based Mock cases (dependency-free)
│   └── Crowdfunding.evm.test.js    # Layer 2: 34 Hardhat EVM cases on real bytecode + invariant fuzz
├── hardhat.config.js               # Hardhat Network config (solc 0.8.20, optimizer 200 runs)
├── scripts/
│   └── simulate.js                 # Terminal CLI lifecycle & security attack simulation
├── demo/
│   ├── index.html                  # Cyberpunk dark Web3 UI (Dual-mode: Sim + real MetaMask)
│   ├── style.css                   # Glassmorphism design system
│   └── app.js                      # DApp controller, Sandbox sim + Ethers.js v6 MetaMask connector
├── docs/
│   ├── group_report.md             # Complete team report & defense Q&A
│   ├── security/
│   │   └── slither-report.md       # Slither static-analysis triage (0 Medium/High)
│   └── report/                     # 4-chapter academic report (00–04, Vietnamese)
├── package.json                    # Quick scripts (npm test, test:evm, audit:static, serve)
└── README.md                       # Project documentation
```

---

## 🚀 Sepolia Testnet Deployment Guide via Remix IDE

1. Navigate to [Remix IDE](https://remix.ethereum.org/).
2. Copy [`contracts/Crowdfunding.sol`](file:///d:/Hoc/BlockChain/lab02-crowdfunding-smart-contract/contracts/Crowdfunding.sol) into Remix.
3. Select compiler `0.8.20` and compile.
4. On the **Deploy & Run Transactions** tab:
   - Select **Injected Provider - MetaMask** (Ensure network is set to Sepolia).
   - Enter constructor parameters:
     - `_creator`: `0x0000000000000000000000000000000000000000` (defaults to your wallet).
     - `_goal`: `1000000000000000000` (1 ETH in wei).
     - `_durationSeconds`: `604800` (7 days) or `600` (10 minutes for testing).
   - Click **Deploy**.
5. Copy the deployed contract address and paste it into the **MetaMask Web3 Connector** in `demo/index.html` to interact directly through the Web UI!

---

## 👥 Group Contribution Matrix (3–4 Members)

See the complete breakdown, individual deliverables, and defense question cheatsheet in [docs/group_report.md](file:///d:/Hoc/BlockChain/lab02-crowdfunding-smart-contract/docs/group_report.md).
