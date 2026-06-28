const mongoose = require('mongoose');

const machineSchema = new mongoose.Schema({
  tenLoai: { type: String, required: true },
  maMay: { type: String, required: true, unique: true },
  trangThai: { type: String, default: 'Sẵn sàng' }
}, { timestamps: true });

module.exports = mongoose.model('Machine', machineSchema);
