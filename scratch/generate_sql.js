const fs = require('fs');
const path = require('path');

const backup = JSON.parse(fs.readFileSync('./scratch/v2_migrated_backup.json', 'utf8'));
const tables = backup.tables;

function esc(val) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return val;
    return "'" + String(val).replace(/'/g, "''") + "'";
}

let sql = [];

sql.push('DELETE FROM accounts;');
sql.push('DELETE FROM staff;');
sql.push('DELETE FROM machines;');
sql.push('DELETE FROM rooms;');
sql.push('DELETE FROM procedures;');
sql.push('DELETE FROM patients;');
sql.push('DELETE FROM schedules;');
sql.push('DELETE FROM history_records;');
sql.push('DELETE FROM history_busy;');
sql.push('DELETE FROM chamcong_records;');
sql.push('DELETE FROM thongke_records;');
sql.push('DELETE FROM tim_ranh;');
sql.push('DELETE FROM documents;');
sql.push('DELETE FROM system_settings;');

if (Array.isArray(tables.accounts)) {
    tables.accounts.forEach(r => {
        sql.push(`INSERT INTO accounts (id, username, password_hash, role, permissions) VALUES (${esc(r.id)}, ${esc(r.username)}, ${esc(r.password_hash)}, ${esc(r.role || 'user')}, ${esc(r.permissions || '')});`);
    });
}

if (Array.isArray(tables.staff)) {
    tables.staff.forEach(r => {
        sql.push(`INSERT INTO staff (id, name, role, system, skills, fixed_busy, temp_busy, his_name, priority, is_active) VALUES (${esc(r.id)}, ${esc(r.name)}, ${esc(r.role || 'KTV')}, ${esc(r.system || 'PHCN')}, ${esc(r.skills || '')}, ${esc(r.fixed_busy || '')}, ${esc(r.temp_busy || '')}, ${esc(r.his_name || '')}, ${esc(r.priority || 0)}, ${esc(r.is_active ?? 1)});`);
    });
}

if (Array.isArray(tables.machines)) {
    tables.machines.forEach(r => {
        sql.push(`INSERT INTO machines (id, ten_loai, ma_may, trang_thai, is_active) VALUES (${esc(r.id)}, ${esc(r.ten_loai || r.type_name)}, ${esc(r.ma_may || r.machine_code)}, ${esc(r.trang_thai || r.status || 'Sẵn sàng')}, ${esc(r.is_active ?? 1)});`);
    });
}

if (Array.isArray(tables.rooms)) {
    tables.rooms.forEach(r => {
        sql.push(`INSERT INTO rooms (id, ten_phong, bac_si, ktv, danh_sach_may, so_giuong, danh_sach_giuong, is_active) VALUES (${esc(r.id)}, ${esc(r.ten_phong || r.name)}, ${esc(r.bac_si || r.doctor)}, ${esc(r.ktv || r.ktv_list)}, ${esc(r.danh_sach_may || r.machine_list)}, ${esc(r.so_giuong || r.bed_count || 0)}, ${esc(r.danh_sach_giuong || r.bed_list)}, ${esc(r.is_active ?? 1)});`);
    });
}

if (Array.isArray(tables.procedures)) {
    tables.procedures.forEach(r => {
        sql.push(`INSERT INTO procedures (id, ten_thu_thuat, viet_tat, he, phan_loai, may, tg_thuc_hien, tg_thu_thuat, khoang_cach, can_rut_may, can_nguoi_phu, ds_nguoi_phu, is_active) VALUES (${esc(r.id)}, ${esc(r.ten_thu_thuat || r.name)}, ${esc(r.viet_tat || r.short_name)}, ${esc(r.he || r.system || 'YHCT')}, ${esc(r.phan_loai || r.category || 'Loại 2')}, ${esc(r.may || r.machine_type)}, ${esc(r.tg_thuc_hien || r.prep_time || 5)}, ${esc(r.tg_thu_thuat || r.exec_time || 20)}, ${esc(r.khoang_cach || r.gap_time || 5)}, ${esc(r.can_rut_may || r.need_unplug || 0)}, ${esc(r.can_nguoi_phu || r.need_assistant || 0)}, ${esc(r.ds_nguoi_phu || r.assistant_list)}, ${esc(r.is_active ?? 1)});`);
    });
}

