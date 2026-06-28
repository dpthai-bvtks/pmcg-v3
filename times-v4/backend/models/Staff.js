const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  ten: { type: String, required: true, unique: true },
  vaiTro: { type: String, required: true }, // VD: Bác sĩ, Điều dưỡng, Kỹ thuật viên
  trangThai: { type: String, default: 'Đang làm việc' },
  thoiGianLam: [{ type: String }], // VD: ["07:00 - 11:30", "13:30 - 16:30"]
  kyNang: [{ type: String }], // Danh sách các thủ thuật làm được
  gioBan: [{ type: String }], // Danh sách các khung giờ bận cá nhân
  nguoiThayThe: { type: String, default: 'Không' }
}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);
