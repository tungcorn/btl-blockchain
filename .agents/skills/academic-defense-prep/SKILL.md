---
name: academic-defense-prep
description: Hướng dẫn kịch bản bảo vệ đồ án BTL Blockchain trước Hội đồng chấm thi đại học. Bao gồm phương pháp luận cấu trúc bài thuyết trình (Pyramid Principle), kịch bản thao tác live demo 5-7 phút không rủi ro (Anti-Demo-Regret), cơ chế phòng thủ khi Testnet bị nghẽn (Fail-safe), và bộ câu hỏi - câu trả lời phản biện hóc búa của giảng viên.
---

# Academic Defense & Tech Demo Playbook

Cẩm nang chiến lược dành cho nhóm sinh viên bảo vệ Đồ án BTL **Hợp đồng thông minh Crowdfunding (Goal & Deadline)** trước Hội đồng chấm thi.

---

## 1. Cấu Trúc Bài Thuyết Trình (Pyramid Principle & Action Titles)

### 1.1. Nguyên lý Kim Tự Tháp (The Pyramid Principle)
- **Top-Down Communication**: Đưa ra kết luận và thông điệp then chốt trước, sau đó mới đi vào chi tiết kỹ thuật.
- **Quy tắc Ghost Deck**: Người chấm thi chỉ cần đọc lướt qua tiêu đề các slide (Action Titles) là nắm trọn vẹn mạch lập luận của toàn bài báo cáo.

### 1.2. Mẫu Cấu Trúc 6 Khối Slide Tiêu Chuẩn
1. **Bối cảnh & Vấn đề thực tiễn**: Rủi ro của nền tảng gây quỹ tập trung (Kickstarter, GoFundMe) — thiếu minh bạch, nguy cơ chiếm dụng vốn, rủi ro rút ruột dự án.
2. **Kiến trúc Hợp đồng Thông minh**: Mô hình State Machine (Active → Successful/Failed → Claimed), hai điều kiện tiên quyết (Goal & Deadline).
3. **Thiết kế Bảo mật Nâng cao**: Ba trụ cột phòng thủ: Mẫu Checks-Effects-Interactions (CEI), Khóa chống tái nhập (ReentrancyGuard), và Hoàn tiền chủ động Pull-over-Push (chống DoS).
4. **Đặc tả Bất biến Toán học (Formal Invariants)**: Chứng minh tính bảo toàn dòng vốn và thanh khoản của contract qua công thức toán học.
5. **Trình diễn Live Demo**: Thao tác DApp Cockpit trên máy chiếu (Kịch bản 1: Thành công & Rút vốn; Kịch bản 2: Thất bại & Hoàn tiền; Kịch bản 3: Vượt mục tiêu).
6. **Kết luận & Đóng góp**: Bộ test tự động 52 ca kiểm thử PASS 100%, sẵn sàng triển khai Sepolia Testnet.

---

## 2. Kịch Bản Thao Tác Live Demo 5-7 Phút (Anti-Demo-Regret Runbook)

### 2.1. Phân Chia Vai Trò Nhóm (3 Sinh viên)
- **Người 1 (Presenter - Thuyết trình)**: Đứng quay mặt về phía Hội đồng, trình bày mạch lạc, giải thích bối cảnh và dẫn dắt câu chuyện.
- **Người 2 (Pilot - Thao tác DApp Cockpit)**: Ngồi điều khiển laptop nối máy chiếu, bấm các nút kịch bản và tua thời gian chính xác theo lời Presenter nói.
- **Người 3 (Defense Anchor - Phản biện kỹ thuật)**: Đứng cạnh bảng/màn hình, sẵn sàng chỉ vào code Solidity, bảng Invariants, hoặc log Etherscan để trả lời câu hỏi bắt bẻ của giảng viên.

### 2.2. Trình Tự Kịch Bản 3 Màn

#### Màn 1: Giai đoạn Khởi động & Đóng góp Vốn (2 phút)
1. Chiếu giao diện DApp Cockpit ở chế độ sáng (Projector Friendly).
2. Chỉ vào 2 điều kiện: Mục tiêu `10.0 ETH`, Thời hạn `7 ngày`.
3. Pilot chọn ví `Bob (0.5 ETH)` và `Charlie (1.0 ETH)` bấm nạp tiền.
4. Presenter chỉ vào **Sổ cái On-chain**: Số dư tăng lên, thanh tiến độ nhích dần, thanh Invariant sáng xanh khẳng định $\text{pledged} = \sum \text{pledgedAmount}$.

