/**
 * Layer 1 — Spec-based Mock Test Suite (18 cases)
 * Mirrors Crowdfunding.sol business logic in pure JS for fast, dependency-free
 * verification of rules and branches. Layer 2 (test/Crowdfunding.evm.test.js)
 * executes the REAL Crowdfunding.sol bytecode on Hardhat Network (real EVM).
 * Can be executed directly with: node test/Crowdfunding.test.js
 */

const crypto = require('crypto');

// Color helpers for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

class MockCrowdfunding {
  constructor(creator, goalWei, durationSeconds, initialTimestamp = 1000000) {
    if (goalWei <= 0n) throw new Error('GoalCannotBeZero');
    if (durationSeconds <= 0) throw new Error('InvalidDuration');

    this.creator = creator;
    this.goal = BigInt(goalWei);
    this.startAt = initialTimestamp;
    this.endAt = initialTimestamp + durationSeconds;
    this.currentTimestamp = initialTimestamp;

    this.pledged = 0n;
    this.claimed = false;
    this._reentrancyStatus = 1; // 1 = Unlocked, 2 = Locked
    this.pledgedAmount = new Map();
    this.contributorCount = 0;
    this.events = [];
    this.contractBalance = 0n;
  }

  // --- Modifiers ---
  _nonReentrant(fn) {
    if (this._reentrancyStatus === 2) throw new Error('ReentrancyGuardTriggered');
    this._reentrancyStatus = 2;
    try {
      return fn();
    } finally {
      this._reentrancyStatus = 1;
    }
  }

  _onlyCreator(caller) {
    if (caller.toLowerCase() !== this.creator.toLowerCase()) throw new Error('Unauthorized');
  }

  // --- Contract Methods ---
  pledge(sender, valueWei) {
    return this._nonReentrant(() => {
      const value = BigInt(valueWei);
      if (this.currentTimestamp >= this.endAt) throw new Error('CampaignEnded');
      if (value <= 0n) throw new Error('ZeroPledge');

      const prevAmount = this.pledgedAmount.get(sender) || 0n;
      if (prevAmount === 0n) {
        this.contributorCount++;
      }

      this.pledged += value;
      this.contractBalance += value;
      this.pledgedAmount.set(sender, prevAmount + value);

      this.events.push({
        event: 'Pledge',
        backer: sender,
        amount: value,
        totalPledged: this.pledged
      });
      return true;
    });
  }

  unpledge(sender, amountWei, externalCallHook = null) {
    return this._nonReentrant(() => {
      const amount = BigInt(amountWei);
      if (this.currentTimestamp >= this.endAt) throw new Error('CampaignEnded');
      const balance = this.pledgedAmount.get(sender) || 0n;
      if (amount <= 0n || balance < amount) throw new Error('NothingToRefund');

      // CEI Pattern: update state before external transfer
      this.pledged -= amount;
      this.contractBalance -= amount;
      const newBal = balance - amount;
      this.pledgedAmount.set(sender, newBal);
      if (newBal === 0n && this.contributorCount > 0) {
        this.contributorCount--;
      }

      this.events.push({
        event: 'Unpledge',
        backer: sender,
        amount: amount,
        totalPledged: this.pledged
      });

      // External interaction hook
      if (externalCallHook) {
        externalCallHook();
      }
      return true;
    });
  }

  claim(caller, externalCallHook = null) {
    return this._nonReentrant(() => {
      this._onlyCreator(caller);
      if (this.currentTimestamp < this.endAt) throw new Error('CampaignActive');
      if (this.pledged < this.goal) throw new Error('GoalNotReached');
      if (this.claimed) throw new Error('AlreadyClaimed');

      this.claimed = true;
      const balanceToClaim = this.contractBalance;
      this.contractBalance = 0n;

      this.events.push({
        event: 'Claim',
        creator: this.creator,
        totalAmount: balanceToClaim
      });

      if (externalCallHook) {
        externalCallHook();
      }
      return balanceToClaim;
    });
  }

