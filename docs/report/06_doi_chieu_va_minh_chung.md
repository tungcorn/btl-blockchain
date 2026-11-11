# PHỤ LỤC: ĐỐI CHIẾU YÊU CẦU VÀ MINH CHỨNG

## A. Phạm vi đối chiếu

Yêu cầu đã biết: **Đề W — viết hợp đồng thông minh crowdfunding có mục tiêu và hạn thời gian**. Chưa có rubric chi tiết trong repo; bảng dưới phân biệt chức năng cốt lõi với quy tắc nhóm lựa chọn và phần mở rộng, không khẳng định giảng viên yêu cầu từng tính năng phụ.

**Cách đọc phân công:** cột cuối là đầu mối chuẩn bị/giải thích sâu, không xác nhận tác giả hoặc quy định mọi mục phải nói trong lượt chính. Ba luận điểm trình bày ở [mục 1.3](../group_report.md); factory, forced ETH và công cụ kiểm chứng là phần mở rộng. Bảo mật và giới hạn bằng chứng là trách nhiệm chung; mỗi người giải thích lỗi/rollback của luồng mình.

| Yêu cầu/quy tắc | Solidity | Minh chứng EVM hiện có | Đầu mối chuẩn bị |
| :--- | :--- | :--- | :--- |
| Mục tiêu vốn, deadline — lõi đề | constructor, goal, endAt | Validation goal/duration; claim tại endAt | TV2 |
| Nhận/ghi khoản góp — nghiệp vụ | pledge, receive, pledgedAmount | Nhiều backer góp; nhận ETH qua receive | TV1 |
| Rút trước hạn — lựa chọn thiết kế | unpledge | Rút một phần, toàn bộ/góp lại; chặn tại endAt; rollback/retry | TV1 |
| Đủ goal nhưng chưa hết hạn chưa được claim — lựa chọn thiết kế | state, claim | CampaignActive tại endAt - 1 | TV2 |
| Thành công: chỉ creator claim một lần — nghiệp vụ | onlyCreator, claim, claimed | Unauthorized; AlreadyClaimed; claim đúng endAt | TV2 |
| Thất bại: backer tự refund — nghiệp vụ | refund | Đúng khoản, giảm accounting; chặn hai lần, trước hạn và khi đủ goal | TV3 |
| Chuyển ETH lỗi không mất khoản ghi nhận — an toàn | CEI, nonReentrant, success check | RejectingReceiver: rollback/retry tại bốn hàm chuyển ETH | TV1/TV2/TV3 theo luồng |
| Nested guarded refund bị chặn — an toàn | nonReentrant | Kiểm tra selector ReentrancyGuardTriggered; outer refund thành công | TV3 |
| Forced ETH không thay quyền refund — nâng cao | refund, claim, sweep | Forced ETH; claim balance thực tế; sweep phần dư | TV3, TV2 rà claim |
| Nhiều campaign độc lập — mở rộng | Factory | Tạo/tra cứu; cap 100 trên 101 campaign; độc lập trạng thái | TV2 |
| Giao diện ví — hỗ trợ trình diễn | ABI/provider/signer phía client | Browser mock và script RPC local; chưa xác nhận chữ ký MetaMask | TV2 tích hợp, cả nhóm kiểm tra luồng |

Tên test/lệnh ba test tiêu biểu mỗi người ở [mục 3.3](03_trien_khai_va_thuc_nghiem.md). Model không thực thi Solidity; số test không phải coverage.

## B. Lần chạy có thể kiểm tra lại

Ngày 2026-11-11:

- `npm test`: 18 model + 41 EVM pass. Cap factory đã được kiểm tra với 101 campaign, không thêm số lượng test mà tăng chất lượng assertion của test cũ.
- Slither 0.11.6/solc 0.8.20: hai lượt scoped thành công; Crowdfunding 13 instance, Factory + dependency 16; mỗi lượt có 7 Low, không High/Medium. Xem [raw output và source hashes](../security/slither-report.md).
- `npm run demo:deploy`: tạo hai campaign local, in địa chỉ và deployment receipts.
- `npm run demo:evidence`: tạo cặp riêng, thực thi góp/rút một phần, claim/refund, lưu [JSON local EVM thực tế](../evidence/local-evm-2026-11-11T12-22-31-730Z.json). Hardhat 2.29.1, solc 0.8.20, optimizer 200 runs, EVM target paris, chain ID 31337. JSON có source SHA-256.

## C. Bảng trước/sau từ JSON local EVM

Đơn vị ETH trong bảng; JSON giữ số nguyên wei. State: 0 = Active, 2 = Failed, 3 = Claimed.

| Luồng / block | Khoản Alice | pledged | Balance escrow | claimed / state sau giao dịch |
| :--- | :--- | :--- | :--- | :--- |
| Success góp 0.003 / #5 | 0 → 0.003 | 0 → 0.003 | 0 → 0.003 | false / 0 |
| Success rút 0.001 / #6 | 0.003 → 0.002 | 0.003 → 0.002 | 0.003 → 0.002 | false / 0 |
| Success góp thêm 0.008 / #7 | 0.002 → 0.01 | 0.002 → 0.01 | 0.002 → 0.01 | false / 0 |
| Creator claim / #10 | 0.01 → 0.01 | 0.01 → 0.01 | 0.01 → 0 | true / 3 |
| Failure góp 0.003 / #8 | 0 → 0.003 | 0 → 0.003 | 0 → 0.003 | false / 0 |
| Failure rút 0.001 / #9 | 0.003 → 0.002 | 0.003 → 0.002 | 0.003 → 0.002 | false / 0 |
| Alice refund / #11 | 0.002 → 0 | 0.002 → 0 | 0.002 → 0 | false / 2 |

Claim tại timestamp **1794400350**, refund tại **1794400351**; mỗi timestamp bằng endAt của campaign tương ứng, receipt status đều 1. `evm_setNextBlockTimestamp` đặt timestamp cho block kế tiếp, không mine ngay: snapshot trước giao dịch quyết toán có thể vẫn đọc Active ở block trước, không mâu thuẫn với receipt thực thi đúng endAt.

Sau refund, contributorCount vẫn 1 theo implementation; không gọi đây là số người chưa được hoàn tiền. GasUsed trong JSON là quan sát của các giao dịch này, không phải số gas tiết kiệm so với phương án khác.

## D. Giới hạn và điều kiện trước khi nộp

- JSON là receipt thật trên node local dùng tài khoản test mở khóa qua ethers, **không phải chữ ký MetaMask hoặc Sepolia**. Hash không tra trên Etherscan; restart node xóa chain hiện hành. Hướng dẫn [demo local](../local-demo.md) có quy trình ví thủ công để nhóm xác minh sau.
- Source production chỉ đổi comment trong đợt này; bytecode metadata/source hash vẫn có thể đổi dù logic không đổi. Slither đã chạy lại, không chỉ thay hash trong văn bản.
- Chưa có formal verification/audit độc lập; fuzz hiện vẫn chỉ pledge/unpledge còn hạn với một seed. Không cần gọi đó là coverage toàn lifecycle.
- Nhóm điền tên/MSSV/giảng viên/năm học, rà rubric và tự diễn tập. Không tự đánh dấu thành viên hoàn tất từ kế hoạch phân công.
- Bản Markdown là nội dung báo cáo; xuất PDF/DOCX, kiểm tra ngắt trang/diagram theo yêu cầu môn trước khi nộp. Không có chứng nhận hình thức nộp đúng khi chưa xem rubric.
