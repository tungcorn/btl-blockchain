---
name: web3-cockpit-ui-ux
description: Chuyên sâu về thiết kế, hoàn thiện và thẩm định giao diện DApp Web3 Cockpit và Dashboard tương tác cho đồ án Blockchain. Tích hợp nguyên lý Refactoring UI (8pt grid, visual hierarchy), Web3 UX (5-step transaction lifecycle, MetaMask feedback, Sepolia Etherscan linking) và chuẩn tương thích máy chiếu giảng đường WCAG AAA.
---

# Web3 Cockpit UI/UX Design System & Guidelines

Hướng dẫn quy chuẩn thiết kế và tối ưu giao diện dành riêng cho **DApp Cockpit (Bảng điều khiển tác chiến Web3)** phục vụ bảo vệ đồ án và sản phẩm thực chiến.

---

## 1. Hệ thống Spacing & Trục Thị giác (Refactoring UI)

### 1.1. Thang đo Spacing 8pt Bắt buộc
Mọi thuộc tính `margin`, `padding`, `gap` phải tuân theo thang đo bội số:
- Micro spacing: `4px` (hairline spacing, icon-gap nhỏ), `8px` (chip gap, tag padding)
- Component spacing: `12px`, `16px` (card internal padding), `20px`, `24px` (section gaps)
- Layout spacing: `32px`, `48px` (khoảng cách giữa các khối lớn)
- **Cấm tuyệt đối**: Sử dụng các giá trị tùy tiện như `7px`, `13px`, `19px`.

### 1.2. Phân cấp Thị giác (Visual Hierarchy qua Weight & Contrast)
- **Không lạm dụng phóng to cỡ chữ**: Phân cấp bằng `font-weight` (400 regular, 600 semibold, 700 bold) kết hợp màu tương phản:
  - Text chính (Primary): `#F1F5F9` (dark) / `#0F172A` (light)
  - Text thứ cấp (Muted): `#94A3B8` (dark) / `#475569` (light)
  - Text chú thích (Subtle/Dim): `#64748B` (dark) / `#64748B` (light)
- **Triệt tiêu hội chứng "Box-in-a-box"**: Không lồng quá 2 lớp khung viền viền kín. Dùng khoảng trắng có chủ đích (`whitespace`) hoặc nền màu dịu nhẹ (`var(--bg-subtle)`) để phân nhóm phần tử.
- **Hero Metric Anchor**: Luôn có 1 chỉ số lớn nhất thu hút mắt nhìn (Tổng quỹ đã gọi + Tỷ lệ % hoàn thành mục tiêu), các chỉ số khác hiển thị vệ tinh dạng secondary grid.

---

## 2. Tiêu chuẩn Web3 Transaction UX (Scaffold-ETH & Ethskills)

### 2.1. Vòng đời Giao dịch 5 Bước (Transaction State Machine)
Mọi tương tác on-chain (`pledge`, `unpledge`, `claim`, `refund`) phải thể hiện rõ 5 pha:
1. **Idle (Sẵn sàng)**: Nút bấm hiển thị nhãn rõ ràng, phân quyền chuẩn (Chủ dự án vs Backer).
2. **Awaiting Signature**: Khóa nút (`disabled = true`, `pointer-events: none;`), hiển thị spinner và nhãn `"Đang chờ ký trên MetaMask..."`.
3. **Mempool Pending / Mining**: Nút đổi thành `"Đang đào khối..."`, hiển thị `tx.hash` rút gọn kèm link mở Etherscan trong tab mới.
4. **Mined / Confirmed**: Bắn toast thông báo thành công kèm Block Number, cập nhật lại số dư ví và trạng thái hợp đồng (`refreshOnChainState()`).
5. **Reverted / Error**: Giải mã mã lỗi Solidity thân thiện (Custom Errors), xử lý lỗi người dùng hủy ký (code `4001`) thành tiếng Việt: *"Bạn đã hủy yêu cầu ký trên MetaMask."*.

### 2.2. Tránh Lỗi Giả Affordance (Zero False Affordance)
- Khi nút bấm ở trạng thái `disabled`: Phải giảm `opacity` xuống 0.45 - 0.5, giữ viền trung tính, **không dùng màu xanh/đỏ rực rỡ** khiến người dùng hiểu nhầm là click được.
- Luôn hiển thị câu gợi ý điều kiện bên dưới nút: Giải thích rõ *tại sao nút bị mờ* và *khi nào thì mở khóa* (ví dụ: *"Chỉ khả dụng khi chiến dịch hết hạn và đạt mục tiêu"*).

---

## 3. Khả năng Hiển thị Máy chiếu Giảng đường (WCAG AAA Projector Mode)

- **Tỷ lệ tương phản**:
  - Chữ thông thường: Độ tương phản tối thiểu **4.5:1** (WCAG AA).
  - Số liệu then chốt và tiêu đề: Độ tương phản tối thiểu **7:1** (WCAG AAA).
- **Chế độ Sáng Chuyên dụng**: Máy chiếu giảng đường thường có độ sáng cao và phòng bật đèn sáng, chế độ nền tối có thể bị lóa mờ. Bắt buộc có nút chuyển nhanh sang **Chế độ Sáng (Light Theme)** với chữ đen đậm trên nền trắng kem (`#F8FAFC`).
- **Typography Pairing chuẩn Fintech**:
  - Phông chữ giao diện chính: Sans-serif hiện đại, nét dày dặn (`Be Vietnam Pro` hoặc `Inter`).
  - Phông chữ kỹ thuật số: Monospace đĩnh đạc cho địa chỉ hex, tx hash, số ETH (`JetBrains Mono`).

---

## 4. Checklist Thẩm định Giao diện Trước khi Bàn giao (Pre-Flight UI Check)

- [ ] Baseline của các thẻ metric trong cùng 1 hàng có thẳng tắp không?
- [ ] Không có chữ nào bị rớt dòng cụt lủn (ví dụ: `"QUỸ TRONG HỢP"` rớt chữ `"ĐỒNG"` xuống dòng)?
- [ ] Đã có ô nhập tiền riêng biệt cho Web3 thay vì đọc ngầm từ Sandbox?
- [ ] Mọi mã giao dịch hash có gắn link trực tiếp sang Sepolia Etherscan (`https://sepolia.etherscan.io/tx/...`)?
- [ ] Nút bấm có hiệu ứng tactile nhẹ khi click (`active: transform scale(0.98)`)?
- [ ] Không có lỗi layout shift (CLS) khi load dữ liệu hoặc đổi ví?
