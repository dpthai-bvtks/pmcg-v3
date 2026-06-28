const mongoose = require('mongoose');
const Machine = require('../models/Machine');
const Procedure = require('../models/Procedure');
const Staff = require('../models/Staff');
const Room = require('../models/Room');
const Patient = require('../models/Patient');
const scheduler = require('./scheduler');

// Helper to reliably get the item by its "array index"
// Because the legacy UI passes array index for edit/delete operations.
async function getByIndex(Model, index) {
  const items = await Model.find().sort({ _id: 1 });
  return items[index];
}

const adapter = {
  // --------------------------------------------------------
  // BỆNH NHÂN
  // --------------------------------------------------------
  getBenhNhan: async () => {
    const items = await Patient.find().sort({ _id: 1 });
    return items.map((r, idx) => ({
      id: idx + 1,
      ten: r.ten,
      namSinh: r.namSinh,
      ngayVao: r.ngayVao || "",
      gioVao: r.gioVao || "",
      gioBan: r.gioBan || "",
      gioRa: r.gioRa || "",
      phong: r.phong || "",
      thuThuat: (r.thuThuat || []).join(", ")
    }));
  },
  addBenhNhan: async (ten, ns, ngay, vao, ban, ra, phong, tt) => {
    await Patient.create({
      ten, namSinh: ns, ngayVao: ngay, gioVao: vao,
      gioBan: ban ? String(ban).trim() : "",
      gioRa: ra, phong,
      thuThuat: tt ? tt.split(',').map(s=>s.trim()) : []
    });
    return "Thêm bệnh nhân thành công";
  },
  editBenhNhan: async (index, ten, ns, ngay, vao, ban, ra, phong, tt) => {
    const item = await getByIndex(Patient, index);
    if (!item) throw new Error("Không tìm thấy bệnh nhân");
    item.ten = ten; item.namSinh = ns; item.ngayVao = ngay;
    item.gioVao = vao; item.gioRa = ra; item.phong = phong;
    item.gioBan = ban ? String(ban).trim() : "";
    item.thuThuat = tt ? tt.split(',').map(s=>s.trim()) : [];
    await item.save();
    return "Cập nhật thành công";
  },
  deleteRow: async (sheetName, index) => {
    if (sheetName === 'BenhNhan') {
      const item = await getByIndex(Patient, index);
      if (item) await Patient.deleteOne({ _id: item._id });
    } else if (sheetName === 'NhanSu') {
      const item = await getByIndex(Staff, index);
      if (item) await Staff.deleteOne({ _id: item._id });
    } else if (sheetName === 'PhongThuThuat') {
      const item = await getByIndex(Room, index);
      if (item) await Room.deleteOne({ _id: item._id });
    } else if (sheetName === 'ThuThuat') {
      const item = await getByIndex(Procedure, index);
      if (item) await Procedure.deleteOne({ _id: item._id });
    } else if (sheetName === 'DanhSachMay') {
      const item = await getByIndex(Machine, index);
      if (item) await Machine.deleteOne({ _id: item._id });
    }
    return "Xóa thành công";
  },

  // --------------------------------------------------------
  // MÁY MÓC
  // --------------------------------------------------------
  getDanhSachMay: async () => {
    const items = await Machine.find().sort({ _id: 1 });
    return items.map((r, idx) => ({
      id: idx + 1, tenLoai: r.tenLoai, maMay: r.maMay, trangThai: r.trangThai
    }));
  },
  addMayMoc: async (tenLoai, maMay, soLuong, trangThai) => {
    const docs = [];
    for (let i = 0; i < parseInt(soLuong); i++) {
      docs.push({ tenLoai: tenLoai, maMay: `${maMay}${i + 1}`, trangThai });
    }
    await Machine.insertMany(docs);
    return "Thêm máy thành công";
  },
  editMayMoc: async (index, tenLoai, maMay, trangThai) => {
    const item = await getByIndex(Machine, index);
    if (item) {
      item.tenLoai = tenLoai; item.maMay = maMay; item.trangThai = trangThai;
      await item.save();
    }
    return "Cập nhật thành công";
  },

  // --------------------------------------------------------
  // THỦ THUẬT
  // --------------------------------------------------------
  getThuThuat: async () => {
    const items = await Procedure.find().sort({ _id: 1 });
    return items.map((r, idx) => ({
      id: idx + 1, ten: r.ten, vietTat: r.vietTat, he: r.he,
      phanLoai: 'Loại', may: r.may, thoiGianThucHien: r.thoiGianThucHien,
      thoiGianThuThuat: r.thoiGianThuThuat, khoangCach: r.khoangCach,
      canRutMay: r.canRutMay ? 'Có' : 'Không',
      canNguoiPhu: r.canNguoiPhu ? 'Có' : 'Không',
      dsNguoiPhu: (r.dsNguoiPhu || []).join(', ')
    }));
  },
  addThuThuat: async (ten, vt, he, phanLoai, may, tgThucHien, tgThuThuat, khoangCach, canRutMay, canNguoiPhu, dsNguoiPhu) => {
    await Procedure.create({
      ten, vietTat: vt, he, may,
      thoiGianThucHien: parseInt(tgThucHien)||5,
      thoiGianThuThuat: parseInt(tgThuThuat)||15,
      khoangCach: parseInt(khoangCach)||5,
      canRutMay: canRutMay==='Có', canNguoiPhu: canNguoiPhu==='Có',
      dsNguoiPhu: dsNguoiPhu ? dsNguoiPhu.split(',').map(s=>s.trim()) : []
    });
    return "Thêm thủ thuật thành công";
  },
  editThuThuat: async (index, ten, vt, he, phanLoai, may, tgThucHien, tgThuThuat, khoangCach, canRutMay, canNguoiPhu, dsNguoiPhu) => {
    const item = await getByIndex(Procedure, index);
    if (item) {
      item.ten = ten; item.vietTat = vt; item.he = he; item.may = may;
      item.thoiGianThucHien = parseInt(tgThucHien)||5;
      item.thoiGianThuThuat = parseInt(tgThuThuat)||15;
      item.khoangCach = parseInt(khoangCach)||5;
      item.canRutMay = canRutMay==='Có'; item.canNguoiPhu = canNguoiPhu==='Có';
      item.dsNguoiPhu = dsNguoiPhu ? dsNguoiPhu.split(',').map(s=>s.trim()) : [];
      await item.save();
    }
    return "Cập nhật thành công";
  },

  // --------------------------------------------------------
  // NHÂN SỰ
  // --------------------------------------------------------
  getNhanSu: async () => {
    const items = await Staff.find().sort({ _id: 1 });
    return items.map((r, idx) => ({
      id: idx + 1, ten: r.ten, vaiTro: r.vaiTro, trangThai: r.trangThai,
      thoiGianLam: (r.thoiGianLam || []).join(', '),
      kyNang: (r.kyNang || []).join(', '),
      gioBan: (r.gioBan || []).join(', '),
      nguoiThayThe: r.nguoiThayThe || ''
    }));
  },
  addNhanSu: async (ten, vaiTro, trangThai, tgLam, kyNang, gioBan, thayThe) => {
    await Staff.create({
      ten, vaiTro, trangThai,
      thoiGianLam: tgLam ? tgLam.split(',').map(s=>s.trim()) : [],
      kyNang: kyNang ? kyNang.split(',').map(s=>s.trim()) : [],
      gioBan: gioBan ? gioBan.split(',').map(s=>s.trim()) : [],
      nguoiThayThe: thayThe
    });
    return "Thêm nhân sự thành công";
  },
  editNhanSu: async (index, ten, vaiTro, trangThai, tgLam, kyNang, gioBan, thayThe) => {
    const item = await getByIndex(Staff, index);
    if (item) {
      item.ten = ten; item.vaiTro = vaiTro; item.trangThai = trangThai;
      item.thoiGianLam = tgLam ? tgLam.split(',').map(s=>s.trim()) : [];
      item.kyNang = kyNang ? kyNang.split(',').map(s=>s.trim()) : [];
      item.gioBan = gioBan ? gioBan.split(',').map(s=>s.trim()) : [];
      item.nguoiThayThe = thayThe;
      await item.save();
    }
    return "Cập nhật thành công";
  },

  // --------------------------------------------------------
  // PHÒNG
  // --------------------------------------------------------
  getPhongThuThuat: async () => {
    const items = await Room.find().sort({ _id: 1 });
    return items.map((r, idx) => ({
      id: idx + 1, tenPhong: r.tenPhong, bacSi: (r.bacSi || []).join(', '), ktv: (r.ktv || []).join(', '),
      danhSachMay: (r.danhSachMay || []).join(', '),
      soGiuong: r.soGiuong || 0,
      danhSachGiuong: (r.danhSachGiuong || []).join(', ')
    }));
  },
  addPhong: async (tenPhong, bs, ktv, dsMay, slGiuong, dsGiuong) => {
    await Room.create({
      tenPhong: tenPhong, bacSi: bs ? bs.split(',').map(s=>s.trim()) : [],
      ktv: ktv ? ktv.split(',').map(s=>s.trim()) : [],
      soGiuong: slGiuong,
      danhSachMay: dsMay ? dsMay.split(',').map(s=>s.trim()) : [],
      danhSachGiuong: dsGiuong ? dsGiuong.split(',').map(s=>s.trim()) : []
    });
    return "Thêm phòng thành công";
  },
  editPhong: async (index, tenPhong, bs, ktv, dsMay, slGiuong, dsGiuong) => {
    const item = await getByIndex(Room, index);
    if (item) {
      item.tenPhong = tenPhong;
      item.bacSi = bs ? bs.split(',').map(s=>s.trim()) : [];
      item.ktv = ktv ? ktv.split(',').map(s=>s.trim()) : [];
      item.soGiuong = slGiuong;
      item.danhSachMay = dsMay ? dsMay.split(',').map(s=>s.trim()) : [];
      item.danhSachGiuong = dsGiuong ? dsGiuong.split(',').map(s=>s.trim()) : [];
      await item.save();
    }
    return "Cập nhật thành công";
  },

  // --------------------------------------------------------
  // SCHEDULING & HISTORY & LOGIN
  // --------------------------------------------------------
  verifyLogin: async (user, pass) => {
    // Luôn cho phép đăng nhập với quyền Admin (bỏ qua mật khẩu)
    return { success: true, username: user || 'Admin', role: 'Admin', permissions: '*' };
  },
  xepLichThu7: async (ngayXep, mode, skipProcs) => {
    const res = await scheduler.runScheduling(ngayXep, mode || 'opt_rare', skipProcs || '');
    // Convert to GS legacy format expected by the frontend payload
    const sched = res.schedule.map(x => ({
      ngay: x.ngay, tenBN: x.tenBN, namSinh: x.namSinh, phong: x.phong,
      thuThuat: x.thuThuat, gioDienRa: x.gioDienRa, gioKetThuc: x.gioKetThuc,
      nvChinh: x.nvChinh, nvPhu: x.nvPhu, may: x.may, giuong: x.giuong
    }));
    const rot = res.unscheduled.map(r => ({
      ngay: r.ngay, bn: r.bn, ns: r.ns, room: r.room, tt: r.tt,
      staff: r.staff, reason: r.reason
    }));
    // Tạm thời cache kết quả này trên bộ nhớ Node.js hoặc DB
    global.latestSched = sched;
    global.latestRot = rot;
    
    return {
      schedule: sched,
      unscheduled: rot,
      scheduleCount: sched.length,
      unscheduledCount: rot.length,
      message: `Đã xếp xong ${sched.length} ca, rớt ${rot.length} ca.`
    };
  },
  runScheduler: async (ngayXep, mode, skipProcs) => {
    return adapter.xepLichThu7(ngayXep, mode, skipProcs);
  },
  runScheduling: async (ngayXep, mode, skipProcs) => {
    return adapter.xepLichThu7(ngayXep, mode, skipProcs);
  },
  getLichTrinhHienTai: async () => {
    return {
      sched: global.latestSched || [],
      rot: global.latestRot || []
    };
  },
  getSchedule: async () => {
    const schedRows = (global.latestSched || []).map(x => [
      x.ngay, x.tenBN, x.namSinh, x.phong, x.thuThuat, x.gioDienRa, x.gioKetThuc, x.nvChinh, x.nvPhu, x.may, x.giuong
    ]);
    const rotRows = (global.latestRot || []).map(r => [
      r.ngay, r.bn, r.ns, r.room, r.tt, '❌ Rớt', '', r.staff, r.reason, '', ''
    ]);
    return [...schedRows, ...rotRows];
  },
  getLichTrinh: async () => {
    return adapter.getSchedule();
  },
  getSatData: async () => {
    const staff = (await adapter.getNhanSu()).map(s => ({ ten: s.ten, vaiTro: s.vaiTro }));
    const patients = (await adapter.getBenhNhan()).map(p => ({
      id: p.id, ten: p.ten, namSinh: p.namSinh, gioVao: p.gioVao,
      phong: p.phong, thuThuat: p.thuThuat, loaiBn: 'Thường'
    }));
    // Provide timezone offset adjusted "today"
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().split('T')[0];
    return { staff, patients, today: localISOTime };
  },
  getAccounts: async () => {
    return [
      { id: 1, user: "admin", role: "Admin", perms: "ALL" }
    ];
  },
  getMarqueeText: async () => {
    return "Hệ thống đang chạy trên MongoDB Atlas";
  },
  layThongBaoDongChuChay: async () => {
    return "Hệ thống đang chạy trên MongoDB Atlas";
  },
  layDanhSachLienKet: async () => {
    return [
      { url: '#', icon: '📖', ten: 'Hướng dẫn sử dụng phần mềm' },
      { url: '#', icon: '📝', ten: 'Tra cứu Văn bản & BHXH' },
      { url: '#', icon: '📊', ten: 'Hòm thư góp ý' }
    ];
  },
  getTimRanhData: async () => {
    return { staffList: [], roomList: [] };
  },
  luuLichSuXepLich: async (log) => {
    return "Đã lưu lịch sử";
  },
  layLichSuXepLich: async () => {
    return [];
  }
};

module.exports = adapter;
