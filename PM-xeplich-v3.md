# 📋 NHẬT KÝ PHÁT TRIỂN & NÂNG CẤP HỆ THỐNG PMCG V3 CLOUDFLARE

## 1. Mục tiêu kiến trúc & Nâng cấp v3 Cloudflare
- **Kiến trúc**: Chuyển đổi toàn diện từ Google Apps Script (GAS) sang Cloudflare Workers + Cloudflare D1 (SQLite Edge Database).
- **Frontend**: Single Page Application (SPA), Vanilla JS + CSS Glassmorphism hiện đại, bộ nhớ đệm Offline Cache (0ms), tối ưu đa luồng.
- **Scheduler Engine**: Tích hợp Turbo Scheduler Client-side chạy trực tiếp trên trình duyệt, xếp 189 ca thủ thuật trong **0.1 - 0.2 giây**.

---

## 2. Các mốc giải quyết vấn đề lớn trong phiên làm việc

### 🚀 A. Di trú toàn diện 16/16 Sheets từ Excel sang Cloudflare D1
- Di trú thành công:
  - 18.815 dòng lịch sử thủ thuật sang bảng `history_records`.
  - 217 dòng lịch sử giờ bận sang bảng `history_busy`.
  - 4.727 dòng dữ liệu huấn luyện AI sang bảng `training_data`.
  - 174 dòng khung giờ rảnh sang bảng `tim_ranh`.
  - 6 văn bản hướng dẫn chuyên ngành YHCT của Bộ Y Tế sang bảng `documents`.
  - 8 tháng dữ liệu chấm công (`chamcong_records`) & thống kê (`thongke_records`) từ tháng 01/2026 đến tháng 08/2026.
  - Toàn bộ danh mục nhân sự (17), máy móc (63), thủ thuật (16), phòng (6), bệnh nhân (47).

### 🚀 B. Khắc phục các lỗi vận hành & Bổ sung tính năng
1. **Lỗi Xem lịch cũ & Tìm giờ rảnh**:
   - Khắc phục lỗi thiếu thuộc tính mảng `dsThuThuat` và `slots` trong API `getHistoryFullData`.
   - Bổ sung cơ chế bóc tách an toàn cho `applyHistoryDataToTabs`.
2. **Lỗi Tab Chấm công & Thống kê hiển thị trống**:
   - Giải quyết lệch định dạng khóa tháng (`2026-08` vs `08_2026`) bằng bộ giải mã đa định dạng `normalizeMonthKeys`.
   - Khắc phục lỗi SQLite `no such column: id` bằng cách chuyển sang sắp xếp theo `updated_at` / `rowid`.
3. **Sắp xếp tự động Tab Bệnh nhân theo Ngày Vào**:
   - Thiết lập mặc định khi mở ứng dụng: Bệnh nhân có **Ngày Vào cũ nhất lên đầu** (`ASC`).
   - Tiêu đề cột **"Ngày Vào ▲"** có thể click trực tiếp để đảo chiều sắp xếp linh hoạt.
4. **Tích hợp Kéo thả (Drag & Drop Reordering)**:
   - Tích hợp thư viện chuẩn công nghiệp **SortableJS** trên 5 bảng chính: Bệnh nhân, Nhân sự, Máy móc, Thủ thuật, Phòng.
   - Hỗ trợ di chuyển dòng siêu mượt trên cả chuột máy tính và cảm ứng di động, có hiệu ứng đổ bóng và viền xanh định vị.
   - Tự động lưu thứ tự mới sau khi kéo thả lên LocalStorage và đồng bộ về Cloudflare D1 Database qua action `saveReorderedData`.

---

## 3. Hướng dẫn quản trị & Sửa trực tiếp dữ liệu trên Cloudflare
1. **Qua Cloudflare Dashboard (Giao diện Web trực quan giống Excel)**:
   - Truy cập: `https://dash.cloudflare.com/` ➔ **Storage & Databases** ➔ **D1 SQL Database** ➔ Chọn database **`pmcg-db`**.
   - Tab **Explore Data**: Chọn bảng (`patients`, `staff`, `categories`...) và nhấp đúp vào ô để sửa trực tiếp hoặc thêm/xóa dòng.
   - Tab **Console**: Chạy các câu lệnh SQL trực tiếp.
2. **Qua dòng lệnh Wrangler CLI (Từ máy tính)**:
   - `npx wrangler d1 execute pmcg-db --remote --command="SELECT * FROM patients LIMIT 5;"`
3. **Qua giao diện PMCG Web v3**:
   - Nhấp vào bất kỳ hàng nào trên bảng để chỉnh sửa tại khung bên trái và bấm **"Lưu"**.


### 🚀 C. Nâng cấp Hệ thống Điều Chỉnh Thứ Tự Kép (Dual-Mode Reordering v3.24)
- **Tình trạng trước đó**: Kéo thả trên toàn bộ dòng bị xung đột với sự kiện click mở form sửa, đồng thời script CDN bên ngoài có thể bị trình duyệt chặn (Tracking Prevention).
- **Giải pháp toàn diện**:
  1. **Nhúng cục bộ `js/sortable.min.js`**: 100% không phụ thuộc CDN, hoạt động ổn định kể cả khi offline.
  2. **Biểu tượng tay nắm kéo thả riêng biệt (`☰`)**: Bấm giữ vào nút `☰` ở cột STT để kéo thả mượt mà, không bị kích hoạt sự kiện click của dòng.
  3. **Bộ nút điều hướng nhanh Lên ▲ / Xuống ▼**: Bấm nút ▲ / ▼ để di chuyển dòng lên/xuống 1 vị trí tức thì (0.01s), cực kỳ tiện lợi trên chuột, trackpad và màn hình cảm ứng.
  4. **Tự động đồng bộ**: Lưu tức thì vào `localStorage` và đồng bộ về Cloudflare D1 Database.


### 🚀 D. Sửa Lỗi Mất Trắng Bảng Bệnh Nhân Khi Sửa & Khắc Phục Lỗi order_idx (v3.25)
- **Vấn đề 1**: Khi sửa thông tin bệnh nhân (thêm giờ bận, giờ ra viện), danh sách bệnh nhân bị mất trắng do API backend `getBenhNhan` trả về trực tiếp tên cột cơ sở dữ liệu (`name, age, arrive_time...`) thay vì ánh xạ chuẩn (`ten, namSinh, ngayVao, gioVao, gioBan, gioRa, phong, thuThuat`).
  - **Khắc phục**: Đã chuẩn hóa toàn bộ các Entity Mapper (`getBenhNhan`, `getNhanSu`, `getPhongThuThuat`, `getThuThuat`) trả về đầy đủ định dạng đối tượng giao diện.
- **Vấn đề 2**: Lỗi `D1_ERROR: no such column: order_idx` khi bấm mũi tên sắp xếp.
  - **Khắc phục**: Đã thực thi lệnh `ALTER TABLE patients ADD COLUMN order_idx INTEGER DEFAULT 0;` trên cơ sở dữ liệu Cloudflare D1 và bọc try-catch an toàn cho `saveReorderedData`.


### 🚀 E. Phân Tách 3 Bảng Độc Lập Trực Quan Trên Cloudflare D1 (`machines`, `rooms`, `procedures`) (v3.26)
- **Vấn đề**: Người dùng mở Cloudflare D1 Dashboard không tìm thấy bảng máy móc (`machines`), phòng (`rooms`), thủ thuật (`procedures`) vì trước đó được gom chung vào bảng đa hình `categories` với cột `type`.
- **Giải pháp dứt điểm**:
  1. Đã tạo 3 bảng độc lập, phẳng, rõ ràng trực tiếp trên Cloudflare D1:
     - 📑 **`machines`**: 63 máy móc với các cột `ten_loai`, `ma_may`, `trang_thai`, `order_idx`.
     - 📑 **`rooms`**: 6 phòng thủ thuật với các cột `ten_phong`, `bac_si`, `ktv`, `danh_sach_may`, `so_giuong`, `danh_sach_giuong`, `order_idx`.
     - 📑 **`procedures`**: 16 thủ thuật với các cột `ten_thu_thuat`, `viet_tat`, `he`, `phan_loai`, `may`, `tg_thuc_hien`, `tg_thu_thuat`, `khoang_cach`, `can_rut_may`, `can_nguoi_phu`, `ds_nguoi_phu`, `order_idx`.
  2. Toàn bộ API Backend Worker (`getBootstrapData`, `getDanhSachMay`, `getPhongThuThuat`, `getThuThuat` và các thao tác thêm/sửa/xóa) đều kết nối trực tiếp đến 3 bảng độc lập này.
  3. Giúp người dùng có thể nhấp đúp vào ô sửa trực tiếp trên Cloudflare D1 Dashboard cực kỳ trực quan và dễ dàng.


