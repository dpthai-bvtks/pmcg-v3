const fs = require('fs');

const path = 'd:\\PM-DPT\\PM-xeplich\\khung_pm\\ban_web\\v3-test\\times-v4\\backend\\services\\scheduler.js';
let code = fs.readFileSync(path, 'utf8');

const lines = code.split('\n');
const startIdx = lines.findIndex(l => l.includes('const dbPatients = await Patient.find();'));

if (startIdx === -1) {
  console.log("Could not find line");
  process.exit(1);
}

const newEnding = `  const dbPatients = await Patient.find();
  dbPatients.forEach(r => {
    if (!r.thuThuat || r.thuThuat.length === 0) return;
    const gioVao = isEmptyTime(r.gioVao) ? 420 : t2m(r.gioVao);
    const busySlots = [];
    busySlots.push([0, gioVao + 1]);
    const isRaVien = false;

    const pendingFiltered = r.thuThuat.map(x => String(x).trim()).filter(x => x).filter(tenThuThuat => {
      if (!skipList.length || isRaVien) return true;
      const tenLower = tenThuThuat.toLowerCase(), info = db.thuThuatInfo[tenLower];
      const tenGoc = info ? (info[8] || "").toLowerCase() : tenLower;
      const vietTat = info ? (info[9] || "").toLowerCase() : "";
      if (skipList.includes(tenLower) || skipList.includes(tenGoc) || skipList.includes(vietTat)) {
        forcedDrops.push({ bn: String(r.ten).toUpperCase(), ns: r.namSinh, room: r.phong, tt: tenThuThuat, reason: "Tạm ngưng thủ thuật (Khoa báo nghỉ)" });
        return false;
      }
      return true;
    });

    db.rawPatients.push({
      name: String(r.ten).toUpperCase(), ns: r.namSinh,
      ngayVao: r.ngayVao ? (r.ngayVao instanceof Date ? r.ngayVao : String(r.ngayVao).trim()) : "",
      room: r.phong, arrive: gioVao, leave: 9999, busy: busySlots,
      pending: pendingFiltered, free_at: gioVao + 1
    });
  });

  console.log("Patient 0 pending:", db.rawPatients[0] ? db.rawPatients[0].pending : "none");

  const best = runBestIteration(db, ngayXep, [], scenario);
  const finalDropList = (best ? best.rot : []).concat(forcedDrops).map(r => ({ ...r, ngay: r.ngay || ngayXep }));

  return {
    scheduleCount: best ? best.sched.length : 0,
    unscheduledCount: finalDropList.length,
    unscheduled: finalDropList,
    schedule: best ? best.sched.map(x => ({
      ngay: x.NGAY, tenBN: x.HOTEN, namSinh: x.NAMSINH, phong: x.PHONG, thuThuat: x.DICHVU,
      gioDienRa: x.GIODIENRA, gioKetThuc: x.GIOKETTHUC, nvChinh: x["NV CHÍNH"], nvPhu: x["NV PHỤ"], may: x.MAY, giuong: x.GIUONG
    })) : []
  };
}

module.exports = {
  buildBaseDb,
  runScheduling
};
`;

const finalCode = lines.slice(0, startIdx).join('\n') + '\n' + newEnding;
fs.writeFileSync(path, finalCode, 'utf8');
console.log("Fixed scheduler.js end logic!");
