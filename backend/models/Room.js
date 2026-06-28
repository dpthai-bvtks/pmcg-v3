const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  tenPhong: { type: String, required: true, unique: true },
  bacSi: [{ type: String }],
  ktv: [{ type: String }],
  danhSachMay: [{ type: String }],
  soGiuong: { type: Number, default: 15 },
  danhSachGiuong: [{ type: String }] // Tên định danh các giường
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
