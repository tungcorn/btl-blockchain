// LOCAL TEST ACCOUNTS ONLY. Never fund these public Hardhat accounts on a real network.
const hre = require("hardhat");

async function deployLocalCampaigns() {
  const { ethers, network } = hre;
  const chain = await ethers.provider.getNetwork();
  const url = String(network.config.url || "");
  if (network.name !== "localhost" || chain.chainId !== 31337n || url !== "http://127.0.0.1:8545") {
    throw new Error("This script only deploys to localhost at 127.0.0.1:8545, chain ID 31337.");
  }
  const [creator, alice, bob] = await ethers.getSigners();
  const Campaign = await ethers.getContractFactory("Crowdfunding", creator);
  const campaigns = [];
  for (const label of ["success", "failure"]) {
    const campaign = await Campaign.deploy(creator.address, ethers.parseEther("0.01"), 600n);
    const receipt = await campaign.deploymentTransaction().wait();
    campaigns.push({ label, campaign, deployment: {
      address: await campaign.getAddress(), transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber, status: receipt.status,
      goalWei: (await campaign.goal()).toString(), endAt: (await campaign.endAt()).toString()
    } });
  }
  return { creator, alice, bob, campaigns };
}

async function main() {
  const { creator, alice, bob, campaigns } = await deployLocalCampaigns();
  console.log(JSON.stringify({
    environment: "Persistent local Hardhat node; not Sepolia; no MetaMask signature verified",
    chainId: 31337, rpc: "http://127.0.0.1:8545", durationSeconds: 600,
    accounts: { creator: creator.address, alice: alice.address, bob: bob.address },
    campaigns: campaigns.map(({ label, deployment }) => ({ label, ...deployment })),
    note: "Keep the node running. Reset/restart removes deployments. Use a separate test-only wallet profile."
  }, null, 2));
}

module.exports = { deployLocalCampaigns };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
