const mongoose = require('mongoose');

const scheduleHistorySchema = new mongoose.Schema({
  ngayChot: { type: Date, default: Date.now },
  ngayDuKien: { type: String }, // Ngày xếp lịch dạng YYYY-MM-DD
  schedule: { type: Array, default: [] },
  unscheduled: { type: Array, default: [] },
  lichSuNhanSu: [{
    ten: String,
    vaiTro: String,
    gioBan: [String] // Nguyên trạng giờ bận của nhân viên
  }],
  lichSuBenhNhan: [{
    ten: String,
    namSinh: String,
    phong: String,
    gioBan: String,
    gioRa: String // Nguyên trạng giờ ra của bệnh nhân
  }]
}, { timestamps: true });

// Index để truy vấn lịch sử theo ngày
scheduleHistorySchema.index({ ngayChot: -1 });

module.exports = mongoose.model('ScheduleHistory', scheduleHistorySchema);
