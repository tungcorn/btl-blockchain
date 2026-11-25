// Real Solidity / RPC / Ethers / browser UI. The EIP-1193 adapter uses public
// unlocked Hardhat accounts, NOT a MetaMask extension or mocked contract results.
const { test, expect } = require('@playwright/test');
const { writeFile } = require('node:fs/promises');
const { JsonRpcProvider, ContractFactory, parseEther, formatEther } = require('ethers');
const artifact = require('../../artifacts/contracts/Crowdfunding.sol/Crowdfunding.json');

const RPC = 'http://127.0.0.1:18545';
const ORIGIN = 'http://127.0.0.1:13000';
const provider = new JsonRpcProvider(RPC, 31337, { cacheTimeout: -1 });
const allowedMethods = new Set([
  'eth_chainId', 'eth_blockNumber', 'eth_getBalance', 'eth_call',
  'eth_estimateGas', 'eth_sendTransaction', 'eth_getTransactionByHash',
  'eth_getTransactionReceipt', 'eth_getBlockByNumber', 'eth_gasPrice',
  'eth_maxPriorityFeePerGas', 'eth_getTransactionCount'
]);
let creator, alice, bob;

test.beforeAll(async () => {
  expect((await provider.getNetwork()).chainId).toBe(31337n);
  [creator, alice, bob] = await Promise.all([0, 1, 2].map(i => provider.getSigner(i)));
});
test.afterAll(() => provider.destroy());

async function deploy() {
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, creator);
  const contract = await factory.deploy(creator.address, parseEther('0.01'), 600);
  const receipt = await contract.deploymentTransaction().wait();
  expect(receipt.status).toBe(1);
  return contract;
}

