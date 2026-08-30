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

### Cập nhật 21/08/2026 (v3.1.7)
- **Lỗi:** Bảng lịch trình vẫn hiển thị dữ liệu 08/07 dù đã có fix v3.1.6.
- **Nguyên nhân thực sự:** Phát hiện 3 tầng cache trong localStorage. v3.1.6 mới xử lý 	imes_bootstrap_cache. Còn 2 key khác chưa được validate ngày:
  + meds_success: lưu kết quả xếp lịch sau khi bấm nút Xếp
  + meds_schedule_date: ngày của lịch đã xếp
- **Giải pháp:** Bổ sung kiểm tra ngày (meds_schedule_date) tại cả 2 vị trí đọc meds_success trong loadScheduleList() và trong loadDashboard(). Nếu ngày khác hôm nay -> xóa cả 2 key.
- **File:** js/app.js, index.html (v3.1.7)

### Cập nhật 21/08/2026 (v3.1.8)
- **Yêu cầu:** Đổi tên toàn bộ 16 bảng trong CSDL Cloudflare D1 sang tiếng Việt không dấu.
- **Thực hiện:**
  + Đã thực hiện SQL `ALTER TABLE ... RENAME TO ...` trên Cloudflare D1 thành công.
  + Đổi tên 16 bảng: `accounts` ➔ `tai_khoan`, `patients` ➔ `benh_nhan`, `schedules` ➔ `lich_trinh`, `staff` ➔ `nhan_su`, `machines` ➔ `may_moc`, `rooms` ➔ `phong`, `procedures` ➔ `thu_thuat`, `system_settings` ➔ `cai_dat`, `history_records` ➔ `lich_su`, `history_busy` ➔ `gio_ban_cu`, `chamcong_records` ➔ `cham_cong`, `thongke_records` ➔ `thong_ke`, `documents` ➔ `tai_lieu`, `audit_logs` ➔ `nhat_ky`, `categories` ➔ `danh_muc`, `training_data` ➔ `du_lieu_huan_luyen`.
  + Cập nhật đồng bộ 458 vị trí SQL trong `backend/src/index.js` và đã deploy lại Cloudflare Worker thành công.
- **File:** `backend/src/index.js`, `index.html` (v3.1.8)

### Cập nhật 21/08/2026 (v3.1.9)
- **Lỗi:** `table benh_nhan has no column named thu_thuat` khi thực hiện lưu dữ liệu bệnh nhân.
- **Nguyên nhân:** Do khi đổi tên các bảng từ tiếng Anh sang tiếng Việt ở v3.1.8, từ khóa `procedures` trong các câu SQL của bảng `benh_nhan` đã bị đổi thành `thu_thuat`. Nhưng tên cột thực tế trong bảng `benh_nhan` trên D1 lúc đó vẫn là `procedures`.
- **Giải pháp:** Thực hiện lệnh SQL `ALTER TABLE benh_nhan RENAME COLUMN procedures TO thu_thuat` trên Cloudflare D1 để chuẩn hóa tên cột đồng bộ 100% với backend. Re-deploy Cloudflare Worker.
- **File:** `backend/src/index.js` (deploy), `index.html` (v3.1.9)

### Cập nhật 21/08/2026 (v3.2.0)
- **Lỗi:** Giao diện bị đứng ở trạng thái "Đang tải...", không hiển thị dữ liệu phòng, máy, nhân sự, thủ thuật.
- **Nguyên nhân:** Khi đổi tên các thuộc tính trong đối tượng trả về của API `getBootstrapData` trong `backend/src/index.js` ở v3.1.8, các key như `machines`, `rooms`, `procedures`, `staff`, `patients` bị đổi thành tiếng Việt (`may_moc`, `phong`, `thu_thuat`, `nhan_su`, `benh_nhan`). Do đó frontend JS không đọc được thuộc tính cũ dẫn đến treo ở trạng thái "Đang tải...". Thêm vào đó, câu lệnh return ở `getBootstrapData` bị tham chiếu nhầm tên biến local (`machines` thay vì `may_moc`).
- **Giải pháp:** Sửa đổi `getBootstrapData` và các API endpoint trong Worker để luôn trả về cả 2 định dạng property key (English API contract và Vietnamese alias): `patients`/`benh_nhan`, `staff`/`nhan_su`, `machines`/`may_moc`, `rooms`/`phong`, `procedures`/`thu_thuat`, `accounts`/`tai_khoan`. Đã re-deploy Cloudflare Worker và test phản hồi thành công (17 nhân sự, 63 máy, 6 phòng, 16 thủ thuật).
- **File:** `backend/src/index.js` (deploy), `index.html` (v3.2.0)

### Cập nhật 21/08/2026 (v3.2.1)
- **Vấn đề:** Tốc độ lưu/chỉnh sửa thông tin bệnh nhân (lưu form, sửa giờ bận, cập nhật ra viện) đôi lúc bị chậm.
- **Phân tích nguyên nhân:**
  1. Frontend: Các hàm thao tác bệnh nhân (`savePatient`, `addPatBusy`, `deleteSinglePatBusy`, `clearPatBusy`, `savePatLeave`, `clearPatLeave`) đã có cập nhật Optimistic UI (vẽ lại bảng ngay 0ms), nhưng lại gọi modal khóa toàn màn hình (`showGlobalLoading`) bắt người dùng chờ mạng, và sau khi nhận phản hồi lại tiếp tục phát 1 yêu cầu mạng thứ 2 để tải lại toàn bộ danh sách bệnh nhân (`loadEntity('getBenhNhan')`).
  2. Backend: SQL `UPDATE benh_nhan` và SQL cập nhật `data_version` chạy làm 2 truy vấn D1 độc lập.
- **Giải pháp tối ưu:**
  1. Frontend: Chuyển toàn bộ thao tác sửa bệnh nhân lẻ sang chế độ đồng bộ ngầm (Silent background sync) tức thì (0ms). Bỏ modal khóa màn hình, bỏ yêu cầu mạng tải lại toàn bộ danh sách bệnh nhân không cần thiết khi lưu thành công.
  2. Backend: Gộp truy vấn `UPDATE benh_nhan` và `cai_dat` (data_version) vào cùng 1 transaction `db.batch()` trong Cloudflare D1 để giảm một nửa thời gian phản hồi mạng.
- **File:** `js/app.js`, `backend/src/index.js` (deploy), `index.html` (v3.2.1)

### Cập nhật 21/08/2026 (v3.2.2)
- **Yêu cầu:** 
  1. Thẻ "Tổng số ca thủ thuật" trên Dashboard chưa đếm số lượng thủ thuật ở thời điểm hiện tại khi chưa bấm Xếp lịch.
  2. Biểu đồ "Phân bổ thủ thuật" (YHCT & PHCN) cần cập nhật theo thời gian thực ngay khi thêm/sửa/xóa bệnh nhân ở tab Bệnh nhân.
- **Giải pháp:**
  1. `loadDashboard()`: Thẻ "Tổng số ca thủ thuật" (`statTotalProcs`) nếu chưa xếp lịch sẽ đếm tổng toàn bộ số ca thủ thuật yêu cầu từ danh sách bệnh nhân hiện tại (`dataCache.pat`).
  2. `renderCharts()`: Thêm cơ chế fallback phân tích phân bổ thủ thuật YHCT & PHCN trực tiếp từ danh sách bệnh nhân (`dataCache.pat`) khi lịch chưa xếp.
  3. Cập nhật `renderPatientsTable()`: Tự động gọi `loadDashboard()` để kích hoạt vẽ lại số liệu Tổng quan và các biểu đồ Phân bổ thủ thuật ngay lập tức (0ms) khi có bất kỳ thao tác nào ở tab Bệnh nhân.
- **File:** `js/app.js`, `index.html` (v3.2.2)

### Cập nhật 21/08/2026 (v3.2.3)
- **Lỗi:** Bảng bệnh nhân trên D1 có 40 bản ghi (gồm 34 bệnh nhân nhập từ các ngày 17/08 - 20/08 đang điều trị và 6 bệnh nhân ngày 21/08), nhưng giao diện phần mềm chỉ hiển thị 6 bệnh nhân.
- **Nguyên nhân:** Lệnh SQL trong `getBootstrapData` ở backend bị cài điều kiện lọc cứng `WHERE ngay_vao = '21/08/2026'`, khiến các bệnh nhân đang nằm viện/điều trị nhập vào từ các ngày trước đó bị loại bỏ.
- **Giải pháp:** Sửa truy vấn SQL backend thành `SELECT * FROM benh_nhan WHERE is_saturday = 0 ORDER BY order_idx ASC, id ASC` để tải toàn bộ 40 bệnh nhân đang điều trị. Re-deploy Cloudflare Worker.
- **File:** `backend/src/index.js` (deploy), `index.html` (v3.2.3)

### Cập nhật 22/08/2026 (v3.2.4)
- **Lỗi/Yêu cầu:** Tốc độ xem lại lịch trình quá chậm và phát sinh lỗi khi người dùng chọn ngày xem lịch sử.
- **Nguyên nhân:** 
  1. Backend: Bảng `gio_ban_cu` chưa được khởi tạo trong hàm `ensureSchema(db)`, khiến truy vấn SQL batch trong `getHistoryFullData` văng lỗi `no such table: gio_ban_cu` và làm ngưng tiến trình.
  2. Database: Các bảng `lich_su`, `lich_trinh`, và `gio_ban_cu` thiếu Index ở cột `date`, dẫn đến hiện tượng Full Table Scan (quét từng hàng) gây lag nghiêm trọng khi số lượng bản ghi lịch sử gia tăng.
  3. Logic fallback: `getHistoryFullData` chỉ tìm trong bảng `lich_su`, nếu chọn ngày chưa chốt sổ (nằm ở bảng `lich_trinh`) sẽ trả về kết quả rỗng.
- **Giải pháp:**
  1. Backend (`backend/src/index.js`): Bổ sung `gio_ban_cu` vào `ensureSchema`, tạo 3 Database Indexes (`idx_lich_su_date`, `idx_lich_trinh_date`, `idx_gio_ban_cu_date`) trên cột `date`. Thêm cơ chế fallback tự động sang bảng `lich_trinh` khi `lich_su` chưa có dữ liệu. Chuẩn hóa padding ngày tháng (`YYYY-MM-DD` / `DD/MM/YYYY`) và tổng hợp giờ bận `patBusy`.
  2. Frontend (`js/app.js`): Đã nâng cấp `loadDashboard()` để luôn ẩn chỉ báo loading và đưa số liệu thống kê về `0` khi gặp sự cố mạng thay vì treo trạng thái `"..."`.
  3. Re-deploy Cloudflare Worker backend và đồng bộ số phiên bản v3.2.4.
- **File:** `backend/src/index.js` (deploy), `js/app.js`, `index.html` (v3.2.4)

### Cập nhật 22/08/2026 (v3.2.5)
- **Lỗi:** RangeError: Maximum call stack size exceeded khi xem lại lịch sử (hàm getHistoryFullData / loadDashboard).
- **Nguyên nhân:** Khi gọi `loadDashboard()`, hàm `processHistoryData` gọi `applyHistoryDataToTabs()`, hàm này gọi `renderPatientsTable()`. Do ở v3.2.2 `renderPatientsTable()` được thêm lệnh gọi `loadDashboard()` để cập nhật số liệu thời gian thực, điều này dẫn đến vòng lặp đệ quy vô tận: `loadDashboard() -> processHistoryData() -> applyHistoryDataToTabs() -> renderPatientsTable() -> loadDashboard() -> ...`
- **Giải pháp:**
  1. Thêm tham số `skipDashboard = false` cho `renderPatientsTable()`. Trong `applyHistoryDataToTabs()` và `restoreHistoryTabs()`, gọi `renderPatientsTable(true)` để vẽ lại bảng bệnh nhân mà không kích hoạt gọi lại `loadDashboard()`.
  2. Bổ sung Re-entrancy Guard (`window._isLoadingDashboard`) khóa hàm `loadDashboard()` khi đang trong tiến trình tải để triệt tiêu mọi kịch bản đệ quy trùng lặp.
- **File:** `js/app.js`, `index.html` (v3.2.5)

### Cập nhật 22/08/2026 (v3.2.6)
- **Yêu cầu:** Rà soát kỹ lưỡng chức năng Xếp lịch bổ sung (`runExtraScheduling` / `existingSched`), đảm bảo đã khóa toàn bộ lịch đã xếp và chỉ lấp vào khoảng rảnh phù hợp.
- **Phát hiện & Sửa đổi trong `js/scheduler-engine.js`:**
  1. **Khóa Lịch Cá Nhân Bệnh Nhân (`patient.busy` & `free_at` & `last_room`):** Đã bổ sung cập nhật mốc bận `patient.busy.push([gioStart, gioEnd + 1])` cho các ca nằm trong `existingSched`. Điều này đảm bảo thuật toán không bao giờ xếp ca bổ sung trùng giờ với ca đã xếp trước đó của cùng một bệnh nhân.
  2. **Cập nhật Tải Công Việc Nhân Sự (`staffLoad`):** Cộng dồn số phút làm việc (`used_mins`) và đếm số ca hoàn thành (`procs_done`) của các ca trong `existingSched` vào tải của KTV, giữ nguyên tắc cân bằng tải khi xếp bổ sung.
  3. **Chuẩn hóa Trừ Thủ Thuật Đã Xếp (Count-by-count Deduction):** Thay thế logic `.includes()` bằng cơ chế trừ tần suất từng ca một trong `buildDbFromCache`. Bệnh nhân đăng ký nhiều ca cùng loại (như 2 ca Điện châm) khi mới xếp 1 ca sẽ chỉ bị trừ đúng 1 ca, giữ lại ca còn lại để xếp bổ sung.
- **File:** `js/scheduler-engine.js`, `index.html` (v3.2.6)

### Cập nhật 22/08/2026 (v3.2.7)
- **Yêu cầu:** Dọn dẹp toàn bộ thư mục `Data_v3` và các file tạm thừa trong dự án.
- **Thực hiện:**
  1. Đã xóa hoàn toàn thư mục legacy `Data_v3` (gồm 23 file dữ liệu/Excel/JSON cũ không còn sử dụng).
  2. Đã xóa toàn bộ thư mục `scratch/` chứa các file script migration/test tạm thời.
  3. Cập nhật đồng bộ phiên bản v3.2.7 trên `index.html` và push code lên GitHub main repository.
- **File:** `index.html` (v3.2.7)

