# Nội dung slide bảo vệ — Đề W

Bản nội dung để nhóm đưa vào công cụ trình chiếu; chưa phải file PPTX/PDF đã dàn trang. Điền thông tin nhóm theo trang bìa. Gợi ý 9 slide, khoảng 3–4 phút/người; điều chỉnh theo thời lượng/rubric thực tế. Ba slide/người là bố cục gợi ý, không phải thước đo đóng góp hay độ khó. Dùng ảnh/log thật; không dựng receipt hoặc chèn hash sandbox như giao dịch thật.

## Mạch bảo vệ: ba luận điểm về vòng đời tiền

| Người | Câu hỏi trung tâm | Luận điểm |
| :--- | :--- | :--- |
| TV1 | Contract ghi nhận tiền và quyền backer như thế nào? | Nhận ETH chưa đủ: phải lưu đúng khoản cá nhân và cập nhật tổng nhất quán khi góp/rút |
| TV2 | Khi nào và ai được nhận quỹ thành công? | Đủ vốn chưa đủ: phải hết hạn, đúng creator và chưa claim |
| TV3 | Khi thất bại, làm sao hoàn đúng và không hoàn hai lần? | Refund theo caller, cập nhật trước call, dùng guard và rollback để bảo vệ luồng |

Mỗi người đi theo **quy tắc → quyết định thiết kế trong Solidity → ca đúng/ca bị từ chối → bằng chứng trước/sau**. Phạm vi chuẩn bị rộng hơn nội dung nói; bảng chi tiết ở [phân công và diễn tập](group_report.md). Không dùng tên người phụ trách để suy ra tác giả lịch sử.

## Slide 1 — Contract giữ tiền theo quy tắc, không chỉ nhận ETH

**TV1 — mở đầu ngắn.** Nêu Đề W và ba câu hỏi trên. Goal/deadline điều khiển quyền xử lý quỹ, không bảo đảm dự án hoàn thành sau giải ngân. Nhóm chọn cho rút trước hạn; creator không claim sớm dù đủ goal. Dẫn ngay vào câu hỏi: nhận ETH rồi, contract biết khoản nào thuộc backer nào bằng cách nào?

## Slide 2 — Mapping ghi quyền từng backer, pledged ghi tổng khoản góp

**TV1 — quyết định thiết kế.** Chỉ đoạn pledge ngắn: `msg.sender` xác định backer, `msg.value` là lượng wei, tăng cả `pledgedAmount[caller]` và `pledged`. 1 ETH = 10^18 wei. Giải thích vì sao cần hai mức ghi nhận và vì sao event không thay mapping để kiểm tra quyền rút; không chỉ đọc định nghĩa `payable`/mapping.

## Slide 3 — Rút hợp lệ phải cập nhật nhất quán cả khoản cá nhân và tổng

**TV1 — đối chiếu.** Demo sandbox góp 3, rút 1, còn 2; tổng giảm 1. Chỉ điều kiện caller/amount/deadline trong unpledge; rút vượt khoản góp bị từ chối. Nêu nguyên tắc chuyển ETH lỗi thì revert, sổ sách không mất; mở test lỗi chi tiết khi được hỏi. Đối chiếu EVM local: 0.003 → 0.002 sau unpledge 0.001, block #6 của JSON minh chứng. Chuyển lượt: “Khoản góp đã được ghi đúng; đủ tiền thì creator đã được lấy chưa?”

## Slide 4 — Đủ goal trước hạn vẫn Active

**TV2 — quy tắc và quyết định thiết kế.** Dùng state diagram từ mục 3.1. `state()` tính từ dữ liệu khi được gọi, không có đồng hồ tự gửi transaction. Trước hạn vẫn pledge/unpledge; sau hạn tách Successful/Failed theo pledged và goal. Timestamp là của block thực thi, không phải lúc nhấn nút. Demo đủ 10/10 ở ngày 6.9 nhưng creator chưa claim được.

## Slide 5 — Claim còn cần đúng creator và chưa claim

**TV2 — ca được phép và bị từ chối.** Chỉ checks trong claim: hết hạn, đủ goal, đúng creator, chưa claim. Chuyển 7.0: ví thường sai quyền; creator claim được. Cờ claimed chống claim lại. UI khóa nút chỉ minh họa; test EVM chứng minh contract từ chối lời gọi sai. Nêu claim chuyển balance thực tế, không chỉ goal; chi tiết vượt goal/receiver lỗi để hỏi sâu.

## Slide 6 — Claim chuyển ETH nhưng không xóa khoản góp ghi nhận

