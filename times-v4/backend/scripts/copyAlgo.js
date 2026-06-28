const fs = require('fs');
const path = require('path');

const gsPath = path.join(__dirname, '../../../code.gs-v3.txt');
const schedulerPath = path.join(__dirname, '../services/scheduler.js');

const gsCode = fs.readFileSync(gsPath, 'utf8');
const lines = gsCode.split('\n');

// Find start and end of the algorithm logic
const startIdx = lines.findIndex(l => l.includes('function mutate('));
const endIdx = lines.findIndex(l => l.includes('function getSatData()'));

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find start or end index.");
  process.exit(1);
}

const algoLines = lines.slice(startIdx, endIdx);

// Modify algo lines to fit Node.js environment
const algoCode = algoLines.join('\n')
  .replace(/function runScheduling\(ngayXep, strategyKey, skipProcsStr\)/, 'async function runScheduling(ngayXep, strategyKey, skipProcsStr)')
  .replace(/const db = buildBaseDb\(\);/, 'const {db} = await buildBaseDb();\n  // Convert Staff from DB to rawStaff\n  const dbStaff = await Staff.find();\n  dbStaff.forEach(r => {\n    if (r.trangThai !== "Nghỉ cả ngày") {\n      db.rawStaff.push([\n        r.ten, r.vaiTro, r.kyNang.join(","), r.thoiGianLam.join(","), r.gioBan.join(","), r.trangThai\n      ]);\n    }\n  });')
  .replace(/getAllData\('NhanSu'\).forEach\(r => {[\s\S]*?}\);/, '')
  .replace(/getAllDisplayData\('BenhNhan'\).forEach\(r => {/, 'const dbPatients = await Patient.find();\n  dbPatients.forEach(r => {')
  .replace(/const isRaVien = \(r\[6\] && String\(r\[6\]\)\.trim\(\) !== ""\);/, 'const isRaVien = false;')
  .replace(/r\[8\]/g, '(r.thuThuat ? r.thuThuat.join(",") : "")')
  .replace(/r\[4\]/g, 'r.gioVao')
  .replace(/r\[5\]/g, '""')
  .replace(/r\[6\]/g, '""')
  .replace(/r\[1\]/g, 'r.ten')
  .replace(/r\[2\]/g, 'r.namSinh')
  .replace(/r\[3\]/g, 'r.ngayVao')
  .replace(/r\[7\]/g, 'r.phong')
  .replace(/Session\.getScriptTimeZone\(\)/g, '"Asia/Ho_Chi_Minh"')
  .replace(/Utilities\.formatDate\([^,]+, [^,]+, "dd\/MM\/yyyy"\)/g, 'r.ngayVao')
  .replace(/writeScheduleToSheet\([^)]+\);/g, '// writeScheduleToSheet disabled');

let schedulerCode = fs.readFileSync(schedulerPath, 'utf8');

// Remove the placeholder function
schedulerCode = schedulerCode.replace(/\/\/ LÕI XẾP LỊCH TURBO \(SIMPLIFIED FOR MIGRATION\)[\s\S]*?module\.exports/, moduleExportsStr => {
  return algoCode + '\n\nmodule.exports = {\n  buildBaseDb,\n  runScheduling\n};';
});

fs.writeFileSync(schedulerPath, schedulerCode, 'utf8');
console.log('✅ Successfully copied and adapted _turbo_core_logic to scheduler.js');
