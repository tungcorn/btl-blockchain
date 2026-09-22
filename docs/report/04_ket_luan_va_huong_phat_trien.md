# PHẦN 4: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

---

## 4.1. Giá trị và Kết quả Thu được

Trải qua quá trình nghiên cứu, thiết kế và triển khai thực nghiệm, đề tài đã hoàn thành 100% mục tiêu đề ra cho **Đề W – Hợp đồng thông minh Crowdfunding có mục tiêu và hạn thời gian (Nhóm C – Nâng cao)** với các kết quả cụ thể:

1. **Về mặt Khoa học và Công nghệ:**
   * Nắm vững kiến trúc máy ảo EVM, nguyên lý hoạt động của các biến môi trường khối và cơ chế đồng thuận PoS trên Ethereum.
   * Áp dụng thành công các mẫu thiết kế an ninh cấp doanh nghiệp: Mô hình **Checks-Effects-Interactions (CEI)** kết hợp khóa nội tại **ReentrancyGuard** giúp ngăn chặn triệt để nguy cơ tấn công rút tiền đệ quy; mô hình **Pull-over-Push Payments** loại bỏ hoàn toàn nguy cơ từ chối dịch vụ (DoS with unexpected revert) trong quá trình hoàn tiền.
   * Tối ưu hóa chi phí Gas trên phiên bản Solidity `^0.8.20` thông qua kỹ thuật nhúng biến `immutable` vào bytecode (tiết kiệm SLOAD ~2,100 gas mỗi lần đọc), cơ chế **Custom Errors** (giảm kích thước bytecode/chi phí deploy so với chuỗi `require`), và đặt guard `nonReentrant` chính xác ở các hàm có external call (tiết kiệm ~5,800 gas/lượt pledge).

2. **Về mặt Sản phẩm Kỹ thuật:**
   * Hợp đồng thông minh cốt lõi `Crowdfunding.sol` hoạt động ổn định, minh bạch và chính xác theo mô hình máy trạng thái (Active &rarr; Successful / Failed &rarr; Claimed).
   * Hợp đồng mở rộng `CrowdfundingFactory.sol` giải quyết bài toán mở rộng từ một chiến dịch đơn lẻ thành một nền tảng bệ phóng (Launchpad) đa chiến dịch.
   * Bộ kiểm thử tự động hai tầng toàn diện — **52/52 test cases PASS**: 18 Mock spec-based + 34 Hardhat EVM thực thi bytecode thật (bao gồm invariant fuzz và attack simulation), cùng báo cáo phân tích tĩnh **Slither (0 phát hiện Medium/High)**, chứng minh độ tin cậy trong mọi tình huống giao dịch và điều kiện biên.
   * Giao diện Web DApp `demo/` hiện đại, trực quan với **Hệ thống 2 Trục tiến độ (Tiền vốn & Dòng thời gian Blockchain)**, hỗ trợ công cụ du hành thời gian (Time Machine Slider) giúp người chấm điểm có thể kiểm chứng toàn bộ vòng đời hợp đồng mà không cần chờ đợi thời gian thực.

---

## 4.2. Hạn chế của Đề tài

