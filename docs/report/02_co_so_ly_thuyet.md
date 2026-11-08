# PHẦN 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ

---

## 2.1. Nền tảng Ethereum và Máy ảo EVM (Ethereum Virtual Machine)

### 2.1.1. Kiến trúc Máy ảo EVM
Ethereum duy trì trạng thái phân tán. EVM thực thi bytecode theo các quy tắc xác định; các node xác thực phải tính ra cùng kết quả khi xử lý cùng trạng thái đầu vào và cùng giao dịch hợp lệ.

Trong mô hình tài khoản cơ sở:
1. **Externally Owned Account (EOA):** tài khoản có quyền ký giao dịch gắn với khóa riêng. Trong demo, ví MetaMask cung cấp signer để gửi giao dịch.
2. **Contract account:** có code và storage, không có khóa riêng để tự ký giao dịch. Contract thực thi trong quá trình xử lý giao dịch hoặc lời gọi từ contract khác; không tự thức dậy khi đồng hồ đến deadline. Mô hình này là nền tảng giải thích demo, không mô tả toàn bộ cơ chế ủy quyền tài khoản ở các nâng cấp Ethereum mới.

### 2.1.2. Lưu trữ dữ liệu và chi phí gas
Các vùng dữ liệu thường gặp trong Solidity:
* **Storage:** trạng thái của contract tồn tại qua các giao dịch, như `pledged` và `pledgedAmount`. Chi phí `SLOAD`/`SSTORE` phụ thuộc truy cập cold/warm, giá trị cũ/mới và quy tắc của EVM; không có một mức gas cố định cho mọi lần đọc/ghi.
* **Memory:** dữ liệu tạm thời trong một call frame, không được giữ làm trạng thái lâu dài.
* **Calldata:** dữ liệu đầu vào chỉ đọc của lời gọi. Đây không phải toàn bộ kiến trúc bộ nhớ EVM; EVM còn có stack và các thành phần khác.

### 2.1.3. ETH/wei, payable và ghi nhận đóng góp
* `1 ETH = 10^18 wei`. `msg.value` là số wei gửi kèm lời gọi, còn `msg.sender` là địa chỉ gọi trực tiếp vào contract.
* `pledge()` và `receive()` là `payable`, cho phép nhận ETH. `pledgedAmount[address]` ghi nhận khoản góp của từng địa chỉ; `pledged` ghi tổng khoản góp còn được ghi nhận.
* `unpledge(amount)` trừ khoản ghi nhận trước khi gửi ETH trả lại. Rút hết trước hạn làm giảm `contributorCount`; góp lại từ khoản ghi nhận bằng 0 làm tăng bộ đếm.
* Event phục vụ truy vết/indexing; không thay thế storage dùng để kiểm tra quyền rút tiền. Ví dụ, giao diện không được dùng log thay cho `pledgedAmount` khi xác định khoản có thể hoàn.
* ETH hoàn lại không bao gồm phí gas đã trả cho mạng. Số dư ví sau refund không nhất thiết bằng số dư trước khi người dùng bắt đầu góp vốn.

---

## 2.2. Ngôn ngữ Solidity (^0.8.20) và kỹ thuật tối ưu

### 2.2.1. Thời gian khối và deadline (`block.timestamp`)
`block.timestamp` là timestamp Unix, tính bằng giây, của block đang thực thi.

* Trên **Ethereum PoS**, slot dài 12 giây; timestamp của execution payload phải khớp thời điểm tính cho slot. Validator không có quyền tùy chọn timestamp lệch ±12–15 giây cho cùng slot. Slot có thể bị bỏ qua; giao dịch có thể được đưa vào block muộn hơn lúc người dùng gửi. Quy tắc của mạng EVM khác cần được xem riêng.
* Contract dùng điều kiện `block.timestamp < endAt` để cho phép góp/rút trước hạn. Tại đúng `endAt`, hai thao tác này bị chặn; claim/refund được xét theo mục tiêu và quyền gọi. `state()` tính trạng thái khi được gọi, không cần một giao dịch tự cập nhật enum vào storage.
* Constructor thực tế chấp nhận **1 đến 31.536.000 giây (365 ngày)**. Thời lượng 7 ngày là ví dụ sandbox, không phải mức tối thiểu của contract. Deadline không bảo đảm giao dịch gửi sát hạn sẽ kịp được đưa vào block.
* `startAt`/`endAt` dùng `uint64`, tránh giới hạn năm 2106 của `uint32`. Đây là biến `immutable`, không phải ví dụ packing các timestamp vào storage.
* Slider chỉ đổi thời gian của mô hình JavaScript. Hardhat có RPC kiểm thử để điều chỉnh timestamp cục bộ; slider không điều khiển timestamp Sepolia.

