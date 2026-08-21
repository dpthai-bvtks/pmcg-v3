const fs = require('fs');
const path = require('path');
const xlsx = require('../backend/node_modules/xlsx');

function excelDateToStr(val) {
    if (val === undefined || val === null) return '';
    if (typeof val === 'number') {
        if (val < 100) return String(val);
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return date.toISOString().slice(0, 10);
    }
    return String(val);
}

function excelDateToVNStr(val) {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number') {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        const d = String(date.getUTCDate()).padStart(2, '0');
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const y = date.getUTCFullYear();
        return d + '/' + m + '/' + y;
    }
    return String(val);
}

function excelTimeToStr(fraction) {
    if (fraction === undefined || fraction === null) return '';
    if (typeof fraction === 'string') return fraction;
    if (typeof fraction === 'number') {
        if (fraction > 1) return excelDateToStr(fraction);
        const totalSec = Math.round(fraction * 86400);
        const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
        return h + ':' + m;
    }
    return String(fraction);
}

const wb = xlsx.readFile('./Data_v3/PMCG Database v3.xlsx');

const taiKhoanData = xlsx.utils.sheet_to_json(wb.Sheets['TaiKhoan'] || []);
const accounts = taiKhoanData.map((r, i) => ({
    id: i + 1,
    username: String(r['Tài Khoản'] || '').trim(),
    password_hash: String(r['Mật Khẩu'] || '').trim(),
    role: String(r['Vai Trò'] || 'KTV').trim(),
    permissions: String(r['Quyền Hạn'] || 'ALL').trim()
})).filter(a => a.username);

if (!accounts.find(a => a.username === 'admin')) {
    accounts.push({ id: accounts.length + 1, username: 'admin', password_hash: '5a629d34f1d19b97e0928fc4e08358899367c19bbfe880f6b75d71c48754ee1c', role: 'Admin', permissions: 'ALL' });
}
if (!accounts.find(a => a.username === 'dpt')) {
    accounts.push({ id: accounts.length + 1, username: 'dpt', password_hash: '5a629d34f1d19b97e0928fc4e08358899367c19bbfe880f6b75d71c48754ee1c', role: 'User', permissions: '' });
}

const nhanSuData = xlsx.utils.sheet_to_json(wb.Sheets['NhanSu'] || []);
const staff = nhanSuData.map((r, i) => ({
    id: i + 1,
    name: String(r['Tên'] || '').trim(),
    role: String(r['Vai Trò'] || 'KTV').trim(),
    system: String(r['Hệ'] || 'PHCN').trim(),
    skills: String(r['Kỹ Năng'] || '').trim(),
    fixed_busy: '',
    temp_busy: '',
    his_name: String(r['__EMPTY_1'] || '').trim(),
    priority: 0,
    is_active: String(r['Trạng Thái'] || '').includes('Nghỉ') ? 0 : 1
})).filter(s => s.name);

const mayData = xlsx.utils.sheet_to_json(wb.Sheets['DanhSachMay'] || []);
const machines = mayData.map((r, i) => ({
    id: i + 1,
    type_name: String(r['Tên Loại'] || '').trim(),
    machine_code: String(r['Mã Máy'] || '').trim(),
    status: String(r['Trạng Thái'] || 'Sẵn sàng').trim(),
    is_active: 1
})).filter(m => m.machine_code || m.type_name);

const phongData = xlsx.utils.sheet_to_json(wb.Sheets['PhongThuThuat'] || []);
const rooms = phongData.map((r, i) => ({
    id: i + 1,
    name: String(r['Tên Phòng'] || '').trim(),
    doctor: String(r['Bác Sĩ'] || '').trim(),
    ktv_list: String(r['KTV'] || '').trim(),
    machine_list: String(r['Danh Sách Máy'] || '').trim(),
    bed_count: parseInt(r['Số Giường'] || '0', 10),
    bed_list: String(r['Danh Sách Giường'] || '').trim(),
    is_active: 1
})).filter(rm => rm.name);

const thuThuatData = xlsx.utils.sheet_to_json(wb.Sheets['ThuThuat'] || []);
const procedures = thuThuatData.map((r, i) => ({
    id: i + 1,
    name: String(r['Tên'] || '').trim(),
    short_name: String(r['Viết Tắt'] || '').trim(),
    system: String(r['Hệ'] || 'YHCT').trim(),
    category: String(r['Phân Loại'] || 'Loại 2').trim(),
    machine_type: String(r['Loại Máy'] || '').trim(),
    prep_time: parseInt(r['Thời Gian Thực Hiện'] || '5', 10),
    exec_time: parseInt(r['Thời Gian Thủ Thuật'] || '20', 10),
    gap_time: parseInt(r['Khoảng Cách'] || '5', 10),
    need_unplug: String(r['Cần Rút Máy'] || '').toLowerCase().includes('có') ? 1 : 0,
    need_assistant: String(r['Càn Người Phụ'] || '').toLowerCase().includes('có') ? 1 : 0,
    assistant_list: String(r['DS Người Phụ'] || '').trim(),
    is_active: 1
})).filter(p => p.name);

