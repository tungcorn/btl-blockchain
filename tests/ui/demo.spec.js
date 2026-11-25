const { test, expect } = require('@playwright/test');
const { installWallet } = require('./wallet-fixture');
const observations = new WeakMap();

test.beforeEach(async ({ page }) => {
  const observed = { errors: [], external: [] };
  observations.set(page, observed);
  page.on('pageerror', error => observed.errors.push(error.message));
  // No CDN fallback: run the real demo while external network requests are blocked.
  await page.route('**/*', route => {
    if (!route.request().url().startsWith('http://127.0.0.1:3000/')) {
      observed.external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
});

test.afterEach(async ({ page }) => {
  expect(observations.get(page)).toEqual({ errors: [], external: [] });
});

async function amount(page, value, button) {
  await page.fill('#pledgeInput', value);
  await page.click(button);
}
async function connect(page, options) {
  await installWallet(page, options);
  await page.click('#btnConnectWallet');
}
async function connected(page) {
  await expect(page.locator('#w3State')).toHaveText('Active');
  await expect(page.locator('#btnW3Pledge')).toBeEnabled();
}
async function locked(page) {
  for (const id of ['btnW3Pledge', 'btnW3Unpledge', 'btnW3Claim', 'btnW3Refund']) {
    await expect(page.locator('#' + id)).toBeDisabled();
  }
}

test('local assets render both themes without CDN or horizontal overflow', async ({ page }, info) => {
  expect(await page.evaluate(() => ethers.version)).toBe('6.17.0');
  expect(await page.evaluate(() => document.fonts.check('14px "Be Vietnam Pro"'))).toBe(true);
  expect(await page.evaluate(() => document.fonts.check('14px "JetBrains Mono"'))).toBe(true);
  for (const theme of ['dark', 'light']) {
    if (theme === 'light') await page.click('#btnThemeToggle');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const screenshot = info.outputPath(`sandbox-${theme}.png`);
    await page.screenshot({ path: screenshot });
    await info.attach(`sandbox-${theme}`, { path: screenshot, contentType: 'image/png' });
  }
});

test('sandbox separates campaign figures, selected-wallet actions and settlement guards', async ({ page }) => {
  const overview = page.locator('.campaign-overview');
  const wallet = page.getByRole('region', { name: 'Góp / rút trước hạn', exact: true });
  const settlement = page.getByRole('region', { name: 'Điều kiện & quyết toán', exact: true });
  await expect(overview.locator('#contractEscrowBalance')).toBeVisible();
  await expect(overview.locator('#displayBackersCount')).toBeVisible();
  await expect(overview.locator('#myCurrentPledge')).toHaveCount(0);
  await expect(wallet.locator('#myCurrentPledge')).toHaveText('0.00 ETH');
  await expect(wallet.locator('#activeWalletBalance')).toHaveText('12.50 ETH');
  await expect(wallet.locator('#sandboxWalletName')).toHaveText('Alice');
  await expect(wallet.locator('#btnPledge')).toBeVisible();
  await expect(wallet.locator('#btnUnpledge')).toBeVisible();
  await expect(settlement.locator('.claim-guards')).toBeVisible();
  await expect(settlement.locator('#btnClaim')).toBeDisabled();
  await expect(settlement.locator('#btnRefund')).toBeDisabled();
  await amount(page, '3', '#btnPledge');
  await expect(wallet.locator('#myCurrentPledge')).toHaveText('3.00 ETH');
  await page.selectOption('#walletSelect', 'bob');
  await expect(wallet.locator('#sandboxWalletName')).toHaveText('Bob');
  await expect(wallet.locator('#myCurrentPledge')).toHaveText('0.00 ETH');
  await expect(overview.locator('#contractEscrowBalance')).toHaveText('3.00 ETH');
  await page.selectOption('#walletSelect', 'alice');
  await expect(wallet.locator('#sandboxWalletName')).toHaveText('Alice');
  await expect(wallet.locator('#myCurrentPledge')).toHaveText('3.00 ETH');
});

test('desktop sandbox groups stay distinct without clipped labels or overlapping controls', async ({ page }, info) => {
  for (const width of [1366, 1280]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 720 });
    for (const theme of ['dark', 'light']) {
      if (await page.evaluate(() => document.documentElement.dataset.theme || 'dark') !== theme) {
        await page.click('#btnThemeToggle');
      }
      expect(await page.evaluate(() => {
        const overview = document.querySelector('.campaign-overview').getBoundingClientRect();
        const wallet = document.querySelector('.pledge-pod').getBoundingClientRect();
        const settlement = document.querySelector('.settlement-pod').getBoundingClientRect();
        const groups = [...document.querySelectorAll('.action-pod')];
        const labels = [...document.querySelectorAll('.primary-column .cell-label')];
        return document.documentElement.scrollWidth <= innerWidth &&
          overview.bottom <= wallet.top && overview.bottom <= settlement.top &&
          wallet.right + 12 <= settlement.left &&
          groups.every(group => group.scrollWidth <= group.clientWidth) &&
          labels.every(label => label.scrollWidth <= label.clientWidth);
      })).toBe(true);
      if (width === 1366) {
        expect(await page.evaluate(() => document.querySelector('.demo-remote-bar').getBoundingClientRect().bottom <= innerHeight)).toBe(true);
      }
      const screenshot = info.outputPath(`sandbox-groups-${width}-${theme}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      await info.attach(`sandbox-groups-${width}-${theme}`, { path: screenshot, contentType: 'image/png' });
      await page.click('.btn-scenario.success');
      await page.locator('.toast-dismiss').click();
      await page.locator('.toast').waitFor({ state: 'detached' });
      await page.click('#timeJump7');
      await page.selectOption('#walletSelect', 'creator');
      await expect(page.locator('#btnClaim')).toBeEnabled();
      expect(await page.evaluate(() => {
        const target = document.querySelector('.amount-target');
        const goalText = document.querySelector('#condGoalText');
        return target.getClientRects().length === 1 && goalText.getClientRects().length === 1 &&
          document.querySelector('.progress-label-row').getBoundingClientRect().height < 32;
      })).toBe(true);
      const funded = info.outputPath(`sandbox-claim-${width}-${theme}.png`);
      await page.screenshot({ path: funded, fullPage: true });
      await info.attach(`sandbox-claim-${width}-${theme}`, { path: funded, contentType: 'image/png' });
      await page.click('.btn-scenario.reset');
      await page.evaluate(() => window.scrollTo(0, 0));
    }
  }
});

test('partial/full sandbox withdrawal and state-aware empty ledger', async ({ page }) => {
  await expect(page.locator('.empty-title')).toHaveText('Chưa có khoản góp');
  await amount(page, '3', '#btnPledge');
  await amount(page, '1', '#btnUnpledge');
  await expect(page.locator('#myCurrentPledge')).toHaveText('2.00 ETH');
  await amount(page, '3', '#btnUnpledge');
  await expect(page.locator('#myCurrentPledge')).toHaveText('2.00 ETH');
  await amount(page, '2', '#btnUnpledge');
  await expect(page.locator('.empty-title')).toHaveText('Không còn khoản góp được ghi nhận');
  await amount(page, '0.1', '#btnPledge');
  await amount(page, '0.2', '#btnPledge');
  await amount(page, '0.3', '#btnUnpledge');
  await expect(page.locator('#displayBackersCount')).toHaveText('0');
  await page.click('#timeJump7');
  await expect(page.locator('.empty-desc')).toContainText('đã hết hạn');
});

test('sandbox invalid precision/values never change accounting', async ({ page }) => {
  await amount(page, '1', '#btnPledge');
  for (const value of ['', '0', '-1', '0.001']) {
    for (const button of ['#btnPledge', '#btnUnpledge']) {
      await amount(page, value, button);
      await expect(page.locator('#myCurrentPledge')).toHaveText('1.00 ETH');
    }
  }
});

test('goal reached before expiry is not claimable; creator can claim at deadline', async ({ page }) => {
  await page.click('.btn-scenario.success');
  await page.selectOption('#walletSelect', 'creator');
  await expect(page.locator('#btnClaim')).toBeDisabled();
  await page.click('#timeJump7');
  await page.selectOption('#walletSelect', 'bob');
  await expect(page.locator('#btnClaim')).toBeDisabled();
  await page.selectOption('#walletSelect', 'creator');
  await page.click('#btnClaim');
  await expect(page.locator('#contractEscrowBalance')).toHaveText('0.00 ETH');
  await expect(page.locator('#goalCurrent')).toHaveText('10.00 ETH');
});

test('refund once; one dismissible inline notification does not cover ledger', async ({ page }) => {
  await page.click('.btn-scenario.fail');
  await page.click('#btnRefund');
  await expect(page.locator('.empty-title')).toHaveText('Đã hoàn hết các khoản góp được ghi nhận');
  await expect(page.locator('#btnRefund')).toBeDisabled();
  await expect(page.locator('.toast')).toHaveCount(1);
  expect(await page.evaluate(() => {
    const notice = document.querySelector('#toastStack').getBoundingClientRect();
    const ledger = document.querySelector('#sandboxView').getBoundingClientRect();
    return notice.bottom <= ledger.top;
  })).toBe(true);
  await page.locator('.toast-dismiss').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.toast')).toHaveCount(0);
});

for (const chainId of [1, 56]) {
  test(`reject network switch from ${chainId}: no contract or transaction enabled`, async ({ page }) => {
    await connect(page, { chainId, switchMode: 'reject' });
    await expect(page.locator('#web3Status')).toContainText('Chưa chuyển sang mạng demo');
    await locked(page);
    expect(await page.evaluate(() => walletFixture.stats())).toEqual({ constructions: 0, switches: 1 });
    expect(await page.evaluate(() => walletFixture.sent)).toEqual([]);
    await expect(page.locator('#w3ContractBalance')).toHaveText('—');
  });
}

test('wallet reporting successful switch but staying on Mainnet remains locked', async ({ page }) => {
  await connect(page, { chainId: 1, switchMode: 'unchanged' });
  await expect(page.locator('#web3Status')).toContainText('Mạng 1 không dành cho demo');
  await locked(page);
  expect(await page.evaluate(() => walletFixture.stats().constructions)).toBe(0);
});

test('successful switch to Sepolia connects only after checking the new chain', async ({ page }) => {
  await connect(page, { chainId: 1 });
  await connected(page);
  await expect(page.locator('#web3NetworkBadge')).toHaveText('Sepolia Testnet');
  expect(await page.evaluate(() => walletFixture.stats().switches)).toBe(1);
});

for (const chainId of [31337, 1337, 11155111]) {
  test(`supported chain ${chainId} connects without a switch request`, async ({ page }) => {
    await connect(page, { chainId });
    await connected(page);
    expect(await page.evaluate(() => walletFixture.stats().switches)).toBe(0);
  });
}

test('live network change blocks transaction even before chainChanged event', async ({ page }) => {
  await connect(page);
  await connected(page);
  await page.evaluate(() => walletFixture.setChain(1));
  await page.click('#btnW3Pledge');
  await expect(page.locator('#web3Status')).toContainText('Mạng 1 không dành cho demo');
  await locked(page);
  expect(await page.evaluate(() => walletFixture.sent)).toEqual([]);
});

test('Web3 partial withdrawal retains exact wei and rejects invalid/overdraw amounts', async ({ page }) => {
  await connect(page);
  await connected(page);
  await page.fill('#web3PledgeAmount', '1');
  await page.click('#btnW3Unpledge');
  await expect(page.locator('#w3MyPledge')).toHaveText('2.0 ETH');
  await page.fill('#web3PledgeAmount', '0.123456789012345678');
  await page.click('#btnW3Unpledge');
  await expect(page.locator('#w3MyPledge')).toHaveText('1.876543210987654322 ETH');
  for (const value of ['', '0', '-1', '3', '0.0000000000000000001']) {
    await page.fill('#web3PledgeAmount', value);
    await page.click('#btnW3Unpledge');
    await expect(page.locator('#btnW3Unpledge')).toBeEnabled();
  }
  expect(await page.evaluate(() => walletFixture.sent.map(tx => tx.amount)))
    .toEqual(['1000000000000000000', '123456789012345678']);
});

test('claim empties actual balance without clearing accounting', async ({ page }, info) => {
  await connect(page);
  await connected(page);
  await expect(page.locator('#w3ContractBalance')).toHaveText('12.123456789012345678 ETH');
  await expect(page.locator('#w3WalletBalance')).toHaveText('Số dư ví: 5.0000 ETH');
  await page.evaluate(async () => {
    walletFixture.setState(1);
    await walletFixture.switchAccount(walletFixture.creator);
  });
  await page.click('#btnW3Claim');
  await expect(page.locator('#w3State')).toHaveText('Claimed');
  await expect(page.locator('#w3ContractBalance')).toHaveText('0.0 ETH');
  await expect(page.locator('#w3Pledged')).toHaveText('10.0 / 10.0 ETH');
  await expect(page.locator('#web3Log')).toContainText('#42');
  await page.locator('.toast-dismiss').click();
  await expect(page.locator('.toast')).toHaveCount(0);
  const screenshot = info.outputPath('claimed-mocked-provider.png');
  await page.screenshot({ path: screenshot });
  await info.attach('claimed-mocked-provider', { path: screenshot, contentType: 'image/png' });
});

test('balance RPC failure clears numbers and locks actions, then permits retry', async ({ page }) => {
  await connect(page);
  await connected(page);
  await page.evaluate(() => walletFixture.failRead(true));
  await page.click('#btnW3Refresh');
  await expect(page.locator('#web3Status')).toContainText('contract balance RPC unavailable');
  await expect(page.locator('#w3ContractBalance')).toHaveText('—');
  await locked(page);
  await expect(page.locator('#btnW3Refresh')).toBeEnabled();
  await page.evaluate(() => walletFixture.failRead(false));
  await page.click('#btnW3Refresh');
  await connected(page);
});

test('account changes retain pending lock; disconnect discards delayed old reads', async ({ page }) => {
  await connect(page);
  await connected(page);
  await page.evaluate(() => walletFixture.holdReceipt());
  await page.click('#btnW3Pledge');
  await expect.poll(() => page.evaluate(() => walletFixture.sent.length)).toBe(1);
  await page.evaluate(() => walletFixture.switchAccount(walletFixture.bob));
  await locked(page);
  await page.evaluate(() => walletFixture.releaseReceipt());
  await expect(page.locator('#btnW3Pledge')).toBeEnabled();
  await expect(page.locator('#web3Log')).toContainText('#42');
  await page.evaluate(() => { walletFixture.holdBalance(); window.delayedRead = refreshOnChainState(); });
  await page.evaluate(() => walletFixture.disconnect());
  await page.evaluate(async () => { walletFixture.releaseBalance(); await window.delayedRead; });
  await expect(page.locator('#w3ContractBalance')).toHaveText('—');
  await expect(page.locator('#w3WalletBalance')).toHaveText('Số dư ví: —');
  await locked(page);
  await expect(page.locator('#web3Log')).toContainText('#42');
});
