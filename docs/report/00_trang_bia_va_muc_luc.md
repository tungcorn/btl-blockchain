# BÁO CÁO ĐỒ ÁN MÔN HỌC: CÔNG NGHỆ BLOCKCHAIN

<br>

<div align="center">

### BỘ GIÁO DỤC VÀ ĐÀO TẠO
### BÁO CÁO ĐỒ ÁN MÔN HỌC: CÔNG NGHỆ BLOCKCHAIN

<br>

## ĐỀ TÀI:
# NGHIÊN CỨU, THIẾT KẾ VÀ TRIỂN KHAI HỢP ĐỒNG THÔNG MINH GỌI VỐN CỘNG ĐỒNG (CROWDFUNDING) CÓ MỤC TIÊU VÀ HẠN THỜI GIAN TRÊN NỀN TẢNG ETHEREUM

<br>

**Phân loại đề tài:** Nhóm C – Nâng cao (Điểm tối đa: 10.0) • **Mã đề:** Đề W

<br>

| STT | Họ và tên sinh viên | Mã số sinh viên | Chủ đề bảo vệ chính |
| :---: | :--- | :---: | :--- |
| **1** | [Điền tên Thành viên 1] | [MSSV 1] | **Góp vốn và quyền rút trước hạn**: vì sao cần khoản cá nhân và tổng khoản góp; `pledge`/`unpledge` cập nhật nhất quán, quyền caller và rollback. Có code, test và bảng trước/sau; không chỉ giải thích cú pháp. |
| **2** | [Điền tên Thành viên 2] | [MSSV 2] | **Điều kiện giải ngân thành công**: đủ goal chưa đủ; cần hết hạn, đúng creator và chưa claim. Giải thích trạng thái, `claim`, balance/accounting trước-sau. Factory và chi tiết Web3 để hỏi sâu. |
| **3** | [Điền tên Thành viên 3] | [MSSV 3] | **Hoàn tiền khi thất bại và chống hoàn sai**: refund theo caller, đúng khoản, không hoàn hai lần; CEI/guard và rollback trong luồng refund. Không đại diện toàn bộ bảo mật của nhóm; minh chứng nâng cao để hỏi sâu. |

<br>

**Giảng viên hướng dẫn:** [Điền tên Thầy / Cô hướng dẫn]  
**Năm học:** 2025 – 2026

</div>

**Nguyên tắc phân công:** chia ba luận điểm để cùng bảo vệ một sản phẩm, không chia module phát triển độc lập. Bảng trên là phần nói chính; phạm vi đọc code/test, biên soạn báo cáo và chuẩn bị hỏi sâu rộng hơn, xem [phân công chi tiết và checklist diễn tập](../group_report.md). Mỗi người chứng minh quy tắc → thiết kế → ca đúng/sai → bằng chứng, không cân bằng bằng số hàm/slide. TV1 giải thích cả rollback unpledge; TV2 giải thích rollback claim; TV3 giải thích refund, không gánh mọi câu hỏi bảo mật. Cả ba hiểu vòng đời tiền, Web3/gas/receipt và giới hạn kiểm chứng; factory, forced ETH, fuzz/Slither là phần hỏi sâu. TV2 vẫn làm đầu mối tích hợp Web3, TV3 tổng hợp kết luận từ nội dung cả nhóm. Rà chéo 1 → 2 → 3 → 1 và diễn tập không đọc slide, có câu hỏi nối luồng. Đây là kế hoạch chuẩn bị, không xác nhận tác giả lịch sử, tỷ lệ đóng góp hoặc thành viên đã sẵn sàng.

---

## MỤC LỤC QUYỂN BÁO CÁO

Quyển báo cáo được chia thành 4 phần độc lập theo đúng quy chuẩn đề cương môn học:

* [**PHẦN 1: ĐẶT VẤN ĐỀ**](01_dat_van_de.md)
  * 1.1. Bối cảnh gọi vốn cộng đồng (Crowdfunding)
  * 1.2. Bài toán đặt ra và rào cản của mô hình tập trung (Web2)
  * 1.3. Các vấn đề liên quan (All-or-Nothing, reentrancy, Push/Pull, deadline và accounting)
  * 1.4. Mục tiêu và phạm vi nghiên cứu (Case study: Dự án Orbit trong sandbox)

* [**PHẦN 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ**](02_co_so_ly_thuyet.md)
  * 2.1. Nền tảng Ethereum và Máy ảo EVM (Account model, Storage, Gas & Opcode)
  * 2.2. Ngôn ngữ Solidity (^0.8.20) và Kỹ thuật tối ưu (block.timestamp, immutable, Custom Errors)
  * 2.3. Các mẫu thiết kế an ninh cốt lõi (CEI Pattern, Pull-over-Push, ReentrancyGuard)
  * 2.4. Công nghệ tương tác Web3 máy khách (Ethers.js v6, MetaMask Signer, ECDSA secp256k1)

* [**PHẦN 3: PHÂN TÍCH, THIẾT KẾ VÀ TRIỂN KHAI THỰC NGHIỆM**](03_trien_khai_va_thuc_nghiem.md)
  * 3.1. Kiến trúc hệ thống và Thiết kế máy trạng thái (State Machine, Ma trận phân quyền)
  * 3.2. Cấu trúc mã nguồn và Chi tiết các hàm trong `Crowdfunding.sol` & `CrowdfundingFactory.sol`
  * 3.3. Kiểm thử 2 tầng (18 mô hình JavaScript + 41 Hardhat EVM), minh chứng theo thành viên và kết quả Slither có phạm vi
  * 3.4. Demo desktop: mục tiêu, thời hạn, quyền thao tác; sandbox và connector MetaMask

* [**PHẦN 4: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN**](04_ket_luan_va_huong_phat_trien.md)
  * 4.1. Giá trị và kết quả thu được
  * 4.2. Hạn chế của đề tài
  * 4.3. Hướng mở rộng trong tương lai (Milestone DAO Voting, SafeERC20, Layer-2, Quadratic Funding)

* [**TÀI LIỆU THAM KHẢO**](05_tai_lieu_tham_khao.md)
* [**PHỤ LỤC: ĐỐI CHIẾU YÊU CẦU VÀ MINH CHỨNG THỰC TẾ**](06_doi_chieu_va_minh_chung.md)

## Hoàn thiện bản nộp

Ghép trang bìa → Phần 1–4 → tài liệu tham khảo → phụ lục, giữ heading/caption nhất quán và render sơ đồ Mermaid khi xuất PDF/DOCX theo yêu cầu môn. Đây là nội dung Markdown, chưa phải xác nhận đã có bản nộp dàn trang hoàn chỉnh.

- [ ] Điền tên/MSSV/giảng viên, kiểm tra năm học và rubric thực tế; không đoán thông tin cá nhân.
- [ ] Đính kèm log/ảnh thật của nhóm; phân biệt evidence RPC local với MetaMask ký thật/Sepolia.
- [ ] Rà link, mục lục, số trang, bảng/code không bị cắt sau khi xuất file.
- [ ] Ba người tự diễn tập luồng và câu hỏi của mình, hoàn thành vòng rà chéo.

Nội dung thuyết trình chuẩn bị ở [bản 9 slide](../defense-slides.md); quy trình ký ví thủ công ở [hướng dẫn local](../local-demo.md).
