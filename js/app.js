// =========================================================
// TURBO CLOUDFLARE API BRIDGE & GLOBAL INITIALIZATION
// =========================================================
window.dataCache = window.dataCache || { pat: [], staff: [], machine: [], room: [], proc: [] };
var dataCache = window.dataCache;

window.google = window.google || {};
window.google.script = window.google.script || {};
window.google.script.run = window.google.script.run || new Proxy({}, {
    get: function (target, prop) {
        if (prop === 'withSuccessHandler') {
            return function (onSuccess) {
                return new Proxy({}, {
                    get: function (t, fnName) {
                        if (fnName === 'withFailureHandler') {
                            return function (onError) {
                                return new Proxy({}, {
                                    get: function (t2, realFnName) {
                                        return function (...args) {
                                            callApi(realFnName, args, onSuccess, onError);
                                        };
                                    }
                                });
                            };
                        }
                        return function (...args) {
                            callApi(fnName, args, onSuccess, null);
                        };
                    }
                });
            };
        }
        if (prop === 'withFailureHandler') {
            return function (onError) {
                return new Proxy({}, {
                    get: function (t, fnName) {
                        return function (...args) {
                            callApi(fnName, args, null, onError);
                        };
                    }
                });
            };
        }
        return function (...args) {
            callApi(prop, args, null, null);
        };
    }
});
var google = window.google;


// =========================================================
// GLOBAL HELPERS & DUAL-MODE TABLE REORDERING ENGINE
// =========================================================
function withLock(fn) {
    let locked = false;
    return function (...args) {
        if (locked) {
            console.warn('[withLock]: Thao tác đang được xử lý, vui lòng chờ...');
            return;
        }
        locked = true;
        try {
            const res = fn.apply(this, args);
            if (res && typeof res.then === 'function') {
                return res.finally(() => { locked = false; });
            }
            setTimeout(() => { locked = false; }, 300);
            return res;
        } catch (e) {
            locked = false;
            throw e;
        }
    };
}
window.withLock = withLock;

window.moveRowUp = function (type, index) {
    let arr = null;
    let renderFn = null;
    if (type === 'staff') { arr = dataCache.staff; renderFn = renderStaffTable; }
    else if (type === 'machines') { arr = dataCache.machine; renderFn = renderMachinesTable; }
    else if (type === 'procedures') { arr = dataCache.proc; renderFn = renderProceduresTable; }
    else if (type === 'rooms') { arr = dataCache.room; renderFn = renderRoomsTable; }

    if (!arr || index <= 0 || index >= arr.length) return;
    const item = arr.splice(index, 1)[0];
    arr.splice(index - 1, 0, item);
    if (typeof renderFn === 'function') renderFn();
    saveReorderedData(type, arr);
};

window.moveRowDown = function (type, index) {
    let arr = null;
    let renderFn = null;
    if (type === 'staff') { arr = dataCache.staff; renderFn = renderStaffTable; }
    else if (type === 'machines') { arr = dataCache.machine; renderFn = renderMachinesTable; }
    else if (type === 'procedures') { arr = dataCache.proc; renderFn = renderProceduresTable; }
    else if (type === 'rooms') { arr = dataCache.room; renderFn = renderRoomsTable; }

    if (!arr || index < 0 || index >= arr.length - 1) return;
    const item = arr.splice(index, 1)[0];
    arr.splice(index + 1, 0, item);
    if (typeof renderFn === 'function') renderFn();
    saveReorderedData(type, arr);
};

window.renderSttOrderControl = function (type, i, total) {
    const upDisabled = (i === 0) ? 'disabled style="opacity:0.25; cursor:not-allowed;"' : '';
    const downDisabled = (i >= total - 1) ? 'disabled style="opacity:0.25; cursor:not-allowed;"' : '';
    return `<div class="stt-order-cell">
        <span class="drag-handle-btn" title="Bấm giữ kéo thả để di chuyển">☰</span>
        <button type="button" class="btn-order-arrow" ${upDisabled} onclick="event.preventDefault(); event.stopPropagation(); window.moveRowUp('${type}', ${i})" title="Di chuyển lên 1 dòng">▲</button>
        <button type="button" class="btn-order-arrow" ${downDisabled} onclick="event.preventDefault(); event.stopPropagation(); window.moveRowDown('${type}', ${i})" title="Di chuyển xuống 1 dòng">▼</button>
        <span style="font-weight:700; margin-left:2px;">${i + 1}</span>
    </div>`;
};

let _isDraggingRow = false;
window._isDraggingRow = false;

function saveReorderedData(type, list) {
    try {
        localStorage.setItem('times_' + type + '_order', JSON.stringify(list.map(x => x.ten || x.name || x.maMay || x.tenPhong)));
    } catch (e) { }
    callApi('saveReorderedData', [type, list], res => {
        console.log(`[Reorder]: Đã đồng bộ thứ tự ${type} lên Cloudflare D1!`);
    }, err => {
        console.warn('[Reorder] Lỗi đồng bộ:', err);
    });
}

function initTableDragAndDrop(tbodyId, arrayRef, onReorderFinish) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    if (typeof Sortable !== 'undefined') {
        if (tbody._sortableInstance) {
            try { tbody._sortableInstance.destroy(); } catch(e){}
        }
        tbody._sortableInstance = new Sortable(tbody, {
            animation: 180,
            handle: '.drag-handle-btn',
            draggable: 'tr',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            forceFallback: false,
            onStart: function () {
                window._isDraggingRow = true;
            },
            onEnd: function (evt) {
                setTimeout(() => { window._isDraggingRow = false; }, 300);
                if (evt.oldIndex !== undefined && evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
                    const item = arrayRef.splice(evt.oldIndex, 1)[0];
                    arrayRef.splice(evt.newIndex, 0, item);
                    if (typeof onReorderFinish === 'function') {
                        onReorderFinish(arrayRef);
                    }
                }
            }
        });
        return;
    }
}

/* ==========================================
   T.I.M.E.S SYSTEM - CORE APPLICATION LOGIC
   ========================================== */

