---
name: anti-slop-frontend
description: Audit, de-slop, and craft frontend UI free of generic AI design patterns (AI slop). Banishes first-order tells (purple-indigo gradients, generic dark mode glows, Inter, 3-card Bento fatigue, box-in-a-box) and second-order tells (decorative 01/02 numbering, uppercase tracked eyebrows everywhere, redundant helper text, emojis as UI icons). Enforces high-craft precision, intentional hierarchy, and calm product design.
---

# Anti-Slop Frontend Skill: De-Slopping & High-Craft UI

Dùng khi audit, đánh giá và tái cấu trúc giao diện frontend để loại bỏ hoàn toàn các dấu hiệu "AI Slop" (giao diện vô hồn, chắp vá, giống hàng ngàn trang web do AI tạo ra).

---

## 1. Triệu Chứng AI Slop Cần Triệt Phá (The Slop Catalog)

### 1.1 First-Order Tells (Dấu hiệu AI cơ bản - P0)
- **Gradient tím/indigo chéo (`C1`)**: Lạm dụng gradient tím - xanh (`#6366f1` đến `#a855f7`) trên logo, viền, button hoặc background.
- **Ánh sáng Neon Glow không mục đích (`C5`)**: Dùng `box-shadow: 0 0 20px rgba(..., 0.5)` làm giao diện trông như đồ chơi game thủ rẻ tiền thay vì công cụ tài chính tin cậy.
- **Hội chứng "Hộp trong hộp" (Box-in-a-Box Fatigue / `L4`)**: Mỗi phần tử đều có viền (`border`), nền riêng (`background`), bo góc (`border-radius`) và đệm (`padding`). Giao diện bị phân mảnh thành hàng chục khối chữ nhật lồng nhau khiến mắt mỏi nhừ.
- **Dark-mode xám xịt cẩu thả (`C3`, `SD2`)**: Nền đen `#0b0f17` kết hợp với chữ xám mờ không đủ độ tương phản, thiếu chiều sâu bề mặt thực sự.

### 1.2 Second-Order Tells (Dấu hiệu "AI tỏ ra sành điệu" - P1)
- **Đánh số thứ tự vô nghĩa (`SD6`)**: Gắn `01 ·`, `02 ·` vào các khối chức năng không phải là quy trình tuần tự.
- **Eyebrow Caps phản xạ có điều kiện (`SD4`, `T5`)**: Bất kỳ tiêu đề nào cũng bị nhét một dòng chữ hoa bé tí phía trên (ví dụ: `CHIẾN DỊCH #001 · HỢP ĐỒNG THÔNG MINH`).
- **Chú thích thừa mứa dưới từng nút bấm (`CP4`)**: Đặt dòng giải thích dài dòng dưới mọi nút bấm (ví dụ: *"Chỉ mở khi đã qua hạn 7 ngày và..."*) thay vì thiết kế affordance và tooltip tinh gọn.
- **Lạm dụng Emoji làm Icon (`3.D`)**: Đặt emoji (`🛡️`, `⚡`, `🚀`) trực tiếp vào nhãn giao diện làm giảm tính nghiêm túc của sản phẩm kỹ thuật cao.
- **Slogan quảng cáo sáo rỗng (`CP1`)**: Sử dụng các cụm từ sáo rỗng như *"Nền tảng đẳng cấp"*, *"Mở khóa sức mạnh"* thay vì ngôn ngữ chức năng chính xác.

---

## 2. Nguyên Tắc Thiết Kế Anti-Slop (Precision Craft Principles)

1. **Hierarchy by Space, Not Borders (Phân cấp bằng khoảng cách, không lạm dụng viền)**:
   - Nhóm các phần tử liên quan bằng khoảng cách gần gũi (Gestalt proximity).
   - Bỏ 50% số khung viền không cần thiết. Để nội dung tự thở trên một mặt phẳng đồng nhất.

2. **Confident Typography (Phông chữ đĩnh đạc, rõ nét)**:
   - Dùng kích thước và độ đậm của chữ để dẫn dắt ánh nhìn.
   - Số liệu chính (Key Metrics) phải to, rõ ràng, dứt khoát, đi kèm đơn vị màu phụ dịu mắt.
   - Loại bỏ các dòng micro-subtag gây nhiễu thị giác.

3. **Restrained Color Palette (Bảng màu kiềm chế, tối giản)**:
   - 1 màu chủ đạo có mục đích rõ ràng (ví dụ: Xanh dương chuẩn Web3 hoặc Trắng/Đen đơn sắc).
   - Màu trạng thái (Xanh lá / Đỏ) chỉ xuất hiện khi có sự kiện thực sự, không dùng để trang trí lòe loẹt.
   - Nền và bề mặt (Surfaces) phải có độ sâu tự nhiên dựa trên độ phản quang tinh tế, không dùng màu neon.

4. **Action-First & Zero Friction (Ưu tiên hành động, giảm tải nhận thức)**:
   - Input số tiền và nút hành động phải liền mạch, tối giản số lần nhấp chuột.
   - Trạng thái vô hiệu (Disabled) cần tinh tế: làm mờ nhẹ kèm con trỏ `not-allowed`, không cần chèn thêm đoạn văn bản giải thích chiếm diện tích màn hình.

5. **Silent Power (Đẳng cấp thầm lặng - Linear/Stripe Aesthetic)**:
   - Góc bo đồng nhất (`--radius: 8px` hoặc `10px`).
   - Đường viền siêu mảnh (1px Hairline tinh tế, độ mờ 6-8%).
   - Tương tác vi mô (hover, active) dứt khoát, nhanh gọn (< 150ms).
