// Produces REAL local EVM receipts using unlocked Hardhat accounts, NOT MetaMask.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { ethers, network, config } = require("hardhat");
const { deployLocalCampaigns } = require("./deploy-local");

async function snapshot(campaign, alice) {
  return {
    state: Number(await campaign.state()), claimed: await campaign.claimed(),
    pledgedWei: (await campaign.pledged()).toString(),
    alicePledgeWei: (await campaign.pledgedAmount(alice.address)).toString(),
    escrowWei: (await ethers.provider.getBalance(await campaign.getAddress())).toString(),
    contributorCount: (await campaign.contributorCount()).toString()
  };
}

async function main() {
  const { creator, alice, campaigns } = await deployLocalCampaigns();
  const root = path.resolve(__dirname, "..");
  const sources = {};
  for (const name of ["Crowdfunding.sol", "CrowdfundingFactory.sol"]) {
    sources[`contracts/${name}`] = crypto.createHash("sha256")
      .update(fs.readFileSync(path.join(root, "contracts", name))).digest("hex");
  }
  const evidence = {
    recordedAt: new Date().toISOString(), environment: "Hardhat localhost", chainId: 31337,
    authorization: "Unlocked local test accounts via ethers; no MetaMask signature; not Sepolia",
    hardhatVersion: require("hardhat/package.json").version,
    compiler: config.solidity.compilers[0], sourceSha256: sources,
    accounts: { creator: creator.address, alice: alice.address }, campaigns: []
  };
  const prepared = [];
  for (const { label, campaign, deployment } of campaigns) {
    const item = { label, ...deployment, steps: [] };
    async function transact(action, send) {
      const before = await snapshot(campaign, alice);
      const receipt = await (await send()).wait();
      assert.equal(receipt.status, 1);
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const after = await snapshot(campaign, alice);
      item.steps.push({ action, before, transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber, blockTimestamp: block.timestamp,
        status: receipt.status, gasUsed: receipt.gasUsed.toString(), after });
      return after;
    }
    await transact("Alice pledges 0.003 ETH", () => campaign.connect(alice).pledge({ value: ethers.parseEther("0.003") }));
    let after = await transact("Alice unpledges 0.001 ETH before deadline", () => campaign.connect(alice).unpledge(ethers.parseEther("0.001")));
    assert.equal(after.alicePledgeWei, ethers.parseEther("0.002").toString());
    assert.equal(after.escrowWei, after.pledgedWei);
    if (label === "success") {
      await transact("Alice adds 0.008 ETH to reach goal", () => campaign.connect(alice).pledge({ value: ethers.parseEther("0.008") }));
    }
    prepared.push({ label, campaign, item, transact });
  }
  // Fund BOTH campaigns before advancing time; their deadlines are close together.
  for (const { label, campaign, item, transact } of prepared) {
    const endAt = Number(await campaign.endAt());
    await network.provider.send("evm_setNextBlockTimestamp", [endAt]);
    const after = label === "success"
      ? await transact("Creator claims at endAt", () => campaign.connect(creator).claim())
      : await transact("Alice refunds at endAt", () => campaign.connect(alice).refund());
    assert.equal(after.escrowWei, "0");
    assert.equal(after.claimed, label === "success");
    assert.equal(after.pledgedWei, label === "success" ? ethers.parseEther("0.01").toString() : "0");
    item.steps.at(-1).atExactDeadline = item.steps.at(-1).blockTimestamp === endAt;
    assert.equal(item.steps.at(-1).atExactDeadline, true);
    evidence.campaigns.push(item);
  }
  const dir = path.join(root, "docs", "evidence");
  fs.mkdirSync(dir, { recursive: true });
  const filename = path.join(dir, `local-evm-${evidence.recordedAt.replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(filename, JSON.stringify(evidence, null, 2) + "\n", { flag: "wx" });
  console.log(`PASS: local pledge/partial unpledge/claim/refund; evidence saved to ${filename}`);
  console.log("These campaigns are settled; run npm run demo:deploy for fresh manual-wallet campaigns.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
