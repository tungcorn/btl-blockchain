# Rà soát dependency npm — 2026-11-25

## Phạm vi và kết quả

Đối chiếu cây dependency bằng `npm audit --json`, `npm ls`, `npm explain` trên Windows, Node.js 22.15.0 / npm 10.9.2. Đây là rà soát thư viện Node phục vụ phát triển, không phải audit Solidity hoặc kiểm chứng chữ ký MetaMask. Advisory có thể thay đổi; số dưới là quan sát của lần kiểm tra này.

| Mức npm báo cáo | Trước | Sau |
| --- | ---: | ---: |
| Critical | 1 | 0 |
| High | 14 | 2 |
| Moderate | 16 | 5 |
| Low | 20 | 31 |
| Tổng | 51 | 38 |

Các số là mục trong báo cáo dependency, gồm cả package bị ảnh hưởng gián tiếp; không phải số lỗ hổng độc lập. Low tăng có thể do mức nghiêm trọng tổng hợp của package cha giảm sau khi vá dependency con, không thể diễn giải chỉ từ tổng số. **Chưa sạch advisory**; `npm audit` vẫn trả exit code 1.

## Những cập nhật đã chọn

- Hardhat **2.29.1 → 2.30.0**, giữ cùng dòng 2.x và khóa phiên bản trực tiếp. Toolbox vẫn **5.0.0**, không chuyển sang Hardhat 3/Toolbox 7.
- `handlebars` **4.7.9 → 4.7.10** qua `solidity-coverage → sc-istanbul`: xử lý cảnh báo Critical đã quan sát. Tham chiếu: [AST type confusion](https://github.com/advisories/GHSA-8r5x-fm3f-whwj), [own-property check bypass](https://github.com/advisories/GHSA-p8wg-vrv2-v86f).
- `undici` **5.29.0 → 6.29.1** và `adm-zip` **0.4.16 → 0.6.1** qua dependency của Hardhat 2.30.0, không ép override hai package này. `hardhat-verify` cập nhật **2.1.3 → 2.1.4**. Cây mới không còn bản `@fastify/busboy` 2.1.1 cũ.
- Các bản vá tương thích khác được ghi trong lockfile, gồm `brace-expansion`, `fast-uri`, `follow-redirects`, `pbkdf2`, `qs`.

### Override có giới hạn

Một số package cha ghim chính xác bản cũ nên cập nhật thông thường không thay thế được. `package.json` khai báo:

| Override | Lý do / giới hạn |
| --- | --- |
| `lodash: 4.18.1` | Các consumer quan sát đều dùng dòng 4.x; bỏ bản 4.17.21 bị ghim bởi Ignition. [Advisory template](https://github.com/advisories/GHSA-r5fr-rjxr-66jc). |
| `ws@8.18.0: 8.21.0` | Chỉ thay bản 8.18.0 của provider Ethers v5; giữ `ws` 7.x mà Hardhat khai báo, không ép cả cây lên 8.x. [Advisory fragmentation](https://github.com/advisories/GHSA-96hv-2xvq-fx4p). |
| `ethjs-unit → bn.js: 4.12.3` | Cập nhật trong cùng dòng 4.x thay bản 4.11.6 bị ghim. [Advisory bn.js](https://github.com/advisories/GHSA-378v-28hj-76wf). |
| `number-to-bn → bn.js: 4.12.3` | Cùng lý do; không thay các consumer `bn.js` 5.x. |

npm 10.9.2 đã giữ lại entry `ws` 8.18.0 cũ dù có override, khiến `npm ls` báo invalid. Đã bỏ entry nested cũ trong lockfile để dùng bản 8.21.0 đã có ở root; **cài sạch `npm ci` và `npm ls` đã xác nhận cây hợp lệ**. Không sửa mã trong `node_modules`, không dùng `--force` hay `--legacy-peer-deps` để bỏ qua lỗi.

## Advisory còn tồn tại — chưa coi là đã khắc phục

| Package gốc advisory | Mức | Đường/phạm vi và quyết định |
| --- | --- | --- |
| `serialize-javascript` 6.0.2 | High | Qua Mocha 10/11 của coverage, gas reporter và Hardhat. Các parent hiện yêu cầu `^6.0.2`; bản 7.1.3 nằm ngoài range. Chưa ép override khác major trong lượt cập nhật tương thích này. Cần một lượt đánh giá/cập nhật test runner riêng. [RCE advisory](https://github.com/advisories/GHSA-5c6j-r48x-rmvq), [XSS advisory](https://github.com/advisories/GHSA-m5mm-p8h7-m29v). |
| `tmp` 0.0.33 | High | `hardhat → solc` (package Node 0.8.26) ghim chính xác 0.0.33. Bản vá 0.2.6 nằm ngoài range; npm đề xuất Hardhat 3 cho remediation tự động. Chưa ép thay API pre-1.0 hay nâng toàn toolchain. [Path traversal advisory](https://github.com/advisories/GHSA-ph9p-34f9-6g65). |
| `glob` 10.5.0 | Moderate | Dùng trong test runner; advisory cancellation chưa được giải quyết bằng bản cập nhật tương thích đã chọn. |
| `minimatch` 9.0.9 | Moderate | Dependency test runner; bản ngoài dòng major hiện dùng cần đánh giá riêng. |
| `cookie` 0.4.2 | Low | Cây công cụ Hardhat/Sentry; giữ nguyên thay vì ép một bản pre-1.0 có thể thay đổi API. |
| `diff` 7.0.0 | Low | Dependency Mocha; chưa ép lên major 8 để chỉ làm sạch số audit. |
| `elliptic` 6.6.1 | Low | Qua dependency crypto/Ethers v5 của tooling; npm báo không có bản vá trong range hiện tại. Không dùng tài khoản test công khai để giữ tài sản thật. |

Đây là các package gốc có advisory trực tiếp, không phải toàn bộ 38 mục bị ảnh hưởng gián tiếp. Tooling chạy cục bộ không làm các advisory tự biến mất: chỉ chạy code/test và mẫu đầu vào tin cậy; không chạy CI với template, archive, glob hoặc cấu hình từ nguồn không tin cậy cùng secrets. Không công khai RPC Hardhat hoặc báo cáo coverage như một dịch vụ nhận dữ liệu tùy ý. Chưa có kiểm chứng khả năng khai thác trong dự án; không khẳng định các cảnh báo còn lại là vô hại hoặc contract bị khai thác từ chúng.

## Kiểm chứng sau cập nhật

- `npm ci`: thành công; `npm ls ws lodash handlebars bn.js --depth=5`: không còn invalid dependency.
- `npx hardhat compile --force`: biên dịch thành công với cấu hình Solidity **0.8.20**, optimizer 200 runs, target quan sát `paris`.
- `npm test`: **18 model + 41 EVM pass**. Log model xuất hiện lại do Hardhat discovery, không tính thêm 18 test.
- `npm run test:coverage`: chạy thành công, 41 EVM pass; không suy ra bao phủ 100% hay chứng minh an toàn.
- `npm run test:ui`: **17 browser tests pass**; provider giả lập, không phải MetaMask ký thật.
- Không sửa Solidity, ABI, Ethers/font vendored hay bằng chứng EVM/Slither cũ. Bản `solc` npm phụ thuộc của Hardhat không thay thế phiên bản compiler được chọn trong `hardhat.config.js`.

Để tái kiểm tra: `npm ci`, `npm audit`, `npm ls`, rồi các lệnh test ở trên. Chỉ cập nhật các con số sau khi thực sự chạy; không dùng `npm audit --omit=dev` để trình bày rằng toàn bộ môi trường đã hết rủi ro.
