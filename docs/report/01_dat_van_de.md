# PHẦN 1: ĐẶT VẤN ĐỀ

---

## 1.1. Bối cảnh đề tài

Gọi vốn cộng đồng (Crowdfunding) là hình thức huy động các khoản đóng góp tài chính nhỏ từ một số lượng lớn các cá nhân để tài trợ cho một dự án, sáng kiến kinh doanh hoặc hoạt động xã hội. Trong kỷ nguyên Web 2.0, các nền tảng gọi vốn truyền thống như Kickstarter, Indiegogo, hay GoFundMe đã tạo ra những cú hích kinh tế khổng lồ, hỗ trợ hàng trăm nghìn dự án khởi nghiệp tiếp cận vốn mà không cần phụ thuộc vào các quỹ đầu tư mạo hiểm (Venture Capital) truyền thống.

Tuy nhiên, mô hình gọi vốn tập trung (Centralized Crowdfunding) đang bộc lộ những rào cản mang tính cố hữu về mặt cấu trúc và độ tin cậy:
* **Chi phí trung gian cao:** Các nền tảng Web 2.0 thường thu mức phí dao động từ **5% đến 8%** trên tổng số tiền gọi được, chưa bao gồm phí xử lý thanh toán của ngân hàng (thêm 3% – 5%).
* **Quyền lực kiểm soát tập trung:** Các nền tảng máy chủ trung tâm có toàn quyền đơn phương đóng băng tài khoản, hoãn giải ngân hoặc từ chối chuyển tiền vì các lý do pháp lý, chính sách khu vực hoặc xung đột lợi ích.
* **Rủi ro thiếu minh bạch tài chính:** Người đóng góp (Backers) hoàn toàn mất dấu dòng tiền sau khi chuyển cho sàn trung gian. Không có cơ chế mật mã nào bảo đảm rằng chủ dự án chỉ được nhận tiền khi chiến dịch thành công và ngược lại, người ủng hộ sẽ tự động nhận lại 100% tiền nếu chiến dịch thất bại.
* **Nguy cơ lừa đảo (Scam & Rug Pull):** Tình trạng chủ dự án gom tiền rồi biến mất mà không chịu bất kỳ ràng buộc hợp đồng bằng mã nguồn nào.

---

## 1.2. Bài toán đặt ra

Sự xuất hiện của công nghệ Blockchain và **Hợp đồng thông minh (Smart Contract)** trên nền tảng Ethereum đã mở ra giải pháp mang tính đột phá: **Gọi vốn cộng đồng phi tập trung (Decentralized Crowdfunding)**.

Bài toán cốt lõi cần giải quyết bao gồm:
1. **Loại bỏ hoàn toàn trung gian (Trustless Execution):** Toàn bộ quỹ tiền được ký quỹ (Escrow) trực tiếp trong một hợp đồng thông minh. Không một cá nhân, tổ chức hay thậm chí người tạo hợp đồng nào có thể tùy tiện rút tiền nếu chưa thỏa mãn các quy tắc logic được định nghĩa trước.
2. **Cơ chế ràng buộc Mục tiêu vốn (Target Goal):**
   * Dự án phải đạt được số tiền tối thiểu cam kết trước khi hết hạn mới được xem là thành công.
   * Nếu đạt chỉ tiêu (`pledged >= goal`), chủ dự án mới có quyền rút vốn giải ngân.
3. **Cơ chế ràng buộc Hạn thời gian (Deadline):**
   * Chiến dịch chỉ mở nhận vốn trong một khoảng thời gian xác định (`startAt` &rarr; `endAt`).
   * Khi hết hạn, cổng đóng góp phải tự động đóng lại để bảo vệ tính toàn vẹn của quỹ.
4. **Cơ chế hoàn tiền tự động và an toàn (Guaranteed Refund):**
   * Nếu chiến dịch kết thúc mà không đạt mục tiêu, hợp đồng phải bảo đảm quyền lợi tuyệt đối cho người ủng hộ: mỗi cá nhân đều có thể rút lại đúng 100% số tiền mình đã góp mà không bị khấu trừ bất kỳ khoản phí trung gian nào.