  refund(sender, externalCallHook = null) {
    return this._nonReentrant(() => {
      if (this.currentTimestamp < this.endAt) throw new Error('CampaignActive');
      if (this.pledged >= this.goal) throw new Error('GoalAlreadyReached');

      const balance = this.pledgedAmount.get(sender) || 0n;
      if (balance === 0n) throw new Error('NothingToRefund');

      // CEI Pattern: zero out balance BEFORE transfer
      this.pledgedAmount.set(sender, 0n);
      this.pledged -= balance; // keep invariant: pledged == Σ pledgedAmount
      this.contractBalance -= balance;

      this.events.push({
        event: 'Refund',
        backer: sender,
        amount: balance
      });

      if (externalCallHook) {
        externalCallHook();
      }
      return balance;
    });
  }

  // --- Views ---
  state() {
    if (this.claimed) return 'Claimed';
    if (this.currentTimestamp < this.endAt) {
      return 'Active';
    } else {
      return this.pledged >= this.goal ? 'Successful' : 'Failed';
    }
  }

  timeLeft() {
    if (this.currentTimestamp >= this.endAt) return 0;
    return this.endAt - this.currentTimestamp;
  }

  // Fast forward helper for tests
  warpTime(newTimestamp) {
    this.currentTimestamp = newTimestamp;
  }
}

// ====================================================================
//                          TEST RUNNER
// ====================================================================

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function it(description, testFn) {
  try {
    testFn();
    console.log(`  ${colors.green}✔${colors.reset} ${description}`);
    passed++;
  } catch (err) {
    console.log(`  ${colors.red}✖${colors.reset} ${description}`);
    console.log(`    ${colors.red}Error: ${err.message}${colors.reset}`);
    failed++;
  }
}

console.log(`\n${colors.bright}${colors.cyan}====================================================${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}  Crowdfunding Smart Contract - Automated Test Suite  ${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}====================================================${colors.reset}\n`);

// 1. Initialization
console.log(`${colors.bright}[Group 1: Campaign Deployment & State]${colors.reset}`);
it('Should initialize campaign with correct creator, goal, and Active state', () => {
  const c = new MockCrowdfunding('0xCreator', 10n * 10n ** 18n, 86400);
  assert(c.creator === '0xCreator', 'Creator mismatch');
  assert(c.goal === 10n * 10n ** 18n, 'Goal mismatch');
  assert(c.state() === 'Active', 'Initial state should be Active');
  assert(c.timeLeft() === 86400, 'Time left calculation incorrect');
});

it('Should revert if target goal is zero', () => {
  let thrown = false;
  try {
    new MockCrowdfunding('0xCreator', 0n, 86400);
  } catch (e) {
    thrown = e.message === 'GoalCannotBeZero';
  }
  assert(thrown, 'Should revert with GoalCannotBeZero');
});

// 2. Pledging & Unpledging
console.log(`\n${colors.bright}[Group 2: Pledging & Unpledging Logic]${colors.reset}`);
it('Should accept pledges from multiple backers and track balances', () => {
  const c = new MockCrowdfunding('0xCreator', 5n * 10n ** 18n, 86400);
  c.pledge('0xAlice', 2n * 10n ** 18n);
  c.pledge('0xBob', 3n * 10n ** 18n);

  assert(c.pledged === 5n * 10n ** 18n, 'Total pledged mismatch');
  assert(c.pledgedAmount.get('0xAlice') === 2n * 10n ** 18n, 'Alice balance mismatch');
  assert(c.pledgedAmount.get('0xBob') === 3n * 10n ** 18n, 'Bob balance mismatch');
  assert(c.contributorCount === 2, 'Contributor count mismatch');
});

it('Should allow partial unpledge while campaign is active', () => {
  const c = new MockCrowdfunding('0xCreator', 5n * 10n ** 18n, 86400);
  c.pledge('0xAlice', 3n * 10n ** 18n);
  c.unpledge('0xAlice', 1n * 10n ** 18n);

  assert(c.pledged === 2n * 10n ** 18n, 'Total pledged should decrement');
  assert(c.pledgedAmount.get('0xAlice') === 2n * 10n ** 18n, 'Alice balance should decrement');
  assert(c.contributorCount === 1, 'Contributor should remain counted');
});

