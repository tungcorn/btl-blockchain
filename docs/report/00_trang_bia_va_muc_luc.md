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
| **1** | [Điền tên Thành viên 1] | [MSSV 1] | **Smart Contract Lead**: Kiến trúc hợp đồng, State Machine, Tối ưu Gas (Phụ trách viết **Phần 2** & **Phần 3.2**) |
| **2** | [Điền tên Thành viên 2] | [MSSV 2] | **Security & Testing Lead**: Mô hình an ninh CEI, Unit Test, CLI Simulator (Phụ trách viết **Phần 1** & **Phần 3.3**) |
| **3** | [Điền tên Thành viên 3] | [MSSV 3] | **Frontend, Web3 & QA Lead**: DApp 2 Trục tiến độ, Ethers.js, MetaMask, Cẩm nang vấn đáp (Phụ trách viết **Phần 3.4** & **Phần 4**) |

<br>

**Giảng viên hướng dẫn:** [Điền tên Thầy / Cô hướng dẫn]  
**Năm học:** 2025 – 2026

</div>

---

## MỤC LỤC QUYỂN BÁO CÁO

Quyển báo cáo được chia thành 4 phần độc lập theo đúng quy chuẩn đề cương môn học:

* [**PHẦN 1: ĐẶT VẤN ĐỀ**](file:///d:/Hoc/BlockChain/lab02-crowdfunding-smart-contract/docs/report/01_dat_van_de.md)
  * 1.1. Bối cảnh gọi vốn cộng đồng (Crowdfunding)
  * 1.2. Bài toán đặt ra và rào cản của mô hình tập trung (Web2)
  * 1.3. Các vấn đề liên quan và khảo sát thực tế (All-or-Nothing, The DAO, DoS)
  * 1.4. Mục tiêu và phạm vi nghiên cứu (Case study: Dự án Orbit Mesh)

* [**PHẦN 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ**](file:///d:/Hoc/BlockChain/lab02-crowdfunding-smart-contract/docs/report/02_co_so_ly_thuyet.md)
  * 2.1. Nền tảng Ethereum và Máy ảo EVM (Account model, Storage, Gas & Opcode)
  * 2.2. Ngôn ngữ Solidity (^0.8.20) và Kỹ thuật tối ưu (block.timestamp, immutable, Custom Errors)
  * 2.3. Các mẫu thiết kế an ninh cốt lõi (CEI Pattern, Pull-over-Push, ReentrancyGuard)
  * 2.4. Công nghệ tương tác Web3 máy khách (Ethers.js v6, MetaMask Signer, ECDSA secp256k1)

* [**PHẦN 3: PHÂN TÍCH, THIẾT KẾ VÀ TRIỂN KHAI THỰC NGHIỆM**](file:///d:/Hoc/BlockChain/lab02-crowdfunding-smart-contract/docs/report/03_trien_khai_va_thuc_nghiem.md)
  * 3.1. Kiến trúc hệ thống và Thiết kế máy trạng thái (State Machine, Ma trận phân quyền)
  * 3.2. Cấu trúc mã nguồn và Chi tiết các hàm trong `Crowdfunding.sol` & `CrowdfundingFactory.sol`
  * 3.3. Kết quả kiểm thử tự động 2 tầng (18 Mock + 34 Hardhat EVM = 52 test cases, 100% Pass) & Báo cáo Slither
  * 3.4. Thiết kế giao diện Web DApp Trục kép (Tiền vốn & Dòng thời gian) và Kết quả thực nghiệm

* [**PHẦN 4: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN**](file:///d:/Hoc/BlockChain/lab02-crowdfunding-smart-contract/docs/report/04_ket_luan_va_huong_phat_trien.md)
  * 4.1. Giá trị và kết quả thu được
  * 4.2. Hạn chế của đề tài
  * 4.3. Hướng mở rộng trong tương lai (Milestone DAO Voting, SafeERC20, Layer-2, Quadratic Funding)
