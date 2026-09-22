# BÁO CÁO PHÂN TÍCH TĨNH SLITHER (Static Analysis Audit)

**Phiên bản công cụ:** slither-analyzer (crytic) + solc-select
**Compiler:** solc 0.8.20 (khớp pragma `^0.8.20`)
**Phạm vi:** `contracts/Crowdfunding.sol`, `contracts/CrowdfundingFactory.sol`
**Câu lệnh tái lập:**

```bash
solc-select install 0.8.20 && solc-select use 0.8.20
slither contracts --solc solc
```

---

## 1. Tổng quan kết quả

| Mức độ nghiêm trọng | Số lượng | Nhận định |
| :--- | :---: | :--- |
| **High / Medium** | **0** | Không có phát hiện nào ở mức ảnh hưởng an toàn quỹ |
| Low / Informational | 4 | Đã triage — tất cả đều có lý do thiết kế rõ ràng (mục 2) |

**Kết luận:** Hợp đồng không chứa phát hiện nào ở mức Medium trở lên sau đợt khắc phục
(bỏ dead-code `Cancelled`/`event Cancel`, bỏ guard thừa khỏi `pledge()`, thêm
`sweepExcessEther()`, ép `limit` về `MAX_PAGE_SIZE`).

## 2. Bảng triage chi tiết (4 phát hiện Informational)

### 2.1. `timestamp` — sử dụng `block.timestamp` cho so sánh thời hạn

* **Vị trí:** `pledge`, `unpledge`, `claim`, `refund`, `state`, `timeLeft`, `receive`
* **Triage: ACCEPTED (by design).** Validator chỉ được lệch timestamp trong biên
  hẹp (~12–15 giây theo quy tắc đồng thuận PoS). Chiến dịch đặt hạn theo đơn vị
  ngày/tuần nên sai lệch này không thể bị khai thác để hưởng lợi có hệ thống.
  Đây là pattern chuẩn của mọi hợp đồng escrow theo thời gian.

### 2.2. `solc-version` — pragma range `^0.8.20` chứa các bug đã biết của 0.8.x

* **Triage: ACCEPTED.** Ba lỗi được liệt kê (`VerbatimInvalidDeduplication`,
  `FullInlinerNonExpressionSplitArgumentEvaluationOrder`,
  `MissingSideEffectsOnSelectorAccess`) không ảnh hưởng đến codebase này (không dùng
  `verbatim`, không phụ thuộc thứ tự đánh giá inline, không truy cập selector có
  side-effect). Có thể ghim compiler cứng `0.8.20` tại `hardhat.config.js` để build
  tái lập được — đã thực hiện.

### 2.3. `low-level-calls` — 4 lệnh `call{value: ...}`

* **Triage: ACCEPTED (best practice hiện hành).** Theo khuyến cáo Ethereum Foundation,
  `call{value}("")` + CEI + ReentrancyGuard là cách chuyển ETH an toàn nhất, thay cho
  `transfer`/`send` (giới hạn 2.300 gas stingy — phá vỡ Gnosis Safe / ví hợp đồng).
  Mọi call đều: (1) nằm sau bước EFFECTS, (2) nằm trong `nonReentrant`, (3) kiểm tra
  `success` và revert bằng custom error.

### 2.4. `naming-convention` — tham số `_amount` không mixedCase

* **Triage: ACCEPTED.** Quy ước `_` prefix cho tham số hợp đồng là convention được
  chấp nhận rộng rãi (kể cả trong code mẫu của OpenZeppelin thời kỳ trước), dùng để
  phân biệt tham số với biến trạng thái. Cố ý giữ lại cho tính nhất quán.

## 3. Các phát hiện đã được xử lý TRƯỚC khi chạy Slither (so với phiên bản đầu)

| Vấn đề | Đã khắc phục bằng |
| :--- | :--- |
| Dead code: `CampaignState.Cancelled` không thể đạt, `event Cancel` không bao giờ emit | Xóa khỏi enum/event, thay bằng `event Sweep` cho `sweepExcessEther()` |
| ETH ép vào (selfdestruct) có thể brick vĩnh viễn trong chiến dịch FAILED | Hàm `sweepExcessEther()` chỉ rút phần `balance - pledged` |
| Bất biến `pledged == Σ pledgedAmount` bị phá sau `refund()` | `refund()` giảm `pledged` tương ứng |
| Guard thừa trên `pledge()` (~5.800 gas/lần + corner case griefing) | Bỏ guard, ghi chú NatSpec lý do |
| `uint32` timestamp tràn năm 2106 | Chuyển `uint64` ở cả contract và factory |
| `getCampaigns(limit)` không giới hạn → RPC DoS | Clamp `MAX_PAGE_SIZE = 100` |

## 4. Xác thực động (bổ trợ Slither)

* **52 test tự động** (18 mock spec-based + 34 EVM trên Hardhat Network) — 100% pass.
* **Invariant fuzz** 80 ops ngẫu nhiên có hạt: `pledged == Σ pledgedAmount` và
  `balance == pledged` giữ vững qua mọi thao tác.
* **Attack simulation trên EVM thật:** `ReentrancyAttacker` (nested refund) bị guard
  chặn; `ForceEther` (selfdestruct) được `sweepExcessEther()` trung hòa.
