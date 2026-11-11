---
name: solidity-smart-contract-audit
description: Rà soát có phạm vi cho Crowdfunding: điều kiện nghiệp vụ, CEI/guard, accounting, receiver lỗi và giới hạn test/phân tích tĩnh. Không phải chứng nhận audit độc lập.
---

# Rà soát Solidity theo bằng chứng

Đọc source và test hiện tại trước khi kết luận; không lấy checklist làm bằng chứng tính đúng. Đây là hướng dẫn nội bộ, không phải audit độc lập.

## 1. Điều kiện nghiệp vụ

- Constructor: goal dương; duration 1 giây đến 365 ngày; creator truyền vào hoặc deployer nếu địa chỉ 0.
- Trước endAt: pledge/receive/unpledge; đủ goal sớm vẫn Active.
- Tại/sau endAt: chỉ creator claim khi pledged >= goal và chưa claimed; refund khi pledged < goal và khoản của người gọi dương.
- State được tính khi đọc, không tự ghi storage hoặc tự chuyển tiền ở deadline.
- Sweep chỉ creator, có guard, chỉ chuyển phần chênh balance - pledged khi dương; không yêu cầu hết hạn.

## 2. Accounting và phạm vi bất biến

- Sau giao dịch hoàn tất: `pledged == sum(pledgedAmount)` trên toàn bộ backer; mapping không liệt kê được trực tiếp nên test phải biết tập actor.
- Khi **chưa claimed**, balance phải đủ thanh toán các khoản ghi nhận theo thiết kế: `balance >= pledged`. Không dùng bất đẳng thức này làm bất biến toàn lifecycle: claim giữ pledged/mapping nhưng chuyển balance.
- `balance == pledged` chỉ đúng trong phạm vi không có forced ETH và chưa claim; forced ETH không làm tăng quyền refund hoặc tự giúp đạt goal.
- Nhánh trạng thái: Active → Successful → Claimed, hoặc Active → Failed; Failed không chuyển sang Claimed. Refund giảm pledged trong nhánh Failed.
- contributorCount giảm khi unpledge toàn bộ, tăng khi góp từ khoản bằng 0, không giảm khi refund. Không gọi nó là số backer chưa refund hoặc số người từng góp trong toàn lịch sử.

## 3. External call và rollback

- Unpledge/refund cập nhật accounting trước call; claim đặt claimed trước call; sweep tính phần dư nhưng không giảm pledged.
- Các hàm chuyển ETH dùng guard **tự cài đặt**, kiểm tra success và revert TransferFailed khi lỗi. Guard không phải khóa đa luồng hoặc bằng chứng loại bỏ mọi cross-function reentrancy.
- Pledge/receive không có external call và không có guard. Callback góp lại trong unpledge trước hạn cần được xét theo điều kiện pledge; trong refund/claim đã hết hạn nên pledge bị CampaignEnded.
- Pull refund tránh gộp lỗi receiver vào cùng giao dịch của tất cả backer. Receiver từ chối ETH vẫn có thể không nhận được phần của họ.
- Test phải đối chiếu mapping/tổng/bộ đếm hoặc claimed/balance sau lỗi, rồi retry khi receiver chấp nhận; không chỉ kiểm tra có revert.

## 4. Forced ETH, thời gian và gas

- EIP-6780 vẫn cho SELFDESTRUCT chuyển ETH từ contract cũ; ngoại lệ cùng transaction liên quan xóa code/storage/account.
- Claim lấy balance thực tế lúc claim; refund theo mapping. Sweep không thu hồi được mọi khoản ETH gửi sau claim vì accounting vẫn còn.
- Ethereum PoS timestamp theo slot, không tùy chỉnh ±15 giây; không bảo đảm đưa giao dịch sát hạn vào block.
- Không suy ra gas tiết kiệm cố định từ immutable/custom errors/guard. Nêu cấu hình và đo đối chứng nếu công bố con số.

## 5. Kiểm chứng và báo cáo

- Chạy test phù hợp với diff; kết quả model JavaScript khác test EVM. Fuzz hữu hạn và seed cố định không phải chứng minh hình thức.
- Kiểm tra cap factory với hơn MAX_PAGE_SIZE campaign, không chỉ yêu cầu limit lớn trên danh sách ngắn.
- Slither: giữ nguyên severity; ghi version/compiler/scope/source hash và raw JSON. Dependency findings có thể trùng giữa hai lượt; không cộng thành lỗi độc lập.
- Sửa source kể cả comment làm thay đổi hash và source mapping: chạy lại hai lượt Slither hoặc ghi rõ output cũ không còn khớp source; không chỉ thay hash trong báo cáo.
- Không đổi logic production, compiler hoặc dependency chỉ để che cảnh báo nếu chưa có lý do và kiểm chứng.