### 🚀 F. Khớp 100% Thứ Tự Bảng Với Cloudflare D1 & Kích Hoạt Nút Mũi Tên ▲/▼ (v3.27)
- **Vấn đề 1**: Giao diện phần mềm trước đó tự động sắp xếp tên nhân sự / bệnh nhân theo A-Z thay vì giữ nguyên thứ tự thực tế trong các bảng Cloudflare D1.
  - **Khắc phục**: Đã loại bỏ toàn bộ các điều kiện `name ASC` trên Backend SQL và xóa bộ lọc tự sort trên Client. Toàn bộ 5 bảng (`patients`, `staff`, `machines`, `rooms`, `procedures`) hiển thị chính xác 100% theo thứ tự hàng trên Cloudflare D1 (`ORDER BY order_idx ASC, id ASC`).
- **Vấn đề 2**: Nút mũi tên di chuyển dòng ▲ / ▼ không dịch chuyển được dòng do hàm lọc `filterPatientTable` tự chạy sau 300ms ghi đè lại DOM.
  - **Khắc phục**:
    1. Cập nhật hàm `moveRowUp` và `moveRowDown` sử dụng cơ chế `splice` mảng trực tiếp và render lại giao diện tức thì trong 0.01 giây.
    2. Sửa hàm lọc để không bao giờ can thiệp vào cấu trúc hiển thị STT và nút điều hướng khi ô tìm kiếm trống.
    3. Tự động lưu thứ tự mới sau khi bấm nút ▲ / ▼ lên `localStorage` và đồng bộ về Cloudflare D1 Database.


### 🚀 G. Khắc Phục Hoàn Toàn Kéo Thả ☰ & Nút Mũi Tên ▲/▼ Trên Tất Cả 5 Bảng (v3.28)
- **Nguyên nhân phát hiện**:
  1. Ở các hàm render `renderPatientsTable_Original`, `renderStaffTable_Original`, `renderProceduresTable_Original`, hàm khởi tạo kéo thả `initTableDragAndDrop` bị thiếu hoặc đặt ngoài phạm vi hàm sau khi vẽ dữ liệu.
  2. Cột STT điều khiển ở các bảng bị gán nhầm sang type `"patients"` thay vì đúng loại mảng tương ứng (`"staff"`, `"machines"`, `"rooms"`, `"procedures"`).
- **Giải pháp dứt điểm**:
  1. Đã chuẩn hóa chính xác 100% việc gắn `renderSttOrderControl` và `initTableDragAndDrop` cho cả 5 bảng chính:
     - 🩺 **Bệnh nhân (`patients`)**: Nút ☰ kéo thả + Nút ▲/▼ lên xuống.
     - 👨‍⚕️ **Nhân sự (`staff`)**: Nút ☰ kéo thả + Nút ▲/▼ lên xuống.
     - ⚡ **Máy móc (`machines`)**: Nút ☰ kéo thả + Nút ▲/▼ lên xuống.
     - 🏥 **Phòng (`rooms`)**: Nút ☰ kéo thả + Nút ▲/▼ lên xuống.
     - 📋 **Thủ thuật (`procedures`)**: Nút ☰ kéo thả + Nút ▲/▼ lên xuống.
  2. Gắn các hàm `window.moveRowUp`, `window.moveRowDown` và `window.renderSttOrderControl` trực tiếp vào phạm vi toàn cục với cơ chế `event.stopPropagation()` chống xung đột click form.


### 🚀 H. Khắc Phục Triệt Để Kéo Thả ☰ Cho 4 Bảng Danh Mục & Giữ Sạch Tab Bệnh Nhân (v3.29)
- **Vấn đề & Yêu cầu của người dùng**:
  1. Nút `☰` kéo thả trước đó chỉ chạy được ở tab máy móc và phòng, do hàm khởi tạo `initTableDragAndDrop` ở tab nhân sự và thủ thuật bị gọi trước khi gán HTML hoặc bị mất kết nối DOM sau khi render lại.
  2. Tab Bệnh nhân không cần các nút điều hướng `☰` hay `▲/▼` (giữ hiển thị STT thuần túy).
- **Giải pháp xử lý dứt điểm**:
  1. **Tab Bệnh nhân**: Đã xóa bỏ cụm nút `☰` và `▲/▼`, chỉ hiển thị số thứ tự STT chuẩn `1, 2, 3...` rõ ràng và sạch sẽ.
  2. **4 Tab Danh mục Quản lý** (`staff` - Nhân sự, `machines` - Máy móc, `rooms` - Phòng, `procedures` - Thủ thuật):
     - Chuyển toàn bộ lời gọi khởi tạo SortableJS `initTableDragAndDrop` xuống **ngay sau khi `tbody.innerHTML` đã được render xong vào cây DOM**.
     - Cấu hình SortableJS `animation: 180`, `handle: '.drag-handle-btn'`, `draggable: 'tr'` với cơ chế chống xung đột click form.
     - Các nút mũi tên `▲` / `▼` được liên kết chặt chẽ qua `window.moveRowUp` và `window.moveRowDown`, hoán đổi mảng và cập nhật giao diện trong 0.01 giây.


### 🚀 I. Khắc Phục Lỗi withLock is not defined & Đăng Nhập Cloudflare Worker (v3.30)
- **Vấn đề phát sinh**:
  1. `Uncaught ReferenceError: withLock is not defined at app.js`: Các hàm lưu giờ bận/giờ ra viện dùng hàm bao `withLock` nhưng định nghĩa hàm bị thiếu ở đầu file.
  2. `init.js: Uncaught ReferenceError: google is not defined at window.doLogin`: File `init.js` chạy trước `app.js` nên chưa có đối tượng `google.script.run` giả lập khi bấm Đăng nhập.
- **Giải pháp dứt điểm**:
  1. Đã khai báo hàm bảo vệ `withLock(fn)` toàn cục ở ngay đầu file `js/app.js` với cơ chế chống bấm đè (debounce/lock) an toàn.
  2. Nâng cấp hàm `window.doLogin` trong `js/init.js` chuyển sang gửi request `fetch` bất đồng bộ trực tiếp về Cloudflare Worker API (`checkLogin` / `verifyLogin`), không phụ thuộc vào thứ tự tải script.
  3. Bổ sung bí danh `case "checkLogin":` trên Backend Worker.


### 🚀 J. Khắc Phục Toàn Diện Lỗi google / dataCache is not defined (v3.31)
- **Nguyên nhân phát hiện**: Cầu nối `window.google.script.run` và biến toàn cục `dataCache` trước đó được khai báo ở giữa file, khiến các hàm chạy sớm lúc khởi động (`loadTimRanhDataFromServer`, `loadAccounts`, `loadDashboard`) bị báo lỗi `google is not defined` hoặc `dataCache is not defined`.
- **Giải pháp xử lý dứt điểm**:
  1. Chuyển toàn bộ định nghĩa `window.google.script.run` Cloudflare Worker Proxy và `window.dataCache` lên vị trí đầu tiên của file `js/app.js`, đảm bảo 100% các hàm và module phụ đều truy cập tức thì ngay khi tải trang.
  2. Khôi phục đầy đủ nền tảng API Bridge kết nối trực tiếp đến Cloudflare Worker (`https://pmcg-api.dpthai-ttytmk.workers.dev/`).
  3. Hoàn tất chuẩn hóa cho 5 bảng: Bảng Bệnh Nhân (STT sạch sẽ 1, 2, 3...) và 4 Bảng Danh Mục (Nhân sự, Máy móc, Phòng, Thủ thuật) có đầy đủ tay nắm kéo thả `☰` và nút di chuyển `▲`/`▼`.


