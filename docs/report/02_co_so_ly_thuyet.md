# PHẦN 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ

---

## 2.1. Nền tảng Ethereum và Máy ảo EVM (Ethereum Virtual Machine)

### 2.1.1. Kiến trúc Máy ảo EVM
Ethereum là một máy trạng thái hữu hạn phân tán (Distributed State Machine). Trung tâm điều hành của mạng lưới là **EVM (Ethereum Virtual Machine)** – môi trường thực thi bytecode biệt lập, đảm bảo rằng mọi nút (Node/Validator) trong mạng lưới P2P đều tính toán và đạt cùng một kết quả trạng thái sau khi xử lý các giao dịch.

Trong EVM, có hai loại tài khoản chính:
1. **Tài khoản người dùng ngoài (Externally Owned Account - EOA):** Được kiểm soát bằng cặp khóa mật mã (Private Key & Public Key). EOA có thể tự khởi tạo giao dịch ký số.
2. **Tài khoản hợp đồng (Contract Account):** Không có Private Key; được kiểm soát bởi mã nhị phân bytecode đã được biên dịch và lưu trữ trên sổ cái. Contract Account chỉ thực thi khi nhận được giao dịch từ EOA hoặc lời gọi hàm nội bộ (Message Call) từ một contract khác.

### 2.1.2. Mô hình Lưu trữ Dữ liệu trong EVM
EVM chia bộ nhớ làm 3 vùng độc lập với chi phí gas khác biệt:
* **Storage:** Vùng nhớ trạng thái vĩnh cửu gắn liền với contract trên blockchain. Đọc/ghi vào `storage` (các opcode `SLOAD`/`SSTORE`) có chi phí gas cực kỳ đắt đỏ (từ 2,100 đến 20,000 gas mỗi slot 32 bytes).
* **Memory:** Vùng nhớ tạm thời chỉ tồn tại trong suốt vòng đời của một lời gọi hàm; được giải phóng sau khi hàm kết thúc.
* **Calldata:** Vùng nhớ chỉ đọc (Read-only), không thể chỉnh sửa, chứa dữ liệu đối số truyền vào từ giao dịch bên ngoài.

---

## 2.2. Ngôn ngữ lập trình Solidity (^0.8.20) và Kỹ thuật Tối ưu

### 2.2.1. Biến môi trường và Dòng thời gian khối (`block.timestamp`)
Trong Solidity, `block.timestamp` trả về dấu thời gian tính bằng giây (Unix epoch time) của khối hiện tại.
* **Đặc tính an toàn:** Kể từ bản nâng cấp Ethereum The Merge (Proof-of-Stake), các khối được tạo theo chu kỳ cố định (Slot = 12 giây). Validator có thể tinh chỉnh thời gian nhưng chỉ được phép lệch tối đa trong một biên độ rất hẹp (~15 giây) nếu không khối sẽ bị mạng lưới từ chối.
* **Khả năng áp dụng:** Vì dự án Crowdfunding xác định hạn chót theo đơn vị ngày hoặc tuần (`duration >= 1 day`), độ lệch vài giây của `block.timestamp` hoàn toàn không gây ảnh hưởng đến tính công bằng của chiến dịch. Hợp đồng lưu timestamp bằng `uint64` — đủ lớn để không tràn số trước năm 2106 (giá trị `uint32` sẽ bị cắt ngầm khi cast), mà vẫn tiết kiệm bytecode vì các biến này là `immutable` (không chiếm storage slot).

### 2.2.2. Tối ưu Gas với Biến `immutable`
Thay vì lưu trữ thông tin cố định trong `storage` tốn kém, Solidity cung cấp từ khóa `immutable`:
* Biến `immutable` (như `creator`, `goal`, `startAt`, `endAt`) được gán giá trị duy nhất một lần tại thời điểm chạy `constructor`.
* Trình biên dịch sẽ chèn trực tiếp giá trị của biến vào mã bytecode của hợp đồng. Khi thực thi các hàm sau này, EVM đọc giá trị trực tiếp từ bytecode thay vì tốn lệnh `SLOAD`, tiết kiệm khoảng **2,100 gas** cho mỗi lần đọc biến.

