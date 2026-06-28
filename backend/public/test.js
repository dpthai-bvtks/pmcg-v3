
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "T.I.M.E.S. System",
      "operatingSystem": "All",
      "applicationCategory": "BusinessApplication",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "VND"
      },
      "provider": {
        "@type": "MedicalOrganization",
        "name": "Khoa Y học cổ truyền - Phục hồi chức năng - Bệnh viện Than - Khoáng sản CS2",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Hà Nội",
          "addressCountry": "VN"
        }
      }
    }
    



        window.dataCacheTime = window.dataCacheTime || {};



        window.loadTimRanhDataFromServer = function () {

            const statusEl = document.getElementById('utils-file-status');

            if (statusEl) {

                statusEl.innerText = '⏳ Đang kết nối máy chủ để lấy dữ liệu Tìm Rảnh chung...';

                statusEl.style.color = '#f39c12';

            }



            fetch('/api/rpc', {

                method: 'POST',

                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },

                body: new URLSearchParams({

                    action: 'getTimRanhData',

                    args: JSON.stringify([])

                })

            })

            .then(response => response.json())

            .then(result => {

                const data = result.status === 'success' ? result.data : [];

                if (data && data.length > 0) {

                    window.externalUtilsData = data;

                    if (statusEl) {

                        statusEl.innerText = `✅ Đã tải ${data.length} ca dùng chung từ máy chủ (Sheet TimRanh)!`;

                        statusEl.style.color = '#27ae60';

                    }

                } else if (statusEl) {

                    statusEl.innerText = '(Chưa có dữ liệu chung. Đang dùng: Lịch phần mềm xếp)';

                    statusEl.style.color = '#e67e22';

                }

            })

            .catch(error => {

                if (statusEl) {

                    statusEl.innerText = 'Không tải được dữ liệu Tìm Rảnh: ' + error.message;

                    statusEl.style.color = '#c0392b';

                }

            });

        };



        window.doLogin = function () {

            const user = document.getElementById('login-user')?.value || '';

            const pass = document.getElementById('login-pass')?.value || '';

            const errDiv = document.getElementById('login-error');

            const btn = document.getElementById('btn-do-login');



            if (!user || !pass) {

                if (errDiv) {

                    errDiv.innerText = 'Vui lòng nhập đủ thông tin!';

                    errDiv.style.display = 'block';

                }

                return;

            }



            if (btn) {

                btn.innerText = 'Đang kiểm tra...';

                btn.disabled = true;

            }



            fetch('/api/rpc', {

                method: 'POST',

                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },

                body: new URLSearchParams({

                    action: 'verifyLogin',

                    args: JSON.stringify([user, pass])

                })

            })

            .then(response => response.json())

            .then(result => {

                const res = result.status === 'success' ? result.data : { success: false, message: result.error || 'Lỗi đăng nhập!' };

                if (res.success) {

                    localStorage.setItem('meds_session', JSON.stringify({

                        username: res.username,

                        role: res.role,

                        permissions: res.permissions

                    }));

                    localStorage.setItem('meds_session_exp', (Date.now() + 28800000).toString());

                    const overlay = document.getElementById('login-overlay');

                    if (overlay) overlay.style.display = 'none';

                    if (typeof updateLogoutButton === 'function') updateLogoutButton(res.username);

                                        if (typeof applyPermissions === 'function') applyPermissions(res.role, res.permissions);

                    let targetTab = 'tab-home';

                    if (window.location.hash && window.location.hash.startsWith('#tab-')) {

                        targetTab = window.location.hash.substring(1);

                    }

                    const tabBtn = document.querySelector(`.nav-tab[data-tab="${targetTab}"]`) || document.querySelector(`.nav-item[data-tab="${targetTab}"]`);

                    if (tabBtn) {

                        tabBtn.click();

                    } else {

                        document.querySelector('.nav-tab[data-tab="tab-home"]')?.click();

                    }

                    if (res.role === 'Admin' && typeof loadAccounts === 'function') loadAccounts();

                } else {

                    if (errDiv) {

                        errDiv.innerText = res.message || 'Sai tài khoản hoặc mật khẩu!';

                        errDiv.style.display = 'block';

                    }

                    if (btn) {

                        btn.innerText = 'Đăng Nhập ➔';

                        btn.disabled = false;

                    }

                }

            })

            .catch(error => {

                if (errDiv) {

                    errDiv.innerText = 'Lỗi kết nối API: ' + error.message;

                    errDiv.style.display = 'block';

                }

                if (btn) {

                    btn.innerText = 'Đăng Nhập ➔';

                    btn.disabled = false;

                }

            });

        };

    




    window.showGlobalLoading = function(text) {

    let overlay = document.getElementById('global-loading-overlay');

    if (!overlay) {

        overlay = document.createElement('div');

        overlay.id = 'global-loading-overlay';

        overlay.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:999999; flex-direction:column; justify-content:center; align-items:center; color:white; font-size:18px; font-weight:bold; backdrop-filter: blur(2px);';

        overlay.innerHTML = '<div style="border:4px solid rgba(255,255,255,0.3); border-top:4px solid #fff; border-radius:50%; width:40px; height:40px; animation:spin 1s linear infinite; margin-bottom:15px;"></div><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style><span id="global-loading-text"></span>';

        document.body.appendChild(overlay);

    }

    document.getElementById('global-loading-text').innerText = text || 'Đang xử lý...';

    overlay.style.display = 'flex';

};

window.hideGlobalLoading = function() {

    const overlay = document.getElementById('global-loading-overlay');

    if (overlay) overlay.style.display = 'none';

};

