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

Hash trong JSON là hash byte nguồn của lần chạy đã lưu, không được thay để khớp một checkout mới. Git trên Windows có thể đổi LF thành CRLF và làm raw SHA-256 khác dù nội dung dòng không đổi; đối chiếu bản nguồn Git/LF của lần chạy để xác định khác biệt. Việc khớp nội dung sau chuẩn hóa xuống dòng không chứng minh bytecode/metadata của một lần compile mới giống hệt.

**Chú ý:** script tăng thời gian toàn node, khiến campaign thủ công trên cùng node có thể hết hạn. Chạy thu evidence trước, rồi `npm run demo:deploy` để chuẩn bị cặp thủ công mới. Những campaign trong evidence đã quyết toán, không dùng lại để bấm demo.

## 5. Tuổi thọ và sự cố

- Restart/reset node xóa state; địa chỉ có thể được tái sử dụng nhưng receipt của lần chạy cũ không thuộc chain local mới. Tạo lại campaign, đối chiếu deployment receipt mới và kết nối lại.
- Kết thúc bằng Ctrl+C ở terminal node. JSON đã lưu chỉ là bằng chứng lưu trữ, không phải cam kết RPC còn phục vụ.
- Nếu ví giữ nonce cũ sau reset, kiểm tra lịch sử/nonce mạng test trong profile thử nghiệm; không tự gửi lặp lại hoặc sửa ví chính.
- Ethers 6.17.0/font đã lưu kèm trong `demo/vendor/`, có license và manifest SHA-256; dựng lại bằng `npm run demo:assets` sau `npm ci`. Sandbox không cần Internet lúc chạy; cài dependency/trình duyệt ban đầu và RPC Sepolia vẫn cần mạng. Local RPC phải còn chạy nếu dùng ví local. Mạng/ví lỗi thì dùng Hardhat test và JSON đã lưu, nói rõ mức bằng chứng.
- Connector chỉ mở thao tác trên chain 11155111 / 31337 / 1337. Nếu từ chối chuyển mạng hoặc ví vẫn ở Mainnet/mạng khác, kết nối không được mở; chọn đúng mạng rồi thử lại.
- Tình trạng hiện tại: script local đã được chạy; chưa xác nhận thao tác ký bằng MetaMask thật hoặc giao dịch Sepolia. Nhóm chỉ đánh dấu hoàn tất thủ công sau khi có bằng chứng riêng.

## 6. Kiểm thử UI tái lập

```bash
npm ci
npm run test:ui:install
npm run test:ui
```

Bộ Playwright trong `tests/ui/` tự mở/dừng server loopback cổng 3000. Dừng server thủ công trước khi chạy; không tự dùng lại một server khác có thể đang phục vụ mã cũ. Linux sạch có thể cần `npx playwright install --with-deps chromium` để cài thư viện hệ điều hành. Test chặn tài nguyên Internet, dùng provider giả lập và không ký/gửi giao dịch thật. Kết quả/ảnh lỗi ở `test-results/`; không đưa ảnh dữ liệu giả lập vào báo cáo như bằng chứng on-chain.

## 7. Kiểm thử UI nối EVM thật trên node riêng

Sau khi cài dependency và Chromium như mục 6:

```bash
npm run test:ui:evm
```

- Lệnh compile Solidity rồi chạy `tests/ui-evm/` bằng `playwright.evm.config.js`. Playwright tự mở/dừng **node 127.0.0.1:18545** và **web 127.0.0.1:13000**; nếu cổng bận thì báo lỗi, không dùng lại hoặc reset một node đang chạy. Không cần tắt demo thủ công trên cổng 3000/8545.
- Browser dùng Ethers và giao diện thật. Adapter EIP-1193 chuyển lời gọi tới RPC node riêng; chỉ cho gửi giao dịch từ tài khoản test đang chọn tới các campaign do test triển khai. Không dùng `wallet-fixture.js`, không giả kết quả contract/receipt/balance, không ký bằng extension MetaMask.
- Kiểm tra góp/rút một phần, từ chối rút quá mức, đủ vốn trước hạn vẫn Active, quyền creator, claim và refund. Sau giao dịch UI, so sánh số dư ví/hợp đồng và khoản góp với RPC **ngay sau automatic refresh**, không bấm Làm mới hoặc retry số hiển thị để che số dư cũ. Việc refresh sau khi test tua thời gian là cập nhật từ một thay đổi ngoài UI, không phải chữa lỗi sau giao dịch.
- Regression cache giữ engine Ethers thật nhưng kéo dài cửa sổ cache mặc định trong một test để tái hiện ổn định trên máy chậm; cấu hình rõ ràng của app vẫn được ưu tiên. Test cập nhật EVM thật rồi đọc lại một lần, phải thấy số dư mới.
- Connector tắt cache đọc 250 ms mặc định bằng `cacheTimeout: -1` khi tạo BrowserProvider, kể cả sau đổi tài khoản/chuyển mạng. Đổi lại là nhiều lời gọi RPC hơn trong demo nhỏ. Không thêm sleep/retry, không bỏ kiểm tra chain/session; không khẳng định RPC phía ngoài luôn đồng bộ hay mọi trường đều thuộc một block snapshot nguyên tử.
- Test tua thời gian **chỉ node riêng 18545** để quyết toán. Không áp dụng cho Sepolia và không ảnh hưởng timestamp campaign thủ công trên 8545.
- Receipt JSON, ảnh và trace lỗi nằm trong `test-results/ui-evm/` (Git bỏ qua); Playwright attach các file vào kết quả test. Mỗi lần chạy dùng deployment/receipt mới trên chain local tạm thời; địa chỉ có thể lặp lại giữa các lần chạy. Không gọi đây là bằng chứng MetaMask ký thật, Sepolia broadcast hoặc kiểm toán bảo mật.