const benhNhanData = xlsx.utils.sheet_to_json(wb.Sheets['BenhNhan'] || []);
const patients = benhNhanData.map((r, i) => {
    const procsStr = String(r['Thủ Thuật'] || '').trim();
    const procsArr = procsStr ? procsStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    return {
        id: i + 1,
        name: String(r['Tên'] || '').trim(),
        age: parseInt(r['Năm Sinh'] || '0', 10),
        gender: 'Nam',
        room: String(r['Phòng'] || '').trim(),
        bed: '',
        arrive_time: '07:30',
        leave_time: '',
        procedures: JSON.stringify(procsArr),
        status: 'Chưa xếp',
        ngay_vao: excelDateToVNStr(r['Ngày Vào']),
        gio_ban: '',
        is_saturday: 0
    };
}).filter(p => p.name);

const lichTrinhData = xlsx.utils.sheet_to_json(wb.Sheets['LichTrinh'] || []);
const schedules = lichTrinhData.map((r, i) => ({
    id: i + 1,
    date: excelDateToStr(r['Ngày']),
    patient_name: String(r['Tên BN'] || r['Bệnh Nhân'] || '').trim(),
    room: String(r['Phòng'] || '').trim(),
    procedure_name: String(r['Thủ Thuật'] || r['Dịch Vụ'] || '').trim(),
    staff_name: String(r['NV Chính'] || r['Nhân Viên'] || '').trim(),
    machine_name: String(r['Máy'] || '').trim(),
    start_time: excelTimeToStr(r['Giờ Bắt Đầu'] || r['Giờ BĐ']),
    end_time: excelTimeToStr(r['Giờ Kết Thúc'] || r['Giờ KT']),
    is_saturday: 0,
    order_idx: i
})).filter(s => s.patient_name);

const soThuThuatData = xlsx.utils.sheet_to_json(wb.Sheets['SoThuThuat'] || []);
const history_records = soThuThuatData.map((r, i) => ({
    id: i + 1,
    date: excelDateToStr(r['Ngày']),
    patient_name: String(r['Tên BN'] || '').trim(),
    room: String(r['Phòng'] || '').trim(),
    procedure_name: String(r['Dịch Vụ'] || '').trim(),
    staff_name: String(r['NV Chính'] || '').trim(),
    machine_name: String(r['Máy'] || '').trim(),
    start_time: excelTimeToStr(r['Giờ Bắt Đầu']),
    end_time: excelTimeToStr(r['Giờ Kết Thúc'])
})).filter(h => h.patient_name);

const lichSuBanData = xlsx.utils.sheet_to_json(wb.Sheets['LichSuBan'] || []);
const history_busy = lichSuBanData.map((r, i) => ({
    id: i + 1,
    date: excelDateToStr(r['Ngày']),
    staff_name: String(r['Tên'] || '').trim(),
    busy_ranges: String(r['Giờ Bận'] || '').trim()
})).filter(b => b.staff_name);

const vanBanData = xlsx.utils.sheet_to_json(wb.Sheets['VanBan'] || []);
const documents = vanBanData.map((r, i) => ({
    id: i + 1,
    title: String(r['Tên văn bản'] || r['Số hiệu'] || '').trim(),
    url: String(r['Link Xem'] || r['Link Tải'] || '#').trim(),
    icon: '📄',
    order_idx: i
})).filter(d => d.title);

const quick_links = vanBanData.map(r => ({
    icon: '📄',
    ten: String(r['Tên văn bản'] || r['Số hiệu'] || '').trim(),
    url: String(r['Link Xem'] || r['Link Tải'] || '#').trim()
})).filter(q => q.ten);

const appStateData = xlsx.utils.sheet_to_json(wb.Sheets['AppState'] || []);
const system_settings = appStateData.map(r => ({
    key: String(r['Key'] || '').trim(),
    value: String(r['Value'] || '').trim()
})).filter(s => s.key);

system_settings.push({
    key: 'quick_links',
    value: JSON.stringify(quick_links.length ? quick_links : [
        { icon: '📖', ten: 'Hướng dẫn sử dụng phần mềm', url: '#' },
        { icon: '📋', ten: 'Quy trình Kỹ thuật PHCN', url: '#' },
        { icon: '💰', ten: 'Bảng giá Dịch vụ KCB', url: '#' }
    ])
});