window.showToast = function(message, type = 'success', duration = 3500) {
    let container = document.getElementById('global-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'global-toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast-card ${type}`;
    let icon = '🔔';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';
    else if (type === 'info') icon = 'ℹ️';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-message">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 450);
    }, duration);
};

// Check for pending success toast on reload
if (sessionStorage.getItem('sync_success_toast') === 'true') {
    sessionStorage.removeItem('sync_success_toast');
    setTimeout(() => {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('Đồng bộ thành công', 'Hệ thống đã nạp và làm sạch toàn bộ dữ liệu từ Google Sheets thành công!', '🎉', '#27ae60');
        } else {
            alert('✅ Đồng bộ thành công!');
        }
    }, 600);
}

// Check for pending chot so success toast on reload
if (sessionStorage.getItem('chot_so_success_toast') === 'true') {
    sessionStorage.removeItem('chot_so_success_toast');
    setTimeout(() => {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('Chốt sổ thành công', 'Hệ thống đã chốt sổ và tự động cập nhật dữ liệu mới thành công!', '🎉', '#27ae60');
        } else {
            alert('✅ Chốt sổ thành công!');
        }
    }, 600);
}

window.onerror = function(msg, url, lineNo, columnNo, error) { console.error('JS ERROR:', msg, 'at line', lineNo); alert('LỖI CÚ PHÁP TẠI DÒNG ' + lineNo + ': ' + msg); };

console.log('MAIN SCRIPT STARTING...');

// ============================================================

// GITHUB PAGES API CONFIGURATION

// ============================================================

const API_URL = '/api/rpc';



window.google = window.google || {};

window.google.script = window.google.script || {};

window.google.script.run = new Proxy({}, {

    get: function(target, prop) {

        if (prop === 'withSuccessHandler') {

            return function(successCallback) {

                return new Proxy({}, {

                    get: function(target2, prop2) {

                        if (prop2 === 'withFailureHandler') {

                            return function(errorCallback) {

                                return new Proxy({}, {

                                    get: function(target3, methodName) {

                                        return function(...args) {

                                            callApi(methodName, args, successCallback, errorCallback);

                                        };

                                    }

                                });

                            };

                        }

                        return function(...args) {

                            callApi(prop2, args, successCallback, null);

                        };

                    }

                });

            };

        }

        if (prop === 'withFailureHandler') {

            return function(errorCallback) {

                return new Proxy({}, {

                    get: function(target2, prop2) {

                        if (prop2 === 'withSuccessHandler') {

                            return function(successCallback) {

                                return new Proxy({}, {

                                    get: function(target3, methodName) {

                                        return function(...args) {

                                            callApi(methodName, args, successCallback, errorCallback);

                                        };

                                    }

                                });

                            };

                        }

                        return function(...args) {

                            callApi(prop2, args, null, errorCallback);

                        };

                    }

                });

            };

        }

        return function(...args) {

            callApi(prop, args, null, null);

        };

    }

});



function callApi(functionName, args, onSuccess, onError) {
    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            action: functionName,
            args: JSON.stringify(args)
        })
    })
    .then(response => response.json())
    .then(result => {
        if (result.status === 'success') {


            if (onSuccess) onSuccess(result.data);
        } else {
            console.error('API Error:', result.error);
            if (onError) onError(result.error);
            else alert('Lỗi: ' + result.error);
        }
    })
    .catch(error => {
        console.error('Fetch Error:', error);
        if (onError) onError(error.toString());
        else alert('Lỗi kết nối API: ' + error.toString());
    });
}







// --- AUTH CODE MOVED TO TOP ---

                                // ============================================================

                                let adminAccCache = [];



// --- Block Merged ---



console.log('--- JS Block: Auth & Permissions started ---');

                                window.doLogin = function() {

                                const user = document.getElementById('login-user').value;

                                const pass = document.getElementById('login-pass').value;

                                const errDiv = document.getElementById('login-error');

                                const btn = document.getElementById('btn-do-login');



                                if (!user || !pass) { errDiv.innerText = "Vui lòng nhập đủ thông tin!";

                                errDiv.style.display = "block"; return; }

                                btn.innerText = "Đang kiểm tra..."; btn.disabled = true;



                                google.script.run.withSuccessHandler(res => {

                                if (res.success) {

                                // 1. Lưu thông tin người dùng

                                localStorage.setItem('meds_session', JSON.stringify({username: res.username, role:

                                res.role, permissions: res.permissions}));



                                // 🔥 2. Đặt thời gian hết hạn là 8 tiếng sau (8 * 60 * 60 * 1000 = 28,800,000 ms)

                                localStorage.setItem('meds_session_exp', (Date.now() + 28800000).toString());



                                document.getElementById('login-overlay').style.display = 'none';

                                if (typeof updateLogoutButton === 'function') updateLogoutButton(res.username);

                                                                if (typeof applyPermissions === 'function') applyPermissions(res.role, res.permissions);

                                let targetTab = 'tab-home';

                                if (window.location.hash && window.location.hash.startsWith('#tab-')) {

                                    targetTab = window.location.hash.substring(1);

                                }

                                const tabBtn = document.querySelector(`.nav-tab[data-tab="${targetTab}"]`) || document.querySelector(`.nav-item[data-tab="${targetTab}"]`);

                                if (tabBtn) {

                                    tabBtn.click();

                                } else {

                                    document.querySelector('.nav-tab[data-tab="tab-home"]')?.click();

                                }

                                if (res.role === 'Admin' && typeof loadAccounts === 'function') loadAccounts();

                                } else {

                                errDiv.innerText = res.message; errDiv.style.display = "block";

                                btn.innerText = "Đăng Nhập ➔"; btn.disabled = false;

                                }

                                }).verifyLogin(user, pass);

                                }



// ----------------------------



// --- Block Merged ---



console.log('--- JS Block: Main Logic started ---');

        // ============================================================

console.log('--- JS Block: Foundation started ---');

        // 🔧 HELPER UTILITIES

        // ============================================================



        window.alert = function (message) {

            const m = String(message).toLowerCase();

            const [type, title] =

                (m.includes('lỗi') || m.includes('thất bại')) ? ['error', 'LỖI HỆ THỐNG'] :

                    (m.includes('thành công') || m.includes('xong')) ? ['success', 'THÀNH CÔNG'] :

                        (m.includes('vui lòng') || m.includes('chưa')) ? ['warning', 'LƯU Ý'] :

                            ['info', 'THÔNG BÁO'];

            (typeof showThongBao === 'function') ? showThongBao(title, message, type) : console.log(message);

        };



        let dataCache = { machine: [], proc: [], staff: [], room: [], pat: [] };

        let editIndex = { machine: -1, proc: -1, staff: -1, room: -1, pat: -1 };

        let lastBusyContext = 'staff';

        window.currentScheduleData = [];

        window.lastUnscheduledData = JSON.parse(localStorage.getItem('meds_unscheduled')) || [];

        window.currentRotData = window.lastUnscheduledData;

        window.viewingImportedScheduleFile = false;

        window.scheduleSortState = null;



        // ─── Chống double-click ───────────────────────────────────────

        function withLock(fn, delay = 500) {

            let locked = false;

            return function (...args) {

                if (locked) return;

                locked = true;

                setTimeout(() => { locked = false; }, delay);

                fn.apply(this, args);

            };

        }



        // ─── Tiện ích chung ──────────────────────────────────────────

        function xoaDau(str) {

            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");

        }

        function normalizeName(str) {

            if (!str) return "";

            return xoaDau(String(str)).toLowerCase().replace(/\s+/g, '');

        }

        function t2m(t_str) {

            if (!t_str || !String(t_str).includes(":")) return 0;

            let parts = String(t_str).split(":");

            return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);

        }



        function isDroppedScheduleRow(row) {

            const g = String(row?.gioDienRa || row?.[5] || '');

            return g === '--' || g.includes('Rớt');

        }



        function normalizeScheduleRow(row) {

            if (!Array.isArray(row)) return row || {};

            return {

                ngay: row[0], tenBN: row[1], namSinh: row[2], phong: row[3], thuThuat: row[4],

                gioDienRa: row[5], gioKetThuc: row[6], nvChinh: row[7], nvPhu: row[8], may: row[9], giuong: row[10]

            };

        }



        function normalizeDroppedItem(item, fallbackDate = '') {

            if (!item) return {};

            if (Array.isArray(item)) {

                return {

                    ngay: item[0] || fallbackDate, bn: item[1] || '', ns: item[2] || '',

                    room: item[3] || '', phong: item[3] || '', tt: item[4] || '',

                    staff: item[7] || '', reason: item[11] || item[8] || 'Thiếu nhân sự/Máy hoặc hết giờ'

                };

            }

            const room = item.room || item.phong || '';

            return {

                ...item,

                ngay: item.ngay || fallbackDate,

                bn: item.bn || item.tenBN || '',

                ns: item.ns || item.namSinh || '',

                room,

                phong: room,

                tt: item.tt || item.thuThuat || '',

                reason: item.reason || item.liDo || 'Thiếu nhân sự/Máy hoặc hết giờ'

            };

        }



        function setUnscheduledData(items, dateVal = '') {

            const seen = new Set();

            const normalized = (items || []).map(item => normalizeDroppedItem(item, dateVal)).filter(item => {

                const key = [item.ngay, item.bn, item.ns, item.tt, item.room || item.phong, item.reason].map(x => String(x || '').trim().toLowerCase()).join('|');

                if (seen.has(key)) return false;

                seen.add(key);

                return true;

            });

            window.lastUnscheduledData = normalized;

            window.currentRotData = normalized;

            localStorage.setItem('meds_unscheduled', JSON.stringify(normalized));

            if (dateVal) localStorage.setItem('meds_schedule_date', dateVal);

            return normalized;

        }

        function m2t(mins) {

            let h = Math.floor(mins / 60), m = mins % 60;

            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

        }

        function renderEmptyRow(colspan, msg = 'Chưa có dữ liệu') {

            return `<tr><td colspan="${colspan}" align="center" style="padding:20px;color:#999">${msg}</td></tr>`;

        }

        function sortTimeSlots(slotsStr) {

            if (!slotsStr) return "";

            let slots = [...new Set(slotsStr.split(',').map(s => s.trim()).filter(s => s))];

            slots.sort((a, b) => t2m(a.split('-')[0].trim()) - t2m(b.split('-')[0].trim()));

            return slots.join(', ');

        }

        function getShortSkills(skillStr) {

            if (!skillStr) return '';

            return skillStr.split(',').map(sk => {

                let proc = dataCache.proc.find(p => p.ten.toLowerCase() === sk.trim().toLowerCase());

                return (proc && proc.vietTat) ? proc.vietTat : sk.trim();

            }).join(', ');

        }



        // ─── Index lookup gom chung ──────────────────────────────────

        function getEntityIdx(cacheKey, inputId) {

            let val = document.getElementById(inputId)?.value;

            if (!val) return -1;

            return dataCache[cacheKey].findIndex(item => normalizeName(item.ten) === normalizeName(val));

        }

        function getBusyPatIdx() { return getEntityIdx('pat', 'busy-pat-input'); }

        function getLeavePatIdx() { return getEntityIdx('pat', 'leave-pat-input'); }



        // ============================================================

        // ⏰ TIME MASKING

        // ============================================================

        document.addEventListener('input', function (e) {

            if (!e.target?.classList.contains('time-input')) return;

            if (e.inputType === 'deleteContentBackward') return;

            let v = e.target.value.replace(/\D/g, '');

            if (!v.length) { e.target.value = ''; return; }

            if (v.length === 1 && parseInt(v) >= 3) v = '0' + v;

            let h = v.substring(0, 2), m = v.substring(2, 4);

            if (h.length === 2 && parseInt(h) > 23) h = '23';

            if (m.length === 2 && parseInt(m) > 59) m = '59';

            let res = h;

            if (v.length >= 2) res += ':' + m;

            e.target.value = res.substring(0, 5);

        });

        document.addEventListener('focusout', function (e) {

            if (!e.target?.classList.contains('time-input') || !e.target.value) return;

            const v = e.target.value;

            if (v.length === 2 && !v.includes(':')) e.target.value = v + ':00';

            else if (v.endsWith(':')) e.target.value = v + '00';

            else if (v.length === 4 && v.includes(':')) e.target.value = v + '0';

        });



        // ============================================================

        // 🔤 TABLE SORTING

        // ============================================================

        function setupTableSorting(container = document) {

            container.querySelectorAll('th').forEach(th => {

                if (th.dataset.sortBound) return;

                th.dataset.sortBound = "true";

                th.title = 'Bấm để sắp xếp (A-Z / Z-A)';

                th.addEventListener('click', function () {

                    const table = this.closest('table');

                    const tbody = table?.querySelector('tbody');

                    if (!tbody) return;

                    const index = Array.from(this.parentElement.children).indexOf(this);

                    let isAsc = this.dataset.dir !== 'asc';



                    if (table?.id === 'schedule-table') {

                        window.scheduleSortState = { index, dir: isAsc ? 'asc' : 'desc' };

                        this.parentElement.querySelectorAll('th').forEach(el => {

                            if (el !== this) el.dataset.dir = '';

                            el.innerText = el.innerText.replace(' ▲', '').replace(' ▼', '');

                        });

                        this.dataset.dir = window.scheduleSortState.dir;

                        this.innerText = this.innerText.replace(' ▲', '').replace(' ▼', '') + (isAsc ? ' ▲' : ' ▼');

                        schedCurrentPage = 1;

                        renderSchedPage();

                        return;

                    }



                    const rows = Array.from(tbody.querySelectorAll('tr'));

                    if (rows.length === 0 || (rows.length === 1 && rows[0].cells.length <= 1)) return;



                    this.dataset.dir = isAsc ? 'asc' : 'desc';

                    this.parentElement.querySelectorAll('th').forEach(el => {

                        if (el !== this) el.dataset.dir = '';

                        el.innerText = el.innerText.replace(' ▲', '').replace(' ▼', '');

                    });

                    this.innerText = this.innerText + (isAsc ? ' ▲' : ' ▼');



                    rows.sort((a, b) => {

                        let valA = a.cells[index]?.innerText.trim() || '';

                        let valB = b.cells[index]?.innerText.trim() || '';

                        let numA = parseFloat(valA.replace(/,/g, ''));

                        let numB = parseFloat(valB.replace(/,/g, ''));

                        let dateA = valA.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

                        let dateB = valB.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

                        let primaryDiff = 0;



                        if (dateA && dateB) {

                            valA = dateA[3] + dateA[2] + dateA[1];

                            valB = dateB[3] + dateB[2] + dateB[1];

                            primaryDiff = isAsc ? valA.localeCompare(valB, 'vi', { numeric: true }) : valB.localeCompare(valA, 'vi', { numeric: true });

                        } else if (valA.match(/^\d{2}:\d{2}$/) && valB.match(/^\d{2}:\d{2}$/)) {

                            valA = valA.replace(':', '');

                            valB = valB.replace(':', '');

                            primaryDiff = isAsc ? valA.localeCompare(valB, 'vi', { numeric: true }) : valB.localeCompare(valA, 'vi', { numeric: true });

                        } else if (!isNaN(numA) && !isNaN(numB) && !valA.match(/[a-zA-ZÀ-ỹ]/) && !valB.match(/[a-zA-ZÀ-ỹ]/)) {

                            primaryDiff = isAsc ? numA - numB : numB - numA;

                        } else {

                            primaryDiff = isAsc ? valA.localeCompare(valB, 'vi', { numeric: true }) : valB.localeCompare(valA, 'vi', { numeric: true });

                        }



                        if (primaryDiff !== 0) return primaryDiff;



                        const headerCells = Array.from(this.parentElement.children);

                        let timeColIdx = headerCells.findIndex(th => {

                            const text = th.innerText.toLowerCase();

                            return text.includes('bắt đầu') || text.includes('giờ') || text.includes('thời gian') || text.includes('b.đầu');

                        });



                        if (timeColIdx !== -1 && timeColIdx !== index) {

                            let timeA = a.cells[timeColIdx]?.innerText.trim().replace(':', '') || '';

                            let timeB = b.cells[timeColIdx]?.innerText.trim().replace(':', '') || '';

                            return timeA.localeCompare(timeB, 'vi', { numeric: true });

                        }



                        return 0;

                    });

                    rows.forEach(row => tbody.appendChild(row));



                    if (this.parentElement.children[0].innerText.includes('STT')) {

                        let stt = 1;

                        Array.from(tbody.querySelectorAll('tr')).forEach(row => {

                            if (row.cells[0]) row.cells[0].innerText = stt++;

                        });

                    }

                });

            });

        }



        // ============================================================

        // ⌨️ GLOBAL KEYBOARD SHORTCUTS

        // ============================================================

        document.addEventListener('keydown', function (e) {

            const isInput = e.target.tagName.toLowerCase() === 'textarea' ||

                (e.target.tagName.toLowerCase() === 'input' && (e.target.type === 'text' || e.target.type === 'number'));

            if (isInput && e.key !== 'Enter') return;



            const activeTab = document.querySelector('.tab-content.active');

            if (!activeTab) return;

            const tabId = activeTab.id;



            if (e.key === 'Enter') {

                const targetId = e.target.id;

                e.preventDefault();

                if (tabId === 'tab-busy') {

                    if (targetId === 'busy-staff-select') { document.getElementById('busy-staff-from').focus(); return; }

                    if (targetId === 'busy-pat-input') { document.getElementById('busy-pat-from').focus(); return; }

                    if (targetId === 'leave-pat-input') {

                        let t = document.getElementById('leave-pat-time');

                        if (!t.value) t.value = '14:00';

                    }

                }

                if (isInput) e.target.blur();

                const tabBtnMap = {

                    'tab-machines': 'btn-save-machine',

                    'tab-procedures': 'btn-save-proc',

                    'tab-staff': 'btn-save-staff',

                    'tab-rooms': 'btn-save-room',

                    'tab-patients': 'btn-save-pat',

                };

                if (tabBtnMap[tabId]) { document.getElementById(tabBtnMap[tabId])?.click(); return; }

                if (tabId === 'tab-busy') {

                    const busyBtnMap = { staff: 'btn-sv-stf-bsy', pat: 'btn-sv-pat-bsy', leave: 'btn-sv-pat-lv' };

                    document.getElementById(busyBtnMap[lastBusyContext])?.click();

                }

                if (tabId === 'tab-utils') {

                    if (targetId === 'search-doc-time') timBacSiRanh();

                    else if (targetId === 'search-machine-time' || targetId === 'search-machine-type') timMayRanh();

                }

            }



            if (e.key === 'Delete' && !isInput) {

                const delMap = {

                    'tab-machines': () => editIndex.machine > -1 && deleteMachine(editIndex.machine),

                    'tab-procedures': () => editIndex.proc > -1 && deleteProcedure(editIndex.proc),

                    'tab-staff': () => editIndex.staff > -1 && deleteStaff(editIndex.staff),

                    'tab-rooms': () => editIndex.room > -1 && deleteRoom(editIndex.room),

                    'tab-patients': () => editIndex.pat > -1 && deletePatient(editIndex.pat),

                };

                if (delMap[tabId]) { delMap[tabId](); return; }

                if (tabId === 'tab-busy') {

                    const busyDelMap = { staff: 'btn-del-stf-bsy', pat: 'btn-del-pat-bsy', leave: 'btn-cl-pat-lv' };

                    document.getElementById(busyDelMap[lastBusyContext])?.click();

                }

            }

        });



        // ============================================================

        // 🚀 DOM READY

        // ============================================================

        document.addEventListener('DOMContentLoaded', function () {

            // Phần 1: Bơm Footer

            try {

                const khuonDuc = document.getElementById('khuon-duc-footer');

                if (khuonDuc) {

                    const noiDungFooter = khuonDuc.innerHTML;

                    document.querySelectorAll('.tab-content, .page').forEach(tab => tab.insertAdjacentHTML('beforeend', noiDungFooter));

                }

            } catch (err) { console.warn("Lỗi khi bơm Footer:", err); }



            // Phần 2: Chuyển Tab

            const tabs = document.querySelectorAll('.nav-tab, .nav-item');

            tabs.forEach(tab => {

                tab.addEventListener('click', () => {

                    try {

                        tabs.forEach(t => t.classList.remove('active'));

                        tab.classList.add('active');

                        document.querySelectorAll('.tab-content, .page').forEach(c => c.classList.remove('active'));



                        const targetTab = tab.getAttribute('data-tab');

                        const targetEl = document.getElementById(targetTab);



                        if (targetEl) targetEl.classList.add('active');

                        else console.warn("Không tìm thấy tab:", targetTab);



                        // Toggle class lên body để CSS điều chỉnh layout riêng cho từng tab

                        document.body.classList.toggle('tab-sat-active', targetTab === 'tab-sat');

                        document.body.classList.toggle('tab-schedule-active', targetTab === 'tab-schedule');



                        // Các lệnh gọi dữ liệu riêng cho từng Tab

                        if (targetTab === 'tab-sat' && typeof satCache !== 'undefined' && Object.keys(satCache).length === 0) {

                            if (typeof taiDsSat === 'function') taiDsSat();

                        }

                        if (targetTab === 'tab-home' || targetTab === 'page-dashboard') {

                            if (typeof loadDashboard === 'function') loadDashboard();

                        }



                        // 🔥 ĐOẠN FIX CHỐNG LỖI NHẢY TRANG CHO TAB XẾP LỊCH:

                        if (targetTab === 'tab-schedule') {

                            if (typeof schedCurrentPage !== 'undefined') schedCurrentPage = 1; // Luôn quay về trang 1

                            if (typeof loadScheduleList === 'function') loadScheduleList(); // Kích hoạt tải lại dữ liệu từ Sheet & ngắt trang

                        }

                        if (targetTab === 'tab-stats' && typeof renderStats === 'function') {

                            renderStats(window.lastUnscheduledData);

                        }



                    } catch (error) { console.error("Lỗi chuyển tab:", error); }

                });

            });



            // Phần 3: Khởi động

            if (typeof checkSession === 'function') checkSession(); // Kích hoạt tường lửa bảo mật 8 tiếng

            if (typeof loadAllData === 'function') loadAllData();

            if (typeof setupTableSorting === 'function') setupTableSorting();

            if (typeof loadDashboard === 'function') loadDashboard();



            const today = new Date();

            if (document.getElementById('schedule-date')) document.getElementById('schedule-date').valueAsDate = today;

            if (document.getElementById('pat-date')) {

                const dd = String(today.getDate()).padStart(2, '0');

                const mm = String(today.getMonth() + 1).padStart(2, '0');

                document.getElementById('pat-date').value = `${dd}/${mm}/${today.getFullYear()}`;

            }



            // Phần 4: Marquee

            google.script.run.withSuccessHandler(function (noiDung) {

                const el = document.getElementById('thong-bao-chay');

                if (el) el.innerText = noiDung;

                const inp = document.getElementById('admin-marquee-input');

                if (inp) inp.value = noiDung;

            }).layThongBaoDongChuChay();



            // Phần 5: Liên kết nhanh

            google.script.run.withSuccessHandler(function (danhSach) {

                const uls = document.querySelectorAll('#khu-vuc-lien-ket');

                if (!uls.length) return;

                const htmlContent = danhSach.length

                    ? danhSach.map(item => `<li><a href="${item.url}" target="_blank"><span class="f-icon">${item.icon}</span> ${item.ten}</a></li>`).join('')

                    : '<li><a href="#"><span class="f-icon">⚠️</span> Chưa có liên kết nào</a></li>';

                uls.forEach(ul => { ul.innerHTML = htmlContent; });

            }).layDanhSachLienKet();

        });



        // ============================================================

        // 📦 LOAD ALL DATA

        // ============================================================

        function loadAllData() {

            [loadMachines, loadRooms, loadScheduleList, loadProcedures, loadPatients, loadStaff].forEach(fn => fn());

            google.script.run.withSuccessHandler(text => {

                ['sys-marquee', 'admin-marquee-input'].forEach(id => {

                    const el = document.getElementById(id);

                    if (el) (id.includes('input') ? el.value = text : el.innerText = text);

                });

            }).getMarqueeText();

        }

        // =================================================================

        // 🚀 HÀM LÕI: TẢI DỮ LIỆU ĐA NĂNG (BẢN FIX TRIỆT ĐỂ LỖI THAM SỐ)

        // =================================================================

        window.dataCacheTime = window.dataCacheTime || {};



        function loadEntity(apiMethod, cacheKey, callback, extraCallbacks = [], forceRefresh = false) {
            const CACHE_TTL = 5 * 60 * 1000; // Lưu Cache 5 phút
            const now = Date.now();
            window.dataCacheTime = window.dataCacheTime || {};

            let callbacksToRun = [];
            if (typeof callback === 'function') callbacksToRun.push(callback);
            if (Array.isArray(extraCallbacks)) callbacksToRun = callbacksToRun.concat(extraCallbacks);



            if (!forceRefresh && typeof dataCache !== 'undefined' && dataCache[cacheKey] && window.dataCacheTime[cacheKey] && dataCache[cacheKey].length > 0) {
                if (now - window.dataCacheTime[cacheKey] < CACHE_TTL) {
                    callbacksToRun.forEach(cb => cb());
                    return;
                }
            }

            loadFromSheets(apiMethod, cacheKey, callbacksToRun);
        }

        function loadFromSheets(apiMethod, cacheKey, callbacks) {
            google.script.run
                .withSuccessHandler(data => {
                    if (typeof dataCache !== 'undefined') {
                        const rawData = data || [];
                        rawData.forEach((item, i) => {
                            if (item) item.sheetIndex = i;
                        });
                        let cleaned = rawData;
                        if (cacheKey === 'pat' || cacheKey === 'staff') {
                            cleaned = rawData.filter(item => item && item.ten && String(item.ten).trim() !== '');
                        } else if (cacheKey === 'machine') {
                            cleaned = rawData.filter(item => item && (item.tenLoai || item[1]) && String(item.tenLoai || item[1]).trim() !== '');
                        } else if (cacheKey === 'room') {
                            cleaned = rawData.filter(item => item && (item.tenPhong || item[1]) && String(item.tenPhong || item[1]).trim() !== '');
                        } else if (cacheKey === 'proc') {
                            cleaned = rawData.filter(item => item && (item.ten || item[1]) && String(item.ten || item[1]).trim() !== '');
                        }
                        cleaned.forEach((item, idx) => {
                            item.index = idx;
                        });
                        dataCache[cacheKey] = cleaned;
                    }
                    window.dataCacheTime = window.dataCacheTime || {};
                    window.dataCacheTime[cacheKey] = Date.now();
                    callbacks.forEach(cb => cb());
                })
                .withFailureHandler(e => {
                    console.error("❌ Lỗi tải [" + cacheKey + "]:", e);
                    callbacks.forEach(cb => cb());
                })
            [apiMethod]();
        }

        function triggerDataRefresh(btn) {
            const origText = btn.innerText;
            btn.disabled = true;
            btn.innerText = "⏳ ĐANG ĐỒNG BỘ...";
            if (window.showGlobalLoading) window.showGlobalLoading("Đang tải dữ liệu từ Google Sheets...");

            window.dataCacheTime = {}; // Xóa cache time

            Promise.all([
                new Promise((resolve) => {
                    loadEntity('getBenhNhan', 'pat', () => resolve(), [], true);
                }),
                new Promise((resolve) => {
                    loadEntity('getNhanSu', 'staff', () => resolve(), [], true);
                })
            ]).then(() => {
                if (window.hideGlobalLoading) window.hideGlobalLoading();
                btn.disabled = false;
                btn.innerText = origText;
                sessionStorage.setItem('sync_success_toast', 'true');
                location.reload();
            }).catch(err => {
                if (window.hideGlobalLoading) window.hideGlobalLoading();
                btn.disabled = false;
                btn.innerText = origText;
                if (window.showToast) {
                    window.showToast("❌ Lỗi tải dữ liệu: " + err, "error", 5000);
                } else {
                    alert("❌ Lỗi tải dữ liệu: " + err);
                }
            });
        }
        function loadMachines() { loadEntity('getDanhSachMay', 'machine', renderMachinesTable); }

        function loadRooms() { loadEntity('getPhongThuThuat', 'room', renderRoomsTable); }

        function loadPatients() { loadEntity('getBenhNhan', 'pat', renderPatientsTable); }

        function loadProcedures() {

            google.script.run.withSuccessHandler(data => {

                dataCache.proc = data;

                renderProceduresTable();

                renderProcedureCheckboxes();

                loadStaff();

            }).getThuThuat();

        }

        function loadStaff() {

            loadEntity('getNhanSu', 'staff', renderStaffTable, [

                () => { if (typeof loadPatients === 'function') loadPatients(); }

            ]);

        }



        // ============================================================

        // 📋 CANCEL EDIT (Form reset)

        // ============================================================

        function cancelEdit(type) {

            editIndex[type] = -1;

            document.querySelectorAll(`.tab-content.active .sidebar-form input[type="text"]:not([readonly]), .tab-content.active .sidebar-form input[type="number"], .tab-content.active .sidebar-form textarea:not([readonly])`).forEach(i => i.value = '');

            document.querySelectorAll(`.tab-content.active .sidebar-form input[type="checkbox"]`).forEach(c => c.checked = false);



            const configs = {

                machine: () => { document.getElementById('group-qty').style.display = 'flex'; document.getElementById('btn-save-machine').innerText = "Thêm"; document.getElementById('btn-cancel-machine').style.display = "none"; },

                proc: () => { document.getElementById('btn-save-proc').innerText = "Thêm"; document.getElementById('btn-cancel-proc').style.display = "none"; document.getElementById('proc-system').value = 'YHCT'; document.getElementById('proc-category').value = 'Chưa phân loại'; document.getElementById('proc-machine').value = 'Thủ công'; },

                staff: () => { document.getElementById('btn-save-staff').innerText = "Thêm"; document.getElementById('btn-cancel-staff').style.display = "none"; },

                room: () => { document.getElementById('btn-save-room').innerText = "Thêm"; document.getElementById('btn-cancel-room').style.display = "none"; },

                pat: () => {

                    document.getElementById('btn-save-pat').innerText = "Thêm";

                    document.getElementById('btn-cancel-pat').style.display = "none";

                    const today = new Date();

                    document.getElementById('pat-date').value = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

                },

            };

            configs[type]?.();

        }



        // ============================================================

        // ⚙️ 1. MÁY MÓC

        // ============================================================

        function renderMachinesTable() {

            const statEl = document.getElementById('stat-machines');

            if (statEl) statEl.innerText = dataCache.machine.length;

            const tbody = document.getElementById('machines-list');

            if (!tbody) return;



            const procMachineSelect = document.getElementById('proc-machine');

            const searchMachineSelect = document.getElementById('search-machine-type');

            if (procMachineSelect && searchMachineSelect) {

                const types = [...new Set(dataCache.machine.map(m => String(m.tenLoai || m[1] || '').trim()))].filter(Boolean);

                procMachineSelect.innerHTML = '<option>Thủ công</option>' + types.map(t => `<option value="${t}">${t}</option>`).join('');

                searchMachineSelect.innerHTML = '<option>Chọn loại máy</option>' + types.map(t => `<option value="${t}">${t}</option>`).join('');

            }



            if (!dataCache.machine.length) { tbody.innerHTML = renderEmptyRow(5, 'Chưa có thiết bị'); return; }

            tbody.innerHTML = dataCache.machine.map((item, i) => {

                const idx = dataCache.machine.indexOf(item);

                const ten = String(item.tenLoai || item[1] || '').trim();

                const ma = String(item.maMay || item[2] || '').trim();

                const tt = item.trangThai || item[3] || '';

                return `<tr class="editable-row" onclick="editRoomMachine(${idx})" title="Bấm sửa (Phím Delete để xóa)">

            <td>${i + 1}</td><td><b>${ten}</b></td>

            <td><span class="badge badge-info">${ma}</span></td>

            <td><span style="color:${tt === 'Sẵn sàng' ? '#28a745' : '#dc3545'}; font-weight:600">${tt}</span></td>

            <td><button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteMachine(${idx})">Xóa</button></td>

        </tr>`;

            }).join('');

            if (typeof renderDynamicMachineInputs === 'function') renderDynamicMachineInputs();

        }

        function saveMachine() {

            const t = document.getElementById('machine-type').value.trim();

            const c = document.getElementById('machine-code').value.trim();

            const q = document.getElementById('machine-qty').value;

            const s = document.getElementById('machine-status').value;

            if (!t || !c) return alert("Điền tên và mã máy!");

            if (editIndex.machine > -1) {

                dataCache.machine[editIndex.machine] = { tenLoai: t, maMay: c, trangThai: s };

                google.script.run.editMayMoc(editIndex.machine, t, c, s);

            } else {

                for (let i = 0; i < parseInt(q); i++) dataCache.machine.push({ tenLoai: t, maMay: `${c}${i + 1}`, trangThai: s });

                google.script.run.addMayMoc(t, c, q, s);

            }

            cancelEdit('machine'); renderMachinesTable();

        }

        function editRoomMachine(index) {

            editIndex.machine = index;

            const item = dataCache.machine[index];

            document.getElementById('machine-type').value = String(item.tenLoai).trim();

            document.getElementById('machine-code').value = String(item.maMay).trim();

            document.getElementById('machine-status').value = item.trangThai;

            document.getElementById('group-qty').style.display = 'none';

            document.getElementById('btn-save-machine').innerText = "Lưu Sửa";

            document.getElementById('btn-cancel-machine').style.display = "inline-block";

        }

        function deleteMachine(i) {

            showCustomConfirm("Xác nhận xóa máy", "Bác sĩ có chắc chắn muốn xóa máy này?", function () {

                if (window.showGlobalLoading) window.showGlobalLoading("Đang xóa máy móc...");

                const btnSave = document.getElementById('btn-save-machine');

                if (btnSave) { btnSave.disabled = true; btnSave.innerText = "Đang xóa..."; }

                dataCache.machine.splice(i, 1); renderMachinesTable(); 

                google.script.run

                    .withSuccessHandler(() => { 

                        if (window.hideGlobalLoading) window.hideGlobalLoading();

                        if (btnSave) { btnSave.disabled = false; btnSave.innerText = "Thêm"; }

                        if (typeof loadMachines === 'function') loadMachines(); 

                    })

                    .withFailureHandler(e => {

                        if (window.hideGlobalLoading) window.hideGlobalLoading();

                        if (btnSave) { btnSave.disabled = false; btnSave.innerText = "Thêm"; }

                        alert('Lỗi: ' + e);

                    }).deleteMayMoc(i);

            });

        }

        function renderDynamicMachineInputs() {

            const container = document.getElementById('dynamic-machine-inputs');

            if (!container || !dataCache.machine) return;

            const types = [...new Set(dataCache.machine.map(m => String(m.tenLoai).trim()).filter(t => t !== ''))];

            container.innerHTML = types.map(type => `

        <div style="display:flex; justify-content:space-between; align-items:center" title="${type}">

            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:80px; text-transform:capitalize;">${type}</span>:

            <input type="number" class="room-machine-input" data-type="${type.toLowerCase()}" min="0" style="width:40px; padding:2px">

        </div>`).join('');

        }



        // ============================================================

        // 💉 2. THỦ THUẬT

        // ============================================================

        function renderProcedureCheckboxes() {

            let sYhct = '<h4 class="yhct">💊 YHCT</h4>', sPhcn = '<h4 class="phcn">⚙️ PHCN</h4>';

            let pYhct = '<h4 class="yhct">💊 YHCT</h4>', pPhcn = '<h4 class="phcn">⚙️ PHCN</h4>';

            dataCache.proc.forEach(p => {

                const sCb = `<label class="checkbox-item"><input type="checkbox" class="skill-checkbox" value="${p.ten}"> ${p.ten}</label>`;

                const pCb = `<label class="checkbox-item"><input type="checkbox" class="pat-proc-cb" value="${p.ten}"> ${p.ten}</label>`;

                if (p.he === 'YHCT') { sYhct += sCb; pYhct += pCb; } else { sPhcn += sCb; pPhcn += pCb; }

            });

            [['staff-skills-yhct', sYhct], ['staff-skills-phcn', sPhcn], ['pat-skills-yhct', pYhct], ['pat-skills-phcn', pPhcn]]

                .forEach(([id, html]) => { const el = document.getElementById(id); if (el) el.innerHTML = html; });

        }

        function renderProceduresTable() {

            const tbody = document.getElementById('procedures-list');

            if (!tbody) return;

            if (!dataCache.proc.length) { tbody.innerHTML = renderEmptyRow(9); return; }

            tbody.innerHTML = dataCache.proc.map((item, i) => `<tr class="editable-row" onclick="editProc(${i})" title="Bấm sửa (Phím Delete để xóa)">

        <td>${i + 1}</td><td>${item.ten}</td><td><strong>${item.vietTat}</strong></td>

        <td>${item.thoiGianThucHien}</td><td>${item.thoiGianThuThuat}</td><td>${item.khoangCach}</td>

        <td>${item.canRutMay}</td><td>${item.canNguoiPhu}</td>

        <td><button class="btn-danger" onclick="event.stopPropagation(); deleteProcedure(${i})">Xóa</button></td>

    </tr>`).join('');

        }

        function saveProcedure() {

            const ten = document.getElementById('proc-name').value, vt = document.getElementById('proc-short').value;

            const he = document.getElementById('proc-system').value, loai = document.getElementById('proc-category').value;

            const may = document.getElementById('proc-machine').value;

            const tgThucHien = document.getElementById('proc-person-time').value, tgThuThuat = document.getElementById('proc-machine-time').value;

            const kc = document.getElementById('proc-gap').value;

            const rut = document.getElementById('proc-unplug-cb').checked ? 'Có' : 'Không';

            const phu = document.getElementById('proc-assist-cb').checked ? 'Có' : 'Không';

            const dsPhu = (rut === 'Có' || phu === 'Có') ? 'Tất cả Điều dưỡng' : '';

            if (!ten) return alert("Nhập tên thủ thuật");

            const obj = { ten, vietTat: vt, he, phanLoai: loai, may, thoiGianThucHien: tgThucHien, thoiGianThuThuat: tgThuThuat, khoangCach: kc, canRutMay: rut, canNguoiPhu: phu, dsNguoiPhu: dsPhu };

            if (editIndex.proc > -1) { dataCache.proc[editIndex.proc] = obj; google.script.run.editThuThuat(editIndex.proc, ten, vt, he, loai, may, tgThucHien, tgThuThuat, kc, rut, phu, dsPhu); }

            else { dataCache.proc.push(obj); google.script.run.addThuThuat(ten, vt, he, loai, may, tgThucHien, tgThuThuat, kc, rut, phu, dsPhu); }

            cancelEdit('proc'); renderProceduresTable(); renderProcedureCheckboxes();

        }

        function editProc(index) {

            editIndex.proc = index;

            const item = dataCache.proc[index];

            ['proc-name', 'proc-short', 'proc-system', 'proc-category', 'proc-machine', 'proc-person-time', 'proc-machine-time', 'proc-gap'].forEach(id => {

                const keyMap = { 'proc-name': 'ten', 'proc-short': 'vietTat', 'proc-system': 'he', 'proc-category': 'phanLoai', 'proc-machine': 'may', 'proc-person-time': 'thoiGianThucHien', 'proc-machine-time': 'thoiGianThuThuat', 'proc-gap': 'khoangCach' };

                const el = document.getElementById(id);

                if (el) el.value = item[keyMap[id]] || '';

            });

            document.getElementById('proc-unplug-cb').checked = (item.canRutMay === 'Có');

            document.getElementById('proc-assist-cb').checked = (item.canNguoiPhu === 'Có');

            document.getElementById('btn-save-proc').innerText = "Lưu Sửa";

            document.getElementById('btn-cancel-proc').style.display = "inline-block";

        }

        function deleteProcedure(i) {

            showCustomConfirm("Xác nhận xóa thủ thuật", "Bác sĩ có chắc chắn muốn xóa thủ thuật này không?", function () {

                if (window.showGlobalLoading) window.showGlobalLoading("Đang xóa thủ thuật...");

                const btnSave = document.getElementById('btn-save-proc');

                if (btnSave) { btnSave.disabled = true; btnSave.innerText = "Đang xóa..."; }

                dataCache.proc.splice(i, 1); renderProceduresTable(); renderProcedureCheckboxes(); 

                google.script.run

                    .withSuccessHandler(() => { 

                        if (window.hideGlobalLoading) window.hideGlobalLoading();

                        if (btnSave) { btnSave.disabled = false; btnSave.innerText = "Thêm"; }

                        if (typeof loadProcedures === 'function') loadProcedures(); 

                    })

                    .withFailureHandler(e => {

                        if (window.hideGlobalLoading) window.hideGlobalLoading();

                        if (btnSave) { btnSave.disabled = false; btnSave.innerText = "Thêm"; }

                        alert('Lỗi: ' + e);

                    }).deleteThuThuat(i);

            });

        }



        // ============================================================

        // 👨‍⚕️ 3. NHÂN SỰ

        // ============================================================

        function renderStaffTable() {

            const filteredStaff = dataCache.staff.filter(s => {

                const role = String(s.vaiTro || '').toLowerCase();

                return role === 'bác sĩ' || role === 'kỹ thuật viên';

            });

            const statEl = document.getElementById('stat-staff');

            if (statEl) statEl.innerText = filteredStaff.length;



            const docGrid = document.getElementById('room-doctors-grid');

            const staffGrid = document.getElementById('room-staff-grid');

            if (docGrid && staffGrid) {

                let docHtml = '<div class="skills-col">', stfHtml = '<div class="skills-col">';

                dataCache.staff.forEach(s => {

                    const cb = `<label class="checkbox-item"><input type="checkbox" class="${s.vaiTro === 'Bác sĩ' ? 'room-doc-cb' : 'room-stf-cb'}" value="${s.ten}"> ${s.ten}</label>`;

                    if (s.vaiTro === 'Bác sĩ') docHtml += cb; else stfHtml += cb;

                });

                docGrid.innerHTML = docHtml + '</div>';

                staffGrid.innerHTML = stfHtml + '</div>';

            }



            const tbody = document.getElementById('staff-list');

            if (!tbody) return;

            if (!dataCache.staff.length) { tbody.innerHTML = renderEmptyRow(7, 'Chưa có dữ liệu nhân sự'); return; }

            tbody.innerHTML = dataCache.staff.map((item, i) => {

                const idx = dataCache.staff.indexOf(item);

                const kyNangHienThi = getShortSkills(item.kyNang);

                return `<tr class="editable-row" onclick="editStaff(${idx})" style="${item.trangThai !== 'Đi làm' ? 'opacity:0.5; background:#f9f9f9;' : ''}" title="Bấm sửa (Phím Delete để xóa)">

            <td>${i + 1}</td><td><strong>${item.ten}</strong></td><td>${item.vaiTro}</td>

            <td><span style="color:${item.trangThai === 'Đi làm' ? '#28a745' : '#dc3545'}; font-weight:600">${item.trangThai}</span></td>

            <td>${item.thoiGianLam}</td>

            <td style="font-size:11px; max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><strong>${kyNangHienThi}</strong></td>

            <td><button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteStaff(${idx})">Xóa</button></td>

        </tr>`;

            }).join('');

            if (typeof renderBusyStaff === 'function') renderBusyStaff();

        }

        function saveStaff() {

            const ten = document.getElementById('staff-name').value;

            const vaiTro = document.getElementById('staff-role').value;

            const trangThai = document.getElementById('staff-status').value;

            const tgLam = `${document.getElementById('staff-ms').value}-${document.getElementById('staff-me').value}, ${document.getElementById('staff-as').value}-${document.getElementById('staff-ae').value}`;

            const thayThe = document.getElementById('staff-replace').value;

            const gioBan = editIndex.staff > -1 ? (dataCache.staff[editIndex.staff]?.gioBan || '') : '';

            const kyNang = Array.from(document.querySelectorAll('.skill-checkbox:checked')).map(cb => cb.value).join(', ');

            if (!ten) return alert("Nhập tên!");

            const obj = { ten, vaiTro, trangThai, thoiGianLam: tgLam, kyNang, gioBan, nguoiThayThe: thayThe };

            if (editIndex.staff > -1) {
                const oldItem = dataCache.staff[editIndex.staff];
                const sheetIdx = oldItem.sheetIndex !== undefined ? oldItem.sheetIndex : editIndex.staff;
                obj.sheetIndex = sheetIdx;
                obj.index = editIndex.staff;
                dataCache.staff[editIndex.staff] = obj;
                google.script.run.editNhanSu(sheetIdx, ten, vaiTro, trangThai, tgLam, kyNang, gioBan, thayThe);
            } else {
                dataCache.staff.push(obj);
                google.script.run.addNhanSu(ten, vaiTro, trangThai, tgLam, kyNang, gioBan, thayThe);
            }

            cancelEdit('staff'); renderStaffTable();

        }

        function editStaff(index) {

            editIndex.staff = index;

            const item = dataCache.staff[index];

            document.getElementById('staff-name').value = item.ten;

            document.getElementById('staff-role').value = item.vaiTro;

            document.getElementById('staff-status').value = item.trangThai;

            document.getElementById('staff-busy').value = item.gioBan;

            document.getElementById('staff-replace').value = item.nguoiThayThe || 'Không';

            if (item.thoiGianLam) {

                const caArr = item.thoiGianLam.split(',');

                if (caArr[0]) { const sang = caArr[0].split('-'); if (sang[0]) document.getElementById('staff-ms').value = sang[0].trim(); if (sang[1]) document.getElementById('staff-me').value = sang[1].trim(); }

                if (caArr[1]) { const chieu = caArr[1].split('-'); if (chieu[0]) document.getElementById('staff-as').value = chieu[0].trim(); if (chieu[1]) document.getElementById('staff-ae').value = chieu[1].trim(); }

            }

            const skillsArr = item.kyNang.split(',').map(s => s.trim().toLowerCase());

            document.querySelectorAll('.skill-checkbox').forEach(cb => { cb.checked = skillsArr.includes(cb.value.toLowerCase()); });

            document.getElementById('btn-save-staff').innerText = "Lưu Sửa";

            document.getElementById('btn-cancel-staff').style.display = "inline-block";

        }

        function deleteStaff(i) {

            showCustomConfirm("Xác nhận xóa nhân sự", "Bác sĩ có chắc chắn muốn xóa nhân sự này không?", function () {

                if (window.showGlobalLoading) window.showGlobalLoading("Đang xóa nhân sự...");

                const btnSave = document.getElementById('btn-save-staff');

                if (btnSave) { btnSave.disabled = true; btnSave.innerText = "Đang xóa..."; }

                const deletedSheetIndex = s.sheetIndex !== undefined ? s.sheetIndex : i;
                dataCache.staff.splice(i, 1);
                dataCache.staff.forEach((item, idx) => {
                    item.index = idx;
                    if (item.sheetIndex !== undefined && item.sheetIndex > deletedSheetIndex) {
                        item.sheetIndex--;
                    }
                });
                renderStaffTable();

                google.script.run.withSuccessHandler(() => { 
                    if (window.hideGlobalLoading) window.hideGlobalLoading();
                    if (btnSave) { btnSave.disabled = false; btnSave.innerText = "Thêm"; }
                    if (typeof loadDashboard === 'function') loadDashboard(); 
                })
                    .withFailureHandler(e => {
                        if (window.hideGlobalLoading) window.hideGlobalLoading();
                        if (btnSave) { btnSave.disabled = false; btnSave.innerText = "Thêm"; }
                        alert('Lỗi khi xóa: ' + e);
                    }).deleteNhanSu(deletedSheetIndex);

            });

        }



        // ============================================================

        // 🏥 4. PHÒNG

        // ============================================================

        function renderRoomsTable() {

            const tbody = document.getElementById('rooms-list');

            if (!tbody) return;

            const roomSelect = document.getElementById('pat-room');

            if (roomSelect) roomSelect.innerHTML = dataCache.room.map(r => { const ten = String(r.tenPhong || r[1] || '').trim(); return `<option value="${ten}">${ten}</option>`; }).join('');

            if (!dataCache.room.length) { tbody.innerHTML = renderEmptyRow(6, 'Chưa có dữ liệu phòng'); return; }

            tbody.innerHTML = dataCache.room.map((item, i) => {

                const idx = dataCache.room.indexOf(item);

                return `<tr class="editable-row" onclick="editRoom(${idx})" title="Bấm sửa (Phím Delete để xóa)">

            <td>${i + 1}</td><td><strong>${item.tenPhong || item[1] || ''}</strong></td>

            <td>${item.bacSi || item[2] || ''}</td>

            <td style="font-size:11px">${item.ktv || item[3] || ''}</td>

            <td style="font-size:11px; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.danhSachMay || item[4] || ''}</td>

            <td><button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteRoom(${idx})">Xóa</button></td>

        </tr>`;

            }).join('');

        }

        function saveRoom() {

            const ten = document.getElementById('room-name').value;

            const slGiuong = parseInt(document.getElementById('room-beds').value) || 0;

            if (!ten) return alert("Nhập tên phòng");

            const bs = Array.from(document.querySelectorAll('.room-doc-cb:checked')).map(cb => cb.value).join(', ');

            const ktv = Array.from(document.querySelectorAll('.room-stf-cb:checked')).map(cb => cb.value).join(', ');

            const roomIdx = editIndex.room > -1 ? editIndex.room : dataCache.room.length;

            let usedBeds = 0;

            for (let i = 0; i < roomIdx; i++) usedBeds += parseInt(dataCache.room[i].soGiuong) || 0;

            const dsGiuong = Array.from({ length: slGiuong }, (_, i) => "G" + (usedBeds + i + 1)).join(', ');

            let finalMachineList = [];

            document.querySelectorAll('.room-machine-input').forEach(inp => {

                let reqQty = parseInt(inp.value) || 0;

                if (!reqQty) return;

                const typeName = inp.getAttribute('data-type').toLowerCase().trim();

                const machinesOfType = (dataCache.machine || []).filter(m => String(m.tenLoai).toLowerCase().trim() === typeName).map(m => String(m.maMay).trim());

                let usedCount = 0;

                for (let i = 0; i < roomIdx; i++) {

                    (dataCache.room[i].danhSachMay || '').split(',').map(x => x.trim()).forEach(code => {

                        const found = (dataCache.machine || []).find(m => String(m.maMay).trim() === code);

                        if (found && String(found.tenLoai).toLowerCase().trim() === typeName) usedCount++;

                    });

                }

                const assigned = machinesOfType.slice(usedCount, usedCount + reqQty);

                if (assigned.length < reqQty) alert(`⚠️ Kho thiếu máy [${typeName.toUpperCase()}]! Còn ${machinesOfType.length - usedCount} máy rảnh.`);

                finalMachineList = finalMachineList.concat(assigned);

            });

            const dsMay = finalMachineList.join(', ');

            if (editIndex.room > -1) {

                const oldName = dataCache.room[editIndex.room].tenPhong;

                dataCache.room[editIndex.room] = { tenPhong: ten, bacSi: bs, ktv, danhSachMay: dsMay, soGiuong: slGiuong, danhSachGiuong: dsGiuong };

                if (oldName !== ten && dataCache.pat) {

                    dataCache.pat.forEach(p => { if (String(p.phong).trim() === String(oldName).trim()) p.phong = ten; });

                    if (typeof renderPatientsTable === 'function') renderPatientsTable();

                }

                google.script.run.editPhong(editIndex.room, ten, bs, ktv, dsMay, slGiuong, dsGiuong);

            } else {

                dataCache.room.push({ tenPhong: ten, bacSi: bs, ktv, danhSachMay: dsMay, soGiuong: slGiuong, danhSachGiuong: dsGiuong });

                google.script.run.addPhong(ten, bs, ktv, dsMay, slGiuong, dsGiuong);

            }

            cancelEdit('room'); renderRoomsTable();

        }

        function editRoom(index) {

            editIndex.room = index;

            const item = dataCache.room[index];

            document.getElementById('room-name').value = item.tenPhong;

            document.getElementById('room-beds').value = item.soGiuong || 0;

            document.querySelectorAll('.room-doc-cb, .room-stf-cb').forEach(cb => cb.checked = false);

            if (item.bacSi) item.bacSi.split(',').forEach(b => { const cb = document.querySelector(`.room-doc-cb[value="${b.trim()}"]`); if (cb) cb.checked = true; });

            if (item.ktv) item.ktv.split(',').forEach(k => { const cb = document.querySelector(`.room-stf-cb[value="${k.trim()}"]`); if (cb) cb.checked = true; });

            document.querySelectorAll('.room-machine-input').forEach(inp => inp.value = '');

            if (item.danhSachMay && dataCache.machine) {

                item.danhSachMay.split(',').map(x => x.trim()).filter(x => x).forEach(code => {

                    const m = dataCache.machine.find(x => String(x.maMay).trim() === code);

                    if (m) { const inp = document.querySelector(`.room-machine-input[data-type="${String(m.tenLoai).toLowerCase().trim()}"]`); if (inp) inp.value = (parseInt(inp.value) || 0) + 1; }

                });

            }

            document.getElementById('btn-save-room').innerText = "Lưu Sửa";

            document.getElementById('btn-cancel-room').style.display = "inline-block";

        }

        function deleteRoom(i) {

            showCustomConfirm("Xác nhận xóa phòng", "Bác sĩ có chắc chắn muốn xóa phòng này không?", function () {

                if (window.showGlobalLoading) window.showGlobalLoading("Đang xóa phòng...");

                const btnSave = document.getElementById('btn-save-room');

                if (btnSave) { btnSave.disabled = true; btnSave.innerText = "Đang xóa..."; }

                dataCache.room.splice(i, 1); renderRoomsTable(); 

                google.script.run

                    .withSuccessHandler(() => { 

                        if (window.hideGlobalLoading) window.hideGlobalLoading();

                        if (btnSave) { btnSave.disabled = false; btnSave.innerText = "Thêm"; }

                        if (typeof loadRooms === 'function') loadRooms(); 

                    })

                    .withFailureHandler(e => {

                        if (window.hideGlobalLoading) window.hideGlobalLoading();

                        if (btnSave) { btnSave.disabled = false; btnSave.innerText = "Thêm"; }

                        alert('Lỗi: ' + e);

                    }).deletePhong(i);

            });

        }



        // ============================================================

        // 🛌 5. BỆNH NHÂN

        // ============================================================

        function renderPatientsTable() {

            const uniqueNames = [...new Set(dataCache.pat.map(p => p.ten))].filter(Boolean);

            const optionsHtml = uniqueNames.map(name => `<option value="${name}">`).join('');

            ['pat-name-suggestions', 'busy-pat-datalist', 'leave-pat-datalist'].forEach(id => {

                const dl = document.getElementById(id); if (dl) dl.innerHTML = optionsHtml;

            });

            const statPat = document.getElementById('stat-patients');

            if (statPat) statPat.innerText = dataCache.pat.length;



            const tbody = document.getElementById('patients-list');

            if (!tbody) return;

            if (!dataCache.pat.length) { tbody.innerHTML = renderEmptyRow(9, 'Chưa có dữ liệu bệnh nhân'); }

            else {

                const schedData = window.currentScheduleData || [];

                const unschedData = window.lastUnscheduledData || [];

                tbody.innerHTML = dataCache.pat.map((item, i) => {

                    const idx = dataCache.pat.indexOf(item);

                    const patName = String(item.ten || '').toUpperCase().trim();

                    const patNS = String(item.namSinh || '').trim();

                    const reqCount = item.thuThuat ? item.thuThuat.split(',').filter(x => x.trim()).length : 0;

                    const schedItems = schedData.filter(r => String(r.tenBN || '').toUpperCase().trim() === patName && String(r.namSinh || '').trim() === patNS);

                    const droppedItems = unschedData.filter(d => String(d.bn || d.tenBN || '').toUpperCase().trim() === patName && String(d.ns || d.namSinh || '').trim() === patNS);

                    const schCount = schedItems.length, dropCount = droppedItems.length;

                    let nhanTrangThai = '';

                    if (reqCount > 0) {

                        if (!schCount && !dropCount) nhanTrangThai = `<span style="background:#f39c12;color:white;padding:2px 6px;border-radius:10px;font-size:10px;margin-left:5px;">Chưa xếp</span>`;

                        else if (!schCount && dropCount) nhanTrangThai = `<span style="background:#e74c3c;color:white;padding:2px 6px;border-radius:10px;font-size:10px;margin-left:5px;">Rớt toàn bộ</span>`;

                        else if (schCount && dropCount) {

                            const uniqueMissing = [...new Set(droppedItems.map(d => String(d.tt || d.thuThuat || '').trim()).filter(Boolean))].map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ');

                            const displayText = getShortSkills(uniqueMissing);

                            nhanTrangThai = `<span style="background:#3498db;color:white;padding:2px 6px;border-radius:10px;font-size:10px;margin-left:5px;">Thiếu: ${displayText}</span>`;

                        } else if (schCount && !dropCount) nhanTrangThai = `<span style="background:#2ecc71;color:white;padding:2px 6px;border-radius:10px;font-size:10px;margin-left:5px;">Đã đủ</span>`;

                        else if (schCount < reqCount) nhanTrangThai = `<span style="background:#3498db;color:white;padding:2px 6px;border-radius:10px;font-size:10px;margin-left:5px;">Thiếu ${reqCount - schCount} ca</span>`;

                    }

                    return `<tr class="editable-row" onclick="editPatient(${idx})" style="${item.gioRa ? 'background:#f8d7da;opacity:0.8;' : ''}" title="Bấm sửa (Phím Delete để xóa)">

                <td>${i + 1}</td>

                <td><strong>${item.ten}</strong> ${nhanTrangThai}</td>

                <td>${item.namSinh || ''}</td><td>${item.ngayVao || ''}</td><td>${item.gioVao || ''}</td>

                <td><strong style="color:#c0392b">${item.gioRa || ''}</strong></td>

                <td>${item.phong || ''}</td>

                <td style="font-size:11px;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${item.thuThuat}"><strong>${getShortSkills(item.thuThuat)}</strong></td>

                <td><button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deletePatient(${idx})">Xóa</button></td>

            </tr>`;

                }).join('');

            }

            if (typeof renderBusyPat === 'function') renderBusyPat();

            if (typeof renderLeavePat === 'function') renderLeavePat();

            if (typeof filterPatientTable === 'function') filterPatientTable();

        }

        function updateBusyTime() {

            const start = document.getElementById('busy-start').value;

            const end = document.getElementById('busy-end').value;

            document.getElementById('pat-busy').value = (start && end) ? `${start}-${end}` : '';

        }

        function savePatient() {

            // 🛡️ Chống gọ́i kép: Bỏ qua néu đã đang xủ lý
            if (window._savePatientLock) { console.warn("savePatient: blocked double call"); return; }
            window._savePatientLock = true;

            let ten = document.getElementById('pat-name').value;
            const nam = document.getElementById('pat-year').value;
            const ngay = document.getElementById('pat-date').value;
            const gio = document.getElementById('pat-time').value;
            const phong = document.getElementById('pat-room').value;
            const ban = document.getElementById('pat-busy').value;
            const ra = document.getElementById('pat-leave').value;
            const tt = Array.from(document.querySelectorAll('.pat-proc-cb:checked')).map(cb => cb.value).join(', ');

            if (!ten) { window._savePatientLock = false; return alert("Nhập tên bệnh nhân"); }

            ten = ten.trim().toLowerCase().replace(/(?:^|\s)\S/g, a => a.toUpperCase());

            // Khóa form trong lúc chờ server
            const btnSave = document.getElementById('btn-save-pat');
            if (btnSave) { btnSave.disabled = true; btnSave.innerText = 'Đang lưu...'; }

            const onDone = () => {
                window._savePatientLock = false;
                if (btnSave) { btnSave.disabled = false; btnSave.innerText = 'Lưu'; }
                // Reload sạch từ server đẻ tránh dũ liẹu bị nhân đôi
                if (window.dataCacheTime) window.dataCacheTime['pat'] = 0;
                loadEntity('getBenhNhan', 'pat', renderPatientsTable, [], true);
                if (typeof loadDashboard === 'function') loadDashboard();
            };
            const onError = (e) => {
                window._savePatientLock = false;
                if (btnSave) { btnSave.disabled = false; btnSave.innerText = 'Lưu'; }
                alert('Lỗi khi lưu: ' + e);
            };

            // Chụp index TRƯỚC khi cancelEdit reset về -1
            const currentEditIdx = editIndex.pat;
            const currentItem = currentEditIdx > -1 ? dataCache.pat[currentEditIdx] : null;

            cancelEdit('pat');
            document.getElementById('pat-name').focus();

            if (currentEditIdx > -1 && currentItem) {
                const sheetIdx = currentItem.sheetIndex !== undefined ? currentItem.sheetIndex : currentEditIdx;
                google.script.run
                    .withSuccessHandler(onDone)
                    .withFailureHandler(onError)
                    .editBenhNhan(sheetIdx, ten, nam, ngay, gio, ban, ra, phong, tt);
            } else {
                google.script.run
                    .withSuccessHandler(onDone)
                    .withFailureHandler(onError)
                    .addBenhNhan(ten, nam, ngay, gio, ban, ra, phong, tt);
            }

        }

        function editPatient(index) {

            editIndex.pat = index;

            const item = dataCache.pat[index];

            document.getElementById('pat-name').value = item.ten;

            document.getElementById('pat-year').value = item.namSinh;

            document.getElementById('pat-date').value = item.ngayVao;

            document.getElementById('pat-time').value = item.gioVao;

            document.getElementById('pat-room').value = item.phong;

            document.getElementById('pat-leave').value = item.gioRa;

            const busyVal = item.gioBan || '';

            document.getElementById('pat-busy').value = busyVal;

            if (busyVal.includes('-')) {

                document.getElementById('busy-start').value = busyVal.split('-')[0].trim();

                document.getElementById('busy-end').value = busyVal.split('-')[1].trim();

            } else {

                document.getElementById('busy-start').value = '';

                document.getElementById('busy-end').value = '';

            }

            const ttArr = item.thuThuat ? item.thuThuat.split(',').map(t => t.trim().toLowerCase()) : [];

            document.querySelectorAll('.pat-proc-cb').forEach(cb => { cb.checked = ttArr.includes(cb.value.toLowerCase()); });

            document.getElementById('btn-save-pat').innerText = "Lưu Sửa";

            document.getElementById('btn-cancel-pat').style.display = "inline-block";

        }

        // ============================================================

        // ♻️ HỆ THỐNG XÓA BỆNH NHÂN (TRỰC TIẾP, AN TOÀN)

        // ============================================================

        function deletePatient(i) {

            const p = dataCache.pat[i];

            showCustomConfirm("Xác nhận xóa", `Bác sĩ có chắc chắn muốn xóa bệnh nhân [ ${p.ten} ]?`, function () {

                if (window.showGlobalLoading) window.showGlobalLoading("Đang xóa bệnh nhân...");

                

                // Xóa tạm trên giao diện
                const deletedSheetIndex = p.sheetIndex !== undefined ? p.sheetIndex : i;
                dataCache.pat.splice(i, 1);
                dataCache.pat.forEach((item, idx) => {
                    item.index = idx;
                    if (item.sheetIndex !== undefined && item.sheetIndex > deletedSheetIndex) {
                        item.sheetIndex--;
                    }
                });
                renderPatientsTable();

                // Khóa nút lưu để chống thao tác đè trong lúc chờ mạng
                const btnSave = document.getElementById('btn-save-pat');
                if (btnSave) { btnSave.disabled = true; btnSave.innerText = "Đang đồng bộ..."; }

                // Gọi máy chủ xóa ngay lập tức
                google.script.run
                    .withSuccessHandler(() => { 
                        if (window.hideGlobalLoading) window.hideGlobalLoading();
                        if (btnSave) { btnSave.disabled = false; btnSave.innerText = "Thêm"; }
                        if (typeof loadDashboard === 'function') loadDashboard(); 
                    })
                    .withFailureHandler(e => {
                        if (window.hideGlobalLoading) window.hideGlobalLoading();
                        if (btnSave) { btnSave.disabled = false; btnSave.innerText = "Thêm"; }
                        alert('Lỗi khi xóa vĩnh viễn: ' + e);
                    })
                    .deleteBenhNhan(deletedSheetIndex);

            });

        }



        // Tự động điền năm sinh khi gõ tên bệnh nhân

        document.getElementById('pat-name').addEventListener('input', function () {

            const val = this.value.trim().toLowerCase();

            if (!val) return;

            const found = dataCache.pat.find(p => p.ten.toLowerCase() === val);

            if (found && !document.getElementById('pat-year').value) document.getElementById('pat-year').value = found.namSinh;

        });



        // Tìm kiếm bảng bệnh nhân (debounce chống Unikey)

        let patSearchTimeout;

        function filterPatientTable() {

            clearTimeout(patSearchTimeout);

            patSearchTimeout = setTimeout(function () {

                const filter = document.getElementById("pat-search-input")?.value.toLowerCase() || '';

                const table = document.getElementById("patients-table");

                if (!table) return;

                let sttCounter = 1;

                Array.from(table.getElementsByTagName("tr")).slice(1).forEach(tr => {

                    const tds = tr.getElementsByTagName("td");

                    let show = Array.from(tds).slice(1, tds.length - 1).some(td => (td.textContent || td.innerText).toLowerCase().includes(filter));

                    tr.style.display = show ? "" : "none";

                    if (show && tds[0]) tds[0].innerText = sttCounter++;

                });

            }, 300);

        }



        // ============================================================

        // ⏱ TAB GIỜ BẬN BỆNH NHÂN

        // ============================================================

        function renderBusyPat() {

            const tbody = document.getElementById('busy-pat-tbody');

            if (!tbody) return;

            let html = '';

            dataCache.pat.forEach(p => {

                if (!p.gioBan) return;

                p.gioBan.split(',').map(s => s.trim()).filter(s => s).forEach(slot => {

                    html += `<tr class="editable-row" onclick="editBusyPat('${p.ten}', '${slot}')">

                <td><strong>${p.ten}</strong></td>

                <td style="color:#d35400; font-weight:bold;">${slot}</td>

            </tr>`;

                });

            });

            tbody.innerHTML = html || `<tr><td colspan="2" align="center" style="color:gray; padding:10px;">Chưa có bệnh nhân báo bận</td></tr>`;

        }

        function editBusyPat(ten, singleSlot) {

            const inputName = document.getElementById('busy-pat-input');

            if (!inputName) return;

            inputName.value = ten;

            lastBusyContext = 'pat';

            if (singleSlot) {

                window.editingPatName = ten;

                window.editingPatSlot = singleSlot;

                const parts = singleSlot.split('-');

                document.getElementById('busy-pat-from').value = parts[0]?.trim() || '';

                document.getElementById('busy-pat-to').value = parts[1]?.trim() || '';

            } else {

                window.editingPatName = '';

                window.editingPatSlot = '';

                document.getElementById('busy-pat-from').value = '';

                document.getElementById('busy-pat-to').value = '';

            }

        }

        const savePatBusy = withLock(function () {

            const idx = getBusyPatIdx();

            if (idx === -1) return alert('Vui lòng chọn đích danh bệnh nhân từ danh sách xổ xuống!');

            const fromObj = document.getElementById('busy-pat-from');

            const toObj = document.getElementById('busy-pat-to');

            const from = fromObj.value, to = toObj.value;

            if (!from || !to) return alert('Nhập thời gian!');

            const p = dataCache.pat[idx];

            const newSlot = `${from}-${to}`;

            if (window.editingPatSlot && window.editingPatName === p.ten) {

                let slotsArr = p.gioBan ? p.gioBan.split(',').map(x => x.trim()) : [];

                p.gioBan = slotsArr.filter(x => x && x !== window.editingPatSlot).join(', ');

                window.editingPatSlot = '';

                window.editingPatName = '';

            }

            p.gioBan = sortTimeSlots(p.gioBan ? p.gioBan + ', ' + newSlot : newSlot);

            renderPatientsTable();

            fromObj.value = ''; toObj.value = ''; fromObj.focus();

            google.script.run.editBenhNhan(parseInt(idx), p.ten, p.namSinh, p.ngayVao, p.gioVao, p.gioBan, p.gioRa, p.phong, p.thuThuat);

        });

        function deleteSinglePatBusy() {

            const idx = getBusyPatIdx();

            if (idx === -1) return alert('Vui lòng chọn đích danh bệnh nhân!');

            const from = document.getElementById('busy-pat-from').value;

            const to = document.getElementById('busy-pat-to').value;

            if (!from || !to) return alert('Vui lòng click vào khoảng giờ trên bảng để xóa!');

            const p = dataCache.pat[idx];

            if (!p.gioBan) return;

            const slotToDelete = `${from}-${to}`;

            showCustomConfirm("Xóa giờ bận", `Bác sĩ có muốn xóa giờ bận [ ${slotToDelete} ] của BN: ${p.ten}?`, function () {

                p.gioBan = p.gioBan.split(',').map(x => x.trim()).filter(x => x && x !== slotToDelete).join(', ');

                renderPatientsTable();

                document.getElementById('busy-pat-from').value = '';

                document.getElementById('busy-pat-to').value = '';

                google.script.run.editBenhNhan(parseInt(idx), p.ten, p.namSinh, p.ngayVao, p.gioVao, p.gioBan, p.gioRa, p.phong, p.thuThuat);

            });

        }

        function clearPatBusy() {

            const idx = getBusyPatIdx();

            if (idx === -1) return alert('Vui lòng chọn đích danh bệnh nhân!');

            const p = dataCache.pat[idx];

            if (!confirm(`Xóa toàn bộ giờ bận của BN: ${p.ten}?`)) return;

            p.gioBan = ''; renderPatientsTable();

            google.script.run.editBenhNhan(parseInt(idx), p.ten, p.namSinh, p.ngayVao, p.gioVao, '', p.gioRa, p.phong, p.thuThuat);

        }



        // ============================================================

        // 🚪 TAB RA VIỆN

        // ============================================================

        function renderLeavePat() {

            const tbody = document.getElementById('leave-pat-tbody');

            if (!tbody) return;

            let html = '', stt = 1;

            dataCache.pat.forEach(p => {

                if (!p.gioRa) return;

                html += `<tr class="editable-row" onclick="editLeavePat('${p.ten}', '${p.gioRa}')">

            <td>${stt++}</td><td><strong>${p.ten}</strong></td>

            <td style="color:#8e44ad; font-weight:bold;">${p.gioRa}</td>

        </tr>`;

            });

            tbody.innerHTML = html || `<tr><td colspan="3" align="center" style="color:gray; padding:10px;">Chưa có bệnh nhân ra viện</td></tr>`;

        }

        function editLeavePat(ten, gioRa) {

            const inputName = document.getElementById('leave-pat-input');

            if (!inputName) return;

            inputName.value = ten;

            lastBusyContext = 'leave';

            document.getElementById('leave-pat-time').value = gioRa || '';

        }

        const savePatLeave = withLock(function () {

            const idx = getLeavePatIdx();

            if (idx === -1) return alert('Vui lòng chọn đích danh bệnh nhân!');

            const leaveObj = document.getElementById('leave-pat-time');

            const leaveTime = leaveObj.value;

            if (!leaveTime) return alert('Nhập giờ ra viện!');

            const p = dataCache.pat[idx];

            p.gioRa = leaveTime;

            renderPatientsTable();

            leaveObj.value = ''; leaveObj.focus();

            google.script.run.editBenhNhan(parseInt(idx), p.ten, p.namSinh, p.ngayVao, p.gioVao, p.gioBan, leaveTime, p.phong, p.thuThuat);

        });

        function clearPatLeave() {

            const idx = getLeavePatIdx();

            if (idx === -1) return alert('Vui lòng chọn đích danh bệnh nhân!');

            const p = dataCache.pat[idx];

            if (!confirm(`Hủy giờ ra viện của BN: ${p.ten}?`)) return;

            p.gioRa = ''; renderPatientsTable(); document.getElementById('leave-pat-time').value = '';

            google.script.run.editBenhNhan(parseInt(idx), p.ten, p.namSinh, p.ngayVao, p.gioVao, p.gioBan, '', p.phong, p.thuThuat);

        }



        // ============================================================

        // 👷 TAB GIỜ BẬN NHÂN VIÊN

        // ============================================================

        function renderBusyStaff() {

            const select = document.getElementById('busy-staff-select');

            const thead = document.getElementById('busy-staff-thead');

            const tbody = document.getElementById('busy-staff-tbody');

            if (!select || !thead || !tbody) return;

            select.innerHTML = dataCache.staff.map((s, i) => `<option value="${i}">${String(s.ten).toUpperCase()}</option>`).join('');

            const busyIndices = dataCache.staff.map((s, i) => (s.gioBan?.trim()) ? i : -1).filter(i => i > -1);

            if (!busyIndices.length) {

                thead.innerHTML = '';

                tbody.innerHTML = '<tr><td align="center" style="color:gray; padding:20px; font-style:italic;">✅ Hiện tại chưa có nhân viên nào báo bận</td></tr>';

                return;

            }

            thead.innerHTML = '<tr>' + busyIndices.map(idx => `<th style="text-align:center; font-size:11px; text-transform:uppercase; padding:8px;">${dataCache.staff[idx].ten}</th>`).join('') + '</tr>';

            const slotArrays = busyIndices.map(idx => dataCache.staff[idx].gioBan.split(',').map(x => x.trim()).filter(x => x));

            const maxSlots = Math.max(...slotArrays.map(a => a.length), 0);

            let tbHtml = '';

            for (let i = 0; i < maxSlots; i++) {

                tbHtml += '<tr>';

                busyIndices.forEach((origIdx, arrIdx) => {

                    const slot = slotArrays[arrIdx][i];

                    tbHtml += slot

                        ? `<td align="center" style="font-size:11px; color:#c0392b; font-weight:bold;" class="editable-row" onclick="editBusyStaff(${origIdx}, '${slot}')" title="Bấm sửa (Delete để xóa)">${slot}</td>`

                        : `<td align="center" style="color:#bdc3c7;">-</td>`;

                });

                tbHtml += '</tr>';

            }

            tbody.innerHTML = tbHtml;

        }

        function editBusyStaff(staffIdx, slotStr) {

            lastBusyContext = 'staff';

            const select = document.getElementById('busy-staff-select');

            if (select) select.value = staffIdx;

            window.editingStaffIdx = staffIdx;

            window.editingStaffSlot = (slotStr && slotStr !== '-') ? slotStr : '';

            if (slotStr && slotStr !== '-') {

                const parts = slotStr.split('-');

                document.getElementById('busy-staff-from').value = parts[0]?.trim() || '';

                document.getElementById('busy-staff-to').value = parts[1]?.trim() || '';

            } else {

                document.getElementById('busy-staff-from').value = '';

                document.getElementById('busy-staff-to').value = '';

            }

        }

        function saveStaffBusy() {

            const select = document.getElementById('busy-staff-select');

            if (!select) return;

            const idx = select.value;

            const fromObj = document.getElementById('busy-staff-from');

            const toObj = document.getElementById('busy-staff-to');

            const from = fromObj.value, to = toObj.value;

            if (!from || !to) return alert('Vui lòng chọn Từ giờ - Đến giờ!');

            const s = dataCache.staff[idx];

            const newSlot = `${from}-${to}`;

            if (window.editingStaffSlot && String(window.editingStaffIdx) === String(idx)) {

                s.gioBan = (s.gioBan ? s.gioBan.split(',').map(x => x.trim()).filter(x => x && x !== window.editingStaffSlot) : []).join(', ');

                window.editingStaffSlot = ''; window.editingStaffIdx = '';

            }

            s.gioBan = sortTimeSlots(s.gioBan ? s.gioBan + ', ' + newSlot : newSlot);

            renderStaffTable();

            select.value = idx; fromObj.value = ''; toObj.value = ''; fromObj.focus();

            google.script.run.editNhanSu(parseInt(idx), s.ten, s.vaiTro, s.trangThai, s.thoiGianLam, s.kyNang, s.gioBan, s.nguoiThayThe);

        }

        function deleteSingleStaffBusy() {

            const select = document.getElementById('busy-staff-select');

            if (!select) return;

            const idx = select.value;

            const from = document.getElementById('busy-staff-from').value;

            const to = document.getElementById('busy-staff-to').value;

            if (!from || !to) return alert('Vui lòng click vào một khoảng giờ trên bảng để xóa!');

            const s = dataCache.staff[idx];

            if (!s.gioBan) return;

            const slotToDelete = `${from}-${to}`;

            showCustomConfirm("Xóa giờ bận", `Bác sĩ có muốn xóa giờ bận [ ${slotToDelete} ] của NV: ${s.ten}?`, function () {

                s.gioBan = s.gioBan.split(',').map(x => x.trim()).filter(x => x && x !== slotToDelete).join(', ');

                renderStaffTable();

                document.getElementById('busy-staff-from').value = '';

                document.getElementById('busy-staff-to').value = '';

                google.script.run.editNhanSu(parseInt(idx), s.ten, s.vaiTro, s.trangThai, s.thoiGianLam, s.kyNang, s.gioBan, s.nguoiThayThe);

            });

        }

        function clearStaffBusy() {

            const select = document.getElementById('busy-staff-select');

            if (!select) return;

            const idx = select.value, s = dataCache.staff[idx];

            if (!confirm(`Xóa toàn bộ giờ bận của NV: ${s.ten}?`)) return;

            s.gioBan = ''; renderStaffTable();

            google.script.run.editNhanSu(parseInt(idx), s.ten, s.vaiTro, s.trangThai, s.thoiGianLam, s.kyNang, '', s.nguoiThayThe);

        }



        // ============================================================

        // 📅 TAB XẾP LỊCH

        // ============================================================

        function loadScheduleList() {

            if (window.viewingImportedScheduleFile) return;

            google.script.run.withSuccessHandler(data => {

                const rows = (data || []).map(normalizeScheduleRow);

                window.currentScheduleData = rows.filter(row => !isDroppedScheduleRow(row));

                const droppedFromSheet = rows.filter(isDroppedScheduleRow).map(row => normalizeDroppedItem([

                    row.ngay, row.tenBN, row.namSinh, row.phong, row.thuThuat, row.gioDienRa,

                    row.gioKetThuc, row.nvChinh, row.nvPhu

                ]));

                if (droppedFromSheet.length) {

                    let localDropped = [];

                    try {

                        const activeDate = document.getElementById('schedule-date')?.value || localStorage.getItem('meds_schedule_date') || '';

                        if (localStorage.getItem('meds_schedule_date') === activeDate) localDropped = JSON.parse(localStorage.getItem('meds_unscheduled') || '[]');

                    } catch (e) { }

                    setUnscheduledData([...droppedFromSheet, ...localDropped]);

                }

                filterSchedule();

                if (typeof renderStats === 'function') renderStats(window.lastUnscheduledData);

                if (typeof renderPatientsTable === 'function') renderPatientsTable();

            }).getSchedule();

        }

        // --- QUẢN LÝ PHÂN TRANG RIÊNG BIỆT ---

        const PAGE_SIZE = 500; // Số ca hiển thị mỗi trang (Để số cực lớn để tắt phân trang)



        // Bộ nhớ cho Tab Xếp Lịch

        let schedCurrentPage = 1;

        let schedFilteredData = [];



        // Bộ nhớ cho Tab Trang Chủ

        let homeCurrentPage = 1;

        let homeFilteredData = [];



        // 1. Hàm lọc dữ liệu (Đã thêm khiên chống sập JS)

        function filterSchedule() {

            const q = document.getElementById('schedule-search-input')?.value.toLowerCase() || '';



            // 🛡️ LỚP KHIÊN 2: Nếu dữ liệu chưa kịp tải về, tự động ép nó thành mảng rỗng [] để không bị sập hàm .filter()

            const safeData = window.currentScheduleData || [];

            const droppedData = (window.lastUnscheduledData || []).map(item => {

                const dropped = normalizeDroppedItem(item);

                return {

                    ...dropped,

                    __dropped: true,

                    tenBN: dropped.bn || '',

                    namSinh: dropped.ns || '',

                    phong: dropped.room || dropped.phong || '',

                    thuThuat: dropped.tt || '',

                    gioDienRa: '❌ Rớt',

                    gioKetThuc: '--',

                    nvChinh: dropped.staff || '',

                    nvPhu: '',

                    may: dropped.reason || '',

                    giuong: ''

                };

            });

            const displayData = [...safeData.map(row => ({ ...row, __dropped: false })), ...droppedData];



            schedFilteredData = displayData.filter(row => {

                if (!row) return false;

                // Bắt lỗi an toàn khi trích xuất giá trị

                try {

                    const str = Object.values(row).join(' ').toLowerCase();

                    return str.includes(q);

                } catch (e) {

                    return false;

                }

            });

            filteredSchedData = schedFilteredData;



            schedCurrentPage = 1;

            renderSchedPage();

        }



        // 2. Hàm vẽ bảng (Chỉ vẽ phần dữ liệu của trang hiện tại) - BẢN CHUẨN 12 CỘT

        function renderSchedPage() {

            const tbody = document.getElementById('schedule-list');

            if (!tbody || !window.currentScheduleData) return;



            const compareScheduleRows = (a, b) => {

                if (!!a.__dropped !== !!b.__dropped) return a.__dropped ? 1 : -1;

                const activeSort = window.scheduleSortState;

                if (activeSort) {

                    const fields = ['__stt', 'ngay', 'tenBN', 'namSinh', 'phong', 'thuThuat', 'gioDienRa', 'gioKetThuc', 'nvChinh', 'nvPhu', 'may', 'giuong'];

                    const field = fields[activeSort.index];

                    let valA = field === '__stt' ? schedFilteredData.indexOf(a) + 1 : String(a[field] || '').trim();

                    let valB = field === '__stt' ? schedFilteredData.indexOf(b) + 1 : String(b[field] || '').trim();

                    const numA = parseFloat(String(valA).replace(/,/g, ''));

                    const numB = parseFloat(String(valB).replace(/,/g, ''));

                    const dir = activeSort.dir === 'asc' ? 1 : -1;

                    let primaryDiff = 0;

                    if (!isNaN(numA) && !isNaN(numB) && !String(valA).match(/[a-zA-ZÀ-ỹ]/) && !String(valB).match(/[a-zA-ZÀ-ỹ]/)) {

                        primaryDiff = (numA - numB) * dir;

                    } else if (/^\d{2}\/\d{2}$/.test(valA) && /^\d{2}\/\d{2}$/.test(valB)) {

                        let vA = valA.split('/').reverse().join('');

                        let vB = valB.split('/').reverse().join('');

                        primaryDiff = vA.localeCompare(vB, 'vi', { numeric: true }) * dir;

                    } else if (/^\d{2}:\d{2}$/.test(valA) && /^\d{2}:\d{2}$/.test(valB)) {

                        let vA = valA.replace(':', '');

                        let vB = valB.replace(':', '');

                        primaryDiff = vA.localeCompare(vB, 'vi', { numeric: true }) * dir;

                    } else {

                        primaryDiff = valA.localeCompare(valB, 'vi', { numeric: true }) * dir;

                    }



                    if (primaryDiff !== 0) return primaryDiff;



                    if (field !== 'gioDienRa') {

                        let timeA = String(a.gioDienRa || '').replace(':', '');

                        let timeB = String(b.gioDienRa || '').replace(':', '');

                        return timeA.localeCompare(timeB, 'vi', { numeric: true });

                    }

                    return 0;

                }



                // 💡 Sắp xếp mặc định: Tên NV chính (A-Z) -> Thời gian bắt đầu (Sớm - Muộn)

                // Ưu tiên 1: Tên Nhân viên chính

                let nvA = String(a.nvChinh || '').trim().toLowerCase();

                let nvB = String(b.nvChinh || '').trim().toLowerCase();

                if (nvA !== nvB) return nvA.localeCompare(nvB, 'vi');



                // Ưu tiên 2: Thời gian bắt đầu

                let timeA = String(a.gioDienRa || '').replace(':', '');

                let timeB = String(b.gioDienRa || '').replace(':', '');

                return timeA.localeCompare(timeB);

            };

            schedFilteredData.sort(compareScheduleRows);



            const totalPages = Math.ceil(schedFilteredData.length / PAGE_SIZE) || 1;

            const start = (schedCurrentPage - 1) * PAGE_SIZE;

            const pageData = schedFilteredData.slice(start, start + PAGE_SIZE);



            tbody.innerHTML = pageData.map((item, i) => {

                const ngayShort = item.ngay ? String(item.ngay).split('-').reverse().join('/').substring(0, 5) : '';

                const rowClass = item.__dropped ? 'row-dropped' : 'row-scheduled';

                const reasonTitle = item.__dropped ? ` title="${item.reason || item.may || 'Không xếp được'}"` : '';

                return `<tr class="${rowClass}"${reasonTitle}>

            <td style="text-align:center">${start + i + 1}</td>

            <td style="text-align:center">${ngayShort}</td>

            <td style="font-weight:bold;">${item.tenBN || ''}</td>

            <td style="text-align:center;">${item.namSinh || ''}</td>

            <td style="text-align:center;">${item.phong || ''}</td>

            <td>${item.thuThuat || ''}</td>

            <td style="font-weight:bold; text-align:center;">${item.gioDienRa || ''}</td>

            <td style="font-weight:bold; text-align:center;">${item.gioKetThuc || ''}</td>

            <td>${item.nvChinh || ''}</td>

            <td>${item.nvPhu || ''}</td>

            <td>${item.may || ''}</td>

            <td style="text-align:center;">${item.giuong || ''}</td>

        </tr>`;

            }).join('');



            // Vẽ thanh điều hướng riêng cho Xếp lịch

            renderPaginationUI('sched-pagination-container', schedFilteredData.length, schedCurrentPage, totalPages, 'SCHED');

        }



        // 3. Hàm tạo Thanh điều hướng (ĐÃ TÍCH HỢP NÚT XUẤT PDF)

        function renderPaginationUI(containerId, totalItems, currentPage, totalPages, context) {

            let container = document.getElementById(containerId);

            if (!container) return;



            // Ẩn hoàn toàn khi chỉ có 1 trang

            if (totalPages <= 1) {

                container.style.display = 'none';

                return;

            }

            container.style.display = '';



            const startItem = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;

            const endItem = Math.min(currentPage * PAGE_SIZE, totalItems);



            // 📌 Bơm trực tiếp thuốc "Đóng đinh xuống đáy" bằng JS

            container.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:12px; background:#fdfaf1; border-top:2px solid #27ae60; font-size:13px; position:-webkit-sticky; position:sticky; bottom:0; z-index:950; box-shadow:0 -4px 12px rgba(0,0,0,0.1); margin:0; border-radius:0 0 8px 8px;';



            // Đã xóa sạch biến pdfBtn gây lỗi sập Web

            container.innerHTML = `

        <div style="display:flex; align-items:center; gap:20px;">

            <div style="color:#7f8c8d;">Hiển thị <b style="color:#2c3e50">${startItem}</b> đến <b style="color:#2c3e50">${endItem}</b> trong <b>${totalItems}</b> ca</div>

        </div>

        <div style="display:flex; gap:8px;">

            <button onclick="appChangePage(-1, '${context}')" ${currentPage === 1 ? 'disabled' : ''} style="padding:6px 12px; border:1px solid #ccc; background:${currentPage === 1 ? '#eee' : '#fff'}; cursor:${currentPage === 1 ? 'not-allowed' : 'pointer'}; border-radius:4px; font-weight:bold; color:#333;">⬅️ Trước</button>

            <span style="padding:6px 12px; font-weight:bold; color:#27ae60; background:#e8f8f5; border-radius:4px;">Trang ${currentPage} / ${totalPages}</span>

            <button onclick="appChangePage(1, '${context}')" ${currentPage === totalPages ? 'disabled' : ''} style="padding:6px 12px; border:1px solid #ccc; background:${currentPage === totalPages ? '#eee' : '#fff'}; cursor:${currentPage === totalPages ? 'not-allowed' : 'pointer'}; border-radius:4px; font-weight:bold; color:#333;">Tiếp ➡️</button>

        </div>

    `;

        }



        // Hàm đổi trang thông minh

        function appChangePage(dir, context) {

            if (context === 'HOME') {

                homeCurrentPage += dir;

                renderDashboardPreview(homeFilteredData);

            } else {

                schedCurrentPage += dir;

                renderSchedPage();

            }

        }



        // 4. Lệnh lật trang

        function changeSchedPage(dir) {

            const totalPages = Math.ceil((schedFilteredData || []).length / PAGE_SIZE) || 1;

            schedCurrentPage += dir;

            if (schedCurrentPage < 1) schedCurrentPage = 1;

            if (schedCurrentPage > totalPages) schedCurrentPage = totalPages;



            // 🔥 Ép hệ thống vẽ lại bảng của tab Xếp Lịch

            renderSchedPage();

        }

        function runScheduling() {

            if (!document.getElementById('schedule-date').value) return alert("Vui lòng chọn ngày xếp lịch trước!");

            document.getElementById('strategyModal').style.display = 'flex';

        }

        function closeStrategyModal() { document.getElementById('strategyModal').style.display = 'none'; }

        function executeScheduling(strategy) {

            window.viewingImportedScheduleFile = false;

            closeStrategyModal();

            const dateVal = document.getElementById('schedule-date').value;

            const skipVal = document.getElementById('modal-skip-procs')?.value || "";

            const res = document.getElementById('schedule-result');

            const list = document.getElementById('schedule-list');

            const btn = document.getElementById('btn-run-sched');

            btn.innerText = '⏳ ĐANG XẾP LỊCH...'; btn.disabled = true; btn.style.background = '#f39c12';

            res.innerHTML = '';

            list.innerHTML = '<tr><td colspan="12" align="center"><div class="spinner"></div></td></tr>';

            const startTime = performance.now();

            google.script.run

                .withSuccessHandler(out => {

                    const timeTaken = ((performance.now() - startTime) / 1000).toFixed(2);

                    btn.innerText = 'CHẠY XẾP LỊCH TỔNG'; btn.disabled = false; btn.style.background = '#008b02';

                    window.currentScheduleData = out.schedule;

                    setUnscheduledData(out.unscheduled || [], dateVal);

                    const dashboardDate = document.getElementById('dashboard-date-filter');

                    if (dashboardDate) dashboardDate.value = dateVal;

                    localStorage.setItem('meds_schedule_date', dateVal);

                    localStorage.setItem('meds_success', JSON.stringify(out.schedule));

                    res.innerHTML = `<div class="alert alert-success" style="margin-top:10px">Xếp thành công: <b>${out.scheduleCount}</b> ca. Rớt: <b>${out.unscheduledCount}</b> ca. <span style="margin-left:15px; color:#555; font-size:13px;">(⏱ <b>${timeTaken} giây</b>)</span></div>`;

                    filterSchedule();

                    if (typeof renderStats === 'function') renderStats(window.lastUnscheduledData);

                    if (typeof renderPatientsTable === 'function') renderPatientsTable();

                    if (typeof loadDashboard === 'function') loadDashboard();

                    setTimeout(() => {

                        const contentEl = document.getElementById('custom-popup-content');

                        if (contentEl) contentEl.innerHTML = `

                    <div>✅ Xếp thành công: <b style="color:#27ae60; font-size:18px;">${out.scheduleCount}</b> ca</div>

                    <div>❌ Không xếp được: <b style="color:#c0392b; font-size:18px;">${out.unscheduledCount}</b> ca</div>

                    <hr style="border:0; border-top:1px dashed #ccc; margin:10px 0;">

                    <div style="font-size:14px; color:#7f8c8d;">⏱ Thời gian: <b>${timeTaken}</b> giây</div>`;

                        const popup = document.getElementById('custom-success-popup');

                        if (popup) popup.style.display = 'flex';

                    }, 100);

                })

                .withFailureHandler(err => {

                    btn.innerText = 'CHẠY XẾP LỊCH TỔNG'; btn.disabled = false; btn.style.background = '#008b02';

                    res.innerHTML = `<div class="alert alert-danger">Lỗi Backend: ${err.message}</div>`;

                    if (typeof showThongBao === 'function') showThongBao("LỖI HỆ THỐNG", "Có lỗi xảy ra: " + err.message, "error");

                })

                .runScheduling(dateVal, strategy, skipVal);

        }

        function runExtraScheduling() {

            window.viewingImportedScheduleFile = false;

            const dateVal = document.getElementById('schedule-date').value;

            if (!dateVal) return alert("Vui lòng chọn ngày để xếp bổ sung!");

            const btn = document.getElementById('btn-run-extra');

            btn.innerText = '⏳ ĐANG TÌM CHỖ TRỐNG...'; btn.disabled = true;

            google.script.run

                .withSuccessHandler(out => {

                    btn.innerText = '⚡ XẾP BỔ SUNG BN MỚI'; btn.disabled = false;

                    if (out.error) return alert(out.error);

                    let currentUnscheduled = [];

                    try {

                        const saved = localStorage.getItem('meds_unscheduled');

                        if (saved && localStorage.getItem('meds_schedule_date') === dateVal) currentUnscheduled = JSON.parse(saved);

                    } catch (e) { }

                    const newUnscheduled = out.unscheduled || [];

                    setUnscheduledData([...currentUnscheduled, ...newUnscheduled], dateVal);

                    const addedCount = Number(out.addedCount || 0);

                    const failCount = Number(out.unscheduledCount ?? newUnscheduled.length);

                    const totalFail = window.lastUnscheduledData.length;

                    const contentEl = document.getElementById('custom-popup-content');

                    if (contentEl) contentEl.innerHTML = `

                    <div>✅ Xếp bổ sung thành công: <b style="color:#27ae60; font-size:18px;">${addedCount}</b> ca</div>

                    <div>❌ Không xếp được lần này: <b style="color:#c0392b; font-size:18px;">${failCount}</b> ca</div>

                    <hr style="border:0; border-top:1px dashed #ccc; margin:10px 0;">

                    <div style="font-size:14px; color:#7f8c8d;">Tổng số ca rớt hiện tại: <b>${totalFail}</b> ca</div>`;

                    const popup = document.getElementById('custom-success-popup');

                    if (popup) popup.style.display = 'flex';

                    else alert(`Đã xếp thêm thành công ${addedCount} ca!\nKhông xếp được lần này: ${failCount} ca.\nTổng số ca rớt hiện tại: ${totalFail} ca.`);

                    loadScheduleList();

                })

                .withFailureHandler(err => { btn.innerText = '⚡ XẾP BỔ SUNG BN MỚI'; btn.disabled = false; alert("Lỗi kết nối: " + err.message); })

                .runSupplementalScheduling(dateVal);

        }



        // ============================================================

        // 📊 THỐNG KÊ

        // ============================================================

        function renderStats(unscheduledData) {

            const rawData = window.currentScheduleData || [];

            const unscheduled = (unscheduledData === undefined ? window.lastUnscheduledData : unscheduledData) || [];

            const successData = rawData.filter(item => { const g = item.gioDienRa || ''; return g && g !== '--' && !g.includes('Rớt'); });

            const success = successData.length, fail = unscheduled.length, total = success + fail;

            const rate = total === 0 ? 0 : ((success / total) * 100).toFixed(1);

            document.getElementById('stat-success').innerText = success;

            document.getElementById('stat-fail').innerText = fail;

            document.getElementById('stat-rate').innerText = rate + '%';

            const un_tbody = document.getElementById('stats-unscheduled-list');

            un_tbody.innerHTML = fail === 0

                ? `<tr><td colspan="5" align="center" style="padding:20px;">Không có ca rớt</td></tr>`

                : unscheduled.map((raw, i) => {

                    const item = normalizeDroppedItem(raw);

                    return `<tr class="row-dropped"><td align="center">${i + 1}</td><td><strong>${item.bn}</strong></td><td>${item.tt}</td><td align="center">${item.room || item.phong}</td><td style="font-size:11px;">${item.reason}</td></tr>`;

                }).join('');

            const st_tbody = document.getElementById('stats-staff-list');

            if (!success) { st_tbody.innerHTML = '<tr><td colspan="4" align="center" style="padding:20px;">Chưa có dữ liệu</td></tr>'; return; }

            let staffStats = {}, totalInvolvements = 0;

            successData.forEach(row => {

                [row.nvChinh, row.nvPhu].forEach(nv => {

                    if (!nv?.trim()) return;

                    const tt_info = dataCache.proc?.find(p => p.ten.toLowerCase() === String(row.thuThuat).trim().toLowerCase());

                    const tt_short = (tt_info?.vietTat) || row.thuThuat;

                    if (!staffStats[nv]) staffStats[nv] = { total: 0, details: {} };

                    staffStats[nv].total++;

                    staffStats[nv].details[tt_short] = (staffStats[nv].details[tt_short] || 0) + 1;

                    totalInvolvements++;

                });

            });

            st_tbody.innerHTML = Object.entries(staffStats).sort((a, b) => b[1].total - a[1].total).map(([name, s]) => {

                const s_rate = ((s.total / totalInvolvements) * 100).toFixed(1);

                const detailsStr = Object.entries(s.details).map(([k, v]) => `<strong>${k}</strong>: ${v}`).join(' | ');

                return `<tr><td><strong>${name}</strong></td><td align="center" style="font-weight:bold; color:#27ae60; font-size:14px;">${s.total}</td><td align="center">${s_rate}%</td><td style="font-size:11px;">${detailsStr}</td></tr>`;

            }).join('');

        }



        // ============================================================

        // 📤 XUẤT / IN

        // ============================================================

        function exportSchedule() {

            if (!window.currentScheduleData?.length) return alert("Chưa có lịch để xuất!");

            // 1. Sắp xếp: Phòng → Tên BN → Bắt Đầu (A-Z)
            const sorted = [...(window.currentScheduleData || [])].sort((a, b) => {
                const pA = String(a.phong || '').trim().toLowerCase();
                const pB = String(b.phong || '').trim().toLowerCase();
                if (pA !== pB) return pA.localeCompare(pB, 'vi');
                const tA = String(a.tenBN || '').trim().toLowerCase();
                const tB = String(b.tenBN || '').trim().toLowerCase();
                if (tA !== tB) return tA.localeCompare(tB, 'vi');
                return String(a.gioDienRa || '').localeCompare(String(b.gioDienRa || ''));
            });

            // 2. Tiêu đề cột
            // Cột: Ngày | Tên BN | Năm Sinh | Phòng | Thủ Thuật | Bắt Đầu | Kết Thúc | NV Chính | Máy
            const HEADER = ["Ngày", "Tên Bệnh Nhân", "Năm Sinh", "Phòng", "Thủ Thuật", "Bắt Đầu", "Kết Thúc", "NV Chính", "Máy"];
            const ws_data = [HEADER];

            // Chỉ số căn lề trái / căn giữa
            const LEFT_COLS   = new Set([0, 1, 3, 4, 7, 8]); // Ngày, TênBN, Phòng, ThuThuat, NVChinh, May
            const CENTER_COLS = new Set([2, 5, 6]);             // NamSinh, BatDau, KetThuc

            // 3. Điền dữ liệu, thêm dòng phân cách phòng
            let currentRoom = null;
            sorted.forEach(row => {
                const ngay = String(row.ngay || '').split('-').reverse().join('/');
                const phong = String(row.phong || '').trim();

                // Thêm dòng tiêu đề phòng khi chuyển phòng
                if (phong !== currentRoom) {
                    if (currentRoom !== null) ws_data.push(['', '', '', '', '', '', '', '', '']); // dòng trống
                    
                    currentRoom = phong;
                }

                ws_data.push([
                    ngay,
                    String(row.tenBN  || '').trim(),
                    String(row.namSinh || '').trim(),
                    phong,
                    String(row.thuThuat  || '').trim(),
                    String(row.gioDienRa || '').trim(),
                    String(row.gioKetThuc || '').trim(),
                    String(row.nvChinh   || '').trim(),
                    String(row.may       || '').trim()
                ]);
            });

            // 4. Tạo sheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(ws_data);

            // 5. Độ rộng cột (căn chỉnh vừa khổ A4 đứng)
            ws['!cols'] = [
                { wch: 11 }, // Ngày
                { wch: 20 }, // Tên BN
                { wch: 8  }, // Năm Sinh
                { wch: 10 }, // Phòng
                { wch: 20 }, // Thủ Thuật
                { wch: 7  }, // Bắt Đầu
                { wch: 7  }, // Kết Thúc
                { wch: 18 }, // NV Chính
                { wch: 10 }  // Máy
            ];

            // 6. Chiều cao dòng (~18pt ≈ 6.35mm cho dữ liệu, 22pt cho tiêu đề)
            ws['!rows'] = [];
            for (let r = 0; r < ws_data.length; r++) {
                const isHeader = r === 0;

                ws['!rows'][r] = { hpt: isHeader ? 22 : 18 };
            }

            // 7. Căn lề ô + định dạng đậm tiêu đề / tiêu đề phòng
            try {
                const range = XLSX.utils.decode_range(ws['!ref']);
                for (let R = range.s.r; R <= range.e.r; R++) {
                    const isHeader    = R === 0;

                    for (let C = range.s.c; C <= range.e.c; C++) {
                        const addr = XLSX.utils.encode_cell({ r: R, c: C });
                        if (!ws[addr]) continue;
                        const align = CENTER_COLS.has(C) ? 'center' : 'left';
                        ws[addr].s = {
                            alignment: { horizontal: align, vertical: 'center', wrapText: false },
                            font: isHeader ? { bold: true } : {}
                        };
                    }
                }
            } catch(e) { /* Nếu thư viện không hỗ trợ style thì bỏ qua */ }

            // 8. Thiết lập in A4 đứng, vừa chiều ngang
            ws['!pageSetup'] = {
                paperSize: 9,          // A4
                orientation: 'portrait',
                fitToPage: true,
                fitToWidth: 1,         // Vừa khít 1 trang ngang
                fitToHeight: 0,        // Số trang dọc tự động
                horizontalDpi: 300,
                verticalDpi: 300
            };
            ws['!margins'] = { left: 0.4, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };

            // 9. Tên file theo ngày
            const firstRow = sorted[0];
            const exportDate = firstRow
                ? String(firstRow.ngay || '').split('-').reverse().join('-')
                : new Date().toISOString().split('T')[0];

            XLSX.utils.book_append_sheet(wb, ws, "LichYLenh");
            XLSX.writeFile(wb, `Lich_YLenh_${exportDate}.xlsx`);

        }









        function printSchedule() {

            if (!filteredSchedData || filteredSchedData.length === 0) {

                return alert("Không có dữ liệu để in! Bác sĩ hãy kiểm tra lại ô tìm kiếm.");

            }



            const dateInput = document.getElementById('schedule-date')?.value;

            let displayDate = "......";

            if (dateInput) {

                displayDate = dateInput.split('-').reverse().join('/');

            } else if (filteredSchedData[0] && filteredSchedData[0].ngay) {

                displayDate = String(filteredSchedData[0].ngay).split('-').reverse().join('/');

            }



            const rows = filteredSchedData.map((row, i) => `<tr class="${row.__dropped ? 'print-dropped' : ''}">

                <td>${i + 1}</td>

                <td class="text-left nowrap"><strong>${row.tenBN}</strong></td>

                <td>${row.namSinh}</td>

                <td class="text-left">${row.thuThuat}</td>

                <td class="nowrap"><strong>${row.gioDienRa}</strong></td>

                <td class="nowrap"><strong>${row.gioKetThuc}</strong></td>

                <td class="nowrap">${row.nvChinh}</td>

                <td class="nowrap">${row.nvPhu}</td>

                <td class="nowrap">${row.may}</td>

            </tr>`).join('');



            const printFrame = document.createElement('iframe');

            printFrame.style.position = 'absolute';

            printFrame.style.top = '-9999px';

            document.body.appendChild(printFrame);

            const doc = printFrame.contentWindow.document;



            doc.open();

            doc.write(`<html><head><title>In Lịch Y Lệnh</title>

                <style>

                    @page { size: landscape; margin: 10mm; }

                    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 0; margin: 0; }

                    h2 { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px; text-transform: uppercase; }

                    table { width: 100%; border-collapse: collapse; font-size: 13.5px; }

                    th, td { border: 1px solid #000; padding: 10px 6px; text-align: center; vertical-align: middle; }

                    th { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; padding: 12px 6px; }

                    .text-left { text-align: left; padding-left: 10px; }

                    .nowrap { white-space: nowrap; }

                    .print-dropped td { background: #ffd7ba !important; color: #9a3412 !important; font-weight: bold; -webkit-print-color-adjust: exact; }

                </style>

            </head><body>

                <h2>LỊCH Y LỆNH NGÀY ${displayDate}</h2>

                <table>

                    <thead><tr>

                        ${["STT", "Tên Bệnh Nhân", "Năm Sinh", "Thủ Thuật", "Bắt Đầu", "Kết Thúc", "NV Chính", "NV Phụ", "Máy"].map(h => `<th>${h}</th>`).join('')}

                    </tr></thead>

                    <tbody>${rows}</tbody>

                </table>

            </body></html>`);

            doc.close();



            setTimeout(() => {

                printFrame.contentWindow.print();

                document.body.removeChild(printFrame);

            }, 500);

        }



        function importScheduleFile() {

            const input = document.createElement('input');

            input.type = 'file';

            input.accept = '.xlsx,.xls';

            input.onchange = ev => {

                const file = ev.target.files?.[0];

                if (!file) return;

                const reader = new FileReader();

                reader.onload = e => {

                    try {

                        const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });

                        const sheet = workbook.Sheets[workbook.SheetNames[0]];

                        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

                        const headerIndex = rows.findIndex(r => r.some(c => String(c).toLowerCase().includes('bệnh nhân') || String(c).toLowerCase().includes('benh nhan')));

                        if (headerIndex < 0) throw new Error('Không tìm thấy dòng tiêu đề trong file lịch.');



                        const headers = rows[headerIndex].map(h => xoaDau(String(h || '').toLowerCase()).replace(/\s+/g, ' ').trim());

                        const col = keys => {

                            const normalizedKeys = keys.map(k => xoaDau(k.toLowerCase()));

                            return headers.findIndex(h => normalizedKeys.some(k => h.includes(k)));

                        };

                        const idx = {

                            ngay: col(['ngay']),

                            ten: col(['ten benh nhan', 'ten bn', 'hoten']),

                            ns: col(['nam sinh', 'namsinh']),

                            phong: col(['phong']),

                            tt: col(['thu thuat', 'dich vu', 'dichvu']),

                            bd: col(['bat dau', 'gio dien ra', 'giodienra']),

                            kt: col(['ket thuc', 'gioketthuc']),

                            nvChinh: col(['nv chinh', 'nhan vien chinh']),

                            nvPhu: col(['nv phu']),

                            may: col(['may']),

                            giuong: col(['giuong']),

                            status: col(['trang thai', 'ghi chu'])

                        };

                        if (idx.ten < 0 || idx.tt < 0) throw new Error('File không đúng cấu trúc lịch đã xuất.');



                        const scheduled = [], dropped = [];

                        rows.slice(headerIndex + 1).forEach(r => {

                            if (!r || !r.some(c => String(c).trim())) return;

                            const row = {

                                ngay: idx.ngay >= 0 ? r[idx.ngay] : "",

                                tenBN: idx.ten >= 0 ? r[idx.ten] : "",

                                namSinh: idx.ns >= 0 ? r[idx.ns] : "",

                                phong: idx.phong >= 0 ? r[idx.phong] : "",

                                thuThuat: idx.tt >= 0 ? r[idx.tt] : "",

                                gioDienRa: idx.bd >= 0 ? r[idx.bd] : "",

                                gioKetThuc: idx.kt >= 0 ? r[idx.kt] : "",

                                nvChinh: idx.nvChinh >= 0 ? r[idx.nvChinh] : "",

                                nvPhu: idx.nvPhu >= 0 ? r[idx.nvPhu] : "",

                                may: idx.may >= 0 ? r[idx.may] : "",

                                giuong: idx.giuong >= 0 ? r[idx.giuong] : ""

                            };

                            const statusText = idx.status >= 0 ? String(r[idx.status] || "") : "";

                            const statusLower = statusText.toLowerCase();

                            const isDropped = String(row.gioDienRa || "").includes("Rớt") || statusLower.includes("không xếp") || statusLower.includes("rớt");

                            if (isDropped) {

                                // Sử dụng chuỗi để tránh làm parser ngoặc nhầm lẫn

                                const regLydo = new RegExp("^.*Lý do:\\s*", "i");

                                const regEnd = new RegExp("[)]+$", "");

                                dropped.push(normalizeDroppedItem({

                                    ngay: row.ngay, bn: row.tenBN, ns: row.namSinh, room: row.phong,

                                    tt: row.thuThuat, staff: row.nvChinh, reason: statusText.replace(regLydo, "").replace(regEnd, "") || row.may || "Ca rớt trong file cũ"

                                }));

                            } else {

                                scheduled.push(row);

                            }

                        });



                        window.currentScheduleData = scheduled;

                        window.lastUnscheduledData = dropped;

                        window.currentRotData = dropped;

                        window.viewingImportedScheduleFile = true;

                        filterSchedule();

                    } catch (err) {

                        alert('Lỗi: ' + err.message);

                    }

                };

                reader.readAsArrayBuffer(file);

            };

            input.click();

        }





        function callChotSo() {

            showCustomConfirm("Chốt sổ?", "Bạn có chắc chắn muốn chốt sổ ngày hôm nay?", function() {

                const btn = document.getElementById('btn-chot-so');

                btn.innerText = '⏳ Đang xử lý...'; btn.disabled = true;

                // Chặn autoSync ngay lập tức để không bị kéo dữ liệu cũ về

                window._chotSoDone = false;

                window.viewingImportedScheduleFile = true;

                google.script.run.withSuccessHandler(res => {

                    // Xóa sạch mọi dữ liệu ca rớt và lịch cũ trong bộ nhớ

                    window.currentScheduleData = [];

                    window.lastUnscheduledData = [];

                    window.currentRotData = [];

                    localStorage.removeItem('meds_success');

                    localStorage.removeItem('meds_schedule_date');

                    localStorage.removeItem('meds_unscheduled');

                    // Xóa cache để trang mới tải lại dữ liệu sạch từ Google Sheets
                    window.dataCacheTime = {};

                    sessionStorage.setItem('chot_so_success_toast', 'true');
                    location.reload();

                }).withFailureHandler(err => {

                    alert("Lỗi: " + err.message);

                    btn.disabled = false;

                    window.viewingImportedScheduleFile = false;

                }).chuyenNgayMoi();

            });

        }


                window._historyCache = window._historyCache || {};
        // Backup/restore dataCache khi chuyển sang chế độ xem lịch cũ
        window._liveDataCacheBackup = null;

        function applyHistoryDataToTabs(fullData, dateStr) {
            // Backup cache hiện tại nếu chưa backup
            if (!window._liveDataCacheBackup) {
                window._liveDataCacheBackup = {
                    pat: JSON.parse(JSON.stringify(dataCache.pat || [])),
                    staff: JSON.parse(JSON.stringify(dataCache.staff || []))
                };
            }

            // Build dataCache.pat từ dữ liệu lịch sử (unique patients)
            const histPat = (fullData.patients || []).map(p => ({
                ten: p.tenBN, namSinh: p.namSinh, phong: p.phong,
                thuThuat: p.dsThuThuat.join(', '),
                ngayVao: '', gioVao: '',
                gioBan: (fullData.patBusy || []).find(pb => pb.tenBN === p.tenBN && pb.namSinh === p.namSinh)
                    ?.slots.map(s => s.from + '-' + s.to).join(', ') || '',
                gioRa: '', index: 0, sheetIndex: 0
            }));
            dataCache.pat = histPat;

            // Build dataCache.staff từ dữ liệu lịch sử (giờ bận = giờ làm thủ thuật ngày đó, đã gộp)
            const histStaff = (fullData.staffBusy || []).map(s => ({
                ten: s.ten,
                gioBan: s.slots.map(sl => sl.from + '-' + sl.to).join(', '),
                vaiTro: '', trangThai: 'Đi làm', kyNang: '', index: 0, sheetIndex: 0
            }));
            // Gộp các slot trùng nhau cho cùng 1 nhân viên
            histStaff.forEach(s => {
                const unique = [...new Set(s.gioBan.split(',').map(x => x.trim()).filter(x => x))];
                s.gioBan = unique.join(', ');
            });
            dataCache.staff = histStaff;

            // Cập nhật header trạng thái lịch cũ
            const parts = dateStr.split('-');
            const ngayHT = parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : dateStr;
            document.title = 'Lịch Cũ – ' + ngayHT;

            // Render lại các tab
            if (typeof renderPatientsTable === 'function') renderPatientsTable();
            if (typeof renderBusyPat === 'function') renderBusyPat();
            if (typeof renderBusyStaff === 'function') renderBusyStaff();
        }

        function restoreHistoryTabs() {
            if (!window._liveDataCacheBackup) return;
            dataCache.pat = window._liveDataCacheBackup.pat;
            dataCache.staff = window._liveDataCacheBackup.staff;
            window._liveDataCacheBackup = null;
            document.title = 'T.I.M.E.S. System';
            if (typeof renderPatientsTable === 'function') renderPatientsTable();
            if (typeof renderBusyPat === 'function') renderBusyPat();
            if (typeof renderBusyStaff === 'function') renderBusyStaff();
            // Xóa panel cũ nếu còn
            const old = document.getElementById('history-detail-panel');
            if (old) old.remove();
        }

        function xemLichSu() {
    const d = document.getElementById('history-date').value;
    if (!d) return alert("Chọn ngày!");
    
    const dp = document.getElementById('dashboard-date-filter');
    if (dp && dp.value !== d) {
        dp.value = d;
        const displayEl = document.getElementById('display-date');
        if (displayEl) displayEl.textContent = d.split('-').reverse().join('/');
    }
    
    if (typeof loadDashboard === 'function') {
        const btn = document.querySelector('button[onclick="xemLichSu()"]');
        const oldText = btn ? btn.innerText : 'Xem';
        if (btn) { btn.innerText = 'Đang tải...'; btn.disabled = true; }
        
        setTimeout(() => {
            loadDashboard();
            if (btn) { btn.innerText = oldText; btn.disabled = false; }
            alert("Đã cập nhật dữ liệu lịch sử cho ngày " + d + ". Bạn có thể xem trên tất cả các tab!");
        }, 100);
    }
}

        // --- Tiện ích Tìm rảnh ---

        window.externalUtilsData = null;

        function handleUtilsFile(e) {

            const file = e.target.files[0];

            if (!file) return;

            const reader = new FileReader();

            reader.onload = function(ev) {

                try {

                    const workbook = XLSX.read(new Uint8Array(ev.target.result), {type: 'array'});

                    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1});

                    window.externalUtilsData = jsonData.slice(1).map(r => ({ thuThuat: r[0], gioDienRa: r[1], gioKetThuc: r[2], nvChinh: r[3], nvPhu: '', may: r[4] }));

                    alert("Đã nạp file thành công!");

                } catch(err) { alert("Lỗi đọc file: " + err.message); }

            };

            reader.readAsArrayBuffer(file);

        }



        window.loadTimRanhDataFromServer = function() {

            const statusEl = document.getElementById('utils-file-status');

            if (statusEl) {

                statusEl.innerText = "⏳ Đang kết nối máy chủ để lấy dữ liệu Tìm Rảnh chung...";

                statusEl.style.color = "#f39c12";

            }



            google.script.run.withSuccessHandler(function(data) {

                if (data && data.length > 0) {

                    window.externalUtilsData = data;

                    if (statusEl) {

                        statusEl.innerText = `✅ Đã tải ${data.length} ca dùng chung từ máy chủ (Sheet TimRanh)!`;

                        statusEl.style.color = "#27ae60";

                    }

                } else if (statusEl) {

                    statusEl.innerText = "(Chưa có dữ liệu chung. Đang dùng: Lịch phần mềm xếp)";

                    statusEl.style.color = "#e67e22";

                }

            }).getTimRanhData();

        };





            // Chạy luôn hàm tải dữ liệu ngay khi mở web

            document.addEventListener('DOMContentLoaded', window.loadTimRanhDataFromServer);



            function timBacSiRanh() {

            const vao_str = document.getElementById('search-doc-time').value;

            if (!vao_str) return alert("Vui lòng nhập 'Giờ cần tìm' (VD: 14:00)!");

            const sourceMode = document.querySelector('input[name="search-source"]:checked')?.value || 'current';

            let sourceData = [];

            if (sourceMode === 'current') {

            sourceData = window.currentScheduleData;

            if (!sourceData?.length) return alert("Vui lòng 'Chạy xếp lịch tổng' trước khi tìm theo bảng Lịch trình!");

            } else {

            sourceData = window.externalUtilsData;

            if (!sourceData?.length) return alert("Chưa có dữ liệu từ sheet TimRanh hoặc file Excel. Vui lòng Nạp file!");

            }

            const t_vao = t2m(vao_str);

            const tbody = document.getElementById('free-doc-list');

            tbody.innerHTML = '';

            let found = false;

            const docs = dataCache.staff.filter(s => {

            const vt = String(s.vaiTro).toLowerCase();

            return (vt.includes('bác sĩ') || vt.includes('kỹ thuật viên') || vt.includes('ktv')) && s.trangThai !==

            'Nghỉ cả ngày';

            });

            docs.forEach(doc => {

            let busy = [];

            sourceData.forEach(row => {

            const nvChinh = String(row.nvChinh || row[7] || '').trim().toLowerCase();

            const nvPhu = String(row.nvPhu || row[8] || '').trim().toLowerCase();

            const dName = String(doc.ten).trim().toLowerCase();

            if (nvChinh !== dName && nvPhu !== dName) return;

            const tStart = t2m(row.gioDienRa || row[5]), tEnd = t2m(row.gioKetThuc || row[6]);

            const thuThuat = String(row.thuThuat || row[4] || '').trim().toLowerCase();

            const procInfo = dataCache.proc?.find(p =>

            p.ten.toLowerCase() === thuThuat ||

            (p.vietTat && p.vietTat.toLowerCase() === thuThuat)

            );



            const tgNhanVien = procInfo && procInfo.thoiGianThucHien ? parseInt(procInfo.thoiGianThucHien) : Math.min(5,

            tEnd - tStart);

            const khoangCachRaw = procInfo && procInfo.khoangCach ? parseInt(procInfo.khoangCach) : tgNhanVien;

            const khoangCach = Math.max(khoangCachRaw, tgNhanVien + 1);



            busy.push([tStart, tStart + khoangCach]);

            if (tEnd > tStart + tgNhanVien) {

            busy.push([tEnd, tEnd + 1]);

            }

            });

            if (doc.gioBan) doc.gioBan.split(',').forEach(b => { const pts = b.split('-'); if(pts.length===2)

            busy.push([t2m(pts[0].trim()), t2m(pts[1].trim())]); });

            busy.sort((a,b) => a[0]-b[0]);

            let merged = [];

            busy.forEach(b => {

            if (!merged.length) { merged.push(b); return; }

            const last = merged[merged.length-1];

            b[0] <= last[1] ? merged[merged.length-1]=[last[0], Math.max(last[1], b[1])] : merged.push(b); }); let

                shifts=[]; if (doc.thoiGianLam) doc.thoiGianLam.split(',').forEach(sh=> { const pts = sh.split('-');

                if(pts.length===2) shifts.push([t2m(pts[0].trim()), t2m(pts[1].trim())]); });

                if (!shifts.length) shifts = [[420, 690], [780, 1014]];

                shifts.forEach(sh => {

                let curr = sh[0];

                for (const b of merged) {

                if (b[0] >= sh[1]) break;

                if (curr < b[0]) { const valid_start=Math.max(curr, t_vao); if(valid_start < b[0]) { const mins=b[0] -

                    valid_start; if(mins>=1) { tbody.innerHTML += `<tr>

                        <td>👨‍⚕️ <b>${doc.ten}</b></td>

                        <td>${m2t(valid_start)} - ${m2t(b[0]-1)}</td>

                        <td><strong style="color:#27ae60">${mins}</strong></td>

                    </tr>`; found = true; } } }

                    curr = Math.max(curr, b[1]);

                    }

                    if (curr < sh[1]) { const valid_start=Math.max(curr, t_vao); if(valid_start < sh[1]) { const

                        mins=sh[1] - valid_start; if(mins>=1) { tbody.innerHTML += `<tr>

                            <td>👨‍⚕️ <b>${doc.ten}</b></td>

                            <td>${m2t(valid_start)} - ${m2t(sh[1]-1)}</td>

                            <td><strong style="color:#27ae60">${mins}</strong></td>

                        </tr>`; found = true; } } }

                        });

                        });

                        if (!found) tbody.innerHTML = `<tr> <td colspan="3" align="center" style="color:#c0392b; font-weight:bold;">Không có Nhân sự

                                rảnh lúc này</td>

                        </tr>`; }

                        function timMayRanh() {

                        const loai = document.getElementById('search-machine-type').value;

                        const gio_str = document.getElementById('search-machine-time').value;

                        const sourceMode = document.querySelector('input[name="search-source"]:checked')?.value ||

                        'current';

                        let sourceData = [];

                        if (sourceMode === 'current') {

                        sourceData = window.currentScheduleData;

                        if (!sourceData?.length) return alert("Vui lòng 'Chạy xếp lịch tổng' trước khi tìm theo bảng Lịch trình!");

                        } else {

                        sourceData = window.externalUtilsData;

                        if (!sourceData?.length) return alert("Chưa có dữ liệu từ sheet TimRanh hoặc file Excel. Vui lòng Nạp file!");

                        }

                        if (!loai || loai.includes("Chọn loại") || !gio_str) return alert("Vui lòng chọn Loại máy và nhập Giờ!");

                        const t_vao = t2m(gio_str);

                        const tbody = document.getElementById('free-machine-list');

                        tbody.innerHTML = '';

                        const may_thuoc_loai = dataCache.machine.filter(m => m.tenLoai.trim() === loai.trim() &&

                        m.trangThai === 'Sẵn sàng').map(m => m.maMay);

                        if (!may_thuoc_loai.length) { tbody.innerHTML = `<tr> <td colspan="2" align="center" style="color:#c0392b; font-weight:bold;">Máy đang hỏng/bảo

                                trì hết</td>

                        </tr>`; return; } const m_busy = {};

                        may_thuoc_loai.forEach(m => m_busy[m] = []);

                        sourceData.forEach(row => {

                        const rowMay = String(row.may || row[9] || '').trim().toLowerCase();

                        const gVao = row.gioDienRa || row[5];

                        const gRa = row.gioKetThuc || row[6];

                        const mMatch = may_thuoc_loai.find(x => x.toLowerCase() === rowMay);

                        if (mMatch) m_busy[mMatch].push([t2m(gVao), t2m(gRa)+1]);

                        });

                        let found = false;

                        may_thuoc_loai.forEach(m => {

                        const busy = m_busy[m].sort((a,b)=>a[0]-b[0]);

                        let merged = [];

                        busy.forEach(b => {

                        if (!merged.length) { merged.push(b); return; }

                        const last = merged[merged.length-1];

                        b[0] <= last[1] ? merged[merged.length-1]=[last[0], Math.max(last[1], b[1])] : merged.push(b);

                            }); let is_free=true, free_until=1440; for (const b of merged) { if (b[0] <=t_vao && t_vao <

                            b[1]) { is_free=false; break; } if (b[1] <=t_vao) continue; if (b[0]> t_vao) free_until =

                            Math.min(free_until, b[0]);

                            }

                            if (is_free) {

                            tbody.innerHTML += `<tr>

                                <td><strong>${m}</strong></td>

                                <td style="color:#27ae60; font-weight:bold;">${free_until === 1440 ? "Hết ngày" : `Đến

                                    ${m2t(free_until-1)}`}</td>

                            </tr>`;

                            found = true;

                            }

                            });

                            if (!found) tbody.innerHTML = `<tr> <td colspan="2" align="center" style="color:#c0392b; font-weight:bold;">Hết máy rảnh

                                </td>

                            </tr>`; }



                            // ============================================================

                            // 📅 TAB 7 - THỨ 7

                            // ============================================================

                            let satCache = {}, t8_ns_vars = {}, satStaffIndices = {};



                            function taiDsSat() {

                            google.script.run.withSuccessHandler(data => {

                            const frNs = document.getElementById('sat-staff-list');

                            frNs.innerHTML = '';

                            t8_ns_vars = {}; satStaffIndices = {};

                            const isSummerVal = (document.querySelector('input[name="sat-season"]:checked')?.value ===

                            'summer');

                            const s1_val = isSummerVal ? "07:00" : "07:30", s2_val = isSummerVal ? "11:30" : "12:00";

                            const c1_val = "13:00", c2_val = "16:30";



                            data.staff.forEach((s, idx) => {

                            const ten = s.ten;

                            t8_ns_vars[ten] = false; satStaffIndices[ten] = idx;

                            const fItem = document.createElement('div');

                            fItem.style.cssText = 'margin-bottom:10px; border-bottom:1px solid #ecf0f1; padding-bottom:8px;';

                            const cbLabel = document.createElement('label');

                            cbLabel.style.cssText = 'cursor:pointer; display:flex; align-items:center; gap:8px;';

                            const cbInput = document.createElement('input');

                            cbInput.type = 'checkbox'; cbInput.style.width = '18px'; cbInput.style.height = '18px';

                            cbInput.onchange = function() {

                            t8_ns_vars[ten] = this.checked;

                            const timeDiv = document.getElementById(`sat-time-${idx}`);

                            if (timeDiv) timeDiv.style.display = this.checked ? 'block' : 'none';

                            };

                            const spanName = document.createElement('span');

                            spanName.style.cssText = 'font-size:14px; font-weight:bold; color:#2980b9;';

                            spanName.innerText = ten;

                            cbLabel.append(cbInput, spanName);

                            fItem.appendChild(cbLabel);



                            const timeDiv = document.createElement('div');

                            timeDiv.id = `sat-time-${idx}`;

                            timeDiv.style.cssText = 'display:none; padding-left:25px; margin-top:5px;';

                            timeDiv.innerHTML = `

                            <div style="display:flex; align-items:center; gap:5px; margin-bottom:5px; font-size:12px;">

                                Sáng: <input type="text" id="sat-s1-${idx}" value="${s1_val}" class="time-input"

                                    style="width:50px; padding:2px; text-align:center"> - <input type="text"

                                    id="sat-s2-${idx}" value="${s2_val}" class="time-input"

                                    style="width:50px; padding:2px; text-align:center"></div>

                            <div style="display:flex; align-items:center; gap:5px; font-size:12px;">Chiều: <input

                                    type="text" id="sat-c1-${idx}" value="${c1_val}" class="time-input"

                                    style="width:50px; padding:2px; text-align:center"> - <input type="text"

                                    id="sat-c2-${idx}" value="${c2_val}" class="time-input"

                                    style="width:50px; padding:2px; text-align:center"></div>`;

                            fItem.appendChild(timeDiv);

                            frNs.appendChild(fItem);

                            });



                            const frDsLeft = document.getElementById('sat-patient-list-left');
                            const frDsRight = document.getElementById('sat-patient-list-right');
                            frDsLeft.innerHTML = '';
                            frDsRight.innerHTML = '';
                            satCache = {};
                            const midPoint = Math.ceil(data.patients.length / 2);

                            // Sắp xếp A-Z theo tên bệnh nhân

                            data.patients.sort((a, b) => (a.ten || '').localeCompare(b.ten || '', 'vi'));

                            data.patients.forEach((r, pIdx) => {

                            const bn_id = "BN_" + pIdx + "_" + (r.id || "0");

                            satCache[bn_id] = {info: r, items: [], frameId: `sat-bn-${bn_id}`};

                            const fBn = document.createElement('div');
                            fBn.id = `sat-bn-${bn_id}`;
                            fBn.style.cssText = 'background:white; border:1px solid #bdc3c7; padding:6px 10px; margin-bottom:6px; border-radius:5px; display:flex; flex-direction:column; gap:4px; ';

                            const tDiv = document.createElement('div');
                            tDiv.style.cssText = 'display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed #ecf0f1; padding-bottom:3px;';
                            tDiv.innerHTML = `<b style="font-size:12px; color:#2c3e50;">${pIdx+1}. ${r.ten.toUpperCase()} (${r.namSinh})</b> <span style="font-size:11px; color:#e67e22; background:#fef5e7; padding:1px 6px; border-radius:3px; border:1px solid #fadbd8; white-space:nowrap;">P. ${r.phong}</span>`;
                            fBn.appendChild(tDiv);

                            const flexContainer = document.createElement('div');
                            flexContainer.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-top:2px;';

                            const ttDiv = document.createElement('div');

                            ttDiv.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px;';

                            (r.thuThuat ? r.thuThuat.split(',').map(x => x.trim()).filter(x => x) : []).forEach((tt,

                            tIdx) => {

                            satCache[bn_id].items.push({name: tt, checked: false});

                            const cb = document.createElement('label');

                            cb.style.cssText = 'font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px;'; cb.title = tt;

                            const input = document.createElement('input');

                            input.type = 'checkbox'; input.id = `cb-sat-${bn_id}-${tIdx}`;

                            input.style.cssText = 'width:13px; height:13px; margin:0;';

                            input.onchange = function() { satCache[bn_id].items[tIdx].checked = this.checked;

                            updateSummarySat(); };

                            const tt_info = dataCache.proc?.find(p => p.ten.toLowerCase() === tt.toLowerCase());

                            const span = document.createElement('span');

                            span.innerText = (tt_info?.vietTat) || tt;

                            span.style.cssText = 'font-weight:bold; color:#34495e;';

                            cb.append(input, span); ttDiv.appendChild(cb);

                            });



                            const readyTimeDiv = document.createElement('div');

                            readyTimeDiv.style.cssText = 'display:flex; align-items:center; gap:5px; background:#fdf2e9; padding:2px 5px; border-radius:4px; border:1px dashed #e67e22;';

                            const readyLabel = document.createElement('label');

                            readyLabel.innerText = '⏱ Giờ SS:'; readyLabel.style.cssText = 'font-size:11px; color:#d35400; font-weight:bold; margin:0;';

                            const readyInput = document.createElement('input');

                            readyInput.type = 'time'; readyInput.value = '07:30'; readyInput.className =

                            'input-ready-time';

                            readyInput.style.cssText = 'padding:1px 3px; border:1px solid #ccc; border-radius:3px; font-size:12px; outline:none; cursor:pointer; color:#95a5a6; background:#f8f9fa;';

                            readyInput.onchange = function() { this.style.color = '#c0392b'; this.style.fontWeight =

                            'bold'; this.style.backgroundColor = '#fff'; this.style.borderColor = '#c0392b'; };

                            readyTimeDiv.append(readyLabel, readyInput);

                            flexContainer.append(ttDiv, readyTimeDiv);
                            fBn.appendChild(flexContainer);
                            if (pIdx < midPoint) {
                                frDsLeft.appendChild(fBn);
                            } else {
                                frDsRight.appendChild(fBn);
                            }

                            });

                            updateSummarySat();

                            }).getSatData();

                            }

                            function toggleSatStaff() {
                                const container = document.getElementById('sat-staff-container');
                                const btn = document.getElementById('btn-toggle-sat-staff');
                                if (!container || !btn) return;
                                if (container.style.display === 'none') {
                                    container.style.display = 'flex';
                                    btn.style.background = '#e74c3c';
                                    btn.innerText = '📁 Ẩn nhân sự';
                                } else {
                                    container.style.display = 'none';
                                    btn.style.background = '';
                                    btn.innerText = '👥 Chọn nhân sự';
                                }
                            }

                            function updateSummarySat() {
                             const counts = {};
                             for (const bid in satCache) satCache[bid].items.forEach(item => { if(item.checked)
                             counts[item.name] = (counts[item.name]||0)+1; });
                             const sumDiv = document.getElementById('sat-summary');
                             const sumContainer = document.getElementById('sat-summary-container');
                             const total = Object.values(counts).reduce((a,b)=>a+b,0);
                             if (!total) {
                                 if (sumContainer) sumContainer.style.display = 'none';
                                 sumDiv.innerHTML = '<div style="color:gray; text-align:center; margin-top:20px;">Chưa chọn thủ thuật nào.</div>';
                                 return;
                             }
                             if (sumContainer) sumContainer.style.display = 'flex';

                            let html = `<div

                                style="background:#2c3e50; color:white; padding:8px; border-radius:4px; margin-bottom:10px; display:flex; justify-content:space-between;">

                                <b>TỔNG CỘNG:</b> <b style="color:#f1c40f">${total} ca</b>

                            </div>`;

                            Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([tt,qty]) => {

                            html += `<div

                                style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #ecf0f1;">

                                <span>• ${tt}:</span> <b style="color:#e67e22">${qty} ca</b>

                            </div>`;

                            });

                            sumDiv.innerHTML = html;

                            }

                            function _satFilter(fn) {

                            const kw = document.getElementById('sat-search-bn').value.toLowerCase();

                            const normalizedKw = xoaDau(kw);

                            for (const bid in satCache) {

                            const bn = satCache[bid].info;

                            const str = `${bn.ten} ${bn.phong} ${bn.thuThuat}`.toLowerCase();

                            fn(bid, str, normalizedKw, kw);

                            }

                            }

                            function locBnSat() {

                            _satFilter((bid, str, normalizedKw, kw) => {

                            const display = (str.includes(kw) || xoaDau(str).includes(normalizedKw)) ? 'block' : 'none';

                            document.getElementById(satCache[bid].frameId).style.display = display;

                            });

                            }

                            function chonHetSat() {

                            _satFilter((bid, str, normalizedKw, kw) => {

                            if (!(str.includes(kw) || xoaDau(str).includes(normalizedKw))) return;

                            const f = document.getElementById(satCache[bid].frameId);

                            if (f?.style.display !== 'none') f.querySelectorAll('input[type="checkbox"]').forEach(cb =>

                            { if(!cb.checked) { cb.checked = true; cb.onchange(); } });

                            });

                            }

                            function boChonHetSat() {

                            _satFilter((bid, str, normalizedKw, kw) => {

                            if (!(str.includes(kw) || xoaDau(str).includes(normalizedKw))) return;

                            const f = document.getElementById(satCache[bid].frameId);

                            if (f?.style.display !== 'none') f.querySelectorAll('input[type="checkbox"]').forEach(cb =>

                            { if(cb.checked) { cb.checked = false; cb.onchange(); } });

                            });

                            }

                            function locSotSat() {

                            document.getElementById('sat-search-bn').value = '';

                            let count = 0;

                            for (const bid in satCache) {

                            const hasChecked = satCache[bid].items.some(item => item.checked);

                            document.getElementById(satCache[bid].frameId).style.display = hasChecked ? 'none' :

                            'block';

                            if (!hasChecked) count++;

                            }

                            if (!count) locBnSat();

                            }

                            function luuDsSat() {

                            const data = [];

                            for (const bid in satCache) {

                            const chosen = satCache[bid].items.filter(item => item.checked).map(item => item.name);

                            if (chosen.length > 0) {

                            const r = satCache[bid].info;

                            // Lấy giờ sẵn sàng hiện tại trên giao diện

                            const readyInput = document.querySelector(`#${satCache[bid].frameId} .input-ready-time`);

                            const readyTime = readyInput ? readyInput.value : "07:30";



                            // Thêm readyTime làm cột thứ 4

                            data.push([bid, r.ten, chosen.join(", "), readyTime]);

                            }

                            }

                            if (!data.length) return alert("Chưa có thủ thuật nào được tick để lưu!");



                            const wb = XLSX.utils.book_new();

                            // Khai báo tiêu đề cột thứ 4

                            const ws = XLSX.utils.aoa_to_sheet([["Mã Truy Xuất", "Tên Bệnh Nhân", "Thủ Thuật Đã Chọn",

                            "Giờ Sẵn Sàng"], ...data]);

                            ws['!cols'] = [{wch:20},{wch:25},{wch:50},{wch:15}];



                            XLSX.utils.book_append_sheet(wb, ws, "ThuThuatT7");

                            XLSX.writeFile(wb, `DS_ThuThuat_T7_${new Date().toISOString().slice(0,10)}.xlsx`);

                            }

                            function nhapDsSat() {

                            const input = document.createElement('input');

                            input.type = 'file'; input.accept = '.xlsx, .xls';

                            input.onchange = e => {

                            const reader = new FileReader();

                            reader.onload = function(e) {

                            const workbook = XLSX.read(new Uint8Array(e.target.result), {type:'array'});

                            const roa = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header:1});

                            boChonHetSat();

                            let count = 0;

                            roa.forEach((row, i) => {

                            if (i === 0 || !row[2]) return;

                            const bid = String(row[0]||'').trim(), ten = String(row[1]||'').trim().toLowerCase();

                            let targetBid = (bid && satCache[bid]) ? bid : Object.keys(satCache).find(k =>

                            satCache[k].info.ten.trim().toLowerCase() === ten);

                            if (!targetBid) return;



                            const available = satCache[targetBid].items.map((item,idx) => ({...item, idx})).filter(x =>

                            !x.checked);



                            // Đánh dấu các thủ thuật

                            row[2].split(',').map(x => x.trim()).forEach(tt => {

                            const match = available.find(x => x.name.toLowerCase() === tt.toLowerCase());

                            if (match) {

                            satCache[targetBid].items[match.idx].checked = true;

                            const cb = document.getElementById(`cb-sat-${targetBid}-${match.idx}`);

                            if (cb) cb.checked = true;

                            available.splice(available.indexOf(match), 1);

                            count++;

                            }

                            });



                            // 🔥 ĐỌC VÀ ĐIỀN GIỜ SẴN SÀNG TỪ EXCEL (Cột thứ 4 - row[3])

                            const importedTime = row[3];

                            if (importedTime) {

                            const readyInput = document.querySelector(`#${satCache[targetBid].frameId}

                            .input-ready-time`);

                            if (readyInput) {

                            readyInput.value = String(importedTime).trim();

                            // Đổi màu để Bác sĩ biết ô này đã được nạp dữ liệu thành công

                            readyInput.style.color = '#c0392b';

                            readyInput.style.fontWeight = 'bold';

                            readyInput.style.backgroundColor = '#fff';

                            readyInput.style.borderColor = '#c0392b';

                            }

                            }

                            });

                            updateSummarySat();

                            alert(`Đã khôi phục thành công ${count} tick thủ thuật và Giờ sẵn sàng từ file Excel!`);

                            };

                            reader.readAsArrayBuffer(e.target.files[0]);

                            };

                            input.click();

                            }

                            function getSatPayload() {

                            const allowed_staff = [], staff_shifts_dict = {};

                            for (const ten in t8_ns_vars) {

                            if (!t8_ns_vars[ten]) continue;

                            allowed_staff.push(ten);

                            const idx = satStaffIndices[ten];

                            const shifts = [];

                            const s1 = document.getElementById(`sat-s1-${idx}`)?.value, s2 =

                            document.getElementById(`sat-s2-${idx}`)?.value;

                            const c1 = document.getElementById(`sat-c1-${idx}`)?.value, c2 =

                            document.getElementById(`sat-c2-${idx}`)?.value;

                            if (s1 && s2) shifts.push([s1, s2]);

                            if (c1 && c2) shifts.push([c1, c2]);

                            staff_shifts_dict[ten] = shifts;

                            }

                            const final_pats = [];

                            for (const bid in satCache) {

                            const chosen = satCache[bid].items.filter(item => item.checked).map(item => item.name);

                            if (!chosen.length) continue;

                            const r = satCache[bid].info;

                            const readyInput = document.querySelector(`#${satCache[bid].frameId} .input-ready-time`);



                            // 🔥 Đã sửa: Gán giờ sẵn sàng vào biến gioVao để thuật toán Code.gs đọc được

                            const timeToRun = readyInput ? readyInput.value : "07:30";



                            final_pats.push({

                            id: r.id, ten: r.ten, ns: r.namSinh, tt: chosen.join(", "),

                            phong: r.phong, gioVao: timeToRun, loai: r.loaiBn

                            });

                            }

                            return {allowed_staff, staff_shifts_dict, final_pats};

                            }

                            function xepLichSat() {

                            window.viewingImportedScheduleFile = false;

                            const payload = getSatPayload();

                            if (!payload.allowed_staff.length) return alert("Vui lòng chọn Nhân sự đi làm!");

                            if (!payload.final_pats.length) return alert("Chưa có thủ thuật nào được chọn!");

                            const dateVal = document.getElementById('sat-schedule-date').value;

                            if (!dateVal) return alert("Vui lòng chọn Ngày làm việc Thứ 7 trước!");

                            const btn = document.getElementById('btn-xep-sat');

                            btn.innerText = '⏳ ĐANG XẾP...'; btn.disabled = true;

                            const startTime = performance.now();

                            google.script.run

                            .withSuccessHandler(res => {

                            const timeTaken = ((performance.now()-startTime)/1000).toFixed(2);

                            btn.innerText = '▶ XẾP LỊCH THỨ 7'; btn.disabled = false;

                            window.currentScheduleData = res.sched || res.schedule || [];

                            setUnscheduledData(res.dropped || res.unscheduled || res.rot || [], dateVal);

                            localStorage.setItem('meds_success', JSON.stringify(window.currentScheduleData));

                            const normalDate = document.getElementById('schedule-date');

                            if (normalDate) normalDate.value = dateVal;

                            const dashboardDate = document.getElementById('dashboard-date-filter');

                            if (dashboardDate) dashboardDate.value = dateVal;

                            document.querySelector('.nav-tab[data-tab="tab-schedule"]').click();

                            document.getElementById('schedule-search-input').value = '';

                            document.getElementById('schedule-result').innerHTML = `<div class="alert alert-success"

                                style="margin-top:10px">Xếp thành công: <b>${window.currentScheduleData.length}</b> ca.

                                Rớt: <b>${window.lastUnscheduledData.length}</b> ca. <span

                                    style="color:#555; font-size:13px;">(⏱ <b>${timeTaken} giây</b>)</span></div>`;

                            filterSchedule(); renderStats(window.lastUnscheduledData);

                            if (typeof renderPatientsTable === 'function') renderPatientsTable();

                            if (typeof loadDashboard === 'function') loadDashboard();

                            })

                            .withFailureHandler(err => { alert("Lỗi: " + err.message); btn.innerText = '▶ XẾP LỊCH THỨ 7'; btn.disabled = false; })

                            .runSaturdaySchedule(payload, dateVal);

                            }

                            function updateSatDefaultTime() {

                            const isSummer = document.querySelector('input[name="sat-season"]:checked').value ===

                            'summer';

                            const vals = isSummer ? ["07:00","11:30","13:00","16:30"] :

                            ["07:30","12:00","13:00","16:30"];

                            for (const ten in satStaffIndices) {

                            const idx = satStaffIndices[ten];

                            ['sat-s1','sat-s2','sat-c1','sat-c2'].forEach((prefix, i) => {

                            const el = document.getElementById(`${prefix}-${idx}`); if(el) el.value = vals[i];

                            });

                            }

                            }



                            // ============================================================

                            // 📤 XUẤT / NHẬP BỆNH NHÂN

                            // ============================================================

                            function exportPatients() {

                            if (!dataCache.pat.length) return alert("Không có dữ liệu bệnh nhân để xuất!");

                            const ws_data = [["STT","Tên BN","Năm Sinh","Ngày Vào","Giờ Vào","Giờ Bận","Giờ Ra","Phòng","Thủ Thuật"],

                            ...dataCache.pat.map((p, i) => [i+1, p.ten, p.namSinh, p.ngayVao, p.gioVao, p.gioBan,

                            p.gioRa, p.phong, p.thuThuat])];

                            const wb = XLSX.utils.book_new();

                            const ws = XLSX.utils.aoa_to_sheet(ws_data);

                            XLSX.utils.book_append_sheet(wb, ws, "DanhSachBenhNhan");

                            XLSX.writeFile(wb, `DS_BenhNhan_${new

                            Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.xlsx`);

                            }

                            function importPatients() {

                            const input = document.createElement('input');

                            input.type = 'file'; input.accept = '.xlsx, .xls';

                            input.onchange = e => {

                            const reader = new FileReader();

                            reader.onload = function(ev) {

                            const workbook = XLSX.read(new Uint8Array(ev.target.result), {type:'array'});

                            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header:1});

                            if (rows.length <= 1) return alert("File Excel trống hoặc không đúng định dạng!"); const

                                patientList=rows.slice(1).filter(r=> r[1]).map(r => ({

                                ten: r[1], namSinh: r[2]||'', ngayVao: r[3]||'', gioVao: r[4]||'',

                                gioBan: r[5]||'', gioRa: r[6]||'', phong: r[7]||'', thuThuat: r[8]||''

                                }));

                                const replaceAll = confirm("Bác sĩ có muốn THAY THẾ TOÀN BỘ danh sách hiện tại không?\n\n- OK: Xóa sạch, nạp mới.\n- Cancel: Bổ sung thêm.");

                                const btn = document.getElementById('btn-import-pat');

                                btn.innerText = "⏳ Đang xử lý..."; btn.disabled = true;

                                google.script.run.withSuccessHandler(res => { alert(res); btn.innerText = "⬇️ Nhập từ Excel"; btn.disabled = false; loadPatients(); }).bulkUpdatePatients(patientList,

                                replaceAll);

                                };

                                reader.readAsArrayBuffer(e.target.files[0]);

                                };

                                input.click();

                                }



                                // ============================================================

                                // 🔐 ĐĂNG NHẬP / PHÂN QUYỀN

                                function updateLogoutButton(username) {
                                    const container = document.getElementById('user-menu-container');
                                    const displayName = document.getElementById('user-display-name');
                                    if (container && displayName) {
                                        displayName.innerText = `👤 ${username}`;
                                        container.style.display = 'inline-block';
                                    }
                                }

                                function doLogout() {
                                    localStorage.removeItem('meds_session');
                                    document.getElementById('login-overlay').style.display = 'flex';
                                    document.getElementById('user-menu-container').style.display = 'none';
                                    document.getElementById('login-user').focus();
                                }

                                function applyPermissions(role, permsStr) {
                                    const allTabs = document.querySelectorAll('.nav-tab');
                                    const adminBtn = document.getElementById('nav-btn-admin');
                                    const dropdownAdminBtn = document.getElementById('user-menu-admin-btn');
                                    const dropdownDivider = document.getElementById('user-menu-divider');

                                    if (role === 'Admin' || permsStr === 'ALL') {
                                        allTabs.forEach(t => t.style.display = 'block');
                                        if (adminBtn) adminBtn.style.display = 'block';
                                        if (dropdownAdminBtn) dropdownAdminBtn.style.display = 'flex';
                                        if (dropdownDivider) dropdownDivider.style.display = 'block';
                                        document.body.classList.remove('read-only-user');
                                    } else {
                                        const allowed = permsStr.split(',').map(s => s.trim());
                                        allowed.push('tab-home');
                                        allTabs.forEach(t => { t.style.display = allowed.includes(t.getAttribute('data-tab')) ? 'block' : 'none'; });
                                        if (dropdownAdminBtn) dropdownAdminBtn.style.display = 'none';
                                        if (dropdownDivider) dropdownDivider.style.display = 'none';
                                        document.body.classList.add('read-only-user');
                                    }
                                }

                                function togglePermissionsBox() {

                                const box = document.getElementById('acc-perms-box');

                                const isAdmin = document.getElementById('acc-role').value === 'Admin';

                                box.style.opacity = isAdmin ? '0.5' : '1';

                                box.style.pointerEvents = isAdmin ? 'none' : 'auto';

                                }

                                // ============================================================

                                // QUẢN LÝ TÀI KHOẢN (TƯƠNG THÍCH MẬT KHẨU MÃ HÓA)

                                // ============================================================

                                function loadAccounts() {

                                google.script.run.withSuccessHandler(data => {

                                adminAccCache = data;

                                const tbody = document.getElementById('acc-list');

                                const PERM_MAP = {'tab-patients':'🛌 Bệnh Nhân','tab-schedule':'⚡ Xếp Lịch','tab-sat':'📅 Thứ 7','tab-busy':'⏱ Giờ Bận','tab-stats':'📊 Thống Kê','tab-utils':'🛠 Tiện Ích','tab-kiemtra':'✅ Kiểm Tra Lỗi','tab-machines':'⚙️ Máy Móc','tab-procedures':'💉 Thủ Thuật','tab-rooms':'🏥 Phòng','tab-staff':'👨‍⚕️ Nhân Sự'};                                 tbody.innerHTML = data.map((acc, i) => {

                                let tenQuyen = "👑 Toàn quyền (Admin)";

                                if (acc.perms !== 'ALL') tenQuyen = acc.perms.split(',').map(p => PERM_MAP[p.trim()] ||

                                p.trim()).join(', ');



                                return `<tr class="editable-row" onclick="editAccount(${i})">

                                    <td>${acc.id}</td>

                                    <td style="font-size:15px; color:#2c3e50;"><strong>${acc.user}</strong></td>

                                    <td><span style="color:#7f8c8d; font-style:italic; font-size:12px;">🔒 Đã bảo

                                            mật</span></td>

                                    <td><span

                                            style="color:${acc.role==='Admin'?'#c0392b':'#2980b9'}; font-weight:bold; background:${acc.role==='Admin'?'#fadbd8':'#d6eaf8'}; padding:4px 8px; border-radius:5px;">${acc.role}</span>

                                    </td>

                                    <td style="font-size:12px; line-height:1.6; color:#27ae60; font-weight:500;">

                                        ${tenQuyen}</td>

                                    <td><button class="btn-danger"

                                            style="border-radius:5px; padding:6px 12px; font-weight:bold; cursor:pointer;"

                                            onclick="event.stopPropagation(); deleteAccount('${acc.id}', '${acc.user}')">🗑️

                                            Xóa</button></td>

                                </tr>`;

                                }).join('');

                                }).getAccounts();

                                }



                                function editAccount(i) {

                                const acc = adminAccCache[i];

                                document.getElementById('acc-id').value = acc.id;

                                document.getElementById('acc-user').value = acc.user;



                                // 🔥 ĐÃ SỬA: Để trống mật khẩu khi bấm sửa, kèm dòng nhắc nhở

                                const passInput = document.getElementById('acc-pass');

                                passInput.value = '';

                                passInput.placeholder = "(Để trống nếu không đổi MK)";



                                document.getElementById('acc-role').value = acc.role;

                                togglePermissionsBox();

                                document.querySelectorAll('.perm-cb').forEach(cb => { cb.checked = acc.role === 'User'

                                && acc.perms ? acc.perms.split(',').map(s=>s.trim()).includes(cb.value) : false; });

                                document.getElementById('btn-save-acc').innerText = "Cập nhật MK / Quyền";

                                }



                                function luuTaiKhoan() {

                                const id = document.getElementById('acc-id').value;

                                const user = document.getElementById('acc-user').value;

                                const pass = document.getElementById('acc-pass').value;

                                const role = document.getElementById('acc-role').value;



                                if (!user) return showCustomAlert("Lưu ý", "Vui lòng nhập tên tài khoản!");

                                // 🔥 ĐÃ SỬA: Chỉ bắt buộc nhập mật khẩu nếu là tài khoản tạo mới (không có ID)

                                if (!id && !pass) return showCustomAlert("Lưu ý", "Vui lòng nhập mật khẩu cho tài khoản mới!");



                                const perms = role === 'User' ?

                                Array.from(document.querySelectorAll('.perm-cb:checked')).map(cb => cb.value).join(', ')

                                : 'ALL';

                                const btn = document.getElementById('btn-save-acc');

                                btn.innerText = "Đang lưu..."; btn.disabled = true;



                                google.script.run.withSuccessHandler(msg => {

                                showCustomAlert("Thành công", msg);

                                huySuaTaiKhoan();

                                loadAccounts();

                                btn.innerText = "Lưu Tài Khoản";

                                btn.disabled = false;

                                }).saveAccount(id, user, pass, role, perms);

                                }



                                function huySuaTaiKhoan() {

                                ['acc-id','acc-user','acc-pass'].forEach(id => { const el = document.getElementById(id);

                                if(el) el.value=''; });

                                document.getElementById('acc-pass').placeholder = "Nhập mật khẩu...";

                                document.getElementById('acc-role').value = 'User';

                                document.querySelectorAll('.perm-cb').forEach(cb => cb.checked = false);

                                togglePermissionsBox();

                                document.getElementById('btn-save-acc').innerText = "Lưu Tài Khoản";

                                }

                                function deleteAccount(id, user) {

                                if (user.toLowerCase() === 'admin') return showCustomAlert("Cảnh báo bảo mật", "Không được phép xóa tài khoản Admin gốc!");

                                showCustomConfirm("Xóa tài khoản", `Bác sĩ có chắc chắn muốn xóa vĩnh viễn tài khoản [

                                ${user} ] không?`, function() {

                                google.script.run.withSuccessHandler(() => loadAccounts()).deleteAccount(id);

                                });

                                }



                                // ============================================================

                                // 🔄 AUTO SYNC

                                // ============================================================

                                function syncPatients() { loadEntity('getBenhNhan', 'pat', renderPatientsTable, [], true); }

                                function syncStaff() { loadEntity('getNhanSu', 'staff', renderStaffTable, [
                                    () => { if (typeof renderBusyStaff === 'function') renderBusyStaff(); },
                                    () => { if (typeof locSotSat === 'function') locSotSat(); }
                                ], true); }

                                function isPatientFormActive() {
                                    const activeEl = document.activeElement;
                                    const tabPat = document.getElementById('tab-patients');
                                    if (!tabPat) return false;

                                    // 1. Kiểm tra nếu tiêu điểm (focus) nằm trong form của tab-patients
                                    if (activeEl && tabPat.contains(activeEl) && 
                                        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA')) {
                                        return true;
                                    }

                                    // 2. Kiểm tra nếu các ô nhập liệu có chứa dữ liệu dở dang
                                    const patName = document.getElementById('pat-name')?.value || '';
                                    if (patName.trim() !== '') return true;

                                    const patYear = document.getElementById('pat-year')?.value || '';
                                    if (patYear.trim() !== '') return true;

                                    const patTime = document.getElementById('pat-time')?.value || '';
                                    if (patTime.trim() !== '') return true;

                                    const busyStart = document.getElementById('busy-start')?.value || '';
                                    if (busyStart.trim() !== '') return true;

                                    const busyEnd = document.getElementById('busy-end')?.value || '';
                                    if (busyEnd.trim() !== '') return true;

                                    const patLeave = document.getElementById('pat-leave')?.value || '';
                                    if (patLeave.trim() !== '') return true;

                                    // Kiểm tra xem có thủ thuật nào đang được chọn không
                                    const checkedProcs = document.querySelectorAll('.pat-proc-cb:checked');
                                    if (checkedProcs.length > 0) return true;

                                    return false;
                                }

                                function isBusyFormActive() {
                                    const activeEl = document.activeElement;
                                    const tabBusy = document.getElementById('tab-busy');
                                    if (!tabBusy) return false;

                                    // 1. Kiểm tra nếu tiêu điểm (focus) nằm trong form của tab-busy
                                    if (activeEl && tabBusy.contains(activeEl) && 
                                        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA')) {
                                        return true;
                                    }

                                    // 2. Kiểm tra nếu các ô nhập liệu của tab-busy có chứa dữ liệu dở dang
                                    const staffFrom = document.getElementById('busy-staff-from')?.value || '';
                                    if (staffFrom.trim() !== '') return true;

                                    const staffTo = document.getElementById('busy-staff-to')?.value || '';
                                    if (staffTo.trim() !== '') return true;

                                    const patInput = document.getElementById('busy-pat-input')?.value || '';
                                    if (patInput.trim() !== '') return true;

                                    const patFrom = document.getElementById('busy-pat-from')?.value || '';
                                    if (patFrom.trim() !== '') return true;

                                    const patTo = document.getElementById('busy-pat-to')?.value || '';
                                    if (patTo.trim() !== '') return true;

                                    return false;
                                }

                                function startAutoSync() {
                                    setInterval(() => {
                                        if (window.viewingImportedScheduleFile) return;
                                        const activeTab = document.querySelector('.nav-tab.active')?.getAttribute('data-tab');

                                        // Đồng bộ Xếp lịch
                                        if (activeTab === 'tab-schedule' || activeTab === 'tab-home') {
                                            loadScheduleList();
                                        }

                                        // Đồng bộ Bệnh Nhân (Bệnh nhân và nhân sự tải tự động khi tab active)
                                        // Đồng bộ Giờ Bận/Ra Viện (Bệnh nhân và nhân sự tải tự động khi tab active)
                                    }, 15000); // Tự động cập nhật lịch mỗi 15 giây
                                }

                                

                                window.onload = function() {

                                const sessionStr = localStorage.getItem('meds_session');

                                if (sessionStr) {

                                const session = JSON.parse(sessionStr);

                                document.getElementById('login-overlay').style.display = 'none';

                                updateLogoutButton(session.username);

                                applyPermissions(session.role, session.permissions);

                                

                                // Mở tab theo hash trên URL, nếu chưa có thì mặc định tab-home

                                if (window.location.hash && window.location.hash !== '#') {

                                    window.dispatchEvent(new Event('hashchange'));

                                } else {

                                    window.location.hash = '#tab-home';

                                }

                                

                                if (session.role === 'Admin') loadAccounts();

                                startAutoSync();

                                } else {

                                document.getElementById('login-user')?.focus();

                                }

                                };

                                window.addEventListener('load', function() {

                                setTimeout(function() {

                                if (typeof loadAllData === 'function') loadAllData();

                                if (typeof loadDashboard === 'function') loadDashboard();

                                }, 800);

                                });



                                // ============================================================

                                // 📢 MARQUEE

                                // ============================================================

                                function luuDongChuChay(btn) {

                                const noiDungMoi = document.getElementById('admin-marquee-input').value;

                                if (!noiDungMoi) return alert("⚠️ Vui lòng nhập nội dung thông báo trước khi lưu!");

                                const textGoc = btn.innerText;

                                btn.innerText = "⏳ Đang lưu..."; btn.disabled = true;

                                const marqueeTag = document.getElementById('thong-bao-chay');

                                if (marqueeTag) marqueeTag.innerText = noiDungMoi;

                                google.script.run

                                .withSuccessHandler(() => { btn.innerText = textGoc; btn.disabled = false; alert("✅ Đã lưu thông báo mới thành công!"); })

                                .withFailureHandler(err => { btn.innerText = textGoc; btn.disabled = false; alert("❌ Lỗi khi lưu: " + err.message); })

                                .luuThongBaoDongChuChay(noiDungMoi);

                                }



                                // ============================================================

                                // 🤖 KHO HUẤN LUYỆN AI

                                // ============================================================

                                function logHL(msg) { const el = document.getElementById('hl-log'); if(el) { el.value +=

                                msg + "\n"; el.scrollTop = el.scrollHeight; } }

                                function parseTimeToMinutes(timeStr) {

                                if (!timeStr) return 0;

                                const parts = String(timeStr).trim().toLowerCase().replace('h',':').split(':');

                                return (parseInt(parts[0])||0)*60 + (parseInt(parts[1])||0);

                                }

                                function handleHLFile(event) {

                                const file = event.target.files[0];

                                if (!file) return;

                                logHL("⏳ Đang phân tích file: " + file.name);

                                const reader = new FileReader();

                                reader.onload = function(e) {

                                try {

                                let workbook;

                                try { workbook = XLSX.read(new Uint8Array(e.target.result), {type:'array'}); }

                                catch(err) { throw new Error("Cấu trúc file bị hỏng hoặc không đúng chuẩn."); }

                                if (!workbook?.SheetNames?.length) { logHL("❌ LỖI ĐỊNH DẠNG: File bị hỏng. Hãy mở bằng Excel và Save As lại nhé."); event.target.value=""; return; }



                                function bocTachGioExcel(cellVal) {

                                if (cellVal === undefined || cellVal === null || cellVal === '') return null;

                                if (typeof cellVal === 'number' && cellVal >= 0 && cellVal < 1) { const

                                    totalMins=Math.round(cellVal*24*60), h=Math.floor(totalMins/60), m=totalMins%60;

                                    return `${h<10?'0'+h:h}:${m<10?'0'+m:m}`; } const

                                    match=String(cellVal).trim().match(/(\d{1,2}:\d{2})/); return match ? match[1] :

                                    null; } let records=[], formatTypeUsed='' ; const today=new

                                    Date().toLocaleDateString('vi-VN'); for (let s=0; s < workbook.SheetNames.length;

                                    s++) { const sheet=workbook.Sheets[workbook.SheetNames[s]]; const

                                    rawData=XLSX.utils.sheet_to_json(sheet, {header:1, defval:""}); let headerRow=-1,

                                    formatType='' , colIdx={nv:-1, tt:-1, bd:-1, kt:-1}; for (let i=0; i < Math.min(20,

                                    rawData.length); i++) { const rowArr=rawData[i]; if (!Array.isArray(rowArr))

                                    continue; const rowString=rowArr.join('|').toUpperCase(); if

                                    (rowString.includes('HOTEN') && rowString.includes('HSBA') &&

                                    !rowString.includes('GIODIENRA')) { headerRow=i; formatType='MATRIX' ; break; } else

                                    if ((rowString.includes('NHANVIEN')||rowString.includes('NHÂN VIÊN')) &&

                                    (rowString.includes('GIODIENRA')||rowString.includes('BẮT ĐẦU'))) { headerRow=i;

                                    formatType='FLAT' ; rowArr.forEach((cell, j)=> {

                                    const v = String(cell||'').trim().toUpperCase().replace(/\r?\n|\r/g,'');

                                    if (v.includes('NHANVIEN')||v==='HOTEN'||v.includes('NHÂN VIÊN')) colIdx.nv=j;

                                    if (v.includes('DICHVU')||v.includes('THỦ THUẬT')) colIdx.tt=j;

                                    if (v.includes('GIODIENRA')||v.includes('BẮT ĐẦU')) colIdx.bd=j;

                                    if (v.includes('GIOKETTHUC')||v.includes('KẾT THÚC')) colIdx.kt=j;

                                    });

                                    break;

                                    }

                                    }

                                    if (headerRow === -1) continue;



                                    if (formatType === 'FLAT') {

                                    for (let i = headerRow+1; i < rawData.length; i++) { const row=rawData[i]; if

                                        (!Array.isArray(row)||!row.length) continue; const

                                        nv=String(row[colIdx.nv]||'').trim(), tt=colIdx.tt!==-1 ?

                                        String(row[colIdx.tt]||'').trim() : '' ; const

                                        timeBD=bocTachGioExcel(row[colIdx.bd]), timeKT=bocTachGioExcel(row[colIdx.kt]);

                                        if (nv && timeBD && timeKT) { const bdMins=parseTimeToMinutes(timeBD),

                                        ktMins=parseTimeToMinutes(timeKT), tgThucTe=ktMins-bdMins; if (tgThucTe> 0 &&

                                        tgThucTe < 480) records.push([today, file.name, nv, tt, bdMins, ktMins,

                                            tgThucTe, bdMins-420]); } } } else if (formatType==='MATRIX' ) { const

                                            headers=rawData[headerRow]; for (let i=headerRow+1; i < rawData.length; i++)

                                            { const row=rawData[i]; if (!Array.isArray(row)||!row.length) continue; for

                                            (let j=2; j < row.length; j++) { const

                                            lines=String(row[j]||'').trim().split(/\r?\n/); if (lines.length>= 2 &&

                                            lines[0].includes('-')) {

                                            const timeParts = lines[0].split('-'), nv = lines[1]?.trim()||'', tt =

                                            headers[j] ? String(headers[j]).trim() : '';

                                            const timeBD = bocTachGioExcel(timeParts[0]), timeKT =

                                            bocTachGioExcel(timeParts[1]);

                                            if (timeBD && timeKT && nv) {

                                            const bdMins = parseTimeToMinutes(timeBD), ktMins =

                                            parseTimeToMinutes(timeKT), tgThucTe = ktMins-bdMins;

                                            if (tgThucTe > 0 && tgThucTe < 480) records.push([today, file.name, nv, tt,

                                                bdMins, ktMins, tgThucTe, bdMins-420]); } } } } } if (records.length> 0)

                                                { formatTypeUsed = formatType; break; }

                                                }



                                                if (records.length > 0) {

                                                logHL(`🚀 Đã bóc tách thành công ${records.length} ca (Dạng

                                                ${formatTypeUsed}). Đang lưu...`);

                                                google.script.run.withSuccessHandler(res => { logHL("✅ " + res);

                                                loadHLData(); }).withFailureHandler(err => logHL("❌ Lỗi lưu: " +

                                                err.message)).saveAITrainingData(records);

                                                } else logHL("❌ Không tìm thấy dữ liệu giờ giấc hợp lệ trong bất kỳ Sheet nào của file!");

                                                } catch(err) { logHL("❌ Lỗi kỹ thuật: " + err.message); }

                                                event.target.value = "";

                                                };

                                                reader.readAsArrayBuffer(file);

                                                }

                                                function loadHLData() {

                                                const tbody = document.querySelector('#hl-table tbody');

                                                if (!tbody) return;

                                                tbody.innerHTML = `<tr> <td colspan="5" style="text-align:center;">⏳ Đang tải dữ liệu...

                                                    </td>

                                                </tr>`; google.script.run.withSuccessHandler(data => {

                                                if (!data?.length) { tbody.innerHTML = `<tr> <td colspan="5" style="text-align:center; color:gray">Kho dữ liệu

                                                        hiện đang trống.</td>

                                                </tr>`; return; } tbody.innerHTML = data.slice(0, 100).map(row => `<tr>

                                                    <td>${row[0]}</td>

                                                    <td style="font-weight:bold; color:#2c3e50;">${row[2]}</td>

                                                    <td>${row[3]}</td>

                                                    <td style="color:#27ae60; font-weight:bold; text-align:center;">

                                                        ${row[6]} ph</td>

                                                    <td style="text-align:center;">+${row[7]} ph</td>

                                                </tr>`).join('');

                                                }).getAITrainingData();

                                                }

                                                function clearHLData() {

                                                if (!confirm("⚠️ Bác sĩ có chắc chắn muốn xóa TOÀN BỘ dữ liệu huấn luyện AI? Hành động này không thể hoàn tác!")) return;

                                                logHL("🗑 Đang tiến hành xóa kho dữ liệu...");

                                                google.script.run.withSuccessHandler(res => { logHL("✅ " + res);

                                                loadHLData(); }).clearAITrainingData();

                                                }

                                                function exportAIPrompt() {

                                                logHL("⏳ Đang tạo Siêu lệnh (Mega-Prompt)...");

                                                google.script.run.withSuccessHandler(data => {

                                                if (!data?.length) return alert("Chưa có dữ liệu huấn luyện nào!");

                                                let promptText = "Bạn là Chuyên gia Khoa học Dữ liệu và Quản lý Y tế.\n";

                                                promptText += "Nhiệm vụ của bạn là tối ưu hóa thuật toán xếp lịch thủ thuật cho Khoa Y học Cổ truyền - Phục hồi Chức năng.\n\n";

                                                promptText += "BƯỚC 1: Phân tích dữ liệu ca y lệnh dưới đây để tìm quy luật (Nhịp điệu, thời gian thực tế, transition time...).\n";

                                                promptText += "BƯỚC 2: Tôi sẽ cung cấp code Javascript ở tin nhắn tiếp theo.\n";

                                                promptText += "BƯỚC 3: Viết lại thuật toán xếp lịch để cân bằng tải.\n\n";

                                                promptText += "=== KHO DỮ LIỆU HUẤN LUYỆN ===\n";

                                                promptText += "Ngày | File Nguồn | Nhân Viên | Thủ Thuật | Phút Bắt Đầu | Phút Kết Thúc | Thực Tế (phút) | Khoảng Cách 7h (phút)\n";

                                                data.forEach(row => { promptText += `${row.join(' | ')}\n`; });

                                                const blob = new Blob([promptText], {type:'text/plain;charset=utf-8'});

                                                const url = URL.createObjectURL(blob);

                                                const a = document.createElement('a');

                                                a.href = url; a.download = `Bo_Nao_AI_Xep_Lich_${new

                                                Date().toLocaleDateString('vi-VN').replace(/\//g,'')}.txt`;

                                                document.body.appendChild(a); a.click(); document.body.removeChild(a);

                                                URL.revokeObjectURL(url);

                                                logHL("✅ Đã xuất file thành công!");

                                                }).getAITrainingData();

                                                }



                                                // ============================================================

                                                // 📅 DATE FORMAT

                                                // ============================================================

                                                function autoFormatDate(obj) {

                                                let val = obj.value.replace(/\D/g,'');

                                                if (val.length > 8) val = val.substring(0, 8);

                                                if (val.length >= 5) obj.value =

                                                `${val.substring(0,2)}/${val.substring(2,4)}/${val.substring(4,8)}`;

                                                else if (val.length >= 3) obj.value =

                                                `${val.substring(0,2)}/${val.substring(2,4)}`;

                                                else obj.value = val;

                                                }



                                                // ============================================================

                                                // 🏠 DASHBOARD

                                                // ============================================================

                                                function loadDashboard() {
    const datePicker = document.getElementById('dashboard-date-filter');
    
    if (!datePicker.value) {
        google.script.run.withSuccessHandler(function(rawSched) {
            let activeDateStr = null;
            if (rawSched && rawSched.length > 0 && rawSched[0][0]) {
                activeDateStr = rawSched[0][0]; 
            }
            
            let activeYMD = null;
            if (activeDateStr) {
                const parts = activeDateStr.split('/');
                if (parts.length >= 3) activeYMD = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }

            const d = new Date();
            const safeTodayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

            if (activeYMD && activeYMD !== safeTodayStr) {
                alert(`⚠️ HỆ THỐNG PHÁT HIỆN:\nDữ liệu của ngày ${activeDateStr} chưa được chốt sổ!\nMặc định sẽ hiển thị dữ liệu của ngày này để bạn tiếp tục xử lý.`);
                datePicker.value = activeYMD;
            } else {
                datePicker.value = safeTodayStr;
            }
            
            window._systemActiveYMD = activeYMD || safeTodayStr;
            loadDashboard(); // Resume
        }).getLichTrinh();
        return;
    }

    const selectedDate = datePicker.value;
    const displayEl = document.getElementById('display-date');
    if (displayEl) displayEl.textContent = selectedDate.split('-').reverse().join('/');

    const historyInput = document.getElementById('history-date');
    if (historyInput && historyInput.value !== selectedDate) {
        historyInput.value = selectedDate;
    }

    const d = new Date();
    const safeTodayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    
    const isLiveMode = (window._systemActiveYMD === selectedDate) || (!window._systemActiveYMD && selectedDate === safeTodayStr);

    if (isLiveMode) {
        if (window.viewingImportedScheduleFile) {
            if (typeof restoreHistoryTabs === 'function') restoreHistoryTabs();
        }
        
        google.script.run.withSuccessHandler(patData => {
            const rawData = patData || [];
            rawData.forEach((item, i) => { if (item) item.sheetIndex = i; });
            const cleaned = rawData.filter(item => item && item.ten && item.ten.trim() !== '');
            cleaned.forEach((item, idx) => { item.index = idx; });
            const el = document.getElementById('statBN'); 
            if(el) el.textContent = cleaned.length; 
            window.dataCache = window.dataCache||{};
            window.dataCache.pat = cleaned; 
        }).getBenhNhan();

        google.script.run.withSuccessHandler(staffData => {
            const rawData = staffData || [];
            rawData.forEach((item, i) => { if (item) item.sheetIndex = i; });
            const cleaned = rawData.filter(item => item && item.ten && item.ten.trim() !== '');
            cleaned.forEach((item, idx) => { item.index = idx; });
            const working = cleaned.filter(s => { 
                const st = s.trangThai || ''; 
                const r = s.vaiTro || ''; 
                return st==='Đi làm' && r!=='Điều dưỡng'; 
            }).length;
            const el = document.getElementById('statStaff'); 
            if(el) el.textContent = working;
            window.dataCache.staff = cleaned;
        }).getNhanSu();

        const statScheduledEl = document.getElementById('statScheduled');
        const statDroppedEl = document.getElementById('statDropped');
        if (statScheduledEl) statScheduledEl.textContent = "...";
        if (statDroppedEl) statDroppedEl.textContent = "...";

        google.script.run.withSuccessHandler(function(rawSched) {
            const validData = rawSched.filter(item => item.ngay === selectedDate || item[0] === selectedDate || (window._systemActiveYMD === selectedDate && item[0]));
            
            const dayData = validData.filter(item => { const g = item.gioDienRa||item[5]||''; return g && g!=='--' && !g.includes('Rớt'); }).map(item => [item.ngay||item[0], item.tenBN||item[1], item.namSinh||item[2], item.phong||item[3], item.thuThuat||item[4], item.gioDienRa||item[5], item.gioKetThuc||item[6], item.nvChinh||item[7], item.nvPhu||item[8], item.may||item[9], item.giuong||item[10]]);
            const rotDataSheets = validData.filter(item => { const g = item.gioDienRa||item[5]||''; return g==='--'||g.includes('Rớt'); }).map(item => [item.ngay||item[0], item.tenBN||item[1], item.namSinh||item[2], item.phong||item[3], item.thuThuat||item[4], '❌ Rớt', '--', '--', '--', '--', '--', 'Thiếu nhân sự/Máy']);
            
            let rotDataLocal = [];
            try {
                if (localStorage.getItem('meds_schedule_date') === selectedDate) {
                    rotDataLocal = (JSON.parse(localStorage.getItem('meds_unscheduled')||'[]')).map(u => [selectedDate, u.bn||u.tenBN||'', u.ns||u.namSinh||'', u.room||u.phong||'', u.tt||u.thuThuat||'', '❌ Rớt', '--', '--', '--', '--', '--', u.reason||'Quá tải/Hết giờ']);
                }
            } catch(e) {}
            const rotData = rotDataSheets.length > 0 ? rotDataSheets : rotDataLocal;
            
            if (statScheduledEl) statScheduledEl.textContent = dayData.length;
            if (statDroppedEl) statDroppedEl.textContent = rotData.length;
            
            if (typeof renderDashboardPreview === 'function') renderDashboardPreview([...dayData, ...rotData]);
            if (typeof renderCharts === 'function') renderCharts(dayData);
        }).withFailureHandler(err => { console.error("Lỗi tải lịch:", err); }).getLichTrinh();

    } else {
        // --- CHẾ ĐỘ LỊCH SỬ ---
        const statScheduledEl = document.getElementById('statScheduled');
        const statDroppedEl = document.getElementById('statDropped');
        const statBN = document.getElementById('statBN');
        const statStaff = document.getElementById('statStaff');
        if (statScheduledEl) statScheduledEl.textContent = "...";
        if (statDroppedEl) statDroppedEl.textContent = "...";
        if (statBN) statBN.textContent = "...";
        if (statStaff) statStaff.textContent = "...";

        const processHistoryData = (data) => {
            const fullData = Array.isArray(data) ? { schedule: data, patients: [], staffBusy: [], patBusy: [] } : data;
            
            window._historyCache = window._historyCache || {};
            window._historyCache[selectedDate] = fullData;
            window.viewingImportedScheduleFile = true;
            window._viewingHistoryDate = selectedDate;
            window.currentScheduleData = fullData.schedule || [];
            
            if (typeof applyHistoryDataToTabs === 'function') applyHistoryDataToTabs(fullData, selectedDate);
            if (typeof filterSchedule === 'function') filterSchedule();

            if (statBN) statBN.textContent = (fullData.patients || []).length;
            if (statStaff) statStaff.textContent = (fullData.staffBusy || []).length;

            const sched = fullData.schedule || [];
            const dayData = sched.filter(item => { const g = item.gioDienRa||''; return g && g!=='--' && !g.includes('Rớt'); }).map(item => [item.ngay, item.tenBN, item.namSinh, item.phong, item.thuThuat, item.gioDienRa, item.gioKetThuc, item.nvChinh, item.nvPhu, item.may, item.giuong]);
            const rotData = sched.filter(item => { const g = item.gioDienRa||''; return g==='--'||g.includes('Rớt'); }).map(item => [item.ngay, item.tenBN, item.namSinh, item.phong, item.thuThuat, '❌ Rớt', '--', '--', '--', '--', '--', 'Thiếu nhân sự/Máy']);
            
            if (statScheduledEl) statScheduledEl.textContent = dayData.length;
            if (statDroppedEl) statDroppedEl.textContent = rotData.length;
            
            if (typeof renderDashboardPreview === 'function') renderDashboardPreview([...dayData, ...rotData]);
            if (typeof renderCharts === 'function') renderCharts(dayData);
        };

        if (window._historyCache && window._historyCache[selectedDate]) {
            processHistoryData(window._historyCache[selectedDate]);
        } else {
            google.script.run.withSuccessHandler(processHistoryData).withFailureHandler(err => {
                console.error("Lỗi tải lịch sử Dashboard: " + err);
            }).getHistoryFullData(selectedDate);
        }
    }
}