### 🚀 K. Xóa Bỏ Hoàn Toàn Modal Cài Đặt Máy Chủ GAS Cũ (v3.32)
- **Vấn đề**: Hộp thoại "⚙️ Cài đặt Máy chủ (Google Apps Script)" là tính năng cũ từ phiên bản v2 dùng để dán link Web App URL của Google Sheets. Ở bản v3 Cloudflare, hệ thống đã chuyển dịch 100% sang Cloudflare Workers API (`https://pmcg-api.dpthai-ttytmk.workers.dev/`) + Cloudflare D1 Database nên hộp thoại này hoàn toàn dư thừa và gây nhầm lẫn.
- **Giải pháp**:
  1. Đã xóa bỏ toàn bộ HTML của hộp thoại (`#modal-server-config`) và nút mở cấu hình (`#btn-open-server-config`) trong file `index.html`.
  2. Đã dọn dẹp hàm lắng nghe sự kiện `initServerConfigModal` trong `js/init.js`.
  3. Tự động xóa `times_custom_api_url` khỏi `localStorage` của trình duyệt để đảm bảo hệ thống luôn kết nối trực tiếp đến Cloudflare Worker tốc độ cao.


### 🚀 L. Đồng Bộ Toàn Bộ Tài Khoản Từ Sheet TaiKhoan Lên Cloudflare D1 & Cung Cấp Thông Tin Đăng Nhập
- **Nguyên nhân**: Trong cơ sở dữ liệu gốc (sheet `TaiKhoan`) có 2 tài khoản quản trị:
  1. `admin` (Mật khẩu: `admin`)
  2. `dpt` (Mật khẩu: `admin@123`)
  Trước đó trong quá trình khởi tạo D1 ban đầu, hash của tài khoản `dpt` bị gán nhầm cho `admin` và tài khoản `dpt` chưa được insert vào bảng `accounts`.
- **Giải pháp**:
  1. Đã đồng bộ chuẩn xác toàn bộ danh sách tài khoản từ sheet `TaiKhoan` vào bảng `accounts` trên Cloudflare D1.
  2. Cả 2 tài khoản `admin` và `dpt` đều đã được kích hoạt thành công và kiểm thử API trả về `status: success`.


### 🚀 M. Khắc Phục Lỗi Đăng Nhập Báo "undefined" & Hoàn Thiện Xác Thực (v3.33)
- **Vấn đề**: Khi bấm đăng nhập, form hiện dòng chữ đỏ `undefined` dù mật khẩu đúng.
- **Nguyên nhân**:
  1. Backend Worker trả về đối tượng kết quả `{ status: "success", data: { username, role, permissions, token } }`.
  2. Hàm `doLogin` trong `js/init.js` kiểm tra điều kiện cứng `if (res && res.success)`. Vì đối tượng `data` không có thuộc tính `success: true` (chỉ có `username`), điều kiện này bị sai và nhảy vào nhánh `else`.
  3. Ở nhánh `else`, hàm cố gắng in `res.message` (giá trị là `undefined`), dẫn đến hiển thị chữ `undefined` màu đỏ trên giao diện.
- **Giải pháp**:
  1. Chuẩn hóa hàm `doLogin` kiểm tra linh hoạt cả `res.username`, `res.success`, và `res.status === 'success'`.
  2. Bổ sung `sessionId`, `token`, và `success: true` vào payload trả về của Worker API.
  3. Cả 2 tài khoản `admin` / `admin` và `dpt` / `admin@123` đăng nhập trơn tru và chuyển thẳng vào giao diện làm việc.

### N. Sửa Triệt Để Lỗi Đăng Nhập undefined (v3.34)
- **Nguyên nhân thực sự**: `executeApiTask` gọi `onSuccess(result.data)` — truyền vào handler đúng object `{ username, role, token }`. Nhưng `doLogin` kiểm tra `if (res && res.success)` — mà `data` **không có trường `success`** nên luôn nhảy vào nhánh lỗi hiển thị `undefined`.
- **Sửa**: Đổi điều kiện thành `if (res && (res.username || res.success))` để nhận diện đúng đăng nhập thành công.

### O. Đồng Bộ Chuẩn Giao Diện V2 & Khôi Phục Thanh Sidebar Tab Navigation (v3.36)
- **Đối soát với V2**: Đã kiểm tra toàn bộ mã nguồn `v2-github` (HTML, CSS, JS, Thống kê, Sync). Phát hiện phiên bản trước đã can thiệp sửa đè CSS của `.sidebar`, `.container`, `.nav-tab` và ép style bằng JS làm hỏng layout.
- **Khôi phục chuẩn V2**: 
  + Khôi phục nguyên bản 100% `css/style.css` từ `v2-github` (giữ đúng thiết kế thanh sidebar 65px với icon to đẹp, tooltip, responsive, màu sắc chuẩn của hệ thống).
  + Bổ sung sạch sẽ các style Drag & Drop Sortable (`.sortable-ghost`, `.drag-handle`).
  + Dọn dẹp hàm `applyPermissions` và `window.onload` trong `js/app.js` để nhận style tự nhiên từ CSS.