5. **Bảo mật và Tối ưu hóa chi phí (Security & Gas Optimization):**
   * Ngăn chặn triệt để các lỗ hổng smart contract kinh điển như tấn công tái nhập (Reentrancy), từ chối dịch vụ (DoS with unexpected revert), và thao túng mốc thời gian khối (Timestamp manipulation).
   * Giảm thiểu tối đa chi phí gas khi giao dịch trên mạng lưới Ethereum.

---

## 1.3. Các vấn đề liên quan và khảo sát thực tế

Trong không gian Web3, các giao thức gọi vốn phi tập trung đã có những bước tiến đáng kể:
* **Mô hình All-or-Nothing (Được ăn cả, ngã về không):** Hợp đồng chỉ giải ngân khi đủ 100% mục tiêu. Nếu thiếu dù chỉ 0.01 ETH, toàn bộ số tiền sẽ mở cho người dùng rút lại. Đây là mô hình công bằng nhất, giúp người ủng hộ không bị rủi ro tài trợ cho một dự án thiếu vốn trầm trọng dẫn đến không thể hoàn thiện sản phẩm.
* **Lỗ hổng The DAO (2016):** Bài học lịch sử của Ethereum khi một quỹ gọi vốn cộng đồng phi tập trung bị hacker rút cạn 3.6 triệu ETH thông qua lỗ hổng Reentrancy trong hàm hoàn tiền/rút vốn. Điều này khẳng định tính an ninh trong logic hợp đồng Crowdfunding là ưu tiên số một.
* **Vấn đề DoS trong cơ chế Push Refund:** Nhiều dự án sơ khai sử dụng vòng lặp duyệt qua danh sách hàng nghìn người để gửi trả tiền (Push). Khi gặp một smart contract cố tình revert, toàn bộ quỹ bị treo vĩnh viễn. Cần thiết phải chuyển dịch sang mô hình **Pull Payment** (tự rút).

---

## 1.4. Mục tiêu và Phạm vi nghiên cứu của đề tài

### Mục tiêu đề tài:
* **Về mặt lý thuyết:** Nghiên cứu kiến trúc máy ảo EVM, cơ chế quản lý trạng thái, mô hình Checks-Effects-Interactions (CEI), và các giải pháp an ninh phòng thủ trên Solidity `^0.8.20`.
* **Về mặt kỹ thuật:**
  * Xây dựng hợp đồng `Crowdfunding.sol` hoàn chỉnh, hỗ trợ mục tiêu vốn, hạn thời gian, cơ chế nạp, rút cọc sớm, rút vốn và hoàn tiền.
  * Xây dựng hợp đồng mở rộng `CrowdfundingFactory.sol` đóng vai trò Launchpad quản lý hàng loạt chiến dịch độc lập.
  * Xây dựng bộ kiểm thử tự động hai tầng (Unit Test) 52 kịch bản — 18 Mock + 34 Hardhat EVM — bao phủ 100% các điều kiện biên.
  * Phát triển giao diện Web DApp trực quan hóa **2 Trục Tiến Độ (Tiền vốn & Dòng thời gian Blockchain)**, hỗ trợ cả môi trường mô phỏng Sandbox tức thì và kết nối ví MetaMask trên testnet Sepolia.

### Phạm vi và Ca sử dụng thực nghiệm (Case Study):
Để kiểm chứng hệ thống trong môi trường trực quan, nhóm lựa chọn kịch bản ứng dụng mẫu:  
**"Dự Án Orbit: Trạm Tiếp Sóng Vệ Tinh Phi Tập Trung"**
* **Chủ dự án (Creator):** Địa chỉ ví `0x90F79bf6EB2c4f870365E785982E1f101E93b906`.
* **Mục tiêu vốn (Goal):** 10.00 ETH.
* **Thời hạn chiến dịch (Duration):** 7 ngày (604,800 giây).
* **Đơn vị tiền tệ:** Native ETH (chuyển giao trực tiếp trên EVM).
