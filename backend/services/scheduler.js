const Machine = require('../models/Machine');
const Procedure = require('../models/Procedure');
const Staff = require('../models/Staff');
const Room = require('../models/Room');
const Patient = require('../models/Patient');

// ============================================================
// CORE UTILS
// ============================================================
function t2m(thoiGian) {
  if (!thoiGian && thoiGian !== 0) return 0;
  if (thoiGian instanceof Date) {
    if (isNaN(thoiGian.getTime())) return 0;
    return thoiGian.getUTCHours() * 60 + thoiGian.getUTCMinutes();
  }
  const str = String(thoiGian).trim();
  if (!str || str === '0') return 0;
  if (!isNaN(str) && parseFloat(str) > 0 && parseFloat(str) <= 1) return Math.round(parseFloat(str) * 1440);
  if (!str.includes(":")) return 0;
  const parts = str.split(":");
  const gio = parseInt(parts[0].split(" ").pop(), 10);
  const phut = parseInt(parts[1], 10);
  return (isNaN(gio) ? 0 : gio) * 60 + (isNaN(phut) ? 0 : phut);
}

function isEmptyTime(val) {
  if (!val || val === '' || val === '0' || val === 0) return true;
  if (val instanceof Date && isNaN(val.getTime())) return true;
  return t2m(val) === 0;
}

