/**
 * Almes & Racim Toys — استقبال طلبات صفحة الهبوط في Google Sheets
 *                      + إرسال حدث الشراء إلى Meta (Conversions API)
 *
 * طريقة الاستعمال (التفاصيل في README.md):
 *   1) افتح Google Sheet ← الإضافات (Extensions) ← Apps Script
 *   2) احذف الكود الموجود والصق هذا الملف كاملاً ← حفظ
 *   3) نشر (Deploy) ← عملية نشر جديدة ← تطبيق ويب
 *      تنفيذ باسم: أنا  |  من يمكنه الوصول: أي شخص (Anyone)
 *   4) انسخ رابط تطبيق الويب (ينتهي بـ /exec) وضعه في config.js ← GOOGLE_SHEET_URL
 *
 * Conversions API (اختياري):
 *   ⚙️ إعدادات المشروع (Project Settings) ← خصائص النص البرمجي (Script properties) ← أضف:
 *      META_ACCESS_TOKEN      = رمز الوصول (Access Token) من Events Manager
 *      META_TEST_EVENT_CODE   = (اختياري، للتجربة فقط) كود "اختبار الأحداث" مثل TEST12345
 *   ⚠️ لا تكتب رمز الوصول داخل هذا الكود ولا في الصفحة.
 */

const SHEET_NAME = 'الطلبات';

// رقم البيكسل (ليس سراً)
const META_PIXEL_ID = '1192691266667753';
const META_API_VERSION = 'v23.0';
const META_CURRENCY = 'DZD';

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
  const p = (e && e.parameter) || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // يمنع تداخل طلبين في نفس اللحظة
  try {
    const sheet = getSheet_();
    const row = COLUMNS.map(function (col) {
      const title = col[0], key = col[1];
      if (title === 'التاريخ') return new Date();
      if (title === 'الحالة') return 'جديد';
      if (key === 'phone') return "'" + clean_(p.phone); // يحافظ على الصفر في بداية الرقم
      return clean_(p[key]);
    });
    sheet.appendRow(row);
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
  // بعد حفظ الطلب: إرسال الحدث إلى Meta (لا يوقف الطلب إذا فشل)
  let capi = 'skipped';
  try { capi = sendToMetaCapi_(p); } catch (err) { capi = 'error: ' + err; console.error('CAPI', err); }
  return json_({ ok: true, capi: capi });
}

// افتح رابط /exec في المتصفح: إذا ظهرت هذه الرسالة فالسكريبت يعمل
function doGet() {
  const capi = getProp_('META_ACCESS_TOKEN') ? '✅ Conversions API مفعّل' : '⚪ Conversions API غير مفعّل';
  return ContentService.createTextOutput('✅ Almes & Racim Toys — السكريبت يعمل ويستقبل الطلبات\n' + capi);
}

// للتجربة من محرر السكريبت: اختر testOrder من القائمة ثم اضغط "تشغيل" (Run)
// (الطلب التجريبي لا يُرسل إلى Meta)
function testOrder() {
  doPost({
    parameter: {
      orderId: 'TEST-1', product: 'البوكس البنفسجي', name: 'طلب تجريبي', phone: '0555123456',
      wilaya: '16 - الجزائر', commune: 'باب الزوار', delivery: 'المنزل', quantity: '1',
      shipping: '800', total: '7700', note: 'احذف هذا السطر', source: 'test'
    }
  });
}

// لتجربة Conversions API: ضع META_TEST_EVENT_CODE في خصائص النص البرمجي، ثم شغّل هذه الدالة
// وافتح Events Manager ← اختبار الأحداث (Test events). النتيجة تظهر في "سجل التنفيذ".
function testMetaCapi() {
  if (!getProp_('META_TEST_EVENT_CODE')) {
    throw new Error('أضف META_TEST_EVENT_CODE في خصائص النص البرمجي أولاً حتى لا يُحسب الحدث كشراء حقيقي');
  }
  const res = sendToMetaCapi_({
    orderId: 'CAPI-TEST-' + Date.now(), eventName: 'Purchase', productId: 'box-purple',
    product: 'البوكس البنفسجي', name: 'تجربة', phone: '0555123456', quantity: '1', total: '7700',
    ua: 'Mozilla/5.0 (Apps Script test)', url: 'https://example.com/'
  }, true);
  console.log(res);
}

/* ---------------- Meta Conversions API ---------------- */

function sendToMetaCapi_(p, force) {
  const token = getProp_('META_ACCESS_TOKEN');
  if (!token || !META_PIXEL_ID) return 'skipped: no token';
  if (!force && /^TEST/i.test(String(p.orderId || ''))) return 'skipped: test order';

  const phone = metaPhone_(p.phone);
  const parts = String(p.name || '').trim().toLowerCase().split(/\s+/).filter(String);
  const userData = { country: [sha256_('dz')] };
  if (phone) { userData.ph = [sha256_(phone)]; userData.external_id = [sha256_(phone)]; }
  if (parts[0]) userData.fn = [sha256_(parts[0])];
  if (parts.length > 1) userData.ln = [sha256_(parts.slice(1).join(' '))];
  if (p.fbp) userData.fbp = String(p.fbp);
  if (p.fbc) userData.fbc = String(p.fbc);
  if (p.ua) userData.client_user_agent = String(p.ua);

  const event = {
    event_name: p.eventName || 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: String(p.orderId || ''),           // نفس eventID في البيكسل ← لا يُحسب الشراء مرتين
    action_source: 'website',
    event_source_url: p.url || undefined,
    user_data: userData,
    custom_data: {
      currency: META_CURRENCY,
      value: Number(p.total) || 0,
      content_name: p.product || undefined,
      content_ids: p.productId ? [String(p.productId)] : undefined,
      content_type: 'product',
      num_items: Number(p.quantity) || 1
    }
  };
  const body = { data: [event] };
  const testCode = getProp_('META_TEST_EVENT_CODE');
  if (testCode) body.test_event_code = testCode;

  const url = 'https://graph.facebook.com/' + META_API_VERSION + '/' + META_PIXEL_ID +
    '/events?access_token=' + encodeURIComponent(token);
  const res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify(body), muteHttpExceptions: true
  });
  const out = res.getResponseCode() + ' ' + res.getContentText().slice(0, 300);
  if (res.getResponseCode() !== 200) console.error('CAPI', out); else console.log('CAPI', out);
  return out;
}

// 0555123456 ← 213555123456 (الصيغة التي يطلبها Meta)
function metaPhone_(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.indexOf('00213') === 0) d = d.slice(2);
  if (d.indexOf('213') !== 0 && d.indexOf('0') === 0) d = '213' + d.slice(1);
  return /^213\d{9}$/.test(d) ? d : '';
}

function sha256_(s) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function getProp_(k) {
  return PropertiesService.getScriptProperties().getProperty(k) || '';
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
