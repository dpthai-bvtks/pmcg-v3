const fs = require('fs');
const path = 'd:\\PM-DPT\\PM-xeplich\\khung_pm\\ban_web\\v3-test\\times-v4\\backend\\services\\scheduler.js';
let code = fs.readFileSync(path, 'utf8');

// The corrupted block:
// db.rawStaff.forEach(r => {
//   const tenNhanVien = r[0], kyNangList = r.namSinh ? String(r.namSinh).split(",").map(x => x.trim()) : [];
//   staffTimeline[tenNhanVien] = []; staffRole[tenNhanVien] = r.ten; staffCurrentRoom[tenNhanVien] = null;
// ...
//   const rawShifts = r.ngayVao ? String(r.ngayVao).split(",").filter(s => s.includes("-")).map(s => {
// ...
//   if (r.gioVao) {
//     String(r.gioVao).split(",").forEach(slot => {

code = code.replace(/kyNangList = r\.namSinh \? String\(r\.namSinh\)/g, 'kyNangList = r[2] ? String(r[2])');
code = code.replace(/staffRole\[tenNhanVien\] = r\.ten;/g, 'staffRole[tenNhanVien] = r[1];');
code = code.replace(/const rawShifts = r\.ngayVao \? String\(r\.ngayVao\)/g, 'const rawShifts = r[3] ? String(r[3])');
code = code.replace(/if \(r\.gioVao\) \{/g, 'if (r[4]) {');
code = code.replace(/String\(r\.gioVao\)\.split/g, 'String(r[4]).split');

fs.writeFileSync(path, code, 'utf8');
console.log("Fixed variable names inside _turbo_core_logic");
