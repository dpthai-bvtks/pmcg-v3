# 📋 PMCG v3 Cloudflare - Tài Liệu Kỹ Thuật & Nhật Ký Phát Triển

---

## 1. 🏗️ Kiến Trúc Tổng Thể Hệ Thống (100% Cloudflare Serverless)

| Thành phần | Nền tảng & Công nghệ | Địa chỉ / Định danh | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | Vanilla JS + Vanilla CSS (Glassmorphism), PWA Offline-First (Dexie, SW) | • `https://www.xeplichthuthuat.io.vn`<br>• `https://pmcg-v3.pages.dev` | Cloudflare Pages (`pmcg-v3`), phản hồi 0ms từ cache. |
| **Backend API** | Cloudflare Workers + Hono Framework | `https://pmcg-api.dpthai-ttytmk.workers.dev` | 100% Zero-CORS, độ trễ 10 - 25ms. |
| **Database** | Cloudflare D1 (SQLite Edge Database) | `pmcg-db`<br>(ID: `361c6030-0826-46e1-8a94-2f951f98a022`) | Thay thế hoàn toàn Google Sheets / GAS cũ. |
| **Source / Backup** | GitHub Repository (`main` branch) | `https://github.com/dpthai-bvtks/pmcg-v3` | Lưu trữ mã nguồn, nhật ký & dự phòng toàn diện. |
| **Tự động hóa** | Cloudflare Workers Cron Trigger | `0 10 * * *` (17:00 VN hàng ngày) | Tự động sao lưu dữ liệu & trigger AI Re-train. |
| **Tài khoản mẫu** | Bảng `accounts` trên D1 | • `admin` / `admin`<br>• `dpt` / `admin@123` | Quản trị viên hệ thống. |

---

## 2. 🧠 Động Cơ Xếp Lịch Hybrid Đa Tầng (Scheduler Engine)

Động cơ xếp lịch chạy trực tiếp trên trình duyệt (Client-side), xử lý 180+ ca thủ thuật trong **0.1 - 0.2 giây** thông qua 3 nhóm module phối hợp:

```
[Khởi tạo / AI Ranking] ──▶ [Pha 1: Heuristic Multi-threads] ──▶ [Pha 2: CP-SAT Solver] ──▶ [Chẩn đoán rớt lịch]
   (js/ai-scheduler.js)         (js/scheduler-engine.js)             (js/cp-solver.js)       (UnscheduledDiagnostic)
```

1. **Nhóm 1 - CP Solver (`js/cp-solver.js`)**:
   - `MedicalCPSolver`: Bộ giải Quy hoạch ràng buộc (Constraint Programming) & Nhánh cận (Branch-and-Bound).
   - Quét vét cạn không gian lỗ hổng thời gian (Time-slot gap search) để giải cứu các ca rớt.
2. **Nhóm 2 - Scheduler Engine (`js/scheduler-engine.js`)**:
   - `SchedulerEngine`: Đa luồng Web Workers theo số lõi CPU kết hợp Simulated Annealing & Mutate operators (swap, shift, reverse).
   - `UnscheduledDiagnosticEngine`: Tự động chẩn đoán nguyên nhân rớt (kẹt KTV, nghẽn máy, kẹt giường, xung đột giờ) và gợi ý 3 phương án can thiệp.
3. **Nhóm 3 - AI Pattern Engine (`js/ai-scheduler.js`)**:
   - `AIScheduler`: Học mẫu lâm sàng từ 20.000 dòng lịch sử thực tế.
   - Quản lý ma trận KTV - Thủ thuật - Phòng (`staffAffinity`), chỉ số nghẽn máy (`machineCongestion`), và chấm điểm ưu tiên bệnh nhân (`scorePatientPriority`).

### ⚙️ Các Quy Tắc Lâm Sàng & Nghiệp Vụ Cốt Lõi:
* **Thủ thuật làm liên tục 1:1 (`lien_tuc = 1`)**: Khóa cứng `TG Thực Hiện = TG Thủ Thuật` (KTV phục vụ trọn vẹn ca, không rời đi).
* **Phân loại Bệnh nhân**:
  - *Ngoại trú*: Buổi Sáng (07:00 - 11:30), Buổi Chiều (13:00 - 16:30), hoặc Tự động. Khoảng cách giữa các ca của BN tối đa 3 phút.
  - *Nội trú*: Ưu tiên bệnh nhân ra viện trong ngày, người cao tuổi, ca máy hiếm.
