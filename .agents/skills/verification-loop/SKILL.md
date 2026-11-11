---
name: verification-loop
description: Kiểm chứng thay đổi bằng cú pháp, test phù hợp, trình duyệt khi đổi UI và đối chiếu tài liệu; báo cáo kết quả thật, không cam kết tính toàn vẹn tuyệt đối.
---

# Verification Loop

## 1. Chọn phép kiểm tra theo thay đổi

- JavaScript: `node --check demo/app.js` và các script được sửa.
- Solidity: `npx hardhat compile`, test EVM liên quan; toàn bộ `npm test` khi cần kiểm tra hồi quy tích hợp.
- UI: mở app và thao tác phần thay đổi; xem ảnh ở desktop/projector. Test mock provider không thay thế MetaMask thật.
- Tài liệu: kiểm tra link tương đối, lệnh/test filter, phiên bản, số liệu và tính nhất quán với source.
- Sau thay đổi: `git diff --check`, rà diff và `git status --short` để tránh đưa file phát sinh ngoài ý muốn vào commit.

## 2. Đọc kết quả đúng phạm vi

- `npm test` chạy model JavaScript rồi Hardhat EVM. Hardhat còn có thể nạp file model và in lại log; không đếm hai lần.
- Không hardcode số test vào cổng nghiệm thu; ghi số model/EVM, failed/skipped thực tế. Passing tests không chứng minh coverage 100% hoặc an toàn tuyệt đối.
- Compiler phải không có error; ghi nhận warning có giải thích. Cảnh báo SELFDESTRUCT deprecated ở helper forced ETH là dự kiến, không xóa test để giấu warning.
- Khi lệnh lỗi: chẩn đoán và sửa hoặc báo rõ phần không hoàn thành; không coi exit code thành công duy nhất là đủ chứng minh nghiệp vụ.
- Test local, script RPC và ký ví thật là các mức bằng chứng khác nhau. Không tuyên bố đã ký MetaMask/Sepolia từ provider mock.

## 3. Bằng chứng tái lập

Ghi lệnh, môi trường/compiler, thời điểm, kết quả và giới hạn. Snapshot state và receipt giúp kiểm tra nhưng không thay thế toàn bộ test. Raw Slither phải khớp source hash hiện tại nếu được trình bày là kết quả hiện hành.

## 4. Git và giao tiếp

- Chỉ commit/push/publish/deploy khi người dùng cho phép; không tự tạo commit ở cuối mỗi tác vụ.
- Trước khi commit: rà target/diff, stage file cụ thể, không bỏ qua hook hoặc chữ ký.
- Tài liệu dùng link tương đối trong repo; tham chiếu code trong câu trả lời dạng `path:line`.
- Báo điều đã kiểm tra, điều chưa kiểm tra và warning/gap còn lại. Không bắt buộc tạo một artifact hoặc file walkthrough mới cho mọi thay đổi nhỏ.