Mặc dù đã hoàn thành xuất sắc các yêu cầu đặt ra, hệ thống vẫn tồn tại một số hạn chế cần được cải thiện trong môi trường sản xuất thực tế (nhóm tự nhận diện các rủi ro này qua quá trình threat modeling và adversarial review):
1. **Phạm vi tài sản hỗ trợ:** Hợp đồng hiện tại chỉ hỗ trợ đồng tiền gốc **Native ETH**. Trong các ứng dụng thương mại, sự biến động mạnh về giá của ETH có thể ảnh hưởng đến kế hoạch tài chính của dự án. Hệ thống chưa hỗ trợ các đồng Stablecoin phổ biến theo chuẩn ERC-20 (như USDT, USDC hay DAI).
2. **Tấn công "Goal Sniping" (MEV griefing):** Kẻ tấn công có thể theo dõi một chiến dịch sắp thất bại trong khối cuối cùng và pledge để đẩy `pledged >= goal`, khiến toàn bộ quỹ của người ủng hộ bị khóa lại cho chủ dự án (đặc biệt khi cấu kết off-chain). Hợp đồng hiện chưa có cơ chế phòng ngừa như cap cá nhân (anti-whale), khoảng "grace window" hoặc yêu cầu trạng thái Successful phải tồn tại một khoảng thời gian tối thiểu trước khi claim.
3. **Cơ chế giải ngân một lần (All-or-Nothing):** Toàn bộ số tiền gọi được sẽ được chuyển thẳng cho chủ dự án sau khi chiến dịch thành công. Cơ chế này chưa kiểm soát được việc chủ dự án có thực sự sử dụng tiền đúng mục đích sau khi rút hay không.
4. **Độ nhạy timestamp:** Việc xác định hết hạn dựa trên `block.timestamp` — validator có thể dịch thời gian trong biên hẹp (~12–15 giây) hoặc kiểm duyệt giao dịch pledge ở khối cuối; chấp nhận được với hạn theo ngày/tuần nhưng là giới hạn inherent cần ghi nhận.
5. **Chi phí giao dịch trên Ethereum Layer-1:** Mặc dù đã tối ưu hóa gas ở mức mã nguồn, việc thực hiện các giao dịch trên mạng chính Ethereum L1 trong các thời điểm nghẽn mạng vẫn có thể tốn kém đối với các khoản đóng góp giá trị nhỏ (Micro-pledging).

---

## 4.3. Hướng Mở rộng và Phát triển trong Tương lai

Để nâng tầm hệ thống thành một nền tảng gọi vốn phi tập trung quy mô lớn, nhóm định hướng các giai đoạn phát triển tiếp theo:

### 1. Giải ngân theo Cột mốc Tiến độ và Quản trị DAO (Milestone-based Escrow):
* Thay vì giải ngân 100% số tiền một lần, quỹ sẽ được chia thành các đợt (ví dụ: 30% - 40% - 30%).
* Sau khi hoàn thành giai đoạn 1, chủ dự án phải nộp báo cáo minh chứng. Những người ủng hộ (Backers) sẽ sử dụng quyền biểu quyết **DAO Voting** tỷ lệ theo số tiền đã góp để bỏ phiếu:
  * Nếu đa số đồng thuận &rarr; Hợp đồng giải ngân đợt tiếp theo.
  * Nếu dự án có dấu hiệu gian lận hoặc bỏ dở &rarr; Hợp đồng hủy chiến dịch và hoàn trả số tiền còn lại cho cộng đồng.

### 2. Tích hợp Đa token Chuẩn ERC-20 (Multi-Token Support):
* Mở rộng hợp đồng để chấp nhận cả ETH và các token ERC-20 bằng cách sử dụng thư viện `SafeERC20` của OpenZeppelin, giúp các chiến dịch gọi vốn ổn định giá trị bằng Stablecoin.

### 3. Triển khai trên Mạng lưới Mở rộng Layer-2:
* Đưa hợp đồng lên các mạng Layer-2 tương thích hoàn toàn với EVM (như Arbitrum, Optimism, Base hoặc zkSync) nhằm giảm chi phí gas xuống dưới **0.01 USD** mỗi giao dịch và tăng tốc độ xử lý lên hàng nghìn giao dịch mỗi giây.

### 4. Áp dụng Cơ chế Tài trợ Bậc hai (Quadratic Funding):
* Tích hợp công thức tính toán **Quadratic Funding** (như mô hình của Gitcoin Grants) kết hợp với giải pháp danh tính phi tập trung (Decentralized Identity - DID) nhằm tối ưu hóa việc phân bổ quỹ cho các dự án vì lợi ích công cộng (Public Goods), nơi số lượng người ủng hộ có trọng số quyết định cao hơn lượng tiền của một vài cá nhân giàu có (Whales).
