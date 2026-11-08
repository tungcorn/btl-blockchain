# BÁO CÁO PHÂN TÍCH TĨNH SLITHER

## 1. Phạm vi và cách tái lập

- **Ngày chạy:** 2026-11-08.
- **Slither:** 0.11.6.
- **Compiler:** solc `0.8.20+commit.a1b79de6.Windows.msvc`.

**Phạm vi:** `Crowdfunding.sol`, sau đó `CrowdfundingFactory.sol` và `Crowdfunding.sol` được import. Không chạy các helper kiểm thử trong `contracts/testing/` ở hai lệnh này.

```bash
slither --version
solc --version
slither contracts/Crowdfunding.sol --solc solc --json docs/security/slither-crowdfunding.json --fail-none
slither contracts/CrowdfundingFactory.sol --solc solc --json docs/security/slither-factory.json --fail-none
```

`--fail-none` chỉ tránh dùng severity để quyết định exit code; không loại bỏ detector hoặc phát hiện khỏi JSON. Phải đọc `success`, `error` và `results.detectors` để xác định kết quả. Khi chạy lại, dùng tên output mới hoặc chủ động quản lý file cũ; Slither không ghi đè JSON đã tồn tại.

**Raw output:** [Crowdfunding](slither-crowdfunding.json), [Factory và dependency](slither-factory.json). Hai file đều ghi `success: true`, `error: null`. Mỗi lượt chạy sử dụng 102 detectors; điều đó không đồng nghĩa phát hiện mọi loại lỗi.

SHA-256 của source được phân tích (bao gồm comment; sửa file sẽ làm hash thay đổi):

```text
contracts/Crowdfunding.sol
ffe0bc39208681be40bffeaaedacf262406420a17929960f1a9b10a6247423ef
contracts/CrowdfundingFactory.sol
3dde7791b0ef67d893eab97ae2bb03584eb33faab0c1d31c3fc3c72df7cffd91
```

Đây là chạy trực tiếp bằng solc, không phải benchmark gas hay xác nhận cùng optimizer settings với build Hardhat.

## 2. Kết quả thực tế

| Detector | Severity do Slither gán | Crowdfunding | Factory + dependency |
| :--- | :--- | ---: | ---: |
| `timestamp` | Low | 7 | 7 |
| `solc-version` | Informational | 1 | 1 |
| `low-level-calls` | Informational | 4 | 4 |
| `naming-convention` | Informational | 1 | 4 |
| **Tổng instance** | | **13** | **16** |

**High: 0; Medium: 0** trong cả hai lượt. Lượt factory gồm lại các phát hiện của Crowdfunding nên **không cộng 13 + 16 thành 29 lỗi độc lập**. Bốn là số nhóm detector đang có kết quả, không phải tổng số phát hiện hoặc bốn Informational. Severity giữ nguyên từ công cụ; nhận định triage không đổi nhãn Low thành Informational.

## 3. Triage và giới hạn

### 3.1. `timestamp` — Low, 7 instance

**ACCEPTED theo thiết kế, có giới hạn:** pledge, unpledge, claim, refund, state, timeLeft và receive cần so sánh deadline. Trên Ethereum PoS, timestamp execution payload được xác định theo slot, không tùy chỉnh ±15 giây. Tuy nhiên giao dịch có thể vào block muộn, slot có thể bị bỏ qua và bên sản xuất block có thể chọn/thay đổi thứ tự giao dịch. Không bảo đảm giao dịch gửi sát hạn được xử lý trước hạn; mạng EVM khác có quy tắc thời gian riêng.

Test EVM kiểm tra các mốc cụ thể, gồm claim bị chặn tại `endAt - 1`, claim hợp lệ tại `endAt`, pledge/unpledge bị chặn tại `endAt`. Đây không phải chứng minh liveness hay chống kiểm duyệt.

Nguồn: [Ethereum consensus specification](https://github.com/ethereum/consensus-specs/blob/master/specs/bellatrix/beacon-chain.md#process_execution_payload).

### 3.2. `solc-version` — Informational

**REVIEWED, còn giới hạn công cụ:** Slither nêu `VerbatimInvalidDeduplication`, `FullInlinerNonExpressionSplitArgumentEvaluationOrder`, `MissingSideEffectsOnSelectorAccess` trong thông tin pragma/version. Source hiện không dùng inline assembly/verbatim, custom Yul optimizer sequence hoặc biểu thức truy cập selector có side effect tương ứng. Hardhat ghim compiler 0.8.20 và optimizer 200 runs.

Không suy ra bản compiler không có bug. Khi đổi compiler, optimizer hoặc source phải xem lại điều kiện ảnh hưởng và chạy lại test/phân tích. Tham khảo [Solidity known bugs](https://docs.soliditylang.org/en/latest/bugs.html).

### 3.3. `low-level-calls` — Informational, 4 instance

**ACCEPTED có kiểm chứng theo kịch bản:** unpledge, claim, refund và sweep dùng low-level call để chuyển ETH. Các hàm có guard và kiểm tra `success`; unpledge/refund cập nhật sổ sách trước chuyển tiền, claim đặt `claimed` trước chuyển, sweep tính phần dư trước call mà không sửa khoản ghi nhận.

Bộ test dùng `RejectingReceiver` để chứng minh `TransferFailed` rollback và retry ở cả bốn luồng. Với refund, còn kiểm tra backer thông thường vẫn rút được dù receiver khác từ chối ETH. Điều này không bảo đảm mọi ví nhận đều tương thích; creator/receiver không thể nhận ETH có thể vẫn không rút được cho đến khi khắc phục phía receiver, nếu họ có khả năng làm vậy.

### 3.4. `naming-convention` — Informational

**ACCEPTED theo quy ước source:** tham số có tiền tố `_` bị detector đánh dấu. Lượt contract chính có `_amount`; lượt factory thêm `_goal`, `_durationSeconds`, `_creator`. Đây là lựa chọn đặt tên, không phải kết luận về an toàn quỹ.

## 4. Kiểm chứng động bổ trợ

* `npm test`: 18 test mô hình JavaScript + 41 test Hardhat EVM. Mô hình JavaScript không thực thi Solidity.
* Nested refund kiểm tra revert selector `ReentrancyGuardTriggered` trong khi refund bên ngoài vẫn hoàn tất.
* Forced ETH kiểm tra balance khác pledged, refund theo khoản ghi nhận và sweep phần dư. [EIP-6780](https://eips.ethereum.org/EIPS/eip-6780) không loại bỏ việc SELFDESTRUCT chuyển ETH; điều kiện cùng transaction liên quan đến xóa code/storage.
* Fuzz: 80 thao tác pledge/unpledge còn hạn, bốn actor, seed `0xC0FFEE`, không forced ETH/claim/refund. `balance == pledged` chỉ được kiểm tra trong phạm vi đó; không phải bất biến toàn lifecycle.

**Kết luận:** hai lượt chạy không báo High/Medium; các phát hiện Low/Informational được giải thích ở trên. Đây là phân tích tĩnh có phạm vi, không phải audit độc lập, chứng nhận không có lỗ hổng hoặc bằng chứng coverage 100%.
