const { expect } = require("chai");
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

const ONE = ethers.parseEther("1");
const DAY = 86400n;

// PRNG có hạt (mulberry32) — fuzz deterministic, chạy lại được đúng kịch bản
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function deployCampaign(goalEth = "10", durationSec = 7n * DAY) {
  const [creator, alice, bob, charlie, hacker] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("Crowdfunding");
  const campaign = await Factory.deploy(
    creator.address,
    ethers.parseEther(goalEth),
    durationSec
  );
  await campaign.waitForDeployment();
  return { campaign, creator, alice, bob, charlie, hacker };
}

describe("Crowdfunding.sol — Layer 2 (EVM thật trên Hardhat Network)", function () {

  // ============================================================
  // 1. KHỞI TẠO & VALIDATION CONSTRUCTOR
  // ============================================================
  describe("1. Khởi tạo & Validation constructor", function () {
    it("Khởi tạo đúng creator/goal/endAt, trạng thái Active, timeLeft đúng", async function () {
      const { campaign, creator } = await deployCampaign("10", 7n * DAY);
      expect(await campaign.creator()).to.equal(creator.address);
      expect(await campaign.goal()).to.equal(ethers.parseEther("10"));
      expect((await campaign.endAt()) - (await campaign.startAt())).to.equal(7n * DAY);
      expect(await campaign.state()).to.equal(0n); // Active
      expect(await campaign.timeLeft()).to.be.greaterThan(6n * DAY);
    });

    it("Revert GoalCannotBeZero khi goal = 0", async function () {
      const Factory = await ethers.getContractFactory("Crowdfunding");
      await expect(Factory.deploy(ethers.ZeroAddress, 0n, DAY))
        .to.be.revertedWithCustomError(Factory, "GoalCannotBeZero");
    });

    it("Revert InvalidDuration khi duration = 0", async function () {
      const Factory = await ethers.getContractFactory("Crowdfunding");
      await expect(Factory.deploy(ethers.ZeroAddress, ONE, 0n))
        .to.be.revertedWithCustomError(Factory, "InvalidDuration");
    });

    it("Revert InvalidDuration khi duration > 365 days", async function () {
      const Factory = await ethers.getContractFactory("Crowdfunding");
      await expect(Factory.deploy(ethers.ZeroAddress, ONE, 365n * DAY + 1n))
        .to.be.revertedWithCustomError(Factory, "InvalidDuration");
    });

    it("creator mặc định = msg.sender khi truyền địa chỉ 0", async function () {
      const [, alice] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("Crowdfunding");
      const c = await Factory.connect(alice).deploy(ethers.ZeroAddress, ONE, DAY);
      await c.waitForDeployment();
      expect(await c.creator()).to.equal(alice.address);
    });
  });

  // ============================================================
  // 2. PLEDGE / UNPLEDGE / RECEIVE() FALLBACK
  // ============================================================
  describe("2. Pledge / Unpledge / receive() fallback", function () {
    it("Nhiều backer góp: tracked đúng pledgedAmount & contributorCount", async function () {
      const { campaign, alice, bob } = await deployCampaign("10", 7n * DAY);
      await campaign.connect(alice).pledge({ value: ethers.parseEther("2") });
      await campaign.connect(bob).pledge({ value: ethers.parseEther("3") });
      expect(await campaign.pledged()).to.equal(ethers.parseEther("5"));
      expect(await campaign.pledgedAmount(alice.address)).to.equal(ethers.parseEther("2"));
      expect(await campaign.pledgedAmount(bob.address)).to.equal(ethers.parseEther("3"));
      expect(await campaign.contributorCount()).to.equal(2n);
    });

    it("Revert ZeroPledge khi gọi pledge() với 0 ETH", async function () {
      const { campaign, alice } = await deployCampaign("10", 7n * DAY);
      await expect(campaign.connect(alice).pledge({ value: 0n }))
        .to.be.revertedWithCustomError(campaign, "ZeroPledge");
    });

    it("receive(): chuyển ETH trực tiếp vào contract tự động pledge", async function () {
      const { campaign, alice } = await deployCampaign("10", 7n * DAY);
      await alice.sendTransaction({
        to: await campaign.getAddress(),
        value: ethers.parseEther("1")
      });
      expect(await campaign.pledged()).to.equal(ONE);
      expect(await campaign.pledgedAmount(alice.address)).to.equal(ONE);
      expect(await campaign.contributorCount()).to.equal(1n);
    });

    it("receive(): revert ZeroPledge khi chuyển 0 ETH trực tiếp", async function () {
      const { campaign, alice } = await deployCampaign("10", 7n * DAY);
      await expect(
        alice.sendTransaction({ to: await campaign.getAddress(), value: 0n })
      ).to.be.revertedWithCustomError(campaign, "ZeroPledge");
    });

    it("Unpledge một phần: contributorCount giữ nguyên", async function () {
      const { campaign, alice } = await deployCampaign("10", 7n * DAY);
      await campaign.connect(alice).pledge({ value: ethers.parseEther("3") });
      await campaign.connect(alice).unpledge(ethers.parseEther("1"));
      expect(await campaign.pledged()).to.equal(ethers.parseEther("2"));
      expect(await campaign.pledgedAmount(alice.address)).to.equal(ethers.parseEther("2"));
      expect(await campaign.contributorCount()).to.equal(1n);
    });

    it("Unpledge quá số dư → revert NothingToRefund", async function () {
      const { campaign, alice } = await deployCampaign("10", 7n * DAY);
      await campaign.connect(alice).pledge({ value: ethers.parseEther("1") });
      await expect(campaign.connect(alice).unpledge(ethers.parseEther("2")))
        .to.be.revertedWithCustomError(campaign, "NothingToRefund");
    });

    it("Unpledge sau khi hết hạn → revert CampaignEnded", async function () {
      const { campaign, alice } = await deployCampaign("10", 2n * DAY);
      await campaign.connect(alice).pledge({ value: ONE });
      await helpers.time.setNextBlockTimestamp((await campaign.endAt()) + 1n);
      await expect(campaign.connect(alice).unpledge(ONE))
        .to.be.revertedWithCustomError(campaign, "CampaignEnded");
    });
  });

  // ============================================================
  // 3. VÒNG ĐỜI THÀNH CÔNG (claim)
  // ============================================================
  describe("3. Vòng đời THÀNH CÔNG (claim)", function () {
    it("state → Successful khi hết hạn & đạt goal; → Claimed sau khi rút", async function () {
      const { campaign, creator, alice } = await deployCampaign("10", DAY);
      await campaign.connect(alice).pledge({ value: ethers.parseEther("10") });
      await helpers.time.increaseTo((await campaign.endAt()) + 1n); // mine block để eth_call thấy mốc mới
      expect(await campaign.state()).to.equal(1n); // Successful
      await campaign.connect(creator).claim();
      expect(await campaign.state()).to.equal(3n); // Claimed
      expect(await campaign.claimed()).to.equal(true);
      expect(await ethers.provider.getBalance(await campaign.getAddress())).to.equal(0n);
    });

    it("Claim hai lần → revert AlreadyClaimed", async function () {
      const { campaign, creator, alice } = await deployCampaign("1", DAY);
      await campaign.connect(alice).pledge({ value: ONE });
      await helpers.time.increaseTo((await campaign.endAt()) + 1n);
      await campaign.connect(creator).claim();
      await expect(campaign.connect(creator).claim())
        .to.be.revertedWithCustomError(campaign, "AlreadyClaimed");
    });

    it("Người lạ claim → revert Unauthorized", async function () {
      const { campaign, alice, hacker } = await deployCampaign("10", DAY);
      await campaign.connect(alice).pledge({ value: ethers.parseEther("11") });
      await helpers.time.setNextBlockTimestamp((await campaign.endAt()) + 1n);
      await expect(campaign.connect(hacker).claim())
        .to.be.revertedWithCustomError(campaign, "Unauthorized");
    });

    it("Oversubscribed: claim nhận CẢ balance (11 ETH) dù goal 10 ETH", async function () {
      const { campaign, creator, alice } = await deployCampaign("10", DAY);
      await campaign.connect(alice).pledge({ value: ethers.parseEther("11") });
      await helpers.time.setNextBlockTimestamp((await campaign.endAt()) + 1n);
      await expect(campaign.connect(creator).claim())
        .to.emit(campaign, "Claim")
        .withArgs(creator.address, ethers.parseEther("11"));
      expect(await ethers.provider.getBalance(await campaign.getAddress())).to.equal(0n);
    });

    it("Refund khi đã SUCCESSFUL → revert GoalAlreadyReached", async function () {
      const { campaign, alice } = await deployCampaign("10", DAY);
      await campaign.connect(alice).pledge({ value: ethers.parseEther("11") });
      await helpers.time.setNextBlockTimestamp((await campaign.endAt()) + 1n);
      await expect(campaign.connect(alice).refund())
        .to.be.revertedWithCustomError(campaign, "GoalAlreadyReached");
    });

    it("Biên thời gian: claim hợp lệ TẠI ĐÚNG giây endAt (ts == endAt)", async function () {
      const { campaign, creator, alice } = await deployCampaign("1", DAY);
      await campaign.connect(alice).pledge({ value: ONE });
      await helpers.time.setNextBlockTimestamp(await campaign.endAt());
      await expect(campaign.connect(creator).claim())
        .to.emit(campaign, "Claim")
        .withArgs(creator.address, ONE);
    });
  });

  // ============================================================
  // 4. VÒNG ĐỜI THẤT BẠI & HOÀN TIỀN (refund)
  // ============================================================
  describe("4. Vòng đời THẤT BẠI & refund", function () {
    it("state → Failed khi hết hạn & không đạt goal; claim → GoalNotReached", async function () {
      const { campaign, creator, alice } = await deployCampaign("10", DAY);
      await campaign.connect(alice).pledge({ value: ethers.parseEther("3") });
      await helpers.time.increaseTo((await campaign.endAt()) + 1n);
      expect(await campaign.state()).to.equal(2n); // Failed
      await expect(campaign.connect(creator).claim())
        .to.be.revertedWithCustomError(campaign, "GoalNotReached");
    });

    it("Refund khi CÒN HẠN → revert CampaignActive", async function () {
      const { campaign, alice } = await deployCampaign("10", DAY);
      await campaign.connect(alice).pledge({ value: ethers.parseEther("3") });
      await expect(campaign.connect(alice).refund())
        .to.be.revertedWithCustomError(campaign, "CampaignActive");
    });

    it("Refund đúng 100% số tiền; pledged giảm tương ứng (bất biến)", async function () {
      const { campaign, alice } = await deployCampaign("10", DAY);
      await campaign.connect(alice).pledge({ value: ethers.parseEther("3") });
      await helpers.time.setNextBlockTimestamp((await campaign.endAt()) + 1n);
      await expect(campaign.connect(alice).refund())
        .to.emit(campaign, "Refund")
        .withArgs(alice.address, ethers.parseEther("3"));
      expect(await campaign.pledged()).to.equal(0n);
      expect(await campaign.pledgedAmount(alice.address)).to.equal(0n);
      expect(await ethers.provider.getBalance(await campaign.getAddress())).to.equal(0n);
    });

    it("Refund hai lần → revert NothingToRefund", async function () {
      const { campaign, alice } = await deployCampaign("10", DAY);
      await campaign.connect(alice).pledge({ value: ethers.parseEther("3") });
      await helpers.time.setNextBlockTimestamp((await campaign.endAt()) + 1n);
      await campaign.connect(alice).refund();
      await expect(campaign.connect(alice).refund())
        .to.be.revertedWithCustomError(campaign, "NothingToRefund");
    });

    it("Biên thời gian: TẠI ĐÚNG giây endAt, pledge bị chặn ngay lập tức", async function () {
      const { campaign, alice } = await deployCampaign("10", DAY);
      await helpers.time.setNextBlockTimestamp(await campaign.endAt());
      await expect(campaign.connect(alice).pledge({ value: ONE }))
        .to.be.revertedWithCustomError(campaign, "CampaignEnded");
      expect(await campaign.state()).to.equal(2n); // Failed (chưa goal)
    });

    it("Đạt goal ĐÚNG từng wei (pledged == goal) → Successful", async function () {
      const { campaign, alice } = await deployCampaign("10", DAY);
      await campaign.connect(alice).pledge({ value: ethers.parseEther("10") });
      await helpers.time.increaseTo(await campaign.endAt());
      expect(await campaign.state()).to.equal(1n); // Successful (dùng >=)
    });
  });

  // ============================================================
  // 5. BẢO MẬT: REENTRANCY / FORCED-ETH / SWEEP
  // ============================================================
  describe("5. Bảo mật: Reentrancy / Forced-ETH / sweepExcessEther", function () {
    it("ReentrancyAttacker: guard chặn nested refund, refund hợp lệ vẫn hoàn tất", async function () {
      const { campaign } = await deployCampaign("10", DAY);
      const Attacker = await ethers.getContractFactory("ReentrancyAttacker");
      const attacker = await Attacker.deploy(await campaign.getAddress(), { value: ONE });
      await attacker.waitForDeployment();
      const attackerAddress = await attacker.getAddress();
      const attackerBalBefore = await ethers.provider.getBalance(attackerAddress);

      await helpers.time.setNextBlockTimestamp((await campaign.endAt()) + 1n);
      // attack() PHẢI thành công: guard chặn nested call, refund chính đáng vẫn chạy
      await expect(attacker.attack()).to.not.be.reverted;

      // Bằng chứng guard đã chặn: innerRevertData = selector của ReentrancyGuardTriggered
      const expectedSelector = ethers.id("ReentrancyGuardTriggered()").slice(0, 10);
      const innerData = await attacker.innerRevertData();
      expect(innerData.slice(0, 10).toLowerCase()).to.equal(expectedSelector.toLowerCase());

      // Quỹ tách đúng: attacker nhận lại đúng 1 ETH, hợp đồng rỗng, sổ cái = 0
      expect(await ethers.provider.getBalance(attackerAddress) - attackerBalBefore).to.equal(ONE);
      expect(await campaign.pledgedAmount(attackerAddress)).to.equal(0n);
      expect(await ethers.provider.getBalance(await campaign.getAddress())).to.equal(0n);
    });

    it("Forced ETH qua selfdestruct: balance > pledged, refund vẫn solvent", async function () {
      const { campaign, alice, creator } = await deployCampaign("10", DAY);
      await campaign.connect(alice).pledge({ value: ethers.parseEther("0.5") });
      const ForceEther = await ethers.getContractFactory("ForceEther");
      await ForceEther.deploy(await campaign.getAddress(), { value: ethers.parseEther("0.7") });
      expect(await ethers.provider.getBalance(await campaign.getAddress()))
        .to.equal(ethers.parseEther("1.2"));
      expect(await campaign.pledged()).to.equal(ethers.parseEther("0.5")); // không đổi
      // FAILED → backer refund đúng 0.5 ETH
      await helpers.time.setNextBlockTimestamp((await campaign.endAt()) + 1n);
      await campaign.connect(alice).refund();
      expect(await campaign.pledged()).to.equal(0n);
      // sweepExcessEther trả đúng phần ép 0.7 ETH (không đụng tiền backer)
      await expect(campaign.connect(creator).sweepExcessEther())
        .to.emit(campaign, "Sweep")
        .withArgs(creator.address, ethers.parseEther("0.7"));
      expect(await ethers.provider.getBalance(await campaign.getAddress())).to.equal(0n);
    });

    it("sweepExcessEther: chặn người lạ (Unauthorized) và revert khi không có dư", async function () {
      const { campaign, alice, creator } = await deployCampaign("10", DAY);
      const ForceEther = await ethers.getContractFactory("ForceEther");
      await ForceEther.deploy(await campaign.getAddress(), { value: ethers.parseEther("0.7") });
      await expect(campaign.connect(alice).sweepExcessEther())
        .to.be.revertedWithCustomError(campaign, "Unauthorized");
      await campaign.connect(creator).sweepExcessEther();
      await expect(campaign.connect(creator).sweepExcessEther())
        .to.be.revertedWithCustomError(campaign, "NothingToRefund");
    });

    it("SUCCESSFUL + forced ETH: claim hút trọn cả phần ép (không brick quỹ)", async function () {
      const { campaign, creator, alice } = await deployCampaign("1", DAY);
      await campaign.connect(alice).pledge({ value: ethers.parseEther("1.5") });
      const ForceEther = await ethers.getContractFactory("ForceEther");
      await ForceEther.deploy(await campaign.getAddress(), { value: ONE });
      await helpers.time.setNextBlockTimestamp((await campaign.endAt()) + 1n);
      await expect(campaign.connect(creator).claim())
        .to.emit(campaign, "Claim")
        .withArgs(creator.address, ethers.parseEther("2.5"));
    });
  });

  // ============================================================
  // 6. INVARIANT FUZZ (deterministic, có hạt)
  // ============================================================
  describe("6. Invariant fuzz", function () {
    it("80 ops ngẫu nhiên: pledged == Σ pledgedAmount && balance == pledged", async function () {
      const { campaign, alice, bob, charlie, hacker } = await deployCampaign("1000", 365n * DAY);
      const actors = [alice, bob, charlie, hacker];
      const campaignAddress = await campaign.getAddress();
      const rand = mulberry32(0xC0FFEE);

      for (let i = 0; i < 80; i++) {
        const actor = actors[Math.floor(rand() * actors.length)];
        const bal = await campaign.pledgedAmount(actor.address);

        if (rand() < 0.55 || bal === 0n) {
          const amt = ethers.parseEther((0.01 + rand() * 0.5).toFixed(6));
          await campaign.connect(actor).pledge({ value: amt });
        } else {
          // rút 1%..100% số dư hiện có
          const amt = (bal * BigInt(Math.floor(rand() * 100) + 1)) / 101n;
          if (amt > 0n) await campaign.connect(actor).unpledge(amt);
        }

        // Invariant 1: pledged == tổng số dư tất cả backer
        let sum = 0n;
        for (const a of actors) sum += await campaign.pledgedAmount(a.address);
        expect(await campaign.pledged()).to.equal(sum);
        // Invariant 2: balance hợp đồng khớp chính xác sổ cái (không mất/không tự sinh ETH)
        expect(await ethers.provider.getBalance(campaignAddress)).to.equal(sum);
      }
    });
  });

  // ============================================================
  // 7. CROWDFUNDING FACTORY (trước đây 0 test case)
  // ============================================================
  describe("7. CrowdfundingFactory", function () {
    async function deployFactory() {
      const [, alice, bob] = await ethers.getSigners();
      const F = await ethers.getContractFactory("CrowdfundingFactory");
      const factory = await F.deploy();
      await factory.waitForDeployment();
      return { factory, alice, bob };
    }

    it("createCampaign: deploy thật, ghi nhận danh sách, phát event đầy đủ", async function () {
      const { factory, alice } = await deployFactory();
      const goal = ethers.parseEther("5");
      const duration = 3n * DAY;
      await expect(factory.connect(alice).createCampaign(goal, duration))
        .to.emit(factory, "CampaignCreated");
      expect(await factory.totalCampaigns()).to.equal(1n);
      const list = await factory.getCampaignsByCreator(alice.address);
      expect(list.length).to.equal(1);
      // Địa chỉ trong danh sách PHẢI là Crowdfunding hợp lệ với tham số đúng
      const c = await ethers.getContractAt("Crowdfunding", list[0]);
      expect(await c.goal()).to.equal(goal);
      expect(await c.creator()).to.equal(alice.address);
      expect((await c.endAt()) - (await c.startAt())).to.equal(duration);
    });

    it("getCampaigns: phân trang slice đúng (offset/limit)", async function () {
      const { factory, alice } = await deployFactory();
      for (let i = 0; i < 5; i++) {
        await factory.connect(alice).createCampaign(ONE, DAY);
      }
      const page = await factory.getCampaigns(1, 2);
      expect(page.length).to.equal(2);
      const all = await factory.getCampaigns(0, 100);
      expect(page[0]).to.equal(all[1]);
      expect(page[1]).to.equal(all[2]);
    });

    it("getCampaigns: offset >= total → trả mảng rỗng (không revert)", async function () {
      const { factory } = await deployFactory();
      const page = await factory.getCampaigns(99, 10);
      expect(page.length).to.equal(0);
    });

    it("getCampaigns: limit > MAX_PAGE_SIZE bị clamp về 100 (chống RPC DoS)", async function () {
      const { factory, alice } = await deployFactory();
      for (let i = 0; i < 5; i++) {
        await factory.connect(alice).createCampaign(ONE, DAY);
      }
      // Yêu cầu limit 150 → vẫn trả 5 (end được clamp về total, không crash node)
      const page = await factory.getCampaigns(0, 150);
      expect(page.length).to.equal(5);
      expect(await factory.MAX_PAGE_SIZE()).to.equal(100n);
    });

    it("Các chiến dịch độc lập hoàn toàn về trạng thái và số dư", async function () {
      const { factory, alice, bob } = await deployFactory();
      await factory.connect(alice).createCampaign(ethers.parseEther("1"), DAY);
      await factory.connect(bob).createCampaign(ethers.parseEther("2"), DAY);
      const list = await factory.getCampaigns(0, 100);
      const c1 = await ethers.getContractAt("Crowdfunding", list[0]);
      const c2 = await ethers.getContractAt("Crowdfunding", list[1]);
      await c1.connect(alice).pledge({ value: ONE });
      expect(await c1.pledged()).to.equal(ONE);
      expect(await c2.pledged()).to.equal(0n);
      expect(await c1.pledgedAmount(bob.address)).to.equal(0n);
    });
  });
});