Nguồn: [Ethereum consensus specification — process_execution_payload](https://github.com/ethereum/consensus-specs/blob/master/specs/bellatrix/beacon-chain.md#process_execution_payload).

### 2.2.2. Biến `immutable`
`creator`, `goal`, `startAt`, `endAt` được gán khi khởi tạo và không đổi sau deploy. Giá trị được nhúng vào runtime bytecode thay vì đọc qua storage bằng `SLOAD`. Lợi ích gas phụ thuộc đường thực thi, compiler, optimizer và cold/warm access; báo cáo này không công bố mức tiết kiệm cố định khi chưa có benchmark đối chứng.

### 2.2.3. Custom errors
Ví dụ `error GoalNotReached();` được trả về bằng `revert GoalNotReached();`. Với error **không có tham số**, revert data gồm selector 4 bytes, tính từ `keccak256("GoalNotReached()")`. Error có tham số còn chứa dữ liệu ABI-encoded của các tham số đó.

So với chuỗi lỗi dài, custom errors có thể giảm bytecode và chi phí mã hóa revert data, đồng thời giúp DApp decode lỗi theo kiểu. Không suy ra số gas tiết kiệm cố định hoặc phần trăm cải thiện từ việc dùng selector; cần đo trên cấu hình biên dịch cụ thể.

---

## 2.3. Các mẫu thiết kế an ninh Smart Contract

Nhóm áp dụng các cơ chế sau để giảm rủi ro và kiểm tra những hành vi cụ thể. Các cơ chế này không bảo đảm contract không thể có lỗi; passing tests và phân tích tĩnh không thay thế audit độc lập hoặc chứng minh hình thức.

### 2.3.1. Checks-Effects-Interactions (CEI) và guard
1. **Checks:** kiểm tra deadline, mục tiêu và khoản ghi nhận của người gọi.
2. **Effects:** cập nhật sổ sách trước khi trao quyền thực thi cho contract ngoài.
3. **Interactions:** chuyển ETH, kiểm tra kết quả; revert nếu không chuyển được.

```solidity
function refund() external nonReentrant {
    if (block.timestamp < endAt) revert CampaignActive();
    if (pledged >= goal) revert GoalAlreadyReached();

    uint256 balance = pledgedAmount[msg.sender];
    if (balance == 0) revert NothingToRefund();

    pledgedAmount[msg.sender] = 0;
    pledged -= balance;
    emit Refund(msg.sender, balance);

    (bool success, ) = payable(msg.sender).call{value: balance}("");
    if (!success) revert TransferFailed();
}
```

**Hai lớp cần phân biệt:**
* CEI đưa khoản ghi nhận của người gọi về 0 và giảm tổng `pledged` trước external call. Nếu xét riêng các checks của `refund()`, khoản ghi nhận bằng 0 sẽ không cho rút lần nữa.
* Triển khai thực tế còn có modifier `nonReentrant` **tự cài đặt**. Khi callback tái nhập `refund()`, guard chạy trước phần thân và trả về `ReentrancyGuardTriggered`, không phải `NothingToRefund`. Test EVM kiểm tra selector này; không tuyên bố đã import OpenZeppelin.
* Guard là khóa tái nhập trong cùng chuỗi lời gọi, không phải cơ chế xử lý đa luồng. `pledge()`/`receive()` không có external call nên không đặt guard; không suy rộng rằng mọi kiểu reentrancy đều được loại bỏ.
* Nếu người nhận từ chối ETH, `TransferFailed` rollback các thay đổi của lời gọi, bao gồm mapping, tổng ghi nhận và event. Bộ test kiểm tra rollback/retry cho refund, unpledge, claim và sweep.

### 2.3.2. Pull-over-Push payments
Push bằng một vòng lặp có thể khiến một người nhận revert làm thất bại cả giao dịch, hoặc vượt giới hạn gas. Với Pull, mỗi backer tự gửi giao dịch `refund()`; người nhận từ chối ETH có thể không rút được khoản của họ, nhưng không buộc giao dịch refund của backer khác thất bại.

Mô hình không tự hoàn tiền khi deadline đến; backer cần gọi hàm và trả gas. Test EVM dùng một receiver từ chối ETH cùng một backer thông thường để kiểm tra tính độc lập này.

### 2.3.3. `transfer`, `send` và `call`
| Phương thức | Gas chuyển tiếp | Kết quả khi thất bại | Điều cần lưu ý |
| :--- | :--- | :--- | :--- |
| `transfer()` | Stipend 2.300 gas | Revert | Có thể không tương thích với logic nhận ETH cần nhiều gas. Không dùng stipend làm bằng chứng chống reentrancy. |
| `send()` | Stipend 2.300 gas | `false` | Người gọi phải kiểm tra kết quả. |
| `call{value: amount}("")` | Chuyển tiếp gas theo quy tắc CALL/EIP-150, không phải toàn bộ gas không giới hạn | `(bool, bytes)` | Linh hoạt hơn nhưng trao quyền thực thi cho người nhận; cần kiểm tra kết quả, CEI và bảo vệ tái nhập phù hợp. |

### 2.3.4. Forced ETH và bất biến sổ sách
`receive()` không chặn được mọi cách đưa ETH vào contract. Sau [EIP-6780](https://eips.ethereum.org/EIPS/eip-6780), `SELFDESTRUCT` vẫn chuyển balance tới địa chỉ đích kể cả với contract cũ; ngoại lệ tạo và hủy trong cùng transaction liên quan đến việc xóa code/storage/account.

* `pledged == Σ pledgedAmount` là bất biến sổ sách cần duy trì.
* Không khẳng định `balance == pledged` trong mọi trạng thái: forced ETH có thể làm balance lớn hơn; sau claim thành công balance có thể bằng 0 trong khi sổ sách góp vẫn còn.
* `sweepExcessEther()` chỉ cho creator lấy phần chênh dương `balance - pledged`, không bắt buộc hết hạn. Đây không phải hàm rút mọi ETH bị gửi vào ở mọi thời điểm; cần xét trạng thái và điều kiện thực tế của code.

---

## 2.4. Công nghệ tương tác phía máy khách (Web3 client)

### 2.4.1. Ethers.js v6
* **Provider:** truy cập dữ liệu mạng qua RPC; hỗ trợ `eth_call`, đọc block, balance và receipt.
* **Signer:** đại diện tài khoản có khả năng yêu cầu ký/gửi giao dịch. Đổi tài khoản ví cần cập nhật signer và contract instance, không chỉ thay địa chỉ hiển thị.
* **ABI/Contract:** mã hóa calldata và giải mã giá trị trả về, event, custom error. Đọc được `goal()` là kiểm tra kết nối cơ bản, không chứng minh địa chỉ đích là đúng contract hoặc đúng phiên bản mã nguồn.

### 2.4.2. Ký, gửi và xác nhận giao dịch
1. DApp xác định chain ID, địa chỉ contract và tài khoản; dùng `ethers.parseEther` chuyển chuỗi số tiền thành wei mà không qua số thực JavaScript.
2. Tạo yêu cầu giao dịch với `to`, `data`, `value`; MetaMask hiển thị thông tin và phí để người dùng xác nhận.
3. Với tài khoản dùng khóa secp256k1, ví ký giao dịch cục bộ; DApp không cần nhận khóa riêng. Ví có thể có các cơ chế lưu khóa/ký khác, nên đây là mô hình của ví dùng trong demo.
4. Ví/provider gửi giao dịch tới mạng. Có tx hash chưa có nghĩa đã thực thi thành công; chờ receipt, kiểm tra kết quả và đọc lại state.
5. `eth_call` là thực thi đọc/mô phỏng qua RPC, không tạo giao dịch được đưa vào block. Giao dịch được đưa vào block rồi revert vẫn có thể tốn gas.

Sandbox, test Hardhat EVM và kết nối MetaMask là ba tầng minh chứng khác nhau. Không gọi thay đổi JavaScript là giao dịch on-chain; chỉ ghi đã thử trên Sepolia khi có chain ID, địa chỉ, hash và receipt tương ứng.
