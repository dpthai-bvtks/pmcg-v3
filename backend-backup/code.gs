/**
 * GOOGLE APPS SCRIPT BACKUP SERVER CHO XEPLICHTHUTHUAT V3 (BẢN V3.1.5)
 * Máy chủ dự phòng 100% tự động khi Cloudflare Worker + D1 gặp sự cố 500 / Overload.
 * Đóng vai trò làm Mirror API đọc/ghi vào Google Sheets.
 */

function doGet(e) {
  var params = e ? e.parameter : {};
  var callback = params.callback;
  var action = params.action;
  var args = [];
  try { if (params.args) args = JSON.parse(params.args); } catch(err) {}

  var result = handleApiRequest(action, args);
  var jsonString = JSON.stringify(result);

  if (callback) {
    return ContentService.createTextOutput(callback + '(' + jsonString + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(jsonString)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var postData = {};
  try { postData = JSON.parse(e.postData.contents); } catch(err) {}
  var action = postData.action || '';
  var args = postData.args || [];

  var result = handleApiRequest(action, args);
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleApiRequest(action, args) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return { status: 'error', error: 'Không thể kết nối Google Sheets' };

    switch (action) {
      case 'ping':
      case 'healthCheck':
        return { status: 'success', data: { mode: 'backup_gss', server: 'Google Apps Script Mirror', timestamp: new Date().toISOString() } };

      case 'getBootstrapData':
        return { status: 'success', data: getBootstrapDataFromSheets(ss, args[0]) };

      case 'loadAccounts':
        return { status: 'success', data: readSheetData(ss, 'TaiKhoan') };

      case 'saveSchedule':
        saveScheduleToSheet(ss, args[0], args[1]);
        return { status: 'success', data: 'Đã lưu lịch dự phòng vào Google Sheets' };

      case 'addBenhNhan':
      case 'editBenhNhan':
        addOrUpdateRow(ss, 'BenhNhan', args[0]);
        return { status: 'success', data: 'Đã cập nhật bệnh nhân trên Google Sheets' };

      case 'deleteBenhNhan':
        deleteRowByName(ss, 'BenhNhan', args[0]);
        return { status: 'success', data: 'Đã xóa bệnh nhân khỏi Google Sheets' };

      case 'bulkUpdateBenhNhan':
        if (Array.isArray(args[0])) {
          for (var b = 0; b < args[0].length; b++) {
            addOrUpdateRow(ss, 'BenhNhan', args[0][b]);
          }
        }
        return { status: 'success', data: 'Đã cập nhật danh sách bệnh nhân' };

      case 'saveGioBan':
        addOrUpdateRow(ss, 'GioBanCu', { date: args[0], staff_name: args[1], busy_ranges: typeof args[2] === 'object' ? JSON.stringify(args[2]) : args[2] });
        return { status: 'success', data: 'Đã lưu giờ bận vào Google Sheets' };

      case 'chotSo':
      case 'chuyenNgayMoi':
        return { status: 'success', data: 'Đã chốt sổ' };

      case 'saveChamCong':
        addOrUpdateRow(ss, 'ChamCong', { month_year: args[0], data_json: typeof args[1] === 'object' ? JSON.stringify(args[1]) : args[1] });
        return { status: 'success', data: 'Đã lưu Chấm công' };

      case 'getChamCong':
        return { status: 'success', data: readSheetData(ss, 'ChamCong') };

      case 'addNhanSu':
      case 'editNhanSu':
        addOrUpdateRow(ss, 'NhanSu', args[0]);
        return { status: 'success', data: 'Đã cập nhật nhân sự' };

      case 'deleteNhanSu':
        deleteRowByName(ss, 'NhanSu', args[0]);
        return { status: 'success', data: 'Đã xóa nhân sự' };

      case 'addPhong':
      case 'editPhong':
        addOrUpdateRow(ss, 'Phong', args[0]);
        return { status: 'success', data: 'Đã cập nhật phòng' };

      case 'deletePhong':
        deleteRowByName(ss, 'Phong', args[0]);
        return { status: 'success', data: 'Đã xóa phòng' };

      case 'addMayMoc':
      case 'editMayMoc':
        addOrUpdateRow(ss, 'MayMoc', args[0]);
        return { status: 'success', data: 'Đã cập nhật máy móc' };

      case 'deleteMayMoc':
        deleteRowByName(ss, 'MayMoc', args[0]);
        return { status: 'success', data: 'Đã xóa máy móc' };

      case 'addThuThuat':
      case 'editThuThuat':
        addOrUpdateRow(ss, 'ThuThuat', args[0]);
        return { status: 'success', data: 'Đã cập nhật thủ thuật' };

      case 'deleteThuThuat':
        deleteRowByName(ss, 'ThuThuat', args[0]);
        return { status: 'success', data: 'Đã xóa thủ thuật' };

      case 'saveBootstrapBackup':
        saveAllBootstrapToSheets(ss, args[0]);
        return { status: 'success', data: 'Đã đồng bộ toàn bộ dữ liệu sang Google Sheets thành công!' };

      default:
        return { status: 'error', error: 'Hành động không hợp lệ: ' + action };
    }
  } catch (err) {
    return { status: 'error', error: 'Backup Error: ' + err.toString() };
  }
}

function getBootstrapDataFromSheets(ss, dateVal) {
  return {
    pat: readSheetData(ss, 'BenhNhan'),
    staff: readSheetData(ss, 'NhanSu'),
    machines: readSheetData(ss, 'MayMoc'),
    rooms: readSheetData(ss, 'Phong'),
    procedures: readSheetData(ss, 'ThuThuat'),
    schedule: readSheetData(ss, 'LichTrinh'),
    history: readSheetData(ss, 'LichSu'),
    lich_su: readSheetData(ss, 'LichSu'),
    serverTime: new Date().toISOString()
  };
}

function readSheetData(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  var headers = values[0];
  var list = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var h = 0; h < headers.length; h++) {
      obj[headers[h]] = row[h];
    }
    list.push(obj);
  }
  return list;
}

