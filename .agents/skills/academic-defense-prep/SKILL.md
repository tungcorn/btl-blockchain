---
name: academic-defense-prep
description: Chuẩn bị bảo vệ Đề W theo ba luồng Blockchain, phân biệt sandbox, Hardhat EVM và giao dịch có ví ký; dùng bằng chứng thực tế, không suy ra an toàn từ số test.
---

# Hướng dẫn bảo vệ Crowdfunding — nguồn chuẩn hiện hành

Đọc `docs/group_report.md` mục 1 và `docs/report/03_trien_khai_va_thuc_nghiem.md` trước khi soạn slide/kịch bản. Không dùng preset, số test hoặc phân công ghi nhớ từ phiên bản cũ. Đây là hướng dẫn chuẩn bị, không phải rubric chính thức của giảng viên.

## Phân công và thời lượng

- Đây là chia để bảo vệ chung một sản phẩm, không phải chia module làm việc độc lập. Tách phạm vi chuẩn bị ở group_report mục 1.1–1.2 khỏi nội dung nói ở 1.3–1.4; không suy ra tác giả lịch sử hoặc tỷ lệ đóng góp.
- TV1 — Góp vốn và quyền rút trước hạn: chứng minh vì sao cần mapping cá nhân và tổng pledged, cập nhật nhất quán khi góp/rút. ETH/wei/payable là phương tiện giải thích, không chỉ đọc cú pháp. Hiểu cả rollback/retry khi unpledge lỗi.
- TV2 — Điều kiện giải ngân thành công: đủ goal chưa đủ, còn deadline/quyền creator/chưa claim; giải thích state và balance/accounting trước-sau. Factory, immutable/custom errors và chi tiết Web3 để hỏi sâu; không giữ một slide chính riêng chỉ để giảng stack kết nối. Hiểu rollback/retry khi claim lỗi.
- TV3 — Hoàn tiền khi thất bại và chống hoàn sai: refund đúng caller/khoản, không hoàn hai lần; CEI/guard/rollback gắn với refund và giao dịch backer riêng. Không biến lượt chính thành tổng quan mọi vấn đề bảo mật.
- Nested refund, forced ETH, sweep, fuzz và Slither là minh chứng mở rộng chung; TV3 làm đầu mối chuẩn bị sâu, TV1/TV2 vẫn hiểu giới hạn và chịu trách nhiệm lỗi/an toàn luồng mình. Web3/gas/receipt là nền chung; đầu mối tích hợp TV2 không làm thay cả nhóm.
- Mỗi người tự nói và thao tác luồng của mình trong 3–4 phút nếu thời lượng cho phép, theo quy tắc → quyết định thiết kế → ca đúng/sai → bằng chứng. Không cân bằng bằng số slide/hàm/test. Vai trò bấm máy/hỗ trợ code có thể luân phiên, không cố định một người chỉ thao tác.
- Chuẩn bị một bảng state trước/sau và ba test EVM tiêu biểu/người. Có sẵn kết quả để đối chiếu, không bắt buộc chạy tất cả trực tiếp. Diễn tập không đọc slide, đổi caller/amount/time và hỏi nối luồng theo group_report mục 1.6; ghi chỗ vướng/kết quả luyện lại, không tự đánh dấu đã sẵn sàng.

## Mạch trình bày

1. Đề W và quy tắc do nhóm lựa chọn: nhận ETH, rút trước hạn, claim sau hạn nếu đủ goal, refund nếu thiếu goal.
2. Trạng thái tính khi gọi `state()`; không có đồng hồ tự gửi giao dịch vào contract.
3. Ba luồng của TV1/TV2/TV3, mỗi luồng nối điều kiện Solidity với state và test.
4. Kết quả thực nghiệm, giới hạn và đóng góp thực tế. Không gán phần trăm hoặc tác giả lịch sử từ tên TV trong test.

## Preset sandbox hiện hành

- TV1: reset, Alice góp 3 ETH, rút 1 ETH, khoản còn 2; thử rút quá khoản góp.
- TV2: đủ vốn 4 + 3 + 3 = 10 ETH tại ngày 6.9; chọn creator vẫn chưa claim được. Chuyển 7.0, so sánh ví thường/creator, claim; balance về 0 nhưng pledged/mapping giữ nguyên.
- TV3: Alice góp 3/10 ETH tại ngày 7.2; refund rồi không được hoàn lần hai.
- Vượt goal dự phòng: 12/10 ETH tại ngày 7.2; không nhầm với test EVM dùng 11 ETH.

## Phân biệt minh chứng và phương án dự phòng

- Sandbox/CLI là JavaScript, không thực thi Solidity. Slider không đổi timestamp blockchain. CLI hash mô phỏng không phải tx hash thật.
- Hardhat tests chạy bytecode trên EVM cục bộ. Script RPC local có receipt cũng không chứng minh MetaMask đã ký.
- MetaMask nối local node hoặc Sepolia cần xác nhận trong ví, chain ID, địa chỉ, hash/receipt và state trước/sau. Không dùng ví có tài sản thật cho tài khoản test công khai.
- Mạng/ví lỗi: chuyển sang kết quả Hardhat EVM đã chuẩn bị và sandbox để minh họa, nói rõ đổi môi trường. Không gửi lại giao dịch mù quáng khi chưa kiểm tra hash/receipt/nonce.
- Không tuyên bố offline hoàn toàn khi trang còn phụ thuộc CDN. Font có fallback; Ethers cần được tải để kết nối Web3.

## Những câu phải trả lời đúng

- Guard là storage-based tự cài đặt, không import OpenZeppelin. Nested guarded refund bị chặn bởi ReentrancyGuardTriggered trước phần thân; CEI là lớp riêng.
- TransferFailed làm rollback state/event của lời gọi bị revert. Pull tách giao dịch backer, không làm receiver từ chối ETH tự nhiên nhận được tiền.
- `pledged == sum(pledgedAmount)` khác với balance. Sau claim, pledged có thể dương và balance bằng 0. Forced ETH có thể tăng balance mà không tăng pledged.
- Sweep chỉ creator, lấy chênh dương balance - pledged, không bắt buộc hết hạn; không phải cơ chế thu hồi mọi ETH sau claim.
- Ethereum PoS timestamp theo slot; giao dịch gửi sát hạn không được bảo đảm kịp vào block. Không nói validator tùy chọn lệch ±15 giây.
- Gas đã chi không được refund cùng khoản góp; giao dịch mined rồi revert vẫn có thể tốn gas.
- Lấy số test từ lần chạy thực tế, không cộng lặp log mô hình khi Hardhat discovery nạp lại file. Test/fuzz/Slither không phải audit độc lập hay chứng minh hình thức.