if (Array.isArray(tables.patients)) {
    tables.patients.forEach(r => {
        sql.push(`INSERT INTO patients (id, name, age, gender, room, bed, arrive_time, leave_time, procedures, status, is_saturday) VALUES (${esc(r.id)}, ${esc(r.name)}, ${esc(r.age || 0)}, ${esc(r.gender || 'Nam')}, ${esc(r.room || '')}, ${esc(r.bed || '')}, ${esc(r.arrive_time || '07:30')}, ${esc(r.leave_time || '')}, ${esc(r.procedures || '[]')}, ${esc(r.status || 'Chưa xếp')}, ${esc(r.is_saturday || 0)});`);
    });
}

if (Array.isArray(tables.schedules)) {
    tables.schedules.forEach(r => {
        sql.push(`INSERT INTO schedules (id, date, patient_name, room, procedure_name, staff_name, machine_name, start_time, end_time, is_saturday, order_idx) VALUES (${esc(r.id)}, ${esc(r.date)}, ${esc(r.patient_name)}, ${esc(r.room)}, ${esc(r.procedure_name)}, ${esc(r.staff_name)}, ${esc(r.machine_name)}, ${esc(r.start_time)}, ${esc(r.end_time)}, ${esc(r.is_saturday || 0)}, ${esc(r.order_idx || 0)});`);
    });
}

if (Array.isArray(tables.history_records)) {
    tables.history_records.forEach(r => {
        sql.push(`INSERT INTO history_records (id, date, patient_name, room, procedure_name, staff_name, machine_name, start_time, end_time) VALUES (${esc(r.id)}, ${esc(r.date)}, ${esc(r.patient_name)}, ${esc(r.room)}, ${esc(r.procedure_name)}, ${esc(r.staff_name)}, ${esc(r.machine_name)}, ${esc(r.start_time)}, ${esc(r.end_time)});`);
    });
}

if (Array.isArray(tables.history_busy)) {
    tables.history_busy.forEach(r => {
        sql.push(`INSERT INTO history_busy (id, date, staff_name, busy_ranges) VALUES (${esc(r.id)}, ${esc(r.date)}, ${esc(r.staff_name)}, ${esc(r.busy_ranges)});`);
    });
}

if (Array.isArray(tables.chamcong_records)) {
    tables.chamcong_records.forEach(r => {
        sql.push(`INSERT INTO chamcong_records (month_year, data_json) VALUES (${esc(r.month_year)}, ${esc(r.data_json)});`);
    });
}

if (Array.isArray(tables.thongke_records)) {
    tables.thongke_records.forEach(r => {
        sql.push(`INSERT INTO thongke_records (month_year, data_json) VALUES (${esc(r.month_year)}, ${esc(r.data_json)});`);
    });
}

if (Array.isArray(tables.tim_ranh)) {
    tables.tim_ranh.forEach(r => {
        sql.push(`INSERT INTO tim_ranh (id, procedure_name, start_time, end_time, staff_name, machine_name) VALUES (${esc(r.id)}, ${esc(r.procedure_name)}, ${esc(r.start_time)}, ${esc(r.end_time)}, ${esc(r.staff_name)}, ${esc(r.machine_name)});`);
    });
}

if (Array.isArray(tables.documents)) {
    tables.documents.forEach(r => {
        sql.push(`INSERT INTO documents (id, doc_number, title, agency, signed_date, view_link, download_link) VALUES (${esc(r.id)}, ${esc(r.doc_number || '')}, ${esc(r.title || r.ten_van_ban)}, ${esc(r.agency || '')}, ${esc(r.signed_date || '')}, ${esc(r.url || r.view_link || '#')}, ${esc(r.download_link || r.url || '#')});`);
    });
}

if (Array.isArray(tables.system_settings)) {
    tables.system_settings.forEach(r => {
        sql.push(`INSERT INTO system_settings (key, value) VALUES (${esc(r.key)}, ${esc(r.value)});`);
    });
}

fs.writeFileSync('./scratch/import_v2.sql', sql.join('\n'));
console.log('Generated SQL file with', sql.length, 'statements!');
