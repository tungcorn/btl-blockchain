# Demo EVM cục bộ và xác nhận bằng MetaMask

## 1. Mục đích và mức minh chứng

Chuẩn bị hai campaign độc lập cho Đề W: thành công/claim và thất bại/refund. Dùng Hardhat node chạy lâu dài để trình duyệt và script cùng đọc một blockchain. Đây là mạng local, không phải Sepolia. Script dùng tài khoản test được node mở khóa, không chứng minh MetaMask đã ký.

## 2. Khởi động từ bản clone

Cần Node.js được phiên bản Hardhat hiện tại hỗ trợ (ghi `node --version`/`npm --version` khi nghiệm thu), npm và MetaMask nếu muốn thử ký ví. Dùng lockfile:

```bash
npm ci
npm test
```

Giữ terminal thứ nhất mở:

```bash
npm run demo:node
```

Node chỉ nghe `127.0.0.1:8545`, chain ID `31337`. Không mở cổng ra mạng LAN/Internet. Node in các private key test công khai: chỉ sử dụng trong profile ví thử nghiệm riêng, tuyệt đối không gửi tài sản thật vào các tài khoản này và không đưa key vào báo cáo.

Terminal thứ hai:

```bash
npm run demo:deploy
npm run serve
```

Lệnh deploy in creator/Alice/Bob, địa chỉ hai campaign, deadline, deployment hash/receipt. Goal mỗi campaign là **0.01 ETH**, duration **600 giây**. Đây là giá trị dành cho demo local, khác ví dụ sandbox 10 ETH/7 ngày. Script từ chối network khác `localhost`, RPC khác loopback cấu hình và chain ID khác 31337.

## 3. Quy trình ký ví thủ công — chưa được tự động xác nhận

1. Tạo profile MetaMask thử nghiệm riêng. Thêm mạng custom RPC `http://127.0.0.1:8545`, chain ID `31337`, currency ETH; không có explorer công khai.
2. Nếu cần, import các tài khoản test creator/Alice từ output node trong profile này. Không import hoặc sử dụng ví chính có tài sản thật.
3. Mở tab MetaMask của demo, dán địa chỉ success mới in ra, chọn Alice và kết nối. Ghi chain ID/địa chỉ; đọc `goal()` không thay thế xác minh source/ABI.
4. Alice góp **0.003 ETH**, nhập **0.001** và bấm **Rút số đã nhập**. Khoản còn **0.002 ETH**. MAX dùng số dư ví để góp, không phải hạn mức rút.
5. Success: góp thêm **0.008 ETH** để tổng bằng 0.01. Trước deadline vẫn Active. Sau deadline bấm Làm mới; chuyển creator rồi claim. Sau claim balance về 0 nhưng pledged/mapping giữ nguyên.
6. Failure: dùng campaign thứ hai; Alice góp **0.003**, rút **0.001**, không góp thêm. Sau deadline Alice refund **0.002 ETH**. Nếu campaign đã hết hạn trước khi chuẩn bị xong, chạy `npm run demo:deploy` tạo cặp mới; không dùng địa chỉ cũ.
7. Lưu chain ID, địa chỉ, tài khoản, hash, receipt status/block và ảnh state trước/sau. Xác nhận trong MetaMask từng giao dịch. Receipt mined/reverted khác lỗi từ chối ký; gas đã chi không được hoàn theo khoản góp.

Hai campaign cần được góp vốn trước deadline, không chờ hoàn tất success mới bắt đầu góp cho failure. Có thể dùng hai tab hoặc đổi địa chỉ campaign. Nếu muốn trình diễn ngày 6.9/7.0 ngay lập tức, dùng sandbox và nói rõ môi trường, không gọi slider là tua thời gian MetaMask.

## 4. Tạo bằng chứng RPC local tự động

Trong khi node còn chạy:

```bash
npm run demo:evidence
```

Script tạo **cặp campaign riêng**, chuẩn bị góp/rút cả hai trước, sau đó dùng RPC kiểm thử `evm_setNextBlockTimestamp` để claim/refund tại đúng endAt. Không tác động timestamp Sepolia. Kết quả JSON mới được ghi tại `docs/evidence/local-evm-<timestamp>.json`, không ghi đè lần chạy cũ.

File gồm compiler/settings, source SHA-256, deployment receipts, hash/status/block/gasUsed và snapshot state trước/sau. Script assert partial unpledge, balance/accounting và kết quả quyết toán. GasUsed là quan sát cho lời gọi/cấu hình đó, không phải benchmark tiết kiệm gas.

**Chú ý:** script tăng thời gian toàn node, khiến campaign thủ công trên cùng node có thể hết hạn. Chạy thu evidence trước, rồi `npm run demo:deploy` để chuẩn bị cặp thủ công mới. Những campaign trong evidence đã quyết toán, không dùng lại để bấm demo.

## 5. Tuổi thọ và sự cố

- Restart/reset node xóa state; địa chỉ có thể được tái sử dụng nhưng receipt của lần chạy cũ không thuộc chain local mới. Tạo lại campaign, đối chiếu deployment receipt mới và kết nối lại.
- Kết thúc bằng Ctrl+C ở terminal node. JSON đã lưu chỉ là bằng chứng lưu trữ, không phải cam kết RPC còn phục vụ.
- Nếu ví giữ nonce cũ sau reset, kiểm tra lịch sử/nonce mạng test trong profile thử nghiệm; không tự gửi lặp lại hoặc sửa ví chính.
- Trang dùng CDN cho Ethers/font; không khẳng định offline hoàn toàn. Mạng lỗi thì dùng Hardhat test và JSON đã lưu, nói rõ mức bằng chứng.
- Tình trạng hiện tại: script local đã được chạy; chưa xác nhận thao tác ký bằng MetaMask thật hoặc giao dịch Sepolia. Nhóm chỉ đánh dấu hoàn tất thủ công sau khi có bằng chứng riêng.
