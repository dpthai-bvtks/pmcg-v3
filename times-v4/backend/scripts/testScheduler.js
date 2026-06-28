const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const scheduler = require('../services/scheduler');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");
  try {
    const firstStaff = await mongoose.model('Staff').findOne();
    console.log("First staff kyNang:", firstStaff.kyNang);
    const firstProc = await mongoose.model('Procedure').findOne();
    console.log("First proc ten:", firstProc.ten, "may:", firstProc.may);
    const {db} = await scheduler.buildBaseDb();
    console.log("thuThuatInfo keys:", Object.keys(db.thuThuatInfo));
    const result = await scheduler.runScheduling('2026-06-28', 'opt_rare', '');
    console.log("Schedule count:", result.scheduleCount);
    console.log("Unscheduled count:", result.unscheduledCount);
    if (result.unscheduledCount > 0) {
      console.log("First unscheduled reason:", result.unscheduled[0].reason);
      console.log("First unscheduled procedure:", result.unscheduled[0].tt);
    }
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}
test();