**TV2 — bằng chứng trước/sau.** Local evidence #10: claimed false → true, balance 0.01 → 0, pledged và khoản Alice vẫn 0.01. Giải thích vì sao không được đồng nhất accounting với số dư ETH sau claim. Đối chiếu test đúng endAt, sai caller và đủ goal trước hạn. Chỉ nhận diện ngắn môi trường/receipt: JSON local dùng tài khoản test mở khóa, chưa chứng minh MetaMask/Sepolia; không mở một bài riêng về stack Web3. Chuyển lượt: “Nếu hết hạn mà chưa đủ mục tiêu, tiền không về creator; backer nhận lại bằng cách nào?”

## Slide 7 — Campaign thất bại cho backer tự nhận đúng khoản

**TV3 — quy tắc và thiết kế.** Demo preset Alice 3/10 tại 7.2, refund rồi không hoàn lần hai. Khoản hoàn lấy từ mapping của caller; không có vòng lặp hoàn mọi người, không tự chạy ở deadline và không hoàn phí gas đã chi. Local evidence #11: khoản Alice/pledged/balance 0.002 → 0; contributorCount không giảm theo refund.

## Slide 8 — Cập nhật trước call và rollback bảo vệ chính luồng refund

**TV3 — giải thích code và lỗi.** Chỉ thứ tự refund: checks → xóa mapping/trừ pledged → event → call → kiểm tra success. Mapping đã về 0 chống hoàn sai; guard tự cài đặt chặn nested guarded calls. Nếu receiver từ chối ETH và giao dịch revert, mapping/tổng rollback; backer khác vẫn refund trong giao dịch riêng. Dùng test để đối chiếu, không dùng animation sandbox làm bằng chứng chống tấn công. Không mở rộng lượt này thành tổng quan mọi rủi ro bảo mật; TV1/TV2 vẫn giải thích rollback của unpledge/claim.

## Slide 9 — Ba luồng có bằng chứng, kết quả có phạm vi

**TV3 kết ngắn; cả nhóm cùng chịu trách nhiệm kết quả.** Nhắc ba kết luận: ghi đúng khoản góp; giải ngân đúng điều kiện; hoàn đúng khi thất bại. Kết quả 2026-11-11: 18 model + 41 EVM pass; local JSON có source hash, receipt và state trước/sau. Test xanh không phải chứng minh mọi trạng thái hay audit độc lập; chưa xác nhận MetaMask ký thật. Giữ bảng kết quả chi tiết để dự phòng, không đọc toàn bộ số detector/công cụ trong lượt kết.

## Hỏi sâu — tách khỏi lượt chính

- **TV1:** receive/event, rút hết rồi góp lại, contributorCount, test unpledge lỗi rollback/retry.
- **TV2:** claim receiver lỗi, vượt goal, factory/cap 100 trên 101 campaign, immutable/custom errors. Factory truyền người gọi làm creator; không nhầm với địa chỉ factory.
- **TV3 làm đầu mối, không độc quyền kiến thức:** nested refund, forced ETH, sweep, accounting, fuzz/Slither. Đây là bằng chứng mở rộng chung; TV1 rà accounting góp/rút, TV2 rà claim/trạng thái.
- **Web3 và giới hạn bằng chứng là nền chung:** provider/signer/ABI, chain/address, eth_call khác transaction, ký/hash khác receipt thành công, gas khi revert. Chi tiết kết nối chỉ mở khi được hỏi hoặc khi demo ví thực tế cần giải thích.
- **Bảng kết quả dự phòng:** cap factory kiểm tra 101 campaign; Slither 13/16 instance có trùng dependency, 7 Low mỗi lượt, không High/Medium trong phạm vi phân tích; không phải audit. Fuzz chỉ 80 thao tác pledge/unpledge còn hạn, một seed, không toàn lifecycle.

## Tài liệu mở sẵn, diễn tập và phương án dự phòng

- [Ba bộ test tiêu biểu](report/03_trien_khai_va_thuc_nghiem.md), [ma trận và bảng thực nghiệm](report/06_doi_chieu_va_minh_chung.md), [nguồn tham khảo](report/05_tai_lieu_tham_khao.md).
- [Hướng dẫn chạy local](local-demo.md) và [phân công/vấn đáp, mục 1.6 diễn tập](group_report.md).
- Mỗi người tự trình bày không đọc slide, giải thích code/test/bảng trước-sau, rồi dự đoán một ca đổi caller/amount/time. Hỏi nối luồng: TV1 — rút làm dưới goal thì sau hạn sao? TV2 — mapping còn sau claim sao không refund? TV3 — thiếu goal trước hạn sao chưa refund?
- Ghi chỗ còn vướng và kết quả luyện lại; không đánh dấu đã sẵn sàng chỉ vì đã giao đủ ba phần. Rà chéo 1 → 2 → 3 → 1, không dồn mọi câu hỏi khó sang TV3.
- Nếu RPC/ví lỗi: trình bày JSON/test đã lưu, dùng sandbox minh họa và nói rõ chuyển môi trường. Không khẳng định offline hoàn toàn khi trang còn dùng CDN.