it('Should decrement contributorCount to 0 when all funds are unpledged', () => {
  const c = new MockCrowdfunding('0xCreator', 5n * 10n ** 18n, 86400);
  c.pledge('0xAlice', 2n * 10n ** 18n);
  c.unpledge('0xAlice', 2n * 10n ** 18n);

  assert(c.contributorCount === 0, 'Contributor count should be 0');
  assert(c.pledgedAmount.get('0xAlice') === 0n, 'Balance should be 0');
});

// 3. Success Path (Goal Reached)
console.log(`\n${colors.bright}[Group 3: Success Lifecycle (Goal Met)]${colors.reset}`);
it('Should transition to Successful once deadline passed with goal met', () => {
  const c = new MockCrowdfunding('0xCreator', 5n * 10n ** 18n, 86400);
  c.pledge('0xAlice', 6n * 10n ** 18n);
  c.warpTime(c.endAt + 1);

  assert(c.state() === 'Successful', 'State should be Successful');
});

it('Should allow creator to claim all funds when successful', () => {
  const c = new MockCrowdfunding('0xCreator', 5n * 10n ** 18n, 86400);
  c.pledge('0xAlice', 6n * 10n ** 18n);
  c.warpTime(c.endAt + 1);

  const claimedAmt = c.claim('0xCreator');
  assert(claimedAmt === 6n * 10n ** 18n, 'Creator should receive all funds');
  assert(c.claimed === true, 'Claimed flag should be true');
  assert(c.state() === 'Claimed', 'State should be Claimed');
});

it('Should prevent non-creator from claiming funds (Unauthorized)', () => {
  const c = new MockCrowdfunding('0xCreator', 5n * 10n ** 18n, 86400);
  c.pledge('0xAlice', 6n * 10n ** 18n);
  c.warpTime(c.endAt + 1);

  let thrown = false;
  try {
    c.claim('0xHacker');
  } catch (e) {
    thrown = e.message === 'Unauthorized';
  }
  assert(thrown, 'Unauthorized caller must revert');
});

it('Should prevent refunds when campaign was successful (GoalAlreadyReached)', () => {
  const c = new MockCrowdfunding('0xCreator', 5n * 10n ** 18n, 86400);
  c.pledge('0xAlice', 6n * 10n ** 18n);
  c.warpTime(c.endAt + 1);

  let thrown = false;
  try {
    c.refund('0xAlice');
  } catch (e) {
    thrown = e.message === 'GoalAlreadyReached';
  }
  assert(thrown, 'Refund must revert when goal was reached');
});

// 4. Failure Path (Goal Not Met)
console.log(`\n${colors.bright}[Group 4: Failure & Safe Refund Lifecycle]${colors.reset}`);
it('Should transition to Failed when deadline passes without reaching goal', () => {
  const c = new MockCrowdfunding('0xCreator', 10n * 10n ** 18n, 86400);
  c.pledge('0xAlice', 3n * 10n ** 18n);
  c.warpTime(c.endAt + 1);

  assert(c.state() === 'Failed', 'State should be Failed');
});

it('Should prevent creator from claiming when goal not reached', () => {
  const c = new MockCrowdfunding('0xCreator', 10n * 10n ** 18n, 86400);
  c.pledge('0xAlice', 3n * 10n ** 18n);
  c.warpTime(c.endAt + 1);

  let thrown = false;
  try {
    c.claim('0xCreator');
  } catch (e) {
    thrown = e.message === 'GoalNotReached';
  }
  assert(thrown, 'Should revert with GoalNotReached');
});

it('Should allow backer to refund exact contributed amount', () => {
  const c = new MockCrowdfunding('0xCreator', 10n * 10n ** 18n, 86400);
  c.pledge('0xAlice', 3n * 10n ** 18n);
  c.warpTime(c.endAt + 1);

  const refunded = c.refund('0xAlice');
  assert(refunded === 3n * 10n ** 18n, 'Alice should get back 3 ETH');
  assert(c.pledgedAmount.get('0xAlice') === 0n, 'Alice balance should be 0');
});

