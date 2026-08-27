/**
 * OFFLINE SYNC ENGINE & EMERGENCY DATA BACKUP MODULE
 * Cho phép PMCG V3 tự chủ hoạt động 100% khi mất mạng hoặc tất cả Server đều sập.
 */

window.OfflineSyncEngine = (function () {
  const DB_NAME = 'PMCG_Offline_DB';
  const DB_VERSION = 1;
  let dbInstance = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (dbInstance) return resolve(dbInstance);
      if (!window.indexedDB) return resolve(null);

      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function (e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
      };
      request.onsuccess = function (e) {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };
      request.onerror = function (e) {
        console.warn('[IndexedDB] Failed to open IndexedDB:', e);
        resolve(null);
      };
    });
  }

  async function saveCache(key, data) {
    try {
      const db = await openDB();
      if (!db) {
        localStorage.setItem('pmcg_cache_' + key, JSON.stringify(data));
        return;
      }
      const tx = db.transaction('cache', 'readwrite');
      tx.objectStore('cache').put({ key: key, data: data, timestamp: Date.now() });
    } catch (e) {
      console.warn('[IndexedDB Save Error]:', e);
    }
  }

  async function getCache(key) {
    try {
      const db = await openDB();
      if (!db) {
        const raw = localStorage.getItem('pmcg_cache_' + key);
        return raw ? JSON.parse(raw) : null;
      }
      return new Promise((resolve) => {
        const tx = db.transaction('cache', 'readonly');
        const req = tx.objectStore('cache').get(key);
        req.onsuccess = () => resolve(req.result ? req.result.data : null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  // 1-Click Export emergency backup JSON
  function exportEmergencyBackupData() {
    try {
      const cache = window.dataCache || {};
      const backupPayload = {
        app: 'PMCG-Xeplichthuthuat',
        version: '3.1.1',
        exportTime: new Date().toLocaleString('vi-VN'),
        data: {
          pat: cache.pat || [],
          staff: cache.staff || [],
          machines: cache.machines || cache.machine || [],
          rooms: cache.rooms || cache.room || [],
          procedures: cache.procedures || cache.proc || [],
          schedule: cache.schedule || window.currentScheduleData || [],
          unscheduled: window.lastUnscheduledData || []
        }
      };

      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `PMCG_Backup_DuPhong_${new Date().toISOString().slice(0, 10)}.json`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert(`✅ Đã xuất file sao lưu khẩn cấp thành công!\nTên file: ${filename}`);
    } catch (e) {
      alert('❌ Lỗi xuất file dự phòng: ' + e.message);
    }
  }

  // 1-Click Import emergency backup JSON
  function importEmergencyBackupData(fileInput) {
    if (!fileInput.files || fileInput.files.length === 0) return;
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        const payload = JSON.parse(e.target.result);
        if (!payload.data) throw new Error('File không đúng cấu trúc dự phòng PMCG!');

        const d = payload.data;
        if (!window.dataCache) window.dataCache = {};
        window.dataCache.pat = d.pat || [];
        window.dataCache.staff = d.staff || [];
        window.dataCache.machine = d.machines || d.machine || [];
        window.dataCache.machines = window.dataCache.machine;
        window.dataCache.room = d.rooms || d.room || [];
        window.dataCache.rooms = window.dataCache.room;
        window.dataCache.proc = d.procedures || d.proc || [];
        window.dataCache.procedures = window.dataCache.proc;
        window.dataCache.schedule = d.schedule || [];
        window.currentScheduleData = d.schedule || [];
        window.lastUnscheduledData = d.unscheduled || [];

        // Save into offline cache
        saveCache('times_bootstrap_cache', window.dataCache);
        localStorage.setItem('meds_success', JSON.stringify(d.schedule || []));

        if (typeof filterSchedule === 'function') filterSchedule();
        if (typeof renderPatientsTable === 'function') renderPatientsTable();
        if (typeof renderStats === 'function') renderStats(window.lastUnscheduledData);

        alert(`✅ Đã nạp thành công dữ liệu từ file sao lưu!\nThời điểm tạo file: ${payload.exportTime || 'Không xác định'}`);
      } catch (err) {
        alert('❌ Lỗi nạp file dự phòng: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  return {
    saveCache,
    getCache,
    exportEmergencyBackupData,
    importEmergencyBackupData
  };
})();