### 2.2.3. Tối ưu hóa Chi phí Revert bằng Custom Errors
Kể từ phiên bản Solidity 0.8.4, cơ chế **Custom Errors** được giới thiệu để thay thế cho chuỗi thông báo lỗi truyền thống trong lệnh `require`:
* **Cách cũ (`require(cond, "Long error string...")`):** Chuỗi văn bản được lưu trữ dưới dạng chuỗi UTF-8 chiếm nhiều slot bộ nhớ bytecode. Khi revert, EVM phải trích xuất và giải mã chuỗi, tiêu tốn từ 20,000 đến 40,000 gas.
* **Cách mới (`error GoalNotReached(); if (!cond) revert GoalNotReached();`):** Lỗi chỉ được mã hóa thành Function Selector 4 bytes (`bytes4(keccak256("GoalNotReached()"))`).
* **Hiệu quả:** Lợi ích chính nằm ở **kích thước bytecode và chi phí deploy** — chuỗi lỗi dài bị loại bỏ hoàn toàn khỏi contract code; tại runtime, khi revert, EVM không phải mở rộng memory để copy chuỗi UTF-8 nữa. Ngoài ra custom error hỗ trợ tham số kiểu hóa (typed) giúp dApps decode lỗi chính xác. Lưu ý đánh giá trung thực: mức tiết kiệm gas khi revert phụ thuộc độ dài chuỗi và ngữ cảnh, không cố định là "45%"; nhóm đo lường và trình bày theo số liệu thực tế thay vì con số tuyên truyền.

---

## 2.3. Các Mẫu Thiết Kế An Ninh Smart Contract Cốt Lõi

Để đảm bảo hợp đồng thông minh không thể bị hack và bảo vệ an toàn 100% tiền gửi của người dùng, nhóm áp dụng các mẫu thiết kế an ninh tiêu chuẩn quốc tế:

### 2.3.1. Mô hình Kiểm tra - Thay đổi - Tương tác (Checks-Effects-Interactions - CEI)
Đây là tiêu chuẩn vàng để phòng thủ trước lỗ hổng kinh điển **Tấn công Tái nhập (Reentrancy Attack)**. Nguyên tắc bắt buộc:
1. **Checks:** Kiểm tra toàn bộ điều kiện đầu vào (`require` hoặc `if ... revert`).
2. **Effects:** Cập nhật biến trạng thái nội bộ của hợp đồng (ví dụ: trừ số dư người dùng về 0).
3. **Interactions:** Thực hiện tương tác với các địa chỉ bên ngoài (gửi tiền ETH hoặc gọi hàm contract khác).

```solidity
// Minh họa CEI trong hàm hoàn tiền refund()
function refund() external nonReentrant {
    // 1. CHECKS: Kiểm tra hết hạn & không đạt mục tiêu
    if (block.timestamp < endAt) revert CampaignActive();
    if (pledged >= goal) revert GoalAlreadyReached();
    uint256 balance = pledgedAmount[msg.sender];
    if (balance == 0) revert NothingToRefund();

    // 2. EFFECTS: Xóa số dư người đóng góp về 0 TRƯỚC KHI chuyển tiền
    pledgedAmount[msg.sender] = 0;

    // 3. INTERACTIONS: Gửi ETH trả về ví
    (bool success, ) = payable(msg.sender).call{value: balance}("");
    if (!success) revert TransferFailed();
}
```
* **Tại sao an toàn:** Nếu kẻ tấn công dùng hợp đồng thông minh độc hại gọi đệ quy ngược lại hàm `refund()` trong hàm `receive()`, lúc này biến `pledgedAmount` của hắn đã bị gán bằng 0 ở bước Effects, lần gọi lặp thứ hai sẽ lập tức bị chặn đứng bởi lệnh kiểm tra `NothingToRefund()`.