#### Màn 2: Kịch bản Đạt mục tiêu & Rút vốn (2 phút)
1. Pilot bấm nút kịch bản nhanh `[Đạt mục tiêu & Rút vốn]`: Alice, Bob, Charlie góp đủ 10 ETH.
2. Pilot bấm tua thời gian sang `7.1d (Hết hạn)`: Hợp đồng chuyển sang trạng thái `Successful`.
3. Hệ thống tự động chuyển ví sang `Chủ dự án (Creator)`. Nút "Rút vốn" sáng xanh, các nút khác tự động vô hiệu hóa.
4. Pilot bấm "Rút vốn": Toàn bộ quỹ được chuyển về ví Creator. Trạng thái chuyển sang `Claimed`.

#### Màn 3: Kịch bản Thất bại & Hoàn tiền Pull-over-Push (2 phút)
1. Pilot bấm `[Đặt lại mô phỏng]`, rồi bấm kịch bản `[Không đạt mục tiêu & Hoàn tiền]`: Tổng góp 4.5 ETH / 10 ETH.
2. Tua thời gian sang `7.1d (Hết hạn)`: Trạng thái chuyển sang `Failed`.
3. Presenter giải thích: Nút "Rút vốn" của Creator bị khóa vĩnh viễn (Zero False Affordance).
4. Pilot chuyển sang ví `Bob`: Nút "Hoàn tiền" sáng lên. Bấm hoàn tiền: Bob nhận lại chính xác 100% ETH đóng góp.

---

## 3. Cơ Chế Phòng Thủ Sự Cố Live Demo (Fail-Safe Strategy)

| Rủi ro khi Demo | Kế hoạch Phòng ngừa & Xử lý Tức thì |
|---|---|
| **Mạng Sepolia Testnet bị nghẽn / RPC timeout** | Không hoảng loạn. Bấm ngay tab **Mô phỏng Sandbox** ở góc trên bên phải. Chế độ Sandbox chạy EVM cục bộ tức thì 0 giây trễ, hoàn toàn độc lập với mạng internet. |
| **MetaMask bị kẹt nonce hoặc popup không hiện** | Presenter tiếp tục nói giải thích logic hợp đồng; Pilot F5 trang web hoặc bấm nút "Làm mới" (`refreshOnChainState`). |
| **Máy chiếu mờ hoặc lóa sáng trong phòng họp** | Bấm ngay phím tắt `T` hoặc click icon mặt trời/mặt trăng để chuyển sang **Chế độ Sáng (WCAG AAA)** với chữ đen đậm trên nền sáng. |

---

## 4. Bộ Câu Hỏi Phản Biện Của Giảng Viên & Cách Trả Lời Chuẩn Mực

> **Hỏi 1: Tại sao nhóm không tự động chuyển tiền hoàn lại (Push refund) cho tất cả người góp khi hết hạn mà lại bắt từng người tự bấm rút (Pull refund)?**
> 
> *Trả lời:* "Thưa thầy cô, việc tự động lặp mảng để gửi tiền (Push) là một lỗi bảo mật nghiêm trọng (Denial of Service). Nếu 1 người đóng góp là hợp đồng độc hại cố tình revert trong hàm fallback, toàn bộ giao dịch refund của tất cả mọi người sẽ bị kẹt mãi mãi. Nhóm áp dụng mẫu chuẩn **Pull over Push** của Ethereum: từng người tự chủ động rút phần tiền của mình, lỗi của một cá nhân sẽ không bao giờ ảnh hưởng đến phần tiền của người khác."

> **Hỏi 2: Nhóm xử lý thế nào nếu có kẻ cố tình dùng `selfdestruct` để bơm thêm ETH ngoài ý muốn vào hợp đồng?**
> 
> *Trả lời:* "Hợp đồng của nhóm không bao giờ tính toán số tiền hoàn dựa trên `address(this).balance` mà dựa trên số dư ghi nhận trong mapping `pledgedAmount[backer]`. Do đó việc bơm thêm ETH không làm sai lệch số tiền hoàn của bất kỳ ai. Ngoài ra, nhóm trang bị hàm `sweepExcessEther()` cho phép Chủ dự án thu hồi phần ETH thặng dư ngoài ý muốn này sau khi chiến dịch đã kết toán an toàn."

> **Hỏi 3: Hợp đồng của nhóm có khả năng bị tấn công Reentrancy không? Nhóm phòng thủ thế nào?**
> 
> *Trả lời:* "Nhóm áp dụng phòng thủ 2 lớp (Defense-in-depth): Lớp 1 là tuân thủ nghiêm ngặt nguyên lý **Checks-Effects-Interactions (CEI)** — đưa số dư `pledgedAmount[msg.sender] = 0` TRƯỚC KHI chuyển ETH. Lớp 2 là bọc modifier `nonReentrant` của OpenZeppelin. Bộ test Hardhat của nhóm có riêng test case tạo contract `ReentrancyAttacker` cố ý gọi lại đệ quy nhưng đã bị khóa chặn hoàn toàn."