function renderDashboardPreview(data) {

                                                if (!data) return;

                                                homeFilteredData = data; // Lưu dữ liệu vào bộ nhớ riêng của Trang chủ



                                                const el = document.getElementById('todaySchedulePreview');

                                                if (!homeFilteredData.length) {

                                                el.innerHTML = `<div style="padding:40px; text-align:center; color:#999;">📅 Chưa có lịch

                                                    trình hôm nay</div>`; return;

                                                }



                                                const headers = ["STT","Tên Bệnh Nhân","Phòng","Thủ Thuật","Bắt Đầu","Kết Thúc","NV Chính","Máy"];

                                                el.innerHTML = `

                                                <table class="table">

                                                    <thead>

                                                        <tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr>

                                                    </thead>

                                                    <tbody>${homeFilteredData.map((r, i) => {

                                                        const isDropped = String(r[5] || '').includes('Rớt') ||

                                                        String(r[5] || '') === '--';

                                                        return `

                                                        <tr class="${isDropped ? 'row-dropped' : 'row-scheduled'}">

                                                            <td>${i + 1}</td>

                                                            <td><b>${r[1]||''}</b></td>

                                                            <td>${r[3]||''}</td>

                                                            <td>${r[4]||''}</td>

                                                            <td style="font-weight:bold;">${r[5]||''}</td>

                                                            <td style="font-weight:bold;">${r[6]||''}</td>

                                                            <td>${r[7]||''}</td>

                                                            <td>${r[9]||''}</td>

                                                        </tr>`;

                                                        }).join('')}

                                                    </tbody>

                                                </table>

                                                `;



                                                // Ẩn/xóa thanh phân trang bên ngoài nếu có

                                                const outerPagination =

                                                document.getElementById('home-pagination-container');

                                                if (outerPagination) outerPagination.innerHTML = '';



                                                // Gắn tính năng sắp xếp cho bảng mới tạo

                                                if (typeof setupTableSorting === 'function') setupTableSorting(el);

                                                }

                                                function filterDashboardTable() {

                                                try {

                                                const keyword =

                                                document.getElementById("dashboard-search-input")?.value.toLowerCase().trim()

                                                || '';

                                                const tbody = document.querySelector("#todaySchedulePreview tbody");

                                                if (!tbody) return;

                                                Array.from(tbody.getElementsByTagName("tr")).forEach(row => {

                                                const text = row.textContent.toLowerCase();

                                                row.style.display = (text.includes(keyword) ||

                                                xoaDau(text).includes(xoaDau(keyword))) ? "" : "none";

                                                });

                                                } catch(e) { console.error("Lỗi lọc:", e); }

                                                }

                                                window.filterDashboardTable = filterDashboardTable;

                                                function renderCharts(data) {

                                                const valid = data.filter(r => r[4] && r[7]);

                                                const procCount = {}, staffLoad = {};

                                                valid.forEach(r => { procCount[r[4]] = (procCount[r[4]]||0)+1;

                                                staffLoad[r[7]] = (staffLoad[r[7]]||0)+1; });

                                                const colors =

                                                ['#1e3d2b','#2d5a3d','#3e6b4f','#4a7c5f','#5a8d70','#6a9e80','#7aaf91','#8abfa2','#9ad0b3','#aae0c4'];

                                                const barRow = (label, val, max, color) => `
                                                <div class="dash-chart-row" style="display:flex;align-items:center;gap:10px;margin-bottom:10px;transition:all 0.2s;">
                                                    <div
                                                        style="min-width:105px;max-width:105px;font-size:0.75rem;color:#2c3e50;font-weight:600;text-align:right;word-break:break-word;line-height:1.3;">
                                                        ${label}</div>
                                                    <div
                                                        style="flex:1;height:14px;background:#f1f3f5;border-radius:7px;box-shadow:inset 0 1px 2px rgba(0,0,0,0.06);overflow:hidden;">
                                                        <div
                                                            style="width:${(val/max*100)}%;height:100%;background:linear-gradient(90deg, ${color}cc, ${color});border-radius:7px;transition:width 0.8s cubic-bezier(0.4, 0, 0.2, 1);box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                                        </div>
                                                    </div>
                                                    <div
                                                        style="min-width:28px;font-size:0.75rem;color:#2c3e50;font-weight:bold;text-align:left;">
                                                        ${val}</div>
                                                </div>`;

                                                const sortedProc =

                                                Object.entries(procCount).sort((a,b)=>b[1]-a[1]).slice(0,10);

                                                const sortedStaff =

                                                Object.entries(staffLoad).sort((a,b)=>b[1]-a[1]).slice(0,10);

                                                const procChart = document.getElementById('procDistChart');

                                                const staffChart = document.getElementById('staffLoadChart');

                                                if (procChart) procChart.innerHTML = sortedProc.map((e,i) =>

                                                barRow(e[0], e[1], sortedProc[0][1]||1, colors[i%10])).join('');

                                                if (staffChart) staffChart.innerHTML = sortedStaff.map((e,i) =>

                                                barRow(e[0], e[1], sortedStaff[0][1]||1, colors[i%10])).join('');

                                                }

                                                function refreshDashboard() {

                                                const picker = document.getElementById('dashboard-date-filter');

                                                if (picker) { const t = new Date(); picker.value =

                                                `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;

                                                }

                                                if (typeof loadDashboard === 'function') loadDashboard();

                                                }



                                                // ============================================================

                                                // ⏰ ĐỒNG HỒ

                                                // ============================================================

                                                function updateClock() {

                                                const now = new Date();

                                                const days = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];

                                                const pad = n => String(n).padStart(2,'0');

                                                document.getElementById('clock-time').textContent =

                                                `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

                                                document.getElementById('clock-date').textContent =

                                                `${days[now.getDay()]},

                                                ${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}`;

                                                }

                                                updateClock(); setInterval(updateClock, 1000);



                                                // ============================================================

                                                // 💬 POPUP XÁCNHẬN / CẢNH BÁO

                                                // ============================================================

                                                let globalConfirmCallback = null;

                                                function showCustomConfirm(title, message, callback) {

                                                document.getElementById('confirm-title').innerText = title;

                                                document.getElementById('confirm-message').innerText = message;

                                                globalConfirmCallback = callback;

                                                document.getElementById('custom-confirm-modal').style.display = 'flex';

                                                }

                                                function showCustomAlert(title, message, icon = '💡', btnColor = '#3498db') {

                                                const iconEl = document.getElementById('gca-icon');
                                                if (iconEl) iconEl.innerText = icon;

                                                document.getElementById('gca-title').innerText = title;

                                                document.getElementById('gca-message').innerText = message;

                                                const btn = document.querySelector("#global-custom-alert button");
                                                if (btn) btn.style.backgroundColor = btnColor;

                                                document.getElementById('global-custom-alert').style.display = 'flex';

                                                }

                                                document.getElementById('confirm-ok-btn').onclick = function() {

                                                if (globalConfirmCallback) globalConfirmCallback();

                                                document.getElementById('custom-confirm-modal').style.display = 'none';

                                                };

                                                document.addEventListener('keydown', function(event) {

                                                const confirmModal = document.getElementById('custom-confirm-modal');

                                                const alertModal = document.getElementById('global-custom-alert');

                                                const successModal = document.getElementById('custom-success-popup');

                                                if (confirmModal?.style.display === 'flex') {

                                                if (event.key === 'Enter') { event.preventDefault();

                                                document.getElementById('confirm-ok-btn').click(); }

                                                else if (event.key === 'Escape') { event.preventDefault();

                                                confirmModal.style.display = 'none'; }

                                                return;

                                                }

                                                if (alertModal?.style.display === 'flex') {

                                                if (event.key === 'Enter' || event.key === 'Escape') {

                                                event.preventDefault(); alertModal.style.display = 'none'; }

                                                return;

                                                }

                                                if (successModal && (successModal.style.display === 'flex' ||

                                                successModal.style.display === 'block')) {

                                                if (event.key === 'Enter' || event.key === 'Escape') {

                                                event.preventDefault(); successModal.style.display = 'none'; }

                                                return; // Nếu popup thành công đang mở thì chỉ đóng popup, không lưu form

                                                }



                                                // ⚠️ ĐÃ XÓA: Xử lý Enter tự động click nút Lưu/Thêm được
                                                // xử lý tập trung tại listener ở trên (~dòng 7261)
                                                // để tránh savePatient() bị gọi 2 lần gây trùng dữ liệu.

                                                });




                                                // TỐI ƯU UX 2: Tự động định dạng Giờ và Ngày khi gõ tắt (0830 -> 08:30)

                                                document.addEventListener('focusout', function(e) {

                                                    if (e.target && e.target.tagName === 'INPUT') {

                                                        const val = e.target.value.trim();

                                                        if (!val) return;

                                                        

                                                        // Tự động định dạng giờ (gõ 830 hoặc 0830 -> 08:30)

                                                        if (e.target.id.includes('-time') || e.target.id.includes('-gio') || e.target.id.includes('gio-') || e.target.id.includes('-leave') || e.target.classList.contains('time-input')) {

                                                            if (/^\d{3,4}$/.test(val)) {

                                                                let formatted = val.length === 3 ? '0' + val : val;

                                                                e.target.value = formatted.substring(0, 2) + ':' + formatted.substring(2);

                                                            }

                                                        }

                                                        

                                                        // Tự động định dạng ngày (gõ 120526 hoặc 12052026 -> 12/05/2026)

                                                        if (e.target.id.includes('-date') || e.target.id.includes('-ngay') || e.target.id.includes('ngay-') || e.target.classList.contains('date-input')) {

                                                            if (/^\d{6}$/.test(val)) { 

                                                                e.target.value = val.substring(0, 2) + '/' + val.substring(2, 4) + '/20' + val.substring(4);

                                                            } else if (/^\d{8}$/.test(val)) { 

                                                                e.target.value = val.substring(0, 2) + '/' + val.substring(2, 4) + '/' + val.substring(4);

                                                            }

                                                        }

                                                    }

                                                });



                                                // TỐI ƯU UX 3: Click đúp vào ô Thời gian (Giờ vào, Giờ ra, Giờ bận) để tự động điền GIỜ HIỆN TẠI

                                                document.addEventListener('dblclick', function(e) {

                                                    if (e.target && e.target.tagName === 'INPUT') {

                                                        if (e.target.id.includes('-time') || e.target.id.includes('-gio') || e.target.id.includes('gio-') || e.target.id.includes('-leave') || e.target.classList.contains('time-input')) {

                                                            const now = new Date();

                                                            const hh = String(now.getHours()).padStart(2, '0');

                                                            const mm = String(now.getMinutes()).padStart(2, '0');

                                                            e.target.value = `${hh}:${mm}`;

                                                            // Bôi đen để người dùng dễ nhìn thấy dữ liệu vừa được điền

                                                            e.target.select();

                                                        }

                                                    }

                                                });



// --- Script Blocks Merged ---



// -----------------------------------------------------------

// 📌 HASH ROUTING LOGIC

// -----------------------------------------------------------

document.addEventListener('DOMContentLoaded', function() {

    // Override logic chuyển tab cũ

    const tabs = document.querySelectorAll('.nav-tab, .nav-item');

    

    // 1. Lắng nghe Hash Change

    window.addEventListener('hashchange', handleHashChange);

    

    // 2. Chạy lần đầu khi load trang

    if (window.location.hash) {

        handleHashChange();

    } else {

        // Mặc định mở tab-home

        window.location.hash = '#tab-home';

    }

    

    // 3. Sửa lại event click của các tab để chỉ đổi hash

    tabs.forEach(tab => {

        // Bỏ event click cũ bằng cách clone node nếu cần, nhưng tốt nhất là ngăn chặn hành vi mặc định

        tab.addEventListener('click', function(e) {

            e.preventDefault();

            e.stopPropagation(); // Ngăn event cũ (đã gán trước đó) chạy

            const targetTab = tab.getAttribute('data-tab');

            window.location.hash = '#' + targetTab;

        }, true); // Use capture phase to intercept

    });

    

    function handleHashChange() {

        let hash = window.location.hash;

        if (!hash) hash = '#tab-home';

        

        let targetTab = hash.substring(1); // Xóa dấu #

        

        // Cập nhật giao diện

        tabs.forEach(t => t.classList.remove('active'));

        let activeBtn = document.querySelector(`[data-tab="${targetTab}"]`);

        if (activeBtn) activeBtn.classList.add('active');

        

        document.querySelectorAll('.tab-content, .page').forEach(c => c.classList.remove('active'));

        let targetEl = document.getElementById(targetTab);

        if (targetEl) targetEl.classList.add('active');

        

        // Điều chỉnh class body như logic cũ

        document.body.classList.toggle('tab-sat-active', targetTab === 'tab-sat');

        document.body.classList.toggle('tab-schedule-active', targetTab === 'tab-schedule');

        

        // Kích hoạt load dữ liệu riêng

        if (targetTab === 'tab-sat' && typeof satCache !== 'undefined' && Object.keys(satCache).length === 0) {

            if (typeof taiDsSat === 'function') taiDsSat();

        }

        if (targetTab === 'tab-home' || targetTab === 'page-dashboard') {

            if (typeof loadDashboard === 'function') loadDashboard();

        }

        if (targetTab === 'tab-schedule') {

            if (typeof schedCurrentPage !== 'undefined') schedCurrentPage = 1;

            if (typeof loadScheduleList === 'function') loadScheduleList();

        }

        if (targetTab === 'tab-stats' && typeof renderStats === 'function') {

            renderStats(window.lastUnscheduledData);

        }

    }

});

        // --- USER MENU DROPDOWN LOGIC ---
        function goToAdminTab() {
            window.location.hash = '#tab-admin';
            document.getElementById('user-dropdown-menu').style.display = 'none';
            const arrow = document.getElementById('user-dropdown-arrow');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        }

        function triggerLogout() {
            document.getElementById('user-dropdown-menu').style.display = 'none';
            const arrow = document.getElementById('user-dropdown-arrow');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
            showCustomConfirm('Đăng xuất tài khoản', 'Bạn có chắc chắn muốn đăng xuất không?', doLogout);
        }

        // Event Listeners for toggle
        document.addEventListener('DOMContentLoaded', () => {
            const btnUser = document.getElementById('nav-btn-user');
            const menu = document.getElementById('user-dropdown-menu');
            const arrow = document.getElementById('user-dropdown-arrow');

            if (btnUser && menu) {
                btnUser.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = menu.style.display === 'block';
                    menu.style.display = isOpen ? 'none' : 'block';
                    if (arrow) arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                });
            }

            document.addEventListener('click', (e) => {
                if (menu && menu.style.display === 'block') {
                    const container = document.getElementById('user-menu-container');
                    if (container && !container.contains(e.target)) {
                        menu.style.display = 'none';
                        if (arrow) arrow.style.transform = 'rotate(0deg)';
                    }
                }
            });
        });

                                                


    (function() {

        const sidebar = document.querySelector('.sidebar');

        const container = document.querySelector('.container');

        const hamburger = document.getElementById('mobile-hamburger-btn');

        

        if (sidebar && container) {

            sidebar.addEventListener('mouseleave', () => {

                if (window.matchMedia("(pointer: fine)").matches) {

                    container.classList.add('collapsed-sidebar');

                }

            });

        }

        

        if (hamburger && container) {

            hamburger.addEventListener('click', (e) => {

                e.stopPropagation();

                container.classList.toggle('collapsed-sidebar');

            });

        }

        

        document.addEventListener('click', (e) => {

            if (window.innerWidth <= 1000) {

                if (sidebar && hamburger && container && !sidebar.contains(e.target) && !hamburger.contains(e.target)) {

                    container.classList.add('collapsed-sidebar');

                }

            }

        });

        

        const navLinks = document.querySelectorAll('.nav-tab, .nav-item');

        navLinks.forEach(link => {

            link.addEventListener('click', () => {

                if (window.innerWidth <= 1000 && container) {

                    container.classList.add('collapsed-sidebar');

                }

            });

        });

    })();