const chamcong_records = [];
fs.readdirSync('./Data_v3').forEach(file => {
    if (file.startsWith('chamcong_') && file.endsWith('.json')) {
        const monthKey = file.replace('chamcong_', '').replace('.json', '');
        const content = fs.readFileSync(path.join('./Data_v3', file), 'utf8');
        chamcong_records.push({
            month_year: monthKey,
            data_json: content
        });
    }
});

const thongke_records = [];
fs.readdirSync('./Data_v3').forEach(file => {
    if (file.startsWith('thuthuat_') && file.endsWith('.json')) {
        const monthKey = file.replace('thuthuat_', '').replace('.json', '');
        const content = fs.readFileSync(path.join('./Data_v3', file), 'utf8');
        thongke_records.push({
            month_year: monthKey,
            data_json: content
        });
    }
});

const timRanhData = xlsx.utils.sheet_to_json(wb.Sheets['TimRanh'] || []);
const tim_ranh = timRanhData.map((r, i) => ({
    id: i + 1,
    procedure_name: String(r['Thủ thuật'] || '').trim(),
    start_time: excelTimeToStr(r['Giờ BĐ']),
    end_time: excelTimeToStr(r['Giờ KT']),
    staff_name: String(r['NV Chính'] || '').trim(),
    machine_name: String(r['Máy'] || '').trim()
})).filter(t => t.procedure_name);

const backupPayload = {
    version: 'v3.1.0',
    exportDate: new Date().toISOString(),
    tables: {
        accounts,
        staff,
        machines,
        rooms,
        procedures,
        patients,
        schedules,
        history_records,
        history_busy,
        chamcong_records,
        thongke_records,
        tim_ranh,
        documents,
        system_settings
    }
};

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

if (Array.isArray(patients)) {
    patients.forEach(r => {
        sql.push(`INSERT INTO patients (id, name, age, gender, room, bed, arrive_time, leave_time, procedures, status, ngay_vao, gio_ban, is_saturday) VALUES (${esc(r.id)}, ${esc(r.name)}, ${esc(r.age || 0)}, ${esc(r.gender || 'Nam')}, ${esc(r.room || '')}, ${esc(r.bed || '')}, ${esc(r.arrive_time || '07:30')}, ${esc(r.leave_time || '')}, ${esc(r.procedures || '[]')}, ${esc(r.status || 'Chưa xếp')}, ${esc(r.ngay_vao || '')}, ${esc(r.gio_ban || '')}, ${esc(r.is_saturday || 0)});`);
    });
}

if (Array.isArray(accounts)) {
    accounts.forEach(r => {
        sql.push(`INSERT INTO accounts (id, username, password_hash, role, permissions) VALUES (${esc(r.id)}, ${esc(r.username)}, ${esc(r.password_hash)}, ${esc(r.role || 'user')}, ${esc(r.permissions || '')});`);
    });
}

if (Array.isArray(staff)) {
    staff.forEach(r => {
        sql.push(`INSERT INTO staff (id, name, role, system, skills, fixed_busy, temp_busy, his_name, priority, is_active) VALUES (${esc(r.id)}, ${esc(r.name)}, ${esc(r.role || 'KTV')}, ${esc(r.system || 'PHCN')}, ${esc(r.skills || '')}, ${esc(r.fixed_busy || '')}, ${esc(r.temp_busy || '')}, ${esc(r.his_name || '')}, ${esc(r.priority || 0)}, ${esc(r.is_active ?? 1)});`);
    });
}

if (Array.isArray(machines)) {
    machines.forEach(r => {
        sql.push(`INSERT INTO machines (id, ten_loai, ma_may, trang_thai, is_active) VALUES (${esc(r.id)}, ${esc(r.ten_loai || r.type_name)}, ${esc(r.ma_may || r.machine_code)}, ${esc(r.trang_thai || r.status || 'Sẵn sàng')}, ${esc(r.is_active ?? 1)});`);
    });
}

if (Array.isArray(rooms)) {
    rooms.forEach(r => {
        sql.push(`INSERT INTO rooms (id, ten_phong, bac_si, ktv, danh_sach_may, so_giuong, danh_sach_giuong, is_active) VALUES (${esc(r.id)}, ${esc(r.ten_phong || r.name)}, ${esc(r.bac_si || r.doctor)}, ${esc(r.ktv || r.ktv_list)}, ${esc(r.danh_sach_may || r.machine_list)}, ${esc(r.so_giuong || r.bed_count || 0)}, ${esc(r.danh_sach_giuong || r.bed_list)}, ${esc(r.is_active ?? 1)});`);
    });
}

