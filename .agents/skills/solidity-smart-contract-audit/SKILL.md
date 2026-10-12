---
name: solidity-smart-contract-audit
description: Chuẩn mực bảo mật, kiến trúc và kiểm toán hợp đồng thông minh Solidity (0.8+) cho đồ án Crowdfunding. Hướng dẫn áp dụng mẫu CEI (Checks-Effects-Interactions), ReentrancyGuard, cơ chế rút tiền an toàn Pull-over-Push, đặc tả bất biến toán học (Storage Invariants) và khả năng chống chịu tấn công Forced ETH.
---

# Solidity Smart Contract Security & Audit Guidelines

Hướng dẫn quy chuẩn kỹ thuật và kiểm toán chuyên sâu dành cho **Hợp đồng thông minh Gây quỹ cộng đồng (Crowdfunding Smart Contract)** có Mục tiêu (Goal) và Thời hạn (Deadline).

---

## 1. Các Quy Tắc Bảo Mật Bắt Buộc (Mandatory Security Rules)

### 1.1. Mẫu Checks-Effects-Interactions (CEI Pattern)
Mọi hàm thay đổi trạng thái và thực hiện chuyển tiền (chuyển ETH/Token) **BẮT BUỘC** tuân thủ thứ tự:
1. **Checks**: Kiểm tra điều kiện tiên quyết (ví dụ: `require` hoặc `if (...) revert CustomError()`).
2. **Effects**: Cập nhật toàn bộ biến trạng thái nội bộ TRƯỚC (ví dụ: gán `claimed = true`, đặt `pledgedAmount[msg.sender] = 0`).
3. **Interactions**: Thực hiện lời gọi ra bên ngoài cuối cùng (`(bool sent, ) = recipient.call{value: amount}("")`).

### 1.2. Mẫu Hoàn Tiền Chủ Động: Pull over Push (Chống DoS)
- **CẤM TUYỆT ĐỐI**: Dùng vòng lặp `for/while` lặp qua mảng toàn bộ người đóng góp để tự động chuyển tiền trả lại (`Push payment`). Nếu 1 người đóng góp là contract độc hại cố tình revert trong hàm `receive()`, toàn bộ giao dịch refund của dự án sẽ sụp đổ (Denial of Service).
- **QUY CHUẨN BẮT BUỘC**: Sử dụng mẫu **Pull payment** (`claimRefund()` hoặc `refund()`). Từng người đóng góp tự chủ động gọi hàm để rút phần đóng góp của chính mình.

### 1.3. Khóa Tái Nhập (Reentrancy Guard)
- Sử dụng modifier `nonReentrant` trên toàn bộ các hàm có tương tác chuyển ETH (`claim()`, `refund()`, `unpledge()`).
- Ngăn chặn triệt để cả tấn công tái nhập đơn hàm (Single-function Reentrancy) và tái nhập chéo hàm (Cross-function Reentrancy).

### 1.4. Tối Ưu Gas Với Custom Errors
- Không dùng chuỗi ký tự dài dòng trong `require(condition, "Very long revert string")`.
- Định nghĩa Custom Errors ở đầu contract (ví dụ: `error GoalNotReached()`, `error CampaignActive()`, `error ZeroPledge()`).
- Tiết kiệm gas triển khai bytecode và gas thực thi runtime, đồng thời hỗ trợ frontend giải mã 4-byte selector chính xác sang tiếng Việt.

---

## 2. Đặc Tả Bất Biến Toán Học (Mathematical Storage Invariants)

Trước hội đồng chấm thi, hợp đồng phải chứng minh được tính đúng đắn toán học qua 3 bất biến lưu trữ:

### Invariant 1: Bất biến Bảo toàn Vốn (Conservation of Funds)
$$\text{pledged} = \sum_{i=1}^{N} \text{pledgedAmount}[\text{backer}_i]$$
*Ý nghĩa:* Tổng số tiền contract ghi nhận luôn bằng chính xác tổng các khoản đóng góp riêng lẻ của từng backer. Không có wei nào tự nhiên sinh ra hoặc mất đi trong sổ cái kế toán.

### Invariant 2: Bất biến Khả năng Thanh khoản (Solvency Invariant)
$$\text{address}(\text{this}).\text{balance} \ge \text{pledged}$$
*Ý nghĩa:* Số dư ETH thực tế của hợp đồng luôn lớn hơn hoặc bằng tổng số tiền đã đóng góp chưa giải ngân. Đảm bảo hợp đồng luôn đủ khả năng thanh toán 100% cho toàn bộ backers khi hoàn tiền.

### Invariant 3: Máy Trạng Thái Bất Khả Hoàn Tác (State Machine Monotonicity)
$$\text{State}: \text{Active} \longrightarrow \{\text{Successful}, \text{Failed}\} \longrightarrow \text{Claimed}$$
- Khi thời gian còn hạn (`block.timestamp < endAt`): Trạng thái là `Active`.
- Khi đã hết hạn (`block.timestamp >= endAt`):
  - Nếu `pledged >= goal`: Chuyển sang `Successful`.
  - Nếu `pledged < goal`: Chuyển sang `Failed`.
- Trạng thái đã sang `Successful` hoặc `Failed` thì **không thể quay lại `Active`**.

---

## 3. Khả Năng Phòng Thủ Các Tình Huống Biên (Edge Cases & Resilience)

### 3.1. Biên Thời Gian Tuyệt Đối (`block.timestamp == endAt`)
- Đóng cổng góp vốn chính xác tại giây `endAt`: Điều kiện đóng góp là `block.timestamp < endAt`.
- Mở cổng kết toán chính xác tại giây `endAt`: Điều kiện kết toán là `block.timestamp >= endAt`.
- Không có khoảng trống thời gian vô định nào giữa 2 trạng thái.

### 3.2. Chống Tấn Công Bơm ETH Cưỡng Bức (Forced ETH via selfdestruct)
- Kẻ tấn công có thể ép ETH vào contract thông qua opcode `selfdestruct` của một contract phụ hoặc `coinbase transfer`.
- Khi đó: `address(this).balance > pledged`.
- **Giải pháp**:
  - Khi hoàn tiền (`refund`): Hoàn đúng số tiền đã ghi nhận `pledgedAmount[msg.sender]`, không đọc trực tiếp từ `balance`.
  - Khi giải ngân (`claim`): Chủ dự án có thể rút toàn bộ quỹ hoặc hợp đồng trang bị hàm `sweepExcessEther()` chỉ cho phép Creator rút phần ETH dư ngoài ý muốn sau khi chiến dịch đã hoàn tất an toàn.

---

## 4. Checklist Tự Kiểm Toán Trước Buổi Bảo Vệ (Self-Audit Checklist)

- [ ] Toàn bộ hàm chuyển ETH có modifier `nonReentrant` chưa?
- [ ] Mọi cập nhật số dư lưu trữ đã nằm TRƯỚC dòng lệnh `.call{value: ...}("")` chưa?
- [ ] Giá trị trả về `(bool sent, )` có được kiểm tra `if (!sent) revert TransferFailed()` không?
- [ ] Có tồn tại vòng lặp vô hạn nào duyệt qua danh sách người đóng góp không?
- [ ] Đã có test case mô phỏng contract tấn công Reentrancy cố ý gọi lại chưa?
- [ ] Đã có test case kiểm thử đúng giây `endAt` chưa?