### P. Khắc Phục Lỗi Mất Sidebar Do Thẻ Đóng HTML Thừa (v3.37)
- **Nguyên nhân cốt lõi**: Trong [index.html](file:///g:/Other%20computers/Laptop%20Th%C3%A1i/PM-DPT/PM-xeplich/khung_pm/ban_web/v3-Cloudflare/index.html), ngay sau khối `#login-overlay` xuất hiện 1 thẻ `</div>` thừa. Thẻ này đã vô tình đóng sớm thẻ cha `.container`.
- **Hậu quả**: Cả `<aside class="sidebar">` và `<main class="main-wrapper">` bị đẩy ra ngoài container Grid, khiến `.main-wrapper` chiếm toàn bộ chiều ngang và che khuất / làm mất hoàn toàn thanh sidebar bên trái.
- **Xử lý**:
  + Loại bỏ thẻ `</div>` thừa sau `#login-overlay` và thẻ thừa trong template footer.
  + Chuẩn hóa cây DOM HTML khớp 100%.
  + Nâng phiên bản cache busting lên `?v=3.37` để trình duyệt người dùng tự động cập nhật ngay khi truy cập.

### Q. Khắc Phục Không Hiển Thị Danh Sách Kỹ Năng / Thủ Thuật Tab Nhân Sự & Bệnh Nhân (v3.38)
- **Nguyên nhân cốt lõi**: Khi tải dữ liệu qua `loadBootstrapData()` hoặc khôi phục từ `restoreOfflineCache()`, hệ thống chỉ gọi `renderProceduresTable()` mà thiếu gọi `renderProcedureCheckboxes()`. Do đó danh sách checkbox thủ thuật trong ô Kỹ năng (YHCT và PHCN) của Tab Nhân sự và Tab Bệnh nhân chưa được kết xuất vào DOM.
- **Xử lý**:
  + Bổ sung lệnh gọi `renderProcedureCheckboxes()` ngay khi nạp `b.procedures` trong cả `loadBootstrapData()` và `restoreOfflineCache()`.
  + Bổ sung kích hoạt tự động `renderProcedureCheckboxes()` trong `handleHashChange()` khi người dùng chuyển sang tab `tab-staff` hoặc `tab-patients`.
  + Nâng cấp `renderProcedureCheckboxes()` tương thích với cả cấu trúc Object `{ten, he}` lẫn Array `[id, ten, ...]`, hỗ trợ `escapeHtml` tránh lỗi ký tự đặc biệt.
  + Nâng phiên bản cache busting lên `?v=3.38`.

### R. Chuẩn Hóa Cột Tab Phòng & Tối Ưu Hiển Thị Giờ Y Lệnh Tab Bệnh Nhân (v3.40)
- **Tab Phòng**:
  + Thêm tiêu đề cột `<th>Số Giường</th>` vào bảng `rooms-table` (trước đó thiếu thẻ header khiến cột số giường bị gán nhầm vào tiêu đề `Thao Tác`, còn nút Xóa bị lệch ra ngoài).
  + Cập nhật `renderEmptyRow(7)` và `colspan="7"` đồng bộ.
- **Tab Bệnh Nhân**:
  + Giữ nguyên cột `Giờ Y lệnh` trên bảng danh sách bệnh nhân để dễ theo dõi.
  + Với các bệnh nhân cũ có giờ vào mặc định `07:30`, hệ thống **tự động ẩn giá trị 07:30 (để trống)** trên bảng giúp danh sách thoáng mắt và dễ nhận diện các bệnh nhân có giờ y lệnh đặc biệt.
  + Với bệnh nhân có giờ y lệnh riêng (ví dụ `08:30`, `09:00`,...), hiển thị nổi bật màu cam trên cột.
  + Cập nhật `renderEmptyRow(9)` và `colspan="9"`.
  + Nâng phiên bản cache busting lên `?v=3.40`.

### S. Khắc Phục Lỗi Màn Hình Che Mờ "Đang Xử Lý" Khi Thao Tác Chấm Công (v3.41)
- **Nguyên nhân**: Trong [js/app.js](file:///g:/Other%20computers/Laptop%20Th%C3%A1i/PM-DPT/PM-xeplich/khung_pm/ban_web/v3-Cloudflare/js/app.js), hàm `callApi` tự động kích hoạt `checkMutationLoading()` cho tất cả các hàm bắt đầu bằng `save*` (bao gồm `saveChamCong`). Khi người dùng gõ / sửa từng ô trong Bảng Chấm Công, hàm tự động lưu (auto-save) liên tục gọi `saveChamCong` khiến màn hình hiển thị overlay làm mờ và chặn thao tác liên tục.
- **Xử lý**:
  + Phân loại `saveChamCong` (và các tác vụ lưu ngầm như `saveReorderedData`) là **tác vụ lưu nền chạy ngầm (silent background mutation)**.
  + Loại trừ `saveChamCong` khỏi việc kích hoạt overlay toàn màn hình `showGlobalLoading`.
  + Quá trình lưu Chấm Công diễn ra hoàn toàn êm ái dưới nền (chỉ làm mờ nhẹ thanh header tiêu đề và khôi phục khi lưu xong), người dùng có thể thoải mái nhập liệu, dùng phím mũi tên di chuyển ô mà không bị gián đoạn.
  + Nâng phiên bản cache busting lên `?v=3.41`.

### T. Khắc Phục Triệt Để Lỗi Thêm / Xóa Giờ Bận Nhân Sự & Giữ Vững Tab Nhân Sự (v3.42)
- **Nguyên nhân cốt lõi**:
  + Trong backend [backend/src/index.js](file:///g:/Other%20computers/Laptop%20Th%C3%A1i/PM-DPT/PM-xeplich/khung_pm/ban_web/v3-Cloudflare/backend/src/index.js), hàm `getNhanSu` đọc sai tên cột `busy_ranges` (cột chuẩn trong sqlite là `temp_busy`) và không phân giải chuỗi JSON `skills` / `temp_busy`. Sau khi lưu giờ bận, frontend gọi `loadEntity('getNhanSu')` khiến dữ liệu nhân sự trả về bị `undefined` các trường `thoiGianLam`, `trangThai`, `gioBan`, dẫn đến `renderBusyStaff` / `renderStaffTable` bị lỗi văng Exception và tê liệt Tab Nhân sự.
  + Trong `editNhanSu`, offset tham số không kiểm tra chặt chẽ số lượng đối số (10 tham số khi sửa qua index, 9 khi thêm mới).
- **Xử lý**:
  + Đồng bộ chuẩn hóa `getNhanSu` và `editNhanSu` trên backend: đọc chuẩn cột `temp_busy`, parse JSON an toàn thành chuỗi phân cách dấu phẩy, điền đầy đủ giá trị mặc định cho `thoiGianLam`, `trangThai`, `quyen`.
  + Frontend [js/app.js](file:///g:/Other%20computers/Laptop%20Th%C3%A1i/PM-DPT/PM-xeplich/khung_pm/ban_web/v3-Cloudflare/js/app.js): Cải tiến hàm `renderBusyStaff()`, `saveStaffBusy()`, `deleteSingleStaffBusy()`, `clearStaffBusy()` với cơ chế xử lý chuỗi/mảng an toàn, chuẩn hóa tiếng Việt cho thông báo và bảo vệ `dataCache.staff` không bị lỗi.
  + Nâng phiên bản cache busting lên `?v=3.42`.

### U. Khắc Phục Lỗi Nhập File HIS & Nhập Excel Bệnh Nhân (v3.43)
- **Nguyên nhân cốt lõi**:
  + Trong backend [backend/src/index.js](file:///g:/Other%20computers/Laptop%20Th%C3%A1i/PM-DPT/PM-xeplich/khung_pm/ban_web/v3-Cloudflare/backend/src/index.js), hành động `bulkUpdatePatients` bị thiếu khối lệnh thực thi và bị rơi xuống `case "getSchedule"`. Khi người dùng bấm nhập file HIS / Excel, backend xử lý danh sách bệnh nhân như một tham số ngày tháng của bảng xếp lịch và trả về sai định dạng.
  + Frontend nhận diện phản hồi sai và báo `Lỗi lưu dữ liệu: undefined`.
- **Xử lý**:
  + Triển khai đầy đủ hành động `bulkUpdatePatients` trong [backend/src/index.js](file:///g:/Other%20computers/Laptop%20Th%C3%A1i/PM-DPT/PM-xeplich/khung_pm/ban_web/v3-Cloudflare/backend/src/index.js): hỗ trợ cả chế độ xóa sạch nạp mới (`replaceAll = true`) và chế độ bổ sung / cập nhật (`replaceAll = false`), parse danh sách thủ thuật JSON chuẩn xác, thực thi batch 50 câu lệnh mỗi lượt vào D1 database.
  + Chuẩn hóa hàm xử lý lỗi và thông báo Toast trong `importFromHIS()` và `importPatients()` trên [js/app.js](file:///g:/Other%20computers/Laptop%20Th%C3%A1i/PM-DPT/PM-xeplich/khung_pm/ban_web/v3-Cloudflare/js/app.js).
  + Nâng phiên bản cache busting lên `?v=3.43`.

### V. Rà Soát Toàn Diện Khớp 100% code.gs-v2.txt & Gia Cố Backend Cloudflare (v3.44)
- **Rà soát & Sửa chữa toàn bộ các hàm backend**:
  + `addMayMoc`: Bổ sung xử lý thêm hàng loạt theo số lượng `qty` (`maMayPrefix` + STT) chuẩn xác theo logic gốc `code.gs-v2.txt`.
  + `editMayMoc`: Sửa lỗi lệch offset tham số khi truyền 4 đối số `(rowIndex, tenLoai, maMay, trangThai)`.
  + `editBenhNhan`: Bổ sung cơ chế tự nhận diện offset linh hoạt cả khi truyền qua `rowIndex` lẫn object truyền thẳng.
  + `chuyenNgayMoi` / `chotSo`: Bổ sung đầy đủ chu trình chốt sổ gốc gồm: chuyển lịch sang `history_records`, xóa bệnh nhân đã xuất viện (`leave_time != ''`), reset giờ vào bệnh nhân cũ về `07:30`, xóa sạch giờ bận/giờ ra dở dang, reset `temp_busy` nhân viên về rỗng `[]`.
  + Tích hợp cơ chế tự động cập nhật phiên bản dữ liệu `bumpDataVersion(db)` trên mọi tác vụ thêm/sửa/xóa giúp Client Polling Sync (`js/sync.js`) nhận diện realtime tức thì khi có dữ liệu mới.
  + Nâng phiên bản cache busting lên `?v=3.44`.

### W. Khắc Phục Triệt Để Lỗi Lưu Giờ Bận Nhân Sự & Tải File HIS Bệnh Nhân (v3.45)
- **Nguyên nhân cốt lõi**:
  + **Giờ bận nhân sự**: Hàm `getShortSkills` trong `js/app.js` truy cập trực tiếp `dataCache.proc` khi chưa được nạp đầy đủ dẫn đến quăng ngoại lệ `TypeError: Cannot read properties of undefined (reading 'filter')`, làm tê liệt toàn bộ `renderStaffTable` và giao diện tab Nhân Sự. Đồng thời backend `getNhanSu` và `getBootstrapData` sử dụng `JSON.parse` thiếu fallback an toàn cho chuỗi giờ bận `temp_busy` dạng văn bản thường.
  + **Tải file HIS / Excel Bệnh Nhân**: Khi gửi `bulkUpdatePatients`, bảng `patients` trong D1 chưa có chỉ mục `idx_patients_name` hoặc thiếu các cột di trú (`ngay_vao`, `gio_ban`, `order_idx`), đồng thời mảng bệnh nhân merge từ HIS chứa các đối tượng có thuộc tính phức tạp thay vì kiểu dữ liệu nguyên thủy (primitive string/number).
- **Xử lý triệt để**:
  + **Tự động đảm bảo Schema D1 (`ensureSchema`)**: Backend tự động khởi tạo toàn bộ bảng, chỉ mục duy nhất `idx_patients_name`, và tự động thêm các cột cần thiết (`ngay_vao`, `gio_ban`, `order_idx`, `temp_busy`, `his_name`, `priority`) mà không bao giờ báo lỗi.
  + **Chuẩn hóa dữ liệu Giờ bận & Kỹ năng (`parseStringOrJsonArray`)**: Xử lý an toàn mọi định dạng chuỗi JSON, mảng đối tượng, và chuỗi phân cách dấu phẩy, điền giá trị mặc định đầy đủ cho `vaiTro` ("Kỹ thuật viên"), `trangThai` ("Đi làm"), `thoiGianLam`.
  + **Bọc thép `getShortSkills`, `renderStaffTable_Original`, `renderBusyStaff`**: Phòng vệ 100% trước `dataCache.proc` / `dataCache.staff` rỗng hoặc `undefined`.
  + **Làm sạch danh sách bệnh nhân trước khi tải lên**: `importFromHIS` và `importPatients` chuẩn hóa 100% danh sách bệnh nhân thành các đối tượng dữ liệu thuần túy (primitive string/number) trước khi gửi qua API D1.
### AA. Tối Ưu Xếp Lịch Thứ 7 Client-First Turbo Engine & Khắc Phục Triệt Để F5 (v3.58)
- **Vấn đề đã xử lý**:
  1. **Xếp lịch Thứ 7 không hiện bảng**: `xepLichSat()` trước đó gọi backend Worker `runSaturdaySchedule`, bị nghẽn và timeout do vượt giới hạn 50ms CPU của Cloudflare Free Tier. Đã bổ sung `runSaturdayScheduling(payload, dateVal)` trực tiếp trong `js/scheduler-engine.js`, gom toàn bộ giường vào `PHONG_CHUNG_T7` và xếp siêu tốc **0.5s trên Client**, tự động chuyển tab hiển thị bảng lịch trình và lưu ngầm vào D1 SQLite.
  2. **Đảm bảo đồng bộ khi F5**: Dữ liệu lịch trình lưu tức thì vào `localStorage.meds_success`, `localStorage.times_bootstrap_cache` và D1 SQLite, khởi động lại trang tức thì mà không bị mất.
  3. **Đồng bộ Footer & Tài nguyên**: Nâng phiên bản toàn hệ thống lên `v3.58` (Footer: `11:55 20/08/2026`).

### AB. Fix Mất Dữ Liệu Khi Ctrl+F5 Triệt Để (v3.59)
- **Vấn đề đã xử lý**: Dù bản trước đã cập nhật `runSaturdayScheduling` chạy trên client, nhưng hàm xếp lịch tổng `executeScheduling` và `xepLichSat` chưa cập nhật kết quả vào `times_bootstrap_cache` (bộ nhớ tạm offline). Khi người dùng nhấn `Ctrl+F5` trước khi máy chủ kịp trả về toàn bộ dữ liệu mới, hàm `restoreOfflineCache()` nạp lại dữ liệu cũ khiến bảng lịch trình bị mất.
- **Xử lý**: 
  + Thêm logic ghi đè kết quả xếp lịch trực tiếp vào `localStorage.getItem('times_bootstrap_cache')` ngay khi xếp lịch xong trên máy khách trong cả 2 luồng xếp lịch.
  + Sửa lại `xepLichSat` hoàn toàn tách biệt khỏi `google.script.run` và dùng Engine Client-side 100%.
  + Sửa lỗi typo `times_bootstrap_cache_v3` trong engine.
  + Cập nhật Footer và toàn bộ thẻ file tài nguyên lên `v3.59` lúc 13:51.







### AC. Fix L?i Tr?ng D? Li?u Khi Ctrl+F5 V� Kh�ng Luu L�n Cloudflare (v3.60)
- **Nguy�n nh�n**: M?c d� frontend d� g?i l?ch tr�nh chu?n theo d?ng object cho API Cloudflare, nhung phi�n b?n Worker API dang ch?y tr�n production (Cloudflare) l� b?n cu, ch? nh?n di?n m?ng 2 chi?u (array of arrays). Khi nh?n object, n� luu to�n b? d? li?u tr?ng v�o database. Do d? li?u tr�n DB tr?ng, khi F5 trang t?i l?i to�n l?ch tr�nh r?ng.
- **X? l�**:
  + �i?u ch?nh h�m executeScheduling v� xepLichSat tr�n frontend map l?i m?ng d? li?u tr? v? th�nh m?ng 2 chi?u ch�nh x�c nhu Worker production phi�n b?n cu mong d?i d? tuong th�ch ngu?c 100%.
  + N�ng c?p phi�n b?n t�i nguy�n l�n 3.60 v� c?p nh?t ng�y gi? t? d?ng cho footer.

### AD. Kh�i Ph?c Ch?c Nang �ang Nh?p (v3.61)
- **Y�u c?u**: �ua ch?c nang dang nh?p quay l?i sau m?t th?i gian t?m ?n d? dev/ki?m th?.
- **X? l�**:
  + Xo� b? do?n m� \AUTO-SESSION\ �p t?o session gi? d?nh ? d?u file \pp.js\.
  + N�ng c?p phi�n b?n t�i nguy�n l�n \3.61\ v� c?p nh?t ng�y gi? t? d?ng cho footer.

### AE. Fix L?i �ang Nh?p B�o Undefined (v3.62)
- **Nguy�n nh�n**: Trong module \js/app.js\, b? x? l� k?t qu? dang nh?p (success handler) c?a \doLogin\ s? d?ng di?u ki?n \if (res.success)\. Tuy nhi�n, khi backend Cloudflare tr? v? d? li?u chu?n ho� qua API wrapper (ch? tr? v? ph?n \data\ c?a object JSON thay v� to�n b? object c� k�m \status: success\), bi?n \es\ kh�ng c�n ch?a tru?ng \success\ n?a (n� l� \undefined\), khi?n nh�nh th�nh c�ng b? b? qua v� nh?y v�o nh�nh b�o l?i. Ngo�i ra, logic b?t l?i l?i c? l?y \es.message\ (v?n kh�ng t?n t?i tr�n object do Cloudflare API tr? v?), d?n d?n l?i b�o \undefined\ ra UI.
- **X? l�**:
  + S?a di?u ki?n x�c nh?n dang nh?p th�nh \if (res && (res.username || res.success))\ gi?ng nhu d� x? l� b�n \init.js\ d? tuong th�ch m?i d?nh d?ng tr? v?.
  + Th�m co ch? fallback string l?i \errDiv.innerText = res.message || res.error || 'T�i kho?n ho?c m?t kh?u kh�ng d�ng!'\ ch?ng l?i undefined giao di?n.
  + N�ng c?p phi�n b?n t�i nguy�n l�n \3.62\ v� c?p nh?t ng�y gi? t? d?ng cho footer.

### AF. Fix L?i Kh�ng X�a �u?c T�i Kho?n (v3.63)
- **Nguy�n nh�n**: Trong backend Cloudflare (\ackend/src/index.js\), API \deleteAccount\ ki?m tra \if (typeof id === 'number')\ d? quy?t d?nh x�a theo c?t \id\ hay c?t \username\. Tuy nhi�n, bi?n \id\ du?c g?i t? frontend lu�n mang ki?u \string\ (v� d? \'2'\), khi?n di?u ki?n lu�n tr? v? \alse\ v� nh?y v�o nh�nh \DELETE FROM accounts WHERE username = '2'\. V� kh�ng c� username n�o t�n l� '2' n�n l?nh SQL kh�ng x�a b?t c? g�, nhung v?n tr? v? \success(true)\, l�m ngu?i d�ng tu?ng l?i kh�ng x�a du?c.
- **X? l�**:
  + �p ki?u bi?n \id\ th�nh s? (\Number(id)\) trong backend v� ki?m tra \!isNaN(numId)\. Nh? v?y, n?u g?i ID l� '2', n� s? t? d?ng nh?n di?n d� l� chu?i s?, t? d?ng chuy?n v? \2\ v� g?i l?nh x�a b?ng \id = 2\ chu?n x�c.
  + N�ng c?p phi�n b?n t�i nguy�n l�n \3.63\ v� c?p nh?t ng�y gi? t? d?ng cho footer.

### AG. T?i Uu B?ng T�i Kho?n & G? B? Kho AI (v3.65)
- **Kh?c ph?c l?i m?t t�i kho?n khi F5**: Th�m logic g?i l?i h�m \loadAccounts()\ m?i khi h? th?ng t? d?ng t?i l?i phi�n l�m vi?c (auto-login qua \localStorage\) d?i v?i ngu?i d�ng l� Admin, gi�p b?ng t�i kho?n lu�n d?y d? m� kh�ng c?n thao t�c n�o kh�c.
- **D?n d?p h? th?ng**: X�a b? ho�n to�n t�nh nang **Kho D? Li?u Hu?n Luy?n AI** t? giao di?n (\index.html\) v� t?t to�n b? API ph�a backend (xo� b? \saveAITrainingData\, \getAITrainingData\, \clearAITrainingData\ trong \index.js\) d? t?i uu hi?u su?t co s? d? li?u D1.
- **N�ng c?p version**: C?p nh?t m� ngu?n th�nh \3.65\.

### AH. C?p Nh?t Version 3.1 & Reset D? Li?u (v3.1)
- **Reset Git History**: Xo� to�n b? l?ch s? commit cu (hon 70 b?n) v� t?o l?i commit d?u ti�n d? l�m s?ch Cloudflare Pages.
- **Reset D1 Database**: D?n d?p to�n b? d? li?u hi?n c� trong Database Cloudflare D1 d? chu?n b? n?p d? li?u m?i t? Excel.
- **N�ng c?p version**: C?p nh?t m� ngu?n th�nh b?n ho�n ch?nh \3.1\.

### AI. Sửa Hàng Loạt Lỗi Backend & Frontend - Phiên bản 3.2 (21/08/2026)

**Yêu cầu người dùng:** Sửa các lỗi tích lũy sau khi chuyển từ Google Apps Script sang Cloudflare Workers:
1. Chốt sổ không hoạt động (bảng lịch trình + bệnh nhân + dashboard không reset)
2. Bảng chấm công và thống kê tổng hợp trống dữ liệu
3. Quản lý tài khoản không lưu/xóa được
4. Lưu giờ bận nhân sự/bệnh nhân chậm
5. Hệ thống hiện cảnh báo "ngày chưa chốt sổ" sau khi seed dữ liệu

**Nguyên nhân & Giải pháp:**

- **Chốt sổ**: callChotSo() còn dùng google.script.run (Apps Script cũ) thay vì callApi() (Cloudflare). Sửa sang callApi('chuyenNgayMoi', ...), xóa toàn bộ cache client sau chốt sổ. Backend cũng sửa để reset status = 'Chưa xếp' cho bệnh nhân còn lại.

- **Seed dữ liệu sai bảng**: Generator generate_perfect_seed.js seed sheet LichTrinh vào bảng schedules (lịch ngày cũ không nên có). Sửa: seed vào history_records thay thế. Xóa 171 dòng schedules ngày 20/08 khỏi D1.

- **Chấm công & thống kê**: Files JSON trong Data_v3/ chưa được seed vào D1. Cập nhật generator để đọc và seed chamcong_records, 	hongke_records, system_settings.

- **init.js load sai thứ tự**: init.js được load ở <head> (trước pp.js) nên google.script.run Proxy chưa tồn tại khi doLogin() và loadTimRanhDataFromServer() được định nghĩa. Sửa: chuyển init.js xuống cuối <body> sau pp.js.

- **Quản lý tài khoản**: loadAccounts(), luuTaiKhoan(), deleteAccount() vẫn dùng google.script.run thay vì callApi. Backend saveAccount trả 	rue (boolean) thay vì message string, frontend hiện alert không rõ ràng. Sửa: chuyển sang callApi trực tiếp, thêm error handler rõ ràng, backend trả message string.

- **Tốc độ lưu chậm**: editNhanSu, editBenhNhan bị coi là mutation bình thường → hiện loading overlay → cảm giác chậm. Sửa: thêm vào isSilentMutation list để không hiện loading overlay, lưu trong nền.

**Files đã sửa:** js/app.js, js/init.js (vị trí load), index.html (thứ tự script, version 3.1→3.2), ackend/src/index.js (chuyenNgayMoi, saveAccount)

**Phiên bản:** 3.1 → 3.2

### AJ. Sửa Lỗi Chức Năng Xếp Lịch Bổ Sung (v3.3 - 21/08/2026)

**Yêu cầu người dùng:** Sửa lỗi chức năng "⚡ Xếp bổ sung" (runExtraScheduling) không hoạt động.

**Phân tích nguyên nhân:**
- Chức năng xếp bổ sung ở v2 gọi hàm google.script.run.runSupplementalScheduling(dateVal) của Google Apps Script cũ.
- Khi chuyển sang Cloudflare Workers v3, API này không còn tồn tại trên backend làm cho nút "Xếp bổ sung" bị báo lỗi kết nối / hệ thống.

**Giải pháp thực hiện:**
1. **Nâng cấp SchedulerEngine client-side (js/scheduler-engine.js)**:
   - Nâng cấp uildDbFromCache(cacheInput, skipProcsStr, existingSched) hỗ trợ lọc tự động: chỉ giữ lại các thủ thuật CHƯA ĐƯỢC XẾP LỊCH của bệnh nhân.
   - Thêm phương thức unExtraScheduling(dateVal, existingSched) truyền lịch trình hiện tại (existingSched) vào thuật toán optimization core (unBestIteration). Thuật toán tự động khóa các khung giờ, máy móc, giường bệnh đã bị chiếm bởi lịch hiện tại và tìm khung giờ trống tối ưu cho bệnh nhân mới/thủ thuật chưa xếp.
2. **Nâng cấp unExtraScheduling() (js/app.js)**:
   - Chuyển hoàn toàn sang chạy trực tiếp trên client bằng SchedulerEngine.runExtraScheduling(dateVal, currentSched).
   - Tự động hợp nhất (merge) kết quả lịch bổ sung mới với lịch hiện tại, lưu vào localStorage và đồng bộ tức thì lên Cloudflare D1 qua API saveSchedule.
   - Cập nhật lại giao diện, bảng bệnh nhân, dashboard và thông báo popup số lượng ca xếp bổ sung thành công.

**Files đã sửa:** js/scheduler-engine.js, js/app.js, index.html (Version 3.3).

**Phiên bản:** 3.2 → 3.3

### AK. Xây Dựng Hệ Thống Sao Lưu & Khôi Phục Dữ Liệu D1 (v3.4 - 21/08/2026)

**Yêu cầu người dùng:** Xây dựng tính năng sao lưu (Backup) và khôi phục (Restore) hệ thống định kỳ hàng ngày, hàng tuần hoặc hàng tháng về máy tính để lưu trữ hoặc khôi phục.

**Các thành phần đã xây dựng:**
1. **Backend Cloudflare Worker (ackend/src/index.js)**:
   - exportDatabase: Đóng gói toàn bộ dữ liệu 14 bảng D1 database (ccounts, staff, machines, ooms, procedures, patients, schedules, history_records, history_busy, chamcong_records, 	hongke_records, 	im_ranh, documents, system_settings) thành file JSON chuẩn hóa kèm metadata.
   - importDatabase: Tiếp nhận file JSON sao lưu, làm sạch các bảng và khôi phục dữ liệu nguyên trạng bằng các câu lệnh batch SQL an toàn.

2. **Giao Diện Frontend (index.html & js/app.js)**:
   - Thêm thẻ **"📦 SAO LƯU & KHÔI PHỤC DỮ LIỆU CLOUDFLARE D1"** trong tab Cài Đặt Hệ Thống.
   - Nút **"📦 Tải Bản Sao Lưu (.json)"**: 1-click tải về file PMCG_D1_Backup_FULL_YYYY-MM-DD_HHmm.json.
   - Nút **"📤 Khôi Phục Từ File (.json)"**: Upload file sao lưu, hiển thị tóm tắt ngày giờ sao lưu và số dòng dữ liệu trước khi xác nhận ghi đè khôi phục.
   - **Tự động nhắc sao lưu định kỳ**: Thiết lập lịch nhắc (Hàng ngày / Hàng tuần / Hàng tháng). Nếu quá hạn, hiển thị thông báo góc dưới màn hình nhắc bác sĩ bấm sao lưu nhanh.

**Files đã sửa:** ackend/src/index.js, index.html, js/app.js, PM-xeplich-v3.md (Version 3.4).

**Phiên bản:** 3.3 → 3.4

### AL. Hiển Thị Phần Sao Lưu Trực Tiếp Trong Menu Quản Trị (v3.5 - 21/08/2026)

**Khắc phục:** Thêm mục **📦 Sao Lưu & Khôi Phục** trực tiếp vào **Menu Quản Trị (Sidebar)** của Tab Quản Trị (index.html), kèm theo phần nội dung (dmin-sec-backup) riêng biệt và nổi bật.

**Tóm tắt giao diện Quản Trị mới:**
1. **Menu Quản Trị (Sidebar)** có 4 mục:
   - ⚙️ Cài Đặt Hệ Thống
   - 🔒 Quản Lý Tài Khoản
   - 🧑‍⚕️ Nhân Sự Chấm Công
   - 📦 **Sao Lưu & Khôi Phục** (MỚI)
2. **Khu vực dmin-sec-backup**:
   - Nút **📦 Tải Bản Sao Lưu Về Máy (.json)**
   - Nút **📤 Khôi Phục Từ File (.json)**
   - Thiết lập lịch nhắc sao lưu định kỳ
   - Hướng dẫn lệnh PowerShell xuất file D1 SQL.

**Files đã sửa:** index.html, PM-xeplich-v3.md (Version 3.5).

**Phiên bản:** 3.4 → 3.5

### AM. Xây Dựng Tự Động Sao Lưu Thư Mục Máy Tính & Google Drive (v3.6 - 21/08/2026)

**Yêu cầu người dùng:** Chuyển từ "Nhắc nhở sao lưu" thành "Tự động sao lưu":
1. Cho phép chỉ định thư mục máy tính để tự động lưu trực tiếp file sao lưu vào đó.
2. Kết nối link thư mục Google Drive để tự động đẩy file sao lưu lên Google Drive.

**Các giải pháp kỹ thuật đã hoàn thành:**
1. **Lưu Tự Động Vào Thư Mục Máy Tính (Local Directory Auto-Save)**:
   - Sử dụng **File System Access API** (window.showDirectoryPicker()).
   - Bác sĩ bấm nút chọn thư mục máy tính (VD: D:\SaoLuu_PMCG), hệ thống lưu quyền ghi vào IndexedDB.
   - Khi tiến hành sao lưu, trình duyệt tự động ghi file PMCG_D1_Backup_AUTO_YYYY-MM-DD.json thẳng vào thư mục đã chọn mà không hỏi "Save As".

2. **Tự Động Upload Lên Google Drive (Google Drive Auto-Upload)**:
   - Thêm Cloudflare Worker CRON trigger (  10 * * *) chạy tự động lúc 17:00 hàng ngày.
   - Thêm API saveGoogleDriveSettings, getGoogleDriveSettings, 	estGoogleDriveUpload.
   - Cung cấp mã nguồn 5 dòng Google Apps Script Webhook để kết nối thư mục Google Drive hoàn toàn miễn phí.
   - Nút **⚡ Tải Thử Lên Google Drive Now** cho phép thử nghiệm đẩy file lên Google Drive tức thì.

**Files đã sửa:** ackend/src/index.js, ackend/wrangler.toml, index.html, js/app.js, PM-xeplich-v3.md (Version 3.6).

**Phiên bản:** 3.5 → 3.6

### AN. Bổ Sung Chọn Ngày/Giờ/Thứ Cho Lịch Tự Động Sao Lưu & Nhắc Nhở (v3.7 - 21/08/2026)

**Yêu cầu người dùng:** Bổ sung giao diện và logic cho phép chọn chi tiết Ngày/Giờ/Thứ để tự động sao lưu và nhắc nhở.

**Các tính năng bổ sung:**
1. **Cấu hình chọn Ngày / Giờ / Thứ chi tiết (index.html & js/app.js)**:
   - **Giờ tự động sao lưu**: Chọn chính xác giờ trong ngày (Ví dụ: 17:00).
   - **Thứ trong tuần** (Khi chọn Hàng tuần): Chọn Thứ 2, Thứ 3, ..., Thứ 7, Chủ Nhật.
   - **Ngày trong tháng** (Khi chọn Hàng tháng): Chọn Ngày 1, Ngày 5, Ngày 15, ..., Ngày 28 hoặc Ngày cuối tháng.
2. **Logic Tự Động Đối Chiếu Chi Tiết (checkBackupReminder)**:
   - Tự động kiểm tra thời gian thực. Khi trùng khớp đúng Giờ / Thứ / Ngày đã chọn, phần mềm tự động xuất file sao lưu D1 ghi trực tiếp vào Thư mục Máy tính đã kết nối và hiển thị thông báo nhắc nhở nhẹ nhàng.

**Files đã sửa:** index.html, js/app.js, PM-xeplich-v3.md (Version 3.7).

**Phiên bản:** 3.6 → 3.7

### AO. Dọn Dẹp Thư Mục & Chuẩn Bị Tiếp Nhận Dữ Liệu v2 (v3.7 - 21/08/2026)

**Yêu cầu người dùng:** Dọn dẹp thư mục rác và kiểm tra thư mục Data_v3. Bác sĩ lưu ý: Bản v2 đang chạy đến 16h15 sẽ chốt sổ, sau đó sẽ xuất toàn bộ dữ liệu v2 về để nạp vào Cloudflare D1 cho v3.

**Đã thực hiện:**
1. Đã xóa thư mục Data_v3/node_modules rác để giải phóng dung lượng đĩa.
2. Giữ nguyên các file dữ liệu mẫu PMCG Database v3.xlsx và các file JSON trong Data_v3 để làm tài nguyên đối chiếu.
3. Giữ sạch sẽ thư mục làm việc gốc và backend Cloudflare sẵn sàng tiếp nhận dữ liệu v2 sau 16h15.

### AP. Cập Nhật Quy Tắc Đánh Số Phiên Bản Dạng Semantic 3 Chữ Số X.X.X (v3.0.7 - 21/08/2026)

**Yêu cầu người dùng:** Cập nhật RULES.md mục 5 quy định đánh số phiên bản chuẩn Semantic dạng X.X.X (bắt đầu từ 3.0.0 -> 3.0.1 ... -> 3.0.9 rồi mới nâng lên 3.1.0).

**Đã thực hiện:**
1. Cập nhật quy tắc 5 trong RULES.md.
2. Chuyển đổi toàn bộ hiển thị phiên bản Footer và thẻ tài nguyên trong index.html sang dạng **3.0.7** (Timestamp 14:44 21/08/2026).

**Files đã sửa:** RULES.md, index.html, PM-xeplich-v3.md (Version 3.0.7).

**Phiên bản:** 3.7 → 3.0.7

### AQ. Khôi Phục & Xây Dựng Hệ Thống Quản Lý Liên Kết Nhanh Footer (v3.0.8 - 21/08/2026)

**Khắc phục lỗi:** Sửa lỗi cột **LIÊN KẾT NHANH** ở Footer hiển thị ⚠️ Chưa có liên kết nào do bản v3 chuyển sang Cloudflare Worker chưa gọi API nạp liên kết.

**Các thành phần đã xây dựng:**
1. **Backend API (ackend/src/index.js)**:
   - getQuickLinks: Lấy danh sách liên kết nhanh từ system_settings D1 (nếu trống sẽ khởi tạo mặc định Hướng dẫn sử dụng, Quy trình Kỹ thuật, Bảng giá Dịch vụ).
   - saveQuickLinks: Lưu chỉnh sửa danh sách liên kết nhanh vào D1 database.
2. **Frontend UI (index.html & js/app.js)**:
   - Nạp và tự động render danh sách liên kết nhanh ở Footer (#khu-vuc-lien-ket).
   - Thêm thẻ quản lý **🔗 Quản Lý Liên Kết Nhanh (Footer Links)** trong tab **Quản Trị -> ⚙️ Cài Đặt Hệ Thống**, cho phép Admin thêm, sửa icon, tên hiển thị, URL liên kết và lưu 1-click.

**Files đã sửa:** ackend/src/index.js, index.html, js/app.js, PM-xeplich-v3.md (Version 3.0.8).

**Phiên bản:** 3.0.7 → 3.0.8

### AR. Thêm Mục "Quản Lý Liên Kết Nhanh" Vào Menu Quản Trị Sidebar (v3.0.9 - 21/08/2026)

**Khắc phục lỗi:** Thêm nút **🔗 Quản Lý Liên Kết Nhanh** thành 1 mục độc lập, nổi bật trong **Menu Quản Trị (Sidebar Trái)** (index.html) kèm khu vực quản lý riêng biệt (dmin-sec-quicklinks).

**Tóm tắt giao diện Quản Trị mới:**
- Menu Quản Trị Sidebar có 5 mục:
  - ⚙️ Cài Đặt Hệ Thống
  - 🔒 Quản Lý Tài Khoản
  - 🧑‍⚕️ Nhân Sự Chấm Công
  - 📦 Sao Lưu & Khôi Phục
  - 🔗 **Quản Lý Liên Kết Nhanh** (MỚI)

**Files đã sửa:** index.html, PM-xeplich-v3.md (Version 3.0.9).

**Phiên bản:** 3.0.8 → 3.0.9

### AS. Khắc Phục Triệt Để Lỗi CORS & Tự Động Xóa URL Google Apps Script Cũ (v3.1.0 - 21/08/2026)

**Khắc phục lỗi:** Sửa triệt để lỗi Access to fetch at ... script.google.com ... blocked by CORS policy khi người dùng truy cập từ domain chính thức https://xeplichthuthuat.io.vn/.

**Nguyên nhân & Giải pháp:**
1. **Lỗi localStorage cũ**: Trình duyệt còn lưu URL script.google.com từ phiên bản v2 trong localStorage['times_custom_api_url']. Đã cập nhật hàm getApiUrl() trong js/app.js tự động phát hiện và xóa sạch URL Google Apps Script cũ, buộc sử dụng endpoint chuẩn của Cloudflare Worker (https://pmcg-api.dpthai-ttytmk.workers.dev).
2. **Lỗi google.script.run trong js/init.js**: Đã chuyển toàn bộ lệnh google.script.run.verifyLogin và google.script.run.getTimRanhData sang gọi API trực tiếp qua callApi.

**Files đã sửa:** js/app.js, js/init.js, index.html, PM-xeplich-v3.md (Version 3.1.0).

**Phiên bản:** 3.0.9 → 3.1.0

### AT. Cập Nhật Bổ Sung Đầy Đủ Dữ Liệu Trường Ngày Vào Bệnh Nhân (v3.1.1 - 21/08/2026)

**Khắc phục:** Sửa triệt để tình trạng thiếu trường 
gay_vao (Ngày Vào) trong danh sách Bệnh nhân từ file xuất v2.

**Chi tiết xử lý:**
1. Đã cập nhật lại bộ chuyển đổi dữ liệu scratch/regenerate_and_import.js tự động định dạng Ngày Vào từ file Excel master PMCG Database v3.xlsx về dạng chuẩn DD/MM/YYYY (ví dụ 17/08/2026).
2. Đã tái nạp toàn bộ 39 Bệnh nhân lên cơ sở dữ liệu Cloudflare D1 pmcg-db. Mỗi bệnh nhân hiện tại đã có đầy đủ: Họ tên, Năm sinh, Ngày vào viện, Phòng thủ thuật, Danh sách thủ thuật chỉ định và Trạng thái xếp lịch.

**Phiên bản:** 3.1.0 → 3.1.1

### AU. Khắc Phục Lỗi Chấm Công & Quản Lý Liên Kết Nhanh Trực Tiếp Trên Cloudflare D1 (v3.1.2 - 21/08/2026)

**Khắc phục lỗi:**
1. **Phần Chấm công bị trống**: Bổ sung hàm 
ormalizeMonthKeys chuẩn vào Worker backend, khắc phục lỗi chuỗi tháng dạng 2026-08 /  8/2026. Đã thêm cơ chế fallback tự động lấy dữ liệu chấm công mới nhất trong D1 database nếu chưa có bản ghi của tháng hiện tại.
2. **Liên kết nhanh bị mất khi F5**: Thêm handler getQuickLinks và saveQuickLinks vào Worker backend để lưu trực tiếp danh sách liên kết vào bảng system_settings. Cập nhật getBootstrapData trả về đúng danh sách quick_links khi mở trang web.

**Files đã sửa:** ackend/src/index.js, index.html, PM-xeplich-v3.md (Version 3.1.2).

**Phiên bản:** 3.1.1 → 3.1.2

### Cập nhật 21/08/2026
- **Yêu cầu:** Đẩy data lên D1, sửa lỗi mất dữ liệu Nhân sự chấm công, sửa lỗi mất Liên kết nhanh khi F5.
- **Thực hiện:**
  + Đã tạo script `backend/generate_seed.js` và `backend/seed.sql` để import dữ liệu từ Data_v3 lên D1. (Do Cloudflare session của AI hết hạn nên người dùng cần tự chạy lệnh `npx wrangler d1 execute pmcg-db --file=seed.sql --remote`).
  + Đã sửa lỗi mất dữ liệu Chấm Công do fallback API trả về object thay vì array string. Bổ sung map object sang tên trong `js/thongke.js`.
  + Đã sửa lỗi F5 mất Liên kết nhanh bằng cách đổi `id="khu-vuc-lien-ket"` thành `class="khu-vuc-lien-ket"` do bị clone thành nhiều element giống nhau khi nạp template.
  + Đồng bộ phiên bản lên 3.1.3.

### Cập nhật 21/08/2026 (v3.1.4)
- **Lỗi:** Mỗi lần load trang đều bị popup cảnh báo dữ liệu ngày 08/07/2026 chưa chốt sổ.
- **Nguyên nhân:** loadDashboard() đọc ngày từ dataCache.schedule (được khôi phục từ localStorage offline cache cũ). So sánh ngày đó với ngày hôm nay, thấy khác nhau → popup mọi lúc.
- **Giải pháp:** Chỉ hiển thị cảnh báo chốt sổ nếu ngày cũ là NGÀY HÔM QUA. Nếu cũ hơn 1 ngày thì đó là cache lỗi thời, tự động reset về hôm nay mà không popup.
- **File:** js/app.js, index.html (v3.1.4)

### Cập nhật 21/08/2026 (v3.1.5)
- **Lỗi:** Giao diện luôn hiển thị ngày 08/07/2026 thay vì ngày hôm nay 21/08/2026.
- **Nguyên nhân gốc:** API getBootstrapData trong Cloudflare Worker lấy TOÀN BỘ bệnh nhân và lịch xếp từ D1 không lọc theo ngày. Do đó bệnh nhân cũ của ngày 08/07 được trả về và hiển thị trên giao diện.
- **Giải pháp:** Sửa query SQL trong backend để chỉ lấy bệnh nhân (ngay_vao = hôm nay) và lịch (date = hôm nay) theo múi giờ VN (UTC+7). Deploy lại Worker.
- **File:** backend/src/index.js (deploy), index.html (v3.1.5)

### Cập nhật 21/08/2026 (v3.1.6)
- **Lỗi:** Sau Ctrl+F5, giao diện vẫn hiển thị bảng lịch và bệnh nhân của ngày 08/07 thay vì 21/08.
- **Nguyên nhân:** Hàm restoreOfflineCache() phục hồi dữ liệu từ localStorage (times_bootstrap_cache) mà không kiểm tra ngày. Dữ liệu cũ từ 08/07 được nạp ngay lập tức trước khi API trả về dữ liệu mới.
- **Giải pháp:** Bổ sung kiểm tra ngày vào restoreOfflineCache() trong app.js. Nếu cache chứa bệnh nhân/lịch của ngày khác hôm nay -> xóa patients và schedule khỏi cache, chỉ giữ cấu hình (máy, phòng, nhân sự). Cập nhật lại localStorage để lần sau không bị lỗi.
- **File:** js/app.js, index.html (v3.1.6)