function m2t(totalMinutes) {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

function is_overlap(start1, end1, start2, end2) { return Math.max(start1, start2) < Math.min(end1, end2); }

function createSeededRandom(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function parseNgayVao(dateStr) {
  if (!dateStr || dateStr === '') return 99999999;
  const parts = String(dateStr).split('/');
  return parts.length === 3 ? parseInt(parts[2]) * 10000 + parseInt(parts[1]) * 100 + parseInt(parts[0]) : 99999999;
}

function updatePatientCache(patient, thuThuatInfo) {
  patient.max_dur = 0; patient.has_yhct = 0; patient.has_toan_tg = 0;
  patient.leave_pri = patient.leave !== 9999 ? 0 : 1;
  const tuKhoa = ["siêu âm", "xoa bóp", "tập vận", "xbbh", "cấy chỉ"];
  for (const ten of patient.pending) {
    const info = thuThuatInfo[ten.toLowerCase()] || ["Thủ công", 15, 5, "PHCN", 1, 0, [], 5];
    if (info[1] > patient.max_dur) patient.max_dur = info[1];
    if (info[3] === "YHCT") patient.has_yhct = -1;
    if (tuKhoa.some(k => ten.toLowerCase().includes(k))) patient.has_toan_tg = -1;
  }
}

function mergeTimeline(timeline) {
  if (timeline.length < 2) return timeline;
  timeline.sort((a, b) => a[0] - b[0]);
  const merged = [timeline[0]];
  for (let i = 1; i < timeline.length; i++) {
    const last = merged[merged.length - 1];
    if (timeline[i][0] <= last[1]) last[1] = Math.max(last[1], timeline[i][1]);
    else merged.push(timeline[i]);
  }
  return merged;
}

function getNextEvent(tNow, patients, staffTimeline, machineTimeline, endOfDay) {
  let next = endOfDay;
  patients.forEach(p => {
    if (p.pending.length > 0) {
      if (p.free_at > tNow) next = Math.min(next, p.free_at);
      p.busy.forEach(b => { if (b[1] > tNow) next = Math.min(next, b[1]); });
    }
  });
  Object.values(staffTimeline).forEach(tl => tl.forEach(slot => { if (slot[1] > tNow && slot[1] < endOfDay) next = Math.min(next, slot[1]); }));
  Object.values(machineTimeline).forEach(tl => tl.forEach(slot => { if (slot[1] > tNow && slot[1] < endOfDay) next = Math.min(next, slot[1]); }));
  return next <= tNow ? tNow + 1 : next;
}

function blockStaff(staffName, start, end, khoangCach, staffTimeline, staffSetupReady, staffLoad, tenThuThuat, staffLastProc) {
  staffTimeline[staffName].push([start, end]);
  if (khoangCach > (end - start)) staffTimeline[staffName].push([end, start + khoangCach]);
  staffTimeline[staffName] = mergeTimeline(staffTimeline[staffName]);
  staffSetupReady[staffName] = Math.max(staffSetupReady[staffName] || 0, end);
  staffLoad[staffName].used_mins += (end - start);
  staffLoad[staffName].procs_done[tenThuThuat] = (staffLoad[staffName].procs_done[tenThuThuat] || 0) + 1;
  staffLastProc[staffName] = tenThuThuat;
}

// ============================================================
// BUILD DATABASE CACHE FOR SCHEDULING
// ============================================================
async function buildBaseDb() {
  const db = { machineTypes: {}, thuThuatInfo: {}, replacementMap: {}, roomStaff: {}, roomBeds: {}, rawStaff: [], rawPatients: [] };

  const machines = await Machine.find({ trangThai: 'Sẵn sàng' });
  machines.forEach(r => {
    if (!db.machineTypes[r.tenLoai]) db.machineTypes[r.tenLoai] = [];
    db.machineTypes[r.tenLoai].push(r.maMay);
  });

  const staff = await Staff.find();
  staff.forEach(r => {
    if (r.nguoiThayThe && r.nguoiThayThe !== "Không") db.replacementMap[r.ten] = r.nguoiThayThe;
  });

  const procedures = await Procedure.find();
  procedures.forEach(r => {
    const tgNhanVien = r.thoiGianThucHien || 5;
    const tgMay = r.thoiGianThuThuat || 15;
    const khoangCach = r.khoangCach || tgNhanVien;
    db.thuThuatInfo[String(r.ten).trim().toLowerCase()] = [
      r.may, Math.max(1, tgMay), Math.max(1, tgNhanVien), r.he,
      r.canRutMay ? 1 : 0, r.canNguoiPhu ? 1 : 0,
      r.dsNguoiPhu || [],
      khoangCach, String(r.ten).trim(), r.vietTat
    ];
  });

  const rooms = await Room.find();
  rooms.forEach(r => {
    const soGiuong = r.soGiuong || 15;
    const beds = r.danhSachGiuong || [];
    db.roomBeds[r.tenPhong] = beds.length > 0 ? beds : Array.from({ length: soGiuong }, (_, i) => `Giường ${i + 1}`);
    const dsBacSi = r.bacSi || [];
    const dsKTV = r.ktv || [];
    db.roomStaff[r.tenPhong] = [...new Set([...dsBacSi, ...dsKTV].filter(x => x).map(x => db.replacementMap[x] || x))];
  });

  return { db, staffList: staff };
}

// ============================================================
function mutate(rawPatients, randFn, droppedNames) {
  let patients = JSON.parse(JSON.stringify(rawPatients));
  if (droppedNames && droppedNames.size > 0 && randFn() < 0.6) {
    const idx = patients.findIndex(p => droppedNames.has(p.name));
    if (idx > 0) { const [p] = patients.splice(idx, 1); patients.unshift(p); return patients; }
  }
  const op = Math.floor(randFn() * 3);
  if (op === 0 && patients.length >= 2) {
    const i = Math.floor(randFn() * patients.length), j = Math.floor(randFn() * patients.length);
    [patients[i], patients[j]] = [patients[j], patients[i]];
  } else if (op === 1) {
    const p = patients[Math.floor(randFn() * patients.length)];
    if (p && p.pending.length >= 2) {
      const i = Math.floor(randFn() * p.pending.length), j = Math.floor(randFn() * p.pending.length);
      [p.pending[i], p.pending[j]] = [p.pending[j], p.pending[i]];
    }
  } else if (patients.length >= 2) {
    const i = Math.floor(randFn() * patients.length);
    const [p] = patients.splice(i, 1);
    patients.unshift(p);
  }
  return patients;
}

function runBestIteration(db, dateVal, existingSched = [], scenario = 1) {
  let rand = createSeededRandom(42);
  let currentPatients = JSON.parse(JSON.stringify(db.rawPatients));
  let current = _turbo_core_logic({ ...db, rawPatients: currentPatients }, dateVal, 0, existingSched, scenario);
  let best = current;
  if (best.score === 0) return best;

  let droppedNames = new Set(best.rot.map(r => r.bn));
  let T = 10.0, T_min = 0.3, alpha = 0.88, noImprove = 0;

  while (T > T_min && noImprove < 20) {
    const neighborPatients = mutate(currentPatients, rand, droppedNames);
    const neighbor = _turbo_core_logic({ ...db, rawPatients: neighborPatients }, dateVal, 0, existingSched, scenario);
    const delta = neighbor.score - current.score;
    const accept = delta < 0 || (rand() < Math.exp(-delta / T));
    if (accept) {
      current = neighbor; currentPatients = neighborPatients;
      if (current.score < best.score) {
        best = current; droppedNames = new Set(best.rot.map(r => r.bn)); noImprove = 0;
        if (best.score === 0) break;
      } else { noImprove++; }
    } else { noImprove++; }
    T *= alpha;
  }

  for (let i = 0; i < 5; i++) {
    const result = _turbo_core_logic({ ...db, rawPatients: JSON.parse(JSON.stringify(db.rawPatients)) }, dateVal, 100 + i, existingSched, scenario);
    if (result.score < best.score) { best = result; if (best.score === 0) break; }
  }
  return best;
}

function writeScheduleToSheet(sched, rot = []) {
  const sheet = getSheetByName('LichTrinh');
  clearSheet('LichTrinh');
  const rows = (sched || []).map(item => [item.NGAY, item.HOTEN, item.NAMSINH, item.PHONG, item.DICHVU, item.GIODIENRA, item.GIOKETTHUC, item["NV CHÍNH"], item["NV PHỤ"], item.MAY, item.GIUONG]);
  if (rows.length > 0) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  if (rot && rot.length > 0) {
    const rotRows = rot.map(r => [r.ngay || "", r.bn || "", r.ns || "", r.room || "", r.tt || "", "❌ Rớt", "", r.staff || "", r.reason || "", "", ""]);
    sheet.getRange(sheet.getLastRow() + 1, 1, rotRows.length, rotRows[0].length).setValues(rotRows);
    sheet.getRange(sheet.getLastRow() - rotRows.length + 1, 1, rotRows.length, 11).setBackground("#FFF9C4");
  }
}

// ============================================================
// LÕI XẾP LỊCH TURBO
// ============================================================
function _turbo_core_logic(db, ngayXep, seedVal, existingSched = [], scenario = 1) {
  const rand = createSeededRandom(seedVal);
  const OVERTIME_ALLOWANCE = 05;
  const defaultShift = [[420, 690], [780, 1014]];
  let startOfDay = 420, endOfDay = 1014;

  // Máy dự trữ (kịch bản 3)
  const reservedMachines = new Set();
  if (scenario === 3) {
    Object.values(db.machineTypes).forEach(machines => {
      const reserveCount = Math.max(1, Math.floor(machines.length * 0.2));
      for (let i = 0; i < reserveCount; i++) reservedMachines.add(machines[i]);
    });
  }

  // Bổ sung viết tắt vào thuThuatInfo để tìm theo cả viết tắt
  const thuThuatInfo = db.thuThuatInfo;
  Object.keys(thuThuatInfo).forEach(key => {
    const info = thuThuatInfo[key];
    if (info.length > 9 && info[9]) thuThuatInfo[info[9].trim().toLowerCase()] = info;
  });

  // Độ hiếm máy
  const machineRarity = {};
  Object.keys(thuThuatInfo).forEach(key => {
    const loaiMay = thuThuatInfo[key][0];
    machineRarity[key] = (loaiMay && loaiMay !== "Thủ công")
      ? ((db.machineTypes[loaiMay] || []).length <= 2 ? 0 : (db.machineTypes[loaiMay] || []).length <= 5 ? 1 : 2)
      : 3;
  });

  const { machineTypes, roomStaff } = db;

  // Khởi tạo dữ liệu nhân sự
  const staffBySkill = {}, staffTimeline = {}, staffShifts = {}, staffLoad = {};
  const staffRole = {}, staffLastProc = {}, staffMyRooms = {}, staffSetupReady = {}, staffCurrentRoom = {};

  db.rawStaff.forEach(r => {
    const tenNhanVien = r[0], kyNangList = r[2] ? String(r[2]).split(",").map(x => x.trim()) : [];
    staffTimeline[tenNhanVien] = []; staffRole[tenNhanVien] = r[1]; staffCurrentRoom[tenNhanVien] = null;

    kyNangList.forEach(kyNang => {
      const kyNangLower = kyNang.toLowerCase();
      if (!staffBySkill[kyNangLower]) staffBySkill[kyNangLower] = [];
      staffBySkill[kyNangLower].push(tenNhanVien);
      // Cũng đăng ký theo viết tắt
      if (thuThuatInfo[kyNangLower]?.length > 9 && thuThuatInfo[kyNangLower][9]) {
        const vietTat = thuThuatInfo[kyNangLower][9].trim().toLowerCase();
        if (!staffBySkill[vietTat]) staffBySkill[vietTat] = [];
        if (!staffBySkill[vietTat].includes(tenNhanVien)) staffBySkill[vietTat].push(tenNhanVien);
      }
    });

    // Ca làm việc từ dữ liệu nhân sự
    const rawShifts = r[3] ? String(r[3]).split(",").filter(s => s.includes("-")).map(s => {
      const pts = s.split("-"); return [t2m(pts[0].trim()), t2m(pts[1].trim())];
    }) : [];
    staffShifts[tenNhanVien] = rawShifts.length > 0 ? rawShifts : defaultShift;

    // Giờ bận cá nhân
    if (r[4]) {
      String(r[4]).split(",").forEach(slot => {
        if (slot.includes("-")) {
          const tp = slot.includes(")") ? slot.split(")").pop().trim() : slot;
          staffTimeline[tenNhanVien].push([t2m(tp.split("-")[0]), t2m(tp.split("-")[1]) + 1]);
        }
      });
    }

    // Rào chắn thời gian ngoài ca làm (có cộng OVERTIME)
    if (staffShifts[tenNhanVien].length > 0) {
      const [caS1, caE1] = staffShifts[tenNhanVien][0];
      if (staffShifts[tenNhanVien].length > 1) {
        const [caS2, caE2] = staffShifts[tenNhanVien][1];
        staffTimeline[tenNhanVien].push([0, caS1], [caE1, caS2], [caE2 + OVERTIME_ALLOWANCE, 1440]);
      } else {
        staffTimeline[tenNhanVien].push([0, caS1], [caE1 + OVERTIME_ALLOWANCE, 1440]);
      }
    } else {
      staffTimeline[tenNhanVien].push([0, startOfDay], [endOfDay + OVERTIME_ALLOWANCE, 1440]);
    }

    const tongPhutLamViec = staffShifts[tenNhanVien].reduce((acc, ca) => acc + ca[1] - ca[0], 0);
    const tongPhutBan = staffTimeline[tenNhanVien].reduce((acc, slot) => acc + slot[1] - slot[0], 0);
    staffLoad[tenNhanVien] = { used_mins: 0, shift_mins: tongPhutLamViec, procs_done: {}, busy_mins: tongPhutBan, skills: kyNangList };
    staffSetupReady[tenNhanVien] = 0;
    staffMyRooms[tenNhanVien] = Object.keys(roomStaff).filter(room => roomStaff[room].includes(tenNhanVien));
    staffTimeline[tenNhanVien] = mergeTimeline(staffTimeline[tenNhanVien]);
  });

  // Tính giờ mở/đóng cửa thực tế của khoa
  let minShiftStart = 1440, maxShiftEnd = 0;
  Object.values(staffShifts).forEach(caList => {
    if (caList.length > 0) {
      minShiftStart = Math.min(minShiftStart, caList[0][0]);
      maxShiftEnd   = Math.max(maxShiftEnd,   caList[caList.length - 1][1]);
    }
  });
  if (minShiftStart < 1440) startOfDay = minShiftStart;
  if (maxShiftEnd > 0) endOfDay = maxShiftEnd;

  // Timeline máy và giường
  const machineTimeline = { "Thủ công": [] };
  for (const loaiMay in machineTypes) machineTypes[loaiMay].forEach(may => { machineTimeline[may] = []; });

  const bedTracker = {};
  for (const phong in db.roomBeds) {
    bedTracker[phong] = {};
    db.roomBeds[phong].forEach(giuong => { bedTracker[phong][giuong] = []; });
  }

  // Áp lịch đã có sẵn
  existingSched.forEach(row => {
    const gioStart = t2m(row[5] || row.GIODIENRA), gioEnd = t2m(row[6] || row.GIOKETTHUC);
    const nvChinh = row[7] || row["NV CHÍNH"], nvPhu = row[8] || row["NV PHỤ"];
    const may = row[9] || row.MAY, phong = row[3] || row.PHONG, giuong = row[10] || row.GIUONG;
    const pushAndMerge = (timeline, key, slot) => { if (!timeline[key]) return; timeline[key].push(slot); timeline[key] = mergeTimeline(timeline[key]); };
    if (nvChinh && staffTimeline[nvChinh]) { pushAndMerge(staffTimeline, nvChinh, [gioStart, gioEnd]); staffCurrentRoom[nvChinh] = phong; }
    if (nvPhu && staffTimeline[nvPhu]) pushAndMerge(staffTimeline, nvPhu, [gioStart, gioEnd]);
    if (may && may !== "Thủ công" && machineTimeline[may]) pushAndMerge(machineTimeline, may, [gioStart, gioEnd]);
    if (phong && giuong && bedTracker[phong]?.[giuong]) pushAndMerge(bedTracker[phong], giuong, [gioStart, gioEnd]);
  });

  let patients = db.rawPatients.map(p => ({ ...p, pending: [...p.pending], failed: false }));
  const tempDropList = [], results = [], localProcCount = {};

  // Sắp xếp thứ tự thủ thuật trong hàng chờ mỗi bệnh nhân
  patients.forEach(p => {
    const valid = [];
    p.pending.forEach(tenThuThuat => {
      if (!staffBySkill[tenThuThuat.toLowerCase()]) {
        const tenGoc = thuThuatInfo[tenThuThuat.toLowerCase()]?.[8] || tenThuThuat;
        tempDropList.push({ bn: p.name, ns: p.ns, tt: tenGoc, room: p.room, staff: "Trống", reason: "HỦY SỚM: Không có nhân sự có kỹ năng này" });
      } else valid.push(tenThuThuat);
    });

    const activeProcs = Object.values(staffLastProc);
    const sortedProcs = valid.map((ten, idx) => ({ ten, idx, rand: rand() }));
    sortedProcs.sort((a, b) => {
      const infoA = thuThuatInfo[a.ten.toLowerCase()] || ["", 999, 999, "PHCN", 0, 0, [], 5];
      const infoB = thuThuatInfo[b.ten.toLowerCase()] || ["", 999, 999, "PHCN", 0, 0, [], 5];
      // Mức 1: Liền mạch
      const lienA = activeProcs.includes(a.ten) ? 0 : 1;
      const lienB = activeProcs.includes(b.ten) ? 0 : 1;
      if (lienA !== lienB) return lienA - lienB;
      // Mức 2: YHCT trước PHCN
      const heA = infoA[3] === "YHCT" ? 0 : 1;
      const heB = infoB[3] === "YHCT" ? 0 : 1;
      if (heA !== heB) return heA - heB;
      // Mức 3: Máy hiếm trước (kịch bản 1)
      if (scenario === 1) {
        const hiemA = machineRarity[a.ten.toLowerCase()] ?? 3;
        const hiemB = machineRarity[b.ten.toLowerCase()] ?? 3;
        if (hiemA !== hiemB) return hiemA - hiemB;
      }
      // Mức 4: Thời gian nhân viên ngắn nhất
      if (infoA[2] !== infoB[2]) return infoA[2] - infoB[2];
      // Mức 5: Thời gian tổng ngắn nhất
      if (infoA[1] !== infoB[1]) return infoA[1] - infoB[1];
      // Mức 6: Ngẫu nhiên
      return Math.abs(a.rand - b.rand) > 0.0001 ? a.rand - b.rand : a.idx - b.idx;
    });

    p.pending = sortedProcs.map(o => o.ten);
    updatePatientCache(p, thuThuatInfo);
  });

  // Phân loại bệnh nhân cũ/mới và sắp xếp ưu tiên ban đầu
  const todayNum = parseNgayVao(ngayXep);
  patients.forEach(p => {
    p._ngayVaoNum = parseNgayVao(p.ngayVao || "");
    p._isNew = (p._ngayVaoNum >= todayNum);
  });
  patients.sort((a, b) => {
    if (a._isNew !== b._isNew) return a._isNew ? 1 : -1;
    if (!a._isNew && a._ngayVaoNum !== b._ngayVaoNum) return a._ngayVaoNum - b._ngayVaoNum;
    return a.arrive - b.arrive;
  });
  patients.forEach(p => { p.randSeed = p._isNew ? (0.5 + rand() * 0.5) : (rand() * 0.5); });

  // Hàm thử xếp 1 ca
  function tryScheduleOne(patient, tenThuThuat, tNow) {
    const info = thuThuatInfo[tenThuThuat.toLowerCase()] || ["Thủ công", 15, 5, "PHCN", 1, 0, [], 5];
    const tenGoc = info[8] || tenThuThuat, targetRoom = patient.room, loaiMay = info[0];
    const tgMay = Math.max(info[1], info[2]), tgNhanVien = info[2], canPhu = info[5];
    const rawKhoangCach = scenario === 1 ? info[2] : (info[7] || info[2]);
    const khoangCach = Math.max(rawKhoangCach, info[2] + 1);
    const gioKetThuc = tNow + tgMay;
    const hasTeardown = tgMay > tgNhanVien;
    const tearStart = hasTeardown ? (tNow + tgMay) : null;
    const tearEnd   = hasTeardown ? (tNow + tgMay + 1) : null;

    if (gioKetThuc > (endOfDay + OVERTIME_ALLOWANCE)) return false;
    if (patient.leave !== 9999 && gioKetThuc > patient.leave) return false;
    if (patient.busy.some(b => is_overlap(tNow, gioKetThuc, b[0], b[1]))) return false;

    // Tìm ứng viên chính và phụ
    const candidatesMain = [], candidatesSub = [];
    (staffBySkill[tenThuThuat.toLowerCase()] || []).forEach(tenNV => {
      if (tNow < (staffSetupReady[tenNV] || 0)) return;
      if (staffTimeline[tenNV].some(slot => is_overlap(tNow, tNow + tgNhanVien + 1, slot[0], slot[1]))) return;
      if (hasTeardown && staffTimeline[tenNV].some(slot => is_overlap(tearStart, tearEnd, slot[0], slot[1]))) return;
      if (staffRole[tenNV]?.toLowerCase() !== 'điều dưỡng') candidatesMain.push(tenNV);
      else candidatesSub.push(tenNV);
    });
    if (candidatesMain.length === 0) return false;

    // Ưu tiên nhân viên phù hợp nhất
    candidatesMain.sort((a, b) => {
      const rmA = staffMyRooms[a].includes(targetRoom) ? 0 : 1, rmB = staffMyRooms[b].includes(targetRoom) ? 0 : 1;
      if (rmA !== rmB) return rmA - rmB;
      const crA = staffCurrentRoom[a] === targetRoom ? 0 : 1, crB = staffCurrentRoom[b] === targetRoom ? 0 : 1;
      if (crA !== crB) return crA - crB;
      const lpA = staffLastProc[a] === tenThuThuat ? 0 : 1, lpB = staffLastProc[b] === tenThuThuat ? 0 : 1;
      if (lpA !== lpB) return lpA - lpB;
      const roleA = (info[3] === "PHCN" && staffRole[a] === 'Kỹ thuật viên') || (info[3] === "YHCT" && staffRole[a] === 'Bác sĩ') ? 0 : 1;
      const roleB = (info[3] === "PHCN" && staffRole[b] === 'Kỹ thuật viên') || (info[3] === "YHCT" && staffRole[b] === 'Bác sĩ') ? 0 : 1;
      if (roleA !== roleB) return roleA - roleB;
      return staffLoad[a].used_mins - staffLoad[b].used_mins;
    });

    // Chọn máy
    const possibleMachines = loaiMay === "Thủ công" ? [loaiMay] : (machineTypes[loaiMay] || []);
    const availableMachines = scenario === 3 ? possibleMachines.filter(m => !reservedMachines.has(m)) : possibleMachines;
    const finalMachines = availableMachines.length === 0 ? possibleMachines : availableMachines;
    const selectedMachine = finalMachines.find(m => !machineTimeline[m].some(slot => is_overlap(tNow, gioKetThuc, slot[0], slot[1])));
    if (!selectedMachine) return false;

    // Chọn giường
    let selectedBed = null;
    if (bedTracker[targetRoom]) {
      for (const [bedId, bedTimeline] of Object.entries(bedTracker[targetRoom])) {
        if (!bedTimeline.some(slot => is_overlap(tNow, gioKetThuc, slot[0], slot[1]))) { selectedBed = bedId; break; }
      }
    }
    if (!selectedBed && bedTracker[targetRoom] && Object.keys(bedTracker[targetRoom]).length > 0) return false;

    // Thử từng ứng viên chính
    for (const nvChinh of candidatesMain) {
      const isInMyRoom  = staffMyRooms[nvChinh].includes(targetRoom);
      const isFloating  = staffMyRooms[nvChinh].length === 0;
      if (!(isInMyRoom || isFloating)) {
        const threshold = scenario === 2 ? 1 : 0;
        const benhNhanChoTrongPhong = patients.filter(_p =>
          staffMyRooms[nvChinh].includes(_p.room) && _p.pending.length > threshold &&
          !_p.busy.some(b => b[0] <= tNow && tNow < b[1]) && _p.free_at <= tNow
        );
        if (benhNhanChoTrongPhong.length > 0) continue;
      }

      let nvPhu = "";
      if (canPhu === 1) {
        const validSubs = candidatesSub.filter(x => x !== nvChinh);
        if (validSubs.length === 0) continue;
        validSubs.sort((a, b) => {
          const aR = staffMyRooms[a].includes(targetRoom) ? 0 : 1, bR = staffMyRooms[b].includes(targetRoom) ? 0 : 1;
          return aR !== bR ? aR - bR : staffLoad[a].used_mins - staffLoad[b].used_mins;
        });
        nvPhu = validSubs[0];
      }

      // Block nhân viên chính
      blockStaff(nvChinh, tNow, tNow + tgNhanVien, khoangCach, staffTimeline, staffSetupReady, staffLoad, tenThuThuat, staffLastProc);
      staffCurrentRoom[nvChinh] = targetRoom;
      if (hasTeardown) { staffTimeline[nvChinh].push([tearStart, tearEnd]); staffTimeline[nvChinh] = mergeTimeline(staffTimeline[nvChinh]); staffLoad[nvChinh].used_mins += (tearEnd - tearStart); }

      // Block nhân viên phụ
      if (nvPhu) {
        blockStaff(nvPhu, tNow, tNow + tgNhanVien, khoangCach, staffTimeline, staffSetupReady, staffLoad, tenThuThuat, staffLastProc);
        if (hasTeardown) { staffTimeline[nvPhu].push([tearStart, tearEnd]); staffTimeline[nvPhu] = mergeTimeline(staffTimeline[nvPhu]); staffLoad[nvPhu].used_mins += (tearEnd - tearStart); }
      }

      // Block máy
      if (selectedMachine !== "Thủ công") { machineTimeline[selectedMachine].push([tNow, gioKetThuc]); machineTimeline[selectedMachine] = mergeTimeline(machineTimeline[selectedMachine]); }

      // Block giường
      if (selectedBed) { bedTracker[targetRoom][selectedBed].push([tNow, gioKetThuc]); bedTracker[targetRoom][selectedBed] = mergeTimeline(bedTracker[targetRoom][selectedBed]); }

      results.push({
        NGAY: ngayXep, HOTEN: patient.name, NAMSINH: patient.ns, PHONG: targetRoom,
        DICHVU: tenGoc, GIODIENRA: m2t(tNow), GIOKETTHUC: m2t(gioKetThuc),
        "NV CHÍNH": nvChinh, "NV PHỤ": nvPhu, MAY: selectedMachine, GIUONG: selectedBed || "",
        t_sort: tNow, PRIO: patient.leave !== 9999
      });
      localProcCount[tenThuThuat.toLowerCase()] = (localProcCount[tenThuThuat.toLowerCase()] || 0) + 1;
      patient.busy.push([tNow, gioKetThuc + 1]);
      patient.free_at = Math.max(patient.free_at, gioKetThuc + 1);
      patient.scheduled_count = (patient.scheduled_count || 0) + 1;
      return true;
    }
    return false;
  }

  // Đếm ca khả thi tại thời điểm t
  function countFeasibleSlots(patient, tFrom) {
    let count = 0;
    for (const tenTT of patient.pending) {
      const info = thuThuatInfo[tenTT.toLowerCase()] || ["Thủ công", 15, 5, "PHCN", 1, 0, [], 5];
      const tgMay = Math.max(info[1], info[2]), loaiMay = info[0];
      const possibleMachines = loaiMay === "Thủ công" ? [loaiMay] : (machineTypes[loaiMay] || []);
      const hasMachine = possibleMachines.some(m => m === "Thủ công" || !machineTimeline[m].some(slot => is_overlap(tFrom, tFrom + tgMay, slot[0], slot[1])));
      const hasStaff   = (staffBySkill[tenTT.toLowerCase()] || []).some(s => !staffTimeline[s].some(slot => is_overlap(tFrom, tFrom + tgMay + 1, slot[0], slot[1])));
      if (hasMachine && hasStaff) count++;
    }
    return count;
  }

  // Hàm so sánh ưu tiên bệnh nhân (dùng chung cho main loop và backfill)
  function sortPatientPriority(a, b) {
    // Ưu tiên 1: Ra viện hôm nay
    if (a.leave_pri !== b.leave_pri) return a.leave_pri - b.leave_pri;
    if (a.leave !== b.leave) return a.leave - b.leave;
    // Ưu tiên 2: Bệnh nhân cũ hoặc đến sớm (trước 11h)
    const groupA = (!a._isNew || a.arrive <= 660) ? 0 : 1;
    const groupB = (!b._isNew || b.arrive <= 660) ? 0 : 1;
    if (groupA !== groupB) return groupA - groupB;
    // Ưu tiên 3: Gói 2 thủ thuật tối thiểu
    const scheduledA = a.scheduled_count || 0, scheduledB = b.scheduled_count || 0;
    const tierA = Math.floor(scheduledA / 2), tierB = Math.floor(scheduledB / 2);
    if (tierA !== tierB) return tierA - tierB;
    if (scheduledA !== scheduledB) return scheduledB - scheduledA;
    // Ưu tiên 4: Thâm niên
    if (a._isNew !== b._isNew) return a._isNew ? 1 : -1;
    if (!a._isNew && a._ngayVaoNum !== b._ngayVaoNum) return a._ngayVaoNum - b._ngayVaoNum;
    return 0;
  }

  // ============================================================
  // MAIN SCHEDULING LOOP (2 pha)
  // ============================================================
  for (let phase = 1; phase <= 2; phase++) {
    if (phase === 2 && !patients.some(p => p.pending.length > 0)) break;
    let tNow = startOfDay;
    while (tNow <= endOfDay) {
      if (!patients.some(p => p.pending.length > 0)) break;
      let keepTrying = true;
      while (keepTrying) {
        keepTrying = false;
        const eligible = patients.filter(p => p.pending.length > 0 && p.free_at <= tNow && !p.busy.some(b => b[0] <= tNow && tNow < b[1]));
        if (eligible.length === 0) break;
        eligible.forEach(p => { p._feasible = countFeasibleSlots(p, tNow); });
        eligible.sort((a, b) => {
          const base = sortPatientPriority(a, b); if (base !== 0) return base;
          if (a.has_yhct !== b.has_yhct) return a.has_yhct - b.has_yhct;
          if (a.has_toan_tg !== b.has_toan_tg) return a.has_toan_tg - b.has_toan_tg;
          if (a._feasible !== b._feasible) return b._feasible - a._feasible;
          if (a.max_dur !== b.max_dur) return b.max_dur - a.max_dur;
          return a.randSeed - b.randSeed;
        });
        for (const patient of eligible) {
          for (let i = 0; i < patient.pending.length; i++) {
            if (tryScheduleOne(patient, patient.pending[i], tNow)) {
              patient.pending.splice(i, 1); updatePatientCache(patient, thuThuatInfo);
              keepTrying = true; break;
            }
          }
        }
      }
      tNow = getNextEvent(tNow, patients, staffTimeline, machineTimeline, endOfDay);
    }
  }

  // ============================================================
  // BACKFILL — Pass 1: Quét các điểm thời gian then chốt
  // ============================================================
  let remaining = patients.filter(p => p.pending.length > 0);
  if (remaining.length > 0) {
    const timePoints = new Set();
    Object.keys(staffTimeline).forEach(tenNV => {
      staffShifts[tenNV].forEach(([caStart]) => timePoints.add(caStart));
      staffTimeline[tenNV].forEach(slot => { if (slot[1] < endOfDay) timePoints.add(slot[1]); });
    });
    remaining.forEach(p => { if (p.free_at <= endOfDay) timePoints.add(p.free_at); });
    Object.values(machineTimeline).forEach(tl => tl.forEach(slot => { if (slot[1] < endOfDay) timePoints.add(slot[1]); }));

    for (const t of [...timePoints].sort((a, b) => a - b)) {
      if (t > endOfDay) break;
      const stillRemaining = patients.filter(p => p.pending.length > 0);
      if (stillRemaining.length === 0) break;
      let changed = true;
      while (changed) {
        changed = false;
        const eligible = stillRemaining.filter(p => p.free_at <= t && !p.busy.some(b => b[0] <= t && t < b[1]));
        eligible.sort((a, b) => {
          const base = sortPatientPriority(a, b); if (base !== 0) return base;
          if (a.has_yhct !== b.has_yhct) return a.has_yhct - b.has_yhct;
          return a.randSeed - b.randSeed;
        });
        for (const patient of eligible) {
          for (let i = 0; i < patient.pending.length; i++) {
            if (tryScheduleOne(patient, patient.pending[i], t)) {
              patient.pending.splice(i, 1); updatePatientCache(patient, thuThuatInfo);
              changed = true; break;
            }
          }
        }
      }
    }

    // ============================================================
    // BACKFILL — Pass 2: Sliding window chỉ lấy đầu khoảng trống
    // ============================================================
    remaining = patients.filter(p => p.pending.length > 0);
    if (remaining.length > 0) {
      for (const patient of remaining) {
        for (const tenThuThuat of [...patient.pending]) {
          if (!patient.pending.includes(tenThuThuat)) continue;
          const info = thuThuatInfo[tenThuThuat.toLowerCase()] || ["Thủ công", 15, 5, "PHCN", 1, 0, [], 5];
          const tgMay = Math.max(info[1], info[2]);
          const gapStarts = new Set();
          for (const tenNV of (staffBySkill[tenThuThuat.toLowerCase()] || [])) {
            const tl = mergeTimeline([...staffTimeline[tenNV]]);
            let prevEnd = startOfDay;
            for (const slot of tl) {
              if (slot[0] > prevEnd && prevEnd + tgMay <= endOfDay) gapStarts.add(prevEnd);
              prevEnd = Math.max(prevEnd, slot[1]);
            }
            if (prevEnd + tgMay <= endOfDay) gapStarts.add(prevEnd);
          }
          for (const t of [...gapStarts].sort((a, b) => a - b)) {
            if (t < (patient.free_at || 0) || patient.busy.some(b => b[0] <= t && t < b[1])) continue;
            if (tryScheduleOne(patient, tenThuThuat, t)) {
              const idx = patient.pending.indexOf(tenThuThuat);
              if (idx !== -1) { patient.pending.splice(idx, 1); updatePatientCache(patient, thuThuatInfo); }
              break;
            }
          }
        }
      }
    }
  }

  // Thu gom ca rớt
  patients.forEach(p => p.pending.forEach(tenTT => {
    const tenGoc = thuThuatInfo[tenTT.toLowerCase()]?.[8] || tenTT;
    tempDropList.push({ bn: p.name, ns: p.ns, tt: tenGoc, room: p.room, staff: "Trống", reason: "Thiếu nhân sự/Máy hoặc hết giờ" });
  }));

  // Cứu ca rớt bằng cách hoán đổi vai trò Bác sĩ - KTV
  const finalDropList = [];
  for (const rotItem of tempDropList) {
    let saved = false;
    const tenTT = rotItem.tt, tenBN = rotItem.bn, phong = rotItem.room || '';
    const infoRot = thuThuatInfo[tenTT.toLowerCase()] || ["Thủ công", 15, 5, "PHCN", 1, 0, [], 5];
    const tgCanThiet = Math.max(infoRot[1], infoRot[2]);
    const dsBacSi = (staffBySkill[tenTT.toLowerCase()] || []).filter(s => staffRole[s] === 'Bác sĩ');

    for (const bacSi of dsBacSi) {
      if (saved) break;
      const caDePHCN = results.filter(r => r["NV CHÍNH"] === bacSi && (thuThuatInfo[(r.DICHVU || "").toLowerCase()] || ["", "", "", "PHCN"])[3] === "PHCN");
      for (const caDe of caDePHCN) {
        const timeStart = t2m(caDe.GIODIENRA), timeEnd = t2m(caDe.GIOKETTHUC);
        if ((timeEnd - timeStart) < tgCanThiet) continue;
        const bnBusy = results.filter(r => r.HOTEN === tenBN).some(r => is_overlap(timeStart, timeStart + tgCanThiet, t2m(r.GIODIENRA), t2m(r.GIOKETTHUC)));
        if (bnBusy) continue;
        const bacSiBusy = staffTimeline[bacSi].some(slot => slot[0] === timeStart && slot[1] === timeEnd ? false : is_overlap(timeStart, timeStart + tgCanThiet, slot[0], slot[1]));
        if (bacSiBusy) continue;
        let ktvThayThe = null;
        const dsKTV = (staffBySkill[(caDe.DICHVU || "").toLowerCase()] || []).filter(k => staffRole[k] === 'Kỹ thuật viên');
        for (const ktv of dsKTV) { if (!staffTimeline[ktv]?.some(slot => is_overlap(timeStart, timeEnd, slot[0], slot[1]))) { ktvThayThe = ktv; break; } }
        if (ktvThayThe) {
          caDe["NV CHÍNH"] = ktvThayThe;
          if (!staffTimeline[ktvThayThe]) staffTimeline[ktvThayThe] = [];
          staffTimeline[ktvThayThe].push([timeStart, timeEnd]); staffTimeline[ktvThayThe] = mergeTimeline(staffTimeline[ktvThayThe]);
          results.push({ NGAY: ngayXep, HOTEN: tenBN, NAMSINH: rotItem.ns || "", PHONG: phong, DICHVU: tenTT, GIODIENRA: m2t(timeStart), GIOKETTHUC: m2t(timeStart + tgCanThiet), "NV CHÍNH": bacSi, "NV PHỤ": "", MAY: "Thủ công", GIUONG: "", t_sort: timeStart, PRIO: false });
          if (!staffTimeline[bacSi]) staffTimeline[bacSi] = [];
          staffTimeline[bacSi].push([timeStart, timeStart + tgCanThiet]); staffTimeline[bacSi] = mergeTimeline(staffTimeline[bacSi]);
          saved = true; localProcCount[tenTT.toLowerCase()] = (localProcCount[tenTT.toLowerCase()] || 0) + 1; break;
        }
      }
    }
    if (!saved) finalDropList.push(rotItem);
  }

  results.sort((a, b) => a["NV CHÍNH"] !== b["NV CHÍNH"] ? a["NV CHÍNH"].localeCompare(b["NV CHÍNH"]) : a.t_sort - b.t_sort);
  return { sched: results, rot: finalDropList, score: finalDropList.length, staff: staffLoad, proc: localProcCount, tl: staffTimeline, ca: staffShifts };
}

// ============================================================
// RUNNER XẾP LỊCH THƯỜNG NGÀY
// ============================================================
async function runScheduling(ngayXep, strategyKey, skipProcsStr) {
  const scenarioMap = { opt_rare: 1, balanced: 2, contingency: 3 };
  const scenario = scenarioMap[strategyKey] || 1;
  const {db} = await buildBaseDb();
  // Convert Staff from DB to rawStaff
  const dbStaff = await Staff.find();
  dbStaff.forEach(r => {
    if (r.trangThai !== "Nghỉ cả ngày") {
      db.rawStaff.push([
        r.ten, r.vaiTro, r.kyNang.join(","), r.thoiGianLam.join(","), r.gioBan.join(","), r.trangThai
      ]);
    }
  });
  const timezone = "Asia/Ho_Chi_Minh";

  // Chuẩn hóa giờ bận (cộng thêm 1 phút để tránh trùng biên)
  const fixBusyString = str => !str ? "" : String(str).split(",").map(b => {
    const parts = b.split("-");
    return parts.length === 2 ? parts[0].trim() + "-" + m2t(t2m(parts[1].trim()) + 1) : b;
  }).join(",");

  

  const skipList = skipProcsStr ? String(skipProcsStr).split(',').map(s => s.trim().toLowerCase()).filter(s => s) : [];
  const forcedDrops = [];

  const dbPatients = await Patient.find();
  dbPatients.forEach(r => {
    if (!r.thuThuat || r.thuThuat.length === 0) return;
    const gioVao = isEmptyTime(r.gioVao) ? 420 : t2m(r.gioVao);
    const busySlots = [];
    busySlots.push([0, gioVao + 1]);
    
    // Bổ sung giờ bận của bệnh nhân
    const pGioBan = fixBusyString(r.gioBan);
    if (pGioBan) {
      pGioBan.split(',').forEach(b => {
        const parts = b.split('-');
        if (parts.length === 2) busySlots.push([t2m(parts[0]), t2m(parts[1])]);
      });
    }
    const gioRa = isEmptyTime(r.gioRa) ? 9999 : t2m(r.gioRa);
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
      room: r.phong, arrive: gioVao, leave: gioRa, busy: busySlots,
      pending: pendingFiltered, free_at: gioVao + 1
    });
  });

  console.log("Patient 0 pending:", db.rawPatients[0] ? db.rawPatients[0].pending : "none");
  console.log("Raw staff length inside runScheduling:", db.rawStaff.length);
  
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
