const fs = require('fs');

const entry = `
### Cập nhật 21/08/2026 (v3.2.0)
- **Lỗi:** Giao diện bị đứng ở trạng thái "Đang tải...", không hiển thị dữ liệu phòng, máy, nhân sự, thủ thuật.
- **Nguyên nhân:** Khi đổi tên các thuộc tính trong đối tượng trả về của API \`getBootstrapData\` trong \`backend/src/index.js\` ở v3.1.8, các key như \`machines\`, \`rooms\`, \`procedures\`, \`staff\`, \`patients\` bị đổi thành tiếng Việt (\`may_moc\`, \`phong\`, \`thu_thuat\`, \`nhan_su\`, \`benh_nhan\`). Do đó frontend JS không đọc được thuộc tính cũ dẫn đến treo ở trạng thái "Đang tải...". Thêm vào đó, câu lệnh return ở \`getBootstrapData\` bị tham chiếu nhầm tên biến local (\`machines\` thay vì \`may_moc\`).
- **Giải pháp:** Sửa đổi \`getBootstrapData\` và các API endpoint trong Worker để luôn trả về cả 2 định dạng property key (English API contract và Vietnamese alias): \`patients\`/\`benh_nhan\`, \`staff\`/\`nhan_su\`, \`machines\`/\`may_moc\`, \`rooms\`/\`phong\`, \`procedures\`/\`thu_thuat\`, \`accounts\`/\`tai_khoan\`. Đã re-deploy Cloudflare Worker và test phản hồi thành công (17 nhân sự, 63 máy, 6 phòng, 16 thủ thuật).
- **File:** \`backend/src/index.js\` (deploy), \`index.html\` (v3.2.0)
`;

fs.appendFileSync('PM-xeplich-v3.md', entry, 'utf8');
console.log('Appended to PM-xeplich-v3.md successfully.');
