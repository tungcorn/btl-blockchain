# PHẦN 4: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

---

## 4.1. Giá trị và kết quả thu được

Đề tài triển khai và kiểm thử các luồng chính của **Đề W — Crowdfunding có mục tiêu và hạn thời gian**:

1. **Lý thuyết và thiết kế:** sử dụng account/storage, ETH/wei, timestamp, phân quyền và máy trạng thái để giải thích điều kiện góp vốn, giải ngân và hoàn tiền. CEI cùng guard tự cài đặt giảm rủi ro tái nhập; Pull Refund tách giao dịch của từng người nhận.
2. **Solidity:** `Crowdfunding.sol` hỗ trợ góp/rút trước hạn, claim sau hạn khi đủ mục tiêu, refund khi thất bại và sweep phần dư có điều kiện. `CrowdfundingFactory.sol` tạo và quản lý các chiến dịch có trạng thái/số dư riêng.
3. **Kiểm thử:** 18 test mô hình JavaScript và 41 test Hardhat EVM kiểm tra các kịch bản đã xác định. Bổ sung bằng chứng về rút hết rồi góp lại, biên deadline, đủ vốn nhưng chưa được claim, rollback/retry khi nhận ETH lỗi và tính độc lập giữa các backer. Kết quả chi tiết và phạm vi fuzz được ghi ở mục 3.3; phân tích tĩnh có phạm vi và kết quả riêng tại [báo cáo Slither](../security/slither-report.md).
4. **Demo:** sandbox JavaScript minh họa mục tiêu, thời hạn, ví và sổ sách; connector hỗ trợ góp và rút một phần/toàn bộ qua số ETH nhập. Script local triển khai hai campaign và thu receipt/state trước-sau thật trên Hardhat node; xem [phụ lục](06_doi_chieu_va_minh_chung.md). Script dùng tài khoản test mở khóa, chưa chứng minh MetaMask ký/Sepolia. Slider chỉ tác động mô hình JavaScript.
5. **Tổ chức nhóm:** ba thành viên phụ trách ba luồng góp vốn — giải ngân — hoàn tiền/an toàn, mỗi người có Solidity, test và nội dung báo cáo để trình bày. Phân công không thay thế việc xác nhận đóng góp thực tế.

Các test đạt là bằng chứng cho đầu vào và chuỗi thao tác đã chạy, không chứng minh đúng trong mọi trạng thái hay an toàn tuyệt đối. Các lựa chọn `immutable`, custom errors và vị trí đặt guard có lý do kỹ thuật; chưa có benchmark đối chứng nên không công bố mức gas tiết kiệm cố định.

---

## 4.2. Hạn chế của đề tài

1. **Phạm vi tài sản:** chỉ hỗ trợ native ETH, chưa có ERC-20/stablecoin. Biến động giá và phí mạng ảnh hưởng khoản góp nhỏ.
2. **Giải ngân một lần:** khi đủ điều kiện, creator nhận toàn bộ balance. Contract không bảo đảm dự án thực hiện đúng cam kết sau giải ngân; đó là rủi ro ngoài phạm vi escrow hiện tại.
3. **Quy tắc đạt mục tiêu:** một người có thể góp đủ phần còn thiếu trước deadline, khiến chiến dịch thành công và không mở refund. Đây là hệ quả của quy tắc `pledged >= goal`, không tự nó chứng minh có exploit/MEV. Nếu muốn đổi quyền lợi backer bằng cap, grace period hoặc biểu quyết, phải xác định lại yêu cầu và kiểm thử.
4. **Thời gian và đưa giao dịch vào block:** timestamp Ethereum PoS gắn với slot, không tùy chỉnh ±15 giây. Giao dịch gửi sát deadline có thể đến muộn do propagation, slot bị bỏ qua hoặc lựa chọn giao dịch của bên sản xuất block. Contract không bảo đảm đưa giao dịch vào block trước hạn.
5. **Ví nhận ETH:** contract ví có thể từ chối tiền làm giao dịch rút/claim của chính họ revert. Tests xác nhận sổ sách rollback và có thể thử lại khi receiver chấp nhận ETH; không có chức năng đổi người hưởng lợi hoặc rút hộ trong triển khai hiện tại.
6. **Phạm vi kiểm chứng:** fuzz hiện tại gồm 80 thao tác pledge/unpledge còn hạn với một seed và bốn actor, không bao phủ toàn bộ lifecycle. Chưa có chứng minh hình thức, audit độc lập hoặc kết luận coverage 100%. Phân tích tĩnh không phát hiện được mọi lỗi.
7. **Giới hạn demo/Web3:** sandbox dùng số JavaScript và không thực thi bytecode. Kiểm thử trình duyệt với provider giả lập không thay thế ký/broadcast bằng MetaMask thật. Nhật ký Web3 chỉ giữ các giao dịch gần nhất trong phiên, không phải indexer hay lịch sử bền vững.

---

## 4.3. Hướng mở rộng trong tương lai

### 1. Giải ngân theo cột mốc
Tách giải ngân thành nhiều đợt, gắn với minh chứng tiến độ hoặc biểu quyết. Cần đặc tả quyền bỏ phiếu, cách xử lý tranh chấp và hoàn phần tiền còn lại trước khi triển khai.

### 2. Hỗ trợ ERC-20
Có thể dùng `SafeERC20` của OpenZeppelin khi bổ sung token. Phải xác định cách xử lý decimals, token có phí chuyển, token không chuẩn và các rủi ro của token; không suy ra hỗ trợ ETH đồng nghĩa đã hỗ trợ token.

### 3. Đánh giá trên Layer-2
Đo chi phí thực tế trên mạng EVM được chọn, gồm phí thực thi và thành phần phí dữ liệu nếu có. Không cam kết chi phí USD hoặc TPS cố định khi chưa đo và chưa nêu điều kiện mạng.

### 4. Mở rộng kiểm chứng
Tăng seed/chuỗi thao tác, đưa claim/refund/forced ETH vào stateful tests; đo coverage và gas bằng cấu hình tái lập. Lưu phiên bản compiler/công cụ, raw output và giới hạn của từng phép kiểm tra.

### 5. Nghiên cứu quản trị/tài trợ cộng đồng
DAO hoặc quadratic funding là hướng nghiên cứu, không phải tính năng đã hoàn thành. Cần mô hình chống Sybil, quy tắc phân bổ và đánh giá rủi ro riêng.
