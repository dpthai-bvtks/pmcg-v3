/* ==========================================
   T.I.M.E.S SYSTEM - INITIALIZATION & THEME
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
    // loadSystemSettings() is automatically handled by loadBootstrapData with offline-first cache

    // Override .value setter to sync with flatpickr khi gán giá trị bằng JS
    const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(HTMLInputElement.prototype, 'value', {
        get: function () {
            return originalDescriptor.get.call(this);
        },
        set: function (val) {
            originalDescriptor.set.call(this, val);
            if (this._flatpickr && !this._isSyncingFlatpickr) {
                this._isSyncingFlatpickr = true;
                try {
                    this._flatpickr.setDate(val, false);
                } finally {
                    this._isSyncingFlatpickr = false;
                }
            }
        }
    });

    // Khởi tạo flatpickr trên tất cả các input type date
    document.querySelectorAll('input[type="date"]').forEach(el => {
        flatpickr(el, {
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "d/m/Y",
            locale: "vn",
            disableMobile: true,
            allowInput: true,
            onReady: function (_selectedDates, _dateStr, instance) {
                // Truyền class của input gốc sang altInput để CSS có thể target đúng
                if (instance.altInput && el.classList.length > 0) {
                    el.classList.forEach(c => instance.altInput.classList.add(c));
                }
            }
        });
    });

    if (typeof initServerConfigModal === 'function') {
    }
});


window.dataCacheTime = window.dataCacheTime || {};

window.loadTimRanhDataFromServer = function () {
    const statusEl = document.getElementById('utils-file-status');
    if (statusEl) {
        statusEl.innerText = '⏳ Đang kết nối máy chủ để lấy dữ liệu Tìm Rảnh chung...';
        statusEl.style.color = '#f39c12';
    }

    if (typeof callApi === 'function') {
        callApi('getTimRanhData', [], data => {
            if (data && data.length > 0) {
                window.externalUtilsData = data;
                if (statusEl) {
                    statusEl.innerText = `✅ Đã tải ${data.length} ca dùng chung từ máy chủ (D1 Database)!`;
                    statusEl.style.color = '#27ae60';
                }
            } else if (statusEl) {
                statusEl.innerText = '(Chưa có dữ liệu chung. Đang dùng: Lịch phần mềm xếp)';
                statusEl.style.color = '#e67e22';
            }
        }, err => {
            if (statusEl) {
                statusEl.innerText = 'Không tải được dữ liệu Tìm Rảnh: ' + err;
                statusEl.style.color = '#c0392b';
            }
        });
    }
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

    if (typeof callApi === 'function') {
        callApi('verifyLogin', [user, pass], res => {
            if (btn) { btn.innerText = 'Đăng Nhập ➔'; btn.disabled = false; }
            if (res && (res.username || res.role || res.success)) {
                const uName = res.username || user || 'admin';
                const uRole = res.role || 'Admin';
                const uPerms = res.permissions || 'all';

                localStorage.setItem('meds_session', JSON.stringify({
                    username: uName,
                    role: uRole,
                    permissions: uPerms,
                    sessionId: res.sessionId || res.token || ''
                }));

                const overlay = document.getElementById('login-overlay');
                if (overlay) overlay.style.display = 'none';
                if (typeof updateLogoutButton === 'function') updateLogoutButton(uName);
                if (typeof applyPermissions === 'function') applyPermissions(uRole, uPerms);
                if (typeof window.loadTimRanhDataFromServer === 'function') {
                    try { window.loadTimRanhDataFromServer(); } catch(e) {}
                }

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
                if ((uRole === 'Admin' || uRole === 'admin') && typeof loadAccounts === 'function') {
                    try { loadAccounts(); } catch(e) {}
                }
            } else {
                if (errDiv) {
                    errDiv.innerText = (res && (res.message || res.error)) ? (res.message || res.error) : 'Sai tài khoản hoặc mật khẩu!';
                    errDiv.style.display = 'block';
                }
            }
        }, err => {
            if (btn) { btn.innerText = 'Đăng Nhập ➔'; btn.disabled = false; }
            if (errDiv) {
                errDiv.innerText = (err && (err.message || err.error)) ? (err.message || err.error) : ('Lỗi kết nối máy chủ Cloudflare: ' + err);
                errDiv.style.display = 'block';
            }
        });
    } else {
        if (btn) { btn.innerText = 'Đăng Nhập ➔'; btn.disabled = false; }
        if (errDiv) {
            errDiv.innerText = 'Đang tải mã nguồn hệ thống, vui lòng thử lại sau giây lát...';
            errDiv.style.display = 'block';
        }
    }
};