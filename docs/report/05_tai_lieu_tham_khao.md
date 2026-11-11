# TÀI LIỆU THAM KHẢO

Nguồn chính thức dùng để đối chiếu các khái niệm của báo cáo. Trang `latest` và nhánh `master` có thể thay đổi; khi nộp, ghi ngày truy cập thực tế và giữ phiên bản compiler/công cụ của lần thực nghiệm. Danh mục không thay thế kiểm chứng source của dự án.

1. **Solidity 0.8.20 — Units and Globally Available Variables.** ETH/wei, `msg.sender`, `msg.value`, `block.timestamp`; dùng tại Phần 2.1 và 2.2. https://docs.soliditylang.org/en/v0.8.20/units-and-global-variables.html
2. **Solidity 0.8.20 — Contracts.** Constructor, immutable, events, errors và receive; dùng tại Phần 2 và phân tích hàm ở Phần 3. https://docs.soliditylang.org/en/v0.8.20/contracts.html
3. **Solidity 0.8.20 — Security Considerations.** Reentrancy, external calls, CEI và gas-limit/loop risks; dùng tại mục 2.3. https://docs.soliditylang.org/en/v0.8.20/security-considerations.html
4. **Ethereum consensus specifications — Bellatrix, process_execution_payload.** Ràng buộc timestamp của execution payload theo slot; dùng tại mục 2.2.1. https://github.com/ethereum/consensus-specs/blob/master/specs/bellatrix/beacon-chain.md#process_execution_payload
5. **EIP-6780 — SELFDESTRUCT only in same transaction.** Đọc đầy đủ semantics: vẫn chuyển balance, ngoại lệ cùng transaction liên quan xóa account/code/storage; dùng tại mục 2.3.4 và 3.2.2. https://eips.ethereum.org/EIPS/eip-6780
6. **EIP-150 — Gas cost changes for IO-heavy operations.** Quy tắc chuyển tiếp gas của CALL; dùng tại mục 2.3.3. https://eips.ethereum.org/EIPS/eip-150
7. **Ethers v6 — API documentation.** BrowserProvider, signer, Contract, parseEther và transaction receipts; dùng tại mục 2.4/3.4. Demo ghim Ethers 6.7.0; tài liệu v6 có thể mô tả API mới hơn. https://docs.ethers.org/v6/api/
8. **Hardhat 2 — Hardhat Network.** EVM local và RPC phục vụ kiểm thử; dùng tại mục 3.3 và hướng dẫn local demo. https://v2.hardhat.org/hardhat-network/docs/overview
9. **Slither — Detector Documentation.** Severity và ý nghĩa từng detector; dùng tại mục 3.3.1 và triage. https://github.com/crytic/slither/wiki/Detector-Documentation
10. **Solidity — List of Known Bugs.** Điều kiện ảnh hưởng theo version/optimizer; dùng tại triage `solc-version`. https://docs.soliditylang.org/en/latest/bugs.html

## Bằng chứng nội bộ, không phải nguồn thẩm định độc lập

- [Source Crowdfunding](../../contracts/Crowdfunding.sol) và [Factory](../../contracts/CrowdfundingFactory.sol).
- [Test EVM](../../test/Crowdfunding.evm.test.js) và [model JavaScript](../../test/Crowdfunding.test.js).
- [Báo cáo Slither, hash và raw JSON](../security/slither-report.md).
- [Phụ lục đối chiếu yêu cầu và kết quả thực nghiệm](06_doi_chieu_va_minh_chung.md).
