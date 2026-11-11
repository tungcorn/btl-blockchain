# Nội dung slide bảo vệ — Đề W

Bản nội dung để nhóm đưa vào công cụ trình chiếu; chưa phải file PPTX/PDF đã dàn trang. Điền thông tin nhóm theo trang bìa. Gợi ý 9 slide, khoảng 3–4 phút/người; điều chỉnh theo thời lượng/rubric thực tế. Dùng ảnh/log của chính nhóm; không dựng receipt hoặc chèn hash sandbox như giao dịch thật.

## Slide 1 — Contract giữ ETH theo goal và deadline, không bảo đảm dự án sẽ hoàn thành
**TV1.** Nêu Đề W, ba luồng góp/rút — giải ngân — hoàn tiền. Quy tắc nhóm chọn: backer được rút trước hạn; creator không claim sớm dù đủ goal. Sau giải ngân, tiến độ dự án nằm ngoài phạm vi escrow.

## Slide 2 — Khoản góp được ghi bằng wei, gắn với địa chỉ gọi
**TV1.** Chỉ `msg.sender`, `msg.value`, `pledgedAmount` và `pledged`; 1 ETH = 10^18 wei. Event giúp theo dõi, không thay storage để kiểm tra quyền rút. Thêm đoạn code ngắn pledge/receive, không chụp cả file.

## Slide 3 — Rút trước hạn phải giảm cả khoản cá nhân và tổng ghi nhận
**TV1.** Demo sandbox góp 3, rút 1, còn 2; chỉ điều kiện amount/deadline. Đối chiếu EVM local: 0.003 → 0.002 sau unpledge 0.001, block #6 của JSON minh chứng. Test dự phòng: rút tại endAt và rollback/retry receiver lỗi. Chuyển lượt: “Tiền đã được ghi nhận; khi nào creator được lấy?”

## Slide 4 — Đủ goal trước hạn vẫn Active; hết hạn không tự gửi tiền
**TV2.** Dùng state diagram từ mục 3.1. Trước hạn pledge/unpledge; sau hạn tách Successful/Failed theo pledged và goal. Timestamp là block thực thi, không phải lúc nhấn nút. Không vẽ đồng hồ gửi transaction.

## Slide 5 — Claim cần đủ goal, hết hạn và đúng creator
**TV2.** Demo 10/10 tại 6.9: creator bị chặn; đến 7.0: ví thường sai quyền, creator claim được. UI khóa nút chỉ minh họa; test EVM chứng minh contract từ chối. Sau claim balance bằng 0, claimed true, accounting vẫn giữ nguyên. Local evidence #10: balance 0.01 → 0, pledged 0.01 → 0.01.

## Slide 6 — Ký ví, gửi giao dịch và receipt là các bước khác nhau
**TV2.** Provider/signer/ABI; chain ID và địa chỉ đúng. Nêu ba tầng: sandbox JS; Hardhat EVM/receipt local; MetaMask ký trên mạng đang nối. Hiện evidence local dùng tài khoản mở khóa, chưa chứng minh MetaMask/Sepolia. Nếu nhóm đã tự xác nhận ví, chèn bằng chứng thật kèm môi trường; nếu chưa thì giữ giới hạn này. Factory/cap 100 là câu hỏi dự phòng.

## Slide 7 — Campaign thất bại mở refund riêng cho từng backer
**TV3.** Demo preset Alice 3/10 tại 7.2, refund rồi không hoàn lần hai. Không có vòng lặp hoàn mọi người, không tự chạy ở deadline, không trả gas đã chi. Local evidence #11: khoản Alice/pledged/balance 0.002 → 0; contributorCount không giảm theo refund.

## Slide 8 — CEI bảo vệ accounting, guard chặn nested guarded calls
**TV3.** Chỉ thứ tự refund: checks → xóa mapping/trừ pledged → event → call → kiểm tra success. Guard tự cài đặt, không import OpenZeppelin. Receiver lỗi: rollback và retry; backer khác vẫn refund giao dịch riêng. Nested refund test nhận ReentrancyGuardTriggered. Phân biệt `pledged == sum(mapping)` với balance; forced ETH/sweep dùng khi hỏi sâu.

## Slide 9 — Kết quả có phạm vi; không cần thêm tính năng ngoài đề để chứng minh hiểu Blockchain
**TV3, cả nhóm cùng trả lời.** Kết quả 2026-11-11: 18 model + 41 EVM pass; cap factory kiểm tra 101 campaign. Slither 13/16 instance có trùng dependency, 7 Low mỗi lượt và không High/Medium; không phải audit. Local JSON có source hash, receipt và state trước/sau; không có chữ ký MetaMask được xác nhận. Kết thúc bằng ba kết luận: đúng quy tắc đã chọn, có bằng chứng EVM, biết giới hạn.

## Tài liệu mở sẵn và phương án dự phòng

- [Ba bộ test tiêu biểu](report/03_trien_khai_va_thuc_nghiem.md), [ma trận và bảng thực nghiệm](report/06_doi_chieu_va_minh_chung.md), [nguồn tham khảo](report/05_tai_lieu_tham_khao.md).
- [Hướng dẫn chạy local](local-demo.md) và [phân công/vấn đáp](group_report.md).
- Nếu RPC/ví lỗi: trình bày JSON/test đã lưu, dùng sandbox minh họa và nói rõ chuyển môi trường. Không khẳng định offline hoàn toàn khi trang còn dùng CDN.
- Mỗi người tự chuẩn bị code/test lỗi của luồng mình; không dồn mọi câu hỏi bảo mật cho TV3. Rà chéo theo vòng 1 → 2 → 3 → 1.