function addOrUpdateRow(ss, sheetName, dataObj) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var keys = Object.keys(dataObj);
    sheet.appendRow(keys);
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = [];
  for (var h = 0; h < headers.length; h++) {
    row.push(dataObj[headers[h]] || '');
  }
  sheet.appendRow(row);
}

function deleteRowByName(ss, sheetName, nameVal) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  var values = sheet.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]).toLowerCase().trim() === String(nameVal).toLowerCase().trim()) {
      sheet.deleteRow(i + 1);
    }
  }
}

function saveScheduleToSheet(ss, dateVal, schedList) {
  var sheet = ss.getSheetByName('LichTrinh');
  if (!sheet) {
    sheet = ss.insertSheet('LichTrinh');
    sheet.appendRow(['Ngay', 'TenBN', 'NamSinh', 'Phong', 'ThuThuat', 'GioDienRa', 'GioKetThuc', 'NVChinh', 'NVPhu', 'May', 'Giuong']);
  }
  if (Array.isArray(schedList) && schedList.length > 0) {
    var matrix = [];
    for (var i = 0; i < schedList.length; i++) {
      matrix.push(schedList[i]);
    }
    sheet.getRange(sheet.getLastRow() + 1, 1, matrix.length, matrix[0].length).setValues(matrix);
  }
}

function saveAllBootstrapToSheets(ss, dataObj) {
  if (!dataObj) return;

  var pat = dataObj.pat || dataObj.benh_nhan || [];
  var staff = dataObj.staff || dataObj.nhan_su || [];
  var machines = dataObj.machines || dataObj.may_moc || [];
  var rooms = dataObj.rooms || dataObj.phong || [];
  var procs = dataObj.procedures || dataObj.thu_thuat || [];
  var sched = dataObj.schedule || dataObj.lich_trinh || [];
  var hist = dataObj.history || dataObj.lich_su || [];
  var accs = dataObj.accounts || dataObj.tai_khoan || [];
  var cc = dataObj.chamCong || dataObj.cham_cong || [];
  var tk = dataObj.thongKe || dataObj.thong_ke || [];
  var cd = dataObj.caiDat || dataObj.cai_dat || [];

  if (pat.length > 0) writeListToSheet(ss, 'BenhNhan', pat);
  if (staff.length > 0) writeListToSheet(ss, 'NhanSu', staff);
  if (machines.length > 0) writeListToSheet(ss, 'MayMoc', machines);
  if (rooms.length > 0) writeListToSheet(ss, 'Phong', rooms);
  if (procs.length > 0) writeListToSheet(ss, 'ThuThuat', procs);
  if (sched.length > 0) writeListToSheet(ss, 'LichTrinh', sched);
  if (hist.length > 0) writeListToSheet(ss, 'LichSu', hist);
  if (accs.length > 0) writeListToSheet(ss, 'TaiKhoan', accs);
  if (cc.length > 0) writeListToSheet(ss, 'ChamCong', Array.isArray(cc) ? cc : [cc]);
  if (tk.length > 0) writeListToSheet(ss, 'ThongKe', Array.isArray(tk) ? tk : [tk]);
  if (cd.length > 0) writeListToSheet(ss, 'CaiDat', Array.isArray(cd) ? cd : [cd]);
}

function writeListToSheet(ss, sheetName, list) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  else sheet.clearContents();

  if (!list || list.length === 0) return;
  var firstItem = list[0];
  var matrix = [];
  
  if (!Array.isArray(firstItem) && typeof firstItem === 'object') {
    var headers = Object.keys(firstItem);
    matrix.push(headers);
    for (var i = 0; i < list.length; i++) {
      var item = list[i] || {};
      var row = [];
      for (var h = 0; h < headers.length; h++) {
        var val = item[headers[h]];
        if (val === null || val === undefined) val = '';
        else if (typeof val === 'object') val = JSON.stringify(val);
        row.push(val);
      }
      matrix.push(row);
    }
  } else if (Array.isArray(firstItem)) {
    for (var i = 0; i < list.length; i++) {
      matrix.push(list[i] || []);
    }
  }

  if (matrix.length > 0 && matrix[0].length > 0) {
    sheet.getRange(1, 1, matrix.length, matrix[0].length).setValues(matrix);
  }
}
