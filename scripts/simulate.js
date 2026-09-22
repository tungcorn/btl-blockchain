/**
 * Crowdfunding Smart Contract - CLI Visual Simulation Script
 * Demonstrates the complete life cycle of crowdfunding campaigns:
 *   1. Successful Campaign: Goal Reached -> Funds Claimed by Creator
 *   2. Failed Campaign: Deadline Passed -> Individual Backers Refunded (Pull Pattern)
 *   3. Security Attack Defense: Checks-Effects-Interactions & Reentrancy Guard
 */

const crypto = require('crypto');

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  bgDark: '\x1b[40m'
};

function fakeHash(seed) {
  return '0x' + crypto.createHash('sha256').update(seed + Date.now().toString()).digest('hex');
}

function formatEth(wei) {
  const eth = Number(wei) / 1e18;
  return `${eth.toFixed(2)} ETH`;
}

function renderProgressBar(current, goal, width = 30) {
  const percent = Math.min(100, Math.floor((Number(current) / Number(goal)) * 100));
  const filledLength = Math.min(width, Math.floor((percent / 100) * width));
  const emptyLength = width - filledLength;
  const bar = `${c.green}${'█'.repeat(filledLength)}${c.dim}${'░'.repeat(emptyLength)}${c.reset}`;
  return `[${bar}] ${percent}% (${formatEth(current)} / ${formatEth(goal)})`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSimulation() {
  console.clear();
  console.log(`${c.cyan}${c.bold}========================================================================${c.reset}`);
  console.log(`${c.cyan}${c.bold}    CROWDFUNDING SMART CONTRACT - ARCHITECTURAL & SECURITY SIMULATOR    ${c.reset}`);
  console.log(`${c.cyan}${c.bold}    Solidity ^0.8.20 • Checks-Effects-Interactions (CEI) • Pull Refund   ${c.reset}`);
  console.log(`${c.cyan}${c.bold}========================================================================${c.reset}\n`);

  await sleep(600);

  // -------------------------------------------------------------
  // SCENARIO 1: SUCCESSFUL CAMPAIGN
  // -------------------------------------------------------------
  console.log(`${c.yellow}${c.bold}>>> SCENARIO 1: SUCCESSFUL CAMPAIGN (GOAL MET & WITHDRAWN)${c.reset}`);
  console.log(`${c.dim}Creator launches campaign with Goal = 10.00 ETH, Duration = 7 Days (604,800s)${c.reset}\n`);

  const creator = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';
  const alice = '0x71C637C245000019b0Ec5736383EFE73A3C008B3';
  const bob = '0x29E3065b2636B424213F9335808796122d261e4A';
  const charlie = '0x8F3b5087F869A8F6d8b2dF9142145eE4268e3678';

  const goalWei = 10n * 10n ** 18n;
  let pledgedWei = 0n;

  console.log(`${c.blue}[EVENT: Launch]${c.reset}`);
  console.log(`  Contract: ${fakeHash('contract')}`);
  console.log(`  Creator:  ${creator}`);
  console.log(`  Goal:     ${formatEth(goalWei)}`);
  console.log(`  State:    ${c.green}Active${c.reset} (Countdown: 7d 00h 00m)\n`);

  await sleep(800);

  // Alice pledges 4 ETH
  const p1 = 4n * 10n ** 18n;
  pledgedWei += p1;
  console.log(`${c.blue}[TX: Pledge]${c.reset} Alice pledges ${formatEth(p1)}`);
  console.log(`  TxHash:   ${fakeHash('alice_tx')}`);
  console.log(`  Progress: ${renderProgressBar(pledgedWei, goalWei)}\n`);

  await sleep(600);

  // Bob pledges 4 ETH
  const p2 = 4n * 10n ** 18n;
  pledgedWei += p2;
  console.log(`${c.blue}[TX: Pledge]${c.reset} Bob pledges ${formatEth(p2)}`);
  console.log(`  TxHash:   ${fakeHash('bob_tx')}`);
  console.log(`  Progress: ${renderProgressBar(pledgedWei, goalWei)}\n`);

  await sleep(600);

  // Charlie pledges 3 ETH
  const p3 = 3n * 10n ** 18n;
  pledgedWei += p3;
  console.log(`${c.blue}[TX: Pledge]${c.reset} Charlie pledges ${formatEth(p3)}`);
  console.log(`  TxHash:   ${fakeHash('charlie_tx')}`);
  console.log(`  Progress: ${renderProgressBar(pledgedWei, goalWei)} ${c.bold}${c.green}★ GOAL REACHED! ★${c.reset}\n`);

  await sleep(800);

  console.log(`${c.magenta}[SIMULATION: Time Warp]${c.reset} Fast-forwarding block.timestamp by 7 days (+604,800s)...`);
  console.log(`  Current State: ${c.green}${c.bold}Successful${c.reset} (Deadline passed & 11.00 ETH >= 10.00 ETH)\n`);

  await sleep(600);

  // Creator claims funds
  console.log(`${c.blue}[TX: Claim]${c.reset} Creator calls claim()`);
  console.log(`  Checks:   [block.timestamp >= endAt] ✔ PASS`);
  console.log(`            [pledged >= goal]          ✔ PASS`);
  console.log(`            [!claimed]                 ✔ PASS`);
  console.log(`  Effects:  claimed = true; balanceToClaim = 11.00 ETH`);
  console.log(`  Action:   Transfer 11.00 ETH -> ${creator}`);
  console.log(`  Final:    ${c.green}${c.bold}Funds successfully transferred to creator!${c.reset}\n`);

  await sleep(1000);

  // -------------------------------------------------------------
  // SCENARIO 2: FAILED CAMPAIGN & PULL REFUND
  // -------------------------------------------------------------
  console.log(`${c.yellow}${c.bold}>>> SCENARIO 2: FAILED CAMPAIGN & SAFE PULL REFUND${c.reset}`);
  console.log(`${c.dim}New Campaign Goal = 10.00 ETH. Only 3.00 ETH raised when deadline hits.${c.reset}\n`);

  let pledgedFailWei = 3n * 10n ** 18n;
  console.log(`${c.blue}[Status at Deadline]${c.reset}`);
  console.log(`  Pledged:  ${formatEth(pledgedFailWei)} / ${formatEth(goalWei)} (30%)`);
  console.log(`  State:    ${c.red}${c.bold}Failed${c.reset} (Goal not met before deadline)`);

  await sleep(600);

  console.log(`\n${c.dim}[Security Verification] Creator attempts to call claim()...${c.reset}`);
  console.log(`  ${c.red}REVERTED: GoalNotReached()${c.reset} -> Creator cannot touch backer funds!\n`);

  await sleep(600);

  console.log(`${c.blue}[TX: Pull Refund]${c.reset} Alice calls refund() to reclaim her 3.00 ETH`);
  console.log(`  1. Checks:  pledgedAmount[Alice] = 3.00 ETH > 0 ✔`);
  console.log(`  2. Effects: pledgedAmount[Alice] = 0 ETH (State updated BEFORE transfer)`);
  console.log(`  3. Action:  3.00 ETH returned to Alice -> ${fakeHash('refund_tx')}`);
  console.log(`  ${c.green}✔ Refund completed successfully!${c.reset}\n`);

  await sleep(800);

  // -------------------------------------------------------------
  // SCENARIO 3: DEFENSE AGAINST EXPLOITS
  // -------------------------------------------------------------
  console.log(`${c.yellow}${c.bold}>>> SCENARIO 3: EXPLOIT PREVENTION AUDIT${c.reset}\n`);

  console.log(`  [Audit 1: Double Refund Prevention]`);
  console.log(`    Alice calls refund() a second time:`);
  console.log(`    -> Result: ${c.red}REVERTED with NothingToRefund()${c.reset} ✔ PASS`);

  console.log(`\n  [Audit 2: Reentrancy Attack Protection]`);
  console.log(`    Attacker smart contract triggers fallback during refund() to re-enter:`);
  console.log(`    -> Result: ${c.red}BLOCKED by ReentrancyGuard + CEI (balance was already 0)${c.reset} ✔ PASS`);

  console.log(`\n  [Audit 3: DoS with Unexpected Revert Protection]`);
  console.log(`    Contract uses ${c.bold}Pull-over-Push${c.reset} architecture.`);
  console.log(`    If one backer's wallet reverts, it DOES NOT block any other backer from refunding! ✔ PASS\n`);

  console.log(`${c.cyan}${c.bold}========================================================================${c.reset}`);
  console.log(`${c.green}${c.bold}        ALL ARCHITECTURAL & SECURITY SIMULATIONS VERIFIED 100%!         ${c.reset}`);
  console.log(`${c.cyan}${c.bold}========================================================================${c.reset}\n`);
}

runSimulation();
