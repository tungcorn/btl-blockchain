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

| STT | Họ và tên sinh viên | Mã số sinh viên | Vai trò & Nhiệm vụ chính |
| :---: | :--- | :---: | :--- |
| **1** | [Điền tên Thành viên 1] | [MSSV 1] | **Góp vốn & rút trước hạn**: ETH/wei, payable, mapping; `pledge`, `receive`, `unpledge`; test và demo góp/rút. Báo cáo: Phần 1, mục 2.1 và nội dung luồng này trong 3.2.2, 3.3, 3.4. |
| **2** | [Điền tên Thành viên 2] | [MSSV 2] | **Vòng đời & giải ngân**: mục tiêu/deadline, trạng thái, quyền creator, `claim`, factory; test và demo giải ngân. Báo cáo: mục 2.2, 3.1, phần constructor/claim/hàm đọc trong 3.2.2, 3.2.3 và nội dung tương ứng ở 3.3, 3.4. |
| **3** | [Điền tên Thành viên 3] | [MSSV 3] | **Hoàn tiền & an toàn quỹ**: `refund`, `sweepExcessEther`, CEI, guard, forced ETH và bất biến; test và demo hoàn tiền. Báo cáo: mục 2.3, phần refund/sweep/guard trong 3.2.2, test an toàn ở 3.3, 3.3.1 và demo ở 3.4; tổng hợp Phần 4 cùng cả nhóm. |

<br>

**Giảng viên hướng dẫn:** [Điền tên Thầy / Cô hướng dẫn]  
**Năm học:** 2025 – 2026

</div>

**Nguyên tắc phân công:** mỗi người phụ trách lý thuyết, Solidity, test, nội dung báo cáo và demo của một luồng Blockchain. TV1 chịu trách nhiệm cả rollback/retry khi unpledge lỗi; TV2 chịu trách nhiệm cả rollback/retry khi claim lỗi; TV3 phụ trách refund/an toàn và rà chéo cơ chế chung, không giải thích thay hai luồng kia. Cả ba cùng chuẩn bị mục 2.4 (Web3), thực nghiệm ở 3.4 và kiến thức vấn đáp nền tảng; TV2 làm đầu mối tích hợp Web3, không có vai trò chỉ làm frontend/slide. Vòng rà chéo: TV1 rà TV2, TV2 rà TV3, TV3 rà TV1. Đây là kế hoạch trách nhiệm, không xác nhận tác giả lịch sử hay tỷ lệ đóng góp thực tế. Xem [phân công chi tiết, kịch bản demo và checklist bảo vệ](../group_report.md).

---

## MỤC LỤC QUYỂN BÁO CÁO

Quyển báo cáo được chia thành 4 phần độc lập theo đúng quy chuẩn đề cương môn học:

* [**PHẦN 1: ĐẶT VẤN ĐỀ**](01_dat_van_de.md)
  * 1.1. Bối cảnh gọi vốn cộng đồng (Crowdfunding)
  * 1.2. Bài toán đặt ra và rào cản của mô hình tập trung (Web2)
  * 1.3. Các vấn đề liên quan và khảo sát thực tế (All-or-Nothing, The DAO, DoS)
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
