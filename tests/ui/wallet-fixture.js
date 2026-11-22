// Controlled provider/contracts only. No wallet signature, RPC chain or ETH transfer.
async function installWallet(page, options = {}) {
  await page.evaluate(({ chainId = 31337, switchMode = 'success' }) => {
    const real = window.ethers;
    const alice = '0x' + '22'.repeat(20), bob = '0x' + '33'.repeat(20);
    const creator = '0x' + '44'.repeat(20), target = '0x' + '11'.repeat(20);
    const handlers = {}, sent = [], reads = [];
    let chain = BigInt(chainId), current = alice, state = 0n;
    let mine = real.parseEther('3'), pledged = real.parseEther('10');
    let escrow = real.parseEther('12.123456789012345678');
    let failRead = false, gate = null, release = null, readGate = null, releaseRead = null;
    let constructions = 0, switches = 0;
    window.ethereum = {
      on: (name, handler) => { handlers[name] = handler; },
      request: async ({ method }) => {
        if (method !== 'wallet_switchEthereumChain') throw new Error('Unexpected wallet request');
        switches++;
        if (switchMode === 'reject') throw { code: 4001 };
        if (switchMode === 'success') chain = 11155111n;
      }
    };
    const provider = {
      send: async () => [current],
      getSigner: async (account = current) => ({ address: account, getAddress: async () => account }),
      getNetwork: async () => ({ chainId: chain }),
      getBalance: async address => {
        reads.push(address);
        if (address !== target) return real.parseEther('5');
        if (failRead) throw new Error('contract balance RPC unavailable');
        const result = escrow;
        if (readGate) await readGate;
        return result;
      }
    };
    function transaction(action, amount = 0n) {
      sent.push({ action, amount: amount.toString(), account: current });
      return { hash: '0x' + 'a'.repeat(64), wait: async () => {
        if (gate) await gate;
        if (action === 'unpledge') { mine -= amount; pledged -= amount; escrow -= amount; }
        if (action === 'claim') { state = 3n; escrow = 0n; }
        return { blockNumber: 42 };
      } };
    }
    class Contract {
      constructor(address, abi, signer) { constructions++; this.signerAddress = signer.address; }
      async goal() { return real.parseEther('10'); }
      async pledged() { return pledged; }
      async state() { return state; }
      async timeLeft() { return state === 0n ? 60n : 0n; }
      async pledgedAmount() { return mine; }
      async contributorCount() { return 2n; }
      async creator() { return creator; }
      async pledge({ value }) { return transaction('pledge', value); }
      async unpledge(amount) { return transaction('unpledge', amount); }
      async claim() { return transaction('claim'); }
      async refund() { return transaction('refund'); }
    }
    window.ethers = { ...real, BrowserProvider: class { constructor() { return provider; } }, Contract };
    window.walletFixture = {
      sent, reads, alice, bob, creator, target,
      stats: () => ({ constructions, switches }),
      setChain: value => { chain = BigInt(value); },
      setState: value => { state = BigInt(value); },
      failRead: value => { failRead = value; },
      setMine: value => { mine = real.parseEther(value); },
      switchAccount: async account => { current = account; await handlers.accountsChanged([account]); },
      disconnect: () => handlers.accountsChanged([]),
      holdReceipt: () => { gate = new Promise(resolve => { release = resolve; }); },
      releaseReceipt: () => { gate = null; release(); },
      holdBalance: () => { readGate = new Promise(resolve => { releaseRead = resolve; }); },
      releaseBalance: () => { readGate = null; releaseRead(); }
    };
    document.querySelector('#web3ContractAddress').value = target;
  }, options);
  await page.click('#tabBtnWeb3');
}
module.exports = { installWallet };
