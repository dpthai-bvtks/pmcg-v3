# 🤖 Project Rules for AI Assistants

*Đây là bộ quy tắc bắt buộc áp dụng cho mọi tương tác của AI trong tương lai đối với project này.*

## 1. 🧪 Kiểm tra trước khi đẩy code (Test Before Push)
**Tuyệt đối không push code mù.** 
Trước khi đẩy code lên Github, AI phải tự rà soát cú pháp, logic và các rủi ro tiềm ẩn để đảm bảo không phát sinh lỗi vặt. Tránh tình trạng push code bị lỗi khiến quá trình sửa chữa trở nên phức tạp, dây chuyền và mất thời gian của người dùng.

## 2. 🔄 Sao lưu & Quản lý phiên bản (Version Control)
Ngay sau khi hoàn tất một yêu cầu chỉnh sửa và đã chắc chắn code hoạt động tốt, **bắt buộc** thực hiện lệnh Git để push code mới nhất lên nhánh `main` của repository (`https://github.com/dpthai-bvtks/pmcg-v3`).
- **Phạm vi:** Cập nhật toàn bộ các file đã sửa như `index.html` (frontend), `code.gs-v2.txt` (backend Apps Script), và tài liệu liên quan.
- **Commit:** Viết commit message rõ ràng, ngắn gọn và mô tả đúng chức năng vừa làm (sử dụng tiền tố `feat:`, `fix:`, `refactor:`, ...).

## 3. 📝 Nhật ký công việc (Chat Log Archiving)
Sau mỗi phiên làm việc hoặc khi giải quyết xong một vấn đề lớn, **bắt buộc** phải ghi tóm tắt vào cuối file `PM-xeplich-v3.md`.
- **Nội dung:** Ghi rõ yêu cầu của người dùng là gì, phân tích nguyên nhân lỗi (nếu có), và giải pháp cụ thể đã thực hiện.
- **Mục đích:** Giúp các AI ở phiên làm việc sau (hoặc sau khi bị reset) có thể đọc và hiểu ngay ngữ cảnh dự án mà không cần hỏi lại.

## 4. 🧹 Dọn dẹp thư mục (Cleanup)
- Sau khi hoàn thành yêu cầu, **bắt buộc** phải xóa bỏ mọi file script tạm thời, file test hoặc file rác được AI tạo ra trong quá trình debug. Giữ cho thư mục làm việc của dự án luôn sạch sẽ và nguyên trạng.

## 5. 🏷️ Đồng bộ số phiên bản & Thời gian cập nhật (Version & Timestamp Synchronization)
- Mỗi khi có bản nâng cấp hoặc sửa lỗi mới, **bắt buộc**:
  + Đồng bộ tăng số phiên bản ở phần **Footer** (`🏷️ Phiên bản: X.XX` trong `index.html`).
  + Cập nhật chính xác ngày giờ hiện tại tại dòng **Cập nhật lần cuối** ở **Footer** (`⏱ Cập nhật lần cuối: HH:mm DD/MM/YYYY` trong `index.html`).
  + Đồng bộ phiên bản cho **toàn bộ các thẻ tài nguyên** (`css/style.css?v=X.XX`, `js/app.js?v=X.XX`, `favicon...`, v.v.) để chống lưu cache trình duyệt cũ.


