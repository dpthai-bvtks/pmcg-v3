const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Machine = require('../models/Machine');
const Procedure = require('../models/Procedure');
const Staff = require('../models/Staff');
const Room = require('../models/Room');
const Patient = require('../models/Patient');

const DATA_DIR = path.join(__dirname, '../data');

// Utility function to read CSV
function readCSV(filename) {
  return new Promise((resolve, reject) => {
    const results = [];
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`Bỏ qua: Không tìm thấy file ${filename}`);
      return resolve([]);
    }
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

// Ensure arrays are parsed correctly from string
function parseArray(str) {
  if (!str) return [];
  return str.split(',').map(s => s.trim()).filter(s => s);
}

async function importData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Đã kết nối MongoDB Atlas. Bắt đầu Import...');

    // 1. Machines
    const machines = await readCSV('machines.csv');
    if (machines.length > 0) {
      await Machine.deleteMany({});
      const machineDocs = machines.map(m => ({
        tenLoai: m['Tên Loại'] || m.tenLoai,
        maMay: m['Mã Máy'] || m.maMay,
        trangThai: m['Trạng Thái'] || m.trangThai || 'Sẵn sàng'
      })).filter(m => m.maMay);
      if(machineDocs.length > 0) await Machine.insertMany(machineDocs);
      console.log(`✅ Đã import ${machineDocs.length} Máy móc.`);
    }

    // 2. Procedures
    const procedures = await readCSV('procedures.csv');
    if (procedures.length > 0) {
      await Procedure.deleteMany({});
      const procDocs = procedures.map(p => ({
        stt: p['STT'] || p.stt,
        ten: p['Tên'] || p.ten,
        vietTat: p['Viết Tắt'] || p.vietTat,
        he: p['Hệ'] || p.he,
        may: p['Loại Máy'] || p.may,
        thoiGianThuThuat: parseInt(p['Thời Gian Thủ Thuật']) || parseInt(p.thoiGianThuThuat) || 15,
        thoiGianThucHien: parseInt(p['Thời Gian Thực Hiện']) || parseInt(p.thoiGianThucHien) || 5,
        khoangCach: parseInt(p['Khoảng Cách']) || parseInt(p.khoangCach) || 5,
        canNguoiPhu: String(p['Càn Người Phụ']).trim() === 'Có' || p.canNguoiPhu === true || p.canNguoiPhu === 'Có',
        dsNguoiPhu: parseArray(p['DS Người Phụ'] || p.dsNguoiPhu),
        canRutMay: String(p['Cần Rút Máy']).trim() === 'Có' || p.canRutMay === true || p.canRutMay === 'Có'
      })).filter(p => p.ten);
      if(procDocs.length > 0) await Procedure.insertMany(procDocs);
      console.log(`✅ Đã import ${procDocs.length} Thủ thuật.`);
    }

    // 3. Staff
    const staff = await readCSV('staff.csv');
    if (staff.length > 0) {
      console.log("Staff first row keys:", Object.keys(staff[0]));
      await Staff.deleteMany({});
      const staffDocs = staff.map(s => ({
        ten: s['Tên'] || s.ten,
        he: s['Hệ'] || s.he,
        vaiTro: s['Vai Trò'] || s.vaiTro || 'Kỹ thuật viên',
        thoiGianLam: parseArray(s['Thời Gian Làm']),
        kyNang: parseArray(s['Kỹ Năng']),
        gioBan: parseArray(s['Giờ Bận']),
        nguoiThayThe: s['Người thay thế'] || s.nguoiThayThe,
        trangThai: s['Trạng Thái'] || s.trangThai || 'Đang làm việc'
      })).filter(s => s.ten);
      if(staffDocs.length > 0) await Staff.insertMany(staffDocs);
      console.log(`✅ Đã import ${staffDocs.length} Nhân sự.`);
    }

    // 4. Rooms
    const rooms = await readCSV('rooms.csv');
    if (rooms.length > 0) {
      await Room.deleteMany({});
      const roomDocs = rooms.map(r => ({
        tenPhong: r['Tên Phòng'] || r.tenPhong,
        he: r['Hệ'] || r.he,
        soGiuong: parseInt(r['Số Giường'] || r.soGiuong) || 15,
        danhSachGiuong: parseArray(r['Danh Sách Giường'] || r.danhSachGiuong),
        bacSi: parseArray(r['Bác Sĩ'] || r.bacSi),
        ktv: parseArray(r['KTV'] || r.ktv)
      })).filter(r => r.tenPhong);
      if(roomDocs.length > 0) await Room.insertMany(roomDocs);
      console.log(`✅ Đã import ${roomDocs.length} Phòng.`);
    }

    // 5. Patients (Optional)
    const patients = await readCSV('patients.csv');
    if (patients.length > 0) {
      await Patient.deleteMany({});
      const patientDocs = patients.map(p => ({
        ten: p['Tên'] || p.ten,
        namSinh: p['Năm Sinh'] || p.namSinh,
        ngayVao: (p['Ngày Vào'] || p.ngayVao) ? (() => {
          const dStr = p['Ngày Vào'] || p.ngayVao;
          if(dStr.includes('/')){
            const parts = dStr.split('/');
            if(parts.length===3 && parts[2].length===4) {
               let M = parts[0].padStart(2,'0');
               let D = parts[1].padStart(2,'0');
               const Y = parts[2];
               if(parseInt(parts[0]) > 12) { D = parts[0].padStart(2,'0'); M = parts[1].padStart(2,'0'); }
               return `${D}/${M}/${Y}`;
            }
          }
          return dStr;
        })() : '',
        gioVao: p['Giờ Vào'] || p.gioVao,
        gioBan: p['Giờ Bận'] || p.gioBan,
        gioRa: p['Giờ Ra'] || p.gioRa,
        phong: p['Phòng'] || p.phong,
        thuThuat: parseArray(p['Thủ Thuật'] || p.thuThuat),
        status: 'pending'
      })).filter(p => p.ten);
      if(patientDocs.length > 0) await Patient.insertMany(patientDocs);
      console.log(`✅ Đã import ${patientDocs.length} Bệnh nhân.`);
    }

    console.log('🎉 Quá trình Import hoàn tất!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi trong quá trình Import:', err);
    process.exit(1);
  }
}

importData();
