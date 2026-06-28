const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Procedure = require('../models/Procedure');

async function checkDb() {
  await mongoose.connect(process.env.MONGO_URI);
  const procs = await mongoose.model('Procedure').find();
  procs.forEach(p => {
    console.log(`${p.ten}: Thực hiện=${p.thoiGianThucHien}, Tổng=${p.thoiGianThuThuat}, Phụ=${p.canNguoiPhu}`);
  });
  process.exit(0);
}
checkDb();
