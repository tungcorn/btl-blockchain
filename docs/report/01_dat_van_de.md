# PHẦN 1: ĐẶT VẤN ĐỀ

---

## 1.1. Bối cảnh đề tài

Gọi vốn cộng đồng huy động nhiều khoản đóng góp để tài trợ cho một dự án. Với mô hình tập trung, người dùng cần tin nền tảng lưu giữ tiền, thực hiện điều kiện giải ngân/hoàn tiền và cung cấp thông tin chính xác. Phí và chính sách khác nhau giữa nền tảng; báo cáo không suy ra một mức phí chung khi chưa khảo sát có nguồn.

Smart contract cho phép công khai một phần quy tắc giữ và chuyển tiền, để người dùng đối chiếu code, state và event. Tuy nhiên điều này không tự loại bỏ rủi ro khóa riêng, ví, giao diện/RPC, lỗi code hoặc việc chủ dự án không thực hiện cam kết sau giải ngân.

---

## 1.2. Bài toán đặt ra

**Đề W:** xây dựng contract crowdfunding có mục tiêu vốn và hạn thời gian.

1. **Ký quỹ và ghi nhận:** tiền ETH nằm tại contract; từng khoản góp được ghi theo địa chỉ, cùng tổng `pledged`.
2. **Góp/rút trước hạn:** khi `block.timestamp < endAt`, người dùng góp ETH dương hoặc rút một phần/toàn bộ khoản của chính họ. Đủ vốn sớm chưa đóng chiến dịch và chưa cho creator claim.
3. **Giải ngân:** tại/sau deadline, chỉ creator được claim nếu pledged đạt goal và chưa claim trước đó. Hết hạn không tự gửi ETH; cần giao dịch gọi hàm.
4. **Hoàn tiền:** tại/sau deadline khi chưa đạt goal, từng backer tự gọi refund để nhận khoản còn ghi nhận, không có vòng lặp hoàn tiền toàn bộ. Người gửi vẫn trả phí gas; contract không khấu trừ phí nền tảng nhưng cũng không hoàn phí mạng đã trả.
5. **Kiểm soát rủi ro:** kiểm tra quyền/điều kiện trong Solidity, cập nhật sổ sách trước external call, dùng guard và xử lý chuyển ETH thất bại. Đánh giá bằng test và phân tích tĩnh có phạm vi, không cam kết loại bỏ mọi lỗi.

---

## 1.3. Các vấn đề liên quan

* **All-or-Nothing:** điều kiện giải ngân dựa trên goal và deadline; nếu thiếu dù một wei tại hạn thì không đạt goal. Nếu có khoản góp mới làm đạt goal trước hạn, kết quả có thể đổi. Contract chỉ thực thi quy tắc này, không đánh giá tính khả thi của dự án.
* **Reentrancy:** khi chuyển ETH bằng call, contract nhận có thể chạy code và gọi ngược lại. Cần giải thích CEI và guard bằng thứ tự thực thi thực tế, thay vì coi mọi callback là cùng một kiểu tấn công.
* **Push/Pull:** một giao dịch push có thể bị lỗi người nhận hoặc giới hạn gas làm thất bại; Pull tách giao dịch từng người. Người nhận không thể nhận ETH vẫn có giới hạn riêng.
* **Thời gian và xử lý giao dịch:** Ethereum PoS xác định timestamp theo slot; người dùng không được bảo đảm giao dịch gửi sát hạn sẽ kịp vào block.
* **Sổ sách và balance:** forced ETH và quyết toán làm hai khái niệm có thể khác nhau. Không dùng một đẳng thức balance đơn giản để tuyên bố an toàn mọi trạng thái.

---

## 1.4. Mục tiêu và phạm vi nghiên cứu

### Mục tiêu
* Giải thích Ethereum/EVM, account, wei, storage/mapping, timestamp, gas, phân quyền và giao dịch Web3 qua một bài toán cụ thể.
* Triển khai `Crowdfunding.sol` và factory tạo các campaign độc lập.
* Kiểm thử bằng 18 test mô hình JavaScript và 41 test Hardhat EVM; số lượng test không phải coverage 100%. Dùng test để đối chiếu thành công, điều kiện bị từ chối và biên quan trọng.
* Cung cấp sandbox và connector MetaMask để hỗ trợ trình bày. Phân biệt rõ minh họa JavaScript, thực thi EVM cục bộ và giao dịch thực trên mạng kết nối.
* Phân chia ba thành viên theo luồng góp vốn — giải ngân — hoàn tiền/an toàn, mỗi người có lý thuyết, Solidity, test và phần báo cáo riêng.

### Ca thực nghiệm minh họa
**Dự án Orbit** là tên chiến dịch mẫu trong sandbox, không phải bằng chứng một dự án/ví thực tế đã deploy trên Sepolia.

* Creator: persona giả lập trong demo; địa chỉ hiển thị không chứng minh nhóm kiểm soát khóa tương ứng trên mạng thật.
* Goal: 10 ETH; thời lượng mẫu: 7 ngày (604.800 giây). Constructor thực tế cho phép duration dương đến 365 ngày.
* Tài sản: native ETH; giá trị trong contract tính bằng wei.
* Kịch bản đủ vốn: 4 + 3 + 3 ETH ở ngày 6.9, rồi tới đúng 7.0 để kiểm tra quyền claim.
* Kịch bản thất bại: 3/10 ETH ở ngày 7.2; kịch bản vượt mục tiêu riêng: 12/10 ETH.

Triển khai không có giải ngân theo milestone, DAO voting hoặc token ERC-20. Những tính năng này chỉ là hướng mở rộng. Báo cáo kết quả kiểm thử không thay thế audit hay chứng minh dự án sử dụng vốn đúng mục đích.
