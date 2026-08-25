function normalizeMonthKeys(inputStr) {
  const str = String(inputStr || '').trim();
  if (!str) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return [`${y}-${m}`, `${y}_${m}`, `${m}_${y}`, `${m}-${y}`, `${m}/${y}`];
  }
  const keys = [str];
  let m = str.match(/^(\d{4})[-_\/](\d{1,2})$/);
  if (m) {
    const y = m[1];
    const mo = m[2].padStart(2, '0');
    const moNoPad = String(parseInt(m[2], 10));
    keys.push(`${y}-${mo}`, `${y}_${mo}`, `${mo}_${y}`, `${mo}-${y}`, `${mo}/${y}`, `${moNoPad}_${y}`, `${y}_${moNoPad}`);
  }
  m = str.match(/^(\d{1,2})[-_\/](\d{4})$/);
  if (m) {
    const y = m[2];
    const mo = m[1].padStart(2, '0');
    const moNoPad = String(parseInt(m[1], 10));
    keys.push(`${y}-${mo}`, `${y}_${mo}`, `${mo}_${y}`, `${mo}-${y}`, `${mo}/${y}`, `${moNoPad}_${y}`, `${y}_${moNoPad}`);
  }
  return [...new Set(keys)];
}

/**
 * CLOUDFLARE WORKER BACKEND CHO PM-XEPLICH V3
 * Hoàn toàn tương thích 100% với toàn bộ 43 hàm và tham số của phiên bản V2
 * Tốc độ 10-25ms, Zero-CORS, D1 SQLite Database
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function success(data) {
  return jsonResponse({ status: "success", data });
}

function error(message, status = 400) {
  return jsonResponse({ status: "error", error: message }, status);
}

function parseStringOrJsonArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(x => String(x).trim()).filter(Boolean);
  const str = String(val).trim();
  if (!str || str === "[]") return [];
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed.map(x => (typeof x === "object" ? (x.name || x.ten || "") : String(x)).trim()).filter(Boolean);
  } catch(e) {}
  return str.split(",").map(x => x.trim()).filter(Boolean);
}



let schemaEnsured = false;
async function ensureSchema(db) {
  if (schemaEnsured || !db) return;
  try {
    const stmts = [
      db.prepare("CREATE TABLE IF NOT EXISTS cai_dat (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)"),
      db.prepare("CREATE TABLE IF NOT EXISTS tai_khoan (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', permissions TEXT DEFAULT '', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)"),
      db.prepare("CREATE TABLE IF NOT EXISTS nhan_su (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, role TEXT NOT NULL DEFAULT 'KTV', system TEXT NOT NULL DEFAULT 'PHCN', skills TEXT DEFAULT '', fixed_busy TEXT DEFAULT '', temp_busy TEXT DEFAULT '', his_name TEXT DEFAULT '', priority INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)"),
      db.prepare("CREATE TABLE IF NOT EXISTS may_moc (id INTEGER PRIMARY KEY AUTOINCREMENT, ten_loai TEXT NOT NULL, ma_may TEXT UNIQUE NOT NULL, trang_thai TEXT DEFAULT 'Sẵn sàng', order_idx INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)"),
      db.prepare("CREATE TABLE IF NOT EXISTS phong (id INTEGER PRIMARY KEY AUTOINCREMENT, ten_phong TEXT UNIQUE NOT NULL, bac_si TEXT DEFAULT '', ktv TEXT DEFAULT '', danh_sach_may TEXT DEFAULT '', so_giuong INTEGER DEFAULT 0, danh_sach_giuong TEXT DEFAULT '', order_idx INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)"),
      db.prepare("CREATE TABLE IF NOT EXISTS thu_thuat (id INTEGER PRIMARY KEY AUTOINCREMENT, ten_thu_thuat TEXT UNIQUE NOT NULL, viet_tat TEXT DEFAULT '', he TEXT DEFAULT 'PHCN', phan_loai TEXT DEFAULT '', may TEXT DEFAULT '', tg_thuc_hien INTEGER DEFAULT 30, tg_thu_thuat INTEGER DEFAULT 30, khoang_cach INTEGER DEFAULT 0, can_rut_may INTEGER DEFAULT 0, can_nguoi_phu INTEGER DEFAULT 0, ds_nguoi_phu TEXT DEFAULT '', order_idx INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)"),
      db.prepare("CREATE TABLE IF NOT EXISTS benh_nhan (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, age INTEGER DEFAULT 0, gender TEXT DEFAULT 'Nam', room TEXT DEFAULT '', bed TEXT DEFAULT '', arrive_time TEXT DEFAULT '07:30', leave_time TEXT DEFAULT '', thu_thuat TEXT NOT NULL DEFAULT '[]', status TEXT DEFAULT 'Chưa xếp', ngay_vao TEXT DEFAULT '', gio_ban TEXT DEFAULT '', is_saturday INTEGER DEFAULT 0, order_idx INTEGER DEFAULT 0, loai_bn TEXT DEFAULT 'NoiTru', buoi_dieu_tri TEXT DEFAULT 'Sang', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)"),
      db.prepare("CREATE TABLE IF NOT EXISTS lich_trinh (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, patient_name TEXT NOT NULL, dob TEXT DEFAULT '', room TEXT DEFAULT '', procedure_name TEXT NOT NULL, staff_name TEXT DEFAULT '', sub_staff_name TEXT DEFAULT '', machine_name TEXT DEFAULT '', bed TEXT DEFAULT '', start_time TEXT NOT NULL, end_time TEXT NOT NULL, is_saturday INTEGER DEFAULT 0, order_idx INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"),
      db.prepare("CREATE TABLE IF NOT EXISTS lich_su (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, patient_name TEXT NOT NULL, dob TEXT DEFAULT '', room TEXT DEFAULT '', procedure_name TEXT NOT NULL, staff_name TEXT DEFAULT '', sub_staff_name TEXT DEFAULT '', machine_name TEXT DEFAULT '', bed TEXT DEFAULT '', start_time TEXT NOT NULL, end_time TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"),
      db.prepare("CREATE TABLE IF NOT EXISTS gio_ban_cu (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, staff_name TEXT NOT NULL, busy_ranges TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"),
      db.prepare("DROP INDEX IF EXISTS idx_patients_name"),
      db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_name_age ON benh_nhan(name, age)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_lich_su_date ON lich_su(date)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_lich_trinh_date ON lich_trinh(date)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_gio_ban_cu_date ON gio_ban_cu(date)"),
      db.prepare("CREATE TABLE IF NOT EXISTS cham_cong (month_year TEXT PRIMARY KEY, data_json TEXT NOT NULL DEFAULT '{}', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)"),
      db.prepare("CREATE TABLE IF NOT EXISTS thong_ke (month_year TEXT PRIMARY KEY, data_json TEXT NOT NULL DEFAULT '{}', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)"),
      db.prepare("CREATE TABLE IF NOT EXISTS tim_ranh (id INTEGER PRIMARY KEY AUTOINCREMENT, procedure_name TEXT DEFAULT '', start_time TEXT DEFAULT '', end_time TEXT DEFAULT '', staff_name TEXT DEFAULT '', machine_name TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"),
      db.prepare("CREATE TABLE IF NOT EXISTS tai_lieu (id INTEGER PRIMARY KEY AUTOINCREMENT, doc_number TEXT DEFAULT '', title TEXT DEFAULT '', agency TEXT DEFAULT '', signed_date TEXT DEFAULT '', view_link TEXT DEFAULT '', download_link TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    ];
    await db.batch(stmts);

    // Migration safe column additions
    const migrations = [
      "ALTER TABLE may_moc ADD COLUMN is_active INTEGER DEFAULT 1",
      "ALTER TABLE may_moc ADD COLUMN order_idx INTEGER DEFAULT 0",
      "ALTER TABLE phong ADD COLUMN is_active INTEGER DEFAULT 1",
      "ALTER TABLE phong ADD COLUMN order_idx INTEGER DEFAULT 0",
      "ALTER TABLE thu_thuat ADD COLUMN is_active INTEGER DEFAULT 1",
      "ALTER TABLE thu_thuat ADD COLUMN order_idx INTEGER DEFAULT 0",
      "ALTER TABLE nhan_su ADD COLUMN is_active INTEGER DEFAULT 1",
      "ALTER TABLE nhan_su ADD COLUMN temp_busy TEXT DEFAULT ''",
      "ALTER TABLE nhan_su ADD COLUMN his_name TEXT DEFAULT ''",
      "ALTER TABLE nhan_su ADD COLUMN priority INTEGER DEFAULT 0",
      "ALTER TABLE nhan_su ADD COLUMN trang_thai TEXT DEFAULT 'Đi làm'",
      "ALTER TABLE nhan_su ADD COLUMN thoi_gian_lam TEXT DEFAULT '07:30-11:30, 13:00-16:30'",
      "ALTER TABLE nhan_su ADD COLUMN nguoi_thay_the TEXT DEFAULT 'Không'",
      "ALTER TABLE benh_nhan ADD COLUMN ngay_vao TEXT DEFAULT ''",
      "ALTER TABLE benh_nhan ADD COLUMN gio_ban TEXT DEFAULT ''",
      "ALTER TABLE benh_nhan ADD COLUMN is_saturday INTEGER DEFAULT 0",
      "ALTER TABLE benh_nhan ADD COLUMN order_idx INTEGER DEFAULT 0",
      "ALTER TABLE benh_nhan ADD COLUMN loai_bn TEXT DEFAULT 'NoiTru'",
      "ALTER TABLE benh_nhan ADD COLUMN buoi_dieu_tri TEXT DEFAULT 'Sang'"
    ];
    for (const sql of migrations) {
      try { await db.prepare(sql).run(); } catch(e) {}
    }
    schemaEnsured = true;
  } catch(err) {
    console.warn("[ensureSchema error]:", err);
  }
}

async function hashPassword(password, pepper = "TIMES_BVTKS_2026_SECURE_SALT_PEPPER") {
  const msgUint8 = new TextEncoder().encode(password + pepper);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function bumpDataVersion(db) {
  try {
    const v = String(Date.now());
    await db.prepare("INSERT INTO cai_dat (key, value) VALUES ('data_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(v).run();
  } catch(e) {}
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      let action = url.searchParams.get("action") || "";
      let args = [];

      if (request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        action = body.action || action;
        args = body.args || [];
      } else {
        const argsParam = url.searchParams.get("args");
        if (argsParam) {
          try { args = JSON.parse(argsParam); } catch (e) {}
        }
      }

      if (!action || action === "ping") {
        return success({ message: "PM-XepLich v3 Cloudflare API is running perfectly!", timestamp: new Date().toISOString() });
      }

      const res = await handleApiAction(action, args, env, request, ctx);
      if (res && res.status === 200) {
        dispatchBackgroundSync(action, args, env, ctx);
      }
      return res;
    } catch (err) {
      console.error("[Worker Error]:", err);
      return error("Lỗi máy chủ Worker: " + err.message, 500);
    }
  },

  async scheduled(event, env, ctx) {
    console.log("[Worker CRON]: Executing daily automated backup trigger...");
    try {
      const db = env.DB;
      if (!db) return;
      await ensureSchema(db);

      const rec = await db.prepare("SELECT value FROM cai_dat WHERE key = 'gdrive_webhook_url'").first();
      const webhookUrl = rec ? String(rec.value).trim() : "";
      if (!webhookUrl || !webhookUrl.startsWith("http")) {
        console.log("[Worker CRON]: No valid Google Drive Webhook URL configured. Skipping remote backup.");
        return;
      }

      const [
        tai_khoan, nhan_su, may_moc, phong, thu_thuat,
        benh_nhan, lich_trinh, lich_su, gio_ban_cu,
        cham_cong, thong_ke, tim_ranh, tai_lieu, cai_dat
      ] = await Promise.all([
        db.prepare("SELECT * FROM tai_khoan").all(),
        db.prepare("SELECT * FROM nhan_su").all(),
        db.prepare("SELECT * FROM may_moc").all(),
        db.prepare("SELECT * FROM phong").all(),
        db.prepare("SELECT * FROM thu_thuat").all(),
        db.prepare("SELECT * FROM benh_nhan").all(),
        db.prepare("SELECT * FROM lich_trinh").all(),
        db.prepare("SELECT * FROM lich_su").all(),
        db.prepare("SELECT * FROM gio_ban_cu").all(),
        db.prepare("SELECT * FROM cham_cong").all(),
        db.prepare("SELECT * FROM thong_ke").all(),
        db.prepare("SELECT * FROM tim_ranh").all(),
        db.prepare("SELECT * FROM tai_lieu").all(),
        db.prepare("SELECT * FROM cai_dat").all()
      ]);

      const backupData = {
        version: "v3.6",
        exportDate: new Date().toISOString(),
        tables: {
          tai_khoan: tai_khoan.results || [],
          nhan_su: nhan_su.results || [],
          may_moc: may_moc.results || [],
          phong: phong.results || [],
          thu_thuat: thu_thuat.results || [],
          benh_nhan: benh_nhan.results || [],
          lich_trinh: lich_trinh.results || [],
          lich_su: lich_su.results || [],
          gio_ban_cu: gio_ban_cu.results || [],
          cham_cong: cham_cong.results || [],
          thong_ke: thong_ke.results || [],
          tim_ranh: tim_ranh.results || [],
          tai_lieu: tai_lieu.results || [],
          cai_dat: cai_dat.results || []
        }
      };

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `PMCG_D1_Backup_AUTO_${dateStr}.json`;

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: filename,
          content: JSON.stringify(backupData)
        })
      });
      console.log(`[Worker CRON]: Automated backup uploaded to Google Drive successfully (${filename})!`);
    } catch(err) {
      console.error("[Worker CRON Error]:", err);
    }
  }
};

function dispatchBackgroundSync(action, args, env, ctx) {
  const MUTATION_ACTIONS = [
    "addBenhNhan", "editBenhNhan", "deleteBenhNhan", "bulkUpdateBenhNhan",
    "saveSchedule", "chotSo", "chuyenNgayMoi", "saveGioBan", "saveChamCong",
    "addNhanSu", "editNhanSu", "deleteNhanSu",
    "addMayMoc", "editMayMoc", "deleteMayMoc",
    "addPhong", "editPhong", "deletePhong",
    "addThuThuat", "editThuThuat", "deleteThuThuat",
    "saveSystemSettings", "saveGeneralSettings"
  ];

  if (!MUTATION_ACTIONS.includes(action)) return;
  if (!ctx || typeof ctx.waitUntil !== "function") return;

  ctx.waitUntil((async () => {
    try {
      const db = env.DB;
      if (!db) return;
      const rec = await db.prepare("SELECT value FROM cai_dat WHERE key = 'gdrive_webhook_url'").first();
      const webhookUrl = rec ? String(rec.value).trim() : "";
      if (!webhookUrl || !webhookUrl.startsWith("http")) return;

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: action,
          args: args,
          timestamp: new Date().toISOString()
        })
      });
      console.log(`[Background Sync]: Successfully dispatched mutation '${action}' to Google Sheets webhook.`);
    } catch (err) {
      console.warn(`[Background Sync Error] '${action}':`, err);
    }
  })());
}

async function handleApiAction(action, args, env, request, ctx) {
  const db = env.DB;
  if (!db) {
    return error("Database D1 chưa được cấu hình hoặc binding DB bị thiếu.", 500);
  }

  await ensureSchema(db);
  await checkAutoChotSo(db);

  switch (action) {
    // ============================================================
    // 1. BOOTSTRAP TOÀN DIỆN
    // ============================================================
    case "getBootstrapData": {
      // Lấy ngày từ client, hoặc tự tính theo múi giờ Việt Nam (UTC+7)
      const todayArg = args[0] || "";
      let todayVN = todayArg;
      if (!todayVN) {
        const nowVN = new Date(Date.now() + 7 * 60 * 60 * 1000);
        const yy = nowVN.getUTCFullYear();
        const mm = String(nowVN.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(nowVN.getUTCDate()).padStart(2, "0");
        todayVN = `${yy}-${mm}-${dd}`;
      }
      // Chuyển sang định dạng dd/MM/yyyy để khớp với cột ngay_vao trong DB
      const [ty, tm, td] = todayVN.split("-");
      const todayVNSlash = `${td}/${tm}/${ty}`; // VD: 21/08/2026

      const [settingsRes, staffRes, machinesRes, roomsRes, proceduresRes, patientsRes, scheduleRes, accountsRes] = await db.batch([
        db.prepare("SELECT key, value FROM cai_dat"),
        db.prepare("SELECT * FROM nhan_su  ORDER BY priority ASC, id ASC"),
        db.prepare("SELECT * FROM may_moc ORDER BY order_idx ASC, id ASC"),
        db.prepare("SELECT * FROM phong ORDER BY order_idx ASC, id ASC"),
        db.prepare("SELECT * FROM thu_thuat ORDER BY order_idx ASC, id ASC"),
        // Lấy tất cả bệnh nhân đang điều trị (is_saturday = 0)
        db.prepare("SELECT * FROM benh_nhan WHERE is_saturday = 0 ORDER BY order_idx ASC, id ASC"),
        // Chỉ lấy lịch của ngày hôm nay
        db.prepare("SELECT * FROM lich_trinh WHERE date = ? ORDER BY order_idx ASC, start_time ASC").bind(todayVN),
        db.prepare("SELECT id, username, role, permissions FROM tai_khoan")
      ]);

      const settingsObj = {};
      (settingsRes.results || []).forEach(r => { settingsObj[r.key] = r.value; });

      const may_moc = (machinesRes.results || []).map(m => ({
        id: m.id,
        tenLoai: m.ten_loai,
        maMay: m.ma_may,
        trangThai: m.trang_thai,
        name: m.ma_may,
        ten: m.ma_may
      }));

      const phong = (roomsRes.results || []).map(r => ({
        id: r.id,
        tenPhong: r.ten_phong,
        name: r.ten_phong,
        bacSi: r.bac_si || "",
        ktv: r.ktv || "",
        danhSachMay: r.danh_sach_may || "",
        soGiuong: r.so_giuong || 0,
        danhSachGiuong: r.danh_sach_giuong || ""
      }));

      let links = [];
      if (settingsObj.quick_links) {
        try {
          links = typeof settingsObj.quick_links === 'string' ? JSON.parse(settingsObj.quick_links) : settingsObj.quick_links;
        } catch(e) {}
      }
      const thu_thuat = (proceduresRes.results || []).map(p => ({
        id: p.id,
        ten: p.ten_thu_thuat,
        name: p.ten_thu_thuat,
        vietTat: p.viet_tat,
        he: p.he,
        phanLoai: p.phan_loai,
        may: p.may,
        thoiGianThucHien: p.tg_thuc_hien,
        thoiGianThuThuat: p.tg_thu_thuat,
        khoangCach: p.khoang_cach,
        canRutMay: p.can_rut_may,
        canNguoiPhu: p.can_nguoi_phu,
        dsNguoiPhu: p.ds_nguoi_phu
      }));

      // Staff
      const staffList = (staffRes.results || []).map((s, idx) => {
        const skillsArr = parseStringOrJsonArray(s.skills);
        const tempBusyArr = parseStringOrJsonArray(s.temp_busy);
        const kyNangStr = skillsArr.join(", ");
        const gioBanStr = tempBusyArr.join(", ");

        return {
          id: s.id || (idx + 1),
          ten: s.name,
          name: s.name,
          vaiTro: s.role || "Kỹ thuật viên",
          role: s.role || "Kỹ thuật viên",
          trangThai: s.trang_thai || "Đi làm",
          thoiGianLam: s.thoi_gian_lam || "07:30-11:30, 13:00-16:30",
          kyNang: kyNangStr,
          gioBan: gioBanStr,
          nguoiThayThe: s.nguoi_thay_the || "Không",
          quyen: s.system || "Cả hai",
          he: s.system || "Cả hai",
          system: s.system || "Cả hai",
          tenHis: s.his_name || "",
          priority: s.priority || 0
        };
      });

      // Patients
      const patientList = (patientsRes.results || []).map((p, idx) => {
        let procsArr = [];
        try {
          const parsed = JSON.parse(p.thu_thuat || "[]");
          if (Array.isArray(parsed)) {
            procsArr = parsed.map(x => (typeof x === "object" ? (x.name || x.ten || "") : String(x))).filter(Boolean);
          } else if (typeof parsed === "string") {
            procsArr = parsed.split(",").map(x => x.trim()).filter(Boolean);
          }
        } catch(e) {
          if (typeof p.thu_thuat === "string") {
            procsArr = p.thu_thuat.split(",").map(x => x.trim()).filter(Boolean);
          }
        }
        const thuThuatStr = procsArr.join(",");

        return {
          id: String(p.id || (idx + 1)),
          ten: p.name,
          namSinh: String(p.age || ""),
          ngayVao: p.ngay_vao || "",
          gioVao: p.arrive_time === "07:30" ? "" : (p.arrive_time || ""),
          gioBan: p.gio_ban || "",
          gioRa: p.leave_time || "",
          phong: p.room || "",
          thuThuat: thuThuatStr,
          status: p.status,
          loai_bn: p.loai_bn || "NoiTru",
          buoi_dieu_tri: p.buoi_dieu_tri || "TuDong"
        };
      }).filter(p => p.ten && p.ten.trim() !== "");

      // Schedule rows
      const scheduleRows = (scheduleRes.results || []).map(s => ([
        s.date,
        s.patient_name,
        s.dob || "",
        s.room || "",
        s.procedure_name,
        s.start_time,
        s.end_time,
        s.staff_name || "",
        s.sub_staff_name || "",
        s.machine_name || "",
        s.bed || ""
      ]));

      return success({
        settings: settingsObj,
        marquee: settingsObj.marquee_text || "PHẦN MỀM XẾP LỊCH THỦ THUẬT - KHOA YHCT - PHCN BVTKS CS2",
        links: links,
        machines: may_moc,
        may_moc: may_moc,
        rooms: phong,
        phong: phong,
        procedures: thu_thuat,
        thu_thuat: thu_thuat,
        staff: staffList,
        nhan_su: staffList,
        patients: patientList,
        benh_nhan: patientList,
        schedule: scheduleRows,
        schedules: scheduleRows,
        lich_trinh: scheduleRows,
        accounts: accountsRes.results || [],
        tai_khoan: accountsRes.results || [],
        version: "v3.0.0-cloudflare"
      });
    }

    case "getDataVersion": {
      const rec = await db.prepare("SELECT value FROM cai_dat WHERE key = 'data_version'").first();
      const v = rec ? String(rec.value) : "1";
      return success({ version: v });
    }

    // ============================================================
    // 2. CRUD MÁY MÓC
    // ============================================================
        case "getDanhSachMay": {
      const res = await db.prepare("SELECT * FROM may_moc ORDER BY order_idx ASC, id ASC").all();
      const list = (res.results || []).map((m, i) => [i + 1, m.ten_loai, m.ma_may, m.trang_thai]);
      return success(list);
    }

    case "addMayMoc": {
      const tenLoai = String(args[0] || "");
      const maMayPrefix = String(args[1] || "");
      const qty = parseInt(args[2]) || 1;
      const trangThai = String(args[3] || "Sẵn sàng");
      
      const stmts = [];
      if (qty > 1) {
        for (let i = 0; i < qty; i++) {
          stmts.push(db.prepare("INSERT INTO may_moc (ten_loai, ma_may, trang_thai) VALUES (?, ?, ?)").bind(tenLoai, `${maMayPrefix}${i + 1}`, trangThai));
        }
      } else {
        stmts.push(db.prepare("INSERT INTO may_moc (ten_loai, ma_may, trang_thai) VALUES (?, ?, ?)").bind(tenLoai, maMayPrefix, trangThai));
      }
      await db.batch(stmts);
      await bumpDataVersion(db);
      return success({ message: "Thêm thiết bị thành công" });
    }

    case "editMayMoc": {
      let offset = (typeof args[0] === "number" || (typeof args[0] === "string" && /^\d+$/.test(args[0]) && args.length >= 4)) ? 1 : 0;
      const tenLoai = String(args[offset] || "");
      const maMay = String(args[offset + 1] || "");
      const trangThai = String(args[offset + 2] || args[3] || "Sẵn sàng");
      await db.prepare("UPDATE may_moc SET ten_loai = ?, trang_thai = ? WHERE ma_may = ?").bind(tenLoai, trangThai, maMay).run();
      await bumpDataVersion(db);
      return success({ message: "Cập nhật thiết bị thành công" });
    }

    case "deleteMayMoc": {
      const maMay = String(args[1] || args[0] || "");
      await db.prepare("DELETE FROM may_moc WHERE ma_may = ?").bind(maMay).run();
      await bumpDataVersion(db);
      return success({ message: "Xóa thiết bị thành công" });
    }

    case "getThuThuat": {
      const res = await db.prepare("SELECT * FROM thu_thuat ORDER BY order_idx ASC, id ASC").all();
      return success((res.results || []).map(p => ({
        id: p.id,
        ten: p.ten_thu_thuat,
        name: p.ten_thu_thuat,
        vietTat: p.viet_tat,
        he: p.he,
        phanLoai: p.phan_loai,
        may: p.may,
        thoiGianThucHien: p.tg_thuc_hien,
        thoiGianThuThuat: p.tg_thu_thuat,
        khoangCach: p.khoang_cach,
        canRutMay: p.can_rut_may,
        canNguoiPhu: p.can_nguoi_phu,
        dsNguoiPhu: p.ds_nguoi_phu
      })));
    }

    case "addThuThuat":
    case "editThuThuat": {
      let offset = (typeof args[0] === "number" || (typeof args[0] === "string" && /^\d+$/.test(args[0]) && args.length >= 12)) ? 1 : 0;
      const ten = String(args[offset] || "");
      const vietTat = String(args[offset + 1] || "");
      const he = String(args[offset + 2] || "YHCT");
      const phanLoai = String(args[offset + 3] || "");
      const may = String(args[offset + 4] || "");
      const tgTh = parseInt(args[offset + 5]) || 0;
      const tgTt = parseInt(args[offset + 6]) || 0;
      const kc = parseInt(args[offset + 7]) || 0;
      const rut = String(args[offset + 8] || "Không");
      const phu = String(args[offset + 9] || "Không");
      const dsPhu = String(args[offset + 10] || "");

      await db.prepare(`INSERT INTO thu_thuat (ten_thu_thuat, viet_tat, he, phan_loai, may, tg_thuc_hien, tg_thu_thuat, khoang_cach, can_rut_may, can_nguoi_phu, ds_nguoi_phu)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(ten_thu_thuat) DO UPDATE SET viet_tat = excluded.viet_tat, he = excluded.he, phan_loai = excluded.phan_loai, may = excluded.may, tg_thuc_hien = excluded.tg_thuc_hien, tg_thu_thuat = excluded.tg_thu_thuat, khoang_cach = excluded.khoang_cach, can_rut_may = excluded.can_rut_may, can_nguoi_phu = excluded.can_nguoi_phu, ds_nguoi_phu = excluded.ds_nguoi_phu`)
        .bind(ten, vietTat, he, phanLoai, may, tgTh, tgTt, kc, rut, phu, dsPhu).run();
      await bumpDataVersion(db);
      return success({ message: "Lưu thủ thuật thành công" });
    }

    case "deleteThuThuat": {
      const ten = String(args[1] || args[0] || "");
      await db.prepare("DELETE FROM thu_thuat WHERE ten_thu_thuat = ?").bind(ten).run();
      await bumpDataVersion(db);
      return success({ message: "Xóa thủ thuật thành công" });
    }

    case "getPhongThuThuat": {
      const res = await db.prepare("SELECT * FROM phong ORDER BY order_idx ASC, id ASC").all();
      return success((res.results || []).map(r => ({
        id: r.id,
        tenPhong: r.ten_phong,
        name: r.ten_phong,
        bacSi: r.bac_si || "",
        ktv: r.ktv || "",
        danhSachMay: r.danh_sach_may || "",
        soGiuong: r.so_giuong || 0,
        danhSachGiuong: r.danh_sach_giuong || ""
      })));
    }

    case "addPhong":
    case "editPhong": {
      let offset = (typeof args[0] === "number" || (typeof args[0] === "string" && /^\d+$/.test(args[0]) && args.length >= 7)) ? 1 : 0;
      const tenPhong = String(args[offset] || "");
      const bacSi = String(args[offset + 1] || "");
      const ktv = String(args[offset + 2] || "");
      const danhSachMay = String(args[offset + 3] || "");
      const soGiuong = parseInt(args[offset + 4]) || 0;
      const danhSachGiuong = String(args[offset + 5] || "");

      await db.prepare(`INSERT INTO phong (ten_phong, bac_si, ktv, danh_sach_may, so_giuong, danh_sach_giuong)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(ten_phong) DO UPDATE SET bac_si = excluded.bac_si, ktv = excluded.ktv, danh_sach_may = excluded.danh_sach_may, so_giuong = excluded.so_giuong, danh_sach_giuong = excluded.danh_sach_giuong`)
        .bind(tenPhong, bacSi, ktv, danhSachMay, soGiuong, danhSachGiuong).run();
      await bumpDataVersion(db);
      return success({ message: "Lưu phòng thành công" });
    }

    case "deletePhong": {
      const ten = String(args[1] || args[0] || "");
      await db.prepare("DELETE FROM phong WHERE ten_phong = ?").bind(ten).run();
      await bumpDataVersion(db);
      return success({ message: "Xóa phòng thành công" });
    }

    case "getNhanSu": {
      try {
        await db.prepare("DELETE FROM nhan_su WHERE name GLOB '[0-9]*' OR name = '' OR name IS NULL").run();
      } catch(e) {}

      const res = await db.prepare("SELECT * FROM nhan_su WHERE name NOT GLOB '[0-9]*' ORDER BY priority ASC, id ASC").all();
      const list = (res.results || []).map((s, idx) => {
        const skillsArr = parseStringOrJsonArray(s.skills);
        const tempBusyArr = parseStringOrJsonArray(s.temp_busy);
        const kyNangStr = skillsArr.join(", ");
        const gioBanStr = tempBusyArr.join(", ");

        return {
          id: s.id || (idx + 1),
          ten: s.name,
          name: s.name,
          vaiTro: s.role || "Kỹ thuật viên",
          role: s.role || "Kỹ thuật viên",
          trangThai: s.trang_thai || "Đi làm",
          thoiGianLam: s.thoi_gian_lam || "07:30-11:30, 13:00-16:30",
          kyNang: kyNangStr,
          gioBan: gioBanStr,
          nguoiThayThe: s.nguoi_thay_the || "Không",
          quyen: s.system || "Cả hai",
          he: s.system || "Cả hai",
          system: s.system || "Cả hai",
          tenHis: s.his_name || "",
          priority: s.priority || 0
        };
      });
      return success(list);
    }

    case "addNhanSu": {
      let s = (typeof args[0] === "object" && args[0] !== null) ? args[0] : {
        ten: args[0],
        vaiTro: args[1],
        trangThai: args[2],
        thoiGianLam: args[3],
        kyNang: args[4],
        gioBan: args[5],
        nguoiThayThe: args[6],
        quyen: args[7],
        tenHis: args[8]
      };

      const sName = String(s.ten || s.name || "").trim();
      if (!sName || /^\d+$/.test(sName)) return error("Tên nhân sự không hợp lệ");
      const sRole = String(s.vaiTro || s.role || "Kỹ thuật viên").trim();
      const sTrangThai = String(s.trangThai || s.trang_thai || "Đi làm").trim();
      const sThoiGianLam = String(s.thoiGianLam || s.thoi_gian_lam || "07:30-11:30, 13:00-16:30").trim();
      const sNguoiThayThe = String(s.nguoiThayThe || s.nguoi_thay_the || "Không").trim();
      const sSystem = String(s.quyen || s.system || "Cả hai").trim();
      const skillsArr = parseStringOrJsonArray(s.kyNang !== undefined ? s.kyNang : s.skills);
      const tempBusyArr = parseStringOrJsonArray(s.gioBan !== undefined ? s.gioBan : s.temp_busy);
      const sSkills = JSON.stringify(skillsArr);
      const sTempBusy = JSON.stringify(tempBusyArr);

      await db.prepare(
        "INSERT INTO nhan_su (name, role, system, skills, temp_busy, his_name, trang_thai, thoi_gian_lam, nguoi_thay_the) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(name) DO UPDATE SET role = excluded.role, system = excluded.system, skills = excluded.skills, temp_busy = excluded.temp_busy, his_name = excluded.his_name, trang_thai = excluded.trang_thai, thoi_gian_lam = excluded.thoi_gian_lam, nguoi_thay_the = excluded.nguoi_thay_the, updated_at = CURRENT_TIMESTAMP"
      ).bind(sName, sRole, sSystem, sSkills, sTempBusy, String(s.tenHis || ""), sTrangThai, sThoiGianLam, sNguoiThayThe).run();
      await bumpDataVersion(db);
      return success(true);
    }

    case "editNhanSu": {
      let s;
      if (typeof args[0] === "object" && args[0] !== null) {
        s = args[0];
      } else if (typeof args[0] === "number" || /^\d+$/.test(String(args[0]))) {
        s = {
          ten: args[1],
          vaiTro: args[2],
          trangThai: args[3],
          thoiGianLam: args[4],
          kyNang: args[5],
          gioBan: args[6],
          nguoiThayThe: args[7],
          quyen: args[8],
          tenHis: args[9]
        };
      } else {
        s = {
          ten: args[0],
          vaiTro: args[1],
          trangThai: args[2],
          thoiGianLam: args[3],
          kyNang: args[4],
          gioBan: args[5],
          nguoiThayThe: args[6],
          quyen: args[7],
          tenHis: args[8]
        };
      }

      const sName = String(s.ten || s.name || "").trim();
      if (!sName || /^\d+$/.test(sName)) return error("Tên nhân sự không hợp lệ");
      const sRole = String(s.vaiTro || s.role || "Kỹ thuật viên").trim();
      const sTrangThai = String(s.trangThai || s.trang_thai || "Đi làm").trim();
      const sThoiGianLam = String(s.thoiGianLam || s.thoi_gian_lam || "07:30-11:30, 13:00-16:30").trim();
      const sNguoiThayThe = String(s.nguoiThayThe || s.nguoi_thay_the || "Không").trim();
      const sSystem = String(s.quyen || s.system || "Cả hai").trim();
      const skillsArr = parseStringOrJsonArray(s.kyNang !== undefined ? s.kyNang : s.skills);
      const tempBusyArr = parseStringOrJsonArray(s.gioBan !== undefined ? s.gioBan : s.temp_busy);
      const sSkills = JSON.stringify(skillsArr);
      const sTempBusy = JSON.stringify(tempBusyArr);

      await db.prepare(
        "INSERT INTO nhan_su (name, role, system, skills, temp_busy, his_name, trang_thai, thoi_gian_lam, nguoi_thay_the) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(name) DO UPDATE SET role = excluded.role, system = excluded.system, skills = excluded.skills, temp_busy = excluded.temp_busy, his_name = excluded.his_name, trang_thai = excluded.trang_thai, thoi_gian_lam = excluded.thoi_gian_lam, nguoi_thay_the = excluded.nguoi_thay_the, updated_at = CURRENT_TIMESTAMP"
      ).bind(sName, sRole, sSystem, sSkills, sTempBusy, String(s.tenHis || ""), sTrangThai, sThoiGianLam, sNguoiThayThe).run();
      await bumpDataVersion(db);
      return success(true);
    }

    case "deleteNhanSu": {
      const name = typeof args[1] === "string" ? args[1] : (typeof args[0] === "string" ? args[0] : null);
      if (name && !/^\d+$/.test(name)) {
        await db.prepare("DELETE FROM nhan_su WHERE name = ?").bind(name).run();
        await bumpDataVersion(db);
      } else {
        const idx = typeof args[0] === "number" ? args[0] : parseInt(args[0]);
        if (!isNaN(idx)) {
          const allStaff = await db.prepare("SELECT id FROM nhan_su WHERE name NOT GLOB '[0-9]*' ORDER BY priority ASC, id ASC").all();
          if (allStaff.results && allStaff.results[idx]) {
            await db.prepare("DELETE FROM nhan_su WHERE id = ?").bind(allStaff.results[idx].id).run();
            await bumpDataVersion(db);
          }
        }
      }
      return success(true);
    }

    // ============================================================
    // 6. CRUD BỆNH NHÂN
    // ============================================================
    case "getBenhNhan": {
      const res = await db.prepare("SELECT * FROM benh_nhan WHERE is_saturday = 0 ORDER BY ngay_vao ASC, name ASC").all();
      const list = (res.results || []).map(r => {
        let procs = [];
        try { procs = JSON.parse(r.thu_thuat || "[]"); } catch(e) {
          if (typeof r.thu_thuat === "string") procs = r.thu_thuat.split(",").map(x => ({ name: x.trim() }));
        }
        const procNames = procs.map(p => typeof p === "string" ? p : (p.name || p.ten || "")).filter(Boolean);
        return {
          id: r.id,
          ten: r.name,
          name: r.name,
          namSinh: r.age,
          age: r.age,
          gioiTinh: r.gender,
          phong: r.room,
          room: r.room,
          giuong: r.bed,
          gioVao: r.arrive_time,
          gioRa: r.leave_time,
          ngayVao: r.ngay_vao,
          gioBan: r.gio_ban,
          thuThuat: procNames.join(", "),
          thu_thuat: procs,
          trangThai: r.status,
          status: r.status,
          loai_bn: r.loai_bn || "NoiTru",
          buoi_dieu_tri: r.buoi_dieu_tri || "TuDong"
        };
      });
      return success(list);
    }

    case "addBenhNhan": {
      // Signature: (ten, namSinh, ngayVao, gioVao, gioBan, gioRa, phong, thuThuat) or (patientObject)
      let p = (typeof args[0] === "object") ? args[0] : {
        ten: args[0],
        namSinh: args[1],
        ngayVao: args[2],
        gioVao: args[3],
        gioBan: args[4],
        gioRa: args[5],
        phong: args[6],
        thuThuat: args[7],
        loai_bn: args[8],
        buoi_dieu_tri: args[9]
      };

      const procs = typeof p.thuThuat === "string" ? p.thuThuat.split(",").map(x => ({ name: x.trim(), status: "Chưa xếp" })) : (p.thu_thuat || []);
      const versionVal = String(Date.now());
      
      const res = await db.batch([
        db.prepare(
          "INSERT INTO benh_nhan (name, age, gender, room, bed, arrive_time, leave_time, thu_thuat, status, ngay_vao, gio_ban, loai_bn, buoi_dieu_tri) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(name, age) DO UPDATE SET age = excluded.age, room = excluded.room, arrive_time = excluded.arrive_time, leave_time = excluded.leave_time, thu_thuat = excluded.thu_thuat, ngay_vao = excluded.ngay_vao, gio_ban = excluded.gio_ban, loai_bn = excluded.loai_bn, buoi_dieu_tri = excluded.buoi_dieu_tri, updated_at = CURRENT_TIMESTAMP"
        ).bind(
          String(p.ten || p.name || ""),
          parseInt(p.namSinh || p.age) || 0,
          String(p.gender || "Nam"),
          String(p.phong || p.room || ""),
          String(p.bed || ""),
          String(p.gioVao || p.arriveTime || "07:30"),
          String(p.gioRa || p.leaveTime || ""),
          JSON.stringify(procs),
          String(p.status || "Chưa xếp"),
          String(p.ngayVao || ""),
          String(p.gioBan || ""),
          String(p.loai_bn || "NoiTru"),
          String(p.buoi_dieu_tri || "TuDong")
        ),
        db.prepare("INSERT INTO cai_dat (key, value) VALUES ('data_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(versionVal)
      ]);
      return success({ id: res[0]?.meta?.last_row_id || 0 });
    }

    case "editBenhNhan": {
      // Signature: (rowIndex, ten, namSinh, ngayVao, gioVao, gioBan, gioRa, phong, thuThuat, oldTen, oldNamSinh) or (patientObject)
      let offset = (typeof args[0] === "number" || (typeof args[0] === "string" && /^\d+$/.test(args[0]) && args.length >= 9)) ? 1 : 0;
      let p = (typeof args[0] === "object" && args[0] !== null) ? args[0] : {
        ten: args[offset],
        namSinh: args[offset + 1],
        ngayVao: args[offset + 2],
        gioVao: args[offset + 3],
        gioBan: args[offset + 4],
        gioRa: args[offset + 5],
        phong: args[offset + 6],
        thuThuat: args[offset + 7],
        oldTen: args[offset + 8] || args[offset],
        oldNamSinh: args[offset + 9] || args[offset + 1],
        loai_bn: args[offset + 10],
        buoi_dieu_tri: args[offset + 11]
      };

      const procs = typeof p.thuThuat === "string" ? p.thuThuat.split(",").map(x => ({ name: x.trim(), status: "Chưa xếp" })).filter(x => x.name) : (p.thu_thuat || []);
      const patName = String(p.ten || p.name || "").trim();
      const targetName = String(p.oldTen || patName).trim();
      const targetAge = parseInt(p.oldNamSinh || p.namSinh || p.age) || 0;
      const versionVal = String(Date.now());

      const updateStmt = db.prepare(
        "UPDATE benh_nhan SET name = ?, age = ?, gender = ?, room = ?, bed = ?, arrive_time = ?, leave_time = ?, thu_thuat = ?, status = ?, ngay_vao = ?, gio_ban = ?, loai_bn = ?, buoi_dieu_tri = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ? AND age = ?"
      ).bind(
        patName,
        parseInt(p.namSinh || p.age) || 0,
        String(p.gender || "Nam"),
        String(p.phong || p.room || ""),
        String(p.bed || ""),
        String(p.gioVao || p.arriveTime || "07:30"),
        String(p.gioRa || p.leaveTime || ""),
        JSON.stringify(procs),
        String(p.status || "Chưa xếp"),
        String(p.ngayVao || ""),
        String(p.gioBan || ""),
        String(p.loai_bn || "NoiTru"),
        String(p.buoi_dieu_tri || "TuDong"),
        targetName,
        targetAge
      );

      const bumpStmt = db.prepare("INSERT INTO cai_dat (key, value) VALUES ('data_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(versionVal);

      const batchRes = await db.batch([updateStmt, bumpStmt]);
      const updateRes = batchRes[0];

      if (updateRes.meta && updateRes.meta.changes === 0) {
        await db.prepare(
          "INSERT INTO benh_nhan (name, age, gender, room, bed, arrive_time, leave_time, thu_thuat, status, ngay_vao, gio_ban, loai_bn, buoi_dieu_tri) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(name, age) DO UPDATE SET age = excluded.age, gender = excluded.gender, room = excluded.room, bed = excluded.bed, arrive_time = excluded.arrive_time, leave_time = excluded.leave_time, thu_thuat = excluded.thu_thuat, status = excluded.status, ngay_vao = excluded.ngay_vao, gio_ban = excluded.gio_ban, loai_bn = excluded.loai_bn, buoi_dieu_tri = excluded.buoi_dieu_tri, updated_at = CURRENT_TIMESTAMP"
        ).bind(
          patName,
          parseInt(p.namSinh || p.age) || 0,
          String(p.gender || "Nam"),
          String(p.phong || p.room || ""),
          String(p.bed || ""),
          String(p.gioVao || p.arriveTime || "07:30"),
          String(p.gioRa || p.leaveTime || ""),
          JSON.stringify(procs),
          String(p.status || "Chưa xếp"),
          String(p.ngayVao || ""),
          String(p.gioBan || ""),
          String(p.loai_bn || "NoiTru"),
          String(p.buoi_dieu_tri || "TuDong")
        ).run();
      }

      return success(true);
    }

    case "deleteBenhNhan": {
      // Signature: (rowIndex, ten, namSinh) or (name)
      const ten = typeof args[1] === "string" && args[1] ? args[1] : (typeof args[0] === "string" && !/^\d+$/.test(args[0]) ? args[0] : null);
      if (ten) {
        await db.prepare("DELETE FROM benh_nhan WHERE name = ?").bind(ten).run();
        await bumpDataVersion(db);
      } else {
        const idx = typeof args[0] === "number" ? args[0] : parseInt(args[0]);
        if (!isNaN(idx)) {
          const allPats = await db.prepare("SELECT id FROM benh_nhan WHERE is_saturday = 0 ORDER BY ngay_vao ASC, name ASC").all();
          if (allPats.results && allPats.results[idx]) {
            await db.prepare("DELETE FROM benh_nhan WHERE id = ?").bind(allPats.results[idx].id).run();
            await bumpDataVersion(db);
          }
        }
      }
      return success(true);
    }

    case "saveReorderedData": {
      const type = args[0] || "";
      const list = args[1] || [];
      const stmts = [];

      try {
        if (type === "benh_nhan") {
          list.forEach((p, idx) => {
            const name = String(p.ten || p.name || "").trim();
            const id = p.id;
            if (name) {
              stmts.push(db.prepare("UPDATE benh_nhan SET order_idx = ? WHERE name = ? OR id = ?").bind(idx + 1, name, id || 0));
            }
          });
        } else if (type === "nhan_su") {
          list.forEach((s, idx) => {
            const name = String(s.ten || s.name || "").trim();
            const id = s.id;
            if (name) {
              stmts.push(db.prepare("UPDATE nhan_su SET priority = ? WHERE name = ? OR id = ?").bind(idx + 1, name, id || 0));
            }
          });
        } else if (type === "may_moc") {
          list.forEach((m, idx) => {
            const ma = String(m.maMay || m[2] || m.ten || m.name || "").trim();
            if (ma) {
              stmts.push(db.prepare("UPDATE may_moc SET order_idx = ? WHERE ma_may = ?").bind(idx + 1, ma));
            }
          });
        } else if (type === "phong") {
          list.forEach((r, idx) => {
            const ten = String(r.tenPhong || r.ten || r.name || r[1] || "").trim();
            if (ten) {
              stmts.push(db.prepare("UPDATE phong SET order_idx = ? WHERE ten_phong = ?").bind(idx + 1, ten));
            }
          });
        } else if (type === "thu_thuat") {
          list.forEach((p, idx) => {
            const ten = String(p.ten || p.name || p.ten_thu_thuat || "").trim();
            if (ten) {
              stmts.push(db.prepare("UPDATE thu_thuat SET order_idx = ? WHERE ten_thu_thuat = ?").bind(idx + 1, ten));
            }
          });
        }

        if (stmts.length > 0) {
          await db.batch(stmts);
          await bumpDataVersion(db);
        }
      } catch (e) {
        console.warn("[saveReorderedData error]:", e);
      }
      return success({ message: `Đã lưu thứ tự ${type} thành công!` });
    }

    case "bulkUpdatePatients": {
      const patientList = Array.isArray(args[0]) ? args[0] : [];
      const replaceAll = Boolean(args[1]);

      if (replaceAll) {
        await db.prepare("DELETE FROM benh_nhan WHERE is_saturday = 0 OR is_saturday IS NULL OR is_saturday = ''").run();
      }

      const insertStatements = [];
      patientList.forEach((p, idx) => {
        if (!p || typeof p !== "object") return;
        const name = String(p.ten || p.name || "").trim();
        if (!name) return;

        const age = parseInt(String(p.namSinh || p.age || "0").replace(/\D/g, "")) || 0;
        const ngayVao = String(p.ngayVao || p.ngay_vao || "");
        const gioVaoRaw = p.gioVao !== undefined ? p.gioVao : (p.arrive_time !== undefined ? p.arrive_time : "");
        const gioVao = String(gioVaoRaw || "07:30");
        const gioBan = String(p.gioBan || p.gio_ban || "");
        const gioRa = String(p.gioRa || p.leave_time || "");
        const room = String(p.phong || p.room || "");
        const gender = String(p.gioiTinh || p.gender || "Nam");
        const bed = String(p.giuong || p.bed || "");
        const status = String(p.trangThai || p.status || "Chưa xếp");
        const loaiBn = String(p.loai_bn || p.loaiBN || "NoiTru");
        const buoiDieuTri = String(p.buoi_dieu_tri || p.buoiDieuTri || "TuDong");

        const rawProcs = p.thuThuat !== undefined ? p.thuThuat : (p.thu_thuat !== undefined ? p.thu_thuat : "");
        let procs = [];
        if (typeof rawProcs === "string" && rawProcs.trim()) {
          procs = rawProcs.split(",").map(x => ({ name: x.trim(), status: "Chưa xếp" })).filter(x => x.name);
        } else if (Array.isArray(rawProcs)) {
          procs = rawProcs.map(x => {
            if (typeof x === "string") return { name: x.trim(), status: "Chưa xếp" };
            if (x && typeof x === "object" && x.name) return { name: String(x.name), status: String(x.status || "Chưa xếp") };
            return null;
          }).filter(Boolean).filter(x => x.name);
        }
        const procsJson = JSON.stringify(procs);

        const sql = replaceAll
          ? "INSERT INTO benh_nhan (name, age, gender, room, bed, arrive_time, leave_time, thu_thuat, status, ngay_vao, gio_ban, loai_bn, buoi_dieu_tri, order_idx) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
          : "INSERT INTO benh_nhan (name, age, gender, room, bed, arrive_time, leave_time, thu_thuat, status, ngay_vao, gio_ban, loai_bn, buoi_dieu_tri, order_idx) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(name, age) DO UPDATE SET age = excluded.age, gender = excluded.gender, room = excluded.room, bed = excluded.bed, arrive_time = excluded.arrive_time, leave_time = excluded.leave_time, thu_thuat = excluded.thu_thuat, status = excluded.status, ngay_vao = excluded.ngay_vao, gio_ban = excluded.gio_ban, loai_bn = excluded.loai_bn, buoi_dieu_tri = excluded.buoi_dieu_tri, order_idx = excluded.order_idx, updated_at = CURRENT_TIMESTAMP";

        insertStatements.push(
          db.prepare(sql).bind(
            name,       // 1: name (TEXT)
            age,        // 2: age (INTEGER)
            gender,     // 3: gender (TEXT)
            room,       // 4: room (TEXT)
            bed,        // 5: bed (TEXT)
            gioVao,     // 6: arrive_time (TEXT)
            gioRa,      // 7: leave_time (TEXT)
            procsJson,  // 8: thu_thuat (TEXT, JSON)
            status,     // 9: status (TEXT)
            ngayVao,    // 10: ngay_vao (TEXT)
            gioBan,     // 11: gio_ban (TEXT)
            loaiBn,     // 12: loai_bn (TEXT)
            buoiDieuTri,// 13: buoi_dieu_tri (TEXT)
            idx         // 14: order_idx (INTEGER)
          )
        );
      });

      if (insertStatements.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < insertStatements.length; i += chunkSize) {
          await db.batch(insertStatements.slice(i, i + chunkSize));
        }
        await bumpDataVersion(db);
      }

      return success({ message: `Cập nhật danh sách ${patientList.length} bệnh nhân thành công!` });
    }

    case "getSchedule":
    case "getLichTrinh": {
      const date = args[0] || new Date().toISOString().slice(0, 10);
      const res = await db.prepare("SELECT * FROM lich_trinh WHERE date = ? ORDER BY order_idx ASC, start_time ASC").bind(date).all();
      const rows = (res.results || []).map(s => [
        s.date, s.patient_name, s.dob || "", s.room || "", s.procedure_name, s.start_time, s.end_time, s.staff_name || "", s.sub_staff_name || "", s.machine_name || "", s.bed || ""
      ]);
      return success(rows);
    }

    case "saveSchedule": {
      const date = args[0] || new Date().toISOString().slice(0, 10);
      const rows = args[1] || [];

      const statements = [
        db.prepare("DELETE FROM lich_trinh WHERE date = ?").bind(date)
      ];

      rows.forEach((r, idx) => {
        statements.push(
          db.prepare("INSERT INTO lich_trinh (date, patient_name, dob, room, procedure_name, start_time, end_time, staff_name, sub_staff_name, machine_name, bed, order_idx) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(
            r[0] || date,
            r[1] || "",
            r[2] || "",
            r[3] || "",
            r[4] || "",
            r[5] || "",
            r[6] || "",
            r[7] || "",
            r[8] || "",
            r[9] || "",
            r[10] || "",
            idx
          )
        );
      });

      if (statements.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < statements.length; i += chunkSize) {
          await db.batch(statements.slice(i, i + chunkSize));
        }
        await bumpDataVersion(db);
      }
      return success(true);
    }

    case "chuyenNgayMoi":
    case "chotSo": {
      const date = args[0];
      
      const statements = [];
      if (date && typeof date === "string" && date.trim()) {
        statements.push(
          db.prepare("INSERT INTO lich_su (date, patient_name, dob, room, procedure_name, start_time, end_time, staff_name, sub_staff_name, machine_name, bed) SELECT date, patient_name, dob, room, procedure_name, start_time, end_time, staff_name, sub_staff_name, machine_name, bed FROM lich_trinh WHERE date = ?").bind(date.trim()),
          db.prepare("DELETE FROM lich_trinh WHERE date = ?").bind(date.trim())
        );
      } else {
        statements.push(
          db.prepare("INSERT INTO lich_su (date, patient_name, dob, room, procedure_name, start_time, end_time, staff_name, sub_staff_name, machine_name, bed) SELECT date, patient_name, dob, room, procedure_name, start_time, end_time, staff_name, sub_staff_name, machine_name, bed FROM lich_trinh"),
          db.prepare("DELETE FROM lich_trinh")
        );
      }

      // Xóa bệnh nhân đã có giờ ra viện
      statements.push(
        db.prepare("DELETE FROM benh_nhan WHERE leave_time IS NOT NULL AND TRIM(leave_time) != '' AND LOWER(leave_time) != 'none'"),
        // Reset giờ vào về 07:30, xóa giờ bận, giờ ra, và reset status về 'Chưa xếp'
        db.prepare("UPDATE benh_nhan SET arrive_time = '07:30', gio_ban = '', leave_time = '', status = 'Chưa xếp', updated_at = CURRENT_TIMESTAMP"),
        // Reset giờ bận tạm thời của nhân viên
        db.prepare("UPDATE nhan_su SET temp_busy = '[]', updated_at = CURRENT_TIMESTAMP")
      );

      await db.batch(statements);
      await bumpDataVersion(db);
      return success({ message: "Đã chốt sổ và chuyển ngày mới thành công!" });
    }

        // ============================================================
    // BATCH IMPORT LỊCH SỬ & SỔ THỦ THUẬT
    // ============================================================
    case "importHistoryRecords": {
      const records = args[0] || [];
      if (!Array.isArray(records) || records.length === 0) return success({ count: 0 });
      
      const stmts = [];
      for (const r of records) {
        stmts.push(
          db.prepare(`INSERT INTO lich_su (date, patient_name, dob, room, procedure_name, start_time, end_time, staff_name, sub_staff_name, machine_name, bed)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(r.date || "", r.patient_name || "", r.dob || "", r.room || "", r.procedure_name || "", r.start_time || "", r.end_time || "", r.staff_name || "", r.sub_staff_name || "", r.machine_name || "", r.bed || "")
        );
      }
      
      // Execute in chunks of 50
      for (let i = 0; i < stmts.length; i += 50) {
        await db.batch(stmts.slice(i, i + 50));
      }
      return success({ count: records.length });
    }

    case "importHistoryBusy": {
      const busyList = args[0] || [];
      if (!Array.isArray(busyList) || busyList.length === 0) return success({ count: 0 });

      const stmts = [];
      for (const b of busyList) {
        stmts.push(
          db.prepare(`INSERT INTO gio_ban_cu (date, staff_name, busy_ranges) VALUES (?, ?, ?)`)
            .bind(b.date || "", b.name || "", typeof b.busy_ranges === 'string' ? b.busy_ranges : JSON.stringify(b.busy_ranges || ""))
        );
      }
      for (let i = 0; i < stmts.length; i += 50) {
        await db.batch(stmts.slice(i, i + 50));
      }
      return success({ count: busyList.length });
    }

        case "getHistoryFullData": {
      const rawDate = args[0] || "";
      let ymd = rawDate;
      let dmy = rawDate;
      if (rawDate.includes('/')) {
        const p = rawDate.split('/');
        if (p.length === 3) {
          const d = p[0].padStart(2, '0');
          const m = p[1].padStart(2, '0');
          const y = p[2];
          ymd = `${y}-${m}-${d}`;
          dmy = `${d}/${m}/${y}`;
        }
      } else if (rawDate.includes('-')) {
        const p = rawDate.split('-');
        if (p.length === 3) {
          const y = p[0];
          const m = p[1].padStart(2, '0');
          const d = p[2].padStart(2, '0');
          ymd = `${y}-${m}-${d}`;
          dmy = `${d}/${m}/${y}`;
        }
      }

      // Query lich_su first
      let histRes = { results: [] };
      try {
        histRes = await db.prepare("SELECT date, patient_name, dob, room, procedure_name, start_time, end_time, staff_name, sub_staff_name, machine_name, bed FROM lich_su WHERE date = ? OR date = ? ORDER BY start_time ASC").bind(ymd, dmy).all();
      } catch (e) {
        console.warn("Error querying lich_su:", e);
      }

      let rows = histRes.results || [];
      // Fallback: If no records in lich_su, check lich_trinh (e.g. today's active schedule)
      if (rows.length === 0) {
        try {
          const fallbackRes = await db.prepare("SELECT date, patient_name, dob, room, procedure_name, start_time, end_time, staff_name, sub_staff_name, machine_name, bed FROM lich_trinh WHERE date = ? OR date = ? ORDER BY start_time ASC").bind(ymd, dmy).all();
          rows = fallbackRes.results || [];
        } catch (e) {
          console.warn("Error querying fallback lich_trinh:", e);
        }
      }

      // Safe query for gio_ban_cu
      let busyRows = [];
      try {
        const busyRes = await db.prepare("SELECT date, staff_name, busy_ranges FROM gio_ban_cu WHERE date = ? OR date = ?").bind(ymd, dmy).all();
        busyRows = busyRes.results || [];
      } catch (e) {
        // gio_ban_cu optional
      }

      const schedule = rows.map(r => ({
        ngay: r.date,
        tenBN: r.patient_name,
        namSinh: r.dob || "",
        phong: r.room || "",
        thuThuat: r.procedure_name,
        gioDienRa: r.start_time,
        gioKetThuc: r.end_time,
        nvChinh: r.staff_name || "",
        nvPhu: r.sub_staff_name || "",
        may: r.machine_name || "",
        giuong: r.bed || ""
      }));

      // Aggregate unique benh_nhan with dsThuThuat list
      const patMap = {};
      rows.forEach(r => {
        const key = `${String(r.patient_name).trim().toUpperCase()}|${String(r.dob || '').trim()}`;
        if (!patMap[key]) {
          patMap[key] = { tenBN: r.patient_name, namSinh: r.dob || "", phong: r.room || "", soLuongCa: 0, dsThuThuat: [] };
        }
        patMap[key].soLuongCa++;
        const tt = String(r.procedure_name || '').trim();
        if (tt && !patMap[key].dsThuThuat.includes(tt)) patMap[key].dsThuThuat.push(tt);
      });
      const benh_nhan = Object.values(patMap);

      // Staff busy & Patient busy synthesis
      const staffBusy = [];
      const patBusyMap = {};
      
      if (busyRows.length > 0) {
        busyRows.forEach(b => {
          const str = String(b.busy_ranges || '');
          const slots = str.split(',').map(s => {
            const parts = s.split('-');
            return parts.length === 2 ? { from: parts[0].trim(), to: parts[1].trim(), tt: 'Báo bận' } : null;
          }).filter(Boolean);
          staffBusy.push({ ten: b.staff_name, slots: slots });
        });
      } else {
        const staffMap = {};
        rows.forEach(r => {
          const nv = String(r.staff_name || '').trim();
          if (!nv) return;
          if (!staffMap[nv]) staffMap[nv] = [];
          staffMap[nv].push({ from: r.start_time, to: r.end_time, tt: r.procedure_name });
        });
        Object.keys(staffMap).forEach(nv => {
          staffBusy.push({ ten: nv, slots: staffMap[nv] });
        });
      }

      // Synthesize patient busy time from schedule
      rows.forEach(r => {
        const patName = String(r.patient_name || '').trim();
        if (!patName) return;
        const key = `${patName.toUpperCase()}|${String(r.dob || '').trim()}`;
        if (!patBusyMap[key]) {
          patBusyMap[key] = { tenBN: patName, namSinh: r.dob || "", slots: [] };
        }
        if (r.start_time && r.end_time && r.start_time !== '--' && !r.start_time.includes('Rớt')) {
          patBusyMap[key].slots.push({ from: r.start_time, to: r.end_time, tt: r.procedure_name });
        }
      });

      return success({
        schedule: schedule,
        patients: benh_nhan,
        benh_nhan: benh_nhan,
        staffBusy: staffBusy,
        patBusy: Object.values(patBusyMap)
      });
    }

    case "getScheduleData": {
      const targetDate = args[0];
      let ymd = targetDate || "";
      let dmy = targetDate || "";
      if (ymd.includes('/')) {
        const p = ymd.split('/');
        ymd = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      } else if (ymd.includes('-')) {
        const p = ymd.split('-');
        dmy = `${p[2]}/${p[1]}/${p[0]}`;
      }

      // Check current schedule table first
      let res = await db.prepare("SELECT date, patient_name, dob, room, procedure_name, start_time, end_time, staff_name, sub_staff_name, machine_name, bed FROM lich_trinh WHERE date = ? OR date = ? ORDER BY start_time ASC").bind(ymd, dmy).all();
      
      // If not in current schedule, fallback to lich_su
      if (!res.results || res.results.length === 0) {
        res = await db.prepare("SELECT date, patient_name, dob, room, procedure_name, start_time, end_time, staff_name, sub_staff_name, machine_name, bed FROM lich_su WHERE date = ? OR date = ? ORDER BY start_time ASC").bind(ymd, dmy).all();
      }

      const rows = (res.results || []).map(r => ({
        ngay: r.date,
        tenBN: r.patient_name,
        namSinh: r.dob || "",
        phong: r.room || "",
        thuThuat: r.procedure_name,
        gioDienRa: r.start_time,
        gioKetThuc: r.end_time,
        nvChinh: r.staff_name || "",
        nvPhu: r.sub_staff_name || "",
        may: r.machine_name || "",
        giuong: r.bed || ""
      }));
      return success(rows);
    }

    case "getSatData": {
      const staffRes = await db.prepare("SELECT name, role FROM nhan_su ").all();
      const patRes = await db.prepare("SELECT id, name, age, arrive_time, room, thu_thuat FROM benh_nhan WHERE is_saturday = 0").all();
      
      const nhan_su = (staffRes.results || []).map(r => ({ ten: r.name, vaiTro: r.role }));
      const benh_nhan = (patRes.results || []).map(r => {
        let procs = [];
        try { procs = JSON.parse(r.thu_thuat || "[]").map(x => (typeof x === "object" ? x.name : x)); } catch(e) {}
        return {
          id: String(r.id),
          ten: r.name,
          namSinh: String(r.age || ""),
          gioVao: r.arrive_time || "",
          phong: r.room || "",
          thuThuat: procs.join(","),
          loaiBn: "Thường"
        };
      });
      return success({ staff: nhan_su, patients: benh_nhan, nhan_su, benh_nhan });
    }

    case "getTimRanhData": {
      const res = await db.prepare("SELECT procedure_name, start_time, end_time, staff_name, machine_name FROM tim_ranh ORDER BY rowid ASC").all();
      if (res.results && res.results.length > 0) {
        return success(res.results.map(r => ({
          thuThuat: r.procedure_name,
          gioDienRa: r.start_time,
          gioKetThuc: r.end_time,
          nvChinh: r.staff_name,
          may: r.machine_name
        })));
      }
      // Fallback to schedule
      const sched = await db.prepare("SELECT procedure_name, start_time, end_time, staff_name, machine_name FROM lich_trinh ORDER BY start_time ASC").all();
      return success((sched.results || []).map(r => ({
        thuThuat: r.procedure_name,
        gioDienRa: r.start_time,
        gioKetThuc: r.end_time,
        nvChinh: r.staff_name,
        may: r.machine_name
      })));
    }

    // ============================================================
    // 8. CẤU HÌNH & CHỮ CHẠY
    // ============================================================
    case "getMarqueeText":
    case "layThongBaoDongChuChay": {
      const rec = await db.prepare("SELECT value FROM cai_dat WHERE key = 'marquee_text'").first();
      return success(rec ? rec.value : "PHẦN MỀM XẾP LỊCH THỦ THUẬT - KHOA YHCT - PHCN BVTKS CS2");
    }

    case "saveMarqueeText":
    case "luuThongBaoDongChuChay": {
      const text = args[0] || "";
      await db.prepare("INSERT INTO cai_dat (key, value) VALUES ('marquee_text', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(String(text)).run();
      await bumpDataVersion(db);
      return success(true);
    }

    case "getSystemSettings": {
      const res = await db.prepare("SELECT key, value FROM cai_dat").all();
      const obj = {};
      (res.results || []).forEach(r => { obj[r.key] = r.value; });
      return success(obj);
    }

    case "saveSystemSettings": {
      const settings = args[0] || {};
      const statements = [];
      for (const [k, v] of Object.entries(settings)) {
        statements.push(
          db.prepare("INSERT INTO cai_dat (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
          .bind(String(k), String(v ?? ""))
        );
      }
      if (statements.length > 0) {
        await db.batch(statements);
        await bumpDataVersion(db);
      }
      return success(true);
    }

    // ============================================================
    // 9. QUẢN LÝ TÀI KHOẢN
    // ============================================================
    case "getAccounts": {
      const res = await db.prepare("SELECT id, username, role, permissions FROM tai_khoan").all();
      const list = (res.results || []).map(r => ({
        id: r.id,
        user: r.username,
        hasPassword: true,
        role: r.role,
        perms: r.permissions
      }));
      return success(list);
    }

    case "saveAccount": {
      let acc = (typeof args[0] === "object") ? args[0] : {
        id: args[0],
        username: args[1],
        password: args[2],
        role: args[3],
        permissions: args[4]
      };

      const username = String(acc.username || acc.user || "").trim();
      const password = String(acc.password || "");
      const role = String(acc.role || "nhan_su");
      const permissions = String(acc.permissions || acc.perms || "view");

      if (!username) return error("Tên đăng nhập không được trống");

      if (password) {
        const passHash = await hashPassword(password);
        await db.prepare(
          "INSERT INTO tai_khoan (username, password_hash, role, permissions) VALUES (?, ?, ?, ?) ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role, permissions = excluded.permissions"
        ).bind(username, passHash, role, permissions).run();
      } else {
        await db.prepare(
          "INSERT INTO tai_khoan (username, role, permissions) VALUES (?, ?, ?) ON CONFLICT(username) DO UPDATE SET role = excluded.role, permissions = excluded.permissions"
        ).bind(username, role, permissions).run();
      }
      await bumpDataVersion(db);
      const isNew = !acc.id;
      return success(isNew ? "Đã tạo tài khoản mới thành công!" : "Đã cập nhật tài khoản thành công!");
    }

    case "checkLogin":
    case "verifyLogin": {
      const username = args[0] || "";
      const password = args[1] || "";
      if (!username || !password) return error("Thiếu tên đăng nhập hoặc mật khẩu");

      // Auto-seed default admin account if tai_khoan is empty
      try {
        const countRes = await db.prepare("SELECT COUNT(*) as cnt FROM tai_khoan").first();
        if (countRes && countRes.cnt === 0) {
          const defaultHash = "5a629d34f1d19b97e0928fc4e08358899367c19bbfe880f6b75d71c48754ee1c"; // hash of 'admin'
          await db.prepare("INSERT INTO tai_khoan (username, password_hash, role, permissions) VALUES ('admin', ?, 'Admin', 'all')").bind(defaultHash).run();
        }
      } catch (e) {
        console.warn("Auto-seed error:", e);
      }

      const user = await db.prepare("SELECT * FROM tai_khoan WHERE username = ?").bind(username).first();
      if (!user) return error("Tài khoản không tồn tại");

      const hashedInput = await hashPassword(password);
      if (user.password_hash !== hashedInput && user.password_hash !== password) {
        return error("Mật khẩu không chính xác");
      }

      if (user.password_hash === password) {
        await db.prepare("UPDATE tai_khoan SET password_hash = ? WHERE id = ?").bind(hashedInput, user.id).run();
      }

      return success({
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        token: "session_cf_" + crypto.randomUUID()
      });
    }

    case "updateNameEverywhere": {
      const oldName = args[0] || "";
      const newName = args[1] || "";
      if (oldName && newName) {
        await db.prepare("UPDATE nhan_su SET name = ? WHERE name = ?").bind(newName, oldName).run();
        await db.prepare("UPDATE lich_trinh SET staff_name = ? WHERE staff_name = ?").bind(newName, oldName).run();
      }
      return success({ message: "Đã đổi tên nhân sự trên toàn hệ thống!" });
    }

    case "getScoreWeights": {
      const rec = await db.prepare("SELECT value FROM cai_dat WHERE key = 'score_weights'").first();
      return success(rec ? JSON.parse(rec.value) : { wTime: 1.0, wBusy: 2.0, wRoom: 1.5 });
    }

    case "caiDatTuDongChotSo":
    case "setupDailyChotSo": {
      return success({ message: "Cloudflare Workers CRON đã được cấu hình tự động chốt sổ lúc 17:00 hàng ngày." });
    }

    case "autoChotSo": {
      // Auto archive today's schedule into lich_su
      const today = new Date().toISOString().slice(0, 10);
      const sched = await db.prepare("SELECT * FROM lich_trinh WHERE date = ?").bind(today).all();
      if (sched.results && sched.results.length > 0) {
        const stmts = sched.results.map(r => db.prepare(
          "INSERT INTO lich_su (date, patient_name, dob, room, procedure_name, start_time, end_time, staff_name, sub_staff_name, machine_name, bed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(r.date, r.patient_name, r.dob, r.room, r.procedure_name, r.start_time, r.end_time, r.staff_name, r.sub_staff_name, r.machine_name, r.bed));
        await db.batch(stmts);
      }
      return success({ message: "Đã tự động chốt sổ thành công!" });
    }

    case "executeSeed": {
      const statements = args[0] || [];
      if (!Array.isArray(statements) || statements.length === 0) return success({ message: "Empty statements" });
      
      const stmts = statements.map(s => db.prepare(s));
      for (let i = 0; i < stmts.length; i += 50) {
        await db.batch(stmts.slice(i, i + 50));
      }
      return success({ message: "Seed execution successful!", count: stmts.length });
    }

    case "getFileContent": {
      const fileName = args[0] || "";
      let monthYear = fileName.replace('.json', '');
      let rec = await db.prepare("SELECT data_json FROM cham_cong WHERE month_year = ?").bind(monthYear).first();
      if (!rec) rec = await db.prepare("SELECT data_json FROM thong_ke WHERE month_year = ?").bind(monthYear).first();
      return success(rec ? JSON.parse(rec.data_json) : null);
    }

    case "exportDatabase": {
      const [
        tai_khoan, nhan_su, may_moc, phong, thu_thuat,
        benh_nhan, lich_trinh, lich_su, gio_ban_cu,
        cham_cong, thong_ke, tim_ranh, tai_lieu, cai_dat
      ] = await Promise.all([
        db.prepare("SELECT * FROM tai_khoan").all(),
        db.prepare("SELECT * FROM nhan_su").all(),
        db.prepare("SELECT * FROM may_moc").all(),
        db.prepare("SELECT * FROM phong").all(),
        db.prepare("SELECT * FROM thu_thuat").all(),
        db.prepare("SELECT * FROM benh_nhan").all(),
        db.prepare("SELECT * FROM lich_trinh").all(),
        db.prepare("SELECT * FROM lich_su").all(),
        db.prepare("SELECT * FROM gio_ban_cu").all(),
        db.prepare("SELECT * FROM cham_cong").all(),
        db.prepare("SELECT * FROM thong_ke").all(),
        db.prepare("SELECT * FROM tim_ranh").all(),
        db.prepare("SELECT * FROM tai_lieu").all(),
        db.prepare("SELECT * FROM cai_dat").all()
      ]);

      const backup = {
        version: "v3.4",
        exportDate: new Date().toISOString(),
        tables: {
          tai_khoan: tai_khoan.results || [],
          nhan_su: nhan_su.results || [],
          may_moc: may_moc.results || [],
          phong: phong.results || [],
          thu_thuat: thu_thuat.results || [],
          benh_nhan: benh_nhan.results || [],
          lich_trinh: lich_trinh.results || [],
          lich_su: lich_su.results || [],
          gio_ban_cu: gio_ban_cu.results || [],
          cham_cong: cham_cong.results || [],
          thong_ke: thong_ke.results || [],
          tim_ranh: tim_ranh.results || [],
          tai_lieu: tai_lieu.results || [],
          cai_dat: cai_dat.results || []
        }
      };

      return success(backup);
    }



    case "getGoogleDriveSettings": {
      const rec = await db.prepare("SELECT value FROM cai_dat WHERE key = 'gdrive_webhook_url'").first();
      return success(rec ? rec.value : "");
    }

    case "saveGoogleDriveSettings": {
      const url = String(args[0] || "").trim();
      await db.prepare("INSERT INTO cai_dat (key, value) VALUES ('gdrive_webhook_url', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(url).run();
      return success({ message: "Đã lưu cài đặt Google Drive Webhook thành công!" });
    }

    case "testGoogleDriveUpload": {
      const webhookUrl = String(args[0] || "").trim();
      if (!webhookUrl || !webhookUrl.startsWith("http")) {
        return error("URL Webhook Google Drive không hợp lệ!");
      }

      const [
        tai_khoan, nhan_su, may_moc, phong, thu_thuat,
        benh_nhan, lich_trinh, lich_su, gio_ban_cu,
        cham_cong, thong_ke, tim_ranh, tai_lieu, cai_dat
      ] = await Promise.all([
        db.prepare("SELECT * FROM tai_khoan").all(),
        db.prepare("SELECT * FROM nhan_su").all(),
        db.prepare("SELECT * FROM may_moc").all(),
        db.prepare("SELECT * FROM phong").all(),
        db.prepare("SELECT * FROM thu_thuat").all(),
        db.prepare("SELECT * FROM benh_nhan").all(),
        db.prepare("SELECT * FROM lich_trinh").all(),
        db.prepare("SELECT * FROM lich_su").all(),
        db.prepare("SELECT * FROM gio_ban_cu").all(),
        db.prepare("SELECT * FROM cham_cong").all(),
        db.prepare("SELECT * FROM thong_ke").all(),
        db.prepare("SELECT * FROM tim_ranh").all(),
        db.prepare("SELECT * FROM tai_lieu").all(),
        db.prepare("SELECT * FROM cai_dat").all()
      ]);

      const backup = {
        version: "v3.6",
        exportDate: new Date().toISOString(),
        tables: {
          tai_khoan: tai_khoan.results || [],
          nhan_su: nhan_su.results || [],
          may_moc: may_moc.results || [],
          phong: phong.results || [],
          thu_thuat: thu_thuat.results || [],
          benh_nhan: benh_nhan.results || [],
          lich_trinh: lich_trinh.results || [],
          lich_su: lich_su.results || [],
          gio_ban_cu: gio_ban_cu.results || [],
          cham_cong: cham_cong.results || [],
          thong_ke: thong_ke.results || [],
          tim_ranh: tim_ranh.results || [],
          tai_lieu: tai_lieu.results || [],
          cai_dat: cai_dat.results || []
        }
      };

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `PMCG_D1_Backup_TEST_${dateStr}.json`;

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: filename,
          content: JSON.stringify(backup)
        })
      });

      if (response.ok) {
        return success({ message: `Đã tự động tải file sao lưu [${filename}] lên Google Drive thành công!` });
      } else {
        const text = await response.text().catch(() => "");
        return error("Lỗi từ Google Drive Webhook: " + (text || response.statusText));
      }
    }

    case "importDatabase": {
      const backupData = args[0];
      if (!backupData || !backupData.tables) {
        return error("File sao lưu không hợp lệ hoặc thiếu dữ liệu bảng.");
      }

      const tables = backupData.tables;
      const clearStmts = [
        db.prepare("DELETE FROM tai_khoan"),
        db.prepare("DELETE FROM nhan_su"),
        db.prepare("DELETE FROM may_moc"),
        db.prepare("DELETE FROM phong"),
        db.prepare("DELETE FROM thu_thuat"),
        db.prepare("DELETE FROM benh_nhan"),
        db.prepare("DELETE FROM lich_trinh"),
        db.prepare("DELETE FROM lich_su"),
        db.prepare("DELETE FROM gio_ban_cu"),
        db.prepare("DELETE FROM cham_cong"),
        db.prepare("DELETE FROM thong_ke"),
        db.prepare("DELETE FROM tim_ranh"),
        db.prepare("DELETE FROM tai_lieu"),
        db.prepare("DELETE FROM cai_dat")
      ];
      await db.batch(clearStmts);

      const stmts = [];

      if (Array.isArray(tables.tai_khoan)) {
        tables.tai_khoan.forEach(r => stmts.push(db.prepare("INSERT INTO tai_khoan (id, username, password_hash, role, permissions, updated_at) VALUES (?, ?, ?, ?, ?, ?)").bind(
          r.id ?? null,
          r.username || '',
          r.password_hash || '',
          r.role || 'user',
          r.permissions || '',
          r.updated_at || new Date().toISOString()
        )));
      }

      if (Array.isArray(tables.nhan_su)) {
        tables.nhan_su.forEach(r => stmts.push(db.prepare("INSERT INTO nhan_su (id, name, role, system, skills, fixed_busy, temp_busy, his_name, priority, is_active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(
          r.id ?? null,
          r.name || r.ten || '',
          r.role || r.vai_tro || 'KTV',
          r.system || r.he || 'PHCN',
          r.skills || r.ky_nang || '',
          r.fixed_busy || '',
          r.temp_busy || '',
          r.his_name || '',
          r.priority || 0,
          r.is_active ?? 1,
          r.updated_at || new Date().toISOString()
        )));
      }

      if (Array.isArray(tables.may_moc)) {
        tables.may_moc.forEach(r => stmts.push(db.prepare("INSERT INTO may_moc (id, ten_loai, ma_may, trang_thai, is_active) VALUES (?, ?, ?, ?, ?)").bind(
          r.id ?? null,
          r.ten_loai || r.type_name || '',
          r.ma_may || r.machine_code || '',
          r.trang_thai || r.status || 'Sẵn sàng',
          r.is_active ?? 1
        )));
      }

      if (Array.isArray(tables.phong)) {
        tables.phong.forEach(r => stmts.push(db.prepare("INSERT INTO phong (id, ten_phong, bac_si, ktv, danh_sach_may, so_giuong, danh_sach_giuong, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(
          r.id ?? null,
          r.ten_phong || r.name || '',
          r.bac_si || r.doctor || '',
          r.ktv || r.ktv_list || '',
          r.danh_sach_may || r.machine_list || '',
          r.so_giuong || r.bed_count || 0,
          r.danh_sach_giuong || r.bed_list || '',
          r.is_active ?? 1
        )));
      }

      if (Array.isArray(tables.thu_thuat)) {
        tables.thu_thuat.forEach(r => stmts.push(db.prepare("INSERT INTO thu_thuat (id, ten_thu_thuat, viet_tat, he, phan_loai, may, tg_thuc_hien, tg_thu_thuat, khoang_cach, can_rut_may, can_nguoi_phu, ds_nguoi_phu, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(
          r.id ?? null,
          r.ten_thu_thuat || r.name || '',
          r.viet_tat || r.short_name || '',
          r.he || r.system || 'YHCT',
          r.phan_loai || r.category || 'Loại 2',
          r.may || r.machine_type || '',
          r.tg_thuc_hien || r.prep_time || 5,
          r.tg_thu_thuat || r.exec_time || 20,
          r.khoang_cach || r.gap_time || 5,
          r.can_rut_may || r.need_unplug || 0,
          r.can_nguoi_phu || r.need_assistant || 0,
          r.ds_nguoi_phu || r.assistant_list || '',
          r.is_active ?? 1
        )));
      }

      if (Array.isArray(tables.benh_nhan)) {
        tables.benh_nhan.forEach(r => stmts.push(db.prepare("INSERT INTO benh_nhan (id, name, age, gender, room, bed, arrive_time, leave_time, thu_thuat, status, is_saturday, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(
          r.id ?? null,
          r.name || '',
          r.age || 0,
          r.gender || 'Nam',
          r.room || '',
          r.bed || '',
          r.arrive_time || '07:30',
          r.leave_time || '',
          r.thu_thuat || '[]',
          r.status || 'Chưa xếp',
          r.is_saturday || 0,
          r.created_at || new Date().toISOString(),
          r.updated_at || new Date().toISOString()
        )));
      }

      if (Array.isArray(tables.lich_trinh)) {
        tables.lich_trinh.forEach(r => stmts.push(db.prepare("INSERT INTO lich_trinh (id, date, patient_name, room, procedure_name, staff_name, machine_name, start_time, end_time, is_saturday, order_idx, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(
          r.id ?? null,
          r.date || '',
          r.patient_name || '',
          r.room || '',
          r.procedure_name || '',
          r.staff_name || '',
          r.machine_name || '',
          r.start_time || '',
          r.end_time || '',
          r.is_saturday || 0,
          r.order_idx || 0,
          r.created_at || new Date().toISOString()
        )));
      }

      if (Array.isArray(tables.lich_su)) {
        tables.lich_su.forEach(r => stmts.push(db.prepare("INSERT INTO lich_su (id, date, patient_name, room, procedure_name, staff_name, machine_name, start_time, end_time, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(
          r.id ?? null,
          r.date || '',
          r.patient_name || '',
          r.room || '',
          r.procedure_name || '',
          r.staff_name || '',
          r.machine_name || '',
          r.start_time || '',
          r.end_time || '',
          r.created_at || new Date().toISOString()
        )));
      }

      if (Array.isArray(tables.gio_ban_cu)) {
        tables.gio_ban_cu.forEach(r => stmts.push(db.prepare("INSERT INTO gio_ban_cu (id, date, staff_name, busy_ranges, created_at) VALUES (?, ?, ?, ?, ?)").bind(
          r.id ?? null,
          r.date || '',
          r.staff_name || '',
          r.busy_ranges || '',
          r.created_at || new Date().toISOString()
        )));
      }

      if (Array.isArray(tables.cham_cong)) {
        tables.cham_cong.forEach(r => stmts.push(db.prepare("INSERT INTO cham_cong (month_year, data_json, updated_at) VALUES (?, ?, ?)").bind(
          r.month_year || '',
          r.data_json || '{}',
          r.updated_at || new Date().toISOString()
        )));
      }

      if (Array.isArray(tables.thong_ke)) {
        tables.thong_ke.forEach(r => stmts.push(db.prepare("INSERT INTO thong_ke (month_year, data_json, updated_at) VALUES (?, ?, ?)").bind(
          r.month_year || '',
          r.data_json || '{}',
          r.updated_at || new Date().toISOString()
        )));
      }

      if (Array.isArray(tables.tim_ranh)) {
        tables.tim_ranh.forEach(r => stmts.push(db.prepare("INSERT INTO tim_ranh (id, procedure_name, start_time, end_time, staff_name, machine_name) VALUES (?, ?, ?, ?, ?, ?)").bind(
          r.id ?? null,
          r.procedure_name || '',
          r.start_time || '',
          r.end_time || '',
          r.staff_name || '',
          r.machine_name || ''
        )));
      }

      if (Array.isArray(tables.tai_lieu)) {
        tables.tai_lieu.forEach(r => stmts.push(db.prepare("INSERT INTO tai_lieu (id, doc_number, title, agency, signed_date, view_link, download_link) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(
          r.id ?? null,
          r.doc_number || '',
          r.title || r.ten_van_ban || '',
          r.agency || '',
          r.signed_date || '',
          r.url || r.view_link || '#',
          r.download_link || r.url || '#'
        )));
      }

      if (Array.isArray(tables.cai_dat)) {
        tables.cai_dat.forEach(r => stmts.push(db.prepare("INSERT INTO cai_dat (key, value, updated_at) VALUES (?, ?, ?)").bind(
          r.key || '',
          r.value || '',
          r.updated_at || new Date().toISOString()
        )));
      }

      for (let i = 0; i < stmts.length; i += 50) {
        await db.batch(stmts.slice(i, i + 50));
      }

      await bumpDataVersion(db);
      return success({ message: "Đã khôi phục toàn bộ cơ sở dữ liệu thành công!", totalStatements: stmts.length });
    }

    case "saveFileContent": {
      const fileName = args[0] || "";
      const content = args[1] || {};
      let monthYear = fileName.replace('.json', '');
      await db.prepare("INSERT OR REPLACE INTO cham_cong (month_year, data_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)").bind(monthYear, JSON.stringify(content)).run();
      return success({ message: "Đã lưu tệp tin thành công!" });
    }

    case "getAllDriveData": {
      const [ccRes, tkRes] = await db.batch([
        db.prepare("SELECT month_year, data_json FROM cham_cong"),
        db.prepare("SELECT month_year, data_json FROM thong_ke")
      ]);
      return success({
        chamcong: ccRes.results || [],
        thongke: tkRes.results || []
      });
    }

    // ============================================================
// 🧠 SCHEDULING CORE OPTIMIZATION ENGINE (SIMULATED ANNEALING)
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
  if (!timeline || timeline.length < 2) return timeline || [];
  const sorted = timeline.slice().sort((a, b) => a[0] - b[0]);
  const merged = [[sorted[0][0], sorted[0][1]]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i][0] <= last[1]) {
      last[1] = Math.max(last[1], sorted[i][1]);
    } else {
      merged.push([sorted[i][0], sorted[i][1]]);
    }
  }
  return merged;
}

function getNextEvent(tNow, benh_nhan, staffTimeline, machineTimeline, endOfDay) {
  let next = endOfDay;
  benh_nhan.forEach(p => {
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
  if (!staffTimeline[staffName]) staffTimeline[staffName] = [];
  staffTimeline[staffName].push([start, end]);
  if (khoangCach > (end - start)) staffTimeline[staffName].push([end, start + khoangCach]);
  staffTimeline[staffName] = mergeTimeline(staffTimeline[staffName]);
  staffSetupReady[staffName] = Math.max(staffSetupReady[staffName] || 0, end);
  if (!staffLoad[staffName]) staffLoad[staffName] = { used_mins: 0, shift_mins: 480, procs_done: {}, busy_mins: 0, skills: [] };
  staffLoad[staffName].used_mins += (end - start);
  staffLoad[staffName].procs_done[tenThuThuat] = (staffLoad[staffName].procs_done[tenThuThuat] || 0) + 1;
  staffLastProc[staffName] = tenThuThuat;
}

function clonePatients(benh_nhan) {
  return benh_nhan.map(p => ({
    ...p,
    pending: p.pending ? [...p.pending] : [],
    busy: p.busy ? p.busy.map(b => [b[0], b[1]]) : []
  }));
}

function mutate(rawPatients, randFn, droppedNames) {
  let benh_nhan = clonePatients(rawPatients);
  if (droppedNames && droppedNames.size > 0 && randFn() < 0.6) {
    const idx = benh_nhan.findIndex(p => droppedNames.has(p.name));
    if (idx > 0) { const [p] = benh_nhan.splice(idx, 1); benh_nhan.unshift(p); return benh_nhan; }
  }
  const op = Math.floor(randFn() * 5);
  if (op === 0 && benh_nhan.length >= 2) {
    const i = Math.floor(randFn() * benh_nhan.length), j = Math.floor(randFn() * benh_nhan.length);
    [benh_nhan[i], benh_nhan[j]] = [benh_nhan[j], benh_nhan[i]];
  } else if (op === 1) {
    const p = benh_nhan[Math.floor(randFn() * benh_nhan.length)];
    if (p && p.pending.length >= 2) {
      const i = Math.floor(randFn() * p.pending.length), j = Math.floor(randFn() * p.pending.length);
      [p.pending[i], p.pending[j]] = [p.pending[j], p.pending[i]];
    }
  } else if (op === 2 && benh_nhan.length >= 2) {
    const i = Math.floor(randFn() * benh_nhan.length);
    const [p] = benh_nhan.splice(i, 1);
    benh_nhan.unshift(p);
  } else if (op === 3 && benh_nhan.length >= 2) {
    const i = Math.floor(randFn() * (benh_nhan.length - 1));
    [benh_nhan[i], benh_nhan[i+1]] = [benh_nhan[i+1], benh_nhan[i]];
  } else if (op === 4 && benh_nhan.length >= 3) {
    const i = Math.floor(randFn() * benh_nhan.length);
    const j = Math.floor(randFn() * benh_nhan.length);
    const start = Math.min(i, j), end = Math.max(i, j);
    if (end - start >= 2) {
      const segment = benh_nhan.slice(start, end + 1).reverse();
      benh_nhan.splice(start, segment.length, ...segment);
    }
  }
  return benh_nhan;
}

function _turbo_core_logic(db, ngayXep, seedVal, existingSched = [], scenario = 1, crowdedOverride = -1, weights = { drop: 10000, overtime: 2, imbalance: 0.1 }) {
  const rand = createSeededRandom(seedVal);
  const OVERTIME_ALLOWANCE = 5;
  const defaultShift = [[420, 690], [780, 1014]];
  let startOfDay = 420, endOfDay = 1014;
  let isBackfill = false;

  const reservedMachines = new Set();
  if (scenario === 3) {
    Object.values(db.machineTypes).forEach(may_moc => {
      const reserveCount = Math.max(1, Math.floor(may_moc.length * 0.2));
      for (let i = 0; i < reserveCount; i++) reservedMachines.add(may_moc[i]);
    });
  }

  const thuThuatInfo = db.thuThuatInfo;
  Object.keys(thuThuatInfo).forEach(key => {
    const info = thuThuatInfo[key];
    if (info && info.length > 9 && info[9]) thuThuatInfo[info[9].trim().toLowerCase()] = info;
  });

  const machineRarity = {};
  Object.keys(thuThuatInfo).forEach(key => {
    const loaiMay = thuThuatInfo[key][0];
    machineRarity[key] = (loaiMay && loaiMay !== "Thủ công")
      ? ((db.machineTypes[loaiMay] || []).length <= 2 ? 0 : (db.machineTypes[loaiMay] || []).length <= 5 ? 1 : 2)
      : 3;
  });

  const { machineTypes, roomStaff } = db;
  const staffBySkill = {}, staffTimeline = {}, staffShifts = {}, staffLoad = {};
  const staffRole = {}, staffLastProc = {}, staffMyRooms = {}, staffSetupReady = {}, staffCurrentRoom = {};

  db.rawStaff.forEach(r => {
    const tenNhanVien = r[0], kyNangList = r[2] ? String(r[2]).split(",").map(x => x.trim()) : [];
    staffTimeline[tenNhanVien] = []; staffRole[tenNhanVien] = r[1]; staffCurrentRoom[tenNhanVien] = null;

    kyNangList.forEach(kyNang => {
      const kyNangLower = kyNang.toLowerCase();
      if (!staffBySkill[kyNangLower]) staffBySkill[kyNangLower] = [];
      staffBySkill[kyNangLower].push(tenNhanVien);
      if (thuThuatInfo[kyNangLower]?.length > 9 && thuThuatInfo[kyNangLower][9]) {
        const vietTat = thuThuatInfo[kyNangLower][9].trim().toLowerCase();
        if (!staffBySkill[vietTat]) staffBySkill[vietTat] = [];
        if (!staffBySkill[vietTat].includes(tenNhanVien)) staffBySkill[vietTat].push(tenNhanVien);
      }
    });

    const rawShifts = r[3] ? String(r[3]).split(",").filter(s => s.includes("-")).map(s => {
      const pts = s.split("-"); return [t2m(pts[0].trim()), t2m(pts[1].trim())];
    }) : [];
    staffShifts[tenNhanVien] = rawShifts.length > 0 ? rawShifts : defaultShift;

    if (r[4]) {
      String(r[4]).split(",").forEach(slot => {
        if (slot.includes("-")) {
          const tp = slot.includes(")") ? slot.split(")").pop().trim() : slot;
          staffTimeline[tenNhanVien].push([t2m(tp.split("-")[0]), t2m(tp.split("-")[1])]);
        }
      });
    }

    if (staffShifts[tenNhanVien].length > 0) {
      const [caS1, caE1] = staffShifts[tenNhanVien][0];
      if (staffShifts[tenNhanVien].length > 1) {
        const [caS2, caE2] = staffShifts[tenNhanVien][1];
        staffTimeline[tenNhanVien].push([0, caS1], [caE1, caS2], [caE2, 1440]);
      } else {
        staffTimeline[tenNhanVien].push([0, caS1], [caE1, 1440]);
      }
    } else {
      staffTimeline[tenNhanVien].push([0, startOfDay], [endOfDay, 1440]);
    }

    const tongPhutLamViec = staffShifts[tenNhanVien].reduce((acc, ca) => acc + ca[1] - ca[0], 0);
    const tongPhutBan = staffTimeline[tenNhanVien].reduce((acc, slot) => acc + slot[1] - slot[0], 0);
    staffLoad[tenNhanVien] = { used_mins: 0, shift_mins: tongPhutLamViec, procs_done: {}, busy_mins: tongPhutBan, skills: kyNangList };
    staffSetupReady[tenNhanVien] = 0;
    staffMyRooms[tenNhanVien] = Object.keys(roomStaff).filter(room => (roomStaff[room] || []).includes(tenNhanVien));
    staffTimeline[tenNhanVien] = mergeTimeline(staffTimeline[tenNhanVien]);
  });

  let minShiftStart = 1440, maxShiftEnd = 0;
  Object.values(staffShifts).forEach(caList => {
    if (caList.length > 0) {
      minShiftStart = Math.min(minShiftStart, caList[0][0]);
      maxShiftEnd = Math.max(maxShiftEnd, caList[caList.length - 1][1]);
    }
  });
  if (minShiftStart < 1440) startOfDay = minShiftStart;
  if (maxShiftEnd > 0) endOfDay = maxShiftEnd;

  const machineTimeline = { "Thủ công": [] };
  for (const loaiMay in machineTypes) (machineTypes[loaiMay] || []).forEach(may => { machineTimeline[may] = []; });

  const bedTracker = {};
  for (const phong in db.roomBeds) {
    bedTracker[phong] = {};
    (db.roomBeds[phong] || []).forEach(giuong => { bedTracker[phong][giuong] = []; });
  }

  existingSched.forEach(row => {
    const gioStart = t2m(row[5] || row.GIODIENRA || row.gioDienRa), gioEnd = t2m(row[6] || row.GIOKETTHUC || row.gioKetThuc);
    const nvChinh = row[7] || row["NV CHÍNH"] || row.nvChinh, nvPhu = row[8] || row["NV PHỤ"] || row.nvPhu;
    const may = row[9] || row.MAY || row.may, phong = row[3] || row.PHONG || row.phong, giuong = row[10] || row.GIUONG || row.giuong;
    
    const tenThuThuat = String(row[4] || row.DICHVU || row.thuThuat || "").trim().toLowerCase();
    const info = thuThuatInfo[tenThuThuat] || ["Thủ công", 15, 5, "PHCN", 1, 0, [], 5];
    const tgNhanVien = info[2];
    const staffEnd = Math.min(gioStart + tgNhanVien, gioEnd);
    const hasTeardown = (gioEnd - gioStart) > tgNhanVien;
    const tearStart = hasTeardown ? gioEnd : null;
    const tearEnd = hasTeardown ? gioEnd + 1 : null;

    const pushAndMerge = (timeline, key, slot) => { if (!timeline[key]) return; timeline[key].push(slot); timeline[key] = mergeTimeline(timeline[key]); };
    
    if (nvChinh && staffTimeline[nvChinh]) { 
      pushAndMerge(staffTimeline, nvChinh, [gioStart, staffEnd]); 
      if (hasTeardown && tearStart !== null) pushAndMerge(staffTimeline, nvChinh, [tearStart, tearEnd]);
      staffCurrentRoom[nvChinh] = phong; 
    }
    if (nvPhu && staffTimeline[nvPhu]) {
      pushAndMerge(staffTimeline, nvPhu, [gioStart, staffEnd]);
      if (hasTeardown && tearStart !== null) pushAndMerge(staffTimeline, nvPhu, [tearStart, tearEnd]);
    }
    if (may && may !== "Thủ công" && machineTimeline[may]) pushAndMerge(machineTimeline, may, [gioStart, gioEnd]);
    if (phong && giuong && bedTracker[phong]?.[giuong]) pushAndMerge(bedTracker[phong], giuong, [gioStart, gioEnd]);
  });

  let benh_nhan = db.rawPatients.map(p => ({ ...p, pending: [...p.pending], failed: false }));
  const tempDropList = [], results = [], localProcCount = {};
  
  const totalPendingProcs = benh_nhan.reduce((sum, p) => sum + p.pending.length, 0);
  const activeStaffCount = db.rawStaff.length;
  const autoCrowded = activeStaffCount > 0 ? (totalPendingProcs / activeStaffCount >= 3.5) : true;
  const isCrowdedDay = crowdedOverride === 1 ? true : (crowdedOverride === 0 ? false : autoCrowded);

  benh_nhan.forEach(p => {
    const valid = [];
    p.pending.forEach(tenThuThuat => {
      if (!staffBySkill[tenThuThuat.toLowerCase()]) {
        const tenGoc = thuThuatInfo[tenThuThuat.toLowerCase()]?.[8] || tenThuThuat;
        tempDropList.push({ bn: p.name, ns: p.ns, tt: tenGoc, room: p.room, nhan_su: "Trống", reason: "HỦY SỚM: Không có nhân sự có kỹ năng này" });
      } else valid.push(tenThuThuat);
    });

    const activeProcs = Object.values(staffLastProc);
    const sortedProcs = valid.map((ten, idx) => ({ ten, idx, rand: rand() }));
    sortedProcs.sort((a, b) => {
      const infoA = thuThuatInfo[a.ten.toLowerCase()] || ["", 999, 999, "PHCN", 0, 0, [], 5];
      const infoB = thuThuatInfo[b.ten.toLowerCase()] || ["", 999, 999, "PHCN", 0, 0, [], 5];
      const lienA = activeProcs.includes(a.ten) ? 0 : 1;
      const lienB = activeProcs.includes(b.ten) ? 0 : 1;
      if (lienA !== lienB) return lienA - lienB;
      const heA = infoA[3] === "YHCT" ? 0 : 1;
      const heB = infoB[3] === "YHCT" ? 0 : 1;
      if (heA !== heB) return heA - heB;
      if (scenario === 1) {
        const hiemA = machineRarity[a.ten.toLowerCase()] ?? 3;
        const hiemB = machineRarity[b.ten.toLowerCase()] ?? 3;
        if (hiemA !== hiemB) return hiemA - hiemB;
      }
      if (infoA[2] !== infoB[2]) return infoA[2] - infoB[2];
      if (infoA[1] !== infoB[1]) return infoA[1] - infoB[1];
      return Math.abs(a.rand - b.rand) > 0.0001 ? a.rand - b.rand : a.idx - b.idx;
    });

    p.pending = sortedProcs.map(o => o.ten);
    updatePatientCache(p, thuThuatInfo);
  });

  const todayNum = parseNgayVao(ngayXep);
  benh_nhan.forEach(p => {
    p._ngayVaoNum = parseNgayVao(p.ngayVao || "");
    p._isNew = (p._ngayVaoNum >= todayNum);
  });
  benh_nhan.sort((a, b) => {
    if (a._isNew !== b._isNew) return a._isNew ? 1 : -1;
    if (!a._isNew && a._ngayVaoNum !== b._ngayVaoNum) return a._ngayVaoNum - b._ngayVaoNum;
    return a.arrive - b.arrive;
  });
  benh_nhan.forEach(p => { p.randSeed = p._isNew ? (0.5 + rand() * 0.5) : (rand() * 0.5); });

  function tryScheduleOne(patient, tenThuThuat, tNow) {
    const info = thuThuatInfo[tenThuThuat.toLowerCase()] || ["Thủ công", 15, 5, "PHCN", 1, 0, [], 5];
    const tenGoc = info[8] || tenThuThuat, targetRoom = patient.room, loaiMay = info[0];
    const baseTgMay = Math.max(info[1], info[2]), tgNhanVien = info[2], canPhu = info[5];
    const isSupplemental = existingSched && existingSched.length > 0;
    
    const isDienCham = tenThuThuat.toLowerCase().includes('điện châm') || tenThuThuat.toLowerCase() === 'đc' || (info[8] && String(info[8]).toLowerCase().includes('điện châm'));
    const candidateDurs = (isDienCham && (isSupplemental || isBackfill)) ? [25, 30, 26, 27, 28, 29] : [baseTgMay];

    const isYHCT = String(info[3] || "").trim().toUpperCase() === "YHCT";
    const yhctEndLimit = weights.yhctEnd !== undefined ? weights.yhctEnd : 10;
    const allowedOvertimeAtEnd = isYHCT ? yhctEndLimit : OVERTIME_ALLOWANCE;

    const roomsWithWaiting = new Set();
    if (!isSupplemental) {
      const threshold = scenario === 2 ? 1 : 0;
      for (const _p of benh_nhan) {
        if (_p.pending.length > threshold && _p.free_at <= tNow && !_p.busy.some(b => b[0] <= tNow && tNow < b[1])) {
          roomsWithWaiting.add(_p.room);
        }
      }
    }

    for (const tgMay of candidateDurs) {
      const rawKhoangCach = scenario === 1 ? info[2] : (info[7] || info[2]);
      const khoangCach = Math.max(rawKhoangCach, info[2] + 1);
      const gioKetThuc = tNow + tgMay;
      const hasTeardown = tgMay > tgNhanVien;
      const tearStart = hasTeardown ? (tNow + tgMay) : null;
      const tearEnd = hasTeardown ? (tNow + tgMay + 1) : null;

      if (gioKetThuc > (endOfDay + allowedOvertimeAtEnd)) continue;
      if (patient.leave !== 9999 && gioKetThuc > patient.leave) continue;
      if (patient.busy.some(b => is_overlap(tNow, gioKetThuc, b[0], b[1]))) continue;

      const candidatesMain = [], candidatesSub = [];
      (staffBySkill[tenThuThuat.toLowerCase()] || []).forEach(tenNV => {
        if (tNow < (staffSetupReady[tenNV] || 0)) return;
        
        const checkSlot = (slotStart, slotEnd) => {
          return (staffTimeline[tenNV] || []).some(slot => {
            if (slotStart >= slot[1]) return false;
            const isEndOfDay = slot[1] === 1440;
            const isLunch = slot[1] - slot[0] >= 60 && !isEndOfDay;
            if (isLunch || isEndOfDay) {
              const yhctLimit = isEndOfDay ? yhctEndLimit : (weights.yhctLunch !== undefined ? weights.yhctLunch : 10);
              const allowedOvertime = isYHCT ? yhctLimit : (isEndOfDay ? OVERTIME_ALLOWANCE : 0);
              const allowedEnd = slot[0] + allowedOvertime;
              if ((slotEnd - 1) <= allowedEnd && slotStart <= slot[0]) return false;
            }
            return is_overlap(slotStart, slotEnd, slot[0], slot[1]);
          });
        };

        if (checkSlot(tNow, tNow + tgNhanVien + 1)) return;
        if (hasTeardown && checkSlot(tearStart, tearEnd)) return;
        
        if (!isSupplemental && !isBackfill && staffRole[tenNV] === 'Kỹ thuật viên' && (staffMyRooms[tenNV] || []).length > 0 && !staffMyRooms[tenNV].includes(targetRoom)) return;

        if (staffRole[tenNV]?.toLowerCase() !== 'điều dưỡng') candidatesMain.push(tenNV);
        else candidatesSub.push(tenNV);
      });
      if (candidatesMain.length === 0) continue;

      candidatesMain.sort((a, b) => {
        const rmA = (staffMyRooms[a] || []).includes(targetRoom) ? 0 : 1, rmB = (staffMyRooms[b] || []).includes(targetRoom) ? 0 : 1;
        if (rmA !== rmB) return rmA - rmB;
        const crA = staffCurrentRoom[a] === targetRoom ? 0 : 1, crB = staffCurrentRoom[b] === targetRoom ? 0 : 1;
        if (crA !== crB) return crA - crB;
        const lpA = staffLastProc[a] === tenThuThuat ? 0 : 1, lpB = staffLastProc[b] === tenThuThuat ? 0 : 1;
        if (lpA !== lpB) return lpA - lpB;
        const roleA = (info[3] === "PHCN" && staffRole[a] === 'Kỹ thuật viên') || (info[3] === "YHCT" && staffRole[a] === 'Bác sĩ') ? 0 : 1;
        const roleB = (info[3] === "PHCN" && staffRole[b] === 'Kỹ thuật viên') || (info[3] === "YHCT" && staffRole[b] === 'Bác sĩ') ? 0 : 1;
        if (roleA !== roleB) return roleA - roleB;
        return (staffLoad[a]?.used_mins || 0) - (staffLoad[b]?.used_mins || 0);
      });

      const possibleMachines = loaiMay === "Thủ công" ? [loaiMay] : (machineTypes[loaiMay] || []);
      const availableMachines = scenario === 3 ? possibleMachines.filter(m => !reservedMachines.has(m)) : possibleMachines;
      const finalMachines = availableMachines.length === 0 ? possibleMachines : availableMachines;
      const selectedMachine = finalMachines.find(m => !(machineTimeline[m] || []).some(slot => is_overlap(tNow, gioKetThuc, slot[0], slot[1])));
      if (!selectedMachine) continue;

      let selectedBed = null;
      if (bedTracker[targetRoom]) {
        for (const [bedId, bedTimeline] of Object.entries(bedTracker[targetRoom])) {
          if (!bedTimeline.some(slot => is_overlap(tNow, gioKetThuc, slot[0], slot[1]))) { selectedBed = bedId; break; }
        }
      }
      if (!selectedBed && bedTracker[targetRoom] && Object.keys(bedTracker[targetRoom]).length > 0) continue;

      for (const nvChinh of candidatesMain) {
        const isInMyRoom = (staffMyRooms[nvChinh] || []).includes(targetRoom);
        const isFloating = (staffMyRooms[nvChinh] || []).length === 0;
        if (!(isInMyRoom || isFloating)) {
          if (!isSupplemental) {
            const hasSkilledStaffInRoom = (staffBySkill[tenThuThuat.toLowerCase()] || []).some(s =>
              (staffMyRooms[s] || []).includes(targetRoom)
            );
            if (!isCrowdedDay && hasSkilledStaffInRoom) continue;

            const isMyRoomBusy = (staffMyRooms[nvChinh] || []).some(r => roomsWithWaiting.has(r));
            if (isMyRoomBusy) continue;
          }
        }

        let nvPhu = "";
        if (canPhu === 1) {
          const validSubs = candidatesSub.filter(x => x !== nvChinh);
          if (validSubs.length === 0) continue;

          const hasSubInRoom = validSubs.some(s => (staffMyRooms[s] || []).includes(targetRoom));
          const filteredSubs = (!isSupplemental && !isCrowdedDay && hasSubInRoom)
            ? validSubs.filter(x => (staffMyRooms[x] || []).includes(targetRoom) || (staffMyRooms[x] || []).length === 0)
            : validSubs;

          if (filteredSubs.length === 0) continue;

          filteredSubs.sort((a, b) => {
            const aR = (staffMyRooms[a] || []).includes(targetRoom) ? 0 : 1, bR = (staffMyRooms[b] || []).includes(targetRoom) ? 0 : 1;
            return aR !== bR ? aR - bR : (staffLoad[a]?.used_mins || 0) - (staffLoad[b]?.used_mins || 0);
          });
          nvPhu = filteredSubs[0];
        }

        blockStaff(nvChinh, tNow, tNow + tgNhanVien, khoangCach, staffTimeline, staffSetupReady, staffLoad, tenThuThuat, staffLastProc);
        staffCurrentRoom[nvChinh] = targetRoom;
        if (hasTeardown) { staffTimeline[nvChinh].push([tearStart, tearEnd]); staffTimeline[nvChinh] = mergeTimeline(staffTimeline[nvChinh]); staffLoad[nvChinh].used_mins += (tearEnd - tearStart); }

        if (nvPhu) {
          blockStaff(nvPhu, tNow, tNow + tgNhanVien, khoangCach, staffTimeline, staffSetupReady, staffLoad, tenThuThuat, staffLastProc);
          if (hasTeardown) { staffTimeline[nvPhu].push([tearStart, tearEnd]); staffTimeline[nvPhu] = mergeTimeline(staffTimeline[nvPhu]); staffLoad[nvPhu].used_mins += (tearEnd - tearStart); }
        }

        if (selectedMachine !== "Thủ công") { 
          if (!machineTimeline[selectedMachine]) machineTimeline[selectedMachine] = [];
          machineTimeline[selectedMachine].push([tNow, gioKetThuc]); 
          machineTimeline[selectedMachine] = mergeTimeline(machineTimeline[selectedMachine]); 
        }

        if (selectedBed && bedTracker[targetRoom]?.[selectedBed]) { 
          bedTracker[targetRoom][selectedBed].push([tNow, gioKetThuc]); 
          bedTracker[targetRoom][selectedBed] = mergeTimeline(bedTracker[targetRoom][selectedBed]); 
        }

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
    }
    return false;
  }

  function countFeasibleSlots(patient, tFrom) {
    let count = 0;
    for (const tenTT of patient.pending) {
      const info = thuThuatInfo[tenTT.toLowerCase()] || ["Thủ công", 15, 5, "PHCN", 1, 0, [], 5];
      const tgMay = Math.max(info[1], info[2]), loaiMay = info[0];
      const possibleMachines = loaiMay === "Thủ công" ? [loaiMay] : (machineTypes[loaiMay] || []);
      const hasMachine = possibleMachines.some(m => m === "Thủ công" || !(machineTimeline[m] || []).some(slot => is_overlap(tFrom, tFrom + tgMay, slot[0], slot[1])));
      const hasStaff = (staffBySkill[tenTT.toLowerCase()] || []).some(s => !(staffTimeline[s] || []).some(slot => is_overlap(tFrom, tFrom + tgMay + 1, slot[0], slot[1])));
      if (hasMachine && hasStaff) count++;
    }
    return count;
  }

  function sortPatientPriority(a, b) {
    if (a.leave_pri !== b.leave_pri) return a.leave_pri - b.leave_pri;
    if (a.leave !== b.leave) return a.leave - b.leave;
    const groupA = (!a._isNew || a.arrive <= 660) ? 0 : 1;
    const groupB = (!b._isNew || b.arrive <= 660) ? 0 : 1;
    if (groupA !== groupB) return groupA - groupB;
    const scheduledA = a.scheduled_count || 0, scheduledB = b.scheduled_count || 0;
    const tierA = Math.floor(scheduledA / 2), tierB = Math.floor(scheduledB / 2);
    if (tierA !== tierB) return tierA - tierB;
    if (scheduledA !== scheduledB) return scheduledB - scheduledA;
    if (a._isNew !== b._isNew) return a._isNew ? 1 : -1;
    if (!a._isNew && a._ngayVaoNum !== b._ngayVaoNum) return a._ngayVaoNum - b._ngayVaoNum;
    return 0;
  }

  for (let phase = 1; phase <= 2; phase++) {
    if (phase === 2 && !benh_nhan.some(p => p.pending.length > 0)) break;
    let tNow = startOfDay;
    while (tNow <= endOfDay) {
      if (!benh_nhan.some(p => p.pending.length > 0)) break;
      let keepTrying = true;
      let isFirstTryAtTNow = true;
      while (keepTrying) {
        keepTrying = false;
        const eligible = benh_nhan.filter(p => p.pending.length > 0 && p.free_at <= tNow && !p.busy.some(b => b[0] <= tNow && tNow < b[1]));
        if (eligible.length === 0) break;
        if (isFirstTryAtTNow) {
          eligible.forEach(p => { p._feasible = countFeasibleSlots(p, tNow); });
          isFirstTryAtTNow = false;
        }
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
      tNow = getNextEvent(tNow, benh_nhan, staffTimeline, machineTimeline, endOfDay);
    }
  }

  let remaining = benh_nhan.filter(p => p.pending.length > 0);
  if (remaining.length > 0) {
    const timePoints = new Set();
    Object.keys(staffTimeline).forEach(tenNV => {
      (staffShifts[tenNV] || []).forEach(([caStart]) => timePoints.add(caStart));
      (staffTimeline[tenNV] || []).forEach(slot => { if (slot[1] < endOfDay) timePoints.add(slot[1]); });
    });
    remaining.forEach(p => { if (p.free_at <= endOfDay) timePoints.add(p.free_at); });
    Object.values(machineTimeline).forEach(tl => tl.forEach(slot => { if (slot[1] < endOfDay) timePoints.add(slot[1]); }));

    for (const t of [...timePoints].sort((a, b) => a - b)) {
      if (t > endOfDay) break;
      const stillRemaining = benh_nhan.filter(p => p.pending.length > 0);
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

    remaining = benh_nhan.filter(p => p.pending.length > 0);
    if (remaining.length > 0) {
      isBackfill = true;
      for (const patient of remaining) {
        for (const tenThuThuat of [...patient.pending]) {
          if (!patient.pending.includes(tenThuThuat)) continue;
          const info = thuThuatInfo[tenThuThuat.toLowerCase()] || ["Thủ công", 15, 5, "PHCN", 1, 0, [], 5];
          const isYHCT = String(info[3] || "").trim().toUpperCase() === "YHCT";
          const yhctEndLimit = weights.yhctEnd !== undefined ? Number(weights.yhctEnd) : 10;
          const allowedMaxEnd = endOfDay + (isYHCT ? yhctEndLimit : OVERTIME_ALLOWANCE);
          const tgMay = Math.max(info[1], info[2]);
          const gapStarts = new Set();
          for (const tenNV of (staffBySkill[tenThuThuat.toLowerCase()] || [])) {
            const tl = mergeTimeline([...(staffTimeline[tenNV] || [])]);
            let prevEnd = startOfDay;
            for (const slot of tl) {
              if (slot[0] > prevEnd && prevEnd + tgMay <= allowedMaxEnd) gapStarts.add(prevEnd);
              prevEnd = Math.max(prevEnd, slot[1]);
            }
            if (prevEnd + tgMay <= allowedMaxEnd) gapStarts.add(prevEnd);
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

  benh_nhan.forEach(p => p.pending.forEach(tenTT => {
    const tenGoc = thuThuatInfo[tenTT.toLowerCase()]?.[8] || tenTT;
    tempDropList.push({ bn: p.name, ns: p.ns, tt: tenGoc, room: p.room, nhan_su: "Trống", reason: "Thiếu nhân sự/Máy hoặc hết giờ" });
  }));

  isBackfill = true;
  const resultsByStaff = new Map();
  const resultsByPatient = new Map();
  for (const r of results) {
    const nv = r["NV CHÍNH"];
    const bn = r.HOTEN;
    if (!resultsByStaff.has(nv)) resultsByStaff.set(nv, []);
    resultsByStaff.get(nv).push(r);
    if (!resultsByPatient.has(bn)) resultsByPatient.set(bn, []);
    resultsByPatient.get(bn).push(r);
  }

  const finalDropList = [];
  for (const rotItem of tempDropList) {
    let saved = false;
    const tenTT = rotItem.tt, tenBN = rotItem.bn, phong = rotItem.room || '';
    const pat = benh_nhan.find(p => p.name === tenBN);
    const infoRot = thuThuatInfo[tenTT.toLowerCase()] || ["Thủ công", 15, 5, "PHCN", 1, 0, [], 5];
    const isYHCT = String(infoRot[3] || "").trim().toUpperCase() === "YHCT";
    const yhctEndLimit = weights.yhctEnd !== undefined ? Number(weights.yhctEnd) : 10;
    const tgCanThiet = Math.max(infoRot[1], infoRot[2]);
    const allowedMaxEnd = endOfDay + (isYHCT ? yhctEndLimit : OVERTIME_ALLOWANCE);

    if (pat) {
      const minStart = Math.max(pat.arrive || startOfDay, startOfDay);
      const gapStarts = new Set();
      for (const tenNV of (staffBySkill[tenTT.toLowerCase()] || [])) {
        const tl = mergeTimeline([...(staffTimeline[tenNV] || [])]);
        let prevEnd = minStart;
        for (const slot of tl) {
          if (slot[0] > prevEnd && prevEnd >= minStart && prevEnd + tgCanThiet <= allowedMaxEnd) gapStarts.add(prevEnd);
          prevEnd = Math.max(prevEnd, slot[1]);
        }
        if (prevEnd >= minStart && prevEnd + tgCanThiet <= allowedMaxEnd) gapStarts.add(prevEnd);
      }
      for (const t of [...gapStarts].sort((a, b) => a - b)) {
        if (t < (pat.free_at || 0) || pat.busy.some(b => is_overlap(t, t + tgCanThiet, b[0], b[1]))) continue;
        if (tryScheduleOne(pat, tenTT, t)) {
          const idx = pat.pending.indexOf(tenTT);
          if (idx !== -1) { pat.pending.splice(idx, 1); updatePatientCache(pat, thuThuatInfo); }
          saved = true;
          break;
        }
      }
    }

    if (!saved && pat) {
      const minStart = Math.max(pat.arrive || startOfDay, startOfDay);
      const dsBacSi = (staffBySkill[tenTT.toLowerCase()] || []).filter(s => staffRole[s] === 'Bác sĩ');
      for (const bacSi of dsBacSi) {
        if (saved) break;
        const caDePHCN = (resultsByStaff.get(bacSi) || []).filter(r => (thuThuatInfo[(r.DICHVU || "").toLowerCase()] || ["", "", "", "PHCN"])[3] === "PHCN");
        for (const caDe of caDePHCN) {
          const timeStart = t2m(caDe.GIODIENRA), timeEnd = t2m(caDe.GIOKETTHUC);
          if (timeStart < minStart || (timeEnd - timeStart) < tgCanThiet) continue;
          if (pat.leave !== 9999 && timeStart + tgCanThiet > pat.leave) continue;
          if (pat.busy.some(b => is_overlap(timeStart, timeStart + tgCanThiet, b[0], b[1]))) continue;
          let ktvThayThe = null;
          const dsKTV = (staffBySkill[(caDe.DICHVU || "").toLowerCase()] || []).filter(k => staffRole[k] === 'Kỹ thuật viên');
          for (const ktv of dsKTV) { if (!(staffTimeline[ktv] || []).some(slot => is_overlap(timeStart, timeEnd, slot[0], slot[1]))) { ktvThayThe = ktv; break; } }
          if (ktvThayThe) {
            caDe["NV CHÍNH"] = ktvThayThe;
            if (!staffTimeline[ktvThayThe]) staffTimeline[ktvThayThe] = [];
            staffTimeline[ktvThayThe].push([timeStart, timeEnd]); staffTimeline[ktvThayThe] = mergeTimeline(staffTimeline[ktvThayThe]);
            
            const newRes = { NGAY: ngayXep, HOTEN: tenBN, NAMSINH: rotItem.ns || "", PHONG: phong, DICHVU: tenTT, GIODIENRA: m2t(timeStart), GIOKETTHUC: m2t(timeStart + tgCanThiet), "NV CHÍNH": bacSi, "NV PHỤ": "", MAY: infoRot[0] || "Thủ công", GIUONG: "", t_sort: timeStart, PRIO: false };
            results.push(newRes);
            if (!resultsByPatient.has(tenBN)) resultsByPatient.set(tenBN, []);
            resultsByPatient.get(tenBN).push(newRes);

            if (!staffTimeline[bacSi]) staffTimeline[bacSi] = [];
            staffTimeline[bacSi].push([timeStart, timeStart + tgCanThiet]); staffTimeline[bacSi] = mergeTimeline(staffTimeline[bacSi]);
            saved = true; localProcCount[tenTT.toLowerCase()] = (localProcCount[tenTT.toLowerCase()] || 0) + 1; break;
          }
        }
      }
    }
    if (!saved) finalDropList.push(rotItem);
  }
  isBackfill = false;

  const overtimeMins = Object.values(staffLoad).reduce((s, v) => s + Math.max(0, v.used_mins - v.shift_mins), 0);
  const loadValues = Object.values(staffLoad).map(v => v.used_mins);
  const avg = loadValues.reduce((a,b)=>a+b,0) / (loadValues.length || 1);
  const imbalance = loadValues.reduce((s,v) => s + Math.abs(v - avg), 0);
  const scoreVal = finalDropList.length * weights.drop + overtimeMins * weights.overtime + imbalance * weights.imbalance;

  results.sort((a, b) => a["NV CHÍNH"] !== b["NV CHÍNH"] ? a["NV CHÍNH"].localeCompare(b["NV CHÍNH"]) : a.t_sort - b.t_sort);
  return { sched: results, rot: finalDropList, score: scoreVal, nhan_su: staffLoad, proc: localProcCount, tl: staffTimeline, ca: staffShifts };
}

function runBestIteration(db, dateVal, existingSched = [], scenario = 1, crowdedOverride = -1, weights = { drop: 10000, overtime: 2, imbalance: 0.1 }) {
  let rand = createSeededRandom(42);
  let currentPatients = clonePatients(db.rawPatients);
  let current = _turbo_core_logic({ ...db, rawPatients: currentPatients }, dateVal, 0, existingSched, scenario, crowdedOverride, weights);
  let best = current;

  let droppedNames = new Set(best.rot.map(r => r.bn));
  const T_initial = 10.0, T_min = 0.3, alpha = 0.88;
  const REHEAT_TRIGGER = 12, REHEAT_FACTOR = 1.6, REHEAT_MAX_TIMES = 2;
  let T = T_initial, noImprove = 0, reheatCount = 0;

  while (T > T_min && noImprove < 20) {
    const neighborPatients = mutate(currentPatients, rand, droppedNames);
    const neighbor = _turbo_core_logic({ ...db, rawPatients: neighborPatients }, dateVal, 0, existingSched, scenario, crowdedOverride, weights);
    const delta = neighbor.score - current.score;
    const accept = delta < 0 || (rand() < Math.exp(-delta / T));
    if (accept) {
      current = neighbor; currentPatients = neighborPatients;
      if (current.score < best.score) {
        best = current; droppedNames = new Set(best.rot.map(r => r.bn)); noImprove = 0;
      } else { noImprove++; }
    } else { noImprove++; }

    if (noImprove >= REHEAT_TRIGGER && reheatCount < REHEAT_MAX_TIMES) {
      T = Math.min(T * REHEAT_FACTOR, T_initial);
      noImprove = 0;
      reheatCount++;
    } else {
      T *= alpha;
    }
  }

  for (let i = 0; i < 8; i++) {
    const result = _turbo_core_logic({ ...db, rawPatients: clonePatients(db.rawPatients) }, dateVal, 100 + i, existingSched, scenario, crowdedOverride, weights);
    if (result.score < best.score) { best = result; }
  }
  return best;
}

async function buildBaseDbFromD1(db) {
  const [machinesRes, staffRes, roomsRes, procsRes, patientsRes] = await db.batch([
    db.prepare("SELECT * FROM may_moc WHERE trang_thai = 'Sẵn sàng' ORDER BY order_idx ASC"),
    db.prepare("SELECT * FROM nhan_su WHERE name NOT GLOB '[0-9]*' ORDER BY priority ASC, id ASC"),
    db.prepare("SELECT * FROM phong  ORDER BY order_idx ASC"),
    db.prepare("SELECT * FROM thu_thuat  ORDER BY order_idx ASC"),
    db.prepare("SELECT * FROM benh_nhan WHERE is_saturday = 0 ORDER BY order_idx ASC, id ASC")
  ]);

  const database = {
    machineTypes: {},
    thuThuatInfo: {},
    replacementMap: {},
    roomStaff: {},
    roomBeds: {},
    rawStaff: [],
    rawPatients: []
  };

  (machinesRes.results || []).forEach(r => {
    if (!database.machineTypes[r.ten_loai]) database.machineTypes[r.ten_loai] = [];
    database.machineTypes[r.ten_loai].push(r.ma_may);
  });

  (staffRes.results || []).forEach(r => {
    const thayThe = r.nguoi_thay_the || "Không";
    if (thayThe && thayThe !== "Không") database.replacementMap[r.name] = thayThe;
    const skills = parseStringOrJsonArray(r.skills).join(", ");
    const busy = parseStringOrJsonArray(r.temp_busy).join(", ");
    database.rawStaff.push([r.name, r.role || "KTV", skills, r.thoi_gian_lam || "07:30-11:30, 13:00-16:30", busy, r.trang_thai || "Đi làm"]);
  });

  (procsRes.results || []).forEach(r => {
    const tgNhanVien = parseInt(r.tg_thuc_hien) || 5;
    const tgMay = parseInt(r.tg_thu_thuat) || 15;
    const khoangCach = parseInt(r.khoang_cach) || tgNhanVien;
    const dsPhu = parseStringOrJsonArray(r.ds_nguoi_phu);
    database.thuThuatInfo[String(r.ten_thu_thuat).trim().toLowerCase()] = [
      r.may || "Thủ công",
      Math.max(1, tgMay),
      Math.max(1, tgNhanVien),
      r.he || "PHCN",
      r.can_rut_may ? 1 : 0,
      r.can_nguoi_phu ? 1 : 0,
      dsPhu,
      khoangCach,
      String(r.ten_thu_thuat).trim(),
      r.viet_tat || ""
    ];
  });

  (roomsRes.results || []).forEach(r => {
    const soGiuong = parseInt(r.so_giuong) || 15;
    const bedStr = r.danh_sach_giuong ? String(r.danh_sach_giuong).trim() : "";
    database.roomBeds[r.ten_phong] = (bedStr && bedStr !== 'None')
      ? bedStr.split(",").map(x => x.trim()).filter(Boolean)
      : Array.from({ length: soGiuong }, (_, i) => `Giường ${i + 1}`);

    const dsBacSi = parseStringOrJsonArray(r.bac_si);
    const dsKTV = parseStringOrJsonArray(r.ktv);
    database.roomStaff[r.ten_phong] = [...new Set([...dsBacSi, ...dsKTV].map(x => database.replacementMap[x] || x))];
  });

  return { database, rawPatientsList: patientsRes.results || [] };
}

    default:
      return error("Action không được hỗ trợ: " + action, 400);
  }
}


async function checkAutoChotSo(db) {
  try {
    const nowVN = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const hh = String(nowVN.getUTCHours()).padStart(2, '0');
    const mm = String(nowVN.getUTCMinutes()).padStart(2, '0');
    const currentHourMin = `${hh}:${mm}`;

    const dd = String(nowVN.getUTCDate()).padStart(2, '0');
    const month = String(nowVN.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = nowVN.getUTCFullYear();
    const todayDateStr = `${dd}/${month}/${yyyy}`;

    const keysRes = await db.prepare("SELECT key, value FROM cai_dat WHERE key IN ('chotSoTime', 'lastChotSoDate')").all();
    const settings = {};
    (keysRes.results || []).forEach(r => { settings[r.key] = r.value; });

    const chotSoTime = settings.chotSoTime ? String(settings.chotSoTime).trim() : "";
    const lastChotSoDate = settings.lastChotSoDate ? String(settings.lastChotSoDate).trim() : "";

    if (!chotSoTime || !chotSoTime.includes(':')) {
      return;
    }

    function parseDateDMY(dStr) {
      if (!dStr || typeof dStr !== 'string') return null;
      const p = dStr.split('/');
      if (p.length < 3) return null;
      return new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
    }

    const todayDate = parseDateDMY(todayDateStr);
    const lastClosedDate = parseDateDMY(lastChotSoDate);

    let shouldClose = false;
    if (lastClosedDate && todayDate) {
      const diffDays = (todayDate.getTime() - lastClosedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 0) {
        shouldClose = true;
      } else if (diffDays === 0) {
        if (currentHourMin >= chotSoTime) {
          shouldClose = true;
        }
      }
    } else if (todayDate) {
      await db.prepare("INSERT INTO cai_dat (key, value) VALUES ('lastChotSoDate', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(todayDateStr).run();
      console.log("[Worker Auto-ChotSo]: Initialized lastChotSoDate to " + todayDateStr);
    }

    if (shouldClose) {
      console.log(`[Worker Auto-ChotSo]: Triggering auto closure. today=${todayDateStr}, lastClosed=${lastChotSoDate}, time=${currentHourMin}, chotSoTime=${chotSoTime}`);
      
      const statements = [
        db.prepare("INSERT INTO lich_su (date, patient_name, dob, room, procedure_name, start_time, end_time, staff_name, sub_staff_name, machine_name, bed) SELECT date, patient_name, dob, room, procedure_name, start_time, end_time, staff_name, sub_staff_name, machine_name, bed FROM lich_trinh"),
        db.prepare("DELETE FROM lich_trinh"),
        db.prepare("DELETE FROM benh_nhan WHERE leave_time IS NOT NULL AND TRIM(leave_time) != '' AND LOWER(leave_time) != 'none'"),
        db.prepare("UPDATE benh_nhan SET arrive_time = '07:30', gio_ban = '', leave_time = '', status = 'Chưa xếp', updated_at = CURRENT_TIMESTAMP"),
        db.prepare("UPDATE nhan_su SET temp_busy = '[]', updated_at = CURRENT_TIMESTAMP"),
        db.prepare("INSERT INTO cai_dat (key, value) VALUES ('lastChotSoDate', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(todayDateStr)
      ];

      await db.batch(statements);
      await bumpDataVersion(db);
      console.log("[Worker Auto-ChotSo]: Automated day closure executed successfully!");
    }
  } catch (err) {
    console.error("[Worker Auto-ChotSo Error]:", err);
  }
}
