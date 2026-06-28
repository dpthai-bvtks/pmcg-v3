const mongoose = require('mongoose');
const Patient = require('../models/Patient');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/times-v4').then(async () => {
  const pts = await Patient.find({});
  let count = 0;
  for (let p of pts) {
    if (p.ngayVao && p.ngayVao.includes('/')) {
      const parts = p.ngayVao.split('/');
      if (parts.length === 3 && parts[2].length === 4) {
        let M = parts[0].padStart(2, '0');
        let D = parts[1].padStart(2, '0');
        let Y = parts[2];
        if (parseInt(parts[0]) > 12) {
          D = parts[0].padStart(2, '0');
          M = parts[1].padStart(2, '0');
        }
        await Patient.updateOne({ _id: p._id }, { $set: { ngayVao: `${D}/${M}/${Y}` } });
        count++;
      }
    }
  }
  console.log('Updated ' + count + ' patients.');
  process.exit();
});
