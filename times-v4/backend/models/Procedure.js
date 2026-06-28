const mongoose = require('mongoose');

const procedureSchema = new mongoose.Schema({
  ten: { type: String, required: true, unique: true },
  vietTat: { type: String },
  he: { type: String },
  phanLoai: { type: String },
  may: { type: String, default: 'Thủ công' },
  thoiGianThucHien: { type: Number, default: 5 }, // Thời gian nhân viên làm (phút)
  thoiGianThuThuat: { type: Number, default: 15 }, // Tổng thời gian thủ thuật (máy chạy)
  khoangCach: { type: Number, default: 5 }, // Khoảng cách giữa 2 ca
  canRutMay: { type: Boolean, default: false },
  canNguoiPhu: { type: Boolean, default: false },
  dsNguoiPhu: [{ type: String }] // Danh sách role hoặc kỹ năng người phụ
}, { timestamps: true });

module.exports = mongoose.model('Procedure', procedureSchema);