async function browserSession(page, contracts, account) {
  let current = account;
  const targets = new Set(await Promise.all(contracts.map(async c => (await c.getAddress()).toLowerCase())));
  const sends = [], reads = [], errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    if (!route.request().url().startsWith(ORIGIN + '/')) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.exposeFunction('localTestRpc', async ({ method, params = [] }) => {
    if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [current];
    expect(allowedMethods.has(method), `Unexpected browser RPC method: ${method}`).toBe(true);
    if (method === 'eth_sendTransaction') {
      expect(params[0].from.toLowerCase()).toBe(current.toLowerCase());
      expect(targets.has(params[0].to.toLowerCase())).toBe(true);
    }
    const result = await provider.send(method, params);
    if (method === 'eth_sendTransaction') sends.push(result);
    if (method === 'eth_getBalance') reads.push({ address: params[0].toLowerCase(), result });
    return result;
  });
  await page.addInitScript(() => {
    const listeners = {};
    window.ethereum = {
      request: args => window.localTestRpc(args),
      on: (event, handler) => { listeners[event] = handler; }
    };
    window.localTestAccountsChanged = accounts => listeners.accountsChanged(accounts);
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.click('#tabBtnWeb3');
  return {
    page, sends, reads, errors, external,
    async connect(contract) {
      await page.fill('#web3ContractAddress', await contract.getAddress());
      await page.click('#btnConnectWallet');
      await expect(page.locator('#web3Status')).toContainText('contributorCount');
      await idle(page);
    },
    async switchAccount(address) {
      current = address;
      await page.evaluate(address => window.localTestAccountsChanged([address]), address);
      await expect(page.locator('#web3Status')).toContainText('contributorCount');
      await idle(page);
    }
  };
}

async function idle(page) {
  await page.waitForFunction(() => !WEB3.txPending &&
    !document.querySelector('#btnW3Refresh').classList.contains('is-loading'));
}

async function verifyBalances(session, contract, account) {
  const balance = BigInt(await provider.send('eth_getBalance', [await contract.getAddress(), 'latest']));
  const wallet = BigInt(await provider.send('eth_getBalance', [account, 'latest']));
  // Plain assertions after automatic refresh: no retry/refresh/sleep hides stale values.
  expect(await session.page.locator('#w3ContractBalance').innerText()).toBe(`${formatEther(balance)} ETH`);
  expect(await session.page.locator('#w3WalletBalance').innerText()).toBe(`Số dư ví: ${parseFloat(formatEther(wallet)).toFixed(4)} ETH`);
  expect(await session.page.locator('#w3MyPledge').innerText()).toBe(`${formatEther(await contract.pledgedAmount(account))} ETH`);
  return { balanceWei: String(balance), pledgedWei: String(await contract.pledged()), accountPledgedWei: String(await contract.pledgedAmount(account)) };
}

async function transact(session, contract, account, button, amount, evidence) {
  if (amount !== undefined) await session.page.fill('#web3PledgeAmount', amount);
  await expect(session.page.locator(button)).toBeEnabled();
  const count = session.sends.length;
  const beforeReads = session.reads.length;
  await session.page.click(button);
  await expect.poll(() => session.sends.length).toBe(count + 1);
  await idle(session.page);
  const hash = session.sends[count];
  const receipt = await provider.send('eth_getTransactionReceipt', [hash]);
  expect(receipt.status).toBe('0x1');
  // Prove the refresh actually requested wallet + contract balances, not cached results.
  const addresses = session.reads.slice(beforeReads).map(read => read.address);
  expect(addresses).toContain((await contract.getAddress()).toLowerCase());
  expect(addresses).toContain(account.toLowerCase());
  const snapshot = await verifyBalances(session, contract, account);
  evidence.push({ action: button, hash, status: receipt.status, blockNumber: parseInt(receipt.blockNumber, 16), ...snapshot });
}

async function attach(info, page, evidence) {
  const json = info.outputPath('real-local-evm-receipts.json');
  await writeFile(json, JSON.stringify({
    chainId: 31337, rpc: RPC,
    scope: 'Real browser and local EVM; public unlocked accounts; no MetaMask signing. Settlement tests advance local node time.',
    transactions: evidence
  }, null, 2) + '\n');
  await info.attach('real-local-evm-receipts', { path: json, contentType: 'application/json' });
  const file = info.outputPath('real-local-evm.png');
  await page.screenshot({ path: file });
  await info.attach('real-local-evm', { path: file, contentType: 'image/png' });
}

test('real EVM: automatic balances through pledge, partial withdrawal, claim and refund', async ({ page, context }, info) => {
  const success = await deploy();
  const failure = await deploy();
  const evidence = [];
  const aliceView = await browserSession(page, [success, failure], alice.address);
  const creatorView = await browserSession(await context.newPage(), [success], creator.address);
  await creatorView.connect(success);
  for (const campaign of [success, failure]) {
    await aliceView.connect(campaign);
    await transact(aliceView, campaign, alice.address, '#btnW3Pledge', '0.003', evidence);
    await transact(aliceView, campaign, alice.address, '#btnW3Unpledge', '0.001', evidence);
    expect(await campaign.pledgedAmount(alice.address)).toBe(parseEther('0.002'));
  }
  await aliceView.connect(success);
  const beforeInvalid = aliceView.sends.length;
  await page.fill('#web3PledgeAmount', '0.003');
  await page.click('#btnW3Unpledge');
  await expect(page.locator('#toastStack')).toContainText('vượt khoản đã góp');
  await idle(page);
  expect(aliceView.sends.length).toBe(beforeInvalid);
  await transact(aliceView, success, alice.address, '#btnW3Pledge', '0.008', evidence);
  expect(await success.state()).toBe(0n);
  await expect(creatorView.page.locator('#btnW3Claim')).toBeDisabled();
  const endAt = Math.max(Number(await success.endAt()), Number(await failure.endAt()));
  await provider.send('evm_setNextBlockTimestamp', [endAt]);
  await provider.send('evm_mine', []);
  // Explicit refresh is needed for external time changes, never after a UI transaction.
  await page.click('#btnW3Refresh');
  await idle(page);
  await expect(page.locator('#btnW3Claim')).toBeDisabled();
  await creatorView.page.click('#btnW3Refresh');
  await idle(creatorView.page);
  await transact(creatorView, success, creator.address, '#btnW3Claim', undefined, evidence);
  expect(await creatorView.page.locator('#w3State').innerText()).toBe('Claimed');
  expect(await creatorView.page.locator('#w3Pledged').innerText()).toBe('0.01 / 0.01 ETH');
  expect(await success.claimed()).toBe(true);
  await expect(creatorView.page.locator('#btnW3Claim')).toBeDisabled();
  await aliceView.connect(failure);
  await transact(aliceView, failure, alice.address, '#btnW3Refund', undefined, evidence);
  expect(await failure.pledged()).toBe(0n);
  await expect(page.locator('#btnW3Refund')).toBeDisabled();
  for (const session of [aliceView, creatorView]) {
    expect(session.errors).toEqual([]);
    expect(session.external).toEqual([]);
  }
  expect(evidence).toHaveLength(7);
  await attach(info, creatorView.page, evidence);
});

test('real EVM: cached latest reads cannot hide a newly mined balance', async ({ page }) => {
  const campaign = await deploy();
  const session = await browserSession(page, [campaign], alice.address);
  // Same real Ethers cache, with a longer default window to make the regression
  // deterministic on slower machines. Production's explicit options take priority.
  // No RPC responses, contracts or balance values are mocked.
  await page.evaluate(() => {
    const RealBrowserProvider = ethers.BrowserProvider;
    window.ethers = { ...ethers, BrowserProvider: class extends RealBrowserProvider {
      constructor(injected, network, options) {
        super(injected, network, { cacheTimeout: 60000, ...options });
      }
    } };
  });
  await session.connect(campaign);
  expect(await page.locator('#w3ContractBalance').innerText()).toBe('0.0 ETH');
  const receipt = await (await campaign.connect(alice).pledge({ value: parseEther('0.003') })).wait();
  expect(receipt.status).toBe(1);
  // Read once, immediately after the real mined update; no polling of UI values.
  await page.evaluate(() => refreshOnChainState());
  await verifyBalances(session, campaign, alice.address);
  expect(session.errors).toEqual([]);
  expect(session.external).toEqual([]);
});

test('real EVM: switched-account and reconnected providers also refresh without stale balances', async ({ page }, info) => {
  const campaign = await deploy();
  const evidence = [];
  const session = await browserSession(page, [campaign], alice.address);
  await session.connect(campaign);
  await session.switchAccount(bob.address);
  await transact(session, campaign, bob.address, '#btnW3Pledge', '0.003', evidence);
  await transact(session, campaign, bob.address, '#btnW3Unpledge', '0.001', evidence);
  await session.connect(campaign);
  await transact(session, campaign, bob.address, '#btnW3Unpledge', '0.002', evidence);
  expect(await campaign.pledgedAmount(bob.address)).toBe(0n);
  expect(await campaign.contributorCount()).toBe(0n);
  await expect(page.locator('#btnW3Unpledge')).toBeDisabled();
  expect(session.errors).toEqual([]);
  expect(session.external).toEqual([]);
  await attach(info, page, evidence);
});
