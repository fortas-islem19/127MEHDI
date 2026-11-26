/**
 * Almes & Racim Toys — استقبال طلبات صفحة الهبوط في Google Sheets
 *
 * طريقة الاستعمال (التفاصيل في README.md):
 *   1) افتح Google Sheet ← الإضافات (Extensions) ← Apps Script
 *   2) احذف الكود الموجود والصق هذا الملف كاملاً ← حفظ
 *   3) نشر (Deploy) ← عملية نشر جديدة ← تطبيق ويب
 *      تنفيذ باسم: أنا  |  من يمكنه الوصول: أي شخص (Anyone)
 *   4) انسخ رابط تطبيق الويب (ينتهي بـ /exec) وضعه في config.js ← GOOGLE_SHEET_URL
 */

const SHEET_NAME = 'الطلبات';

// [عنوان العمود في الجدول, اسم الحقل القادم من الصفحة]
const COLUMNS = [
  ['التاريخ', null],
  ['رقم الطلب', 'orderId'],
  ['المنتج', 'product'],
  ['الاسم', 'name'],
  ['الهاتف', 'phone'],
  ['الولاية', 'wilaya'],
  ['البلدية', 'commune'],
  ['التوصيل', 'delivery'],
  ['الكمية', 'quantity'],
  ['سعر التوصيل', 'shipping'],
  ['المجموع', 'total'],
  ['ملاحظة', 'note'],
  ['المصدر', 'source'],
  ['الحالة', null]
];

// يستقبل الطلب من الصفحة ويضيفه كسطر جديد
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // يمنع تداخل طلبين في نفس اللحظة
  try {
    const sheet = getSheet_();
    const p = (e && e.parameter) || {};
    const row = COLUMNS.map(function (col) {
      const title = col[0], key = col[1];
      if (title === 'التاريخ') return new Date();
      if (title === 'الحالة') return 'جديد';
      if (key === 'phone') return "'" + clean_(p.phone); // يحافظ على الصفر في بداية الرقم
      return clean_(p[key]);
    });
    sheet.appendRow(row);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// افتح رابط /exec في المتصفح: إذا ظهرت هذه الرسالة فالسكريبت يعمل
function doGet() {
  return ContentService.createTextOutput('✅ Almes & Racim Toys — السكريبت يعمل ويستقبل الطلبات');
}

// للتجربة من محرر السكريبت: اختر testOrder من القائمة ثم اضغط "تشغيل" (Run)
function testOrder() {
  doPost({
    parameter: {
      orderId: 'TEST-1', product: 'البوكس البنفسجي', name: 'طلب تجريبي', phone: '0555123456',
      wilaya: '16 - الجزائر', commune: 'باب الزوار', delivery: 'المنزل', quantity: '1',
      shipping: '800', total: '7700', note: 'احذف هذا السطر', source: 'test'
    }
  });
}

/* ---------------- أدوات داخلية ---------------- */

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    const headers = COLUMNS.map(function (c) { return c[0]; });
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold').setBackground('#f43f8e').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setRightToLeft(true);
    // قائمة منسدلة لعمود "الحالة"
    const statusCol = headers.indexOf('الحالة') + 1;
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['جديد', 'مؤكد', 'لم يرد', 'ملغى', 'تم الإرسال', 'تم التوصيل', 'مرتجع'], true)
      .setAllowInvalid(true).build();
    sheet.getRange(2, statusCol, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
  }
  return sheet;
}

// ينظف النص ويمنع تنفيذ الصيغ (=...) التي قد يكتبها شخص في الفورم
function clean_(v) {
  v = v == null ? '' : String(v).trim().slice(0, 500);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
