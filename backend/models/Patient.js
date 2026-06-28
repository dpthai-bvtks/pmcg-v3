const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  ten: { type: String, required: true },
  namSinh: { type: String },
  ngayVao: { type: String }, // DD/MM/YYYY
  gioVao: { type: String }, // Giờ có mặt
  gioBan: { type: String }, // Khung giờ bận
  gioRa: { type: String }, // Giờ yêu cầu hoàn thành
  phong: { type: String }, // Phòng thực hiện
  thuThuat: [{ type: String }], // Danh sách các thủ thuật cần làm
  // Bổ sung các trường phục vụ xếp lịch
  status: { type: String, default: 'pending' },
  scheduledInfo: [{
    procedure: { type: String },
    machine: { type: String },
    bed: { type: String },
    mainStaff: { type: String },
    subStaff: { type: String },
    startTime: { type: String },
    endTime: { type: String }
  }]
}, { timestamps: true });

// Tạo compound index để tìm kiếm nhanh
patientSchema.index({ ten: 1, namSinh: 1 });

module.exports = mongoose.model('Patient', patientSchema);
