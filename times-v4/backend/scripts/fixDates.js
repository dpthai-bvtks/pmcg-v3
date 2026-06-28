const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/times-v4').then(async () => {
  const Patient = mongoose.model('Patient', new mongoose.Schema({}, { strict: false }));
  const pts = await Patient.find({});
  let count = 0;
  for (let p of pts) {
    if (p.ngayVao && p.ngayVao.includes('/')) {
      const parts = p.ngayVao.split('/');
      if (parts.length === 3 && parts[2].length === 4) {
        // If it looks like M/D/YYYY (e.g. 6/22/2026), M is parts[0], D is parts[1]
        // But what if it is D/M/YYYY? Usually days > 12 are in parts[1], meaning M/D/YYYY
        // To be safe, if parts[0] <= 12 and parts[1] > 12, it's M/D
        let M = parts[0].padStart(2, '0');
        let D = parts[1].padStart(2, '0');
        let Y = parts[2];
        
        // Sometimes it might already be D/M, but let's assume it was imported as M/D/YYYY
        // because we saw 6/22/2026.
        if (parseInt(parts[0]) > 12) {
          // It was actually DD/MM/YYYY
          D = parts[0].padStart(2, '0');
          M = parts[1].padStart(2, '0');
        }
        
        p.ngayVao = `${D}/${M}/${Y}`;
        await p.save();
        count++;
      }
    }
  }
  console.log('Updated ' + count + ' patients.');
  process.exit();
});