* **Dual-Mode Reordering**: Kéo thả SortableJS (nút `☰`) kết hợp nút di chuyển `▲`/`▼` tức thì trên 5 bảng chính.
* **Quản lý phác đồ**: Giao diện Split-Layout (Form cấu hình bên trái + Bảng quản lý bên phải).

---

## 3. 🗄️ Cấu Trúc Bảng Dữ Liệu Cloudflare D1 (`pmcg-db`)

| Bảng SQL | Mục đích lưu trữ | Bảng SQL | Mục đích lưu trữ |
| :--- | :--- | :--- | :--- |
| `patients` | Danh sách bệnh nhân & chỉ định | `history_records` | Lịch sử xếp lịch các ngày |
| `staff` | Nhân sự, kỹ năng, ca trực, giờ bận | `history_busy` | Lịch sử giờ bận & ra viện |
| `machines` | Danh mục 63+ máy móc thiết bị | `training_data` | Dữ liệu huấn luyện AI |
| `rooms` | Danh mục phòng & số giường | `tim_ranh` | Dữ liệu khung giờ rảnh dùng chung |
| `procedures` | Danh mục 16+ thủ thuật YHCT/PHCN | `chamcong_records`| Dữ liệu chấm công theo tháng |
| `phac_do` | Danh mục phác đồ điều trị gói | `thongke_records` | Dữ liệu thống kê theo tháng |
| `accounts` | Tài khoản đăng nhập & phân quyền | `documents` | Văn bản hướng dẫn BYT & quy trình |
| `cai_dat` | Cấu hình tham số hệ thống | | |

---

## 4. 🛠️ Quy Trình Thao Tác & Lệnh Deploy Chuẩn (Theo RULES.md)

Trước khi đẩy code, **bắt buộc** thực hiện theo quy trình 4 bước:

1. **Kiểm tra cú pháp**:
   ```bash
   node -c js/app.js && node -c js/scheduler-engine.js && node -c backend/src/index.js
   ```
2. **Đồng bộ 3 điểm Version & Cache**:
   - Cập nhật thời gian Footer trong `index.html` (`⏱ Cập nhật lần cuối: HH:mm DD/MM/YYYY`).
   - Tăng query string trong `index.html`: `js/app.js?v=3.2.6-revN`, `sw.js?v=3.2.6-revN`...
   - Tăng `CACHE_NAME` trong `sw.js`: `const CACHE_NAME = 'pmcg-cache-v3.2.6-revN';`.
3. **Deploy lên Cloudflare** (Thực hiện trong thư mục `backend/`):
   - *Chỉ sửa Web/Frontend*: `npm run deploy:web`
   - *Sửa cả Backend Worker/D1*: `npm run deploy:all`
4. **Sao lưu lên GitHub**:
   ```bash
   git add . && git commit -m "feat/fix: mô tả ngắn gọn" && git push origin main
   ```

---

## 5. 📜 Tóm Tắt Lịch Sử Nâng Cấp Các Phiên Bản

| Phiên bản | Ngày | Nội dung tóm tắt |
| :--- | :---: | :--- |
| **v3.0.0 - v3.2.0** | 08/2026 | Di trú toàn diện 16/16 bảng từ Excel/GAS sang Cloudflare D1 + Workers + Hono. |
| **v3.2.4 - v3.2.5** | 29/08/2026 | Tích hợp Dual-mode Reordering (SortableJS + Mũi tên ▲/▼). Sửa lỗi map cột D1. |
| **v3.2.6-rev1..5** | 30/08/2026 | Tách bảng D1 riêng biệt (`machines`, `rooms`, `procedures`, `phac_do`). Tái thiết kế Split-layout cho Phác đồ điều trị. |
| **v3.2.6-rev8..10**| 30/08/2026 | Bổ sung thuộc tính & thuật toán khóa cứng 1:1 cho thủ thuật làm liên tục (`lien_tuc`). |
| **v3.2.6-rev11..13**| 30/08/2026 | Chuyển 100% Frontend sang Cloudflare Pages (`pmcg-v3`). Ghim cố định tiêu đề & form tab Giờ bận. Chuẩn hóa `RULES.md`. |

---

## 6. 📝 Nhật Ký Cập Nhật Mới (AI Append Log)

*Mỗi khi hoàn thành yêu cầu mới, AI ghi bổ sung vào mục này theo mẫu ngắn gọn dưới đây:*

### [Tên Tính Năng / Sửa Lỗi] (DD/MM/YYYY - vX.X.X-revN)
- **Yêu cầu**: Mô tả ngắn gọn mong muốn của người dùng.
- **Giải pháp**: Chi tiết kỹ thuật cốt lõi đã xử lý.
- **File sửa đổi**: Danh sách các file đã can thiệp.
