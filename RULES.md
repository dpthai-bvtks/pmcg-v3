# 🤖 Project Rules for AI Assistants (PM-XepLich v3)

*Đây là bộ quy tắc bắt buộc áp dụng cho mọi tương tác của AI trong tương lai đối với project này.*

---

## 1. 🧪 Kiểm tra trước khi đẩy code (Test Before Push)
- **Tuyệt đối không push code mù.** 
- Trước khi đẩy code lên Github hay Cloudflare, AI phải tự rà soát cú pháp bằng lệnh:
  `node -c js/app.js && node -c js/scheduler-engine.js && node -c backend/src/index.js`
- Đảm bảo logic và tính toàn vẹn của ứng dụng, không làm phát sinh lỗi vặt hoặc lỗi cú pháp gây gián đoạn hệ thống.

---

## 2. 🏷️ Đồng bộ số phiên bản, Footer Timestamp & Cache Buster
Mỗi khi có bản nâng cấp hoặc sửa đổi code, **bắt buộc** thực hiện đồng bộ 3 vị trí:
1. **Footer Timestamp trong `index.html`**:
   - Cập nhật chính xác ngày giờ hiện tại tại dòng:
     `⏱ Cập nhật lần cuối: HH:mm DD/MM/YYYY` (ví dụ: `14:15 30/08/2026`).
2. **Cache Buster Query Strings trong `index.html`**:
   - Tăng số revision cho các thẻ nạp script và stylesheet:
     `js/app.js?v=3.2.6-revN`, `js/scheduler-engine.js?v=3.2.6-revN`, `sw.js?v=3.2.6-revN`...
3. **Service Worker Cache Name trong `sw.js`**:
   - Đổi tên cache đệm tương ứng: `const CACHE_NAME = 'pmcg-cache-v3.2.6-revN';` để đảm bảo trình duyệt người dùng luôn nhận bản mới nhất ngay tức thì.

---

## 3. 🚀 Tự động Deploy lên Cloudflare Toàn diện & Báo cáo kết quả
Hệ thống hiện tại chạy 100% trên nền tảng Cloudflare. Sau mỗi lần sửa đổi, AI **bắt buộc tự động chạy lệnh deploy** từ thư mục `backend`:
- **Chỉ sửa Frontend (HTML/JS/CSS/Assets):**
  Chạy lệnh trong `backend/`: `npm run deploy:web` (đẩy trực tiếp lên Cloudflare Pages `pmcg-v3`).
- **Sửa cả Backend Worker / Database API:**
  Chạy lệnh trong `backend/`: `npm run deploy:all` (deploy cả Worker `pmcg-api` và Pages `pmcg-v3`).
- **Kiểm tra trạng thái:** Đảm bảo kết quả trả về `Deployment complete!` và trang web `https://pmcg-v3.pages.dev` / `https://www.xeplichthuthuat.io.vn` hoạt động bình thường.

---

## 4. 🔄 Sao lưu & Quản lý phiên bản trên GitHub (GitHub Main Branch)
Ngay sau khi kiểm tra và deploy Cloudflare thành công, **bắt buộc** đẩy toàn bộ mã nguồn lên GitHub:
- **Lệnh thực hiện:** `git add .`, `git commit -m "..."`, `git push origin main`.
- **Commit Message:** Rõ ràng, mô tả đúng nội dung vừa làm với các tiền tố chuẩn (`feat:`, `fix:`, `style:`, `refactor:`, `perf:`...).
- **Repository:** `https://github.com/dpthai-bvtks/pmcg-v3` (nhánh `main`).

---

## 5. 📝 Ghi nhật ký phát triển (Chat Log Archiving)
Sau mỗi lần giải quyết xong một yêu cầu hoặc nâng cấp tính năng, **bắt buộc** ghi thêm vào cuối file `PM-xeplich-v3.md`:
- **Tiêu đề mục:** Tên tính năng/Lỗi được sửa + Phiên bản & Ngày tháng (ví dụ: `### Sửa Lỗi... (30/08/2026 - v3.2.6-revN)`).
- **Nội dung:**
  + *Yêu cầu của người dùng*: Mô tả ngắn gọn vấn đề/mong muốn.
  + *Phân tích nguyên nhân & Giải pháp*: Chi tiết kỹ thuật đã thực hiện.
  + *File sửa đổi*: Danh sách cụ thể các file đã can thiệp.
- **Mục đích:** Đảm bảo tính liên tục của dự án khi chuyển giao phiên làm việc cho các AI khác.

---

## 6. 🧹 Dọn dẹp thư mục & Báo cáo kết quả cho người dùng
- Xóa bỏ mọi file tạm, file scratch hoặc file test phát sinh trong quá trình làm việc.
- Trả lời người dùng ngắn gọn, súc tích:
  + Tóm tắt những thay đổi đã hoàn thành.
  + Báo cáo trạng thái Deploy Cloudflare (kèm link kiểm tra).
  + Báo cáo trạng thái Git commit/push.