it('Should prevent double refund (NothingToRefund)', () => {
  const c = new MockCrowdfunding('0xCreator', 10n * 10n ** 18n, 86400);
  c.pledge('0xAlice', 3n * 10n ** 18n);
  c.warpTime(c.endAt + 1);

  c.refund('0xAlice');

  let thrown = false;
  try {
    c.refund('0xAlice');
  } catch (e) {
    thrown = e.message === 'NothingToRefund';
  }
  assert(thrown, 'Second refund must revert');
});

// 5. Security & Threat Modeling
console.log(`\n${colors.bright}[Group 5: Security Audit & Reentrancy Resilience]${colors.reset}`);
it('Should thwart Reentrancy Attack attempt via Reentrancy Guard', () => {
  const c = new MockCrowdfunding('0xCreator', 10n * 10n ** 18n, 86400);
  c.pledge('0xAttacker', 2n * 10n ** 18n);
  c.warpTime(c.endAt + 1);

  let reentrancyBlocked = false;
  try {
    // Simulate malicious fallback that attempts to re-enter refund()
    c.refund('0xAttacker', () => {
      c.refund('0xAttacker');
    });
  } catch (e) {
    reentrancyBlocked = e.message === 'ReentrancyGuardTriggered';
  }
  assert(reentrancyBlocked, 'Reentrancy guard must trigger on nested call');
});

it('Should prevent pledge after campaign has ended', () => {
  const c = new MockCrowdfunding('0xCreator', 10n * 10n ** 18n, 86400);
  c.warpTime(c.endAt + 1);

  let thrown = false;
  try {
    c.pledge('0xAlice', 1n * 10n ** 18n);
  } catch (e) {
    thrown = e.message === 'CampaignEnded';
  }
  assert(thrown, 'Late pledge must revert with CampaignEnded');
});

// Auditor Recommended Boundary Tests
it('Should strictly enforce boundary at exact endAt second (block.timestamp == endAt)', () => {
  const c = new MockCrowdfunding('0xCreator', 10n * 10n ** 18n, 86400);
  // Warp to exactly endAt
  c.warpTime(c.endAt);

  // 1. Pledge must revert at exact endAt
  let pledgeBlocked = false;
  try {
    c.pledge('0xAlice', 1n * 10n ** 18n);
  } catch (e) {
    pledgeBlocked = e.message === 'CampaignEnded';
  }
  assert(pledgeBlocked, 'Pledge must revert at exact endAt second');

  // 2. Settlement condition is satisfied (time check passes)
  assert(c.state() === 'Failed', 'State should be Failed at exact endAt since goal not met');
});

it('Should transition to Successful when pledged equals goal exactly (pledged == goal exact wei)', () => {
  const exactGoal = 10n * 10n ** 18n;
  const c = new MockCrowdfunding('0xCreator', exactGoal, 86400);
  c.pledge('0xAlice', exactGoal); // Exactly 10.000000000000000000 ETH
  c.warpTime(c.endAt);

  assert(c.pledged === exactGoal, 'Pledged must equal exact goal');
  assert(c.state() === 'Successful', 'Must qualify as Successful using >= operator');
});

it('Should emit proper events with correct indexed arguments for tracking', () => {
  const c = new MockCrowdfunding('0xCreator', 5n * 10n ** 18n, 86400);
  c.pledge('0xAlice', 5n * 10n ** 18n);
  c.warpTime(c.endAt);
  c.claim('0xCreator');

  const pledgeEvt = c.events.find(e => e.event === 'Pledge');
  const claimEvt = c.events.find(e => e.event === 'Claim');

  assert(pledgeEvt && pledgeEvt.backer === '0xAlice' && pledgeEvt.amount === 5n * 10n ** 18n, 'Pledge event verification failed');
  assert(claimEvt && claimEvt.creator === '0xCreator' && claimEvt.totalAmount === 5n * 10n ** 18n, 'Claim event verification failed');
});

// Summary
console.log(`\n${colors.bright}${colors.cyan}----------------------------------------------------${colors.reset}`);
console.log(`${colors.bright}Test Summary:${colors.reset} Passed: ${colors.green}${passed}${colors.reset} | Failed: ${failed > 0 ? colors.red + failed : colors.dim + '0'}${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}----------------------------------------------------${colors.reset}\n`);

if (failed > 0) process.exit(1);