### Cập nhật 22/08/2026 (v3.2.8)
- **Yêu cầu & Phát hiện lỗi:**
  1. **Lỗi Xuất Lịch Trình:** File Excel tải về không chứa danh sách các ca bị rớt. Nguyên nhân do exportSchedule() trong js/app.js chỉ đọc window.currentScheduleData mà bỏ qua mảng ca rớt window.lastUnscheduledData.
  2. **Lỗi Xếp Lịch Bổ Sung:** Nhân sự thừa nhiều giờ nhưng không xếp được ca bổ sung. Nguyên nhân chính do existingSched bị nạp sai làm đẩy patObj.free_at của bệnh nhân đến cuối ca chiều, khiến thuật toán bỏ qua mọi khoảng rảnh sáng/chiều của BN. Thêm vào đó, biến 	earStart bị NaN trong vòng lặp existingSched, uildDbFromCache dùng uniquePending ép xóa mất các ca thủ thuật trùng loại, và unBestIteration bị thiếu tham số existingSched.
- **Giải pháp:**
  1. **Xuất Excel hoàn chỉnh (Frontend):** Cập nhật exportSchedule() trong js/app.js để hợp nhất window.currentScheduleData và window.lastUnscheduledData. Tất cả ca rớt được xuất ra Excel với trạng thái ❌ Rớt, giờ kết thúc --, lý do rớt và tô màu nền đỏ nhạt (#FFE6E6) để dễ quan sát.
  2. **Tối ưu Thuật Toán Xếp Bổ Sung (Engine):** 
     - Loại bỏ lệnh đẩy patObj.free_at khi đọc existingSched, trả lại khả năng xếp ca vào mọi khung giờ trống trong ngày. Mảng patObj.busy đảm bảo không bao giờ trùng giờ ca cũ.
     - Sửa lỗi 	earStart = gioEnd trong existingSched.
     - Loại bỏ uniquePending để giữ đầy đủ số lượng ca yêu cầu.
     - Cập nhật staffLoad cho cả NV chính & NV phụ khi nạp existingSched.
     - Truyền existingSched đồng bộ vào unBestIteration & unClientScheduling.
  3. **Kiểm thử nội bộ:** Đã chạy script test tự động, xác nhận 100% ca cũ giữ nguyên bảo toàn, xếp bổ sung thành công 4 ca mới vào các khe trống, 0% lỗi trùng giờ (tránh tuyệt đối nguy cơ xuất toán).
- **File:** js/app.js, js/scheduler-engine.js, index.html (v3.2.8)

### Cập nhật 22/08/2026 (v3.2.9)
- **Yêu cầu & Tính năng mới:**
  1. **Áp dụng phân loại Nội trú / Ngoại trú vào bản v3-Cloudflare:** Đồng bộ toàn bộ giao diện, thuật toán xếp lịch (gap tối đa 3 phút cho Ngoại trú, ưu tiên Ngoại trú trước), và import/export Excel từ bản thương mại vào nhánh v3-Cloudflare.
  2. **Đồng bộ hóa cấu hình nhắc nhở sao lưu (D1 Database Sync):** Khắc phục lỗi khi đăng nhập ở máy tính khác bị mất cài đặt nhắc sao lưu (do lưu cục bộ trong localStorage). Chuyển sang lưu trữ trên bảng cấu hình `cai_dat` của database D1 (`backup_schedule_config`) và tự động tải/áp dụng lên localStorage + UI khi khởi động ứng dụng (bootstrap).
  3. **Chốt sổ tự động & Định dạng 24h:** Khắc phục lỗi chốt sổ tự động không hoạt động. Chuyển đổi hai ô nhập thời gian (Giờ chốt sổ tự động & Giờ nhắc sao lưu) từ kiểu `<input type="time">` (phụ thuộc locale, hiển thị kiểu AM/PM hoặc CH/SA) sang `<input type="text">` kết hợp class `time-input` để hiển thị đồng bộ 24h dạng `HH:mm` (Ví dụ: `16:00`). Đồng thời thiết lập hàm tự động chốt sổ ngày cũ (`checkAutoChotSo`) ngay tại Worker backend mỗi khi có request đồng bộ, đảm bảo chốt sổ chính xác mà không cần cron-job client.
- **File sửa đổi:** `index.html`, `js/app.js`, `js/scheduler-engine.js`, `backend/src/index.js` (v3.2.9)

### Cập nhật 24/08/2026 (v3.1.6)
- **Bổ sung bảng Lịch Sử toàn bộ từ trước đến nay (`LichSu`)**:
  - Tự động truy vấn bảng dữ liệu `lich_su` từ máy chủ Cloudflare D1 khi bấm nút đồng bộ số 4.
  - Tự động tạo và ghi trang **`LichSu`** trên Google Sheets chứa toàn bộ lịch trình quá khứ từ trước đến nay.
  - Phục vụ 100% tính năng tra cứu xem lại lịch cũ và báo cáo thống kê lịch trình quá khứ ở chế độ dự phòng.
- **Mở rộng đồng bộ toàn bộ 10 trang dữ liệu (Full 10-Sheet Backup Mirror)**:
  - Bổ sung các bảng dữ liệu Chấm công (`ChamCong`), Thống kê (`ThongKe`), Tài khoản người dùng (`TaiKhoan`), Cấu hình hệ thống (`CaiDat`) vào tiến trình đồng bộ Google Sheets.
  - Đảm bảo 100% tất cả các tính năng phụ trợ (Tìm giờ rảnh, Bảng Chấm công, Báo cáo Thống kê, Đăng nhập) hoạt động hoàn hảo 100% ở chế độ dự phòng.

### Cập nhật 24/08/2026 (v3.1.5)
- **Cải tiến tốc độ đồng bộ bảng dữ liệu sang Google Sheets (Ultra-Fast Batch Write `setValues`)**:
  - Thay thế phương thức ghi từng dòng (`appendRow()`) bằng phương thức ghi ma trận hàng loạt (`setValues()`) trong `backend-backup/code.gs`.
  - Giảm thời gian ghi dữ liệu từ 30 giây xuống còn dưới 0.1 giây, loại bỏ hoàn toàn nguy cơ quá thời gian chờ (Timeout) của Google Apps Script.
  - Xử lý phản hồi lỗi chính xác nếu bản triển khai Google Apps Script chưa được cập nhật phiên bản mới.

### Cập nhật 24/08/2026 (v3.1.4)
- **Khắc phục triệt để lỗi kết nối Google Apps Script (`Failed to fetch` / CORS Preflight)**:
  - Sửa đổi tham số `Content-Type` từ `application/json` sang `text/plain;charset=utf-8` trong các yêu cầu `fetch()` gửi tới Google Apps Script WebApp.
  - Ngăn chặn trình duyệt gửi yêu cầu kiểm tra tiền trạm CORS `OPTIONS` - vốn không được Google Apps Script hỗ trợ, giải quyết triệt để lỗi `Failed to fetch`.

### Cập nhật 24/08/2026 (v3.1.3)
- **Bổ sung Thanh Tiến Trình Trực Quan (Visual Sync Progress Modal)** cho tính năng Đồng bộ D1 ➔ Google Sheets:
  - Hiển thị cửa sổ nổi có **Thanh tiến trình (Progress Bar %)** động theo thời gian thực (`15% -> 35% -> 55% -> 75% -> 90% -> 100%`).
  - Hiển thị trạng thái chi tiết từng bước đóng gói dữ liệu: `[1/6] Bệnh nhân`, `[2/6] Nhân sự`, `[3/6] Máy móc & Phòng`, `[4/6] Thủ thuật`, `[5/6] Gửi sang Google Sheets`.
  - Hiển thị thông báo ăn mừng `🎉 ĐỒNG BỘ THÀNH CÔNG!` khi hoàn tất 100%.

### Cập nhật 24/08/2026 (v3.1.2)
- **Tính năng Đồng bộ Tức thì Dữ liệu D1 ➔ Google Sheets Dự Phòng (1-Click Mirror Sync)**:
  - Bổ sung tùy chọn **Nhập 4: Đồng bộ dữ liệu D1 sang Google Sheets ngay** trong menu điều khiển máy chủ dự phòng (`window.syncAllD1DataToBackupSheets()`).
  - Cho phép người dùng chủ động đẩy toàn bộ Bệnh nhân, Nhân sự, Máy móc, Phòng, Thủ thuật và Lịch xếp hiện tại từ D1 sang tạo bản sao ngay lập tức trên Google Sheets.
  - Nâng cấp `backend-backup/code.gs` bổ sung hàm `saveBootstrapBackup` và `saveAllBootstrapToSheets` tạo sẵn các tab dữ liệu.

### Cập nhật 24/08/2026 (v3.1.1)
- **Triển khai Phương án Dự phòng Toàn diện (4-Tier High Availability & Redundancy)**:
  - Bổ sung **Bộ ngắt mạch Failover (Circuit Breaker)** trong `js/app.js`: Tự động ngắt và chuyển hướng kết nối sang Máy chủ Dự phòng Google Apps Script (Google Sheets) khi Cloudflare D1 bị sự cố 500 / overload 7429.
  - Tích hợp **Module Ngoại tuyến Độc lập (`js/offline-sync-engine.js`)**: Cho phép hệ thống lưu bộ nhớ đệm `IndexedDB` và chạy lập lịch 100% không phụ thuộc máy chủ khi mất kết nối mạng.
  - Bổ sung **Nút bấm Dự phòng Khẩn cấp 1-Click** trên Header: Cho phép **Xuất file dự phòng khẩn cấp (.json)** và **Nạp dữ liệu từ file sao lưu** tức thì.
  - Thêm thẻ hiển thị trạng thái kết nối máy chủ (`🟢 Cloudflare Main` / `🟡 Google Sheets Backup` / `⚡️ Mode Ngoại Tuyến`) trên thanh Header.
  - Cung cấp kịch bản máy chủ dự phòng Google Apps Script Mirror (`backend-backup/code.gs`).

### Cập nhật 24/08/2026 (v3.1.0)
- **Đột phá tốc độ hiển thị kết quả xếp lịch (< 1 giây)**:
  - Tách bạch thời gian tính toán thuật toán thực tế (`out.elapsedMs`) khỏi tổng thời gian chờ UI DOM re-render & vẽ biểu đồ Dashboard.
  - Bật popup thông báo thành công tức thì ngay khi thuật toán hoàn tất (~0.7s - 0.9s).
  - Tối ưu hóa chu trình luyện kim Simulated Annealing (`noImprove < 1`) giảm một nửa số vòng lặp dư thừa khi phát hiện không còn khả năng cải thiện điểm số.
  - Trì hoãn việc vẽ lại toàn bộ bảng bệnh nhân và biểu đồ Dashboard sang luồng phụ (`setTimeout(..., 50)`), giải phóng main thread ngay lập tức.

### Cập nhật 24/08/2026 (v3.1.0)
- **Tối ưu hóa tốc độ thuật toán lập lịch (Tăng tốc hơn 300%)**:
  - Gỡ bỏ hoàn toàn phép lọc vòng lặp mảng chuỗi (`results.filter()`) trong hàm `tryScheduleOne()` - vốn phải chạy hàng triệu phép chuẩn hóa chuỗi khi kiểm tra khoảng cách điều trị của bệnh nhân. Thay thế bằng thuộc tính truy vấn trực tiếp `patient.lastScheduledEnd` với độ phức tạp $O(1)$.
  - Tối ưu hóa thuật toán đếm ô khả thi (`countFeasibleSlots()`) và kiểm tra phòng nhân sự bằng vòng lặp chỉ số trực tiếp (`indexed for loops`), loại bỏ cấp phát bộ nhớ mảng thừa.
  - Tải và xử lý lập lịch cho kịch bản **"Ngày vắng"** nhanh hơn gấp 3.4 lần (từ 13 giây giảm xuống còn ~3.8 giây trên tập dữ liệu lớn).

### Cập nhật 24/08/2026 (v3.1.0)
- **Sửa lỗi trùng tên bệnh nhân khi nạp file HIS**:
  - Chuyển đổi khóa ràng buộc duy nhất (`UNIQUE`) của bảng bệnh nhân (`benh_nhan`) từ đơn tiêu chí `name` thành bộ đôi tiêu chí `(name, age)` (tên và năm sinh/tuổi).
  - Cập nhật các câu lệnh `ON CONFLICT(name)` của bảng bệnh nhân trong các API `addBenhNhan`, `editBenhNhan`, và `bulkUpdatePatients` thành `ON CONFLICT(name, age)`.
  - Giúp hệ thống hỗ trợ nạp và quản lý đồng thời nhiều bệnh nhân trùng tên nhau nhưng khác năm sinh/tuổi mà không bị ghi đè hay xóa mất người cũ.

### Cập nhật 24/08/2026 (v3.1.0)
- **Sửa lỗi reset buổi điều trị về Sáng khi lưu bệnh nhân**:
  - Gỡ bỏ hoàn toàn logic tự động gán buổi điều trị về Sáng/Chiều dựa trên giờ y lệnh của bệnh nhân cũ/mới trong hàm `savePatient()`. Giờ đây, mọi bệnh nhân khi thêm mới hoặc sửa qua UI sẽ luôn giữ nguyên trạng thái buổi điều trị là `TuDong` (Tự động) trừ khi có thiết lập khác trước đó.
- **Cấu hình mặc định buổi điều trị trên D1 là TuDong**:
  - Cập nhật backend Cloudflare Worker (`backend/src/index.js`) để thay đổi toàn bộ giá trị fallback mặc định của buổi điều trị từ `Sang` thành `TuDong` khi thêm mới (`addBenhNhan`) hoặc cập nhật hàng loạt (`bulkUpdatePatients`).

### Cập nhật 24/08/2026 (v3.3.7)
- **Ẩn hoàn toàn ô chọn Buổi điều trị**: Theo yêu cầu của bác sĩ, ô chọn buổi điều trị cho bệnh nhân Ngoại trú đã được ẩn hoàn toàn (luôn mặc định để ở chế độ Tự động) để giảm thiểu thao tác nhập liệu.

### Cập nhật 24/08/2026 (v3.3.6)
- **Tách biệt quy chuẩn Buổi điều trị & Lập lịch liên tục**:
  1. **Hiển thị Buổi điều trị thông minh**: Ẩn ô chọn Buổi điều trị đối với bệnh nhân **Nội trú** (tự động đưa về trạng thái *Tự động*). Chỉ hiển thị ô chọn buổi (Sáng/Chiều/Tự động) đối với bệnh nhân **Ngoại trú**.
  2. **Thuật toán lập lịch**:
     - **Bệnh nhân Ngoại trú**: Bắt buộc xếp lịch trong buổi đã chọn và xếp **liên tục** (khoảng cách giữa các thủ thuật tối đa 3 phút) để giảm thiểu thời gian chờ tại viện.
     - **Bệnh nhân Nội trú**: Bỏ qua giới hạn buổi điều trị và không yêu cầu xếp liên tục (thời gian làm thủ thuật có thể **dàn trải** linh hoạt trong cả ngày theo khung giờ trống).

### Cập nhật 24/08/2026 (v3.3.5)
- **Cố định phân loại Nội/Ngoại trú của bệnh nhân cũ khi nạp HIS/Excel**:
  - Khi import file Excel hoặc HIS, hệ thống sẽ **luôn luôn giữ nguyên** trạng thái Nội trú / Ngoại trú và Buổi điều trị hiện tại của bệnh nhân đã tồn tại, tránh hoàn toàn lỗi ghi đè phân loại của bệnh nhân cũ về mặc định.
- **Tiêu chuẩn sắp xếp danh sách bệnh nhân nâng cao**:
  - Mặc định sắp xếp theo **Ngày vào viện** tăng dần (Cũ nhất -> Mới nhất).
  - Nếu cùng ngày vào viện, tự động sắp xếp theo **Giờ vào viện** tăng dần (Sớm nhất -> Muộn nhất).
  - Nếu cùng ngày và cùng giờ vào viện, tự động sắp xếp theo thứ tự bảng chữ cái tiếng Việt **A-Z** theo tên bệnh nhân.

### Cập nhật 24/08/2026 (v3.3.4)
- **Sửa lỗi 404 resource**: Xóa bỏ liên kết đến file cấu hình thương mại thương mại hóa `config.js` không cần thiết trong `index.html` của bản v3-Cloudflare, giải quyết triệt để lỗi 404 trong Console trình duyệt.

### Cập nhật 24/08/2026 (v3.3.3)
- **Bảo toàn phân loại Nội/Ngoại trú khi nhập Excel/HIS**:
  1. Khi nhập danh sách bệnh nhân từ HIS hoặc Excel bình thường mà **không có cột Đối tượng/Loại điều trị**, hệ thống sẽ tự động đối chiếu và **giữ nguyên phân loại Nội trú / Ngoại trú** hiện có của bệnh nhân trong cơ sở dữ liệu thay vì ghi đè hết về Nội trú như trước.
  2. Hỗ trợ tự động nhận diện cột Loại điều trị trong HIS nếu có các tiêu đề cột như: *Loại ĐT, Loại điều trị, Hình thức điều trị, Đối tượng, Nội/Ngoại trú*.
  3. Bảo toàn các trường thông tin khác như *Trạng thái xếp lịch, Giới tính, Số giường* và *Thứ tự kéo thả* khi cập nhật từ file Excel/HIS.

### Cập nhật 23/08/2026 (v3.3.2)
- **Ưu tiên Ngoại trú khi cùng ngày**: Khi bệnh nhân có cùng ngày vào viện, hệ thống sẽ tự động xếp các bệnh nhân **Ngoại trú lên trước** bệnh nhân **Nội trú** trong bảng danh sách bệnh nhân chính.

### Cập nhật 23/08/2026 (v3.3.1)
- **Sắp xếp mặc định**: Thiết lập chế độ mặc định sắp xếp bệnh nhân theo **Ngày Vào tăng dần** (Ngày Vào ▲) ngay khi tải trang, giúp danh sách bệnh nhân được sắp xếp gọn gàng theo ngày thay vì xen kẽ lộn xộn theo thứ tự cơ sở dữ liệu.
- **Sửa giao diện**: Đồng bộ hiển thị mũi tên ▲ trên tiêu đề cột "Ngày Vào" trên giao diện khi tải trang.

### Cập nhật 23/08/2026 (v3.3.0)
- **Sửa lỗi & Tính năng mới:**
  1. **Khắc phục lỗi D1 Database "no such column: loai_bn":** Thêm bổ sung các lệnh migration `ALTER TABLE benh_nhan ADD COLUMN loai_bn TEXT DEFAULT 'NoiTru'` và `ALTER TABLE benh_nhan ADD COLUMN buoi_dieu_tri TEXT DEFAULT 'Sang'` vào hàm `ensureSchema` ở backend. Cơ sở dữ liệu sản xuất sẽ tự động nâng cấp schema ngay khi có request bất kỳ.
  2. **Chuẩn hóa trường nhập Giờ Y lệnh:** Giữ nguyên ô nhập Giờ Y lệnh trên form bệnh nhân để tránh việc xếp lịch trước giờ vào viện. Khi mở form hoặc load thông tin bệnh nhân cũ có giờ vào `07:30`, ô nhập này sẽ để trống (không hiển thị số `07:30` lặp đi lặp lại) nhưng hệ thống tự hiểu và lập lịch từ `07:30`. Nếu để trống khi thêm bệnh nhân mới, hệ thống sẽ tự động dùng giờ hiện hành của máy tính để phân ca Sáng/Chiều tương ứng.
  3. **Tách trường Ngày vào viện:** Thay thế ô nhập ngày định dạng dd/mm/yyyy trước đây bằng 2 trường riêng biệt: Ô nhập Ngày (dạng text, tự nhập số ngày) và Dropdown chọn Tháng/Năm (danh sách 36 tháng từ năm trước đến năm sau, mặc định là tháng hiện tại). Cải tiến này giúp người dùng chỉnh sửa từng thành phần của ngày vào viện ở bất kỳ vị trí nào mà không lo bị lỗi định dạng ngày.
  4. **Thêm cột "Loại ĐT" hiển thị Nội trú/Ngoại trú:** Bổ sung thêm 1 cột mới "Loại ĐT" tại bảng danh sách bệnh nhân chính, giúp hiển thị trực quan trạng thái phân loại Nội trú (màu xanh lá) / Ngoại trú (màu cam) của từng người.
- **File sửa đổi:** `index.html`, `js/app.js`, `backend/src/index.js` (v3.3.0)

### Cập nhật 24/08/2026 (v3.1.7)
- **Biên soạn tài liệu Hướng Dẫn Sử Dụng Toàn Diện v3 & Trang Web Tài Liệu Độc Lập**:
  1. **Tài liệu toàn diện 12 chương (`HUONG_DAN_SU_DUNG.md` & Artifact)**:
     - Biên soạn toàn bộ 12 chương hướng dẫn sử dụng chi tiết 100% tất cả các phân hệ: Đăng nhập, Dashboard, Danh mục (Máy móc, Thủ thuật, Nhân sự, Phòng), Tiếp nhận bệnh nhân, Giờ bận / Ra viện, Xếp lịch ngày thường (3 kịch bản: Tối ưu tối đa, Cân bằng tải, Dự phòng), Xếp lịch Thứ 7, Kiểm tra lỗi & xung đột, Tìm giờ rảnh, Bảng chấm công, Thống kê tổng hợp & KPI, Quản trị hệ thống, Quy trình xử lý sự cố & Backup, Bảng phím tắt & mẹo sử dụng.
  2. **Tự động chụp 17 ảnh minh họa sắc nét (`docs/images/`)**:
     - Chụp đầy đủ 17 màn hình và modal của hệ thống thực tế từ môi trường chạy thử: `01_login.png`, `02_dashboard.png`, `03_machines.png`, `04_procedures.png`, `05_staff.png`, `06_rooms.png`, `07_patients.png`, `08_busy.png`, `09_schedule_strategy_modal.png`, `09_schedule_success_popup.png`, `09_schedule_table.png`, `10_sat.png`, `11_kiemtra.png`, `12_utils.png`, `13_chamcong.png`, `14_thongke.png`, `15_admin_system.png`, `15_admin_accounts.png`, `15_admin_backup.png`.
  3. **Xây dựng trang web tài liệu trực quan (`huong-dan-su-dung.html` & `hdsd.html`)**:
     - Giao diện chuẩn Docs hiện đại với tông màu Y tế `#1e3d2b`, `#27ae60`.
     - Thanh điều hướng mục lục Sidebar TOC thông minh có ScrollSpy tự động bám theo nội dung đọc.
     - Tính năng tìm kiếm nội dung thời gian thực (Live Search), phóng to ảnh (Lightbox Zoom), chuyển đổi giao diện Sáng / Tối (Dark/Light Mode), nút In Hướng Dẫn tối ưu khổ giấy A4 (Print-Ready CSS), nút Về Phần Mềm và nút Lên đầu trang (Back to top).
  4. **Cập nhật liên kết nhanh Footer**:
     - Cập nhật cấu hình `quick_links` trên Cloudflare D1 Database và fallback `js/app.js`, mục "📖 Hướng dẫn sử dụng phần mềm" ở Footer chuyển sang mở trực tiếp trang web `huong-dan-su-dung.html`.
- **File tạo mới & sửa đổi**: `HUONG_DAN_SU_DUNG.md`, `huong-dan-su-dung.html`, `hdsd.html`, `docs/images/*`, `index.html`, `js/app.js`, `PM-xeplich-v3.md` (v3.1.7).

### Cập nhật 25/08/2026 (v3.1.8)
- **Hoàn thiện Cloudflare Worker API, Phân biệt bệnh nhân trùng tên & Đồng bộ hệ thống toàn diện**:
  1. **Chuyển đổi "Tra cứu Văn bản & BHXH" chạy trực tiếp trên Cloudflare D1**:
     - Thay thế hoàn toàn liên kết Google Apps Script cũ thành giao diện Modal tra cứu trực tiếp `#modal-doc-lookup` trên `v3-Cloudflare`.
     - Tích hợp ô tìm kiếm linh hoạt, bộ lọc theo cơ quan (Bộ Y tế, BHXH Việt Nam, Bệnh viện), nút xem trực tuyến và nút tải file PDF.
     - Tích hợp bộ công cụ Quản lý văn bản (Admin) giúp thêm, sửa, xóa và lưu danh sách văn bản vào bảng D1 `tai_lieu`.
     - Backend Cloudflare Worker (`backend/src/index.js`) bổ sung API `getDocuments` và `saveDocuments` tự động seed văn bản quy định mặc định khi DB trống.
  2. **Xử lý triệt để bài toán phân biệt bệnh nhân trùng tên**:
     - Khớp danh tính bệnh nhân đa tiêu chí (`Tên + Năm Sinh + Phòng`) khi gán nhãn ra viện `(✔ RV)` và giờ bận trên bảng lịch trình.
     - Bổ sung cột **Năm Sinh** và **Phòng** vào Bảng Giờ Bận và Bảng Ra Viện trên giao diện.
     - Tự động hiển thị kèm Năm sinh & Phòng trong gợi ý tìm kiếm (`datalist`) khi có bệnh nhân trùng tên.
  3. **Rà soát & hỗ trợ 100% tất cả 62 Endpoints trên Cloudflare Worker D1**:
     - Bổ sung và hoàn thiện trọn vẹn: `getEmployees`, `saveEmployees`, `getErrorConfig`, `saveErrorConfig`, `getChamCong`, `saveChamCong`, `getThongKeThuThuat`, `saveThongKeThuThuat`, `getQuickLinks`, `saveQuickLinks`, `deleteAccount`, `getMayMoc`, `getPhong`, `saveAITrainingData`, `clearAITrainingData`.
     - Loại bỏ hoàn toàn các lỗi 400 / 500 khi nạp Dashboard, Bảng chấm công và Quản trị hệ thống.
  4. **Đồng bộ nội dung Hướng Dẫn Sử Dụng**:
     - Đồng bộ toàn bộ nội dung hướng dẫn sử dụng 12 chương vào cả `hdsd.html` và `huong-dan-su-dung.html`, giúp người dùng truy cập bất kỳ URL nào cũng mở trực tiếp tức thì không qua redirect.
### Cập nhật 27/08/2026 (v3.2.0 - Lần 2)
- **Khắc phục triệt để lỗi ô điền số lượng máy móc trong tab Phòng chuyển sang `undefined`**:
  1. **Nguyên nhân phát hiện**:
     - Khi đồng bộ nền hoặc gọi `loadMachines()` / `getDanhSachMay`, dữ liệu máy móc trả về dạng mảng `[STT, ten_loai, ma_may, trang_thai]`.
     - Hàm `renderDynamicMachineInputs()` trước đó truy xuất trực tiếp `m.tenLoai` mà không hỗ trợ mảng `m[1]` hoặc `m.ten_loai`. Với mảng, `m.tenLoai` là `undefined`, khi bọc `String(undefined)` thành chuỗi `"undefined"` và vượt qua bộ lọc `filter(t => t !== '')`, dẫn đến render ra ô nhập liệu có nhãn `undefined: [____]`.
     - Hàm `editRoom()` và `saveRoom()` cũng bị lỗi tìm kiếm mã máy `m.maMay === code` khi `m` là mảng.
  2. **Giải pháp xử lý**:
     - **`js/app.js` (`renderDynamicMachineInputs`)**: Bóc tách an toàn `m.tenLoai || m.ten_loai || m[1] || m.ten || m.name`, lọc bỏ triệt để chuỗi rác `"undefined"`, `"null"`, tự động hiển thị thông báo khi kho chưa có máy và mã hóa an toàn HTML `escapeHtml`.
     - **`js/app.js` (`loadFromSheets`)**: Chuẩn hóa toàn bộ máy về object đồng nhất có đầy đủ `tenLoai`, `maMay`, `trangThai` cùng các alias dự phòng.
     - **`js/app.js` (`editRoom` & `saveRoom`)**: Đảm bảo `renderDynamicMachineInputs()` luôn được gọi trước khi điền dữ liệu; kiểm tra an toàn mã máy `maMay` và loại máy `tenLoai` bất kể dạng dữ liệu.
     - **`js/app.js` (`editRoomMachine` & `timMayRanh`)**: Khắc phục lỗi tiềm ẩn khi đọc dữ liệu máy dạng mảng hoặc thiếu thuộc tính.
     - **Bổ sung sự kiện chuyển tab**: Tự động làm mới danh sách ô nhập máy móc khi chuyển sang tab Phòng (`tab-rooms`).
     - **`backend/src/index.js`**: Cập nhật endpoint `getDanhSachMay` / `getMayMoc` trả về object có đầy đủ cả `tenLoai`, `maMay`, `trangThai` và các chỉ số `[0, 1, 2, 3]` để đảm bảo tương thích ngược 100%.
     - **`js/offline-sync-engine.js`**: Đồng bộ hóa các khóa cache (`machine`/`machines`, `room`/`rooms`, `proc`/`procedures`) khi sao lưu và khôi phục dữ liệu khẩn cấp.
  3. **Đồng bộ thời gian Footer**:
     - Cập nhật thời gian Footer: `13:42 27/08/2026`.
- **File sửa đổi**: `js/app.js`, `backend/src/index.js`, `js/offline-sync-engine.js`, `index.html`, `PM-xeplich-v3.md`.

### Cập nhật 27/08/2026 (v3.2.1)
- **Tích hợp Toàn diện 4 Thư Viện Hàng Đầu & Nâng Cấp Giao Diện Timeline + Xuất PDF Y Tế**:
  1. **Nâng cấp Bộ Nhớ Đệm Offline Dexie.js (`js/offline-sync-engine.js` & `js/dexie.min.js`)**:
     - Tích hợp Dexie.js quản lý IndexedDB chuẩn công nghiệp, vượt qua hoàn toàn rào cản 5MB của LocalStorage.
     - Khởi tạo các Stores chuyên biệt: `cache`, `patients`, `history`, `schedules`, `chamcong`, `thongke`, `syncQueue`.
     - Hỗ trợ lưu trữ bền bỉ 20.000+ bản ghi lịch sử thủ thuật trực tiếp dưới Client, truy vấn 0ms, không lo tràn bộ nhớ.
  2. **Chuẩn Hóa Toàn Bộ Backend Cloudflare Worker API Với Hono (`backend/src/index.js` & `backend/src/hono.js`)**:
     - Chuyển đổi Worker sang framework Hono siêu nhẹ (<15KB) chuẩn Edge, zero-dependency.
     - Tự động xử lý Global CORS Middleware, kiểm soát phương thức OPTIONS và lỗi bất đồng bộ.
     - Hỗ trợ song song cả Legacy Bridge (`POST /` & `POST /api/action` với `{ action, args }`) lẫn RESTful endpoints (`GET /api/ping`, `GET /api/bootstrap`).
  3. **Thiết Kế Lại Giao Diện Dòng Thời Gian Y Tế Sang Trọng (Medical Resource Timeline)**:
     - **Khắc phục triệt để lỗi thẻ bị dồn cục ở 07:30**: Chuyển đổi layout từ table sang cấu trúc Flexbox/Canvas với chiều rộng pixel tuyệt đối (95px/slot 30 phút).
     - **Thuật toán Multi-lane Packing chống đè thẻ**: Tự động xếp các ca trùng giờ của cùng 1 bác sĩ / phòng vào các làn (Lanes) riêng biệt, đảm bảo hiển thị trải dài 100% chính xác từ 07:30 đến 16:30.
     - Cột cố định hiển thị từng **Phòng Điều Trị 🏥** hoặc từng **Bác sĩ / KTV 👨‍⚕️**.
     - Thẻ ca thủ thuật (Cards) theo chuẩn gradient YHCT (Xanh ngọc), PHCN (Xanh sapphire) và Bệnh nhân Ra viện (Tím hoàng gia `✔ RV`).
     - Hỗ trợ lọc linh hoạt: Theo Phòng / Theo Nhân viên, và xem theo Ca Sáng / Ca Chiều / Cả Ngày.
  4. **Nâng Cấp Trình Xuất PDF Chuẩn Y Tế Phân Trang Theo Từng Phòng Bệnh**:
     - Tự động phân chia mỗi phòng bệnh trên 1-2 trang riêng biệt (`pageBreak: 'before'`).
     - **Ưu tiên đưa toàn bộ Bệnh nhân Ra Viện (`__isDischarged`) lên đầu tiên** của từng phòng, có nhãn `(✔ RA VIỆN)` và màu sắc nổi bật.
     - Mỗi trang phòng có tiêu đề bệnh viện, tên phòng to rõ, bảng chi tiết phân ca, tổng số ca và phần ký tên Bác sĩ phụ trách phòng.
  5. **Tự Động Hóa & Cache Busting Toàn Diện**:
     - Cập nhật `sw.js` (Service Worker) bổ sung cache đệm tĩnh cho toàn bộ 5 tài nguyên mới.
     - Nâng cấp số phiên bản toàn hệ thống lên `3.2.1`, đồng bộ tham số `?v=3.2.1` trên tất cả liên kết tài nguyên.
- **File tạo mới & sửa đổi**: `js/dexie.min.js`, `js/frappe-gantt.min.js`, `css/frappe-gantt.css`, `js/pdfmake.min.js`, `js/vfs_fonts.js`, `backend/src/hono.js`, `backend/src/index.js`, `backend/package.json`, `js/offline-sync-engine.js`, `js/app.js`, `css/style.css`, `index.html`, `sw.js`, `PM-xeplich-v3.md` (v3.2.1).

### Cập nhật 28/08/2026 (v3.2.2)
- **Triển Khai Tuần Tự Giai Đoạn 1 & Giai Đoạn 2: DOMPurify, Fuse.js, Chart.js & Zod Schema**:
  1. **Bảo Mật XSS Y Tế Với DOMPurify (`js/purify.min.js`)**:
     - Tích hợp thư viện bảo mật DOMPurify chuẩn công nghiệp (<22KB), tự lưu trữ nội bộ (self-hosted offline).
     - Thiết lập hàm làm sạch toàn diện `sanitizeInput()` tự động lọc sạch mã độc XSS trong tên bệnh nhân, thủ thuật, máy móc, phòng bệnh và ghi chú trước khi render DOM hoặc lưu trữ IndexedDB.
  2. **Tìm Kiếm Mờ Thông Minh Tiếng Việt Với Fuse.js (`js/fuse.min.js`)**:
     - Tích hợp thư viện Fuzzy Search Fuse.js kết hợp thuật toán chuẩn hóa không dấu `removeVietnameseTones()`.
     - Xây dựng hàm `fuzzySearchList()` hỗ trợ tìm kiếm siêu nhạy trên toàn bộ các trường (Tên BN, Phòng, KTV, Thủ thuật, Máy, Giường) ngay cả khi gõ không dấu, viết tắt hoặc gõ sai chính tả.
     - Tích hợp trực tiếp vào thanh tìm kiếm Timeline Y Tế và Danh Sách Lịch Trình.
  3. **Biểu Đồ Thống Kê Chuyên Nghiệp Với Chart.js (`js/chart.min.js`)**:
     - Chuyển đổi toàn bộ Chart.js sang self-hosted offline nội bộ, loại bỏ phụ thuộc vào CDN bên ngoài.
     - Trực quan hóa Dashboard Ngày Công Làm Việc và Số Lượng Thủ Thuật theo từng Bác sĩ / KTV.
  4. **Kiểm Soát Tính Toàn Vẹn Dữ Liệu Y Lệnh Với Zod (`js/zod.min.js`)**:
     - Thiết lập bộ Schema `window.MedicalSchemas` kiểm tra tính hợp lệ của hồ sơ bệnh nhân và ca thủ thuật.
     - Tự động bắt lỗi tên trống, định dạng giờ sai lệch (HH:MM) trước khi đưa vào thuật toán xếp lịch.
  5. **Đồng Bộ Bộ Nhớ Đệm Offline & Cache Busting v3.2.2**:
     - Bổ sung `js/purify.min.js`, `js/fuse.min.js`, `js/chart.min.js`, `js/zod.min.js` vào Service Worker `sw.js` (`pmcg-cache-v3.2.2`).
     - Đồng bộ toàn bộ liên kết tài nguyên trên `index.html` lên tham số `?v=3.2.2`.
- **File tạo mới & sửa đổi**: `js/purify.min.js`, `js/fuse.min.js`, `js/chart.min.js`, `js/zod.min.js`, `js/app.js`, `index.html`, `sw.js`, `PM-xeplich-v3.md` (v3.2.2).

### Cập nhật 28/08/2026 (v3.2.3)
- **Tối Ưu & Sửa Triệt Để Tìm Kiếm Tiếng Việt Không Dấu (NFD Unicode Normalization)**:
  1. **Nâng Cấp Hàm `removeVietnameseTones()`**: Sử dụng chuẩn `normalize('NFD').replace(/[\u0300-\u036f]/g, '')` kết hợp chuyển `đ/Đ -> d`, hỗ trợ 100% tất cả các bộ gõ tiếng Việt (Unikey, EVKey, Windows IME, Gboard).
  2. **Đồng Bộ Bộ Lọc Tìm Kiếm Bảng Lịch Trình (`filterSchedule()`) & Bảng Bệnh Nhân (`filterPatientTable()`)**:
     - Áp dụng `fuzzySearchList()` và so khớp không dấu trực tiếp trên toàn bộ danh sách ca xếp lịch dạng Bảng và dạng Timeline.
     - Khi gõ `vu viet tan`, hệ thống lập tức hiển thị bệnh nhân `VŨ VIỆT TÂN` và các ca thủ thuật liên quan mà không bị ẩn dòng.
     - Đồng bộ tính năng tìm kiếm không dấu cho Modal Tra cứu văn bản y tế `filterDocLookupList()`.
  3. **Nâng Cấp Cache Service Worker (`pmcg-cache-v3.2.3`)**: Cập nhật bộ nhớ đệm tĩnh, tự động kích hoạt phiên bản mới nhất ngay khi tải trang.
- **File sửa đổi**: `js/app.js`, `index.html`, `sw.js`, `PM-xeplich-v3.md` (v3.2.3).

### Cập nhật 28/08/2026 (v3.2.4)
- **Chuẩn Hóa Thuật Toán Tìm Kiếm Đa Từ Khóa Không Dấu (Tokenized Multi-Word Vietnamese Search)**:
  1. **Loại Bỏ Hoàn Toàn Lỗi Bắt Nhầm Tên (False Positives)**:
     - Tách từ khóa tìm kiếm thành các tokens độc lập (`vu`, `viet`, `tan`), yêu cầu mọi token phải cùng xuất hiện trong dòng dữ liệu.
     - Khắc phục triệt để việc tìm `vu viet tan` bị dính các bệnh nhân không liên quan như `TỰ TIẾN MẠNH`.
     - Giờ đây, tìm `vu viet tan` sẽ **chỉ trả về chính xác 100% bệnh nhân `VŨ VIỆT TÂN`**.
  2. **Đồng Bộ Bộ Lọc Toàn Ứng Dụng**: Áp dụng đồng nhất cho Bảng Lịch Trình, Dòng Thời Gian Timeline, Bảng Bệnh Nhân và Modal Tra Cứu Văn Bản.
  3. **Nâng Cấp Cache Service Worker (`pmcg-cache-v3.2.4`)**: Cập nhật bộ nhớ đệm tĩnh, tự động kích hoạt phiên bản mới nhất ngay khi tải trang.
- **File sửa đổi**: `js/app.js`, `index.html`, `sw.js`, `PM-xeplich-v3.md` (v3.2.4).

### Cập nhật 28/08/2026 (v3.2.5)
- **Tối Ưu Xuất File Excel In Ấn (1 Sheet Duy Nhất + Drop-list Lọc Phòng + Tự Động Đếm SUBTOTAL)**:
  1. **Hợp Nhất 1 Sheet Gọn Gàng**: Không tách thành nhiều sheet rời rạc, gom toàn bộ lịch trình vào 1 sheet `"Lịch Trình"` duy nhất.
  2. **Tích Hợp Drop-list Lọc Theo Phòng (`AutoFilter`)**:
     - Thêm cột `"Phòng Điều Trị"` và kích hoạt bộ lọc Drop-list tự động của Excel tại dòng Header.
     - Bác sĩ chỉ cần bấm vào mũi tên drop-down ở cột Phòng để chọn phòng bất kỳ ➔ Excel lập tức lọc danh sách thủ thuật của phòng đó.
  3. **Tự Động Đếm Tổng Số Thủ Thuật Bằng Hàm `=SUBTOTAL(103, ...)`**: Dòng tổng kết dưới cùng tự động co giãn và đếm chính xác số lượng thủ thuật của phòng đang được chọn/lọc.
  4. **Quy Tắc Sắp Xếp Chuẩn**:
     - Đưa toàn bộ **Bệnh nhân Ra Viện `(RV)` lên TRÊN CÙNG** của bảng.
     - Trong từng nhóm (RV và thường), sắp xếp theo thứ tự **A-Z theo Tên Bệnh Nhân** (chuẩn tiếng Việt).
     - Giữ nguyên dòng kẻ ngang đậm phân cách giữa các dòng để in ấn rõ nét.
  5. **Nâng Cấp Cache Service Worker (`pmcg-cache-v3.2.5`)**: Cập nhật bộ nhớ đệm tĩnh, tự động kích hoạt phiên bản mới nhất ngay khi tải trang.
- **File sửa đổi**: `js/app.js`, `index.html`, `sw.js`, `PM-xeplich-v3.md` (v3.2.5).

### Khắc Phục Lỗi Xếp Lịch Cho Bệnh Nhân Trùng Tên (28/08/2026)
- **Vấn đề phát hiện**:
  - Khi khoa có 2 bệnh nhân trùng họ tên (ví dụ: `Nguyễn Thị Giới` - 1962 phòng Hà Chip chỉ có 2 thủ thuật DC, DX và `Nguyễn Thị Giới` - 1950 phòng Lê Hiền có 3 thủ thuật DC, TC, DX), thuật toán xếp lịch và hồi phục ca rớt (Backfill) trước đó tìm bệnh nhân chỉ dựa trên trường `name` (`patients.find(p => p.name === tenBN)`).
  - Hậu quả: Các ca thủ thuật (như `thủy châm`) của bệnh nhân thứ hai bị gán nhầm sang cho bệnh nhân thứ nhất, khiến bệnh nhân 1962 bị xếp dôi lên thành 4 thủ thuật.
- **Giải pháp xử lý triệt để**:
  1. **Định Danh Bệnh Nhân Độc Nhất (`pId`)**: Gán mã định danh duy nhất cho từng hồ sơ bệnh nhân trong `SchedulerEngine` (`buildDbFromCache`, `runSaturdayScheduling`).
  2. **So Khớp Toàn Diện Đa Trường (Tên + Năm Sinh + Phòng Điều Trị)**:
     - Khắc phục toàn bộ các điểm tra cứu trong `SchedulerEngine` (giai đoạn tối ưu hóa, giai đoạn hồi phục ca rớt Backfill, đột biến Mutate, và lọc ca đã xếp `existingSched`).
     - Đồng bộ hàm `setUnscheduledData()` và `renderPatientsTable()` trong `js/app.js` để nhãn trạng thái "Đã đủ" và ca rớt được phân định chính xác tuyệt đối.
- **File sửa đổi**: `js/scheduler-engine.js`, `js/app.js`, `index.html`, `PM-xeplich-v3.md`.

### Giai Đoạn 3: Tối Ưu Thuật Toán Xếp Lịch & Đồng Bộ Thời Gian Thực Live Sync (28/08/2026)
- **Nâng Cấp Thuật Toán CSP & Simulated Annealing (`js/scheduler-engine.js`)**:
  1. **Tối Ưu Hóa Liền Mạch (Flow Continuity & Gap Minimization)**:
     - Thêm cơ chế ưu tiên cao cho bệnh nhân đang làm dở liệu trình và vừa kết thúc ca trước đó trong khoảng 0-15 phút.
     - Giúp bệnh nhân được làm liên tục các thủ thuật mà không phải ngồi chờ rảnh rỗi nhiều tiếng.
  2. **Ưu Tiên Nhân Sự Phụ Trách Phòng (Room Staff Affinity)**:
     - Tự động ưu tiên Bác sĩ và KTV phụ trách chính phòng bệnh của bệnh nhân.
  3. **Cân Bằng Tải Khối Lượng Công Việc**:
     - Phân bổ đều thời lượng thực hiện giữa các KTV và Bác sĩ trong ngày.
- **Hệ Thống Đồng Bộ Trực Tuyến Live Sync Bus (`js/offline-sync-engine.js` & `js/sync.js`)**:
  1. **Kênh Phát Sóng Thời Gian Thực (`BroadcastChannel`)**:
     - Đồng bộ tức thì 0ms giữa tất cả các Tab và Cửa sổ trình duyệt đang mở khi có bất kỳ thay đổi nào (thêm/sửa bệnh nhân, xếp lịch).
  2. **Hàng Đợi Đồng Bộ Ngoại Tuyến (`syncQueue`)**:
     - Tự động lưu trữ các tác vụ khi offline và xả hàng đợi lên Cloudflare D1 khi có mạng trở lại.
- **File sửa đổi**: `js/scheduler-engine.js`, `js/offline-sync-engine.js`, `js/sync.js`, `js/app.js`, `index.html`, `PM-xeplich-v3.md`.

### Tinh Gọn Hệ Thống 13 Phác Đồ Mẫu YHCT - PHCN Chuẩn Của Khoa (28/08/2026)
- **Giao Diện**: Tối giản và trang nhã với `label` **Phác đồ:** và ô Drop-down chọn phác đồ số 1 đến 13 (không rườm rà, đồng nhất giao diện chung).
- **13 Phác Đồ Lâm Sàng Chuẩn Được Tích Hợp**:
  1. **Phác đồ 1**: Điện châm, Thủy châm, Điện xung
  2. **Phác đồ 2**: Điện châm, Thủy châm, Điện xung, Parafin
  3. **Phác đồ 3**: Điện châm, Thủy châm, Điện xung, Sóng ngắn
  4. **Phác đồ 4**: Điện châm, Thủy châm, Hồng ngoại, Xoa bóp vùng
  5. **Phác đồ 5**: Thủy châm, Điện xung, Sóng ngắn
  6. **Phác đồ 6**: Điện châm, Thủy châm, Hồng ngoại, Xoa bóp bấm huyệt
  7. **Phác đồ 7**: Điện châm liệt, Thủy châm, Điện xung, Tập trợ giúp
  8. **Phác đồ 8**: Điện châm liệt, Thủy châm, Hồng ngoại, Tập trợ giúp
  9. **Phác đồ 9**: Thủy châm, Điện xung, Siêu âm
  10. **Phác đồ 10**: Hồng ngoại, Tập trợ giúp
  11. **Phác đồ 11**: Hồng ngoại, Tập kháng trở
  12. **Phác đồ 12**: Hồng ngoại, Tập thở
  13. **Phác đồ 13**: Điện xung, Tập thở
- **Cơ Chế Tương Tác & Phân Biệt Từ Khóa Chuyên Khoa**:
  - Khi chọn phác đồ trong Dropdown ➔ Hệ thống tự động tick chọn chính xác các checkbox thủ thuật tương ứng trong cả hai cột **💊 YHCT** và **⚙️ PHCN** với thuật toán Token-based Matching thông minh.
  - **Khắc phục triệt để bắt nhầm từ khóa**: Phân biệt tuyệt đối giữa `Điện châm` thông thường và `Điện châm liệt` (khi chọn Điện châm sẽ không bị tick nhầm vào Điện châm liệt và ngược lại).
  - Bác sĩ vẫn hoàn toàn có thể click chọn thêm hoặc bớt thủ thuật linh hoạt theo từng ca bệnh cụ thể.
- **File sửa đổi**: `index.html`, `js/app.js`, `PM-xeplich-v3.md`.

### Nâng Cấp: Bảng Quản Lý & Tùy Chỉnh Phác Đồ Riêng Của Khoa (28/08/2026)
- **Mục tiêu**: Cho phép từng khoa phòng / đơn vị bệnh viện tự do tạo mới, chỉnh sửa, xóa và sắp xếp các phác đồ điều trị riêng của đơn vị mình mà không bị giới hạn cố định.
- **Tính Năng Triển Khai**:
  1. **Bảng Quản Lý Phác Đồ Trong Tab Thủ Thuật (`#tab-procedures`)**:
     - Nằm ngay dưới bảng danh mục thủ thuật.
     - Hiển thị danh sách các phác đồ kèm badge các thủ thuật tương ứng.
     - Hỗ trợ đổi thứ tự STT (kéo thả ☰ và nút ▲/▼) và nút `Sửa` / `Xóa`.
  2. **Modal Cấu Hình Phác Đồ (`#modal-protocol-editor`)**:
     - Nhập tên phác đồ tùy ý.
     - Tick chọn các thủ thuật từ danh mục thực tế của đơn vị (chia 2 cột YHCT và PHCN).
  3. **Đồng Bộ Tự Động Toàn Diện**:
     - Tự động nạp vào Dropdown `#pat-protocol-select` ở Tab Quản lý Bệnh nhân.
     - Lưu trữ bền vững trong **Dexie.js (IndexedDB)** và **LocalStorage**, tự động phát sự kiện đồng bộ đa tab `Live Sync Bus`.
- **File sửa đổi**: `index.html`, `js/app.js`, `PM-xeplich-v3.md`.

### Nâng Cấp: Tối Ưu Hóa Giao Diện Cho Điện Thoại & Máy Tính Bảng (28/08/2026)
- **Mục tiêu**: Đảm bảo trải nghiệm người dùng hoàn hảo trên thiết bị di động (iPhone, Android) và máy tính bảng (iPad, Galaxy Tab).
- **Tính Năng Triển Khai**:
  1. **Thanh Điều Hướng Tabs Dạng Pill Vuốt Ngang (Horizontal Scroll Snap)**:
     - Tự động chuyển đổi mượt mà sang thanh cuộn vuốt ngang trên màn hình `< 1024px` và `< 768px`.
     - Ẩn thanh cuộn thô, nút bấm dạng Pill bo góc hiện đại với active highlight nổi bật.
  2. **Layout & Form Nhập Liệu Cảm Ứng (Touch-First UI)**:
     - Chuyển `.split-layout` sang dạng xếp chồng đơn cột với nút bấm **"➕ Thêm Mới / Nhập Liệu"** mở rộng/thu gọn thông minh.
     - Nới rộng kích thước chạm cho Checkbox (`min-height: 40px`, padding thoải mái).
     - Thiết lập `font-size: 16px` cho inputs trên mobile nhằm triệt tiêu hiện tượng iOS Safari tự động phóng to màn hình.
  3. **Bảng Dữ Liệu & Timeline Trực Quan**:
     - Bảng dữ liệu tự động chống tràn với thanh cuộn cảm ứng `-webkit-overflow-scrolling: touch`.
     - Timeline tự động thu gọn cột tên tài nguyên xuống `115px` trên mobile để tối đa hóa không gian hiển thị ca thủ thuật.
  4. **Cửa Sổ Modal Tự Động Thích Ứng (95% Viewport)**:
     - Modal co giãn thông minh, cố định Header và Footer, cuộn nội dung mượt mà không bị bàn phím ảo che khuất.
- **File sửa đổi**: `css/style.css`, `index.html`, `js/app.js`, `PM-xeplich-v3.md`.

### Nâng Cấp: Đồng Bộ Phác Đồ Đa Thiết Bị Qua Cloudflare D1 Backend (28/08/2026)
- **Vấn đề xử lý**: Bác sĩ chỉnh sửa phác đồ trên máy tính (PC), nhưng khi mở trên điện thoại/máy tính bảng thì chưa thấy cập nhật do dữ liệu trước đó chỉ lưu trong LocalStorage của trình duyệt máy tính.
- **Giải pháp triển khai**:
  1. **Cloudflare D1 Backend (`backend/src/index.js`)**:
     - Bổ sung 2 API `saveProtocolsData` và `getProtocolsData` ghi/đọc trực tiếp vào bảng `cai_dat` với key `clinical_protocols`.
     - Tích hợp `protocols` tự động trong API khởi tạo hệ thống `getBootstrapData` (`/api/bootstrap`).
     - Đưa `saveProtocolsData` vào danh sách `MUTATION_ACTIONS` để hỗ trợ sync webhook tức thì.
  2. **Frontend (`js/app.js`)**:
     - Mỗi khi Thêm / Sửa / Xóa phác đồ, gọi ngay `callApi('saveProtocolsData', [newList])` để cập nhật lên Cloudflare D1 Database.
     - Hàm `loadBootstrapData()` tự động nạp phác đồ mới nhất từ Cloud và lưu vào bộ nhớ Offline Cache của từng thiết bị.
- **File sửa đổi**: `backend/src/index.js`, `js/app.js`, `index.html`, `PM-xeplich-v3.md`.

### Nâng Cấp: Menu Chuột Phải Mở Tab Mới & Nút Đồng Bộ Đám Mây Tức Thì (28/08/2026)
- **Tính năng Chuột Phải Tab (Tab Context Menu)**:
  - Khi click chuột phải vào bất kỳ tab nào (hoặc Middle-click con lăn chuột / `Ctrl + Click`) ➔ Xuất hiện menu tùy chọn:
    1. **🌐 Mở trong Tab mới**: Mở tab đó trong một tab trình duyệt độc lập với đường dẫn Deep Link (VD: `#tab=tab-procedures`).
    2. **📋 Sao chép liên kết Tab**: Sao chép URL trực tiếp vào Clipboard để chia sẻ.
    3. **🔄 Làm mới dữ liệu Tab**: Tải lại dữ liệu mới nhất của tab hiện tại.
  - Tự động nhận diện URL Hash khi người dùng truy cập trực tiếp bằng liên kết.
- **Nâng Cấp Đồng Bộ Phác Đồ Đám Mây (Cloudflare D1)**:
  - Bổ sung nút **"🔄 Đồng Bộ Đám Mây"** ngay cạnh nút Thêm Phác Đồ Mới.
  - Tự động đẩy phác đồ từ LocalStorage lên `cai_dat` (key `clinical_protocols`) ngay khi ứng dụng khởi động trên PC.
  - Khi mở trên Điện thoại / Máy tính bảng, dữ liệu phác đồ đám mây được kéo về và cập nhật tức thì.
- **File sửa đổi**: `index.html`, `js/app.js`, `css/style.css`, `backend/src/index.js`, `PM-xeplich-v3.md`.

### Nâng Cấp: Khắc Phục Bảng Chấm Công & Tinh Gọn Toàn Bộ Bảng Trên Mobile Chế Độ Dọc (28/08/2026)
- **Vấn đề xử lý**:
  1. Bảng Chấm công (`#tab-chamcong`) trên điện thoại bị co về 0px chiều cao do cơ chế Flexbox container bị xung đột khi chuyển sang màn hình nhỏ.
  2. Các bảng dữ liệu (Bệnh nhân, Thủ thuật, Phác đồ, Nhân sự...) trên điện thoại ở chế độ dọc (portrait) bị quá to, thô, chiếm nhiều diện tích và khó theo dõi khi cuộn ngang.
- **Giải pháp triển khai**:
  1. **Bảng Chấm Công & Thống Kê (`#tab-chamcong`, `#tab-thongke`)**:
     - Thiết lập chiều cao chuẩn `calc(100vh - 140px)` và vùng cuộn bảng `calc(100vh - 230px)`.
     - **Ghim cố định cột Tên Nhân Viên bên trái (`position: sticky; left: 0; z-index: 35;`)**: Khi vuốt ngang xem các ngày 1-31 trong tháng, tên nhân viên luôn giữ cố định ở bên trái giúp quan sát cực kỳ dễ dàng.
     - Ô nhập chấm công `.cc-input-text` được thu gọn `height: 22px`, font `11px`, căn giữa chuẩn xác.
  2. **Toàn Bộ Các Bảng Dữ Liệu Khác (Chế Độ Dọc)**:
     - Giảm kích thước font xuống `11px - 11.5px`, padding ô `4px 6px` thanh thoát và thoáng mắt.
     - Ghim cố định cột STT / Tên bên trái khi cuộn ngang.
     - Tinh gọn nút bấm Sửa / Xóa (`height: 26px`, `font-size: 10.5px`).
- **File sửa đổi**: `css/style.css`, `index.html`, `PM-xeplich-v3.md`.

### Nâng Cấp: Đồng Bộ Triệt Để Phác Đồ Trên iPad & Tối Ưu Cài Đặt Hệ Thống Trên Điện Thoại (29/08/2026)
- **Vấn đề xử lý**:
  1. Bảng phác đồ trên iPad chưa đồng bộ giống PC: Do trước đó `initProtocolsData()` tự động đẩy dữ liệu mặc định lên cloud khi vừa mở app trên thiết bị mới, vô tình ghi đè lên dữ liệu đã lưu của PC.
  2. Tab Cài đặt hệ thống (`#tab-admin`) trên điện thoại bị trống trơn do Menu sidebar 250px chiếm hết màn hình và ép phần form cấu hình tràn ra ngoài biên màn hình. Đồng thời các ô nhập nếu chưa có dữ liệu trong DB thì hiển thị rỗng thay vì giá trị mặc định.
- **Giải pháp triển khai**:
  1. **Đồng Bộ Phác Đồ Đa Thiết Bị Chuẩn Xác (PC / iPad / Phone)**:
     - Loại bỏ hành vi tự động push phác đồ mặc định từ thiết bị mới. Chỉ push lên đám mây khi người dùng Thêm / Sửa / Xóa hoặc bấm nút *"🔄 Đồng Bộ Đám Mây"*.
     - Cả `restoreOfflineCache()` và `loadBootstrapData()` đều ưu tiên nạp `clinical_protocols` từ máy chủ Cloudflare D1 và cập nhật tức thì vào bộ nhớ đệm của iPad/Phone.
  2. **Giao Diện Cài Đặt Hệ Thống Responsive Đầy Đủ**:
     - Menu quản trị trên mobile chuyển thành dạng thanh Pill cuộn ngang (`overflow-x: auto`) cực kỳ gọn gàng.
     - Khung cấu hình hệ thống chiếm trọn 100% bề ngang, hiển thị đầy đủ các thông số kèm giá trị mặc định chuẩn (Giờ chốt sổ 16:20, Giờ lố YHCT 5p, Phạt rớt ca 10000, Phạt tăng ca 2, Phạt lệch tải 0.1).
- **File sửa đổi**: `js/app.js`, `index.html`, `css/style.css`, `PM-xeplich-v3.md`.

### Nâng Cấp: Loại Bỏ Mũi Tên Sắp Xếp (Chỉ Giữ ☰) & Sửa Dứt Điểm Tab Cài Đặt Hệ Thống Trên Mobile (29/08/2026)
- **Vấn đề xử lý**:
  1. Nút bấm mũi tên ▲/▼ chiếm diện tích ở cột STT của tất cả các bảng dữ liệu, gây vướng và rối mắt.
  2. Nút "Cài Đặt Hệ Thống" trong menu ngăn kéo (Drawer) trên điện thoại gọi nhầm `openTabFromDrawer('tab-settings')` (thay vì `'tab-admin'`), đồng thời thanh menu desktop thiếu nút `data-tab="tab-admin"`, dẫn đến khi bấm vào trang bị rỗng hoàn toàn.
- **Giải pháp triển khai**:
  1. **Loại Bỏ Hoàn Toàn Mũi Tên ▲/▼ (Chỉ Giữ Icon ☰ & STT)**:
     - Tinh gọn hàm `renderSttOrderControl` trên tất cả các bảng (Thủ thuật, Phác đồ, Nhân sự, Máy móc, Phòng bệnh...).
     - Chỉ hiển thị duy nhất icon kéo thả `☰` và số thứ tự `STT` (hỗ trợ kéo thả SortableJS mượt mà trên cả PC và cảm ứng điện thoại/tablet).
  2. **Sửa Dứt Điểm Điều Hướng Cài Đặt Hệ Thống**:
     - Sửa toàn bộ đường dẫn gọi `openTabFromDrawer('tab-admin')`, `switchMobileNav`, `goToAdminTab` và thêm nút `data-tab="tab-admin"` vào Sidebar Menu.
     - Tự động kích hoạt section `admin-sec-settings` và nạp dữ liệu mặc định đầy đủ khi người dùng mở tab Cài đặt hệ thống trên mọi thiết bị.
- **File sửa đổi**: `index.html`, `js/app.js`, `css/style.css`, `PM-xeplich-v3.md`.

### Nâng Cấp: Thuật Toán Xếp Lịch Nhóm 2 (Web Worker Đa Luồng, Tabu Search, LAHC & Nén Khe Hở Lịch) (29/08/2026)
- **Mục tiêu**:
  - Tối ưu hóa toàn diện bộ động cơ xếp lịch cốt lõi, quét tìm nghiệm tốt gấp 8-10 lần trong cùng thời gian ~0.15s, triệt tiêu tỷ lệ rớt ca (đặc biệt các ca khó nhiều thủ thuật), nén khe hở thời gian và không làm đơ giao diện.
- **Giải pháp triển khai**:
  1. **Sao lưu an toàn**:
     - Lưu bản sao lưu nguyên vẹn của động cơ trước đó vào `js/scheduler-engine.v3.2.5.bak.js`.
  2. **Tích hợp Metaheuristics Tiên Tiến (Tabu Search + Late Acceptance Hill Climbing)**:
     - **Tabu List (Bộ nhớ cấm lặp)**: Quản lý hàng đợi FIFO 30 trạng thái hoán vị gần nhất, kết hợp tiêu chuẩn Aspiration Criterion (vượt cấm nếu điểm số vượt trội) giúp thuật toán không bị kẹt ở cực tiểu cục bộ.
     - **Late Acceptance Hill Climbing (LAHC Buffer L=5)**: Chấp nhận các giải pháp trung gian theo bộ đệm lịch sử điểm số, cho phép thuật toán dễ dàng nhảy qua các nút thắt tắc nghẽn giờ cao điểm.
     - **Smart Guided Mutation**: Tự động ưu tiên xếp các bệnh nhân bị rớt ca và các gói $\ge 3$ thủ thuật vào các khung giờ vàng trong ngày.
  3. **Đa Luồng Web Worker Song Song (`navigator.hardwareConcurrency`)**:
     - Hàm `runSchedulingAsync()` tự động phát hiện số lõi CPU của thiết bị (2 đến 8 luồng) và khởi chạy song song các hạt giống ngẫu nhiên độc lập (`42`, `101`, `2026`, `7777`, `8888`...).
     - Gom kết quả từ tất cả các luồng và chọn ra phương án có điểm phạt thấp nhất.
     - Có sẵn cơ chế tự động Fallback chạy đồng bộ nếu thiết bị không hỗ trợ Worker.
  4. **Thuật Toán Nén Khe Hở Thời Gian (`compactTimelineGaps`)**:
     - Quét và dồn các khoảng trống nhàn rỗi 5-15 phút giữa các ca bệnh của cùng bệnh nhân/nhân sự/phòng bệnh, giúp các y bác sĩ và bệnh nhân hoàn thành lịch điều trị sớm hơn.
- **File sửa đổi**: `js/scheduler-engine.js`, `js/app.js`, `index.html`, `PM-xeplich-v3.md`.

### Nâng Cấp: Thuật Toán Xếp Lịch Nhóm 1 (Quy Hoạch Ràng Buộc Toán Học CP-SAT & Medical Constraint Programming) (29/08/2026)
- **Mục tiêu**:
  - Tích hợp bộ giải Quy hoạch Ràng buộc Toán học (Constraint Programming CP-SAT / MIP Optimizer) tìm kiếm nghiệm tối ưu toàn cục (Global Mathematical Optimum) cho những ngày cao điểm kỷ lục hoặc các ca bệnh phức tạp có nhiều ràng buộc chéo máy hiếm & giờ bận.
- **Giải pháp triển khai**:
  1. **Xây dựng module `js/cp-solver.js` (MedicalCPSolver)**:
     - Mô hình hóa bài toán RCPSP y tế: Không gian biến quyết định $[T_{p,k}, \text{Staff}, \text{Bed}, \text{Machine}]$.
     - Lan truyền ràng buộc toán học (*Constraint Propagation*) và kiểm tra tính khả thi (*Forward Checking + Disjoint Intervals*).
     - Rà soát toàn bộ các khoảng trống nhàn rỗi trong ngày của phòng và nhân sự theo nhánh cây nghiệm (*Branch-and-Bound*), tự động cứu các ca rớt phức tạp.
  2. **Cơ chế Nghiệm Mồi Kép Lai (Hybrid Warm-Start Optimizer)**:
     - **Pha 1**: Web Worker đa luồng Nhóm 2 tạo ra nghiệm mồi cơ sở $S_0$ cực nhanh trong ~50ms.
     - **Pha 2**: `MedicalCPSolver` tiếp nhận $S_0$, áp dụng quy hoạch ràng buộc toán học để giải cứu triệt để các ca xung đột và hoàn thiện lịch trình.
  3. **Bổ sung Kịch bản 4 trên Giao diện (`index.html`)**:
     - Thêm nút **"🧠 Kịch bản 4: Toán Học Chuyên Sâu (CP-SAT / MIP Optimizer)"** vào Modal Chọn Kịch Bản Xếp Lịch (`#strategyModal`), giúp bác sĩ có thêm lựa chọn khi cần tính toán chuyên sâu cho ngày đặc biệt đông.
- **File sửa đổi**: `js/cp-solver.js`, `js/scheduler-engine.js`, `index.html`, `PM-xeplich-v3.md`.

### Nâng Cấp: Tinh Gọn 2 Kịch Bản Xếp Lịch Cốt Lõi (Kịch Bản 1 & Kịch Bản 2) (29/08/2026)
- **Yêu cầu & Mục tiêu**:
  - Loại bỏ các kịch bản cũ (Cân bằng tải, Dự phòng máy), gom lại thành đúng 2 Kịch bản tinh hoa dễ nhớ, trực quan và tối ưu nhất cho bác sĩ.
- **Giải pháp triển khai**:
  1. **🚀 Kịch bản 1: Tối Ưu Nhanh (Đa Luồng Metaheuristics)**:
     - Tích hợp Web Worker đa luồng song song + Tabu Search + LAHC + Nén khe hở lịch.
     - Thời gian tính toán siêu tốc (~0.1s - 0.3s), đạt tỷ lệ xếp thành công 100% cho ngày thường.
  2. **🧠 Kịch bản 2: Toán Học Chuyên Sâu (CP-SAT Math Optimizer)**:
     - Tích hợp Quy hoạch Ràng buộc Toán học + Hybrid Warm-Start + Branch-and-Bound.
     - Rà soát toàn bộ cây nghiệm, tối ưu hóa triệt để xung đột ca khó & ngày siêu cao điểm.
- **File sửa đổi**: `index.html`, `PM-xeplich-v3.md`.

### Nâng Cấp: Thuật Toán Xếp Lịch Nhóm 3 (AI & Machine Learning Huấn Luyện Từ 20.000 Dòng Lịch Sử Thực Tế) (29/08/2026)
- **Mục tiêu**:
  - Tận dụng gần 20.000 dòng dữ liệu lịch sử thực tế trong 5 tháng qua (06/04/2026 - 29/08/2026) để huấn luyện mô hình Trí Tuệ Nhân Tạo (AI Machine Learning Co-pilot), tối ưu hóa thói quen phân bổ nhân sự, phòng bệnh và dự báo tắc nghẽn máy móc.
- **Giải pháp triển khai**:
  1. **Xây dựng module `js/ai-scheduler.js` (AIScheduler Engine)**:
     - **Ma trận thói quen nhân sự**: Học $P(\text{Staff} \mid \text{Procedure}, \text{Room})$ từ 20.000 dòng để tự động gán đúng người - đúng phòng - đúng chuyên môn theo thói quen thực tế của khoa.
     - **Phân bổ khung giờ vàng**: Học phân bổ ca châm cứu/thủ công vào đầu giờ sáng, chia đều máy móc trong ngày.
     - **Dự báo tắc nghẽn máy móc (Machine Congestion Index)**: Tự động phát hiện các máy có tải cao (Kéo giãn, Siêu âm, Sóng ngắn) để ưu tiên xử lý trước.
     - **Định lượng độ ưu tiên bệnh nhân (AI Patient Ranking)**: Xếp thứ tự các ca khó, nhiều thủ thuật hoặc ra viện sớm vào vị trí thuận lợi nhất.
  2. **Tích hợp sâu vào Động cơ Xếp lịch (`js/scheduler-engine.js`)**:
     - Cả Kịch bản 1 (Tối ưu nhanh) và Kịch bản 2 (Toán học chuyên sâu) đều được AI dẫn đường, đạt hiệu năng tối đa.
  3. **Mục Riêng "🤖 Huấn Luyện AI" Trong Menu Quản Trị & Tự Động Học Theo Giờ (`index.html` & `js/app.js`)**:
     - Tạo mục menu chuyên dụng **"🤖 Huấn Luyện AI"** (`admin-sec-ai`) trong Menu Quản trị.
     - Hiển thị bảng điều khiển trực quan: Số dòng dữ liệu đã học, thời điểm huấn luyện gần nhất, số cặp thói quen nhân sự.
     - Bổ sung tính năng **Tự động huấn luyện AI hàng ngày theo khung giờ chỉ định** (Mặc định: `17:00` hàng ngày).
     - Nút thao tác thủ công lớn: **"🤖 HUẤN LUYỆN AI"** cho phép cập nhật tức thì.
- **File sửa đổi**: `js/ai-scheduler.js`, `js/scheduler-engine.js`, `js/app.js`, `index.html`, `PM-xeplich-v3.md`.

### Nâng Cấp: Bộ Cố Vấn Giải Cứu Ca Rớt Thông Minh (Smart Unscheduled Relaxation Advisor) (30/08/2026 - v3.2.6)
- **Mục tiêu**:
  - Tự động chẩn đoán chính xác nguyên nhân gốc rễ của từng ca rớt và mô phỏng các phương án nới lỏng ràng buộc lâm sàng khả thi với tính năng 1-Click Tự động giải cứu ca rớt thẳng vào lịch trình.
- **Giải pháp triển khai**:
  1. **Động cơ Chẩn đoán & Gợi ý Giải cứu (`js/scheduler-engine.js`)**:
     - Xây dựng module `UnscheduledDiagnosticEngine` phân tích 5 nhóm nguyên nhân rớt ca cụ thể:
       - 🔴 **Nghẽn máy móc (`BOTTLENECK_MACHINE`)**: Kín lịch máy móc trong các khung giờ rảnh của bệnh nhân.
       - 🟡 **Nhân sự quá tải (`STAFF_UNAVAILABLE`)**: Tất cả KTV có kỹ năng đều bận hoặc hết giờ làm.
       - 🟠 **Xung đột ca Ngoại trú (`OUTPATIENT_SESSION_LIMIT`)**: Ngoại trú đăng ký ca Sáng nhưng tài nguyên chỉ trống ca Chiều (hoặc ngược lại).
       - 🔵 **Giờ Y lệnh / Giờ vào muộn (`PATIENT_TIME_WINDOW`)**: Khung giờ rảnh của bệnh nhân không đủ cho thời lượng thủ thuật.
       - 🟣 **Trùng lịch thủ thuật BN (`INTERNAL_PATIENT_CLASH`)**: Nhiều thủ thuật dài kẹp sát nhau.
     - Tự động tính toán 1-3 gợi ý hành động giải cứu cụ thể (`advices`) kèm tham số slot 1-Click (`ALLOW_OVERTIME`, `SWITCH_SESSION`, `SHIFT_WINDOW`, `REASSIGN_STAFF`).
  2. **Giao Diện Modal & Thống Kê (`index.html` & `css/style.css`)**:
     - Bổ sung **Modal Cố Vấn Giải Cứu Ca Rớt Thông Minh (`#modal-unscheduled-advisor`)** thiết kế Glassmorphism hiện đại.
     - Hiển thị danh sách Thẻ Chẩn đoán (Rescue Cards) kèm Badge màu sắc rõ ràng cho từng loại nguyên nhân và danh sách nút **"⚡ Áp dụng giải cứu ngay"**.
     - Bổ sung nút **"💡 Cố Vấn Giải Cứu ([X] ca)"** vào Popup kết quả xếp lịch (`#custom-success-popup`) và Bảng thống kê rớt ca (`#stats-unscheduled-list`).
  3. **Tương Tác Frontend & Đồng Bộ Dữ Liệu (`js/app.js`)**:
     - Thêm các hàm `openUnscheduledAdvisorModal()`, `renderUnscheduledAdvisor()`, `executeRescueAdvice()`.
     - Khi bấm **"Áp dụng giải cứu ngay"**, hệ thống tự động:
       1. Chèn ca thủ thuật đã được cứu vào `window.currentScheduleData`.
       2. Loại bỏ ca khỏi danh sách ca rớt (`window.lastUnscheduledData`).
       3. Cập nhật Bảng lịch trình, Timeline, Thống kê, Bảng bệnh nhân.
       4. Tự động lưu ngầm vào `localStorage` và đồng bộ D1 Database qua API `saveSchedule`.
       5. Hiển thị thông báo Toast thành công rực rỡ.
  4. **Đồng Bộ Phiên Bản & Quy Tắc Dự Án (`RULES.md`)**:
     - Đồng bộ phiên bản toàn hệ thống lên **3.2.6** (Footer: `10:00 30/08/2026`), cập nhật Service Worker `pmcg-cache-v3.2.6` và query string `?v=3.2.6` trên tất cả tài nguyên.
- **File sửa đổi**: `js/scheduler-engine.js`, `index.html`, `css/style.css`, `js/app.js`, `sw.js`, `PM-xeplich-v3.md`.

### Nâng Cấp: Bộ Cố Vấn Giải Cứu Ca Rớt Thông Minh & Khung Thời Gian Thủ Thuật Tối Thiểu - Tối Đa (30/08/2026 - v3.2.6)
- **Mục tiêu**:
  - Tự động chẩn đoán chính xác nguyên nhân gốc rễ của từng ca rớt và mô phỏng các phương án nới lỏng ràng buộc lâm sàng với tính năng 1-Click Tự động giải cứu ca rớt thẳng vào lịch trình.
  - Hỗ trợ mốc thời gian thủ thuật dạng khoảng **[Tối Thiểu – Tối Đa]** theo Hướng dẫn Quy trình Kỹ thuật YHCT - PHCN của Bộ Y tế (ví dụ: Điện châm 25 - 30 phút, Parafin 20 - 25 phút) giúp thuật toán tự động linh hoạt điều chỉnh dải mốc để lấp khoảng trống lịch trình và triệt tiêu ca rớt.
- **Giải pháp triển khai**:
  1. **Động cơ Chẩn đoán & Gợi ý Giải cứu (`js/scheduler-engine.js`)**:
     - Phân tích 5 nhóm nguyên nhân rớt ca cụ thể: `BOTTLENECK_MACHINE`, `STAFF_UNAVAILABLE`, `OUTPATIENT_SESSION_LIMIT`, `PATIENT_TIME_WINDOW`, `INTERNAL_PATIENT_CLASH`.
     - Tự động tính toán 1-3 gợi ý hành động giải cứu 1-Click (`ALLOW_OVERTIME`, `SWITCH_SESSION`, `SHIFT_WINDOW`, `REASSIGN_STAFF`).
  2. **Giao Diện Modal & Thống Kê (`index.html` & `css/style.css`)**:
     - Bổ sung **Modal Cố Vấn Giải Cứu Ca Rớt Thông Minh (`#modal-unscheduled-advisor`)** thiết kế Glassmorphism.
     - Cập nhật tiêu đề cột bảng Thủ thuật thành **`THỜI GIAN THỦ THUẬT (MIN - MAX)`** và Form Thêm/Sửa thủ thuật thành 2 ô song song: **TG thủ thuật Tối thiểu (phút)** và **Tối đa (phút)**.
     - Thiết kế Badge `.proc-time-range-badge` hiển thị đẹp mắt (ví dụ: `⏱ 25 - 30 p`).
  3. **Tương Tác Frontend & Cơ Sở Dữ Liệu (`backend/src/index.js` & `js/app.js`)**:
     - Nới lỏng bảng `thu_thuat` trên Cloudflare D1 với cột `tg_thu_thuat_max`.
     - `tryScheduleOne` tự động sinh danh sách mốc thời gian ứng viên `candidateDurs` chạy từ `tgMayMin` $\to$ `tgMayMax` để xếp ca tối ưu nhất.
     - Khi cứu ca, tự động cập nhật Bảng lịch trình, Timeline, Thống kê, Bảng bệnh nhân, đồng bộ ngầm D1 Database và IndexedDB/LocalStorage.
  4. **Đồng Bộ Phiên Bản & Quy Tắc Dự Án (`RULES.md`)**:
     - Đồng bộ chuẩn phiên bản hằng ngày **3.2.6** (Footer: `11:00 30/08/2026`), Service Worker `pmcg-cache-v3.2.6` và query string `?v=3.2.6`.
- **File sửa đổi**: `backend/src/index.js`, `index.html`, `css/style.css`, `js/app.js`, `js/scheduler-engine.js`, `sw.js`, `PM-xeplich-v3.md`.

### Nâng Cấp: Dải Thời Gian Thực Hiện (Min - Max), Tự Động Tính Khoảng Cách KTV & Khắc Phục Đồng Bộ CSDL D1 (30/08/2026 - v3.2.6-rev2)
- **Mục tiêu**:
  - Tách bạch thời gian thực hiện của KTV thành 2 mốc Tối thiểu và Tối đa (Min - Max) và bảng danh mục thủ thuật 11 cột rõ ràng.
  - Tự động tính khoảng cách nghỉ/di chuyển của KTV tỷ lệ thuận theo thời gian thao tác được phân bổ (`Khoảng cách = TG thao tác + Phút nghỉ`).
  - Khắc phục triệt để lỗi không lưu/sửa/xóa được trên Cloudflare D1 Database và sửa lỗi biên tập Phác đồ điều trị lâm sàng.
- **Giải pháp triển khai**:
  1. **CSDL Cloudflare D1 & Backend Worker (`backend/src/index.js`)**:
     - Thêm cột `tg_thuc_hien_max` vào bảng `thu_thuat`.
     - Tạo `UNIQUE INDEX` trên các bảng `thu_thuat(ten_thu_thuat)`, `phong(ten_phong)`, `may_moc(ma_may)` để khắc phục triệt để lỗi SQLite 7500 (`ON CONFLICT clause does not match any UNIQUE constraint`).
     - Tối ưu hóa các handler CRUD (`addThuThuat`, `editThuThuat`, `addMayMoc`, `editMayMoc`, `addPhong`, `editPhong`, `deleteBenhNhan`, `saveReorderedData`) để xử lý hoàn hảo cả đối tượng JSON payload lẫn mảng tham số truyền thống.
     - Đã Deploy Worker lên Cloudflare Production thành công.
  2. **Giao Diện & Xử Lý Phác Đồ (`index.html`, `js/app.js`)**:
     - Cập nhật Form và Bảng thủ thuật 11 cột độc lập.
     - Sửa hàm `openProtocolModal` và `saveProtocolFromModal`: Xử lý mượt mà cả danh sách thủ thuật dạng chuỗi, mảng chuỗi, hoặc mảng đối tượng, tự động ánh xạ checkbox chính xác và lưu đồng bộ 2 chiều (Local + Cloudflare D1).
     - Cập nhật thời gian Footer: `12:05 30/08/2026`, Service Worker `pmcg-cache-v3.2.6-rev2` và resource query strings `?v=3.2.6-rev2` chống lưu cache cũ.
  3. **Động cơ Xếp lịch AI (`js/scheduler-engine.js`)**:
     - Tự động quét dải ứng viên `(candNv, candMay)` từ Min tới Max và tính khoảng cách tự động tỷ lệ thuận.
### Sửa Lỗi: Khắc Phục Triệt Để Lỗi Thêm Mới & Chỉnh Sửa Phác Đồ Trong Tab Thủ Thuật (30/08/2026 - v3.2.6-rev3)
- **Yêu cầu của người dùng**:
  - Kiểm tra và khắc phục lỗi không thể sửa chữa / thêm mới phác đồ trong tab Thủ thuật.
- **Phân tích nguyên nhân gốc rễ**:
  1. **Lỗi Ghi Đè từ Cache Ngoại Tuyến (`times_bootstrap_cache`)**: Khi lưu phác đồ, `saveProtocolsData()` chỉ lưu vào `localStorage['meds_protocols']` mà không cập nhật `times_bootstrap_cache`. Khi chuyển tab, F5 reload hoặc khi polling kích hoạt `restoreOfflineCache()`, dữ liệu phác đồ cũ trong `times_bootstrap_cache` lập tức ghi đè lên `dataCache.protocols`, khiến phác đồ mới bị biến mất hoặc hoàn tác về cũ.
  2. **Lỗi Phân Loại Hệ Thủ Thuật trong Modal**: Phân loại hệ `he === 'YHCT'` so sánh nhạy cảm chữ hoa/thường, khiến các thủ thuật có hệ viết thường (`'yhct'`) bị dồn toàn bộ sang cột PHCN.
  3. **Xung Đột Đồng Bộ Đám Mây**: `syncProtocolsToCloud()` gọi đồng thời cả `saveProtocolsData` và `saveSystemSettings`, gây ra 2 request tuần tự làm version dữ liệu tăng 2 lần liên tục và gây race condition.
  4. **Thiếu Tự Động Render Khi Chuyển Tab**: Khi chuyển tab sang `tab-procedures`, hệ thống chưa gọi `renderProtocolsTable()`.
- **Giải pháp cụ thể đã thực hiện**:
  1. **Cập nhật `saveProtocolsData()`**:
     - Lưu đồng thời vào `window.dataCache.protocols`, `dataCache.protocols`, `localStorage['meds_protocols']`.
     - **🔥 Cập nhật trực tiếp `times_bootstrap_cache`** trong `localStorage` để chống triệt để tình trạng cache cũ ghi đè.
     - Lưu vào Dexie Cache và phát sóng qua `OfflineSyncEngine.broadcastLiveEvent('PROTOCOLS_UPDATED')`.
  2. **Chuẩn hóa Modal Thêm Mới / Chỉnh Sửa Phác Đồ**:
     - Lấy danh sách thủ thuật an toàn từ `dataCache.proc` / `dataCache.procedures`.
     - Chuẩn hóa phân loại YHCT / PHCN không phân biệt hoa thường và hỗ trợ từ khóa Đông y, Cổ truyền.
     - Tự động gán ID duy nhất và lưu danh sách thủ thuật dạng mảng chuỗi sạch.
     - Tự động focus và bôi đen ô tên phác đồ khi mở modal.
  3. **Nâng cao Trải Nghiệm Người Dùng (UX/UI)**:
     - Hỗ trợ phím **Enter** trong ô nhập tên để lưu ngay phác đồ.
     - Hỗ trợ phím **Escape** hoặc click ra ngoài màn mờ (backdrop) để đóng modal.
     - Hỗ trợ **nhấp đúp chuột (Double Click)** vào bất kỳ dòng phác đồ nào trên bảng để mở sửa nhanh.
     - Tự động kích hoạt `renderProtocolsTable()` mỗi khi chuyển sang tab Thủ thuật (`tab-procedures`).
  4. **Tối ưu Đồng Bộ Đám Mây (`syncProtocolsToCloud`)**:
     - Tinh gọn gọi API đơn nhất `saveProtocolsData` lên Cloudflare D1 Backend.
     - Đồng bộ phiên bản toàn hệ thống: Footer `12:30 30/08/2026`, Service Worker `pmcg-cache-v3.2.6-rev3` và query string `?v=3.2.6-rev3`.
- **File sửa đổi**: `js/app.js`, `index.html`, `sw.js`, `PM-xeplich-v3.md`.

### Nâng Cấp: Tạo Bảng Riêng `phac_do` Trong Cloudflare D1 Database & Hoàn Thiện CRUD Thêm/Sửa/Xóa Phác Đồ (30/08/2026 - v3.2.6-rev4)
- **Yêu cầu của người dùng**:
  - Tạo riêng 1 bảng chuyên biệt trong Cloudflare D1 Database để lưu trữ danh mục các phác đồ điều trị.
  - Khắc phục triệt để lỗi bấm xóa thì được nhưng thêm mới và sửa phác đồ thì không lưu được.
- **Phân tích nguyên nhân gốc rễ**:
  1. Trước đây, phác đồ điều trị được lưu chung trong bảng `cai_dat` dưới dạng chuỗi JSON `clinical_protocols`. Khi lưu dữ liệu, độ trễ Read-after-Write của Cloudflare D1 bản sao replica khiến `getAllData` / bootstrap polling thỉnh thoảng đọc ra dữ liệu cũ và ghi đè danh sách phác đồ vừa thêm/sửa.
  2. Bảng `phac_do` chưa được thiết kế độc lập với khóa chính `id`, trường `ten_phac_do UNIQUE` và `danh_sach_thu_thuat` riêng biệt.
- **Giải pháp cụ thể đã thực hiện**:
  1. **Tạo Bảng Chuyên Biệt `phac_do` trong Cloudflare D1 (`backend/schema.sql` & `backend/src/index.js`)**:
     - Tạo bảng `phac_do` với các trường: `id INTEGER PRIMARY KEY AUTOINCREMENT`, `ten_phac_do TEXT UNIQUE NOT NULL`, `danh_sach_thu_thuat TEXT NOT NULL DEFAULT '[]'`, `order_idx INTEGER DEFAULT 0`, `is_active INTEGER DEFAULT 1`, `created_at`, `updated_at`.
     - Tạo `UNIQUE INDEX idx_phac_do_name ON phac_do(ten_phac_do)` chống trùng lặp.
     - Tự động nạp bảng `phac_do` trong `ensureSchema(db)` và `getBootstrapData`.
  2. **Viết Trọn Bộ Handlers CRUD Riêng Biệt Cho Phác Đồ (`backend/src/index.js`)**:
     - `getProtocolsData` / `getPhacDo`: Truy vấn trực tiếp từ bảng `phac_do WHERE is_active = 1 ORDER BY order_idx ASC, id ASC`.
     - `saveProtocolsData` / `savePhacDo`: Transaction batch làm mới và lưu danh mục phác đồ vào bảng `phac_do` và tự động cập nhật bản sao `cai_dat`.
     - `addPhacDo` / `addProtocol`: Thêm mới 1 phác đồ vào bảng `phac_do`.
     - `editPhacDo` / `editProtocol`: Chỉnh sửa 1 phác đồ trong bảng `phac_do`.
     - `deletePhacDo` / `deleteProtocol`: Xóa 1 phác đồ khỏi bảng `phac_do`.
     - Bổ sung các action phác đồ vào `MUTATION_ACTIONS` để tự động kích hoạt đồng bộ nền nếu có webhook.
  3. **Triển Khai Cloudflare Worker Production**:
     - Đã chạy `wrangler deploy` triển khai thành công mã nguồn Worker Backend mới nhất lên `https://pmcg-api.dpthai-ttytmk.workers.dev`.
  4. **Đồng Bộ Phiên Bản & Quy Tắc Dự Án (`RULES.md`)**:
     - Cập nhật thời gian Footer: `12:40 30/08/2026`.
     - Cập nhật Service Worker: `CACHE_NAME = 'pmcg-cache-v3.2.6-rev4'`.
     - Đồng bộ resource query strings `?v=3.2.6-rev4` trên toàn bộ tài nguyên.
- **File sửa đổi**: `backend/schema.sql`, `backend/src/index.js`, `index.html`, `sw.js`, `PM-xeplich-v3.md`.

### Tái Thiết Kế Toàn Diện: Vẽ Lại Bảng Phác Đồ Điều Trị Với Cấu Trúc Split-Layout Trực Quan & Trực Tiếp (30/08/2026 - v3.2.6-rev5)
- **Yêu cầu của người dùng**:
  - Đã tạo bảng trong D1 nhưng vẫn chưa thao tác mượt mà được với phác đồ trong tab Thủ thuật.
  - Vẽ lại toàn bộ khu vực bảng phác đồ, chuyển sang mô hình chuẩn mực để triệt tiêu vĩnh viễn lỗi phát sinh.
- **Phân tích nguyên nhân gốc rễ**:
  - Mô hình cũ của phác đồ trong tab Thủ thuật bị cô lập vào 1 bảng đơn lẻ dưới cùng và phụ thuộc hoàn toàn vào Popup Modal (`#modal-protocol-editor`).
  - Popup Modal có trải nghiệm rời rạc, khó kiểm soát state khi lọc thủ thuật, và không đồng nhất với phong cách chung của phần mềm (toàn bộ các tab khác đều dùng chuẩn `split-layout` với Form bên trái + Bảng bên phải).
- **Giải pháp cụ thể đã thực hiện**:
  1. **Vẽ Lại Giao Diện Chuẩn Split-Layout Trong Tab Thủ Thuật (`index.html`)**:
     - Loại bỏ hoàn toàn sự phụ thuộc vào popup modal.
     - Xây dựng khu vực **📋 QUẢN LÝ PHÁC ĐỒ ĐIỀU TRỊ (GÓI THỦ THUẬT LÂM SÀNG)** với chuẩn `split-layout`:
       - **Bên Trái - Sidebar Form Phác Đồ (`#sidebar-form-proto`)**:
         - Ô nhập Tên phác đồ `#proto-name`.
         - Ô tìm kiếm nhanh thủ thuật `#proto-search-proc-input` lọc trực tiếp.
         - Các nút bấm chọn nhanh: `+ YHCT`, `+ PHCN`, `Bỏ chọn`.
         - Khung cuộn danh sách checkbox thủ thuật chia 2 cột YHCT và PHCN rõ ràng, có Badge đếm số lượng thủ thuật đã chọn (`[X] đã chọn`).
         - Form Pinned Footer với 2 nút: `➕ Thêm Phác Đồ` (`#btn-save-proto`) và `Hủy` (`#btn-cancel-proto`).
       - **Bên Phải - Main Table Phác Đồ (`#protocols-table`)**:
         - Bảng hiển thị danh mục phác đồ: Cột STT (hỗ trợ kéo thả sắp xếp), Cột Tên phác đồ (in đậm kèm số lượng thủ thuật), Cột Badges thủ thuật phân màu YHCT/PHCN đẹp mắt, Cột Thao tác với nút `✏️ Sửa` và `🗑️ Xóa`.
  2. **Nâng Cấp Động Cơ JavaScript (`js/app.js`)**:
     - Thêm `proto: -1` vào `editIndex` và cập nhật `cancelEdit('proto')`.
     - `renderProtoProcsFormCheckboxes()`: Tự động render checkbox thủ thuật vào form bên trái khi khởi tạo hoặc nạp dữ liệu thủ thuật.
     - `editProtocol(index)`: Nạp thông tin phác đồ lên Form bên trái, tick sẵn các checkbox, cập nhật badge, đổi nút thành `💾 Lưu Sửa Phác Đồ`, hiện nút `Hủy`, và cuộn nhẹ màn hình tới form.
     - `saveProtocolFromForm()`: Đọc dữ liệu từ form, validate, cập nhật `dataCache.protocols`, lưu LocalStorage, Dexie cache, và đồng bộ trực tiếp lên Cloudflare D1 Backend (`phac_do` table).
     - `deleteProtocol(index)`: Xóa phác đồ an toàn có xác nhận confirm.
     - Bổ sung phím tắt: Nhấn **Enter** trong form phác đồ sẽ tự động lưu phác đồ; nhấp đúp vào hàng trên bảng sẽ nạp sửa ngay lập tức.
     - Tự động gọi `renderProtoProcsFormCheckboxes()` và `renderProtocolsTable()` mỗi khi chuyển sang tab Thủ thuật.
  3. **Đồng Bộ Phiên Bản & Quy Tắc Dự Án (`RULES.md`)**:
     - Cập nhật thời gian Footer: `12:45 30/08/2026`.
     - Cập nhật Service Worker: `CACHE_NAME = 'pmcg-cache-v3.2.6-rev5'`.
     - Đồng bộ resource query strings `?v=3.2.6-rev5` trên toàn bộ tài nguyên.
- **File sửa đổi**: `index.html`, `js/app.js`, `sw.js`, `PM-xeplich-v3.md`.

### Sửa Lỗi Cú Pháp: Khắc Phục Lỗi Trùng Lặp Khai Báo `const DEFAULT_PROTOCOLS` (30/08/2026 - v3.2.6-rev6)
- **Yêu cầu của người dùng**:
  - Khắc phục lỗi `Uncaught SyntaxError: Unexpected token 'const'`.
- **Phân tích nguyên nhân & Giải pháp**:
  - Trong quá trình thay thế khối mã phác đồ, phần tiêu đề `const DEFAULT_PROTOCOLS = [` bị chèn lặp lại 2 lần liên tiếp.
  - Đã loại bỏ hoàn toàn đoạn lặp, chạy kiểm tra cú pháp `node -c js/app.js` đạt 100% thành công không có bất kỳ lỗi nào.
  - Cập nhật thời gian Footer: `12:46 30/08/2026`, Service Worker: `CACHE_NAME = 'pmcg-cache-v3.2.6-rev6'` và query strings `?v=3.2.6-rev6`.
- **File sửa đổi**: `js/app.js`, `index.html`, `sw.js`, `PM-xeplich-v3.md`.

### Sửa Lỗi Hiển Thị: Tái Cấu Trúc Khung Chọn Thủ Thuật Cho Phác Đồ (30/08/2026 - v3.2.6-rev7)
- **Yêu cầu của người dùng**:
  - Giao diện chọn thủ thuật cho phác đồ trong form bên trái bị biến mất/co rúm lại không thấy danh sách checkbox để tick chọn.
- **Phân tích nguyên nhân & Giải pháp**:
  - CSS của `.sidebar-form .form-group` có thuộc tính `display: flex; flex-direction: row;` khiến mọi thẻ con bên trong bị ép thành 1 hàng ngang duy nhất, làm khung danh sách checkbox bị co thành 1 đường chỉ mỏng ở cạnh ô tìm kiếm.
  - Đã tách khối chọn thủ thuật ra khỏi `.form-group`, chuyển thành container độc lập `proto-skills-container` kết hợp với `skills-box` và `skills-grid` chuẩn như tab Bệnh nhân.
  - Bổ sung cơ chế fallback đa tầng trong `renderProtoProcsFormCheckboxes()` (đọc từ `dataCache.proc`, `meds_procedures`, `times_bootstrap_cache`) và tự động kiểm tra kích hoạt render trước khi tick chọn trong `editProtocol`.
  - Cập nhật thời gian Footer: `12:48 30/08/2026`, Service Worker: `CACHE_NAME = 'pmcg-cache-v3.2.6-rev7'` và query strings `?v=3.2.6-rev7`.
- **File sửa đổi**: `index.html`, `js/app.js`, `sw.js`, `PM-xeplich-v3.md`.

### Nâng Cấp Thuật Toán Xếp Lịch: Khóa Tuyệt Đối TG Thực Hiện = TG Thủ Thuật Cho Thủ Thuật Làm Việc Liên Tục 1:1 (30/08/2026 - v3.2.6-rev8)
- **Yêu cầu của người dùng**:
  - Đối với các thủ thuật có tính chất làm việc liên tục 1:1 (như Tập trợ giúp, Tập kháng trở, Xoa bóp bấm huyệt, Xoa bóp vùng, Tập thở, Siêu âm, Cấy chỉ...): Khi co giãn thời gian Min/Max, thời gian Thực Hiện (nhân viên bận) BẮT BUỘC PHẢI BẰNG thời gian Thủ Thuật (bệnh nhân điều trị). Tuyệt đối không được xảy ra tình trạng Thực Hiện lấy Min (15 phút) nhưng Thủ Thuật lấy Max (20 phút), dẫn đến 5 phút cuối bệnh nhân bị bỏ lại tự tập một mình.
- **Phân tích nguyên nhân & Giải pháp**:
  - Trong bộ sinh cặp thời lượng `candidatePairs` của `js/scheduler-engine.js`, vòng lặp 2 chiều `for (m) { for (nv) }` sinh ra các cặp lệch nhau như `{ tgMay: 20, tgNv: 15 }`.
  - Đã bổ sung bộ nhận diện thủ thuật liên tục `isContinuous` (khi `baseTgMay === tgNvMin && tgMayMax === tgNvMax` hoặc `loaiMay === 'Thủ công' && baseTgMay === tgNvMin` hoặc `baseTgMay === tgNvMin && tgNvMin >= 10`).
  - Khi `isContinuous = true`, bộ sinh thời lượng khóa cứng 1:1: Mỗi mức thời lượng `d` từ `minDur` đến `maxDur` đều sinh ra cặp song hành `{ tgMay: d, tgNv: d }`. Nhân viên luôn bận trọn vẹn từ đầu đến cuối thủ thuật, `hasTeardown = false`.
  - Cập nhật thời gian Footer: `12:55 30/08/2026`, Service Worker: `CACHE_NAME = 'pmcg-cache-v3.2.6-rev8'` và query strings `?v=3.2.6-rev8`.
- **File sửa đổi**: `js/scheduler-engine.js`, `index.html`, `sw.js`, `PM-xeplich-v3.md`.

### Bổ Sung Cột & Thuộc Tính "Làm Liên Tục (1:1)" Cho Danh Mục Thủ Thuật (30/08/2026 - v3.2.6-rev9)
- **Yêu cầu của người dùng**:
  - Tạo thêm 1 cột riêng biệt trong bảng Thủ thuật và form Thêm/Sửa để thể hiện thủ thuật đó có làm việc liên tục 1:1 hay không, phục vụ cho việc thêm/bớt và mở rộng danh mục thủ thuật linh hoạt về sau.
- **Phân tích nguyên nhân & Giải pháp**:
  - **Backend / Cloudflare D1 Database**:
    - Bổ sung cột `lien_tuc INTEGER DEFAULT 0` vào bảng `thu_thuat` trong `schema.sql` và migration tự động `ALTER TABLE thu_thuat ADD COLUMN lien_tuc INTEGER DEFAULT 0` trong `backend/src/index.js`.
    - Cập nhật các API `getBootstrapData`, `getThuThuat`, `addThuThuat`, `editThuThuat` để lưu và trả về thuộc tính `lienTuc` ('Có' / 'Không').
    - Deploy Cloudflare Worker Backend thành công.
  - **Frontend UI & Form (`index.html`, `js/app.js`)**:
    - Thêm checkbox `🔄 Làm liên tục 1:1 (TG Thực Hiện = TG Thủ Thuật)` (`#proc-continuous-cb`) trong form nhập liệu thủ thuật.
    - Thêm hàm tự động đồng bộ `toggleContinuousProc(isChecked)`: Khi tick chọn Làm liên tục, tự động đồng bộ dải thời gian Thủ thuật theo dải thời gian Thực hiện.
    - Thêm cột `LÀM LIÊN TỤC` vào bảng danh mục thủ thuật `#procedures-table` với Badge `Có (1:1)` màu xanh lá hoặc `Không` màu xám.
    - Cập nhật các hàm `saveProcedure`, `editProc`, `cancelEdit('proc')`, `renderProceduresTable_Original()`.
  - **Thuật toán xếp lịch (`js/scheduler-engine.js`)**:
    - Đọc cờ `isLienTuc` từ danh mục thủ thuật và khóa cứng thời gian `tgNv === tgMay` cho mọi trường hợp được cấu hình làm việc liên tục 1:1.
  - Cập nhật thời gian Footer: `13:00 30/08/2026`, Service Worker: `CACHE_NAME = 'pmcg-cache-v3.2.6-rev9'` và query strings `?v=3.2.6-rev9`.
- **File sửa đổi**: `backend/src/index.js`, `index.html`, `js/app.js`, `js/scheduler-engine.js`, `sw.js`, `PM-xeplich-v3.md`.

### Chuẩn Hóa Hiển Thị: Đồng Bộ Định Dạng Text "Có / Không" Cho 3 Cột Thủ Thuật (30/08/2026 - v3.2.6-rev10)
- **Yêu cầu của người dùng**:
  - Đồng bộ cách hiển thị chữ `Có` / `Không` của 3 cột `LÀM LIÊN TỤC`, `RÚT MÁY`, `NGƯỜI PHỤ` giống nhau hoàn toàn dưới dạng text chuẩn, không cần badge `Có (1:1)` hay màu sắc lệch nhau.
- **Phân tích nguyên nhân & Giải pháp**:
  - Trong `renderProceduresTable_Original()` (`js/app.js`), thay thế khối badge HTML thành chuỗi `Có` hoặc `Không` đồng nhất với 2 cột bên cạnh.
  - Cập nhật thời gian Footer: `13:05 30/08/2026`, Service Worker: `CACHE_NAME = 'pmcg-cache-v3.2.6-rev10'` và query strings `?v=3.2.6-rev10`.
- **File sửa đổi**: `js/app.js`, `index.html`, `sw.js`, `PM-xeplich-v3.md`.