window.showGlobalLoading = function (text) {

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

        window.hideGlobalLoading = function () {

            const overlay = document.getElementById('global-loading-overlay');

            if (overlay) overlay.style.display = 'none';

        };

        window.showToast = function (message, type = 'success', duration = 3500) {
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

        window.onerror = function (msg, url, lineNo, columnNo, error) {
            // Bỏ qua lỗi cross-origin (Script error. dòng 0) từ CDN/extension/JSONP
            if (msg === 'Script error.' || lineNo === 0 || !lineNo) {
                console.warn('[Notice] Bỏ qua thông báo cross-origin script:', msg);
                return true;
            }
            console.error('JS ERROR:', msg, 'at', url, 'line', lineNo, error);
            return false;
        };

        window.addEventListener('unhandledrejection', function (event) {
            console.warn('[Unhandled Rejection]:', event.reason);
        });

        console.log('MAIN SCRIPT STARTING...');

        function formatSlotDisplay(slot) {
            if (!slot || typeof slot !== 'string' || !slot.includes('-')) return slot;
            const parts = slot.split('-');
            if (parts.length === 2) {
                const start = parts[0].trim();
                const end = parts[1].trim();
                if (start === end) return start;
                
                const sParts = start.split(':');
                const eParts = end.split(':');
                if (sParts.length === 2 && eParts.length === 2) {
                    const sMin = parseInt(sParts[0], 10) * 60 + parseInt(sParts[1], 10);
                    const eMin = parseInt(eParts[0], 10) * 60 + parseInt(eParts[1], 10);
                    if (eMin - sMin <= 1 && eMin >= sMin) {
                        return start;
                    }
                }
            }
            return slot;
        }

        // ============================================================
        // GITHUB PAGES API CONFIGURATION (SELF-HEALING)
        // ============================================================
        const DEFAULT_API_URL = 'https://pmcg-api.dpthai-ttytmk.workers.dev';
        function getApiUrl() {
            let customUrl = (localStorage.getItem('times_custom_api_url') || '').trim();
            if (customUrl.includes('script.google.com') || customUrl.includes('google.com/macros')) {
                localStorage.removeItem('times_custom_api_url');
                customUrl = '';
            }
            return customUrl || DEFAULT_API_URL;
        }
        window.getApiUrl = getApiUrl;
        window.setCustomApiUrl = function(newUrl) {
            if (!newUrl || newUrl.trim() === '' || newUrl.trim() === DEFAULT_API_URL) {
                localStorage.removeItem('times_custom_api_url');
            } else {
                localStorage.setItem('times_custom_api_url', newUrl.trim());
            }
        };
        
        // ============================================================
        // DUAL-ENGINE HIGH-PERFORMANCE API DISPATCHER (FETCH + JSONP + DEDUPLICATION)
        // ============================================================
        const MAX_CONCURRENT_API_REQUESTS = 3;
        let activeApiRequests = 0;
        let apiQueue = [];
        let mutationCount = 0;
        const inFlightRequests = new Map();

        function checkMutationLoading() {
            if (mutationCount > 0) {
                if (window.showGlobalLoading) window.showGlobalLoading("Đang xử lý dữ liệu...");
            } else {
                if (window.hideGlobalLoading) window.hideGlobalLoading();
            }
        }

        async function executeApiTask(task) {
            const { functionName, args, onSuccess, onError, isMutation, retries = 0 } = task;
            activeApiRequests++;

            const finish = () => {
                activeApiRequests--;
                if (isMutation) {
                    mutationCount = Math.max(0, mutationCount - 1);
                    checkMutationLoading();
                }
                setTimeout(scheduleNextApiRequest, 20);
            };

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);

                const response = await fetch(getApiUrl(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: functionName,
                        args: args || []
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                const result = await response.json();
                finish();

                if (result && result.status === 'success') {
                    if (onSuccess) {
                        try { onSuccess(result.data); } catch(e) { console.error(`Error in onSuccess for ${functionName}:`, e); }
                    }
                } else {
                    const errMsg = (result && result.error) ? result.error : 'Lỗi không xác định từ máy chủ.';
                    if (onError) onError(errMsg);
                    else alert('Lỗi: ' + errMsg);
                }
            } catch (err) {
                console.warn(`[Cloudflare API Error] ${functionName}:`, err);
                finish();
                if (onError) onError(err.message || 'Lỗi kết nối máy chủ Cloudflare');
                else console.error(err);
            }
        }

        function executeJsonpFallback(task, onFinish) {
            const { functionName, args, onSuccess, onError, retries = 0 } = task;
            const callbackName = 'jsonp_times_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
            const script = document.createElement('script');
            const params = new URLSearchParams({
                action: functionName,
                args: JSON.stringify(args),
                callback: callbackName
            });
            script.src = getApiUrl() + '?' + params.toString();
            script.async = true;
            script.crossOrigin = 'anonymous';

            let isFinished = false;

            const cleanup = () => {
                if (isFinished) return;
                isFinished = true;
                delete window[callbackName];
                if (script.parentNode) script.parentNode.removeChild(script);
                if (onFinish) onFinish();
            };

            let timeoutTimer = setTimeout(() => {
                if (isFinished) return;
                console.warn(`[API Timeout] ${functionName} timed out (attempt ${retries + 1})`);
                if (retries < 1) {
                    cleanup();
                    setTimeout(() => {
                        apiQueue.push({ ...task, retries: retries + 1 });
                        scheduleNextApiRequest();
                    }, 1000);
                } else {
                    cleanup();
                    const errMsg = `Quá thời gian kết nối máy chủ (${functionName}).`;
                    if (onError) onError(errMsg);
                    else console.error(errMsg);
                }
            }, 30000);

            window[callbackName] = function (result) {
                clearTimeout(timeoutTimer);
                if (isFinished) return;
                cleanup();

                if (result && result.status === 'success') {
                    if (onSuccess) {
                        try { onSuccess(result.data); } catch(e) { console.error(`Error in onSuccess handler for ${functionName}:`, e); }
                    }
                } else {
                    const errMsg = (result && result.error) ? result.error : 'Lỗi không xác định từ máy chủ.';
                    if (onError) onError(errMsg);
                    else alert('Lỗi: ' + errMsg);
                }
            };

            script.onerror = function () {
                clearTimeout(timeoutTimer);
                if (isFinished) return;
                console.warn(`[API Script Error] ${functionName} failed to load (attempt ${retries + 1})`);
                if (retries < 1) {
                    cleanup();
                    setTimeout(() => {
                        apiQueue.push({ ...task, retries: retries + 1 });
                        scheduleNextApiRequest();
                    }, 1000);
                } else {
                    cleanup();
                    const errMsg = `Không thể kết nối đến máy chủ (${functionName}).`;
                    if (onError) onError(errMsg);
                    else console.error(errMsg);
                }
            };

            document.head.appendChild(script);
        }

        function scheduleNextApiRequest() {
            if (activeApiRequests >= MAX_CONCURRENT_API_REQUESTS || apiQueue.length === 0) return;
            const nextTask = apiQueue.shift();
            executeApiTask(nextTask);
        }

        function callApi(functionName, args, onSuccess, onError) {
            const isSilentMutation = functionName === 'saveChamCong' || functionName === 'saveReorderedData' || functionName === 'saveReorder'
                || functionName === 'editBenhNhan' || functionName === 'editNhanSu' || functionName === 'editMayMoc' || functionName === 'editThuThuat' || functionName === 'editPhong';
            const isMutation = functionName.startsWith('add') || functionName.startsWith('edit') || functionName.startsWith('delete') || functionName.startsWith('bulkUpdate') || functionName.startsWith('save') || functionName.startsWith('chotSo') || functionName.startsWith('runScheduling') || functionName.startsWith('chuyenNgayMoi');
            
            // In-flight deduplication for non-mutation queries (getSchedule, getSystemSettings, getDataVersion...)
            if (!isMutation) {
                const reqKey = functionName + ':' + JSON.stringify(args || []);
                if (inFlightRequests.has(reqKey)) {
                    inFlightRequests.get(reqKey).then(
                        data => { if (onSuccess) onSuccess(data); },
                        err => { if (onError) onError(err); }
                    );
                    return;
                }

                let resolveInFlight, rejectInFlight;
                const inFlightPromise = new Promise((res, rej) => {
                    resolveInFlight = res;
                    rejectInFlight = rej;
                });
                inFlightRequests.set(reqKey, inFlightPromise);

                const origOnSuccess = onSuccess;
                const origOnError = onError;

                onSuccess = (data) => {
                    inFlightRequests.delete(reqKey);
                    resolveInFlight(data);
                    if (origOnSuccess) origOnSuccess(data);
                };

                onError = (err) => {
                    inFlightRequests.delete(reqKey);
                    rejectInFlight(err);
                    if (origOnError) origOnError(err);
                };
            }

            const shouldShowLoading = isMutation && !isSilentMutation;
            if (shouldShowLoading) {
                mutationCount++;
                checkMutationLoading();
            }

            const task = { functionName, args: args || [], onSuccess, onError, isMutation: shouldShowLoading, retries: 0 };
            apiQueue.push(task);
            scheduleNextApiRequest();
        }

        function escapeHtml(string) {
            if (string === null || string === undefined) return '';
            const map = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
                "`": "&#x60;"
            };
            return String(string).replace(/[&<>"'`]/g, s => map[s]);
        }




        window.google = window.google || {};

        window.google.script = window.google.script || {};

        window.google.script.run = new Proxy({}, {

            get: function (target, prop) {

                if (prop === 'withSuccessHandler') {

                    return function (successCallback) {

                        return new Proxy({}, {

                            get: function (target2, prop2) {

                                if (prop2 === 'withFailureHandler') {

                                    return function (errorCallback) {

                                        return new Proxy({}, {

                                            get: function (target3, methodName) {

                                                return function (...args) {

                                                    callApi(methodName, args, successCallback, errorCallback);

                                                };

                                            }

                                        });

                                    };

                                }

                                return function (...args) {

                                    callApi(prop2, args, successCallback, null);

                                };

                            }

                        });

                    };

                }

                if (prop === 'withFailureHandler') {

                    return function (errorCallback) {

                        return new Proxy({}, {

                            get: function (target2, prop2) {

                                if (prop2 === 'withSuccessHandler') {

                                    return function (successCallback) {

                                        return new Proxy({}, {

                                            get: function (target3, methodName) {

                                                return function (...args) {

                                                    callApi(methodName, args, successCallback, errorCallback);

                                                };

                                            }

                                        });

                                    };

                                }

                                return function (...args) {

                                    callApi(prop2, args, null, errorCallback);

                                };

                            }

                        });

                    };

                }

                return function (...args) {

                    callApi(prop, args, null, null);

                };

            }

        });











        // --- AUTH CODE MOVED TO TOP ---

        // ============================================================

        let adminAccCache = [];



        // --- Block Merged ---



        console.log('--- JS Block: Auth & Permissions started ---');

        window.doLogin = function () {

            const user = document.getElementById('login-user').value;

            const pass = document.getElementById('login-pass').value;

            const errDiv = document.getElementById('login-error');

            const btn = document.getElementById('btn-do-login');



            if (!user || !pass) {
                errDiv.innerText = "Vui lòng nhập đủ thông tin!";

                errDiv.style.display = "block"; return;
            }

            btn.innerText = "Đang kiểm tra..."; btn.disabled = true;



            google.script.run.withSuccessHandler(res => {

                if (res && (res.username || res.success)) {

                    // 1. Lưu thông tin người dùng

                    localStorage.setItem('meds_session', JSON.stringify({
                        username: res.username, role:

                            res.role, permissions: res.permissions
                    }));

                    // Gọi tải dữ liệu Tìm Rảnh ngay sau khi đăng nhập thành công
                    if (typeof window.loadTimRanhDataFromServer === 'function') {
                        window.loadTimRanhDataFromServer();
                    }

                    window.isNetworkErrorAlertShown = false;

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

                    errDiv.innerText = res.message || res.error || "Tài khoản hoặc mật khẩu không đúng!"; errDiv.style.display = "block";

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

            if (typeof showCustomAlert === 'function') {
                let icon = '💡', color = '#3498db';
                if (type === 'error') { icon = '🛑'; color = '#e74c3c'; }
                else if (type === 'success') { icon = '✅'; color = '#27ae60'; }
                else if (type === 'warning') { icon = '⚠️'; color = '#f39c12'; }
                showCustomAlert(title, message, icon, color);
            } else if (typeof showThongBao === 'function') {
                showThongBao(title, message, type);
            } else {
                console.log(message);
            }

        };



        dataCache = window.dataCache || { machine: [], proc: [], staff: [], room: [], pat: [] };




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

        // ⚠️ CẢNH BÁO: ĐỒNG BỘ VỚI t2m() trong code.gs-v2.txt — sửa 1 bên PHẢI sửa bên kia!
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
            if (!row) return {};
            if (Array.isArray(row)) {
                return {
                    ngay: row[0] || '', tenBN: row[1] || '', namSinh: row[2] || '', phong: row[3] || '', thuThuat: row[4] || '',
                    gioDienRa: row[5] || '', gioKetThuc: row[6] || '', nvChinh: row[7] || '', nvPhu: row[8] || '', may: row[9] || '', giuong: row[10] || ''
                };
            }
            return {
                ngay: row.ngay || row.NGAY || '',
                tenBN: row.tenBN || row.HOTEN || '',
                namSinh: row.namSinh || row.NAMSINH || '',
                phong: row.phong || row.PHONG || '',
                thuThuat: row.thuThuat || row.DICHVU || '',
                gioDienRa: row.gioDienRa || row.GIODIENRA || '',
                gioKetThuc: row.gioKetThuc || row.GIOKETTHUC || '',
                nvChinh: row.nvChinh || row['NV CHÍNH'] || '',
                nvPhu: row.nvPhu || row['NV PHỤ'] || '',
                may: row.may || row.MAY || '',
                giuong: row.giuong || row.GIUONG || '',
                __isDischarged: !!row.__isDischarged,
                __dropped: !!row.__dropped
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

        function getShortSkills(skillStr, isStaff = false) {
            if (!skillStr) return '';
            const str = typeof skillStr === 'string' ? skillStr : (Array.isArray(skillStr) ? skillStr.join(', ') : String(skillStr || ''));
            const arr = str.split(',').map(sk => sk.trim().toLowerCase()).filter(sk => sk);
            if (!arr.length) return '';

            const procList = (typeof dataCache !== 'undefined' && Array.isArray(dataCache.proc)) ? dataCache.proc : [];

            if (!isStaff) {
                return arr.map(sk => {
                    let proc = procList.find(p => p && p.ten && p.ten.toLowerCase() === sk);
                    return (proc && proc.vietTat) ? proc.vietTat : sk;
                }).join(', ');
            }

            const allYHCT = procList.filter(p => p && p.he === 'YHCT');
            const allPHCN = procList.filter(p => p && p.he === 'PHCN');
            const staffYHCT = allYHCT.filter(p => p && p.ten && arr.includes(p.ten.toLowerCase()));
            const staffPHCN = allPHCN.filter(p => p && p.ten && arr.includes(p.ten.toLowerCase()));
            const missingYHCT = allYHCT.filter(p => p && p.ten && !arr.includes(p.ten.toLowerCase()));
            const missingPHCN = allPHCN.filter(p => p && p.ten && !arr.includes(p.ten.toLowerCase()));

            let yhctStr = '';
            if (staffYHCT.length > 0) {
                if (missingYHCT.length === 0) yhctStr = 'YHCT';
                else if (missingYHCT.length <= 4) yhctStr = 'YHCT - ' + missingYHCT.map(p => p.vietTat || p.ten).join(', ');
                else yhctStr = staffYHCT.map(p => p.vietTat || p.ten).join(', ');
            }

            let phcnStr = '';
            if (staffPHCN.length > 0) {
                if (missingPHCN.length === 0) phcnStr = 'PHCN';
                else if (missingPHCN.length <= 4) phcnStr = 'PHCN - ' + missingPHCN.map(p => p.vietTat || p.ten).join(', ');
                else phcnStr = staffPHCN.map(p => p.vietTat || p.ten).join(', ');
            }

            if (yhctStr === 'YHCT' && phcnStr === 'PHCN') return 'YHCT+PHCN';
            const res = [];
            if (yhctStr) res.push(yhctStr);
            if (phcnStr) res.push(phcnStr);
            return res.join('; ');
        }



        // ─── Index lookup gom chung ──────────────────────────────────

        
        function matchProc(a, b) {
            if (!a || !b) return false;
            const strA = String(a).trim().toLowerCase();
            const strB = String(b).trim().toLowerCase();
            if (strA === strB) return true;
            const procs = (window.dataCache && window.dataCache.proc) ? window.dataCache.proc : [];
            const procA = procs.find(p => (p.ten && p.ten.toLowerCase() === strA) || (p.vietTat && p.vietTat.toLowerCase() === strA));
            const procB = procs.find(p => (p.ten && p.ten.toLowerCase() === strB) || (p.vietTat && p.vietTat.toLowerCase() === strB));
            if (procA && procB && procA.ten && procB.ten && procA.ten.toLowerCase() === procB.ten.toLowerCase()) return true;
            if (procA && (procA.ten.toLowerCase() === strB || (procA.vietTat && procA.vietTat.toLowerCase() === strB))) return true;
            if (procB && (procB.ten.toLowerCase() === strA || (procB.vietTat && procB.vietTat.toLowerCase() === strA))) return true;
            return false;
        }

        function reconcileUnscheduledData(inputList) {
            const schedData = window.currentScheduleData || [];
            let unschedData = inputList !== undefined ? inputList : (window.lastUnscheduledData || []);
            if (!unschedData.length) {
                window.lastUnscheduledData = [];
                try { localStorage.setItem('meds_unscheduled', '[]'); } catch(e){}
                return [];
            }

            const activePatList = (window.dataCache && window.dataCache.pat) ? window.dataCache.pat : [];
            const remainingDropped = [];
            const schedCountMap = {};

            schedData.forEach(row => {
                const key = String(row.tenBN || '').toUpperCase().trim() + "_" + String(row.namSinh || '').trim();
                if (!schedCountMap[key]) schedCountMap[key] = [];
                schedCountMap[key].push(String(row.thuThuat || '').trim());
            });

            const seenDropKeys = new Set();
            unschedData.forEach(d => {
                const patName = String(d.bn || d.tenBN || '').toUpperCase().trim();
                const patNS = String(d.ns || d.namSinh || '').trim();
                const key = patName + "_" + patNS;
                const dropProc = String(d.tt || d.thuThuat || '').trim();
                const dropSig = key + "|" + dropProc.toLowerCase();
                if (seenDropKeys.has(dropSig)) return;
                seenDropKeys.add(dropSig);

                const patObj = activePatList.find(p => String(p.ten || '').toUpperCase().trim() === patName && String(p.namSinh || '').trim() === patNS);
                const reqProcs = patObj && patObj.thuThuat ? patObj.thuThuat.split(',').map(x => x.trim()).filter(Boolean) : [];
                const schedProcsForPat = schedCountMap[key] || [];

                const reqCountForThisProc = reqProcs.filter(p => matchProc(p, dropProc)).length || 1;
                const schedCountForThisProc = schedProcsForPat.filter(p => matchProc(p, dropProc)).length;

                // Nếu số ca đã có trong lịch >= số ca yêu cầu, ca rớt này đã được giải quyết
                if (schedCountForThisProc >= reqCountForThisProc) {
                    return;
                }
                remainingDropped.push(d);
            });

            window.lastUnscheduledData = remainingDropped;
            try {
                localStorage.setItem('meds_unscheduled', JSON.stringify(remainingDropped));
            } catch(e){}
            return remainingDropped;
        }

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

                    // Tự động điền ngày hôm nay khi lần đầu mở tab
                    const utilsDateEl = document.getElementById('utils-search-date');
                    if (utilsDateEl && !utilsDateEl.value) {
                        const todayStr = new Date().toISOString().slice(0, 10);
                        utilsDateEl.value = todayStr;
                        if (utilsDateEl._flatpickr) utilsDateEl._flatpickr.setDate(todayStr, false);
                    }

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

                        if (targetTab === 'tab-chamcong' && typeof loadChamCongData === 'function') {
                            loadChamCongData();
                        }

                        if (targetTab === 'tab-thongke' && typeof loadThongKeData === 'function') {
                            loadThongKeData();
                        }



                    } catch (error) { console.error("Lỗi chuyển tab:", error); }

                });

            });



                        // Phần 3: Khởi tạo ngày mặc định và nạp Bootstrap
            const today = new Date();
            if (document.getElementById('schedule-date')) {
                const y = today.getFullYear();
                const m = String(today.getMonth() + 1).padStart(2, '0');
                const d = String(today.getDate()).padStart(2, '0');
                document.getElementById('schedule-date').value = `${y}-${m}-${d}`;
            }

            if (document.getElementById('pat-date')) {
                const dd = String(today.getDate()).padStart(2, '0');
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                document.getElementById('pat-date').value = `${dd}/${mm}/${today.getFullYear()}`;
            }

            if (typeof setupTableSorting === 'function') setupTableSorting();

            // Khởi động nạp dữ liệu Bootstrap (All-in-One + Offline Cache)
            if (typeof loadBootstrapData === 'function') {
                loadBootstrapData();
            } else if (typeof loadAllData === 'function') {
                loadAllData();
            }
        });

        // ============================================================
        // 🚀 ALL-IN-ONE BOOTSTRAP DATA & OFFLINE-FIRST CACHE
        // ============================================================

        function applySystemSettings(res) {
            if (!res) return;
            if (res.chotSoTime && document.getElementById("admin-chotso-time")) document.getElementById("admin-chotso-time").value = res.chotSoTime;
            if (res.yhctLunch !== undefined && document.getElementById("admin-yhct-lunch")) document.getElementById("admin-yhct-lunch").value = res.yhctLunch;
            if (res.yhctEnd !== undefined && document.getElementById("admin-yhct-end")) document.getElementById("admin-yhct-end").value = res.yhctEnd;
            if (res.dropWeight !== undefined && document.getElementById("admin-weight-drop")) document.getElementById("admin-weight-drop").value = res.dropWeight;
            if (res.overtimeWeight !== undefined && document.getElementById("admin-weight-overtime")) document.getElementById("admin-weight-overtime").value = res.overtimeWeight;
            if (res.imbalanceWeight !== undefined && document.getElementById("admin-weight-imbalance")) document.getElementById("admin-weight-imbalance").value = res.imbalanceWeight;
        }

        function restoreOfflineCache() {
            try {
                const cachedStr = localStorage.getItem('times_bootstrap_cache');
                if (cachedStr) {
                    const b = JSON.parse(cachedStr);
                    if (b && typeof dataCache !== 'undefined') {

                        // ✅ Tính ngày hôm nay theo múi giờ VN (UTC+7)
                        const nowVN = new Date(Date.now() + 7 * 60 * 60 * 1000);
                        const todayYMD = `${nowVN.getUTCFullYear()}-${String(nowVN.getUTCMonth() + 1).padStart(2, '0')}-${String(nowVN.getUTCDate()).padStart(2, '0')}`;
                        const dd = String(nowVN.getUTCDate()).padStart(2, '0');
                        const mm = String(nowVN.getUTCMonth() + 1).padStart(2, '0');
                        const todaySlash = `${dd}/${mm}/${nowVN.getUTCFullYear()}`; // VD: 21/08/2026

                        // Kiểm tra cache có phải của ngày hôm nay không
                        // (dựa vào ngày của bệnh nhân đầu tiên, hoặc timestamp cache)
                        let cacheIsStale = false;
                        if (b.patients && Array.isArray(b.patients) && b.patients.length > 0) {
                            const firstPatDate = b.patients[0].ngayVao || b.patients[0].ngay_vao || '';
                            if (firstPatDate && firstPatDate !== todaySlash && firstPatDate !== todayYMD) {
                                cacheIsStale = true;
                            }
                        }
                        // Kiểm tra thêm theo schedule
                        if (!cacheIsStale && b.schedule && Array.isArray(b.schedule) && b.schedule.length > 0) {
                            const firstSchedDate = b.schedule[0][0] || b.schedule[0].date || '';
                            if (firstSchedDate && firstSchedDate !== todayYMD && firstSchedDate !== todaySlash) {
                                cacheIsStale = true;
                            }
                        }

                        if (cacheIsStale) {
                            // Cache lỗi thời: xóa patients và schedule cũ, chỉ giữ lại cấu hình (staff, máy, phòng...)
                            console.warn(`⚠️ [Offline Cache] Cache cũ (không phải hôm nay ${todaySlash}), bỏ qua bệnh nhân & lịch cũ.`);
                            b.patients = [];
                            b.schedule = [];
                            // Cập nhật lại localStorage để lần sau không bị lỗi nữa
                            try { localStorage.setItem('times_bootstrap_cache', JSON.stringify(b)); } catch(e) {}
                        }

                        if (b.machines && Array.isArray(b.machines)) {
                            b.machines.forEach((m, i) => { if (m) m.sheetIndex = i; });
                            dataCache.machine = b.machines.filter(m => m && (m.tenLoai || m[1]));
                            if (typeof renderMachinesTable === 'function') renderMachinesTable();
                        }
                        if (b.rooms && Array.isArray(b.rooms)) {
                            b.rooms.forEach((r, i) => { if (r) r.sheetIndex = i; });
                            dataCache.room = b.rooms.filter(r => r && (r.tenPhong || r[1]));
                            if (typeof renderRoomsTable === 'function') renderRoomsTable();
                        }
                        if (b.procedures && Array.isArray(b.procedures)) {
                            b.procedures.forEach((p, i) => { if (p) p.sheetIndex = i; });
                            dataCache.proc = b.procedures;
                            if (typeof renderProceduresTable === 'function') renderProceduresTable();
                            if (typeof renderProcedureCheckboxes === 'function') renderProcedureCheckboxes();
                        }
                        if (b.staff && Array.isArray(b.staff)) {
                            b.staff.forEach((st, i) => { if (st) st.sheetIndex = i; });
                            dataCache.staff = b.staff.filter(st => st && st.ten);
                            if (typeof renderStaffTable === 'function') renderStaffTable();
                        }
                        if (b.schedule && Array.isArray(b.schedule) && b.schedule.length) {
                            dataCache.schedule = b.schedule;
                        }
                        if (typeof loadScheduleList === 'function') loadScheduleList();

                        if (b.patients && Array.isArray(b.patients)) {
                            b.patients.forEach((pt, i) => { if (pt) pt.sheetIndex = i; });
                            dataCache.pat = b.patients.filter(pt => pt && pt.ten);
                            if (typeof renderPatientsTable === 'function') renderPatientsTable();
                        }
                        if (b.settings) {
                            applySystemSettings(b.settings);
                        }
                        if (b.marquee) {
                            const el = document.getElementById('thong-bao-chay');
                            if (el) el.innerText = b.marquee;
                        }
                        const now = Date.now();
                        window.dataCacheTime = { pat: now, staff: now, machine: now, room: now, proc: now, sched: now };
                        if (typeof loadDashboard === 'function') loadDashboard();
                        console.log('⚡ [Offline Cache] Đã hiển thị dữ liệu tức thì từ bộ nhớ máy tính (0ms)!');
                    }
                }
            } catch (e) {
                console.warn('[Offline Cache] Lỗi đọc dữ liệu cục bộ:', e);
            }
        }

        function loadBootstrapData(forceRefresh = false) {
            if (!forceRefresh) {
                restoreOfflineCache();
            }

            google.script.run
                .withSuccessHandler(function (b) {
                    if (!b) return;
                    try {
                        localStorage.setItem('times_bootstrap_cache', JSON.stringify(b));
                    } catch (e) { }

                    const now = Date.now();
                    window.dataCacheTime = { pat: now, staff: now, machine: now, room: now, proc: now, sched: now };

                    if (typeof dataCache !== 'undefined') {
                        if (b.machines && Array.isArray(b.machines)) {
                            b.machines.forEach((m, i) => { if (m) m.sheetIndex = i; });
                            dataCache.machine = b.machines.filter(m => m && (m.tenLoai || m[1]));
                            if (typeof renderMachinesTable === 'function') renderMachinesTable();
                        }
                        if (b.rooms && Array.isArray(b.rooms)) {
                            b.rooms.forEach((r, i) => { if (r) r.sheetIndex = i; });
                            dataCache.room = b.rooms.filter(r => r && (r.tenPhong || r[1]));
                            if (typeof renderRoomsTable === 'function') renderRoomsTable();
                        }
                        if (b.procedures && Array.isArray(b.procedures)) {
                            b.procedures.forEach((p, i) => { if (p) p.sheetIndex = i; });
                            dataCache.proc = b.procedures;
                            if (typeof renderProceduresTable === 'function') renderProceduresTable();
                            if (typeof renderProcedureCheckboxes === 'function') renderProcedureCheckboxes();
                        }
                        if (b.staff && Array.isArray(b.staff)) {
                            b.staff.forEach((st, i) => { if (st) st.sheetIndex = i; });
                            dataCache.staff = b.staff.filter(st => st && st.ten);
                            if (typeof renderStaffTable === 'function') renderStaffTable();
                        }
                        if (b.schedule && Array.isArray(b.schedule) && b.schedule.length) {
                            dataCache.schedule = b.schedule;
                        }
                        if (typeof loadScheduleList === 'function') loadScheduleList();

                        if (b.patients && Array.isArray(b.patients)) {
                            b.patients.forEach((pt, i) => { if (pt) pt.sheetIndex = i; });
                            dataCache.pat = b.patients.filter(pt => pt && pt.ten);
                            if (typeof renderPatientsTable === 'function') renderPatientsTable();
                        }
                    }

                    if (b.settings) {
                        applySystemSettings(b.settings);
                    }

                    if (b.marquee) {
                        const el = document.getElementById('thong-bao-chay');
                        if (el) el.innerText = b.marquee;
                        const inp = document.getElementById('admin-marquee-input');
                        if (inp) inp.value = b.marquee;
                    }

                    if (b.links && Array.isArray(b.links)) {
                        const uls = document.querySelectorAll('#khu-vuc-lien-ket');
                        if (uls.length) {
                            const htmlContent = b.links.length
                                ? b.links.map(item => `<li><a href="${item.url}" target="_blank"><span class="f-icon">${item.icon}</span> ${item.ten}</a></li>`).join('')
                                : '<li><a href="#"><span class="f-icon">⚠️</span> Chưa có liên kết nào</a></li>';
                            uls.forEach(ul => { ul.innerHTML = htmlContent; });
                        }
                    }

                    if (typeof updateStats === 'function') updateStats();
                    if (typeof renderScheduleCalendar === 'function') renderScheduleCalendar();
                    if (typeof loadDashboard === 'function') loadDashboard();

                    console.log('🚀 [Bootstrap API] Đã đồng bộ toàn bộ dữ liệu mới nhất từ máy chủ trong 1 request!');
                })
                .withFailureHandler(function (err) {
                    console.warn('[Bootstrap API] Máy chủ bận, đang sử dụng dữ liệu đã lưu trong máy:', err);
                    [loadMachines, loadRooms, loadScheduleList, loadProcedures, loadPatients, loadStaff].forEach(fn => fn());
                })
                .getBootstrapData();
        }

        function loadAllData() {
            loadBootstrapData();
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
                            cleaned = rawData.filter(item => item && item.ten && String(item.ten).trim() !== '' && !/^\d+$/.test(String(item.ten).trim()));
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
                        if (cacheKey === 'staff') {
                            cleaned.forEach(item => {
                                if (!item.thoiGianLam) item.thoiGianLam = "07:30-11:30, 13:00-16:30";
                                if (!item.trangThai) item.trangThai = "Đi làm";
                                if (!item.gioBan) item.gioBan = "";
                                if (!item.kyNang) item.kyNang = "";
                                if (!item.quyen) item.quyen = item.system || item.he || "PHCN";
                                if (!item.nguoiThayThe) item.nguoiThayThe = "Không";
                            });
                            try {
                                const localHisMap = JSON.parse(localStorage.getItem('staff_his_map') || '{}');
                                cleaned.forEach(item => {
                                    if (!item.tenHis && localHisMap[item.ten]) {
                                        item.tenHis = localHisMap[item.ten];
                                    } else if (item.tenHis) {
                                        localHisMap[item.ten] = item.tenHis;
                                    }
                                });
                                localStorage.setItem('staff_his_map', JSON.stringify(localHisMap));
                            } catch (e) { }
                        }
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

                staff: () => { document.getElementById('btn-save-staff').innerText = "Thêm"; document.getElementById('btn-cancel-staff').style.display = "none"; document.getElementById('staff-quyen').value = 'Cả hai'; document.getElementById('staff-role').value = 'Bác sĩ'; document.getElementById('staff-status').value = 'Đi làm'; },

                room: () => { document.getElementById('btn-save-room').innerText = "Thêm"; document.getElementById('btn-cancel-room').style.display = "none"; },

                pat: () => {

                    document.getElementById('btn-save-pat').innerText = "Thêm";

                    document.getElementById('btn-cancel-pat').style.display = "none";

                    const today = new Date();

                    document.getElementById('pat-date').value = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

                    if(document.getElementById('pat-room')) document.getElementById('pat-room').value = '';

                },

            };

            configs[type]?.();

        }



        // ============================================================

        // ⚙️ 1. MÁY MÓC

        // ============================================================


        function renderMachinesTable() {
            renderMachinesTable_Original();
            setTimeout(() => { }, 50);
        }

        function renderMachinesTable_Original() {
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
                return `<tr class="draggable-row editable-row" data-drag-idx="${i}" data-machine-index="${idx}" onclick="if(!window._isDraggingRow) editRoomMachine(parseInt(this.dataset.machineIndex))" title="Bấm sửa (Kéo thả nút ☰ hoặc bấm ▲/▼ để đổi thứ tự, Phím Delete để xóa)">
            <td>${renderSttOrderControl("machines", i, dataCache.machine.length)}</td>
            <td><b>${ten}</b></td>
            <td><span class="badge badge-info">${ma}</span></td>
            <td><span class="status-badge ${tt === 'Sẵn sàng' ? 'status-ready' : 'status-busy'}">${tt}</span></td>
            <td><button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteMachine(${idx})">Xóa</button></td>
        </tr>`;
            }).join('');

            if (typeof renderDynamicMachineInputs === 'function') renderDynamicMachineInputs();

            initTableDragAndDrop('machines-list', dataCache.machine, () => {
                renderMachinesTable();
                saveReorderedData('machines', dataCache.machine);
            });
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

        function toggleAllSkills(checkbox, system) {
            const container = document.getElementById(system === 'YHCT' ? 'staff-skills-yhct' : 'staff-skills-phcn');
            if (container) {
                container.querySelectorAll('.skill-checkbox').forEach(cb => cb.checked = checkbox.checked);
            }
        }

        function renderProcedureCheckboxes() {
            let sYhct = `<h4 class="yhct">💊 YHCT <input type="checkbox" onchange="toggleAllSkills(this, 'YHCT')" style="margin-left:8px; cursor:pointer; transform:scale(1.2);" title="Chọn tất cả YHCT"></h4>`, 
                sPhcn = `<h4 class="phcn">⚙️ PHCN <input type="checkbox" onchange="toggleAllSkills(this, 'PHCN')" style="margin-left:8px; cursor:pointer; transform:scale(1.2);" title="Chọn tất cả PHCN"></h4>`;

            let pYhct = '<h4 class="yhct">💊 YHCT</h4>', pPhcn = '<h4 class="phcn">⚙️ PHCN</h4>';

            (dataCache.proc || []).forEach(p => {
                if (!p) return;
                const ten = p.ten || p[1] || '';
                const he = p.he || p[3] || 'PHCN';
                if (!ten) return;

                const escapedTen = escapeHtml(ten);
                const sCb = `<label class="checkbox-item"><input type="checkbox" class="skill-checkbox" value="${escapedTen}"> ${escapedTen}</label>`;
                const pCb = `<label class="checkbox-item"><input type="checkbox" class="pat-proc-cb" value="${escapedTen}"> ${escapedTen}</label>`;

                if (he === 'YHCT') { sYhct += sCb; pYhct += pCb; } else { sPhcn += sCb; pPhcn += pCb; }
            });

            [['staff-skills-yhct', sYhct], ['staff-skills-phcn', sPhcn], ['pat-skills-yhct', pYhct], ['pat-skills-phcn', pPhcn]]
                .forEach(([id, html]) => { const el = document.getElementById(id); if (el) el.innerHTML = html; });
        }


        function renderProceduresTable() {
            renderProceduresTable_Original();
            setTimeout(() => { }, 50);
        }

        function renderProceduresTable_Original() {
            const tbody = document.getElementById('procedures-list');
            if (!tbody) return;
            if (!dataCache.proc.length) { tbody.innerHTML = renderEmptyRow(9); return; }

            tbody.innerHTML = dataCache.proc.map((item, i) => {
                const idx = dataCache.proc.indexOf(item);
                return `<tr class="draggable-row editable-row" data-drag-idx="${i}" onclick="if(!window._isDraggingRow) editProc(${idx})" title="Bấm sửa (Kéo thả nút ☰ hoặc bấm ▲/▼ để đổi thứ tự, Phím Delete để xóa)">
            <td>${renderSttOrderControl("procedures", i, dataCache.proc.length)}</td>
            <td>${escapeHtml(item.ten || item[1] || '')}</td>
            <td><strong>${escapeHtml(item.vietTat || item[2] || '')}</strong></td>
            <td>${item.thoiGianThucHien || item[6] || 0}</td>
            <td>${item.thoiGianThuThuat || item[7] || 0}</td>
            <td>${item.khoangCach || item[8] || 0}</td>
            <td>${item.canRutMay || item[9] || 'Không'}</td>
            <td>${item.canNguoiPhu || item[10] || 'Không'}</td>
            <td><button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteProcedure(${idx})">Xóa</button></td>
        </tr>`;
            }).join('');

            if (typeof filterProcTable === 'function') filterProcTable();

            initTableDragAndDrop('procedures-list', dataCache.proc, () => {
                renderProceduresTable();
                saveReorderedData('procedures', dataCache.proc);
            });
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
            renderStaffTable_Original();
            
            // Populate the "Tìm bác sĩ rảnh" filter dropdown
            const filterSelect = document.getElementById('filter-doc-name');
            if (filterSelect && dataCache.staff) {
                const currentVal = filterSelect.value;
                const docs = dataCache.staff.filter(s => {
                    const vt = String(s.vaiTro).toLowerCase();
                    return (vt.includes('bác sĩ') || vt.includes('ktv') || vt.includes('kỹ thuật viên')) && s.trangThai !== 'Nghỉ cả ngày';
                }).map(s => s.ten.trim());
                
                const uniqueDocs = [...new Set(docs)].sort();
                filterSelect.innerHTML = '<option value="">🔍 Lọc tên bác sĩ...</option>';
                uniqueDocs.forEach(docName => {
                    filterSelect.innerHTML += `<option value="${docName}">${docName}</option>`;
                });
                
                if (currentVal && uniqueDocs.includes(currentVal)) {
                    filterSelect.value = currentVal;
                }
            }

            setTimeout(() => { }, 50);
        }

        function renderStaffTable_Original() {
            const staffList = (typeof dataCache !== 'undefined' && Array.isArray(dataCache.staff)) ? dataCache.staff : [];
            const filteredStaff = staffList.filter(s => {
                const role = String(s.vaiTro || s.role || '').toLowerCase();
                return role.includes('bác sĩ') || role.includes('kỹ thuật viên') || role.includes('ktv') || role.includes('bs');
            });
            const statEl = document.getElementById('stat-staff');
            if (statEl) statEl.innerText = filteredStaff.length;

            const docGrid = document.getElementById('room-doctors-grid');
            const staffGrid = document.getElementById('room-staff-grid');
            if (docGrid && staffGrid) {
                let docHtml = '<div class="skills-col">', stfHtml = '<div class="skills-col">';
                staffList.forEach(s => {
                    if (!s || !s.ten) return;
                    const isDoc = String(s.vaiTro || s.role || '').toLowerCase().includes('bác sĩ');
                    const cb = `<label class="checkbox-item"><input type="checkbox" class="${isDoc ? 'room-doc-cb' : 'room-stf-cb'}" value="${escapeHtml(s.ten)}"> ${escapeHtml(s.ten)}</label>`;
                    if (isDoc) docHtml += cb; else stfHtml += cb;
                });
                docGrid.innerHTML = docHtml + '</div>';
                staffGrid.innerHTML = stfHtml + '</div>';
            }

            const tbody = document.getElementById('staff-list');
            if (!tbody) return;
            if (!staffList.length) { tbody.innerHTML = renderEmptyRow(8, 'Chưa có dữ liệu nhân sự'); return; }

            tbody.innerHTML = staffList.map((item, i) => {
                const idx = staffList.indexOf(item);
                const kyNangHienThi = getShortSkills(item.kyNang, true);
                return `<tr class="draggable-row editable-row" data-drag-idx="${i}" data-staff-index="${idx}" onclick="if(!window._isDraggingRow) editStaff(parseInt(this.dataset.staffIndex))" style="${item.trangThai !== 'Đi làm' ? 'opacity:0.5; background:#f9f9f9;' : ''}" title="Bấm sửa (Kéo thả nút ☰ hoặc bấm ▲/▼ để đổi thứ tự, Phím Delete để xóa)">
            <td>${renderSttOrderControl("staff", i, staffList.length)}</td>
            <td><strong>${escapeHtml(item.ten || '')}</strong></td>
            <td style="font-size:11px; max-width:100px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(item.tenHis || '')}">${escapeHtml(item.tenHis || '')}</td>
            <td><span style="color:${item.trangThai === 'Đi làm' ? '#28a745' : '#dc3545'}; font-weight:600">${escapeHtml(item.trangThai || 'Đi làm')}</span></td>
            <td>${escapeHtml(item.thoiGianLam || '07:30-11:30, 13:00-16:30')}</td>
            <td style="font-size:11px; max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><strong>${escapeHtml(kyNangHienThi)}</strong></td>
            <td style="font-size:11px;"><strong>${item.quyen === 'Cả hai' ? 'YHCT+PHCN' : escapeHtml(item.quyen || '')}</strong></td>
            <td><button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteStaff(${idx})">Xóa</button></td>
        </tr>`;
            }).join('');

            if (typeof renderBusyStaff === 'function') {
                try { renderBusyStaff(); } catch(e) { console.warn("[renderBusyStaff error]:", e); }
            }

            initTableDragAndDrop('staff-list', staffList, () => {
                renderStaffTable();
                saveReorderedData('staff', staffList);
            });
        }

        function saveStaff() {
            const ten = document.getElementById('staff-name').value.trim();
            const vaiTro = document.getElementById('staff-role').value;
            const trangThai = document.getElementById('staff-status').value;
            const tgLam = `${document.getElementById('staff-ms').value}-${document.getElementById('staff-me').value}, ${document.getElementById('staff-as').value}-${document.getElementById('staff-ae').value}`;
            const thayThe = document.getElementById('staff-replace').value;
            const quyen = document.getElementById('staff-quyen').value || 'Cả hai';
            const tenHis = document.getElementById('staff-ten-his').value.trim();
            const gioBan = editIndex.staff > -1 ? (dataCache.staff[editIndex.staff]?.gioBan || '') : '';
            const kyNang = Array.from(document.querySelectorAll('.skill-checkbox:checked')).map(cb => cb.value).join(', ');

            if (!ten) return alert("Nhập tên!");

            try {
                const localHisMap = JSON.parse(localStorage.getItem('staff_his_map') || '{}');
                localHisMap[ten] = tenHis;
                localStorage.setItem('staff_his_map', JSON.stringify(localHisMap));
            } catch (e) { }

            const obj = { ten, vaiTro, trangThai, thoiGianLam: tgLam, kyNang, gioBan, nguoiThayThe: thayThe, quyen, tenHis };

            if (window.showGlobalLoading) window.showGlobalLoading("Đang lưu nhân sự...");
            if (editIndex.staff > -1) {
                const oldItem = dataCache.staff[editIndex.staff];
                const sheetIdx = oldItem.sheetIndex !== undefined ? oldItem.sheetIndex : editIndex.staff;
                obj.sheetIndex = sheetIdx;
                obj.index = editIndex.staff;
                dataCache.staff[editIndex.staff] = obj;
                if (window.dataCacheTime) window.dataCacheTime['staff'] = Date.now();
                google.script.run
                    .withSuccessHandler(() => {
                        if (window.hideGlobalLoading) window.hideGlobalLoading();
                    })
                    .withFailureHandler((err) => {
                        if (window.hideGlobalLoading) window.hideGlobalLoading();
                        alert("Lỗi lưu nhân sự: " + (err.message || err));
                    })
                    .editNhanSu(sheetIdx, ten, vaiTro, trangThai, tgLam, kyNang, gioBan, thayThe, quyen, tenHis);
            } else {
                dataCache.staff.push(obj);
                if (window.dataCacheTime) window.dataCacheTime['staff'] = Date.now();
                google.script.run
                    .withSuccessHandler(() => {
                        if (window.hideGlobalLoading) window.hideGlobalLoading();
                    })
                    .withFailureHandler((err) => {
                        if (window.hideGlobalLoading) window.hideGlobalLoading();
                        alert("Lỗi thêm nhân sự: " + (err.message || err));
                    })
                    .addNhanSu(ten, vaiTro, trangThai, tgLam, kyNang, gioBan, thayThe, quyen, tenHis);
            }

            cancelEdit('staff'); renderStaffTable();
        }

        function editStaff(index) {

            editIndex.staff = index;

            const item = dataCache.staff[index];

            document.getElementById('staff-name').value = item.ten;

            document.getElementById('staff-role').value = item.vaiTro;

            document.getElementById('staff-status').value = item.trangThai;

            document.getElementById('staff-quyen').value = item.quyen || 'Cả hai';
            document.getElementById('staff-ten-his').value = item.tenHis || '';

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
            const s = dataCache.staff[i];
            if (!s) return;

            showCustomConfirm("Xác nhận xóa nhân sự", `Bác sĩ có chắc chắn muốn xóa nhân sự [ ${s.ten} ] không?`, function () {
                if (window.showGlobalLoading) window.showGlobalLoading("Đang xóa nhân sự...");
                const btnSave = document.getElementById('btn-save-staff');
                if (btnSave) { btnSave.disabled = true; btnSave.innerText = "Đang xóa..."; }

                const deletedSheetIndex = s.sheetIndex !== undefined ? s.sheetIndex : i;
                const staffName = s.ten;
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
                    }).deleteNhanSu(deletedSheetIndex, staffName);
            });
        }



        // ============================================================

        // 🏥 4. PHÒNG

        // ============================================================


        function renderRoomsTable() {
            renderRoomsTable_Original();
            setTimeout(() => { }, 50);
        }

        function renderRoomsTable_Original() {
            const tbody = document.getElementById('rooms-list');
            if (!tbody) return;
            const roomSelect = document.getElementById('pat-room');
            if (roomSelect) {
                const currentVal = roomSelect.value;
                const options = dataCache.room.map(r => { const ten = String(r.tenPhong || r[1] || '').trim(); return `<option value="${escapeHtml(ten)}">${escapeHtml(ten)}</option>`; }).join('');
                roomSelect.innerHTML = `<option value="">-- Chọn phòng --</option>` + options;
                if (currentVal) roomSelect.value = currentVal;
            }

            if (!dataCache.room.length) { tbody.innerHTML = renderEmptyRow(7, 'Chưa có dữ liệu phòng'); return; }

            tbody.innerHTML = dataCache.room.map((item, i) => {
                const idx = dataCache.room.indexOf(item);
                return `<tr class="draggable-row editable-row" data-drag-idx="${i}" onclick="if(!window._isDraggingRow) editRoom(${idx})" title="Bấm sửa (Kéo thả nút ☰ hoặc bấm ▲/▼ để đổi thứ tự, Phím Delete để xóa)">
            <td>${renderSttOrderControl("rooms", i, dataCache.room.length)}</td>
            <td><strong>${escapeHtml(item.tenPhong || item[1] || '')}</strong></td>
            <td>${escapeHtml(item.bacSi || item[2] || '')}</td>
            <td style="font-size:11px">${item.ktv || item[3] || ''}</td>
            <td style="font-size:11px; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.danhSachMay || item[4] || ''}">${escapeHtml(item.danhSachMay || item[4] || '')}</td>
            <td style="text-align:center;">${item.soGiuong || item[5] || 0}</td>
            <td><button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteRoom(${idx})">Xóa</button></td>
        </tr>`;
            }).join('');

            if (typeof filterRoomTable === 'function') filterRoomTable();

            initTableDragAndDrop('rooms-list', dataCache.room, () => {
                renderRoomsTable();
                saveReorderedData('rooms', dataCache.room);
            });
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


        let _patSortMode = 0; // 0 = mặc định (theo CSDL), 1 = Ngày vào mới -> cũ, 2 = Ngày vào cũ -> mới
        window.toggleSortPatientsByNgayVao = function() {
            if (!dataCache.pat || !dataCache.pat.length) return;
            _patSortMode = (_patSortMode + 1) % 3;
            const th = document.getElementById('th-pat-ngayvao');
            if (th) {
                if (_patSortMode === 1) th.innerText = "Ngày Vào ▼";
                else if (_patSortMode === 2) th.innerText = "Ngày Vào ▲";
                else th.innerText = "Ngày Vào";
            }
            renderPatientsTable();
        };

        function renderPatientsTable() {
            renderPatientsTable_Original();
            // filterPatientTable được gọi 1 lần duy nhất ở cuối renderPatientsTable_Original
        }

        function renderPatientsTable_Original() {
            const uniqueNames = [...new Set(dataCache.pat.map(p => p.ten))].filter(Boolean);
            const optionsHtml = uniqueNames.map(name => `<option value="${name}">`).join('');
            ['pat-name-suggestions', 'busy-pat-datalist', 'leave-pat-datalist'].forEach(id => {
                const dl = document.getElementById(id); if (dl) dl.innerHTML = optionsHtml;
            });
            const statPat = document.getElementById('stat-patients');
            if (statPat) statPat.innerText = dataCache.pat.length;

            const tbody = document.getElementById('patients-list');
            if (!tbody) return;
            if (!dataCache.pat.length) { tbody.innerHTML = renderEmptyRow(9, 'Chưa có dữ liệu bệnh nhân'); return; }

            const schedData = (window.currentScheduleData && window.currentScheduleData.length) ? window.currentScheduleData : ((typeof dataCache !== 'undefined' && dataCache.schedule) ? dataCache.schedule : []);

            let displayPatList = dataCache.pat.map((p, origIdx) => ({ ...p, _origIndex: p.index !== undefined ? p.index : origIdx }));
            if (_patSortMode === 1) {
                displayPatList.sort((a, b) => parseNgayVao(b.ngayVao || '') - parseNgayVao(a.ngayVao || ''));
            } else if (_patSortMode === 2) {
                displayPatList.sort((a, b) => parseNgayVao(a.ngayVao || '') - parseNgayVao(b.ngayVao || ''));
            } else {
                displayPatList.sort((a, b) => a._origIndex - b._origIndex);
            }

            tbody.innerHTML = displayPatList.map((item, i) => {
                const idx = item._origIndex;
                const patName = String(item.ten || '').toUpperCase().trim();
                const patNS = String(item.namSinh || '').trim();
                const reqProcs = item.thuThuat ? item.thuThuat.split(',').map(x => x.trim()).filter(Boolean) : [];
                const reqCount = reqProcs.length;

                const schedItems = schedData.filter(r => {
                    if (!r) return false;
                    const rName = String(r.tenBN || r.HOTEN || r[1] || '').toUpperCase().trim();
                    const rNS = String(r.namSinh || r.NAMSINH || r[2] || '').trim();
                    const isSameName = rName === patName;
                    const isSameNS = !patNS || !rNS || patNS === rNS;
                    const gio = String(r.gioDienRa || r.GIODIENRA || r[5] || '');
                    const isNotDropped = !r.__dropped && gio !== '❌ Rớt' && gio !== '--';
                    return isSameName && isSameNS && isNotDropped;
                });

                const missingProcs = [];
                const matchedSchedIndices = new Set();
                reqProcs.forEach(req => {
                    const foundIdx = schedItems.findIndex((s, sIdx) => !matchedSchedIndices.has(sIdx) && matchProc(s.thuThuat || s.DICHVU || s[4] || '', req));
                    if (foundIdx !== -1) {
                        matchedSchedIndices.add(foundIdx);
                    } else {
                        missingProcs.push(req);
                    }
                });

                let nhanTrangThai = '';
                if (reqCount > 0) {
                    if (schedItems.length === 0) {
                        nhanTrangThai = `<span style="background:#f39c12;color:white;padding:2px 6px;border-radius:10px;font-size:10px;margin-left:5px;">Chưa xếp</span>`;
                    } else if (missingProcs.length === 0) {
                        nhanTrangThai = `<span style="background:#2ecc71;color:white;padding:2px 6px;border-radius:10px;font-size:10px;margin-left:5px;">Đã đủ</span>`;
                    } else {
                        const displayText = getShortSkills(missingProcs.join(', '));
                        nhanTrangThai = `<span style="background:#3498db;color:white;padding:2px 6px;border-radius:10px;font-size:10px;margin-left:5px;">Thiếu: ${displayText}</span>`;
                    }
                }

                const displayGioYLenh = (item.gioVao && item.gioVao !== '07:30' && item.gioVao !== '7:30') ? item.gioVao : '';

                return `<tr class="editable-row" data-pat-index="${idx}" onclick="editPatient(parseInt(this.dataset.patIndex))" style="${item.gioRa ? 'background:#f8d7da;opacity:0.8;' : ''}" title="Bấm sửa (Phím Delete để xóa)">
            <td>${i + 1}</td>
            <td><strong>${escapeHtml(item.ten)}</strong> ${nhanTrangThai}</td>
            <td>${escapeHtml(item.namSinh || '')}</td><td>${escapeHtml(item.ngayVao || '')}</td>
            <td style="text-align:center;">${displayGioYLenh ? `<strong style="color:#e67e22">${escapeHtml(displayGioYLenh)}</strong>` : ''}</td>
            <td><strong style="color:#c0392b">${escapeHtml(item.gioRa || '')}</strong></td>
            <td>${escapeHtml(item.phong || '')}</td>
            <td style="font-size:11px;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(item.thuThuat)}"><strong>${escapeHtml(getShortSkills(item.thuThuat))}</strong></td>
            <td><button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deletePatient(parseInt(this.closest('tr').dataset.patIndex))">Xóa</button></td>
        </tr>`;
            }).join('');

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
            if (checkUnclosedDay()) return;


            // 🛡️ Chống gọi kép: Bỏ qua nếu đã đang xử lý
            if (window._savePatientLock) { console.warn("savePatient: blocked double call"); return; }
            window._savePatientLock = true;

            let ten = document.getElementById('pat-name').value;
            const nam = document.getElementById('pat-year').value;
            const ngay = document.getElementById('pat-date').value;
            const gio = document.getElementById('pat-time').value.trim() || '07:30';
            const phong = document.getElementById('pat-room').value;
            const ban = document.getElementById('pat-busy').value;
            const ra = document.getElementById('pat-leave').value;
            const tt = Array.from(document.querySelectorAll('.pat-proc-cb:checked')).map(cb => cb.value).join(', ');

            if (!ten) { window._savePatientLock = false; return alert("Nhập tên bệnh nhân"); }
            if (!phong) { window._savePatientLock = false; return alert("Vui lòng chọn Phòng"); }

            ten = ten.trim().toLowerCase().replace(/(?:^|\s)\S/g, a => a.toUpperCase());

            // Khóa form và nút lưu
            const btnSave = document.getElementById('btn-save-pat');
            if (btnSave) { btnSave.disabled = true; btnSave.innerText = 'Đang lưu...'; }

            // Hiển thị màn hình khóa để chống bấm đè gây trùng lặp dữ liệu
            if (window.showGlobalLoading) window.showGlobalLoading("Đang lưu bệnh nhân...");

            // Chụp index TRƯỚC khi cancelEdit reset về -1
            const currentEditIdx = editIndex.pat;
            const currentItem = currentEditIdx > -1 ? dataCache.pat[currentEditIdx] : null;

            // ⚡ Cập nhật tức thời lên giao diện (Optimistic UI Update) để người dùng không phải chờ
            if (currentEditIdx > -1 && currentItem) {
                currentItem.ten = ten;
                currentItem.namSinh = nam;
                currentItem.ngayVao = ngay;
                currentItem.gioVao = gio;
                currentItem.gioBan = ban;
                currentItem.gioRa = ra;
                currentItem.phong = phong;
                currentItem.thuThuat = tt;
                renderPatientsTable();
            } else {
                const newPat = {
                    ten: ten,
                    namSinh: nam,
                    ngayVao: ngay,
                    gioVao: gio,
                    gioBan: ban,
                    gioRa: ra,
                    phong: phong,
                    thuThuat: tt,
                    sheetIndex: dataCache.pat ? dataCache.pat.length : 0,
                    index: dataCache.pat ? dataCache.pat.length : 0
                };
                if (!dataCache.pat) dataCache.pat = [];
                dataCache.pat.push(newPat);
                renderPatientsTable();
            }

            const onDone = () => {
                window._savePatientLock = false;
                if (window.hideGlobalLoading) window.hideGlobalLoading();
                if (btnSave) { btnSave.disabled = false; btnSave.innerText = 'Lưu'; }

                // Trì hoãn 500ms trước khi đồng bộ lại từ server để tránh render nhiều lần liên tiếp
                setTimeout(() => {
                    if (window.dataCacheTime) window.dataCacheTime['pat'] = 0;
                    loadEntity('getBenhNhan', 'pat', () => {
                        renderPatientsTable();
                        if (typeof loadDashboard === 'function') loadDashboard();
                    }, [], true);
                }, 500);
            };
            const onError = (e) => {
                window._savePatientLock = false;
                if (window.hideGlobalLoading) window.hideGlobalLoading();
                if (btnSave) { btnSave.disabled = false; btnSave.innerText = 'Lưu'; }
                alert('Lỗi khi lưu: ' + e);

                // Khôi phục lại dữ liệu gốc từ máy chủ nếu xảy ra lỗi lưu
                if (window.dataCacheTime) window.dataCacheTime['pat'] = 0;
                loadEntity('getBenhNhan', 'pat', renderPatientsTable, [], true);
            };

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
            if (checkUnclosedDay()) return;


            editIndex.pat = index;

            const item = dataCache.pat[index];

            document.getElementById('pat-name').value = item.ten;

            document.getElementById('pat-year').value = item.namSinh;

            document.getElementById('pat-date').value = item.ngayVao;

            document.getElementById('pat-time').value = item.gioVao || '07:30';

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
            if (checkUnclosedDay()) return;


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
            let stt = 1;
            dataCache.pat.forEach(p => {
                if (!p.gioBan) return;
                p.gioBan.split(',').map(s => s.trim()).filter(s => s).forEach(slot => {
                    html += `<tr class="editable-row" onclick="editBusyPat('${p.ten}', '${slot}')">
                        <td align="center" style="font-weight: 600; color: #475569;">${stt++}</td>
                        <td><strong>${p.ten}</strong></td>
                        <td style="color:#d35400; font-weight:bold;">${formatSlotDisplay(slot)}</td>
                    </tr>`;
                });
            });
            tbody.innerHTML = html || `<tr><td colspan="3" align="center" style="color:gray; padding:10px;">Chưa có bệnh nhân báo bận</td></tr>`;
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
            if (checkUnclosedDay()) return;

            const idx = getBusyPatIdx();
            if (idx === -1) return alert('Vui lòng chọn đích danh bệnh nhân từ danh sách xổ xuống!');
            const fromObj = document.getElementById('busy-pat-from');
            const toObj = document.getElementById('busy-pat-to');
            const from = fromObj.value, to = toObj.value;
            if (!from) return alert('Nhập thời gian!');
            const finalTo = to || from;
            const p = dataCache.pat[idx];
            const newSlot = from + '-' + finalTo;
            if (window.editingPatSlot && window.editingPatName === p.ten) {
                let slotsArr = p.gioBan ? p.gioBan.split(',').map(x => x.trim()) : [];
                p.gioBan = slotsArr.filter(x => x && x !== window.editingPatSlot).join(', ');
                window.editingPatSlot = ''; window.editingPatName = '';
            }
            p.gioBan = sortTimeSlots(p.gioBan ? p.gioBan + ', ' + newSlot : newSlot);
            renderPatientsTable();
            fromObj.value = ''; toObj.value = ''; fromObj.focus();
            const busyInput = document.getElementById('busy-pat-input');
            if (busyInput) busyInput.value = '';

            const sheetIdx = p.sheetIndex !== undefined ? p.sheetIndex : idx;
            if (window.showGlobalLoading) window.showGlobalLoading("Đang lưu giờ bận bệnh nhân...");
            google.script.run
                .withSuccessHandler(() => {
                    if (window.hideGlobalLoading) window.hideGlobalLoading();
                    if (window.dataCacheTime) window.dataCacheTime['pat'] = 0;
                    loadEntity('getBenhNhan', 'pat', renderPatientsTable, [], true);
                })
                .withFailureHandler(err => {
                    if (window.hideGlobalLoading) window.hideGlobalLoading();
                    alert("Lỗi lưu giờ bận: " + err.message);
                    if (window.dataCacheTime) window.dataCacheTime['pat'] = 0;
                    loadEntity('getBenhNhan', 'pat', renderPatientsTable, [], true);
                })
                .editBenhNhan(sheetIdx, p.ten, p.namSinh, p.ngayVao, p.gioVao, p.gioBan, p.gioRa, p.phong, p.thuThuat, p.ten, p.namSinh);
        });

        function deleteSinglePatBusy() {
            if (checkUnclosedDay()) return;

            const idx = getBusyPatIdx();
            if (idx === -1) return alert('Vui lòng chọn đích danh bệnh nhân!');
            const from = document.getElementById('busy-pat-from').value;
            const to = document.getElementById('busy-pat-to').value;
            if (!from) return alert('Vui lòng click vào khoảng giờ trên bảng để xóa!');
            const finalTo = to || from;
            const p = dataCache.pat[idx];
            if (!p.gioBan) return;
            const slotToDelete = from + '-' + finalTo;

            showCustomConfirm("Xóa giờ bận", "Bác sĩ có muốn xóa giờ bận [ " + slotToDelete + " ] của BN: " + p.ten + "?", function () {
                p.gioBan = p.gioBan.split(',').map(x => x.trim()).filter(x => x && x !== slotToDelete).join(', ');
                renderPatientsTable();
                document.getElementById('busy-pat-from').value = '';
                document.getElementById('busy-pat-to').value = '';
                const busyInput = document.getElementById('busy-pat-input');
                if (busyInput) busyInput.value = '';

                const sheetIdx = p.sheetIndex !== undefined ? p.sheetIndex : idx;
                if (window.showGlobalLoading) window.showGlobalLoading("Đang xóa giờ bận bệnh nhân...");
                google.script.run
                    .withSuccessHandler(() => {
                        if (window.hideGlobalLoading) window.hideGlobalLoading();
                        if (window.dataCacheTime) window.dataCacheTime['pat'] = 0;
                        loadEntity('getBenhNhan', 'pat', renderPatientsTable, [], true);
                    })
                    .withFailureHandler(err => {
                        if (window.hideGlobalLoading) window.hideGlobalLoading();
                        alert("Lỗi xóa giờ bận: " + err.message);
                        if (window.dataCacheTime) window.dataCacheTime['pat'] = 0;
                        loadEntity('getBenhNhan', 'pat', renderPatientsTable, [], true);
                    })
                    .editBenhNhan(sheetIdx, p.ten, p.namSinh, p.ngayVao, p.gioVao, p.gioBan, p.gioRa, p.phong, p.thuThuat, p.ten, p.namSinh);
            });
        }

        function clearPatBusy() {
            if (checkUnclosedDay()) return;

            const idx = getBusyPatIdx();
            if (idx === -1) return alert('Vui lòng chọn đích danh bệnh nhân!');
            const p = dataCache.pat[idx];
            if (!confirm("Xóa toàn bộ giờ bận của BN: " + p.ten + "?")) return;

            p.gioBan = ''; renderPatientsTable();
            const busyInput = document.getElementById('busy-pat-input');
            if (busyInput) busyInput.value = '';

            const sheetIdx = p.sheetIndex !== undefined ? p.sheetIndex : idx;
            if (window.showGlobalLoading) window.showGlobalLoading("Đang xóa toàn bộ giờ bận...");
            google.script.run
                .withSuccessHandler(() => {
                    if (window.hideGlobalLoading) window.hideGlobalLoading();
                    if (window.dataCacheTime) window.dataCacheTime['pat'] = 0;
                    loadEntity('getBenhNhan', 'pat', renderPatientsTable, [], true);
                })
                .withFailureHandler(err => {
                    if (window.hideGlobalLoading) window.hideGlobalLoading();
                    alert("Lỗi xóa giờ bận: " + err.message);
                    if (window.dataCacheTime) window.dataCacheTime['pat'] = 0;
                    loadEntity('getBenhNhan', 'pat', renderPatientsTable, [], true);
                })
                .editBenhNhan(sheetIdx, p.ten, p.namSinh, p.ngayVao, p.gioVao, '', p.gioRa, p.phong, p.thuThuat, p.ten, p.namSinh);
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
            if (checkUnclosedDay()) return;

            const idx = getLeavePatIdx();
            if (idx === -1) return alert('Vui lòng chọn đích danh bệnh nhân từ danh sách xổ xuống!');
            const leaveObj = document.getElementById('leave-pat-time');
            const leaveTime = leaveObj.value;
            if (!leaveTime) return alert('Nhập giờ ra viện!');
            const p = dataCache.pat[idx];

            p.gioRa = leaveTime;
            // Cập nhật ngay trên currentScheduleData để In/Xuất Excel phản ánh đúng
            if (window.currentScheduleData) {
                const patTenLower = String(p.ten || '').trim().toLowerCase();
                window.currentScheduleData.forEach(row => {
                    if (String(row.tenBN || '').trim().toLowerCase() === patTenLower) {
                        row.__isDischarged = true;
                    }
                });
            }
            renderPatientsTable();
            leaveObj.value = ''; leaveObj.focus();
            const leaveInput = document.getElementById('leave-pat-input');
            if (leaveInput) leaveInput.value = '';

            const sheetIdx = p.sheetIndex !== undefined ? p.sheetIndex : idx;
            if (window.showGlobalLoading) window.showGlobalLoading("Đang cập nhật giờ ra viện...");
            google.script.run
                .withSuccessHandler(() => {
                    if (window.hideGlobalLoading) window.hideGlobalLoading();
                    if (window.dataCacheTime) window.dataCacheTime['pat'] = 0;
                    loadEntity('getBenhNhan', 'pat', renderPatientsTable, [], true);
                })
                .withFailureHandler(err => {
                    if (window.hideGlobalLoading) window.hideGlobalLoading();
                    alert("Lỗi cập nhật giờ ra viện: " + err.message);
                    if (window.dataCacheTime) window.dataCacheTime['pat'] = 0;
                    loadEntity('getBenhNhan', 'pat', renderPatientsTable, [], true);
                })
                .editBenhNhan(sheetIdx, p.ten, p.namSinh, p.ngayVao, p.gioVao, p.gioBan, leaveTime, p.phong, p.thuThuat, p.ten, p.namSinh);
        });

        function clearPatLeave() {
            if (checkUnclosedDay()) return;

            const idx = getLeavePatIdx();
            if (idx === -1) return alert('Vui lòng chọn đích danh bệnh nhân!');
            const p = dataCache.pat[idx];
            if (!confirm("Hủy giờ ra viện của BN: " + p.ten + "?")) return;

            p.gioRa = ''; renderPatientsTable(); document.getElementById('leave-pat-time').value = '';
            const leaveInput = document.getElementById('leave-pat-input');
            if (leaveInput) leaveInput.value = '';

            const sheetIdx = p.sheetIndex !== undefined ? p.sheetIndex : idx;
            if (window.showGlobalLoading) window.showGlobalLoading("Đang hủy giờ ra viện...");
            google.script.run
                .withSuccessHandler(() => {
                    if (window.hideGlobalLoading) window.hideGlobalLoading();
                    if (window.dataCacheTime) window.dataCacheTime['pat'] = 0;
                    loadEntity('getBenhNhan', 'pat', renderPatientsTable, [], true);
                })
                .withFailureHandler(err => {
                    if (window.hideGlobalLoading) window.hideGlobalLoading();
                    alert("Lỗi hủy giờ ra viện: " + err.message);
                    if (window.dataCacheTime) window.dataCacheTime['pat'] = 0;
                    loadEntity('getBenhNhan', 'pat', renderPatientsTable, [], true);
                })
                .editBenhNhan(sheetIdx, p.ten, p.namSinh, p.ngayVao, p.gioVao, p.gioBan, '', p.phong, p.thuThuat, p.ten, p.namSinh);
        }



        // ============================================================

        // 👷 TAB GIỜ BẬN NHÂN VIÊN

        // ============================================================

        function renderBusyStaff() {
            const select = document.getElementById('busy-staff-select');
            const thead = document.getElementById('busy-staff-thead');
            const tbody = document.getElementById('busy-staff-tbody');
            if (!select || !thead || !tbody) return;

            const prevVal = select.value;
            select.innerHTML = (dataCache.staff || []).map((s, i) => `<option value="${i}">${escapeHtml(String(s.ten || '').toUpperCase())}</option>`).join('');
            if (prevVal !== "" && prevVal !== null && select.querySelector(`option[value="${prevVal}"]`)) {
                select.value = prevVal;
            }

            const busyIndices = (dataCache.staff || []).map((s, i) => (s && s.gioBan && String(s.gioBan).trim()) ? i : -1).filter(i => i > -1);

            if (!busyIndices.length) {
                thead.innerHTML = '';
                tbody.innerHTML = '<tr><td align="center" style="color:gray; padding:20px; font-style:italic;">✅ Hiện tại chưa có nhân viên nào báo bận</td></tr>';
                return;
            }

            thead.innerHTML = '<tr><th style="width: 40px; min-width: 40px; text-align: center;">STT</th>' + busyIndices.map(idx => `<th style="text-align:center; font-size:11px; text-transform:uppercase; padding:2px 6px;">${escapeHtml(dataCache.staff[idx].ten)}</th>`).join('') + '</tr>';

            const slotArrays = busyIndices.map(idx => {
                const gb = dataCache.staff[idx]?.gioBan;
                if (!gb) return [];
                if (Array.isArray(gb)) return gb.filter(Boolean);
                return String(gb).split(',').map(x => x.trim()).filter(Boolean);
            });

            const maxSlots = Math.max(...slotArrays.map(a => a.length), 0);

            let tbHtml = '';
            for (let i = 0; i < maxSlots; i++) {
                tbHtml += '<tr>';
                tbHtml += `<td align="center" style="font-weight: 700; color: #475569; width: 40px; min-width: 40px;">${i + 1}</td>`;

                busyIndices.forEach((origIdx, arrIdx) => {
                    const slot = slotArrays[arrIdx][i];
                    tbHtml += slot
                        ? `<td align="center" style="font-size:11px; color:#c0392b; font-weight:bold;" class="editable-row" onclick="editBusyStaff(${origIdx}, '${slot}')" title="Bấm sửa (Delete để xóa)">${formatSlotDisplay(slot)}</td>`
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

        const saveStaffBusy = withLock(function () {
            if (checkUnclosedDay()) return;

            const select = document.getElementById('busy-staff-select');
            if (!select) return;
            const idx = select.value;
            if (idx === "" || idx === null || isNaN(parseInt(idx))) return alert('Vui lòng chọn nhân viên!');
            const fromObj = document.getElementById('busy-staff-from');
            const toObj = document.getElementById('busy-staff-to');
            const from = fromObj.value.trim(), to = toObj.value.trim();
            if (!from) return alert('Vui lòng nhập thời gian!');
            const finalTo = to || from;
            const s = dataCache.staff[parseInt(idx)];
            if (!s) return alert('Không tìm thấy nhân viên!');
            const newSlot = from + '-' + finalTo;
            if (window.editingStaffSlot && String(window.editingStaffIdx) === String(idx)) {
                const curSlots = s.gioBan ? (typeof s.gioBan === 'string' ? s.gioBan.split(',') : s.gioBan).map(x => x.trim()).filter(x => x && x !== window.editingStaffSlot) : [];
                s.gioBan = curSlots.join(', ');
                window.editingStaffSlot = ''; window.editingStaffIdx = '';
            }
            s.gioBan = sortTimeSlots(s.gioBan ? s.gioBan + ', ' + newSlot : newSlot);
            renderStaffTable();
            if (typeof renderBusyStaff === 'function') renderBusyStaff();
            select.value = idx; fromObj.value = ''; toObj.value = ''; fromObj.focus();

            const sheetIdx = s.sheetIndex !== undefined ? s.sheetIndex : parseInt(idx);
            const kyNangStr = typeof s.kyNang === 'string' ? s.kyNang : (Array.isArray(s.kyNang) ? s.kyNang.join(', ') : '');
            const gioBanStr = typeof s.gioBan === 'string' ? s.gioBan : (Array.isArray(s.gioBan) ? s.gioBan.join(', ') : '');

            if (window.showGlobalLoading) window.showGlobalLoading("Đang lưu giờ bận nhân sự...");
            google.script.run
                .withSuccessHandler(() => {
                    if (window.hideGlobalLoading) window.hideGlobalLoading();
                    if (window.dataCacheTime) window.dataCacheTime['staff'] = 0;
                    loadEntity('getNhanSu', 'staff', renderStaffTable, [
                        () => { if (typeof renderBusyStaff === 'function') renderBusyStaff(); }
                    ], true);
                })
                .withFailureHandler(err => {
                    if (window.hideGlobalLoading) window.hideGlobalLoading();
                    alert("Lỗi lưu giờ bận: " + (err.message || err));
                    if (window.dataCacheTime) window.dataCacheTime['staff'] = 0;
                    loadEntity('getNhanSu', 'staff', renderStaffTable, [
                        () => { if (typeof renderBusyStaff === 'function') renderBusyStaff(); }
                    ], true);
                })
                .editNhanSu(sheetIdx, s.ten, s.vaiTro || 'Kỹ thuật viên', s.trangThai || 'Đi làm', s.thoiGianLam || '07:30-11:30, 13:00-16:30', kyNangStr, gioBanStr, s.nguoiThayThe || 'Không', s.quyen || 'Cả hai', s.tenHis || '');
        });

        function deleteSingleStaffBusy() {
            if (checkUnclosedDay()) return;

            const select = document.getElementById('busy-staff-select');
            if (!select) return;
            const idx = select.value;
            if (idx === "" || idx === null || isNaN(parseInt(idx))) return alert('Vui lòng chọn nhân viên!');
            const from = document.getElementById('busy-staff-from').value.trim();
            const to = document.getElementById('busy-staff-to').value.trim();
            if (!from) return alert('Vui lòng click vào một khoảng giờ trên bảng để xóa!');
            const finalTo = to || from;
            const s = dataCache.staff[parseInt(idx)];
            if (!s || !s.gioBan) return;
            const slotToDelete = from + '-' + finalTo;

            showCustomConfirm("Xóa giờ bận", "Bác sĩ có muốn xóa giờ bận [ " + slotToDelete + " ] của NV: " + s.ten + "?", function () {
                const curSlots = (typeof s.gioBan === 'string' ? s.gioBan.split(',') : s.gioBan).map(x => x.trim()).filter(x => x && x !== slotToDelete);
                s.gioBan = curSlots.join(', ');
                renderStaffTable();
                if (typeof renderBusyStaff === 'function') renderBusyStaff();
                document.getElementById('busy-staff-from').value = '';
                document.getElementById('busy-staff-to').value = '';

                const sheetIdx = s.sheetIndex !== undefined ? s.sheetIndex : parseInt(idx);
                const kyNangStr = typeof s.kyNang === 'string' ? s.kyNang : (Array.isArray(s.kyNang) ? s.kyNang.join(', ') : '');
                const gioBanStr = typeof s.gioBan === 'string' ? s.gioBan : (Array.isArray(s.gioBan) ? s.gioBan.join(', ') : '');

                if (window.showGlobalLoading) window.showGlobalLoading("Đang xóa giờ bận nhân sự...");
                google.script.run
                    .withSuccessHandler(() => {
                        if (window.hideGlobalLoading) window.hideGlobalLoading();
                        if (window.dataCacheTime) window.dataCacheTime['staff'] = 0;
                        loadEntity('getNhanSu', 'staff', renderStaffTable, [
                            () => { if (typeof renderBusyStaff === 'function') renderBusyStaff(); }
                        ], true);
                    })
                    .withFailureHandler(err => {
                        if (window.hideGlobalLoading) window.hideGlobalLoading();
                        alert("Lỗi xóa giờ bận: " + (err.message || err));
                        if (window.dataCacheTime) window.dataCacheTime['staff'] = 0;
                        loadEntity('getNhanSu', 'staff', renderStaffTable, [
                            () => { if (typeof renderBusyStaff === 'function') renderBusyStaff(); }
                        ], true);
                    })
                    .editNhanSu(sheetIdx, s.ten, s.vaiTro || 'Kỹ thuật viên', s.trangThai || 'Đi làm', s.thoiGianLam || '07:30-11:30, 13:00-16:30', kyNangStr, gioBanStr, s.nguoiThayThe || 'Không', s.quyen || 'Cả hai', s.tenHis || '');
            });
        }

        function clearStaffBusy() {
            if (checkUnclosedDay()) return;

            const select = document.getElementById('busy-staff-select');
            if (!select) return;
            const idx = select.value;
            if (idx === "" || idx === null || isNaN(parseInt(idx))) return alert('Vui lòng chọn nhân viên!');
            const s = dataCache.staff[parseInt(idx)];
            if (!s) return;
            if (!confirm("Xóa toàn bộ giờ bận của NV: " + s.ten + "?")) return;

            s.gioBan = ''; 
            renderStaffTable();
            if (typeof renderBusyStaff === 'function') renderBusyStaff();

            const sheetIdx = s.sheetIndex !== undefined ? s.sheetIndex : parseInt(idx);
            const kyNangStr = typeof s.kyNang === 'string' ? s.kyNang : (Array.isArray(s.kyNang) ? s.kyNang.join(', ') : '');

            if (window.showGlobalLoading) window.showGlobalLoading("Đang xóa toàn bộ giờ bận...");
            google.script.run
                .withSuccessHandler(() => {
                    if (window.hideGlobalLoading) window.hideGlobalLoading();
                    if (window.dataCacheTime) window.dataCacheTime['staff'] = 0;
                    loadEntity('getNhanSu', 'staff', renderStaffTable, [
                        () => { if (typeof renderBusyStaff === 'function') renderBusyStaff(); }
                    ], true);
                })
                .withFailureHandler(err => {
                    if (window.hideGlobalLoading) window.hideGlobalLoading();
                    alert("Lỗi xóa giờ bận: " + (err.message || err));
                    if (window.dataCacheTime) window.dataCacheTime['staff'] = 0;
                    loadEntity('getNhanSu', 'staff', renderStaffTable, [
                        () => { if (typeof renderBusyStaff === 'function') renderBusyStaff(); }
                    ], true);
                })
                .editNhanSu(sheetIdx, s.ten, s.vaiTro || 'Kỹ thuật viên', s.trangThai || 'Đi làm', s.thoiGianLam || '07:30-11:30, 13:00-16:30', kyNangStr, '', s.nguoiThayThe || 'Không', s.quyen || 'Cả hai', s.tenHis || '');
        }



        // ============================================================

        // 📅 TAB XẾP LỊCH

        // ============================================================

        // Helper: đánh dấu bệnh nhân đã ra viện vào dữ liệu lịch
        function markDischargedInSchedule(schedData) {
            if (!Array.isArray(schedData)) return schedData;
            const patList = (typeof dataCache !== 'undefined' && dataCache.pat) ? dataCache.pat : [];
            schedData.forEach(row => {
                if (!row) return;
                const tenBN = String(row.tenBN || '').trim().toLowerCase();
                if (!tenBN) { row.__isDischarged = false; return; }
                const matched = patList.find(p => String(p.ten || '').trim().toLowerCase() === tenBN);
                row.__isDischarged = !!(matched && matched.gioRa && String(matched.gioRa).trim() !== '');
            });
            return schedData;
        }

        function loadScheduleList() {
            if (window.viewingImportedScheduleFile) return;

            let data = (typeof dataCache !== 'undefined' && dataCache.schedule) ? dataCache.schedule : [];
            if (!data.length) {
                try {
                    const localSched = JSON.parse(localStorage.getItem('meds_success') || '[]');
                    if (Array.isArray(localSched) && localSched.length) {
                        // ✅ Kiểm tra ngày trước khi dùng lịch từ localStorage
                        const savedDate = localStorage.getItem('meds_schedule_date') || '';
                        const nowVN3 = new Date(Date.now() + 7 * 60 * 60 * 1000);
                        const todayYMD3 = `${nowVN3.getUTCFullYear()}-${String(nowVN3.getUTCMonth() + 1).padStart(2, '0')}-${String(nowVN3.getUTCDate()).padStart(2, '0')}`;
                        const toYMD3 = (s) => { if (!s) return ''; if (String(s).includes('/')) { const p = String(s).split('/'); return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`; } return String(s); };
                        const schedDate3 = savedDate ? toYMD3(savedDate) : toYMD3(localSched[0]?.[0] || localSched[0]?.ngay || localSched[0]?.NGAY || '');
                        if (!schedDate3 || schedDate3 === todayYMD3) {
                            data = localSched;
                            if (typeof dataCache !== 'undefined') dataCache.schedule = localSched;
                            if (window.dataCache) window.dataCache.schedule = localSched;
                        } else {
                            console.warn(`⚠️ [loadScheduleList] Bỏ qua lịch cũ ngày ${schedDate3} (hôm nay: ${todayYMD3})`);
                            localStorage.removeItem('meds_success');
                            localStorage.removeItem('meds_schedule_date');
                        }
                    }
                } catch (e) { }
            }

            const rows = data.map(normalizeScheduleRow);
            window.currentScheduleData = markDischargedInSchedule(rows.filter(row => !isDroppedScheduleRow(row)));

            const droppedFromSheet = rows.filter(isDroppedScheduleRow).map(row => normalizeDroppedItem([
                row.ngay, row.tenBN, row.namSinh, row.phong, row.thuThuat, row.gioDienRa,
                row.gioKetThuc, row.nvChinh, row.nvPhu
            ]));

            let localDropped = [];
            try {
                localDropped = JSON.parse(localStorage.getItem('meds_unscheduled') || '[]');
            } catch (e) { }

            const cleanedDropped = reconcileUnscheduledData([...droppedFromSheet, ...localDropped]);
            setUnscheduledData(cleanedDropped);

            filterSchedule();
            if (typeof renderStats === 'function') renderStats(window.lastUnscheduledData);
            if (typeof renderPatientsTable === 'function') renderPatientsTable();
            if (typeof loadDashboard === 'function') loadDashboard();
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
            const cleanedUnscheduled = reconcileUnscheduledData(window.lastUnscheduledData || []);
            const droppedData = cleanedUnscheduled.map(item => {
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

                let isDischargedA = !!a.__isDischarged;
                let isDischargedB = !!b.__isDischarged;
                const activeSort = window.scheduleSortState;

                if (!activeSort && isDischargedA !== isDischargedB) return isDischargedA ? -1 : 1;

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

                const isDischarged = !!item.__isDischarged;
                const dischargeMark = isDischarged ? ' <span style="color:#27ae60; font-size:10.5px; font-style:italic; font-weight:700; white-space:nowrap; margin-left:4px;">(✔ RV)</span>' : '';

                return `<tr class="${rowClass}"${reasonTitle}>

            <td style="text-align:center">${start + i + 1}</td>

            <td style="text-align:center">${ngayShort}</td>

            <td style="font-weight:bold;">${item.tenBN || ''}${dischargeMark}</td>

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

        // Trạng thái chọn ngày đông/vắng, mặc định = null (tự động tính)
        window._crowdedMode = null;

        function setCrowdedMode(isCrowded) {
            window._crowdedMode = isCrowded;
            const btnYes = document.getElementById('btn-crowded-yes');
            const btnNo = document.getElementById('btn-crowded-no');
            if (!btnYes || !btnNo) return;
            if (isCrowded) {
                btnYes.style.background = '#2980b9'; btnYes.style.color = 'white'; btnYes.style.borderColor = '#2980b9';
                btnNo.style.background = 'white'; btnNo.style.color = '#555'; btnNo.style.borderColor = '#bdc3c7';
            } else {
                btnNo.style.background = '#27ae60'; btnNo.style.color = 'white'; btnNo.style.borderColor = '#27ae60';
                btnYes.style.background = 'white'; btnYes.style.color = '#555'; btnYes.style.borderColor = '#bdc3c7';
            }
        }

        function executeScheduling(strategy) {
            window.viewingImportedScheduleFile = false;
            closeStrategyModal();
            const dateVal = document.getElementById('schedule-date').value;
            const skipVal = document.getElementById('modal-skip-procs')?.value || "";
            // Truyền lựa chọn ngày đông/vắng: 1 = đông, 0 = vắng, -1 = tự động
            const crowdedVal = window._crowdedMode === true ? 1 : (window._crowdedMode === false ? 0 : -1);
            const res = document.getElementById('schedule-result');
            const list = document.getElementById('schedule-list');
            const btn = document.getElementById('btn-run-sched');

            btn.innerText = '⏳ ĐANG XẾP LỊCH...'; btn.disabled = true; btn.style.background = '#f39c12';
            res.innerHTML = '';
            list.innerHTML = '<tr><td colspan="12" align="center"><div class="spinner"></div></td></tr>';

            const startTime = performance.now();
            if (window.showGlobalLoading) window.showGlobalLoading("Đang chạy thuật toán tối ưu xếp lịch...");

            setTimeout(() => {
                try {
                    let out = null;
                    if (window.SchedulerEngine && typeof window.SchedulerEngine.runScheduling === 'function') {
                        out = window.SchedulerEngine.runScheduling(dateVal, strategy, skipVal, crowdedVal);
                    }

                    if (window.hideGlobalLoading) window.hideGlobalLoading();
                    const timeTaken = ((performance.now() - startTime) / 1000).toFixed(2);
                    btn.innerText = 'CHẠY XẾP LỊCH TỔNG'; btn.disabled = false; btn.style.background = '#008b02';

                    const sched = (out && (out.schedule || out.sched)) ? (out.schedule || out.sched) : [];
                    const unsch = (out && (out.unscheduled || out.rot)) ? (out.unscheduled || out.rot) : [];
                    const schedCount = (out && out.scheduleCount !== undefined) ? out.scheduleCount : sched.length;
                    const unschCount = (out && out.unscheduledCount !== undefined) ? out.unscheduledCount : unsch.length;

                    window.currentScheduleData = markDischargedInSchedule(sched);
                    if (typeof dataCache !== 'undefined') dataCache.schedule = sched;
                    if (window.dataCache) window.dataCache.schedule = sched;
                    setUnscheduledData(unsch, dateVal);
                    window._systemActiveYMD = dateVal;

                    const dashboardDate = document.getElementById('dashboard-date-filter');
                    if (dashboardDate) dashboardDate.value = dateVal;

                    localStorage.setItem('meds_schedule_date', dateVal);
                    localStorage.setItem('meds_success', JSON.stringify(sched));
                    localStorage.setItem('meds_unscheduled', JSON.stringify(unsch));

                    // Đồng bộ ngay vào offline cache để F5 không bị mất dữ liệu
                    try {
                        const cachedStr = localStorage.getItem('times_bootstrap_cache');
                        if (cachedStr) {
                            const b = JSON.parse(cachedStr);
                            b.schedule = sched;
                            localStorage.setItem('times_bootstrap_cache', JSON.stringify(b));
                        }
                    } catch(e) {}

                    res.innerHTML = '<div class="alert alert-success" style="margin-top:10px">Xếp thành công: <b>' + schedCount + '</b> ca. Rớt: <b>' + unschCount + '</b> ca. <span style="margin-left:15px; color:#555; font-size:13px;">(⏱ <b>' + timeTaken + ' giây</b>)</span></div>';
                    filterSchedule();
                    if (typeof renderStats === 'function') renderStats(window.lastUnscheduledData);
                    if (typeof renderPatientsTable === 'function') renderPatientsTable();
                    if (typeof loadDashboard === 'function') loadDashboard();

                    setTimeout(() => {
                        const contentEl = document.getElementById('custom-popup-content');
                        if (contentEl) contentEl.innerHTML = `
                    <div>✅ Xếp thành công: <b style="color:#27ae60; font-size:18px;">${schedCount}</b> ca</div>
                    <div>❌ Không xếp được: <b style="color:#c0392b; font-size:18px;">${unschCount}</b> ca</div>
                    <hr style="border:0; border-top:1px dashed #ccc; margin:10px 0;">
                    <div style="font-size:14px; color:#7f8c8d;">⏱ Thời gian: <b>${timeTaken}</b> giây</div>`;
                        const popup = document.getElementById('custom-success-popup');
                        if (popup) popup.style.display = 'flex';
                    }, 100);

                    // Đồng bộ lưu lịch trình vào D1 SQLite trong nền (15ms, không làm đơ giao diện)
                    if (sched.length > 0) {
                        const backendSched = sched.map(x => [ x.ngay || dateVal, x.tenBN || '', x.namSinh || '', x.phong || '', x.thuThuat || '', x.gioDienRa || '', x.gioKetThuc || '', x.nvChinh || '', x.nvPhu || '', x.may || '', x.giuong || '' ]);
                        callApi('saveSchedule', [dateVal, backendSched], null, null);
                    }
                } catch(err) {
                    if (window.hideGlobalLoading) window.hideGlobalLoading();
                    btn.innerText = 'CHẠY XẾP LỊCH TỔNG'; btn.disabled = false; btn.style.background = '#008b02';
                    res.innerHTML = '<div class="alert alert-danger">Lỗi xếp lịch: ' + err.message + '</div>';
                }
            }, 30);
        }

        function runExtraScheduling() {
            window.viewingImportedScheduleFile = false;
            const dateVal = document.getElementById('schedule-date').value;
            if (!dateVal) return alert("Vui lòng chọn ngày để xếp bổ sung!");
            const btn = document.getElementById('btn-run-extra');
            btn.innerText = '⏳ ĐANG TÌM CHỖ TRỐNG...'; btn.disabled = true;

            if (window.showGlobalLoading) window.showGlobalLoading("Đang xếp lịch bổ sung bệnh nhân mới...");

            setTimeout(() => {
                try {
                    const currentSched = window.currentScheduleData || (typeof dataCache !== 'undefined' && dataCache.schedule) || [];
                    let out = null;
                    if (window.SchedulerEngine && typeof window.SchedulerEngine.runExtraScheduling === 'function') {
                        out = window.SchedulerEngine.runExtraScheduling(dateVal, currentSched);
                    } else if (window.SchedulerEngine && typeof window.SchedulerEngine.runScheduling === 'function') {
                        out = window.SchedulerEngine.runScheduling(dateVal, 'opt_rare', '', -1, currentSched);
                    }

                    if (window.hideGlobalLoading) window.hideGlobalLoading();
                    btn.innerText = '⚡ XẾP BỔ SUNG BN MỚI'; btn.disabled = false;

                    const newSched = (out && (out.schedule || out.sched)) ? (out.schedule || out.sched) : [];
                    const newUnsch = (out && (out.unscheduled || out.rot)) ? (out.unscheduled || out.rot) : [];
                    const addedCount = newSched.length;

                    if (addedCount > 0) {
                        const mergedSched = [...currentSched, ...newSched];
                        window.currentScheduleData = markDischargedInSchedule(mergedSched);
                        if (typeof dataCache !== 'undefined') dataCache.schedule = mergedSched;
                        if (window.dataCache) window.dataCache.schedule = mergedSched;

                        localStorage.setItem('meds_schedule_date', dateVal);
                        localStorage.setItem('meds_success', JSON.stringify(mergedSched));

                        const backendSched = mergedSched.map(x => [ x.ngay || dateVal, x.tenBN || '', x.namSinh || '', x.phong || '', x.thuThuat || '', x.gioDienRa || '', x.gioKetThuc || '', x.nvChinh || '', x.nvPhu || '', x.may || '', x.giuong || '' ]);
                        callApi('saveSchedule', [dateVal, backendSched], null, null);
                    }

                    setUnscheduledData(newUnsch, dateVal);
                    filterSchedule();
                    if (typeof renderStats === 'function') renderStats(window.lastUnscheduledData);
                    if (typeof renderPatientsTable === 'function') renderPatientsTable();
                    if (typeof loadDashboard === 'function') loadDashboard();

                    const totalFail = window.lastUnscheduledData ? window.lastUnscheduledData.length : 0;
                    const contentEl = document.getElementById('custom-popup-content');
                    if (contentEl) contentEl.innerHTML = `
                    <div>✅ Xếp bổ sung thành công: <b style="color:#27ae60; font-size:18px;">${addedCount}</b> ca</div>
                    <div>❌ Không xếp được lần này: <b style="color:#c0392b; font-size:18px;">${newUnsch.length}</b> ca</div>
                    <hr style="border:0; border-top:1px dashed #ccc; margin:10px 0;">
                    <div style="font-size:14px; color:#7f8c8d;">Tổng số ca rớt hiện tại: <b>${totalFail}</b> ca</div>`;

                    const popup = document.getElementById('custom-success-popup');
                    if (popup) popup.style.display = 'flex';
                } catch(err) {
                    if (window.hideGlobalLoading) window.hideGlobalLoading();
                    btn.innerText = '⚡ XẾP BỔ SUNG BN MỚI'; btn.disabled = false;
                    console.error("Error in runExtraScheduling:", err);
                    const res = document.getElementById('schedule-result');
                    if (res) res.innerHTML = '<div class="alert alert-danger" style="margin-top:10px">❌ Lỗi hệ thống: ' + err.message + '</div>';
                    alert("Lỗi xếp bổ sung: " + err.message);
                }
            }, 30);
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

            // 1. Sắp xếp: Đã ra viện lên trên -> Phòng → Tên BN → Bắt Đầu (A-Z)
            const sorted = [...window.currentScheduleData].sort((a, b) => {
                const dA = !!a.__isDischarged;
                const dB = !!b.__isDischarged;
                if (dA !== dB) return dA ? -1 : 1;
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
            const LEFT_COLS = new Set([0, 1, 3, 4, 7, 8]); // Ngày, TênBN, Phòng, ThuThuat, NVChinh, May
            const CENTER_COLS = new Set([2, 5, 6]);             // NamSinh, BatDau, KetThuc

            // 3. Điền dữ liệu
            sorted.forEach(row => {
                const ngay = String(row.ngay || '').split('-').reverse().join('/');
                const phong = String(row.phong || '').trim();
                const tenBNText = String(row.tenBN || '').trim() + (row.__isDischarged ? ' (✔ RV)' : '');

                ws_data.push([
                    ngay,
                    tenBNText,
                    String(row.namSinh || '').trim(),
                    phong,
                    String(row.thuThuat || '').trim(),
                    String(row.gioDienRa || '').trim(),
                    String(row.gioKetThuc || '').trim(),
                    String(row.nvChinh || '').trim(),
                    String(row.may || '').trim()
                ]);
            });

            // 4. Tạo sheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(ws_data);

            // 5. Độ rộng cột (Autofit width)
            const colWidths = HEADER.map(() => 0);
            ws_data.forEach(row => {
                row.forEach((cell, i) => {
                    const len = String(cell || '').length;
                    if (len > colWidths[i]) colWidths[i] = len;
                });
            });
            ws['!cols'] = colWidths.map(w => ({ wch: Math.round(w * 1.5) + 3 })); // Bù kích thước cỡ chữ Arial 14

            // 6. Chiều cao dòng (1cm = ~28.35pt)
            ws['!rows'] = [];
            for (let r = 0; r < ws_data.length; r++) {
                ws['!rows'][r] = { hpt: 28.35 };
            }

            // 7. Căn lề ô + định dạng font, viền, màu sắc dựa trên NV Chính
            try {
                const range = XLSX.utils.decode_range(ws['!ref']);
                for (let R = range.s.r; R <= range.e.r; R++) {
                    const isHeader = R === 0;
                    const nvRowData = ws_data[R] || [];
                    const isEmptyRow = nvRowData.every(c => c === '');
                    const nvChinh = String(nvRowData[7] || '').trim().toLowerCase();

                    let rowBold = false;
                    let rowItalic = false;
                    let rowUnderline = false;
                    let rowBgColor = null;

                    if (!isHeader && !isEmptyRow) {
                        if (nvChinh === 'bs đạt') {
                            rowBold = true;
                        } else if (nvChinh === 'bs hoa') {
                            rowUnderline = true;
                        } else if (nvChinh === 'bs thái') {
                            rowItalic = true;
                        } else if (nvChinh === 'bs thảo') {
                            rowBold = true;
                            rowItalic = true;
                        } else if (nvChinh === 'ktv hà chip') {
                            // bình thường
                        } else if (nvChinh === 'ktv phan hiền') {
                            rowBgColor = "D3D3D3"; // Xám nhạt
                        } else if (nvChinh === 'ktv lương' || nvChinh === 'ktv lê hiền') {
                            rowItalic = true;
                            rowUnderline = true;
                        }
                    } else if (isHeader) {
                        rowBold = true; // Tiêu đề mặc định in đậm
                    }

                    for (let C = range.s.c; C <= range.e.c; C++) {
                        const addr = XLSX.utils.encode_cell({ r: R, c: C });
                        if (!ws[addr]) continue;
                        const align = CENTER_COLS.has(C) ? 'center' : 'left';

                        const fontStyle = {
                            name: "Arial",
                            sz: 14,
                            bold: rowBold,
                            italic: rowItalic,
                            underline: rowUnderline
                        };

                        const cellStyle = {
                            alignment: { horizontal: align, vertical: 'center', wrapText: false },
                            font: fontStyle
                        };

                        if (!isEmptyRow) {
                            cellStyle.border = {
                                top: { style: "thin", color: { rgb: "000000" } },
                                bottom: { style: "thin", color: { rgb: "000000" } },
                                left: { style: "thin", color: { rgb: "000000" } },
                                right: { style: "thin", color: { rgb: "000000" } }
                            };
                        }

                        if (rowBgColor) {
                            cellStyle.fill = { fgColor: { rgb: rowBgColor } };
                        }

                        ws[addr].s = cellStyle;
                    }
                }
            } catch (e) { console.error("Lỗi định dạng style: ", e); }

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
            let printData = filteredSchedData.map((r, idx) => ({ ...r, __originalIndex: idx }));

            printData.sort((a, b) => {
                const dA = !!a.__isDischarged;
                const dB = !!b.__isDischarged;
                if (dA !== dB) return dA ? -1 : 1;
                return a.__originalIndex - b.__originalIndex;
            });

            const rows = printData.map((row, i) => {
                const dischargeMark = row.__isDischarged ? ' <span style="font-size:10.5px; font-style:italic; font-weight:700; white-space:nowrap; margin-left:4px; color:#27ae60;">(✔ RV)</span>' : '';
                return `<tr class="${row.__dropped ? 'print-dropped' : ''}">

                <td>${i + 1}</td>

                <td class="text-left nowrap"><strong>${row.tenBN}</strong>${dischargeMark}</td>

                <td>${row.namSinh}</td>

                <td class="text-left">${row.thuThuat}</td>

                <td class="nowrap"><strong>${row.gioDienRa}</strong></td>

                <td class="nowrap"><strong>${row.gioKetThuc}</strong></td>

                <td class="nowrap">${row.nvChinh}</td>

                <td class="nowrap">${row.nvPhu}</td>

                <td class="nowrap">${row.may}</td>

            </tr>`;
            }).join('');



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

<style>.admin-nav-btn:hover { background: #e0e6ed !important; }</style></head><body>

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



                        window.currentScheduleData = markDischargedInSchedule(scheduled);

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
            showCustomConfirm("Chốt sổ?", "Bạn có chắc chắn muốn chốt sổ ngày hôm nay?", function () {
                const btn = document.getElementById('btn-chot-so');
                btn.innerText = '⏳ Đang xử lý...'; btn.disabled = true;
                window._chotSoDone = false;

                if (window.showGlobalLoading) window.showGlobalLoading("Đang thực hiện chốt sổ ngày cũ và mở sổ ngày mới...");

                callApi('chuyenNgayMoi', [], res => {
                    // Xóa toàn bộ cache phía client để tải lại dữ liệu mới
                    window.currentScheduleData = [];
                    window.lastUnscheduledData = [];
                    window.currentRotData = [];
                    if (window.dataCache) window.dataCache = {};
                    if (window.dataCacheTime) window.dataCacheTime = {};
                    if (window._historyCache) window._historyCache = {};
                    localStorage.removeItem('meds_success');
                    localStorage.removeItem('meds_schedule_date');
                    localStorage.removeItem('meds_unscheduled');
                    sessionStorage.setItem('chot_so_success_toast', 'true');
                    if (window.hideGlobalLoading) window.hideGlobalLoading();
                    location.reload();
                }, err => {
                    if (window.hideGlobalLoading) window.hideGlobalLoading();
                    alert("Lỗi chốt sổ: " + (typeof err === 'string' ? err : (err && err.message) || JSON.stringify(err)));
                    btn.innerText = '📋 Chốt sổ';
                    btn.disabled = false;
                });
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
                thuThuat: Array.isArray(p.dsThuThuat) ? p.dsThuThuat.join(', ') : String(p.dsThuThuat || p.thuThuat || ''),
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
            if (!d) return window.showToast ? window.showToast("Vui lòng chọn ngày!", "error") : alert("Chọn ngày!");

            const dp = document.getElementById('dashboard-date-filter');
            if (dp && dp.value !== d) {
                dp.value = d;
                const displayEl = document.getElementById('display-date');
                if (displayEl) displayEl.textContent = d.split('-').reverse().join('/');
            }

            window._forceHistoryMode = true;

            if (typeof loadDashboard === 'function') {
                loadDashboard();
            }
        }

        // --- Tiện ích Tìm rảnh ---

        window.externalUtilsData = null;

        function handleUtilsFile(e) {

            const file = e.target.files[0];

            if (!file) return;

            const reader = new FileReader();

            reader.onload = function (ev) {

                try {

                    const workbook = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });

                    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

                    window.externalUtilsData = jsonData.slice(1).map(r => ({ thuThuat: r[0], gioDienRa: r[1], gioKetThuc: r[2], nvChinh: r[3], nvPhu: '', may: r[4] }));

                    alert("Đã nạp file thành công!");

                } catch (err) { alert("Lỗi đọc file: " + err.message); }

            };

            reader.readAsArrayBuffer(file);

        }



        window.loadTimRanhDataFromServer = function () {

            const statusEl = document.getElementById('utils-file-status');

            if (statusEl) {

                statusEl.innerText = "⏳ Đang kết nối máy chủ để lấy dữ liệu Tìm Rảnh chung...";

                statusEl.style.color = "#f39c12";

            }



            google.script.run.withSuccessHandler(function (data) {

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

        function taiLichTheoNgay() {
            var dateEl = document.getElementById('utils-search-date');
            var date = dateEl ? dateEl.value : '';
            if (!date) return alert('Vui lòng chọn ngày!');
            var statusEl = document.getElementById('utils-lich-status');
            var btn = document.getElementById('btn-tai-lich-utils');

            var handleSuccess = function (sched) {
                window.utilsScheduleData = sched;
                window.utilsScheduleDate = date;
                var dd = date.split('-').reverse().join('/');
                if (statusEl) {
                    if (sched.length > 0) {
                        statusEl.innerText = '✅ Ngày ' + dd + ': ' + sched.length + ' ca. Có thể Tìm rảnh!';
                        statusEl.style.color = '#27ae60';
                    } else {
                        statusEl.innerText = '⚠️ Ngày ' + dd + ' chưa có lịch.';
                        statusEl.style.color = '#e67e22';
                    }
                }
                if (btn) { btn.disabled = false; btn.innerText = '📊 Xem Lịch'; }
            };

            if (window._systemActiveYMD && date === window._systemActiveYMD) {
                if (statusEl) { statusEl.innerText = '⏳ Đang nạp lịch hiện tại...'; statusEl.style.color = '#3498db'; }
                setTimeout(() => handleSuccess(window.currentScheduleData || []), 100);
                return;
            }

            if (statusEl) { statusEl.innerText = '⏳ Đang tải...'; statusEl.style.color = '#f39c12'; }
            if (btn) { btn.disabled = true; btn.innerText = '⏳ Đang tải...'; }
            google.script.run
                .withSuccessHandler(function (data) {
                    var sched = (data && data.schedule) ? data.schedule : (Array.isArray(data) ? data : []);
                    handleSuccess(sched);
                })
                .withFailureHandler(function (err) {
                    if (statusEl) { statusEl.innerText = '❌ Lỗi tải dữ liệu!'; statusEl.style.color = '#c0392b'; }
                    if (btn) { btn.disabled = false; btn.innerText = '📊 Xem Lịch'; }
                    console.error('taiLichTheoNgay error:', err);
                })
                .getHistoryFullData(date);
        }





        // Chạy luôn hàm tải dữ liệu ngay khi mở web

        document.addEventListener('DOMContentLoaded', window.loadTimRanhDataFromServer);



        function filterDoctorTable() {
            var input = document.getElementById("filter-doc-name").value.toLowerCase();
            var tbody = document.getElementById("free-doc-list");
            var trs = tbody.getElementsByTagName("tr");
            for (var i = 0; i < trs.length; i++) {
                var td = trs[i].getElementsByTagName("td")[0];
                if (td) {
                    var txtValue = td.textContent || td.innerText;
                    if (txtValue.toLowerCase().indexOf(input) > -1) {
                        trs[i].style.display = "";
                    } else {
                        trs[i].style.display = "none";
                    }
                }
            }
        }

        function timBacSiRanh() {
            let previousSelection = "";
            if (document.getElementById('filter-doc-name')) {
                previousSelection = document.getElementById('filter-doc-name').value;
            }

            // Bắt buộc chọn ngày (Phương án B)
            const searchDate = document.getElementById('utils-search-date')?.value || '';
            if (!searchDate) return alert("Vui lòng chọn Ngày cần tìm ở trên trước!");

            if (!window.utilsScheduleData || !window.utilsScheduleData.length) return alert("Vui lòng bấm '📊 Xem Lịch' trước để tải lịch ngày " + searchDate.split('-').reverse().join('/') + " rồi mới tìm!");

            const vao_str = document.getElementById('search-doc-time').value;

            if (!vao_str) return alert("Vui lòng nhập 'Giờ cần tìm' (VD: 14:00)!");

            let sourceData = window.utilsScheduleData;

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

                if (doc.gioBan) doc.gioBan.split(',').forEach(b => {
                    const pts = b.split('-'); if (pts.length === 2)

                        busy.push([t2m(pts[0].trim()), t2m(pts[1].trim()) + 1]);
                });

                busy.sort((a, b) => a[0] - b[0]);

                let merged = [];

                busy.forEach(b => {

                    if (!merged.length) { merged.push(b); return; }

                    const last = merged[merged.length - 1];

                    b[0] <= last[1] ? merged[merged.length - 1] = [last[0], Math.max(last[1], b[1])] : merged.push(b);
                }); let

                    shifts = []; 
                if (doc.thoiGianLam) doc.thoiGianLam.split(',').forEach(sh => {
                    const pts = sh.split('-');
                    if (pts.length === 2) shifts.push([t2m(pts[0].trim()), t2m(pts[1].trim())]);
                });
                if (!shifts.length) shifts = [[420, 690], [780, 1014]];

                const yhctEndVal = parseInt(document.getElementById("admin-yhct-end")?.value) || 10;
                const yhctLunchVal = parseInt(document.getElementById("admin-yhct-lunch")?.value) || 10;

                shifts.forEach((sh, sIdx) => {
                    const extraMins = (sIdx === 0 && shifts.length > 1) ? yhctLunchVal : ((sIdx === shifts.length - 1) ? yhctEndVal : 0);
                    const shEndExtended = sh[1] + extraMins;
                    let curr = sh[0];

                    for (const b of merged) {
                        if (b[0] >= shEndExtended) break;

                        if (curr < b[0]) {
                            const valid_start = Math.max(curr, t_vao); 
                            if (valid_start < b[0]) {
                                const mins = b[0] - valid_start; 
                                if (mins >= 1) {
                                    tbody.innerHTML += `<tr>
                                        <td>👨‍⚕️ <b>${doc.ten}</b></td>
                                        <td>${m2t(valid_start)} - ${m2t(b[0] - 1)}</td>
                                        <td><strong style="color:#27ae60">${mins}</strong></td>
                                    </tr>`; 
                                    found = true;
                                }
                            }
                        }
                        curr = Math.max(curr, b[1]);
                    }

                    if (curr < shEndExtended) {
                        const valid_start = Math.max(curr, t_vao); 
                        if (valid_start < shEndExtended) {
                            const mins = shEndExtended - valid_start; 
                            if (mins >= 1) {
                                const noteOvertime = extraMins > 0 ? ` <span style="font-size:11px; color:#e67e22; font-weight:normal;">(+${extraMins}p lố)</span>` : '';
                                tbody.innerHTML += `<tr>
                                    <td>👨‍⚕️ <b>${doc.ten}</b></td>
                                    <td>${m2t(valid_start)} - ${m2t(shEndExtended - 1)}${noteOvertime}</td>
                                    <td><strong style="color:#27ae60">${mins}</strong></td>
                                </tr>`; 
                                found = true;
                            }
                        }
                    }
                });
            });

            if (!found) {
                tbody.innerHTML = `<tr> <td colspan="3" align="center" style="color:#c0392b; font-weight:bold;">Không có Nhân sự
                                rảnh lúc này</td>
                        </tr>`;
            }

            const filterSelect = document.getElementById('filter-doc-name');
            if (filterSelect) {
                if (previousSelection) {
                    filterSelect.value = previousSelection;
                }
                filterDoctorTable();
            }
        }

        function timMayRanh() {

            // Bắt buộc chọn ngày (Phương án B)
            const searchDate = document.getElementById('utils-search-date')?.value || '';
            if (!searchDate) return alert("Vui lòng chọn Ngày cần tìm ở trên trước!");

            if (!window.utilsScheduleData || !window.utilsScheduleData.length) return alert("Vui lòng bấm '📊 Xem Lịch' trước để tải lịch ngày " + searchDate.split('-').reverse().join('/') + " rồi mới tìm!");

            const loai = document.getElementById('search-machine-type').value;

            const gio_str = document.getElementById('search-machine-time').value;

            let sourceData = window.utilsScheduleData;

            if (!loai || loai.includes("Chọn loại") || !gio_str) return alert("Vui lòng chọn Loại máy và nhập Giờ!");

            const t_vao = t2m(gio_str);

            const tbody = document.getElementById('free-machine-list');

            tbody.innerHTML = '';

            const may_thuoc_loai = dataCache.machine.filter(m => m.tenLoai.trim() === loai.trim() &&

                m.trangThai === 'Sẵn sàng').map(m => m.maMay);

            if (!may_thuoc_loai.length) {
                tbody.innerHTML = `<tr> <td colspan="2" align="center" style="color:#c0392b; font-weight:bold;">Máy đang hỏng/bảo

                                trì hết</td>

                        </tr>`; return;
            } const m_busy = {};

            may_thuoc_loai.forEach(m => m_busy[m] = []);

            sourceData.forEach(row => {

                const rowMay = String(row.may || row[9] || '').trim().toLowerCase();

                const gVao = row.gioDienRa || row[5];

                const gRa = row.gioKetThuc || row[6];

                const mMatch = may_thuoc_loai.find(x => x.toLowerCase() === rowMay);

                if (mMatch) m_busy[mMatch].push([t2m(gVao), t2m(gRa) + 1]);

            });

            let found = false;

            may_thuoc_loai.forEach(m => {

                const busy = m_busy[m].sort((a, b) => a[0] - b[0]);

                let merged = [];

                busy.forEach(b => {

                    if (!merged.length) { merged.push(b); return; }

                    const last = merged[merged.length - 1];

                    b[0] <= last[1] ? merged[merged.length - 1] = [last[0], Math.max(last[1], b[1])] : merged.push(b);

                }); let is_free = true, free_until = 1440; for (const b of merged) {
                    if (b[0] <= t_vao && t_vao <

                        b[1]) { is_free = false; break; } if (b[1] <= t_vao) continue; if (b[0] > t_vao) free_until =

                            Math.min(free_until, b[0]);

                }

                if (is_free) {

                    tbody.innerHTML += `<tr>

                                <td><strong>${m}</strong></td>

                                <td style="color:#27ae60; font-weight:bold;">${free_until === 1440 ? "Hết ngày" : `Đến

                                    ${m2t(free_until - 1)}`}</td>

                            </tr>`;

                    found = true;

                }

            });

            if (!found) tbody.innerHTML = `<tr> <td colspan="2" align="center" style="color:#c0392b; font-weight:bold;">Hết máy rảnh

                                </td>

                            </tr>`;
        }



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

                    cbInput.onchange = function () {

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

                    satCache[bn_id] = { info: r, items: [], frameId: `sat-bn-${bn_id}` };

                    const fBn = document.createElement('div');
                    fBn.id = `sat-bn-${bn_id}`;
                    fBn.style.cssText = 'background:white; border:1px solid #bdc3c7; padding:6px 10px; margin-bottom:6px; border-radius:5px; display:flex; flex-direction:column; gap:4px; ';

                    const tDiv = document.createElement('div');
                    tDiv.style.cssText = 'display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed #ecf0f1; padding-bottom:3px;';
                    tDiv.innerHTML = `<b style="font-size:12px; color:#2c3e50;">${pIdx + 1}. ${r.ten.toUpperCase()} (${r.namSinh})</b> <span style="font-size:11px; color:#e67e22; background:#fef5e7; padding:1px 6px; border-radius:3px; border:1px solid #fadbd8; white-space:nowrap;">P. ${r.phong}</span>`;
                    fBn.appendChild(tDiv);

                    const flexContainer = document.createElement('div');
                    flexContainer.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-top:2px;';

                    const ttDiv = document.createElement('div');

                    ttDiv.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px;';

                    (r.thuThuat ? r.thuThuat.split(',').map(x => x.trim()).filter(x => x) : []).forEach((tt,

                        tIdx) => {

                        satCache[bn_id].items.push({ name: tt, checked: false });

                        const cb = document.createElement('label');

                        cb.style.cssText = 'font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px;'; cb.title = tt;

                        const input = document.createElement('input');

                        input.type = 'checkbox'; input.id = `cb-sat-${bn_id}-${tIdx}`;

                        input.style.cssText = 'width:13px; height:13px; margin:0;';

                        input.onchange = function () {
                            satCache[bn_id].items[tIdx].checked = this.checked;

                            updateSummarySat();
                        };

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

                    readyInput.onchange = function () {
                        this.style.color = '#c0392b'; this.style.fontWeight =

                            'bold'; this.style.backgroundColor = '#fff'; this.style.borderColor = '#c0392b';
                    };

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
            for (const bid in satCache) satCache[bid].items.forEach(item => {
                if (item.checked)
                    counts[item.name] = (counts[item.name] || 0) + 1;
            });
            const sumDiv = document.getElementById('sat-summary');
            const sumContainer = document.getElementById('sat-summary-container');
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
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

            Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([tt, qty]) => {

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

                if (f?.style.display !== 'none') f.querySelectorAll('input[type="checkbox"]').forEach(cb => { if (!cb.checked) { cb.checked = true; cb.onchange(); } });

            });

        }

        function boChonHetSat() {

            _satFilter((bid, str, normalizedKw, kw) => {

                if (!(str.includes(kw) || xoaDau(str).includes(normalizedKw))) return;

                const f = document.getElementById(satCache[bid].frameId);

                if (f?.style.display !== 'none') f.querySelectorAll('input[type="checkbox"]').forEach(cb => { if (cb.checked) { cb.checked = false; cb.onchange(); } });

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

            ws['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 50 }, { wch: 15 }];



            XLSX.utils.book_append_sheet(wb, ws, "ThuThuatT7");

            XLSX.writeFile(wb, `DS_ThuThuat_T7_${new Date().toISOString().slice(0, 10)}.xlsx`);

        }

        function nhapDsSat() {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = '.xlsx, .xls';
            input.onchange = e => {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                    const roa = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

                    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd').trim();
                    let isHIS = false;
                    let colTen = 6, colDichVu = 13, startRow = 1;

                    // Kiểm tra file HIS hay file T7 nội bộ
                    for (let i = 0; i < Math.min(15, roa.length); i++) {
                        const rowStr = roa[i].map(c => norm(c)).join('|');
                        if (rowStr.includes('ma truy xuat') && rowStr.includes('gio san sang')) {
                            isHIS = false;
                            startRow = i + 1;
                            break;
                        } else if (rowStr.includes('ho ten') || rowStr.includes('ten benh') || rowStr.includes('ten bn') || rowStr.includes('benh nhan') || rowStr.includes('fullname')) {
                            isHIS = true;
                            startRow = i + 1;
                            roa[i].forEach((cell, idx) => {
                                const cn = norm(cell);
                                if (cn.includes('ho ten') || cn.includes('ten bn') || cn.includes('ten benh') || cn === 'ten_bn' || cn === 'hoten' || cn.includes('fullname')) colTen = idx;
                                else if (cn.includes('dich vu') || cn.includes('thu thuat') || cn.includes('ten dvkt') || cn === 'dichvu' || cn === 'dich_vu' || cn.includes('service')) colDichVu = idx;
                            });
                            break;
                        }
                    }

                    boChonHetSat();
                    let count = 0;

                    if (isHIS) {
                        const hisMap = {};
                        const dataRows = roa.slice(startRow);
                        dataRows.forEach(row => {
                            const ten = String(row[colTen] || '').trim();
                            const dichVu = String(row[colDichVu] || '').trim();
                            const tenNorm = norm(ten);
                            if (!ten || tenNorm === 'ten_bn' || tenNorm === 'ho ten' || tenNorm === 'ten benh nhan' || tenNorm === 'hoten') return;
                            if (!dichVu) return;

                            const properTen = ten.toLowerCase().replace(/(?:^|\s)\S/g, a => a.toUpperCase());
                            if (!hisMap[properTen]) hisMap[properTen] = new Set();

                            const lines = dichVu.split(/\r?\n/).map(l => l.trim()).filter(l => l);
                            lines.forEach(line => {
                                const cleaned = line.replace(/^\d+\.\s*/, '').replace(/\s*-\s*\d+\s*\(lần\)/i, '').trim();
                                const mapped = mapHISToProcedure(cleaned || line) || mapHISToProcedure(line);
                                if (mapped) hisMap[properTen].add(mapped);
                            });
                        });

                        Object.keys(hisMap).forEach(ten => {
                            const searchTen = ten.toLowerCase();
                            let targetBid = Object.keys(satCache).find(k => satCache[k].info.ten.trim().toLowerCase() === searchTen);
                            if (!targetBid) return;

                            const available = satCache[targetBid].items.map((item, idx) => ({ ...item, idx })).filter(x => !x.checked);

                            [...hisMap[ten]].forEach(tt => {
                                const match = available.find(x => x.name.toLowerCase() === tt.toLowerCase());
                                if (match) {
                                    satCache[targetBid].items[match.idx].checked = true;
                                    const cb = document.getElementById(`cb-sat-${targetBid}-${match.idx}`);
                                    if (cb) cb.checked = true;
                                    available.splice(available.indexOf(match), 1);
                                    count++;
                                }
                            });
                        });
                    } else {
                        roa.forEach((row, i) => {
                            if (i < startRow || !row[2]) return;
                            const bid = String(row[0] || '').trim(), ten = String(row[1] || '').trim().toLowerCase();
                            let targetBid = (bid && satCache[bid]) ? bid : Object.keys(satCache).find(k => satCache[k].info.ten.trim().toLowerCase() === ten);
                            if (!targetBid) return;

                            const available = satCache[targetBid].items.map((item, idx) => ({ ...item, idx })).filter(x => !x.checked);

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

                            const importedTime = row[3];
                            if (importedTime) {
                                const readyInput = document.querySelector(`#${satCache[targetBid].frameId} .input-ready-time`);
                                if (readyInput) {
                                    readyInput.value = String(importedTime).trim();
                                    readyInput.style.color = '#c0392b';
                                    readyInput.style.fontWeight = 'bold';
                                    readyInput.style.backgroundColor = '#fff';
                                    readyInput.style.borderColor = '#c0392b';
                                }
                            }
                        });
                    }

                    updateSummarySat();
                    alert(`Đã nạp thành công ${count} thủ thuật ${isHIS ? 'từ file HIS' : 'từ file Excel Thứ 7'}!`);
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

            return { allowed_staff, staff_shifts_dict, final_pats };

        }

        function xepLichSat() {
            const dateVal = document.getElementById('sat-schedule-date').value;
            if (!dateVal) return alert("Vui l\u00f2ng ch\u1ecdn Ng\u00e0y l\u00e0m vi\u1ec7c Th\u1ee9 7 tr\u01b0\u1edbc!");

            window.viewingImportedScheduleFile = false;

            const payload = getSatPayload();

            if (!payload.allowed_staff.length) return alert("Vui l\u00f2ng ch\u1ecdn Nh\u00e2n s\u1ef1 \u0111i l\u00e0m!");

            if (!payload.final_pats.length) return alert("Ch\u01b0a c\u00f3 th\u1ee7 thu\u1eadt n\u00e0o \u0111\u01b0\u1ee3c ch\u1ecdn!");

            const btn = document.getElementById('btn-xep-sat');

            btn.innerText = '⏳ ĐANG XẾP...'; btn.disabled = true;

            const startTime = performance.now();
            setTimeout(() => {
                try {
                    const res = window.SchedulerEngine.runSaturdayScheduling(payload, dateVal);
                    const timeTaken = ((performance.now() - startTime) / 1000).toFixed(2);
                    btn.innerText = '▶ XẾP LỊCH THỨ 7'; btn.disabled = false;

                    const sched = res.sched || res.schedule || [];
                    const rot = res.dropped || res.unscheduled || res.rot || [];

                    window.currentScheduleData = markDischargedInSchedule(sched);
                    setUnscheduledData(rot, dateVal);
                    
                    if (typeof dataCache !== 'undefined') dataCache.schedule = sched;
                    if (window.dataCache) window.dataCache.schedule = sched;

                    localStorage.setItem('meds_success', JSON.stringify(window.currentScheduleData));
                    localStorage.setItem('meds_unscheduled', JSON.stringify(window.lastUnscheduledData));
                    
                    // Đồng bộ ngay vào offline cache để F5 không bị mất dữ liệu
                    try {
                        const cachedStr = localStorage.getItem('times_bootstrap_cache');
                        if (cachedStr) {
                            const b = JSON.parse(cachedStr);
                            b.schedule = sched;
                            localStorage.setItem('times_bootstrap_cache', JSON.stringify(b));
                        }
                    } catch(e) {}

                    const normalDate = document.getElementById('schedule-date');
                    if (normalDate) normalDate.value = dateVal;
                    window._systemActiveYMD = dateVal;

                    const dashboardDate = document.getElementById('dashboard-date-filter');
                    if (dashboardDate) dashboardDate.value = dateVal;

                    document.querySelector('.nav-tab[data-tab="tab-schedule"]')?.click();
                    const searchInput = document.getElementById('schedule-search-input');
                    if (searchInput) searchInput.value = '';

                    const resEl = document.getElementById('schedule-result');
                    if (resEl) {
                        resEl.innerHTML = `<div class="alert alert-success" style="margin-top:10px">Xếp thành công: <b>${window.currentScheduleData.length}</b> ca. Rớt: <b>${window.lastUnscheduledData.length}</b> ca. <span style="color:#555; font-size:13px;">(⏱ <b>${timeTaken} giây</b>)</span></div>`;
                    }

                    filterSchedule(); 
                    if (typeof renderStats === 'function') renderStats(window.lastUnscheduledData);
                    if (typeof renderPatientsTable === 'function') renderPatientsTable();
                    if (typeof loadDashboard === 'function') loadDashboard();

                    // Đồng bộ lưu lịch trình thứ 7 vào D1 SQLite trong nền
                    if (sched.length > 0) {
                        const backendSched = sched.map(x => [ x.ngay || dateVal, x.tenBN || '', x.namSinh || '', x.phong || '', x.thuThuat || '', x.gioDienRa || '', x.gioKetThuc || '', x.nvChinh || '', x.nvPhu || '', x.may || '', x.giuong || '' ]);
                        callApi('saveSchedule', [dateVal, backendSched], null, null);
                    }
                } catch(err) {
                    btn.innerText = '▶ XẾP LỊCH THỨ 7'; btn.disabled = false;
                    alert("Lỗi: " + err.message);
                }
            }, 30);


        }

        function updateSatDefaultTime() {

            const isSummer = document.querySelector('input[name="sat-season"]:checked').value ===

                'summer';

            const vals = isSummer ? ["07:00", "11:30", "13:00", "16:30"] :

                ["07:30", "12:00", "13:00", "16:30"];

            for (const ten in satStaffIndices) {

                const idx = satStaffIndices[ten];

                ['sat-s1', 'sat-s2', 'sat-c1', 'sat-c2'].forEach((prefix, i) => {

                    const el = document.getElementById(`${prefix}-${idx}`); if (el) el.value = vals[i];

                });

            }

        }



        // ============================================================

        // 📤 XUẤT / NHẬP BỆNH NHÂN

        // ============================================================

        function exportPatients() {

            if (!dataCache.pat.length) return alert("Không có dữ liệu bệnh nhân để xuất!");

            const ws_data = [["STT", "Tên BN", "Năm Sinh", "Ngày Vào", "Giờ Vào", "Giờ Bận", "Giờ Ra", "Phòng", "Thủ Thuật"],

            ...dataCache.pat.map((p, i) => [i + 1, p.ten, p.namSinh, p.ngayVao, p.gioVao, p.gioBan,

            p.gioRa, p.phong, p.thuThuat])];

            const wb = XLSX.utils.book_new();

            const ws = XLSX.utils.aoa_to_sheet(ws_data);

            XLSX.utils.book_append_sheet(wb, ws, "DanhSachBenhNhan");

            XLSX.writeFile(wb, `DS_BenhNhan_${new

                Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`);

        }

        function savePatientsWithFallback(cleanList, replaceAll, onSuccess, onError, onProgress) {
            google.script.run
                .withSuccessHandler(res => {
                    if (onSuccess) onSuccess(res);
                })
                .withFailureHandler(err => {
                    console.warn("[bulkUpdatePatients API fallback to sequential]:", err);
                    const total = cleanList.length;
                    if (total === 0) {
                        if (onSuccess) onSuccess({ message: "Danh sách trống" });
                        return;
                    }

                    let current = 0;
                    function saveNext() {
                        if (current >= total) {
                            if (onSuccess) onSuccess({ message: `Đã lưu thành công ${total} bệnh nhân!` });
                            return;
                        }
                        const p = cleanList[current];
                        if (onProgress) onProgress(current + 1, total);
                        google.script.run
                            .withSuccessHandler(() => {
                                current++;
                                saveNext();
                            })
                            .withFailureHandler(subErr => {
                                console.warn(`[Lỗi lưu BN ${p.ten}]:`, subErr);
                                current++;
                                saveNext();
                            })
                            .addBenhNhan(p.ten, p.namSinh, p.ngayVao, p.gioVao, p.gioBan, p.gioRa, p.phong, p.thuThuat);
                    }
                    saveNext();
                })
                .bulkUpdatePatients(cleanList, replaceAll);
        }

        function importPatients() {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = '.xlsx, .xls';
            input.onchange = e => {
                const reader = new FileReader();
                reader.onload = function (ev) {
                    const workbook = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
                    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

                    const patientList = rows.slice(1).filter(r => r[1]).map(r => ({
                        ten: String(r[1] || '').trim(),
                        namSinh: String(r[2] || '').trim(),
                        ngayVao: String(r[3] || '').trim(),
                        gioVao: String(r[4] || '').trim(),
                        gioBan: String(r[5] || '').trim(),
                        gioRa: String(r[6] || '').trim(),
                        phong: String(r[7] || '').trim(),
                        thuThuat: String(r[8] || '').trim()
                    })).filter(p => p.ten);

                    const replaceAll = confirm("Bác sĩ có muốn THAY THẾ TOÀN BỘ danh sách hiện tại không?\n\n- OK: Xóa sạch, nạp mới.\n- Cancel: Bổ sung thêm.");

                    const btn = document.getElementById('btn-import-pat');
                    btn.innerText = "⏳ Đang xử lý..."; btn.disabled = true;

                    savePatientsWithFallback(
                        patientList,
                        replaceAll,
                        res => {
                            const msg = typeof res === 'object' && res.message ? res.message : (typeof res === 'string' ? res : "Nhập dữ liệu thành công!");
                            showToast(msg, 'success', 5000);
                            btn.innerText = "⬇️ Excel"; btn.disabled = false;
                            if (window.dataCacheTime) delete window.dataCacheTime['pat'];
                            loadEntity('getBenhNhan', 'pat', renderPatientsTable, [], true);
                        },
                        err => {
                            const msg = (err && typeof err === 'object') ? (err.message || err.error || JSON.stringify(err)) : String(err || 'Lỗi không xác định');
                            showToast('Lỗi nhập Excel: ' + msg, 'error', 6000);
                            btn.innerText = "⬇️ Excel"; btn.disabled = false;
                        },
                        (cur, tot) => {
                            btn.innerText = `⏳ ${cur}/${tot}...`;
                        }
                    );
                };

                reader.readAsArrayBuffer(e.target.files[0]);

            };

            input.click();

        }



        // ============================================================

        // 🏥 NHẬP TỪ HIS (Y LỆNH) - ĐỌC FILE EXCEL CỦA BỆNH VIỆN
        // Cột G (index 6) = Tên BN, Cột H (index 7) = Năm sinh, Cột N (index 13) = Dịch vụ
        // Bắt đầu từ dòng 11 (index 10)
        // ============================================================

        // Bảng ánh xạ: Từ khóa nhận diện trong file HIS -> Tên thủ thuật chuẩn trong phần mềm
        const HIS_MAPPING = [
            { keywords: ['điện châm', 'dc ', ' dc,', ',dc,', ',dc', 'dien cham'], target: 'điện châm' },
            { keywords: ['thủy châm', 'thuy cham', 'tc ', ' tc,', ',tc,', ',tc'], target: 'thủy châm' },
            { keywords: ['xoa bóp bấm huyệt', 'xoa bop bam huyet', 'xbbh', 'xbb', 'bấm huyệt'], target: 'XBBH' },
            { keywords: ['hào châm', 'hao cham', ' hc,', ',hc,', ',hc', ' hc '], target: 'hào châm' },
            { keywords: ['cấy chỉ', 'cay chi', ' cc,', ',cc,', ',cc', ' cc '], target: 'cấy chỉ' },
            { keywords: ['điện xung', 'dien xung', 'dòng điện xung', ' dx,', ',dx,', ',dx', ' dx '], target: 'điện xung' },
            { keywords: ['parafin', ' pa,', ',pa,', ',pa', ' pa '], target: 'parafin' },
            { keywords: ['siêu âm', 'sieu am', ' sa,', ',sa,', ',sa', ' sa '], excludes: ['ổ bụng', 'tuyến giáp', 'doppler', 'phần phụ', 'tổng quát', 'tuyến vú', 'thai', 'tim', 'mạch', 'màng phổi', 'khớp', 'phần mềm', '4d', '3d'], target: 'siêu âm' },
            { keywords: ['sóng ngắn', 'song ngan', ' sn,', ',sn,', ',sn', ' sn '], target: 'sóng ngắn' },
            { keywords: ['hồng ngoại', 'hong ngoai', 'tia hồng', ' hn,', ',hn,', ',hn', ' hn '], target: 'hồng ngoại' },
            { keywords: ['kỹ thuật xoa bóp vùng', 'xoa bóp vùng', 'xbv', 'xoa bop vung'], target: 'xoa bóp vùng' },
            { keywords: ['tập vận động có trợ giúp', 'trợ giúp', 'ttg', 'tap tro giup', ' ttg,', ',ttg'], target: 'tập trợ giúp' },
            { keywords: ['tập vận động có kháng trở', 'kháng trở', 'tap khang tro', ' tk,', ',tk,', 'khang tro'], target: 'tập kháng trở' },
            { keywords: ['tập các kiểu thở', 'kiểu thở', 'tap tho', ' tt,', ',tt,', 'kieu tho'], target: 'tập thở' },
            { keywords: ['kéo giãn cột sống', 'keo gian', ' kg,', ',kg,', ',kg', ' kg ', 'cot song'], target: 'kéo giãn' },
            { keywords: ['vận động trị liệu', 'vđtl', 'van dong tri lieu'], target: 'vận động trị liệu' },
            { keywords: ['châm cứu', 'cham cuu', 'cc '], target: 'châm cứu' },
            { keywords: ['từ trường', 'tu truong'], target: 'từ trường' },
            { keywords: ['tắm thuốc', 'tam thuoc'], target: 'tắm thuốc' },
            { keywords: ['chườm nóng', 'chuom nong'], target: 'chườm nóng' },
            { keywords: ['kéo cột sống cổ', 'keo co', 'cot song co'], target: 'kéo giãn' },
            { keywords: ['kéo cột sống lưng', 'keo lung', 'cot song lung'], target: 'kéo giãn' }
        ];

        // Chuẩn hóa chuỗi để so khớp (loại bỏ dấu, viết thường, KHÔNG trim)
        function normalizeStrNoTrim(str) {
            return String(str || '').toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd');
        }

        // Chuẩn hóa chuỗi để so khớp (loại bỏ dấu, viết thường và trim ở cuối)
        function normalizeStr(str) {
            return normalizeStrNoTrim(str).trim();
        }

        // Ánh xạ tên dịch vụ HIS → tên thủ thuật trong phần mềm
        function mapHISToProcedure(hisServiceName) {
            if (!hisServiceName) return null;
            const normalized = ' ' + normalizeStrNoTrim(hisServiceName) + ' ';
            for (const mapping of HIS_MAPPING) {
                let isExcluded = false;
                if (mapping.excludes) {
                    for (const ex of mapping.excludes) {
                        if (normalized.includes(normalizeStrNoTrim(ex))) {
                            isExcluded = true;
                            break;
                        }
                    }
                }
                if (isExcluded) continue;

                for (const kw of mapping.keywords) {
                    if (normalized.includes(normalizeStrNoTrim(kw))) {
                        return mapping.target;
                    }
                }
            }
            return null; // Không nhận diện được
        }

        function importFromHIS() {
            if (checkUnclosedDay()) return;

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xlsx, .xls';
            input.onchange = e => {
                const reader = new FileReader();
                reader.onload = function (ev) {
                    try {
                        const workbook = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
                        const sheet = workbook.Sheets[workbook.SheetNames[0]];
                        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

                        if (!rows.length) return showCustomAlert('File trống', 'File Excel không có dữ liệu!', '❌', '#e74c3c');

                        // --- Bước 1: Tự động dò hàng tiêu đề và cột ---
                        let colTen = 6, colNamSinh = 7, colDichVu = 13, startRow = 10;
                        const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd').trim();

                        // Quét 15 hàng đầu - khớp tiếng Việt lẫn mã HIS (TEN_BN, NAM_SINH...)
                        for (let i = 0; i < Math.min(15, rows.length); i++) {
                            const rowStr = rows[i].map(c => norm(c)).join('|');
                            const isHeader = rowStr.includes('ho ten') || rowStr.includes('ten benh') ||
                                rowStr.includes('ten bn') || rowStr.includes('benh nhan') ||
                                rowStr.includes('ten_bn') || rowStr.includes('hoten') ||
                                rowStr.includes('fullname') || rowStr.includes('patient');
                            if (isHeader) {
                                startRow = i + 1;
                                rows[i].forEach((cell, idx) => {
                                    const cn = norm(cell);
                                    if (cn.includes('ho ten') || cn.includes('ten bn') || cn.includes('ten benh') ||
                                        cn === 'ten_bn' || cn === 'hoten' || cn.includes('fullname')) colTen = idx;
                                    else if (cn.includes('nam sinh') || cn.includes('sinh nam') || cn === 'ns' ||
                                        cn === 'nam_sinh' || cn === 'namsanh' || cn.includes('birth')) colNamSinh = idx;
                                    else if (cn.includes('dich vu') || cn.includes('thu thuat') || cn.includes('ten dvkt') ||
                                        cn === 'dichvu' || cn === 'dich_vu' || cn.includes('service') || cn.includes('procedure')) colDichVu = idx;
                                });
                                break;
                            }
                        }

                        // --- Bước 2: Đọc danh sách dịch vụ từ file HIS ---
                        const dataRows = rows.slice(startRow);
                        if (!dataRows.length) return showCustomAlert('Không có dữ liệu', 'File không có dữ liệu từ dòng ' + (startRow + 1) + ' trở đi!', '❌', '#e74c3c');

                        // Hàm sinh khóa chuẩn hóa để so khớp bệnh nhân (bỏ dấu, viết thường, bỏ tất cả khoảng trắng)
                        function buildMatchKey(ten, namSinh) {
                            const cleanTen = String(ten || '')
                                .normalize('NFD')
                                .replace(/[\u0300-\u036f]/g, '')
                                .replace(/đ/g, 'd')
                                .replace(/Đ/g, 'd')
                                .toLowerCase()
                                .replace(/[^a-z0-9]/g, '');
                            const cleanNS = String(namSinh || '').trim();
                            return cleanTen + '|' + cleanNS;
                        }

                        function getTodayDMY() {
                            const today = new Date();
                            const dd = String(today.getDate()).padStart(2, '0');
                            const mm = String(today.getMonth() + 1).padStart(2, '0');
                            const yyyy = today.getFullYear();
                            return dd + '/' + mm + '/' + yyyy;
                        }

                        const hisMap = {};
                        const unrecognized = new Set();
                        let totalRead = 0;

                        dataRows.forEach(row => {
                            const ten = String(row[colTen] || '').trim();
                            const namSinh = String(row[colNamSinh] || '').trim();
                            const dichVu = String(row[colDichVu] || '').trim();

                            // Bỏ qua hàng tiêu đề lọt vào (TEN_BN, HO_TEN...)
                            const tenNorm = norm(ten);
                            if (!ten || tenNorm === 'ten_bn' || tenNorm === 'ho ten' || tenNorm === 'ten benh nhan' || tenNorm === 'hoten') return;
                            if (!dichVu) return;
                            totalRead++;

                            const key = buildMatchKey(ten, namSinh);
                            const properTen = ten.toLowerCase().replace(/(?:^|\s)\S/g, a => a.toUpperCase());
                            if (!hisMap[key]) hisMap[key] = { ten: properTen, namSinh, procs: new Set() };

                            // Tách nhiều thủ thuật trong 1 ô (mỗi dòng 1 thủ thuật)
                            const lines = dichVu.split(/\r?\n/).map(l => l.trim()).filter(l => l);
                            lines.forEach(line => {
                                const cleaned = line.replace(/^\d+\.\s*/, '').replace(/\s*-\s*\d+\s*\(lần\)/i, '').trim();
                                const mapped = mapHISToProcedure(cleaned || line) || mapHISToProcedure(line);
                                if (mapped) hisMap[key].procs.add(mapped);
                                else unrecognized.add(cleaned || line);
                            });
                        });

                        // --- Bước 3: Merge với danh sách bệnh nhân hiện tại ---
                        // Bệnh nhân đã có → chỉ cập nhật thuThuat, giữ nguyên ngayVao/phong/giờ
                        // Bệnh nhân mới  → thêm mới với ngày hôm nay
                        const existingPats = (dataCache && dataCache.pat) ? dataCache.pat : [];
                        const existingMap = {};
                        existingPats.forEach(p => {
                            const k = buildMatchKey(p.ten, p.namSinh);
                            existingMap[k] = p;
                        });

                        let updatedCount = 0, newCount = 0;
                        const mergedList = existingPats.map(p => {
                            const k = buildMatchKey(p.ten, p.namSinh);
                            if (hisMap[k]) {
                                updatedCount++;
                                return { ...p, thuThuat: [...hisMap[k].procs].join(',') };
                            }
                            return { ...p };
                        });
                        Object.values(hisMap).forEach(hisPat => {
                            const k = buildMatchKey(hisPat.ten, hisPat.namSinh);
                            if (!existingMap[k]) {
                                newCount++;
                                mergedList.push({
                                    ten: hisPat.ten,
                                    namSinh: hisPat.namSinh,
                                    ngayVao: getTodayDMY(),
                                    gioVao: '',
                                    gioBan: '',
                                    gioRa: '',
                                    phong: '',
                                    thuThuat: [...hisPat.procs].join(',')
                                });
                            }
                        });

                        // --- Bước 4: Popup xác nhận ---
                        const totalHIS = Object.keys(hisMap).length;
                        let previewHTML = `<div style="font-size:13px;line-height:1.7;color:#2c3e50">`;
                        previewHTML += `<div style="background:#eaf6ff;border-radius:8px;padding:10px 14px;margin-bottom:10px;border-left:4px solid #3498db">`;
                        previewHTML += `<b>📌 Thông tin đọc file:</b><br>Hàng: <b>${startRow + 1}</b> | Cột Tên: <b>${String.fromCharCode(65 + colTen)}</b> | Cột Năm: <b>${String.fromCharCode(65 + colNamSinh)}</b> | Cột DV: <b>${String.fromCharCode(65 + colDichVu)}</b></div>`;
                        previewHTML += `<div style="background:#eafaf1;border-radius:8px;padding:10px 14px;margin-bottom:10px;border-left:4px solid #27ae60">`;
                        previewHTML += `📋 HIS: <b>${totalHIS}</b> BN &nbsp;|&nbsp; 🔄 Cập nhật TT: <b>${updatedCount}</b> BN &nbsp;|&nbsp; ➕ Thêm mới: <b>${newCount}</b> BN</div>`;
                        if (updatedCount > 0) {
                            previewHTML += `<b>🔄 BN đã có (giữ ngày/phòng, cập nhật thủ thuật):</b><ul style="margin:4px 0 8px 16px;padding:0">`;
                            mergedList.filter(p => {
                                const k = buildMatchKey(p.ten, p.namSinh);
                                return !!hisMap[k];
                            }).slice(0, 4).forEach(p => {
                                previewHTML += `<li><b>${escapeHtml(p.ten)}</b> (${escapeHtml(p.namSinh)}): <span style="color:#8e44ad">${escapeHtml(p.thuThuat)}</span></li>`;
                            });
                            if (updatedCount > 4) previewHTML += `<li style="color:#7f8c8d">...và ${updatedCount - 4} BN khác</li>`;
                            previewHTML += `</ul>`;
                        }
                        if (newCount > 0) {
                            previewHTML += `<b>➕ BN mới thêm vào:</b><ul style="margin:4px 0 8px 16px;padding:0">`;
                            mergedList.slice(-newCount).slice(0, 4).forEach(p => {
                                previewHTML += `<li><b>${escapeHtml(p.ten)}</b> (${escapeHtml(p.namSinh)}): <span style="color:#27ae60">${escapeHtml(p.thuThuat)}</span></li>`;
                            });
                            if (newCount > 4) previewHTML += `<li style="color:#7f8c8d">...và ${newCount - 4} BN khác</li>`;
                            previewHTML += `</ul>`;
                        }
                        if (unrecognized.size > 0) {
                            previewHTML += `<div style="background:#fef9e7;border-radius:8px;padding:10px 14px;border-left:4px solid #f39c12">`;
                            previewHTML += `⚠️ <b>${unrecognized.size} dịch vụ chưa nhận diện:</b><ul style="margin:4px 0 0 16px;padding:0">`;
                            [...unrecognized].slice(0, 5).forEach(s => { previewHTML += `<li style="color:#c0392b">${escapeHtml(s)}</li>`; });
                            if (unrecognized.size > 5) previewHTML += `<li style="color:#7f8c8d">...và ${unrecognized.size - 5} dịch vụ khác</li>`;
                            previewHTML += `</ul></div>`;
                        }
                        previewHTML += `</div>`;

                        if (!totalHIS) return showCustomAlert('Không đọc được dữ liệu', previewHTML, '❌', '#e74c3c');

                        showCustomConfirm('🏥 Xác nhận nhập từ HIS', previewHTML, function () {
                            const btn = document.getElementById('btn-import-his');
                            btn.innerText = '⏳ Đang xử lý...'; btn.disabled = true;

                            const cleanMergedList = mergedList.map(p => ({
                                ten: String(p.ten || p.name || '').trim(),
                                namSinh: String(p.namSinh || p.age || '').trim(),
                                ngayVao: String(p.ngayVao || p.ngay_vao || '').trim(),
                                gioVao: String(p.gioVao || p.arrive_time || '').trim(),
                                gioBan: String(p.gioBan || p.gio_ban || '').trim(),
                                gioRa: String(p.gioRa || p.leave_time || '').trim(),
                                phong: String(p.phong || p.room || '').trim(),
                                thuThuat: String(p.thuThuat || '').trim()
                            })).filter(p => p.ten);

                            savePatientsWithFallback(
                                cleanMergedList,
                                true,
                                res => {
                                    btn.innerText = '🏥 HIS'; btn.disabled = false;
                                    showToast(`Nhập HIS thành công: cập nhật ${updatedCount} BN, thêm mới ${newCount} BN`, 'success', 5000);
                                    if (window.dataCacheTime) delete window.dataCacheTime['pat'];

                                    loadEntity('getBenhNhan', 'pat', renderPatientsTable, [], true);
                                },
                                err => {
                                    const msg = (err && typeof err === 'object') ? (err.message || err.error || JSON.stringify(err)) : String(err || 'Lỗi không xác định');
                                    showToast('Lỗi lưu dữ liệu: ' + msg, 'error', 6000);
                                    btn.innerText = '🏥 HIS'; btn.disabled = false;
                                },
                                (cur, tot) => {
                                    btn.innerText = `⏳ ${cur}/${tot}...`;
                                }
                            );
                        });

                    } catch (err) {
                        showCustomAlert('Lỗi đọc file', '❌ ' + err.message, '❌', '#e74c3c');
                    }
                };
                reader.readAsArrayBuffer(e.target.files[0]);
            };
            input.click();
        }

        // ============================================================


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
            if (typeof window.stopAutoSync === 'function') window.stopAutoSync();
        }

        function applyPermissions(role, permsStr) {
            const allTabs = document.querySelectorAll('.nav-tab');
            const adminBtn = document.getElementById('nav-btn-admin');
            const dropdownAdminBtn = document.getElementById('user-menu-admin-btn');
            const dropdownDivider = document.getElementById('user-menu-divider');

            if (role === 'Admin' || permsStr === 'ALL') {
                allTabs.forEach(t => t.style.display = '');
                if (adminBtn) adminBtn.style.display = 'block';
                if (dropdownAdminBtn) dropdownAdminBtn.style.display = 'flex';
                if (dropdownDivider) dropdownDivider.style.display = 'block';
                document.body.classList.remove('read-only-user');
            } else {
                const allowed = (permsStr || '').split(',').map(s => s.trim());
                allowed.push('tab-home');
                allTabs.forEach(t => { t.style.display = allowed.includes(t.getAttribute('data-tab')) ? '' : 'none'; });
                if (dropdownAdminBtn) dropdownAdminBtn.style.display = 'none';
                if (dropdownDivider) dropdownDivider.style.display = 'none';
                if (adminBtn) adminBtn.style.display = 'none';
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

            callApi('getAccounts', [], data => {

                adminAccCache = data;

                const tbody = document.getElementById('acc-list');

                const PERM_MAP = { 'tab-patients': '🛌 Bệnh Nhân', 'tab-schedule': '⚡ Xếp Lịch', 'tab-sat': '📅 Thứ 7', 'tab-busy': '⏱ Giờ Bận', 'tab-stats': '📊 Thống Kê', 'tab-utils': '🛠 Tiện Ích', 'tab-kiemtra': '✅ Kiểm Tra Lỗi', 'tab-machines': '⚙️ Máy Móc', 'tab-procedures': '💉 Thủ Thuật', 'tab-rooms': '🏥 Phòng', 'tab-staff': '👨‍⚕️ Nhân Sự' }; tbody.innerHTML = data.map((acc, i) => {

                    let tenQuyen = "👑 Toàn quyền (Admin)";

                    if (acc.perms !== 'ALL') tenQuyen = acc.perms.split(',').map(p => PERM_MAP[p.trim()] ||

                        p.trim()).join(', ');



                    return `<tr class="editable-row" onclick="editAccount(${i})">

                                    <td>${acc.id}</td>

                                    <td style="font-size:15px; color:#2c3e50;"><strong>${escapeHtml(acc.user)}</strong></td>

                                    <td>${acc.hasPassword ? '<span style="color:#7f8c8d; font-style:italic; font-size:12px;">🔒 Đã bảo mật</span>' : '<span style="color:#e74c3c; font-weight:bold; font-size:12px;">⚠️ Chưa có MK</span>'}</td>

                                    <td><span

                                            style="color:${acc.role === 'Admin' ? '#c0392b' : '#2980b9'}; font-weight:bold; background:${acc.role === 'Admin' ? '#fadbd8' : '#d6eaf8'}; padding:4px 8px; border-radius:5px;">${acc.role}</span>

                                    </td>

                                    <td style="font-size:12px; line-height:1.6; color:#27ae60; font-weight:500;">

                                        ${tenQuyen}</td>

                                    <td><button class="btn-danger"

                                            style="border-radius:5px; padding:6px 12px; font-weight:bold; cursor:pointer;"

                                            onclick="event.stopPropagation(); deleteAccount('${acc.id}', '${acc.user}')">🗑️

                                            Xóa</button></td>

                                </tr>`;

                }).join('');

            }, err => {
                console.error('[loadAccounts] Lỗi tải tài khoản:', err);
            });

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

            document.querySelectorAll('.perm-cb').forEach(cb => {
                cb.checked = acc.role === 'User'

                    && acc.perms ? acc.perms.split(',').map(s => s.trim()).includes(cb.value) : false;
            });

            document.getElementById('btn-save-acc').innerText = "Cập nhật MK / Quyền";

        }



        function luuTaiKhoan() {

            const id = document.getElementById('acc-id').value;

            const user = document.getElementById('acc-user').value;

            const pass = document.getElementById('acc-pass').value;

            const role = document.getElementById('acc-role').value;



            if (!user) return showCustomAlert("Lưu ý", "Vui lòng nhập tên tài khoản!");

            // Chỉ bắt buộc nhập mật khẩu nếu là tài khoản tạo mới (không có ID)

            if (!id && !pass) return showCustomAlert("Lưu ý", "Vui lòng nhập mật khẩu cho tài khoản mới!");



            const perms = role === 'User' ?

                Array.from(document.querySelectorAll('.perm-cb:checked')).map(cb => cb.value).join(', ')

                : 'ALL';

            const btn = document.getElementById('btn-save-acc');

            btn.innerText = "Đang lưu..."; btn.disabled = true;

            callApi('saveAccount', [id, user, pass, role, perms], msg => {
                showCustomAlert("Thành công", typeof msg === 'string' ? msg : "Đã lưu tài khoản thành công!");
                huySuaTaiKhoan();
                loadAccounts();
                btn.innerText = "Lưu Tài Khoản";
                btn.disabled = false;
            }, err => {
                showCustomAlert("Lỗi", "Không thể lưu tài khoản: " + (typeof err === 'string' ? err : JSON.stringify(err)));
                btn.innerText = "Lưu Tài Khoản";
                btn.disabled = false;
            });

        }



        function huySuaTaiKhoan() {

            ['acc-id', 'acc-user', 'acc-pass'].forEach(id => {
                const el = document.getElementById(id);

                if (el) el.value = '';
            });

            document.getElementById('acc-pass').placeholder = "Nhập mật khẩu...";

            document.getElementById('acc-role').value = 'User';

            document.querySelectorAll('.perm-cb').forEach(cb => cb.checked = false);

            togglePermissionsBox();

            document.getElementById('btn-save-acc').innerText = "Lưu Tài Khoản";

        }

        function deleteAccount(id, user) {

            if (user.toLowerCase() === 'admin') return showCustomAlert("Cảnh báo bảo mật", "Không được phép xóa tài khoản Admin gốc!");

            showCustomConfirm("Xóa tài khoản", `Bác sĩ có chắc chắn muốn xóa vĩnh viễn tài khoản [ ${user} ] không?`, function () {
                callApi('deleteAccount', [id], () => {
                    loadAccounts();
                    showCustomAlert("Thành công", `Đã xóa tài khoản "${user}" thành công!`);
                }, err => {
                    showCustomAlert("Lỗi", "Không thể xóa tài khoản: " + (typeof err === 'string' ? err : JSON.stringify(err)));
                });
            });

        }



        // ============================================================

        // 🔄 AUTO SYNC

        // ============================================================

        function syncPatients() { loadEntity('getBenhNhan', 'pat', renderPatientsTable, [], true); }

        function syncStaff() {
            loadEntity('getNhanSu', 'staff', renderStaffTable, [
                () => { if (typeof renderBusyStaff === 'function') renderBusyStaff(); },
                () => { if (typeof locSotSat === 'function') locSotSat(); }
            ], true);
        }

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



        window.onload = function () {

            const sessionStr = localStorage.getItem('meds_session');

            if (sessionStr) {

                const session = JSON.parse(sessionStr);

                document.getElementById('login-overlay').style.display = 'none';

                updateLogoutButton(session.username);

                applyPermissions(session.role, session.permissions);

                if (session.role === 'Admin' && typeof loadAccounts === 'function') {
                    loadAccounts();
                }
                
                startAutoSync();

            } else {

                document.getElementById('login-user')?.focus();

            }

        };

        window.addEventListener('load', function () {

            setTimeout(function () {

                if (typeof loadAllData === 'function') loadAllData();

                if (typeof loadDashboard === 'function') loadDashboard();

            }, 800);

        });





        // ============================================================
        // UI - CHUYỂN TAB ADMIN
        // ============================================================
        function switchAdminSection(sectionId, btn) {
            document.querySelectorAll('.admin-section').forEach(sec => sec.style.display = 'none');
            document.getElementById(sectionId).style.display = 'flex';

            document.querySelectorAll('.admin-nav-btn').forEach(b => {
                b.style.background = '#f1f2f6';
                b.style.color = '#333';
                b.style.borderLeft = '4px solid transparent';
            });

            if (btn) {
                btn.style.background = '#e8f8f5';
                btn.style.color = '#16a085';
                btn.style.borderLeft = '4px solid #16a085';
            }
        }

        // ============================================================
        // ⚙️ CÀI ĐẶT HỆ THỐNG
        // ============================================================
        function luuCaiDatChotSo(btn) {
            const timeVal = document.getElementById("admin-chotso-time").value;
            const yhctLunchVal = document.getElementById("admin-yhct-lunch").value;
            const yhctEndVal = document.getElementById("admin-yhct-end").value;
            const dropW = document.getElementById("admin-weight-drop").value;
            const overtimeW = document.getElementById("admin-weight-overtime").value;
            const imbalanceW = document.getElementById("admin-weight-imbalance").value;
            if (!timeVal) {
                alert("Vui lòng chọn giờ chốt sổ!");
                return;
            }
            const oldText = btn.innerText;
            btn.innerText = "Đang lưu...";
            btn.disabled = true;
            google.script.run.withSuccessHandler(function (res) {
                btn.innerText = oldText;
                btn.disabled = false;
                showCustomAlert("Cài đặt", res, "✅", "#2ecc71");
            }).withFailureHandler(function (err) {
                btn.innerText = oldText;
                btn.disabled = false;
                alert("Lỗi: " + err);
            }).saveSystemSettings({ 
                chotSoTime: timeVal,
                yhctLunch: yhctLunchVal,
                yhctEnd: yhctEndVal,
                dropWeight: dropW,
                overtimeWeight: overtimeW,
                imbalanceWeight: imbalanceW
            });
        }

        function loadSystemSettings() {
            // Already loaded by getBootstrapData via applySystemSettings
        }

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

        function logHL(msg) {
            const el = document.getElementById('hl-log'); if (el) {
                el.value +=

                msg + "\n"; el.scrollTop = el.scrollHeight;
            }
        }

        function parseTimeToMinutes(timeStr) {

            if (!timeStr) return 0;

            const parts = String(timeStr).trim().toLowerCase().replace('h', ':').split(':');

            return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);

        }

        function handleHLFile(event) {

            const file = event.target.files[0];

            if (!file) return;

            logHL("⏳ Đang phân tích file: " + file.name);

            const reader = new FileReader();

            reader.onload = function (e) {

                try {

                    let workbook;

                    try { workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' }); }

                    catch (err) { throw new Error("Cấu trúc file bị hỏng hoặc không đúng chuẩn."); }

                    if (!workbook?.SheetNames?.length) { logHL("❌ LỖI ĐỊNH DẠNG: File bị hỏng. Hãy mở bằng Excel và Save As lại nhé."); event.target.value = ""; return; }



                    function bocTachGioExcel(cellVal) {

                        if (cellVal === undefined || cellVal === null || cellVal === '') return null;

                        if (typeof cellVal === 'number' && cellVal >= 0 && cellVal < 1) {
                            const

                            totalMins = Math.round(cellVal * 24 * 60), h = Math.floor(totalMins / 60), m = totalMins % 60;

                            return `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}`;
                        } const

                            match = String(cellVal).trim().match(/(\d{1,2}:\d{2})/); return match ? match[1] :

                                null;
                    } let records = [], formatTypeUsed = ''; const today = new

                        Date().toLocaleDateString('vi-VN'); for (let s = 0; s < workbook.SheetNames.length;

                        s++) {
                            const sheet = workbook.Sheets[workbook.SheetNames[s]]; const

                                rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }); let headerRow = -1,

                                    formatType = '', colIdx = { nv: -1, tt: -1, bd: -1, kt: -1 }; for (let i = 0; i < Math.min(20,

                                        rawData.length); i++) {
                                            const rowArr = rawData[i]; if (!Array.isArray(rowArr))

                                                continue; const rowString = rowArr.join('|').toUpperCase(); if

                                (rowString.includes('HOTEN') && rowString.includes('HSBA') &&

                                !rowString.includes('GIODIENRA')) { headerRow = i; formatType = 'MATRIX'; break; } else

                                if ((rowString.includes('NHANVIEN') || rowString.includes('NHÂN VIÊN')) &&

                                    (rowString.includes('GIODIENRA') || rowString.includes('BẮT ĐẦU'))) {
                                        headerRow = i;

                                    formatType = 'FLAT'; rowArr.forEach((cell, j) => {

                                        const v = String(cell || '').trim().toUpperCase().replace(/\r?\n|\r/g, '');

                                        if (v.includes('NHANVIEN') || v === 'HOTEN' || v.includes('NHÂN VIÊN')) colIdx.nv = j;

                                        if (v.includes('DICHVU') || v.includes('THỦ THUẬT')) colIdx.tt = j;

                                        if (v.includes('GIODIENRA') || v.includes('BẮT ĐẦU')) colIdx.bd = j;

                                        if (v.includes('GIOKETTHUC') || v.includes('KẾT THÚC')) colIdx.kt = j;

                                    });

                                    break;

                                }

                        }

                        if (headerRow === -1) continue;



                        if (formatType === 'FLAT') {

                            for (let i = headerRow + 1; i < rawData.length; i++) {
                                const row = rawData[i]; if

                                    (!Array.isArray(row) || !row.length) continue; const

                                        nv = String(row[colIdx.nv] || '').trim(), tt = colIdx.tt !== -1 ?

                                            String(row[colIdx.tt] || '').trim() : ''; const

                                                timeBD = bocTachGioExcel(row[colIdx.bd]), timeKT = bocTachGioExcel(row[colIdx.kt]);

                                if (nv && timeBD && timeKT) {
                                    const bdMins = parseTimeToMinutes(timeBD),

                                    ktMins = parseTimeToMinutes(timeKT), tgThucTe = ktMins - bdMins; if (tgThucTe > 0 &&

                                        tgThucTe < 480) records.push([today, file.name, nv, tt, bdMins, ktMins,

                                            tgThucTe, bdMins - 420]);
                                }
                            }
                        } else if (formatType === 'MATRIX') {
                            const

                            headers = rawData[headerRow]; for (let i = headerRow + 1; i < rawData.length; i++) {
                                const row = rawData[i]; if (!Array.isArray(row) || !row.length) continue; for

                                    (let j = 2; j < row.length; j++) {
                                        const

                                        lines = String(row[j] || '').trim().split(/\r?\n/); if (lines.length >= 2 &&

                                            lines[0].includes('-')) {

                                        const timeParts = lines[0].split('-'), nv = lines[1]?.trim() || '', tt =

                                            headers[j] ? String(headers[j]).trim() : '';

                                        const timeBD = bocTachGioExcel(timeParts[0]), timeKT =

                                            bocTachGioExcel(timeParts[1]);

                                        if (timeBD && timeKT && nv) {

                                            const bdMins = parseTimeToMinutes(timeBD), ktMins =

                                                parseTimeToMinutes(timeKT), tgThucTe = ktMins - bdMins;

                                            if (tgThucTe > 0 && tgThucTe < 480) records.push([today, file.name, nv, tt,

                                                bdMins, ktMins, tgThucTe, bdMins - 420]);
                                        }
                                    }
                                }
                            }
                        } if (records.length > 0) { formatTypeUsed = formatType; break; }

                    }



                    if (records.length > 0) {

                        logHL(`🚀 Đã bóc tách thành công ${records.length} ca (Dạng

                                                ${formatTypeUsed}). Đang lưu...`);

                        google.script.run.withSuccessHandler(res => {
                            logHL("✅ " + res);

                            loadHLData();
                        }).withFailureHandler(err => logHL("❌ Lỗi lưu: " +

                            err.message)).saveAITrainingData(records);

                    } else logHL("❌ Không tìm thấy dữ liệu giờ giấc hợp lệ trong bất kỳ Sheet nào của file!");

                } catch (err) { logHL("❌ Lỗi kỹ thuật: " + err.message); }

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

                if (!data?.length) {
                    tbody.innerHTML = `<tr> <td colspan="5" style="text-align:center; color:gray">Kho dữ liệu

                                                        hiện đang trống.</td>

                                                </tr>`; return;
                } tbody.innerHTML = data.slice(0, 100).map(row => `<tr>

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

            google.script.run.withSuccessHandler(res => {
                logHL("✅ " + res);

                loadHLData();
            }).clearAITrainingData();

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

                const blob = new Blob([promptText], { type: 'text/plain;charset=utf-8' });

                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');

                a.href = url; a.download = `Bo_Nao_AI_Xep_Lich_${new

                    Date().toLocaleDateString('vi-VN').replace(/\//g, '')}.txt`;

                document.body.appendChild(a); a.click(); document.body.removeChild(a);

                URL.revokeObjectURL(url);

                logHL("✅ Đã xuất file thành công!");

            }).getAITrainingData();

        }



        // ============================================================

        // 📅 DATE FORMAT

        // ============================================================

        function autoFormatDate(obj) {

            let val = obj.value.replace(/\D/g, '');

            if (val.length > 8) val = val.substring(0, 8);

            if (val.length >= 5) obj.value =

                `${val.substring(0, 2)}/${val.substring(2, 4)}/${val.substring(4, 8)}`;

            else if (val.length >= 3) obj.value =

                `${val.substring(0, 2)}/${val.substring(2, 4)}`;

            else obj.value = val;

        }



        // ============================================================

        // 🏠 DASHBOARD

        // ============================================================

        function loadDashboard() {
            const datePicker = document.getElementById('dashboard-date-filter');

            if (!datePicker.value) {
                const rawSched = dataCache.schedule || [];
                let activeDateStr = null;
                if (rawSched && rawSched.length > 0) {
                    const firstRow = rawSched[0];
                    activeDateStr = firstRow.ngay || firstRow[0];
                }

                let activeYMD = null;
                if (activeDateStr) {
                    if (activeDateStr.includes('/')) {
                        const parts = activeDateStr.split('/');
                        activeYMD = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    } else {
                        activeYMD = activeDateStr;
                    }
                }

                const d = new Date();
                const safeTodayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                // Tính ngày hôm qua
                const yesterday = new Date(d);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

                if (activeYMD && activeYMD !== safeTodayStr) {
                    // Chỉ cảnh báo nếu ngày cũ là ngày HÔM QUA (cần chốt sổ)
                    // Nếu cũ hơn 1 ngày → đó là cache offline lỗi thời, im lặng reset về hôm nay
                    if (activeYMD === yesterdayStr) {
                        alert(`⚠️ HỆ THỐNG PHÁT HIỆN:\nDữ liệu của ngày ${activeDateStr} chưa được chốt sổ!\nMặc định sẽ hiển thị dữ liệu của ngày này để bạn tiếp tục xử lý.`);
                        datePicker.value = activeYMD;
                    } else {
                        // Cache cũ (>1 ngày), bỏ qua và dùng ngày hôm nay
                        datePicker.value = safeTodayStr;
                        activeYMD = null;
                    }
                } else {
                    datePicker.value = safeTodayStr;
                }

                window._systemActiveYMD = activeYMD;
                // Wait for value change to trigger loadDashboard again, or proceed below
            }

            const selectedDate = datePicker.value;
            const displayEl = document.getElementById('display-date');
            if (displayEl) displayEl.textContent = selectedDate.split('-').reverse().join('/');

            const historyInput = document.getElementById('history-date');
            if (historyInput && historyInput.value !== selectedDate) {
                historyInput.value = selectedDate;
            }

            const d = new Date();
            const safeTodayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            const isLiveMode = (window._forceHistoryMode === true) ? false : ((window._systemActiveYMD === selectedDate) || (!window._systemActiveYMD && selectedDate === safeTodayStr));
            window._forceHistoryMode = false;

            if (isLiveMode) {
                window.viewingImportedScheduleFile = false;
                if (typeof restoreHistoryTabs === 'function') restoreHistoryTabs();

                const patData = dataCache.pat || [];
                const elBN = document.getElementById('statBN');
                if (elBN) elBN.textContent = patData.length;

                let totalProcs = 0;
                patData.forEach(p => {
                    if (p.thuThuat) {
                        const count = String(p.thuThuat).split(',').map(x => x.trim()).filter(x => x).length;
                        totalProcs += count;
                    }
                });

                const staffData = dataCache.staff || [];
                const working = staffData.filter(s => {
                    const st = s.trangThai || '';
                    const r = s.vaiTro || '';
                    return st === 'Đi làm' && r !== 'Điều dưỡng';
                }).length;
                const elStaff = document.getElementById('statStaff');
                if (elStaff) elStaff.textContent = working;

                const statScheduledEl = document.getElementById('statScheduled');
                const statDroppedEl = document.getElementById('statDropped');
                
                let rawSched = (dataCache && dataCache.schedule && dataCache.schedule.length) ? dataCache.schedule : (window.currentScheduleData || []);
                if (!rawSched.length) {
                    try {
                        const localSched = JSON.parse(localStorage.getItem('meds_success') || '[]');
                        if (Array.isArray(localSched) && localSched.length) {
                            // ✅ Kiểm tra ngày của lịch cũ trước khi dùng
                            const savedDate = localStorage.getItem('meds_schedule_date') || '';
                            const nowVN2 = new Date(Date.now() + 7 * 60 * 60 * 1000);
                            const todayYMD2 = `${nowVN2.getUTCFullYear()}-${String(nowVN2.getUTCMonth() + 1).padStart(2, '0')}-${String(nowVN2.getUTCDate()).padStart(2, '0')}`;
                            const toYMD2 = (s) => {
                                if (!s) return '';
                                if (String(s).includes('/')) { const p = String(s).split('/'); return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`; }
                                return String(s);
                            };
                            const schedDate = savedDate ? toYMD2(savedDate) : toYMD2(localSched[0]?.[0] || localSched[0]?.ngay || localSched[0]?.NGAY || '');
                            if (!schedDate || schedDate === todayYMD2) {
                                // Lịch đúng ngày hôm nay → dùng bình thường
                                rawSched = localSched;
                                if (typeof dataCache !== 'undefined') dataCache.schedule = localSched;
                                if (window.dataCache) window.dataCache.schedule = localSched;
                                window.currentScheduleData = markDischargedInSchedule(localSched);
                            } else {
                                // Lịch ngày cũ → bỏ qua, xóa để không ảnh hưởng lần sau
                                console.warn(`⚠️ [meds_success] Lịch cũ ngày ${schedDate}, bỏ qua (hôm nay: ${todayYMD2})`);
                                localStorage.removeItem('meds_success');
                                localStorage.removeItem('meds_schedule_date');
                            }
                        }
                    } catch(e) {}
                }

                const toYMD = (dateStr) => {
                    if (!dateStr) return '';
                    const s = String(dateStr).trim();
                    if (s.includes('/')) {
                        const parts = s.split('/');
                        if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }
                    return s;
                };

                const validData = (rawSched || []).filter(item => {
                    const itemDate = item.ngay || item.NGAY || item[0];
                    if (!itemDate) return true;
                    return toYMD(itemDate) === toYMD(selectedDate);
                });

                const dayData = validData.filter(item => {
                    const g = String(item.gioDienRa || item.GIODIENRA || item[5] || '');
                    return g && g !== '--' && !g.includes('Rớt');
                }).map(item => [
                    item.ngay || item.NGAY || item[0] || selectedDate,
                    item.tenBN || item.HOTEN || item[1] || '',
                    item.namSinh || item.NAMSINH || item[2] || '',
                    item.phong || item.PHONG || item[3] || '',
                    item.thuThuat || item.DICHVU || item[4] || '',
                    item.gioDienRa || item.GIODIENRA || item[5] || '',
                    item.gioKetThuc || item.GIOKETTHUC || item[6] || '',
                    item.nvChinh || item['NV CHÍNH'] || item[7] || '',
                    item.nvPhu || item['NV PHỤ'] || item[8] || '',
                    item.may || item.MAY || item[9] || '',
                    item.giuong || item.GIUONG || item[10] || ''
                ]);

                const rotDataSheets = validData.filter(item => {
                    const g = String(item.gioDienRa || item.GIODIENRA || item[5] || '');
                    return g === '--' || g.includes('Rớt');
                }).map(item => [
                    item.ngay || item.NGAY || item[0] || selectedDate,
                    item.tenBN || item.HOTEN || item[1] || '',
                    item.namSinh || item.NAMSINH || item[2] || '',
                    item.phong || item.PHONG || item[3] || '',
                    item.thuThuat || item.DICHVU || item[4] || '',
                    '❌ Rớt', '--', '--', '--', '--', '--', 'Thiếu nhân sự/Máy'
                ]);

                let rotDataLocal = [];
                try {
                    const activeDate = localStorage.getItem('meds_schedule_date') || '';
                    if (toYMD(activeDate) === toYMD(selectedDate) || !activeDate) {
                        rotDataLocal = (JSON.parse(localStorage.getItem('meds_unscheduled') || '[]')).map(u => [
                            selectedDate, u.bn || u.tenBN || '', u.ns || u.namSinh || '',
                            u.room || u.phong || '', u.tt || u.thuThuat || '',
                            '❌ Rớt', '--', '--', '--', '--', '--', u.reason || 'Quá tải/Hết giờ'
                        ]);
                    }
                } catch (e) { }

                const rotData = rotDataSheets.length > 0 ? rotDataSheets : rotDataLocal;

                if (statScheduledEl) statScheduledEl.textContent = dayData.length;
                if (statDroppedEl) statDroppedEl.textContent = rotData.length;
                const totalProcsEl = document.getElementById('statTotalProcs');
                if (totalProcsEl) totalProcsEl.textContent = dayData.length + rotData.length;

                if (typeof renderDashboardPreview === 'function') renderDashboardPreview([...dayData, ...rotData]);
                if (typeof renderCharts === 'function') renderCharts(dayData);
                if (typeof renderDashboardMonthlyCharts === 'function') renderDashboardMonthlyCharts(selectedDate);
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
                const statTotalProcsEl = document.getElementById('statTotalProcs');
                if (statTotalProcsEl) statTotalProcsEl.textContent = "...";

                const processHistoryData = (data) => {
                    const fullData = Array.isArray(data) ? { schedule: data, patients: [], staffBusy: [], patBusy: [] } : data;

                    window._historyCache = window._historyCache || {};
                    window._historyCache[selectedDate] = fullData;
                    window.viewingImportedScheduleFile = true;
                    window._viewingHistoryDate = selectedDate;
                    window.currentScheduleData = markDischargedInSchedule(fullData.schedule || []);

                    if (typeof applyHistoryDataToTabs === 'function') applyHistoryDataToTabs(fullData, selectedDate);
                    if (typeof filterSchedule === 'function') filterSchedule();

                    if (statBN) statBN.textContent = (fullData.patients || []).length;
                    if (statStaff) statStaff.textContent = (fullData.staffBusy || []).length;

                    const sched = fullData.schedule || [];
                    const dayData = sched.filter(item => { const g = item.gioDienRa || ''; return g && g !== '--' && !g.includes('Rớt'); }).map(item => [item.ngay, item.tenBN, item.namSinh, item.phong, item.thuThuat, item.gioDienRa, item.gioKetThuc, item.nvChinh, item.nvPhu, item.may, item.giuong]);
                    const rotData = sched.filter(item => { const g = item.gioDienRa || ''; return g === '--' || g.includes('Rớt'); }).map(item => [item.ngay, item.tenBN, item.namSinh, item.phong, item.thuThuat, '❌ Rớt', '--', '--', '--', '--', '--', 'Thiếu nhân sự/Máy']);

                    if (statScheduledEl) statScheduledEl.textContent = dayData.length;
                    if (statDroppedEl) statDroppedEl.textContent = rotData.length;

                    if (typeof renderDashboardPreview === 'function') renderDashboardPreview([...dayData, ...rotData]);
                    if (typeof renderCharts === 'function') renderCharts(dayData);
                };

                if (window._historyCache && window._historyCache[selectedDate]) {
                    processHistoryData(window._historyCache[selectedDate]);
                    if (window.showToast) window.showToast("Đã tải dữ liệu lịch sử từ bộ nhớ", "info", 2000);
                } else {
                    if (window.showGlobalLoading) window.showGlobalLoading("Đang tải dữ liệu lịch sử...");
                    google.script.run.withSuccessHandler(data => {
                        processHistoryData(data);
                        if (window.hideGlobalLoading) window.hideGlobalLoading();
                        if (window.showToast) window.showToast("Đã tải xong dữ liệu lịch sử!", "success");
                    }).withFailureHandler(err => {
                        if (window.hideGlobalLoading) window.hideGlobalLoading();
                        console.error("Lỗi tải lịch sử Dashboard: " + err);
                        if (window.showToast) window.showToast("Lỗi tải dữ liệu: " + err, "error");
                    }).getHistoryFullData(selectedDate);
                }
            }
        }

        function renderDashboardMonthlyCharts(dateStr) {
            let targetDate = new Date();
            if (dateStr) {
                const parts = String(dateStr).split('-');
                if (parts.length === 3) {
                    targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                }
            }
            const y = targetDate.getFullYear() || new Date().getFullYear();
            const m = String(targetDate.getMonth() + 1).padStart(2, '0');
            const monthYear = `${y}-${m}`;
            const subTitle = `(Tháng ${m}/${y})`;

            const elSub1 = document.getElementById('dash-chart-workdays-subtitle');
            if (elSub1) elSub1.innerText = subTitle;
            const elSub2 = document.getElementById('dash-chart-procs-subtitle');
            if (elSub2) elSub2.innerText = subTitle;

            if (typeof Chart === 'undefined') return;

            const drawValuePlugin = {
                id: 'dashDrawValuePlugin',
                afterDatasetsDraw(chart) {
                    const { ctx } = chart;
                    chart.data.datasets.forEach((dataset, i) => {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach((bar, index) => {
                            const val = dataset.data[index];
                            if (val !== undefined && val !== null && val > 0) {
                                ctx.save();
                                ctx.fillStyle = '#334155';
                                ctx.font = 'bold 11px Inter, sans-serif';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'bottom';
                                ctx.fillText(String(val).replace('.', ','), bar.x, bar.y - 3);
                                ctx.restore();
                            }
                        });
                    });
                }
            };

            const processCharts = (ccData, ttData) => {
                const cc = ccData || {};
                const tt = ttData || {};
                const daysInMonth = new Date(y, parseInt(m, 10), 0).getDate();

                let empList = [];
                if (typeof adminChamCongEmployees !== 'undefined' && Array.isArray(adminChamCongEmployees) && adminChamCongEmployees.length > 0) {
                    empList = [...adminChamCongEmployees];
                } else if (typeof dataCache !== 'undefined' && dataCache.staff && dataCache.staff.length > 0) {
                    empList = dataCache.staff.map(s => s.ten).filter(Boolean);
                } else {
                    empList = Array.from(new Set([...Object.keys(cc), ...Object.keys(tt)])).filter(Boolean);
                }

                // 1. Dữ liệu ngày công
                const workdaysArr = empList.map(emp => {
                    let totalCong = 0;
                    if (cc[emp]) {
                        for (let d = 1; d <= daysInMonth; d++) {
                            const raw = cc[emp][d] || '';
                            if (typeof calcDayValue === 'function') totalCong += calcDayValue(raw);
                            else if (typeof window.calcDayValue === 'function') totalCong += window.calcDayValue(raw);
                            else if (raw === 'ca-ngay' || raw === 'X' || raw === 'x') totalCong += 1;
                            else if (raw === 'sang' || raw === 'chieu' || raw === 'S' || raw === 'C') totalCong += 0.5;
                        }
                        const heSo = cc[emp].heSo !== undefined ? parseFloat(cc[emp].heSo) : 1.0;
                        totalCong = Math.round((totalCong * heSo) * 100) / 100;
                    }
                    return { name: emp, val: totalCong };
                }).filter(x => x.val > 0).sort((a, b) => b.val - a.val);

                // 2. Dữ liệu thủ thuật
                const procsArr = empList.map(emp => {
                    let totalTT = 0;
                    if (tt[emp]) {
                        totalTT = (tt[emp].loai1 || 0) + (tt[emp].loai2 || 0) + (tt[emp].loai3 || 0) + (tt[emp].khac || 0);
                    }
                    return { name: emp, val: totalTT };
                }).filter(x => x.val > 0).sort((a, b) => b.val - a.val);

                // Biểu đồ 1: Ngày công
                const canvas1 = document.getElementById('canvas-dash-workdays');
                if (canvas1) {
                    const ctx1 = canvas1.getContext('2d');
                    if (window._dashWorkdaysChart) window._dashWorkdaysChart.destroy();
                    const maxVal1 = workdaysArr.length ? Math.max(...workdaysArr.map(d => d.val)) : 10;
                    window._dashWorkdaysChart = new Chart(ctx1, {
                        type: 'bar',
                        data: {
                            labels: workdaysArr.map(d => d.name),
                            datasets: [{
                                label: 'Ngày công',
                                data: workdaysArr.map(d => d.val),
                                backgroundColor: '#38bdf8',
                                borderColor: '#0284c7',
                                borderWidth: 1,
                                borderRadius: 3,
                                barPercentage: 0.65,
                                categoryPercentage: 0.8
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            layout: { padding: { top: 20, bottom: 5 } },
                            plugins: {
                                legend: {
                                    display: true,
                                    position: 'top',
                                    labels: {
                                        boxWidth: 20,
                                        boxHeight: 10,
                                        font: { size: 12, weight: '600' },
                                        color: '#334155'
                                    }
                                },
                                tooltip: {
                                    callbacks: {
                                        label: (ctx) => ` Ngày công: ${String(ctx.raw).replace('.', ',')}`
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    ticks: {
                                        font: { size: 10.5, weight: '600' },
                                        color: '#334155',
                                        maxRotation: 45,
                                        minRotation: 35
                                    },
                                    grid: { display: false }
                                },
                                y: {
                                    beginAtZero: true,
                                    suggestedMax: Math.ceil(maxVal1 * 1.15),
                                    ticks: {
                                        font: { size: 11 },
                                        color: '#64748b',
                                        stepSize: 2
                                    },
                                    grid: { color: '#f1f5f9' }
                                }
                            }
                        },
                        plugins: [drawValuePlugin]
                    });
                }

                // Biểu đồ 2: Thủ thuật
                const canvas2 = document.getElementById('canvas-dash-procs');
                if (canvas2) {
                    const ctx2 = canvas2.getContext('2d');
                    if (window._dashProcsChart) window._dashProcsChart.destroy();
                    const maxVal2 = procsArr.length ? Math.max(...procsArr.map(d => d.val)) : 50;
                    window._dashProcsChart = new Chart(ctx2, {
                        type: 'bar',
                        data: {
                            labels: procsArr.map(d => d.name),
                            datasets: [{
                                label: 'Thủ thuật',
                                data: procsArr.map(d => d.val),
                                backgroundColor: '#e11d48',
                                borderColor: '#be123c',
                                borderWidth: 1,
                                borderRadius: 3,
                                barPercentage: 0.65,
                                categoryPercentage: 0.8
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            layout: { padding: { top: 20, bottom: 5 } },
                            plugins: {
                                legend: {
                                    display: true,
                                    position: 'top',
                                    labels: {
                                        boxWidth: 20,
                                        boxHeight: 10,
                                        font: { size: 12, weight: '600' },
                                        color: '#334155'
                                    }
                                },
                                tooltip: {
                                    callbacks: {
                                        label: (ctx) => ` Thủ thuật: ${ctx.raw}`
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    ticks: {
                                        font: { size: 10.5, weight: '600' },
                                        color: '#334155',
                                        maxRotation: 45,
                                        minRotation: 35
                                    },
                                    grid: { display: false }
                                },
                                y: {
                                    beginAtZero: true,
                                    suggestedMax: Math.ceil(maxVal2 * 1.15),
                                    ticks: {
                                        font: { size: 11 },
                                        color: '#64748b'
                                    },
                                    grid: { color: '#f1f5f9' }
                                }
                            }
                        },
                        plugins: [drawValuePlugin]
                    });
                }
            };

            if (typeof window.fetchSingleMonthData === 'function') {
                window.fetchSingleMonthData(monthYear).then(res => {
                    const mData = res?.data || {};
                    processCharts(mData.chamcong, mData.thuthuat);
                });
            } else if (typeof chamCongData !== 'undefined' && typeof thongKeData !== 'undefined') {
                processCharts(chamCongData, thongKeData);
            }
        }

        window.renderDashboardMonthlyCharts = renderDashboardMonthlyCharts;

        function renderCharts(data) {

            const valid = data.filter(r => r[4] && r[7]);

            // Build lookups from dataCache
            const staffRoleMap = {};   // ten(lower) -> vaiTro(lower)
            (dataCache.staff || []).forEach(s => { if (s.ten) staffRoleMap[s.ten.trim().toLowerCase()] = String(s.vaiTro || '').trim().toLowerCase(); });

            const procCategoryMap = {}; // ten(lower) -> he(upper)
            (dataCache.proc || []).forEach(p => { if (p.ten) procCategoryMap[p.ten.trim().toLowerCase()] = String(p.he || 'PHCN').trim().toUpperCase(); });

            const staffLoadBS = {}, staffLoadKTV = {};
            const procCountYHCT = {}, procCountPHCN = {};

            valid.forEach(r => {
                const nvChinh = (r[7] || '').trim();
                const thuThuat = (r[4] || '').trim();
                const role = staffRoleMap[nvChinh.toLowerCase()] || '';

                let isDoctor = false;
                if (role) {
                    isDoctor = role.includes('b\u00e1c s\u0129') || role.includes('bs');
                } else {
                    const lowerName = nvChinh.toLowerCase();
                    isDoctor = lowerName.startsWith('bs') || lowerName.includes('b\u00e1c s\u0129');
                }

                if (isDoctor) staffLoadBS[nvChinh] = (staffLoadBS[nvChinh] || 0) + 1;
                else staffLoadKTV[nvChinh] = (staffLoadKTV[nvChinh] || 0) + 1;

                const cat = procCategoryMap[thuThuat.toLowerCase()] || 'PHCN';
                if (cat === 'YHCT') procCountYHCT[thuThuat] = (procCountYHCT[thuThuat] || 0) + 1;
                else procCountPHCN[thuThuat] = (procCountPHCN[thuThuat] || 0) + 1;
            });

            const colorsBS   = ['#1a3a5c', '#1f4d7a', '#245f96', '#2a72b3', '#3080c0', '#4a94cf', '#63a5d9', '#7db5e0', '#97c5e8', '#b0d4f0'];
            const colorsKTV  = ['#1e3d2b', '#2d5a3d', '#3e6b4f', '#4a7c5f', '#5a8d70', '#6a9e80', '#7aaf91', '#8abfa2', '#9ad0b3', '#aae0c4'];
            const colorsYHCT = ['#5a2d0c', '#7a3d10', '#9a5015', '#b86320', '#d07830', '#d98f50', '#e2a670', '#eabd90', '#f0d1b0', '#f5e4cc'];
            const colorsPHCN = ['#1e3d2b', '#2d5a3d', '#3e6b4f', '#4a7c5f', '#5a8d70', '#6a9e80', '#7aaf91', '#8abfa2', '#9ad0b3', '#aae0c4'];

            const barRow = (label, val, max, color) => `
                <div class="dash-chart-row" style="display:flex;align-items:center;gap:6px;margin-bottom:7px;">
                    <div style="width:80px;min-width:80px;font-size:0.71rem;color:#2c3e50;font-weight:600;text-align:left;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;" title="${label}">${label}</div>
                    <div style="flex:1;height:12px;background:#f1f3f5;border-radius:6px;overflow:hidden;">
                        <div style="width:${(val / max * 100)}%;height:100%;background:linear-gradient(90deg,${color}cc,${color});border-radius:6px;transition:width 0.8s cubic-bezier(0.4,0,0.2,1);"></div>
                    </div>
                    <div style="width:22px;min-width:22px;font-size:0.71rem;color:#2c3e50;font-weight:bold;text-align:right;">${val}</div>
                </div>`;

            const renderGroup = (containerId, entries, colors) => {
                const el = document.getElementById(containerId);
                if (!el) return;
                if (!entries.length) {
                    el.innerHTML = '<div style="padding:20px;text-align:center;color:#bbb;font-size:0.78rem;">Không có dữ liệu</div>';
                    return;
                }
                const max = entries[0][1] || 1;
                el.innerHTML = entries.map((e, i) => barRow(e[0], e[1], max, colors[i % colors.length])).join('');
            };

            renderGroup('staffLoadChart-bs',   Object.entries(staffLoadBS).sort((a,b)=>b[1]-a[1]).slice(0,10),   colorsBS);
            renderGroup('staffLoadChart-ktv',  Object.entries(staffLoadKTV).sort((a,b)=>b[1]-a[1]).slice(0,10),  colorsKTV);
            renderGroup('procDistChart-yhct',  Object.entries(procCountYHCT).sort((a,b)=>b[1]-a[1]).slice(0,10), colorsYHCT);
            renderGroup('procDistChart-phcn',  Object.entries(procCountPHCN).sort((a,b)=>b[1]-a[1]).slice(0,10), colorsPHCN);

        }

        function refreshDashboard() {

            const picker = document.getElementById('dashboard-date-filter');

            if (picker) {
                const t = new Date(); picker.value =

                    `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;

            }

            if (typeof loadDashboard === 'function') loadDashboard();

        }



        // ============================================================

        // ⏰ ĐỒNG HỒ

        // ============================================================

        function updateClock() {

            const now = new Date();

            const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

            const pad = n => String(n).padStart(2, '0');

            document.getElementById('clock-time').textContent =

                `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

            document.getElementById('clock-date').textContent =

                `${days[now.getDay()]},

                                                ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

        }

        updateClock(); setInterval(updateClock, 1000);



        // ============================================================

        // 💬 POPUP XÁCNHẬN / CẢNH BÁO

        // ============================================================

        let globalConfirmCallback = null;

        function showCustomConfirm(title, message, callback) {

            document.getElementById('confirm-title').innerText = title;

            document.getElementById('confirm-message').innerHTML = message;

            globalConfirmCallback = callback;

            document.getElementById('custom-confirm-modal').style.display = 'flex';

        }

        function showCustomAlert(title, message, icon = '💡', btnColor = '#3498db') {

            const iconEl = document.getElementById('gca-icon');
            const titleEl = document.getElementById('gca-title');
            const msgEl = document.getElementById('gca-message');
            const btn = document.querySelector("#global-custom-alert button");

            // Xóa badge phụ cũ nếu có
            const oldBadge = document.getElementById('gca-success-badge');
            if (oldBadge) oldBadge.remove();

            const isSucc = (btnColor === '#27ae60' || btnColor === '#2ecc71' || btnColor === '#00b894')
                || (typeof title === 'string' && title.toLowerCase().includes('thành công'))
                || (typeof message === 'string' && message.toLowerCase().includes('thành công') && !title.toLowerCase().includes('lỗi'));

            if (isSucc) {
                if (iconEl) iconEl.innerText = '✅';
                if (titleEl) {
                    titleEl.innerText = 'Thành công';
                    titleEl.style.fontSize = '24px';
                    titleEl.style.color = '#27ae60';
                    titleEl.style.fontWeight = 'bold';
                    titleEl.style.margin = '10px 0 20px 0';
                }
                if (msgEl) msgEl.style.display = 'none';
                if (btn) btn.style.backgroundColor = '#27ae60';
            } else {
                if (iconEl) iconEl.innerText = icon;
                if (titleEl) {
                    titleEl.innerText = title;
                    titleEl.style.fontSize = '20px';
                    titleEl.style.color = '#333';
                    titleEl.style.fontWeight = 'bold';
                    titleEl.style.margin = '0 0 10px 0';
                }
                if (msgEl) {
                    msgEl.style.display = 'block';
                    msgEl.innerHTML = message;
                }
                if (btn) btn.style.backgroundColor = btnColor;
            }

            document.getElementById('global-custom-alert').style.display = 'flex';

        }

        document.getElementById('confirm-ok-btn').onclick = function () {

            if (globalConfirmCallback) globalConfirmCallback();

            document.getElementById('custom-confirm-modal').style.display = 'none';

        };

        document.addEventListener('keydown', function (event) {

            const confirmModal = document.getElementById('custom-confirm-modal');

            const alertModal = document.getElementById('global-custom-alert');

            const successModal = document.getElementById('custom-success-popup');

            if (confirmModal?.style.display === 'flex') {

                if (event.key === 'Enter') {
                    event.preventDefault();

                    document.getElementById('confirm-ok-btn').click();
                }

                else if (event.key === 'Escape') {
                    event.preventDefault();

                    confirmModal.style.display = 'none';
                }

                return;

            }

            if (alertModal?.style.display === 'flex') {

                if (event.key === 'Enter' || event.key === 'Escape') {

                    event.preventDefault(); alertModal.style.display = 'none';
                }

                return;

            }

            if (successModal && (successModal.style.display === 'flex' ||

                successModal.style.display === 'block')) {

                if (event.key === 'Enter' || event.key === 'Escape') {

                    event.preventDefault(); successModal.style.display = 'none';
                }

                return; // Nếu popup thành công đang mở thì chỉ đóng popup, không lưu form

            }



            // ⚠️ ĐÃ XÓA: Xử lý Enter tự động click nút Lưu/Thêm được
            // xử lý tập trung tại listener ở trên (~dòng 7261)
            // để tránh savePatient() bị gọi 2 lần gây trùng dữ liệu.

        });




        function checkUnclosedDay() {
            const d = new Date();
            const safeTodayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (window._systemActiveYMD && window._systemActiveYMD < safeTodayStr) {
                const displayOldDate = window._systemActiveYMD.split('-').reverse().join('/');
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert("⚠️ CHƯA CHỐT SỔ NGÀY CŨ",
                        "Hệ thống phát hiện dữ liệu ngày cũ (<b>" + displayOldDate + "</b>) chưa được chốt sổ!<br><br>" +
                        "Để tránh mất mát và xung đột dữ liệu, toàn bộ thao tác chỉnh sửa bệnh nhân, giờ bận, và giờ ra viện đã bị khóa.<br><br>" +
                        "Vui lòng thực hiện <b>Chốt sổ</b> ngày cũ trước khi tiếp tục thao tác dữ liệu.",
                        "⚠️", "#e74c3c");
                } else {
                    alert("⚠️ CHƯA CHỐT SỔ NGÀY CŨ\n\nHệ thống phát hiện ngày cũ (" + displayOldDate + ") chưa được chốt sổ!\n\nVui lòng thực hiện Chốt sổ trước khi tiếp tục.");
                }
                return true;
            }
            return false;
        }


        // TỐI ƯU UX 2: Tự động định dạng Giờ và Ngày khi gõ tắt (0830 -> 08:30)

        document.addEventListener('focusout', function (e) {

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

        document.addEventListener('dblclick', function (e) {

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

        document.addEventListener('DOMContentLoaded', function () {

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

                tab.addEventListener('click', function (e) {

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

                if (targetTab === 'tab-chamcong') {

                    if (typeof loadChamCongData === 'function') loadChamCongData();

                }

                if (targetTab === 'tab-thongke') {

                    if (typeof loadThongKeData === 'function') loadThongKeData();

                }

                if ((targetTab === 'tab-staff' || targetTab === 'tab-patients') && typeof renderProcedureCheckboxes === 'function') {

                    renderProcedureCheckboxes();

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
            loadSystemSettings();

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

        // ============================================================
        // ✅ KIỂM TRA LỖI HIS
        // ============================================================

        function initErrorChecker() {
            const fileInput = document.getElementById('error-file-input');
            if (!fileInput) return;
            
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) {
                    return;
                }

                if (window.showGlobalLoading) window.showGlobalLoading('Đang phân tích file HIS...');

                const reader = new FileReader();
                reader.onload = function (ev) {
                    try {
                        const data = new Uint8Array(ev.target.result);
                        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        
                        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
                        let headerRowIndex = 0;
                        for (let i = 0; i < Math.min(rawData.length, 50); i++) {
                            const row = rawData[i];
                            if (row.includes("STT") || row.includes("NAME") || row.includes("MABN")) {
                                headerRowIndex = i;
                                break;
                            }
                        }
                        const dataRows = XLSX.utils.sheet_to_json(worksheet, { header: "A", range: headerRowIndex, defval: "" });
                        processErrorChecking(dataRows);
                        if (window.hideGlobalLoading) window.hideGlobalLoading();
                    } catch (err) {
                        if (window.hideGlobalLoading) window.hideGlobalLoading();
                        console.error(err);
                        alert("Lỗi khi đọc file. Vui lòng kiểm tra lại cấu trúc form.");
                        timeTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Chưa tải dữ liệu</td></tr>';
                        otherTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Chưa tải dữ liệu</td></tr>';
                    }
                };
                reader.readAsArrayBuffer(file);
            });
        }

        function normalizeTextJS(text) {
            if (!text || typeof text !== 'string') return '';
            return text.normalize('NFC').trim().toLowerCase();
        }

        function getShortNameJS(fullName) {
            const lowerName = normalizeTextJS(fullName);
            if (!lowerName) return '';
            
            for (const s of dataCache.staff) {
                const tenHIS = String(s.tenHis || '').toLowerCase();
                if (!tenHIS) continue;
                const keys = tenHIS.split(',').map(k => k.trim()).filter(k => k);
                for (const k of keys) {
                    if (lowerName.includes(k)) return s.ten;
                }
            }
            return String(fullName).trim();
        }

        function mapProcedureJS(procStr) {
            const procStrLower = normalizeTextJS(procStr);
            for (const p of dataCache.proc) {
                const ten = String(p.ten || '').toLowerCase();
                const vietTat = String(p.vietTat || '').toLowerCase();
                if (ten && procStrLower.includes(ten)) return p;
                if (vietTat && procStrLower === vietTat) return p;
            }
            return null;
        }

        function checkPermissionJS(techName, procInfo) {
            const staff = dataCache.staff.find(s => s.ten === techName);
            if (!staff) return true;
            if (!procInfo) return true;
            
            const staffQuyen = staff.quyen || 'Cả hai';
            if (staffQuyen === 'Cả hai') return true;
            
            const procSystem = procInfo.he || 'PHCN';
            return staffQuyen === procSystem;
        }

        function convertExcelDateToJSDate(serial) {
            if (!serial) return null;
            if (typeof serial === 'string') {
                const s = serial.trim();
                const match1 = s.match(/^(\d{1,2}):(\d{1,2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                if (match1) return new Date(parseInt(match1[5]), parseInt(match1[4]) - 1, parseInt(match1[3]), parseInt(match1[1]), parseInt(match1[2]), 0, 0);
                const match2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})/);
                if (match2) return new Date(parseInt(match2[3]), parseInt(match2[2]) - 1, parseInt(match2[1]), parseInt(match2[4]), parseInt(match2[5]), 0, 0);
                const dateObj = new Date(s);
                if (!isNaN(dateObj.getTime())) return dateObj;
                const parts = s.match(/(\d+):(\d+)/);
                if (parts) {
                     const d = new Date(1900, 0, 1);
                     d.setHours(parseInt(parts[1]), parseInt(parts[2]), 0, 0);
                     return d;
                }
                return null;
            }
            if (serial instanceof Date) return serial;
            const utc_days = Math.floor(serial - 25569);
            const utc_value = utc_days * 86400; 
            const date_info = new Date(utc_value * 1000);
            const fractional_day = serial - Math.floor(serial) + 0.0000001;
            let total_seconds = Math.floor(86400 * fractional_day);
            const seconds = total_seconds % 60;
            total_seconds -= seconds;
            const hours = Math.floor(total_seconds / (60 * 60));
            const minutes = Math.floor(total_seconds / 60) % 60;
            date_info.setHours(hours, minutes, seconds, 0);
            return date_info;
        }

        function formatDate(date) {
            if (!date || isNaN(date.getTime())) return '';
            const h = String(date.getHours()).padStart(2, '0');
            const m = String(date.getMinutes()).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const mo = String(date.getMonth() + 1).padStart(2, '0');
            return `${h}:${m} (${d}/${mo})`;
        }

        function addOtherRow(tbody, stt, tech, patientAndProc, time, reason) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${stt}</td><td><strong>${tech}</strong></td><td>${patientAndProc}</td><td>${time}</td><td><span style="color:#d35400; font-weight:bold;">${reason}</span></td>`;
            tbody.appendChild(tr);
        }

        function addTimeRow(tbody, stt, tech, ca1Str, ca2Str, reason) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${stt}</td><td><strong>${tech}</strong></td><td>${ca1Str}</td><td>${ca2Str}</td><td><span style="color:#c0392b; font-weight:bold;">${reason}</span></td>`;
            tbody.appendChild(tr);
        }

        function processErrorChecking(dataRows) {
            const countBody = document.getElementById('count-body');
            const timeTbody = document.getElementById('error-time-body');
            const otherTbody = document.getElementById('error-other-body');
            if (countBody) countBody.innerHTML = '';
            timeTbody.innerHTML = '';
            otherTbody.innerHTML = '';

            const counts = {};
            dataCache.staff.forEach(s => {
                counts[s.ten] = { l2: 0, l3: 0, other: 0 };
            });

            let sttTime = 1;
            let sttOther = 1;

            const grouped = {};
            const validStaffNames = dataCache.staff.map(s => s.ten);

            for (let row of dataRows) {
                let techRaw = String(row['AT'] || '').trim();
                let techNorm = getShortNameJS(techRaw);

                if (techNorm && counts[techNorm]) {
                    const loai = String(row['AN'] || '').toLowerCase();
                    if (loai.includes('2')) counts[techNorm].l2++;
                    else if (loai.includes('3')) counts[techNorm].l3++;
                    else counts[techNorm].other++;
                }

                if (!row['AH'] || !row['L']) continue;
                
                let start = convertExcelDateToJSDate(row['AH']);
                let end = convertExcelDateToJSDate(row['L']);
                if (!start || isNaN(start.getTime()) || !end || isNaN(end.getTime())) continue;

                if (!techNorm) continue;
                
                if (!grouped[techNorm]) grouped[techNorm] = [];
                
                grouped[techNorm].push({
                    raw: row,
                    patientName: String(row['C'] || 'Không rõ'),
                    procName: String(row['AE'] || ''),
                    procMethod: String(row['AG'] || ''),
                    ptttStatus: String(row['AF'] || ''),
                    anesName: String(row['AS'] || ''),
                    techRaw: techRaw,
                    start: start,
                    end: end
                });
            }

            for (const [tech, groupRows] of Object.entries(grouped)) {
                groupRows.sort((a, b) => a.start - b.start);
                const fastRows = [];

                for (const row of groupRows) {
                    const procInfo = mapProcedureJS(row.procName);
                    const timeAStr = `${formatDate(row.start)} -> ${formatDate(row.end)}`;
                    
                    if (!validStaffNames.includes(tech)) {
                        addOtherRow(otherTbody, sttOther++, row.techRaw, `${row.patientName}<br/>${row.procName}`, timeAStr, "Sai tên nhân viên (Không có trong CSDL)");
                    }
                    
                    const status = String(row.ptttStatus).trim().toLowerCase();
                    if (status !== "chủ động" && status !== "nan" && status !== "") {
                        addOtherRow(otherTbody, sttOther++, tech, `${row.patientName}<br/>${row.procName}`, timeAStr, `Sai Tình hình PTTT: '${row.ptttStatus}' (Phải là Chủ động)`);
                    }
                    
                    const anes = String(row.anesName).trim().toLowerCase();
                    if (anes !== "khác" && anes !== "nan" && anes !== "") {
                        addOtherRow(otherTbody, sttOther++, tech, `${row.patientName}<br/>${row.procName}`, timeAStr, `Sai Vô cảm: '${row.anesName}' (Bắt buộc Khác)`);
                    }

                    if (normalizeTextJS(row.procName) !== normalizeTextJS(row.procMethod)) {
                        addOtherRow(otherTbody, sttOther++, tech, `${row.patientName}<br/>${row.procName}`, timeAStr, `Sai PP tiến hành: '${row.procMethod}' (Phải giống tên thủ thuật)`);
                    }

                    if (!procInfo) continue;

                    if (!checkPermissionJS(tech, procInfo)) {
                        addOtherRow(otherTbody, sttOther++, tech, `${row.patientName}<br/>${procInfo.ten}`, timeAStr, "Làm thủ thuật ngoài phạm vi phân quyền");
                    }
                    
                    const tth_mins = parseInt(procInfo.thoiGianThucHien) || 0;
                    const ttg_mins = parseInt(procInfo.thoiGianThuThuat) || 0;
                    const execEnd = new Date(row.start.getTime() + tth_mins * 60000);
                    
                    fastRows.push({
                        raw: row,
                        patientName: row.patientName,
                        info: procInfo,
                        start: row.start,
                        end: row.end,
                        execEnd: execEnd,
                        isCont: tth_mins === ttg_mins
                    });
                }

                const n = fastRows.length;
                for (let i = 0; i < n; i++) {
                    const A = fastRows[i];
                    const timeAStr = `${formatDate(A.start)} -> ${formatDate(A.end)}`;
                    for (let j = i + 1; j < n; j++) {
                        const B = fastRows[j];
                        if (B.start.getTime() > A.end.getTime()) break;
                        
                        let errorReason = "";
                        const aTc = A.info.ten === 'Thủy châm';
                        const bTc = B.info.ten === 'Thủy châm';
                        
                        const inExec = (s, pt, e) => (pt <= s && s < e);
                        const overlap = (s1, e1, s2, e2) => (Math.max(s1, s2) < Math.min(e1, e2));
                        
                        const bStart = B.start.getTime();
                        const bEnd = B.end.getTime();
                        const aStart = A.start.getTime();
                        const aEnd = A.end.getTime();
                        const aExecEnd = A.execEnd.getTime();
                        const bExecEnd = B.execEnd.getTime();

                        if (bStart === aStart) {
                            errorReason = "Trùng giờ bắt đầu";
                        } else if (bStart < aEnd) {
                            if (A.isCont) {
                                errorReason = `Lấn giờ (A làm liên tục ${A.info.thoiGianThucHien}p)`;
                            } else if (B.isCont) {
                                if (inExec(bStart, aEnd, bExecEnd)) errorReason = `B đè lên A (B làm liên tục ${B.info.thoiGianThucHien}p)`;
                            } else {
                                if (bStart < aExecEnd) errorReason = `B bắt đầu khi A chưa xong Thực Hiện (${A.info.thoiGianThucHien}p)`;
                                else if (aTc || bTc) {
                                    if (overlap(aEnd - 2 * 60000, aEnd, bStart, bExecEnd)) errorReason = `Rút kim A bị trùng lúc B đang Thực Hiện`;
                                }
                            }
                        }

                        if (errorReason) {
                            const timeBStr = `${formatDate(B.start)} -> ${formatDate(B.end)}`;
                            const ca1Info = `${A.patientName}<br/>${A.info.ten}<br/>${timeAStr}`;
                            const ca2Info = `${B.patientName}<br/>${B.info.ten}<br/>${timeBStr}`;
                            addTimeRow(timeTbody, sttTime++, tech, ca1Info, ca2Info, errorReason);
                        }
                    }
                }
            }

            if (timeTbody.children.length === 0) timeTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Không có lỗi trùng giờ! 🎉</td></tr>';
            if (otherTbody.children.length === 0) otherTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Không có lỗi phân quyền/quy trình! 🎉</td></tr>';

            if (countBody) {
                let countHtml = '';
                let t2 = 0, t3 = 0, to = 0;
                dataCache.staff.forEach(s => {
                    const c = counts[s.ten];
                    if (!c) return;
                    if (c.l2 === 0 && c.l3 === 0 && c.other === 0) return;
                    t2 += c.l2; t3 += c.l3; to += c.other;
                    countHtml += `<tr>
                        <td><strong>${s.ten}</strong></td>
                        <td style="text-align:center">${c.l2}</td>
                        <td style="text-align:center">${c.l3}</td>
                        <td style="text-align:center">${c.other}</td>
                    </tr>`;
                });
                countHtml += `<tr style="font-weight:bold; background:#eafaf1;">
                    <td>TỔNG CỘNG</td>
                    <td style="text-align:center">${t2}</td>
                    <td style="text-align:center">${t3}</td>
                    <td style="text-align:center">${to}</td>
                </tr>`;
                countBody.innerHTML = countHtml || '<tr><td colspan="4" style="text-align:center;">Chưa có dữ liệu thủ thuật</td></tr>';
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            initErrorChecker();
            setTimeout(() => {
                if (typeof window.checkBackupReminder === 'function') window.checkBackupReminder();
                if (typeof window.loadQuickLinks === 'function') window.loadQuickLinks();
            }, 1500);
        });

// ============================================================
// 📦 SAO LƯU & KHÔI PHỤC DỮ LIỆU CLOUDFLARE D1 (BACKUP & RESTORE)
// ============================================================

window.exportFullDatabaseBackup = function() {
    if (window.showGlobalLoading) window.showGlobalLoading("Đang xuất bản sao lưu toàn bộ Cloudflare D1...");
    callApi('exportDatabase', [], async data => {
        if (window.hideGlobalLoading) window.hideGlobalLoading();
        if (!data || !data.tables) {
            return showCustomAlert("Lỗi", "Không thể lấy dữ liệu sao lưu từ máy chủ!");
        }

        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10) + '_' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
        a.href = url;
        a.download = `PMCG_D1_Backup_FULL_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Tự động ghi vào thư mục máy tính đã kết nối (nếu có)
        const savedToLocalFolder = await window.autoSaveToLocalDir(data);

        localStorage.setItem('last_backup_timestamp', Date.now().toString());
        const extraMsg = savedToLocalFolder ? " (Đã tự động lưu 1 bản vào thư mục máy tính của bác sĩ)" : "";
        showCustomAlert("Thành công", `Đã tải về bản sao lưu dữ liệu toàn diện (phiên bản ${data.version || 'v3.6'})${extraMsg}!`);
    }, err => {
        if (window.hideGlobalLoading) window.hideGlobalLoading();
        showCustomAlert("Lỗi sao lưu", "Lỗi: " + (typeof err === 'string' ? err : JSON.stringify(err)));
    });
};

window.importFullDatabaseBackup = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backupData = JSON.parse(e.target.result);
            if (!backupData || !backupData.tables) {
                return showCustomAlert("Lỗi khôi phục", "File chọn không đúng định dạng sao lưu PM-XepLich!");
            }

            const tableNames = Object.keys(backupData.tables);
            let totalRows = 0;
            tableNames.forEach(t => { totalRows += (backupData.tables[t] || []).length; });

            const dateStr = backupData.exportDate ? new Date(backupData.exportDate).toLocaleString('vi-VN') : 'Không rõ';

            showCustomConfirm(
                "Xác Nhận Khôi Phục Dữ Liệu",
                `⚠️ BẠN CÓ CHẮC CHẮN MỐN KHÔI PHỤC DỮ LIỆU D1?\n\n` +
                `📅 Ngày sao lưu: ${dateStr}\n` +
                `📊 Tổng số bảng: ${tableNames.length} bảng\n` +
                `📋 Tổng số bản ghi: ${totalRows} dòng\n\n` +
                `LƯU Ý: Thao tác này sẽ ghi đè toàn bộ dữ liệu hiện tại bằng dữ liệu trong file sao lưu!`,
                function() {
                    if (window.showGlobalLoading) window.showGlobalLoading("Đang khôi phục cơ sở dữ liệu Cloudflare D1...");
                    callApi('importDatabase', [backupData], res => {
                        if (window.hideGlobalLoading) window.hideGlobalLoading();
                        showCustomAlert("Thành công", res.message || "Khôi phục dữ liệu thành công!");
                        setTimeout(() => { location.reload(); }, 1500);
                    }, err => {
                        if (window.hideGlobalLoading) window.hideGlobalLoading();
                        showCustomAlert("Lỗi khôi phục", "Không thể khôi phục dữ liệu: " + (typeof err === 'string' ? err : JSON.stringify(err)));
                    });
                }
            );
        } catch(err) {
            showCustomAlert("Lỗi đọc file", "File sao lưu bị hỏng hoặc không đúng chuẩn JSON: " + err.message);
        }
        event.target.value = '';
    };
    reader.readAsText(file);
};

window.onBackupScheduleUIChange = function() {
    const periodEl = document.getElementById('backup-reminder-period');
    const period = periodEl ? periodEl.value : 'none';
    const dowContainer = document.getElementById('backup-dow-container');
    const domContainer = document.getElementById('backup-dom-container');
    const timeContainer = document.getElementById('backup-time-container');

    if (period === 'none') {
        if (dowContainer) dowContainer.style.display = 'none';
        if (domContainer) domContainer.style.display = 'none';
        if (timeContainer) timeContainer.style.display = 'none';
    } else if (period === 'daily') {
        if (dowContainer) dowContainer.style.display = 'none';
        if (domContainer) domContainer.style.display = 'none';
        if (timeContainer) timeContainer.style.display = 'flex';
    } else if (period === 'weekly') {
        if (dowContainer) dowContainer.style.display = 'flex';
        if (domContainer) domContainer.style.display = 'none';
        if (timeContainer) timeContainer.style.display = 'flex';
    } else if (period === 'monthly') {
        if (dowContainer) dowContainer.style.display = 'none';
        if (domContainer) domContainer.style.display = 'flex';
        if (timeContainer) timeContainer.style.display = 'flex';
    }
};

window.saveBackupScheduleSettings = function() {
    const period = document.getElementById('backup-reminder-period').value;
    const time = document.getElementById('backup-reminder-time').value || '17:00';
    const dow = document.getElementById('backup-reminder-dow').value || '1';
    const dom = document.getElementById('backup-reminder-dom').value || '1';

    localStorage.setItem('backup_reminder_period', period);
    localStorage.setItem('backup_reminder_time', time);
    localStorage.setItem('backup_reminder_dow', dow);
    localStorage.setItem('backup_reminder_dom', dom);

    const configObj = { period, time, dow, dom };
    callApi('saveSystemSettings', ['backup_schedule_config', JSON.stringify(configObj)], null, null);

    showCustomAlert("Thành công", "Đã lưu cấu hình lịch tự động sao lưu & nhắc nhở thành công!");
};

window.checkBackupReminder = function() {
    const period = localStorage.getItem('backup_reminder_period') || 'none';
    const time = localStorage.getItem('backup_reminder_time') || '17:00';
    const dow = localStorage.getItem('backup_reminder_dow') || '1';
    const dom = localStorage.getItem('backup_reminder_dom') || '1';

    const periodEl = document.getElementById('backup-reminder-period');
    if (periodEl) periodEl.value = period;
    const timeEl = document.getElementById('backup-reminder-time');
    if (timeEl) timeEl.value = time;
    const dowEl = document.getElementById('backup-reminder-dow');
    if (dowEl) dowEl.value = dow;
    const domEl = document.getElementById('backup-reminder-dom');
    if (domEl) domEl.value = dom;

    if (typeof window.onBackupScheduleUIChange === 'function') window.onBackupScheduleUIChange();
    if (typeof window.loadGoogleDriveSettingsUI === 'function') window.loadGoogleDriveSettingsUI();

    if (period === 'none') return;

    const now = new Date();
    const currentDow = String(now.getDay()); // 0 = Sunday, 1 = Monday...
    const currentDom = String(now.getDate());
    const currentHourMin = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    let isTimeToBackup = false;
    if (period === 'daily') {
        isTimeToBackup = (currentHourMin >= time);
    } else if (period === 'weekly') {
        isTimeToBackup = (currentDow === dow && currentHourMin >= time);
    } else if (period === 'monthly') {
        if (dom === 'last') {
            const isLastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate();
            isTimeToBackup = (isLastDay && currentHourMin >= time);
        } else {
            isTimeToBackup = (currentDom === dom && currentHourMin >= time);
        }
    }

    const todayYMD = now.toISOString().slice(0, 10);
    const lastDoneDate = localStorage.getItem('last_backup_done_date') || '';

    if (isTimeToBackup && lastDoneDate !== todayYMD) {
        localStorage.setItem('last_backup_done_date', todayYMD);
        
        callApi('exportDatabase', [], async data => {
            if (data && data.tables) {
                await window.autoSaveToLocalDir(data);
            }
        });

        setTimeout(() => {
            const toast = document.createElement('div');
            toast.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#1e293b; color:#fff; padding:16px 20px; border-radius:8px; z-index:99999; box-shadow:0 10px 25px rgba(0,0,0,0.3); font-size:13px; display:flex; align-items:center; gap:12px; border-left:4px solid #10b981;';
            toast.innerHTML = `
                <div>
                    <strong style="display:block; color:#34d399; font-size:14px;">⏰ Đến lịch sao lưu dữ liệu (${time})</strong>
                    <span>Hệ thống đã tự động sao lưu dữ liệu D1 theo lịch chọn!</span>
                </div>
                <button onclick="exportFullDatabaseBackup(); this.parentElement.remove();" style="padding:6px 14px; background:#059669; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Tải về bản sao (.json)</button>
                <span onclick="this.parentElement.remove();" style="cursor:pointer; color:#94a3b8; font-weight:bold; font-size:16px;">✕</span>
            `;
            document.body.appendChild(toast);
        }, 2000);
    }
};

// ============================================================
// 📁 LƯU TỰ ĐỘNG THƯ MỤC MÁY TÍNH & GOOGLE DRIVE
// ============================================================

const BK_IDB_NAME = 'pmcg_backup_idb';
const BK_STORE_NAME = 'backup_handles';

function getBackupIDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(BK_IDB_NAME, 1);
        req.onupgradeneeded = e => e.target.result.createObjectStore(BK_STORE_NAME);
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e);
    });
}

async function setSavedDirHandle(handle) {
    const db = await getBackupIDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(BK_STORE_NAME, 'readwrite');
        tx.objectStore(BK_STORE_NAME).put(handle, 'backup_dir_handle');
        tx.oncomplete = () => resolve();
        tx.onerror = e => reject(e);
    });
}

async function getSavedDirHandle() {
    try {
        const db = await getBackupIDB();
        return new Promise((resolve) => {
            const tx = db.transaction(BK_STORE_NAME, 'readonly');
            const req = tx.objectStore(BK_STORE_NAME).get('backup_dir_handle');
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch(e) { return null; }
}

window.selectLocalBackupDirectory = async function() {
    if (!('showDirectoryPicker' in window)) {
        return showCustomAlert("Trình duyệt không hỗ trợ", "Trình duyệt của bác sĩ chưa hỗ trợ chọn thư mục lưu tự động. Vui lòng dùng Chrome, Edge hoặc Brave mới nhất!");
    }
    try {
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
        await setSavedDirHandle(handle);
        const displayEl = document.getElementById('local-dir-path-display');
        if (displayEl) displayEl.innerText = "📁 Đã chọn: " + handle.name;
        showCustomAlert("Thành công", `Đã kết nối thư mục [${handle.name}]! Từ giờ khi bấm sao lưu, hệ thống sẽ tự ghi file thẳng vào thư mục này mà không cần hỏi 'Save As'.`);
    } catch(err) {
        if (err.name !== 'AbortError') showCustomAlert("Lỗi", "Không thể chọn thư mục: " + err.message);
    }
};

window.autoSaveToLocalDir = async function(backupData) {
    const handle = await getSavedDirHandle();
    if (!handle) return false;

    try {
        let perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
            perm = await handle.requestPermission({ mode: 'readwrite' });
        }
        if (perm !== 'granted') return false;

        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10) + '_' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
        const filename = `PMCG_D1_Backup_AUTO_${dateStr}.json`;

        const fileHandle = await handle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(backupData, null, 2));
        await writable.close();
        return true;
    } catch(e) {
        console.warn("[AutoSaveLocal] Lỗi lưu file vào thư mục:", e);
        return false;
    }
};

window.saveGoogleDriveSettingsUI = function() {
    const urlInput = document.getElementById('gdrive-webhook-url');
    const url = urlInput ? urlInput.value.trim() : "";
    if (url && !url.startsWith('http')) {
        return showCustomAlert("Lỗi", "URL Google Drive Webhook phải bắt đầu bằng http:// hoặc https://");
    }
    callApi('saveGoogleDriveSettings', [url], res => {
        showCustomAlert("Thành công", res.message || "Đã lưu cài đặt Google Drive Webhook!");
    }, err => {
        showCustomAlert("Lỗi", "Không thể lưu cài đặt: " + err);
    });
};

window.testGoogleDriveUploadUI = function() {
    const urlInput = document.getElementById('gdrive-webhook-url');
    const url = urlInput ? urlInput.value.trim() : "";
    if (!url || !url.startsWith('http')) {
        return showCustomAlert("Lỗi", "Vui lòng nhập URL Google Drive Webhook trước khi thử nghiệm!");
    }
    if (window.showGlobalLoading) window.showGlobalLoading("Đang đẩy file sao lưu thử nghiệm lên Google Drive...");
    callApi('testGoogleDriveUpload', [url], res => {
        if (window.hideGlobalLoading) window.hideGlobalLoading();
        showCustomAlert("Thành công", res.message || "Đã tải file sao lưu lên Google Drive thành công!");
    }, err => {
        if (window.hideGlobalLoading) window.hideGlobalLoading();
        showCustomAlert("Lỗi Google Drive", "Không thể tải lên Google Drive: " + err);
    });
};

window.loadGoogleDriveSettingsUI = function() {
    callApi('getGoogleDriveSettings', [], url => {
        const urlInput = document.getElementById('gdrive-webhook-url');
        if (urlInput && url) urlInput.value = url;
    }, null);

    getSavedDirHandle().then(handle => {
        if (handle) {
            const displayEl = document.getElementById('local-dir-path-display');
            if (displayEl) displayEl.innerText = "📁 Đã chọn: " + handle.name;
        }
    });
};

// ============================================================
// 🔗 QUẢN LÝ LIÊN KẾT NHANH (FOOTER QUICK LINKS)
// ============================================================

window.loadQuickLinks = function() {
    callApi('getQuickLinks', [], links => {
        const uls = document.querySelectorAll('.khu-vuc-lien-ket');
        if (uls.length) {
            if (links && Array.isArray(links) && links.length) {
                const htmlContent = links.map(item => 
                    `<li><a href="${item.url || '#'}" target="_blank" rel="noopener"><span class="f-icon">${item.icon || '🔗'}</span> <span>${item.ten || item.name}</span></a></li>`
                ).join('');
                uls.forEach(ul => { ul.innerHTML = htmlContent; });
            } else {
                uls.forEach(ul => { ul.innerHTML = '<li><a href="#"><span class="f-icon">⚠️</span> Chưa có liên kết nào</a></li>'; });
            }
        }
        window.renderAdminQuickLinksUI(links);
    }, err => {
        console.warn("[QuickLinks] Lỗi tải danh sách liên kết:", err);
    });
};

window.renderAdminQuickLinksUI = function(links) {
    const container = document.getElementById('admin-quicklinks-list');
    if (!container) return;
    container.innerHTML = '';

    const list = (links && Array.isArray(links) && links.length) ? links : [
        { icon: "📖", ten: "Hướng dẫn sử dụng phần mềm", url: "#" },
        { icon: "📋", ten: "Quy trình Kỹ thuật PHCN", url: "#" },
        { icon: "💰", ten: "Bảng giá Dịch vụ KCB", url: "#" }
    ];

    list.forEach(item => {
        const div = document.createElement('div');
        div.className = 'quicklink-admin-item';
        div.style.cssText = 'display: flex; gap: 8px; align-items: center; background: #fff; padding: 6px; border-radius: 4px; border: 1px solid #cbd5e1;';
        div.innerHTML = `
            <input type="text" value="${item.icon || '🔗'}" class="ql-icon" placeholder="Icon" style="width: 45px; text-align: center; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px;">
            <input type="text" value="${item.ten || item.name || ''}" class="ql-ten" placeholder="Tên hiển thị" style="flex: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px;">
            <input type="text" value="${item.url || '#'}" class="ql-url" placeholder="URL liên kết (http://...)" style="flex: 2; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px;">
            <button type="button" onclick="this.parentElement.remove()" style="background: #ef4444; color: #fff; border: none; padding: 6px 10px; border-radius: 4px; font-weight: bold; cursor: pointer;">✕</button>
        `;
        container.appendChild(div);
    });
};

window.addAdminQuickLinkRow = function() {
    const container = document.getElementById('admin-quicklinks-list');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'quicklink-admin-item';
    div.style.cssText = 'display: flex; gap: 8px; align-items: center; background: #fff; padding: 6px; border-radius: 4px; border: 1px solid #cbd5e1;';
    div.innerHTML = `
        <input type="text" value="🔗" class="ql-icon" placeholder="Icon" style="width: 45px; text-align: center; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px;">
        <input type="text" value="" class="ql-ten" placeholder="Tên hiển thị" style="flex: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px;">
        <input type="text" value="#" class="ql-url" placeholder="URL liên kết (http://...)" style="flex: 2; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px;">
        <button type="button" onclick="this.parentElement.remove()" style="background: #ef4444; color: #fff; border: none; padding: 6px 10px; border-radius: 4px; font-weight: bold; cursor: pointer;">✕</button>
    `;
    container.appendChild(div);
};

window.saveAdminQuickLinks = function(btn) {
    const items = document.querySelectorAll('.quicklink-admin-item');
    const links = [];
    items.forEach(el => {
        const icon = el.querySelector('.ql-icon').value.trim() || '🔗';
        const ten = el.querySelector('.ql-ten').value.trim();
        const url = el.querySelector('.ql-url').value.trim() || '#';
        if (ten) {
            links.push({ icon, ten, url });
        }
    });

    callApi('saveQuickLinks', [links], res => {
        showCustomAlert("Thành công", res.message || "Đã lưu danh sách Liên Kết Nhanh!");
        loadQuickLinks();
    }, err => {
        showCustomAlert("Lỗi", "Không thể lưu danh sách liên kết: " + err);
    });
};