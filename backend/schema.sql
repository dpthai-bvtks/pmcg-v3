-- ============================================================
-- CLOUDFLARE D1 DATABASE SCHEMA CHO PM-XEPLICH V3
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    permissions TEXT DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'KTV',
    system TEXT NOT NULL DEFAULT 'PHCN',
    skills TEXT DEFAULT '',
    fixed_busy TEXT DEFAULT '',
    temp_busy TEXT DEFAULT '',
    his_name TEXT DEFAULT '',
    priority INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT DEFAULT '',
    system TEXT DEFAULT '',
    metadata TEXT DEFAULT '',
    order_idx INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, name)
);

CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER DEFAULT 0,
    gender TEXT DEFAULT 'Nam',
    room TEXT DEFAULT '',
    bed TEXT DEFAULT '',
    arrive_time TEXT DEFAULT '07:30',
    leave_time TEXT DEFAULT '',
    procedures TEXT NOT NULL DEFAULT '[]',
    status TEXT DEFAULT 'Chưa xếp',
    is_saturday INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    room TEXT DEFAULT '',
    procedure_name TEXT NOT NULL,
    staff_name TEXT DEFAULT '',
    machine_name TEXT DEFAULT '',
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_saturday INTEGER DEFAULT 0,
    order_idx INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    room TEXT DEFAULT '',
    procedure_name TEXT NOT NULL,
    staff_name TEXT DEFAULT '',
    machine_name TEXT DEFAULT '',
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_busy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    busy_ranges TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chamcong_records (
    month_year TEXT PRIMARY KEY,
    data_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS thongke_records (
    month_year TEXT PRIMARY KEY,
    data_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);
CREATE INDEX IF NOT EXISTS idx_history_records_date ON history_records(date);
CREATE INDEX IF NOT EXISTS idx_history_busy_date ON history_busy(date);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
