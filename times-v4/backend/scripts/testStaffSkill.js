const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const scheduler = require('../services/scheduler');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const {db} = await scheduler.buildBaseDb();
  
  const dbStaff = await mongoose.model('Staff').find();
  dbStaff.forEach(r => {
    if (r.trangThai !== "Nghỉ cả ngày") {
      db.rawStaff.push([
        r.ten, r.vaiTro, r.kyNang.join(","), r.thoiGianLam.join(","), r.gioBan.join(","), r.trangThai
      ]);
    }
  });
  
  const staffBySkill = {};
  db.rawStaff.forEach(r => {
    const tenNhanVien = r[0], kyNangList = r[2] ? String(r[2]).split(",").map(x => x.trim()) : [];
    kyNangList.forEach(kyNang => {
      const kyNangLower = kyNang.toLowerCase();
      if (!staffBySkill[kyNangLower]) staffBySkill[kyNangLower] = [];
      staffBySkill[kyNangLower].push(tenNhanVien);
      if (db.thuThuatInfo[kyNangLower]?.length > 9 && db.thuThuatInfo[kyNangLower][9]) {
        const vietTat = db.thuThuatInfo[kyNangLower][9].trim().toLowerCase();
        if (!staffBySkill[vietTat]) staffBySkill[vietTat] = [];
        if (!staffBySkill[vietTat].includes(tenNhanVien)) staffBySkill[vietTat].push(tenNhanVien);
      }
    });
  });
  
  console.log("staffBySkill['điện châm']:", staffBySkill['điện châm']);
  process.exit(0);
}
test();