(function() {
    const tooltip = document.getElementById('sidebar-tooltip');
    let hideTimer = null;

    function showTooltip(btn) {
        const textEl = btn.querySelector('.text');
        if (!textEl) return;
        const label = textEl.textContent.trim();
        if (!label) return;

        clearTimeout(hideTimer);
        const rect = btn.getBoundingClientRect();
        const top = rect.top + rect.height / 2;

        tooltip.textContent = label;
        tooltip.style.top = top + 'px';
        tooltip.style.transform = 'translateY(-50%)';
        tooltip.style.opacity = '1';
    }

    function hideTooltip() {
        hideTimer = setTimeout(() => {
            tooltip.style.opacity = '0';
        }, 80);
    }

    // Attach to all sidebar nav-tab buttons (current + future)
    function attachTooltips() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        sidebar.querySelectorAll('button.nav-tab').forEach(btn => {
            if (btn.dataset.tooltipAttached) return;
            btn.dataset.tooltipAttached = '1';
            btn.addEventListener('mouseenter', () => showTooltip(btn));
            btn.addEventListener('mouseleave', hideTooltip);
        });
    }

    // Run after DOM ready and also on any dynamic changes
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachTooltips);
    } else {
        attachTooltips();
    }
    // Re-attach for any dynamically added buttons (e.g. after login)
    const observer = new MutationObserver(attachTooltips);
    observer.observe(document.body, { childList: true, subtree: true });
})();