### 2.3.2. Mô hình Rút tiền Chủ động (Pull over Push Payments)
Trong bài toán hoàn tiền khi chiến dịch thất bại:
* **Mô hình Đẩy (Push Payment - Không an toàn):** Hợp đồng dùng vòng lặp `for` để tự động chuyển trả tiền cho từng người trong danh sách. Nếu địa chỉ thứ 50 trong số 1,000 người là một contract cố tình viết hàm nhận tiền bị `revert`, toàn bộ giao dịch của 999 người còn lại sẽ bị rollback theo (lỗ hổng **DoS with Unexpected Revert**), hoặc giao dịch vượt trần Gas Limit của block.
* **Mô hình Kéo (Pull Payment - Tuyệt đối an toàn):** Hợp đồng không tự động gửi tiền. Thay vào đó, mỗi người ủng hộ tự chủ động phát giao dịch gọi hàm `refund()` để rút phần tiền của riêng mình. Sự cố từ một địa chỉ ví cá nhân hoàn toàn bị cô lập và không ảnh hưởng đến bất kỳ người nào khác trong hệ sinh thái.

### 2.3.3. So sánh Lệnh chuyển tiền: `transfer` vs `send` vs `call`
| Phương thức | Giới hạn Gas chuyển tiếp | Xử lý khi thất bại | Đánh giá an toàn hiện nay |
| :--- | :--- | :--- | :--- |
| `transfer()` | Cố định 2,300 gas | Tự động Revert | **Đã lỗi thời:** 2,300 gas không đủ nếu ví nhận là Smart Contract đa chữ ký (Gnosis Safe) sau bản cập nhật EIP-1884. |
| `send()` | Cố định 2,300 gas | Trả về `false` | **Không khuyến khích:** Dễ bị lập trình viên bỏ quên việc kiểm tra giá trị trả về boolean. |
| **`call{value: ...}("")`** | Chuyển tiếp toàn bộ gas khả dụng | Trả về `(bool, bytes)` | **Khuyến nghị chính thức:** Linh hoạt cho mọi loại ví; an toàn tuyệt đối khi kết hợp cùng mô hình **CEI** và **ReentrancyGuard**. |

---

## 2.4. Công nghệ Tương tác Phía Máy khách (Web3 Client)

### 2.4.1. Thư viện Ethers.js v6
Ethers.js là thư viện JavaScript hoàn chỉnh cho phép ứng dụng web kết nối và tương tác với máy ảo EVM:
* **Provider:** Kết nối trừu tượng chỉ đọc tới các nút mạng Blockchain (qua RPC URL hoặc `window.ethereum`).
* **Signer:** Đại diện cho tài khoản ví có khả năng ký số giao dịch mật mã.
* **Contract Interface:** Tự động phân tích chuỗi giao diện nhị phân **ABI (Application Binary Interface)** thành các hàm JavaScript có thể gọi được trực tiếp.

### 2.4.2. Cơ chế Ký số Giao dịch Offline qua MetaMask
MetaMask hoạt động như một cầu nối bảo mật (Bridge). Khi người dùng nhấn nút *"Đóng Góp ETH"* trên giao diện DApp:
1. Giao diện Web đóng gói payload gồm: địa chỉ đích (`to`), số ETH (`value`), và mã hex của hàm cần gọi (`data`).
2. Payload được chuyển tiếp cho extension MetaMask.
3. MetaMask hiển thị cửa sổ xác nhận chi tiết phí gas. Private Key của người dùng thực hiện thuật toán ký số đường cong elip **ECDSA (secp256k1)** ngay trên môi trường cục bộ của trình duyệt.
4. Giao dịch đã ký (Signed Transaction) được phát sóng (broadcast) vào mạng lưới Mempool của Ethereum mà không bao giờ để lộ khóa riêng ra môi trường web.