if (Array.isArray(procedures)) {
    procedures.forEach(r => {
        sql.push(`INSERT INTO procedures (id, ten_thu_thuat, viet_tat, he, phan_loai, may, tg_thuc_hien, tg_thu_thuat, khoang_cach, can_rut_may, can_nguoi_phu, ds_nguoi_phu, is_active) VALUES (${esc(r.id)}, ${esc(r.ten_thu_thuat || r.name)}, ${esc(r.viet_tat || r.short_name)}, ${esc(r.he || r.system || 'YHCT')}, ${esc(r.phan_loai || r.category || 'Loại 2')}, ${esc(r.may || r.machine_type)}, ${esc(r.tg_thuc_hien || r.prep_time || 5)}, ${esc(r.tg_thu_thuat || r.exec_time || 20)}, ${esc(r.khoang_cach || r.gap_time || 5)}, ${esc(r.can_rut_may || r.need_unplug || 0)}, ${esc(r.can_nguoi_phu || r.need_assistant || 0)}, ${esc(r.ds_nguoi_phu || r.assistant_list)}, ${esc(r.is_active ?? 1)});`);
    });
}

if (Array.isArray(schedules)) {
    schedules.forEach(r => {
        sql.push(`INSERT INTO schedules (id, date, patient_name, room, procedure_name, staff_name, machine_name, start_time, end_time, is_saturday, order_idx) VALUES (${esc(r.id)}, ${esc(r.date)}, ${esc(r.patient_name)}, ${esc(r.room)}, ${esc(r.procedure_name)}, ${esc(r.staff_name)}, ${esc(r.machine_name)}, ${esc(r.start_time)}, ${esc(r.end_time)}, ${esc(r.is_saturday || 0)}, ${esc(r.order_idx || 0)});`);
    });
}

if (Array.isArray(history_records)) {
    history_records.forEach(r => {
        sql.push(`INSERT INTO history_records (id, date, patient_name, room, procedure_name, staff_name, machine_name, start_time, end_time) VALUES (${esc(r.id)}, ${esc(r.date)}, ${esc(r.patient_name)}, ${esc(r.room)}, ${esc(r.procedure_name)}, ${esc(r.staff_name)}, ${esc(r.machine_name)}, ${esc(r.start_time)}, ${esc(r.end_time)});`);
    });
}

if (Array.isArray(history_busy)) {
    history_busy.forEach(r => {
        sql.push(`INSERT INTO history_busy (id, date, staff_name, busy_ranges) VALUES (${esc(r.id)}, ${esc(r.date)}, ${esc(r.staff_name)}, ${esc(r.busy_ranges)});`);
    });
}

if (Array.isArray(chamcong_records)) {
    chamcong_records.forEach(r => {
        sql.push(`INSERT INTO chamcong_records (month_year, data_json) VALUES (${esc(r.month_year)}, ${esc(r.data_json)});`);
    });
}

if (Array.isArray(thongke_records)) {
    thongke_records.forEach(r => {
        sql.push(`INSERT INTO thongke_records (month_year, data_json) VALUES (${esc(r.month_year)}, ${esc(r.data_json)});`);
    });
}

if (Array.isArray(tim_ranh)) {
    tim_ranh.forEach(r => {
        sql.push(`INSERT INTO tim_ranh (id, procedure_name, start_time, end_time, staff_name, machine_name) VALUES (${esc(r.id)}, ${esc(r.procedure_name)}, ${esc(r.start_time)}, ${esc(r.end_time)}, ${esc(r.staff_name)}, ${esc(r.machine_name)});`);
    });
}

if (Array.isArray(documents)) {
    documents.forEach(r => {
        sql.push(`INSERT INTO documents (id, doc_number, title, agency, signed_date, view_link, download_link) VALUES (${esc(r.id)}, ${esc(r.doc_number || '')}, ${esc(r.title || r.ten_van_ban)}, ${esc(r.agency || '')}, ${esc(r.signed_date || '')}, ${esc(r.url || r.view_link || '#')}, ${esc(r.download_link || r.url || '#')});`);
    });
}

if (Array.isArray(system_settings)) {
    system_settings.forEach(r => {
        sql.push(`INSERT INTO system_settings (key, value) VALUES (${esc(r.key)}, ${esc(r.value)});`);
    });
}

fs.writeFileSync('./scratch/import_v2.sql', sql.join('\n'));
console.log('Regenerated import_v2.sql with patient ngay_vao and', sql.length, 'statements!');
