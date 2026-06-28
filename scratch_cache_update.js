
const fs = require('fs');
let text = fs.readFileSync('d:\\PM-DPT\\PM-xeplich\\khung_pm\\ban_web\\v2-github\\index.html', 'utf8');

const targetStr = `                google.script.run.withSuccessHandler(data => {
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
                }).withFailureHandler(err => {
                    console.error("Lỗi tải lịch sử Dashboard: " + err);
                }).getHistoryFullData(selectedDate);`

if (text.replace(/\r/g, '').includes(targetStr.replace(/\r/g, ''))) {
    // Exact match failed but we can replace based on boundaries
    const startIdx = text.indexOf("google.script.run.withSuccessHandler(data => {");
    if (startIdx > -1) {
        // Find the matching getHistoryFullData
        const endStr = "}).getHistoryFullData(selectedDate);";
        const endIdx = text.indexOf(endStr, startIdx);
        if (endIdx > -1) {
            const toReplace = text.substring(startIdx, endIdx + endStr.length);
            text = text.replace(toReplace, `                const processHistoryData = (data) => {
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
                }`);
            fs.writeFileSync('d:\\PM-DPT\\PM-xeplich\\khung_pm\\ban_web\\v2-github\\index.html', text, 'utf8');
            console.log("✅ loadDashboard cached part updated!");
        }
    }
} else {
    console.log("❌ string not found");
}
