/* Almes & Racim Toys — منطق صفحة الهبوط (لا تحتاج لتعديل هذا الملف؛ عدّل config.js) */
(function () {
  'use strict';

  var C = window.CONFIG || {};
  var CUR = C.CURRENCY_LABEL || 'دج';
  var CURRENCY = C.CURRENCY || 'DZD';

  var WILAYAS = [
    ['01', 'أدرار'], ['02', 'الشلف'], ['03', 'الأغواط'], ['04', 'أم البواقي'], ['05', 'باتنة'],
    ['06', 'بجاية'], ['07', 'بسكرة'], ['08', 'بشار'], ['09', 'البليدة'], ['10', 'البويرة'],
    ['11', 'تمنراست'], ['12', 'تبسة'], ['13', 'تلمسان'], ['14', 'تيارت'], ['15', 'تيزي وزو'],
    ['16', 'الجزائر'], ['17', 'الجلفة'], ['18', 'جيجل'], ['19', 'سطيف'], ['20', 'سعيدة'],
    ['21', 'سكيكدة'], ['22', 'سيدي بلعباس'], ['23', 'عنابة'], ['24', 'قالمة'], ['25', 'قسنطينة'],
    ['26', 'المدية'], ['27', 'مستغانم'], ['28', 'المسيلة'], ['29', 'معسكر'], ['30', 'ورقلة'],
    ['31', 'وهران'], ['32', 'البيض'], ['33', 'إليزي'], ['34', 'برج بوعريريج'], ['35', 'بومرداس'],
    ['36', 'الطارف'], ['37', 'تندوف'], ['38', 'تيسمسيلت'], ['39', 'الوادي'], ['40', 'خنشلة'],
    ['41', 'سوق أهراس'], ['42', 'تيبازة'], ['43', 'ميلة'], ['44', 'عين الدفلى'], ['45', 'النعامة'],
    ['46', 'عين تموشنت'], ['47', 'غرداية'], ['48', 'غليزان'], ['49', 'تيميمون'], ['50', 'برج باجي مختار'],
    ['51', 'أولاد جلال'], ['52', 'بني عباس'], ['53', 'عين صالح'], ['54', 'عين قزام'], ['55', 'تقرت'],
    ['56', 'جانت'], ['57', 'المغير'], ['58', 'المنيعة']
  ];

  /* ---------------- helpers ---------------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function money(n) { return String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function priceText(n) { return money(n) + ' ' + CUR; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toLatinDigits(s) {
    return String(s)
      .replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x0660; })
      .replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 0x06F0; });
  }
  function normalizePhone(raw) {
    var p = toLatinDigits(raw).replace(/[^\d+]/g, '');
    if (p.indexOf('+213') === 0) p = '0' + p.slice(4);
    else if (p.indexOf('00213') === 0) p = '0' + p.slice(5);
    else if (p.indexOf('213') === 0 && p.length === 12) p = '0' + p.slice(3);
    else if (/^[567]\d{8}$/.test(p)) p = '0' + p;
    return p;
  }
  var PHONE_RE = /^0[567]\d{8}$/;
  function wilayaName(code) {
    for (var i = 0; i < WILAYAS.length; i++) if (WILAYAS[i][0] === code) return WILAYAS[i][1];
    return '';
  }
  function makeOrderId() {
    var t = Date.now().toString(36).toUpperCase().slice(-5);
    var r = Math.random().toString(36).slice(2, 5).toUpperCase();
    return 'AR-' + t + r;
  }

  /* ---------------- Facebook Pixel ---------------- */
  function pixelIds() {
    return (C.PIXEL_IDS || []).map(function (s) { return String(s).trim(); })
      .filter(function (s) { return /^\d{10,20}$/.test(s); });
  }
  function track(event, params, eventId) {
    if (typeof window.fbq !== 'function') return;
    try {
      if (eventId) window.fbq('track', event, params || {}, { eventID: eventId });
      else window.fbq('track', event, params || {});
    } catch (e) { /* ignore */ }
  }

  /* ---------------- Google Form ---------------- */
  var GF = C.GOOGLE_FORM || {};
  var GF_FIELDS = GF.FIELDS || {};
  function formId() {
    var v = String(GF.FORM_ID || '').trim();
    var m = v.match(/\/forms\/d\/e\/([^/?#]+)/);
    return m ? m[1] : v;
  }
  function entryKey(v) {
    v = String(v || '').trim();
    if (!v) return '';
    var m = v.match(/entry\.(\d+)/);
    if (m) return 'entry.' + m[1];
    return /^\d+$/.test(v) ? 'entry.' + v : '';
  }
  function isFormConfigured() {
    var id = formId();
    return !!(id && !/\/|\s/.test(id) && entryKey(GF_FIELDS.name) && entryKey(GF_FIELDS.phone));
  }
  function sendToGoogleForm(data) {
    var url = 'https://docs.google.com/forms/d/e/' + encodeURIComponent(formId()) + '/formResponse';
    var body = new URLSearchParams();
    Object.keys(GF_FIELDS).forEach(function (k) {
      var key = entryKey(GF_FIELDS[k]);
      if (key && data[k] !== undefined && data[k] !== null) body.append(key, String(data[k]));
    });
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
    // no-cors: جوجل لا تسمح بقراءة الرد، لكن الطلب يُسجَّل في الفورم
    return fetch(url, { method: 'POST', mode: 'no-cors', body: body, signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { clearTimeout(timer); return r; }, function (e) { clearTimeout(timer); throw e; });
  }

  /* ---------------- Google Sheets (Apps Script Web App) ---------------- */
  var SHEET_URL = String(C.GOOGLE_SHEET_URL || '').trim();
  function isSheetConfigured() {
    return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec\/?$/.test(SHEET_URL);
  }
  function sendToGoogleSheet(data) {
    var body = new URLSearchParams();
    Object.keys(data).forEach(function (k) {
      if (data[k] !== undefined && data[k] !== null) body.append(k, String(data[k]));
    });
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
    return fetch(SHEET_URL, { method: 'POST', mode: 'no-cors', body: body, signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { clearTimeout(timer); return r; }, function (e) { clearTimeout(timer); throw e; });
  }
  function isOrderDestinationReady() { return isSheetConfigured() || isFormConfigured(); }
  // يرسل الطلب إلى Google Sheets و/أو Google Form حسب ما هو مربوط في config.js
  function sendOrder(data) {
    var jobs = [];
    if (isSheetConfigured()) jobs.push(sendToGoogleSheet(data));
    if (isFormConfigured()) jobs.push(sendToGoogleForm(data));
    return Promise.all(jobs);
  }

  /* ---------------- Meta cookies (لـ Conversions API) ---------------- */
  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  var PAGE_LOADED_AT = Date.now();
  function getFbc() {
    var c = getCookie('_fbc');
    if (c) return c;
    var id = new URLSearchParams(location.search).get('fbclid');
    return id ? 'fb.1.' + PAGE_LOADED_AT + '.' + id : '';
  }

  /* ---------------- traffic source ---------------- */
  var SOURCE = (function () {
    var q = new URLSearchParams(location.search), parts = [];
    var src = q.get('utm_source') || (q.get('fbclid') ? 'facebook' : '');
    if (src) parts.push(src);
    ['utm_campaign', 'utm_content'].forEach(function (k) { if (q.get(k)) parts.push(q.get(k)); });
    if (!parts.length && document.referrer) {
      try { parts.push(new URL(document.referrer).hostname); } catch (e) { /* ignore */ }
    }
    return parts.join(' / ') || 'direct';
  })();

  /* ---------------- products & shipping ---------------- */
  var PRODUCTS = (C.PRODUCTS || []).filter(function (p) { return p && p.id && +p.price > 0; });
  if (!PRODUCTS.length) PRODUCTS = [{ id: 'box', name: 'بوكس المفاجآت', price: 0, items: [] }];
  var DEFAULT_PRODUCT = PRODUCTS.filter(function (p) { return p.selected; })[0] || PRODUCTS[0];
  var MIN_PRICE = Math.min.apply(null, PRODUCTS.map(function (p) { return +p.price; }));
  var MAX_QTY = Math.max(1, +C.MAX_QTY || 5);
  function productById(id) {
    return PRODUCTS.filter(function (p) { return String(p.id) === String(id); })[0];
  }

  var SHIP_TABLE = C.SHIPPING || {};
  function shipRate(code) {
    var r = SHIP_TABLE[code] || SHIP_TABLE[String(+code)] || C.SHIPPING_ALL;
    if (Array.isArray(r)) return { home: r[0], desk: r[1] };
    return r || {};
  }
  // undefined = لم تُختر الولاية، null = غير متوفر، رقم = السعر
  function shippingFor(code, type, qty) {
    if (!code) return undefined;
    var v = shipRate(code)[type];
    if (v === null || v === undefined || v === '') return null;
    var free = +C.FREE_SHIPPING_FROM_QTY || 0;
    if (free && qty >= free) return 0;
    return +v;
  }

  var state = { product: DEFAULT_PRODUCT, qty: 1, wilaya: '', delivery: 'home' };

  /* ---------------- DOM ---------------- */
  var form = $('#orderForm');
  var els = {
    name: $('#f-name'), phone: $('#f-phone'), wilaya: $('#f-wilaya'),
    commune: $('#f-commune'), note: $('#f-note'), hp: form.querySelector('.hp'),
    home: form.querySelector('input[name=delivery][value=home]'),
    desk: form.querySelector('input[name=delivery][value=desk]'),
    qtyVal: $('#qtyVal'), qtyMinus: $('[data-qty="-1"]'), qtyPlus: $('[data-qty="1"]'),
    btn: $('#submitBtn'), msg: $('#formMsg')
  };

  WILAYAS.forEach(function (w) {
    var o = document.createElement('option');
    o.value = w[0]; o.textContent = w[0] + ' - ' + w[1];
    els.wilaya.appendChild(o);
  });

  function shortItems(p) {
    var it = p.items || [];
    return it.slice(0, 3).join('، ') + (it.length > 3 ? '…' : '');
  }

  // بطاقات البوكسات داخل الفورم
  function renderProductOptions() {
    $('#products').innerHTML = PRODUCTS.map(function (p) {
      return '<label class="offer product-opt">' +
        '<input type="radio" name="product" value="' + esc(p.id) + '">' +
        '<span class="offer-radio" aria-hidden="true"></span>' +
        (p.image ? '<img class="product-thumb" src="' + esc(p.image) + '" alt="" width="80" height="60" loading="lazy">' : '') +
        '<span class="offer-info"><b>' + esc(p.name) + '</b><small>' + esc(shortItems(p)) + '</small>' +
          '<span class="product-price">' + priceText(p.price) + '</span></span>' +
        (p.badge ? '<span class="offer-badge">' + esc(p.badge) + '</span>' : '') +
        '</label>';
    }).join('');
  }

  // قسم "اختر البوكس" بالصور والمحتوى
  function renderBoxCards() {
    var grid = $('#boxesGrid');
    if (!grid) return;
    grid.innerHTML = PRODUCTS.map(function (p) {
      return '<article class="box-card" data-box="' + esc(p.id) + '">' +
        (p.badge ? '<span class="box-badge">' + esc(p.badge) + '</span>' : '') +
        (p.image ? '<div class="box-img"><img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" width="900" height="675" loading="lazy"></div>' : '') +
        '<div class="box-body">' +
          '<div class="box-head"><h3>' + esc(p.name) + '</h3><span class="box-price">' + priceText(p.price) + '</span></div>' +
          '<ul class="box-items">' + (p.items || []).map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' +
          '<button type="button" class="btn-pick" data-pick="' + esc(p.id) + '">اختر هذا البوكس</button>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  function selectProduct(p) {
    state.product = p;
    $$('.product-opt', form).forEach(function (label) {
      var input = label.querySelector('input');
      var on = input.value === String(p.id);
      input.checked = on;
      label.classList.toggle('is-selected', on);
    });
    $$('.box-card').forEach(function (card) {
      var on = card.getAttribute('data-box') === String(p.id);
      card.classList.toggle('is-selected', on);
      var b = card.querySelector('.btn-pick');
      if (b) b.textContent = on ? '✓ تم اختياره' : 'اختر هذا البوكس';
    });
  }

  function setQty(n) {
    state.qty = Math.min(MAX_QTY, Math.max(1, n));
    els.qtyVal.textContent = state.qty;
    els.qtyMinus.disabled = state.qty <= 1;
    els.qtyPlus.disabled = state.qty >= MAX_QTY;
  }

  function fillStaticPrices() {
    $$('[data-min-price]').forEach(function (el) { el.textContent = money(MIN_PRICE); });
    $$('[data-cur]').forEach(function (el) { el.textContent = CUR; });
    $$('[data-box-count]').forEach(function (el) { el.textContent = PRODUCTS.length; });
  }

  function shipLabel(v) {
    if (v === undefined) return '';
    if (v === null) return 'غير متوفر';
    return v === 0 ? 'مجاني' : priceText(v);
  }

  function update() {
    var p = state.product, qty = state.qty, code = state.wilaya;
    var sub = p.price * qty;
    var home = shippingFor(code, 'home', qty), desk = shippingFor(code, 'desk', qty);
    els.home.disabled = !!(code && home === null);
    els.desk.disabled = !!(code && desk === null);
    if (state.delivery === 'desk' && els.desk.disabled && !els.home.disabled) { els.home.checked = true; state.delivery = 'home'; }
    if (state.delivery === 'home' && els.home.disabled && !els.desk.disabled) { els.desk.checked = true; state.delivery = 'desk'; }
    form.querySelector('[data-ship=home]').textContent = shipLabel(home);
    form.querySelector('[data-ship=desk]').textContent = shipLabel(desk);

    var ship = shippingFor(code, state.delivery, qty);
    $('#sumProductLabel').textContent = p.name + ' × ' + qty;
    $('#sumProducts').textContent = priceText(sub);
    $('#sumShipping').textContent = !code ? 'اختر الولاية' : (ship === 0 ? 'مجاني 🎉' : (ship === null ? '—' : priceText(ship)));
    $('#sumTotal').textContent = priceText(sub + (ship || 0));
  }

  /* ---------------- validation ---------------- */
  function setErr(input, msg) {
    var el = form.querySelector('[data-err="' + input.id + '"]');
    if (el) el.textContent = msg || '';
    var field = input.closest('.field');
    if (field) field.classList.toggle('invalid', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  var RULES = [
    [els.name, function (v) { return v.trim().length >= 3 ? '' : 'من فضلك أدخل اسمك الكامل'; }],
    [els.phone, function (v) { return PHONE_RE.test(normalizePhone(v)) ? '' : 'رقم الهاتف غير صحيح — مثال: 0555123456'; }],
    [els.wilaya, function (v) { return v ? '' : 'من فضلك اختر الولاية'; }],
    [els.commune, function (v) { return v.trim().length >= 2 ? '' : 'من فضلك أدخل البلدية'; }]
  ];
  function validate() {
    var first = null;
    RULES.forEach(function (r) {
      var msg = r[1](r[0].value);
      setErr(r[0], msg);
      if (msg && !first) first = r[0];
    });
    if (first) {
      first.focus({ preventScroll: true });
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return !first;
  }
  RULES.forEach(function (r) {
    var ev = r[0].tagName === 'SELECT' ? 'change' : 'input';
    r[0].addEventListener(ev, function () {
      if (r[0].closest('.field').classList.contains('invalid')) setErr(r[0], r[1](r[0].value));
    });
    r[0].addEventListener('blur', function () { if (r[0].value) setErr(r[0], r[1](r[0].value)); });
  });
  // تحويل الأرقام العربية (٠٥٥٥…) إلى 0555… عند الخروج من خانة الهاتف
  els.phone.addEventListener('blur', function () {
    var p = normalizePhone(els.phone.value);
    if (PHONE_RE.test(p)) els.phone.value = p;
  });

  /* ---------------- UI messages ---------------- */
  function showMsg(text) { els.msg.textContent = text; els.msg.hidden = false; }
  function hideMsg() { els.msg.hidden = true; els.msg.textContent = ''; }
  var btnHTML = els.btn.innerHTML;
  function setLoading(on) {
    els.btn.disabled = on;
    els.btn.innerHTML = on ? '<span class="spinner" aria-hidden="true"></span><span>جاري إرسال الطلب…</span>' : btnHTML;
  }

  /* ---------------- thank-you dialog ---------------- */
  var dlg = $('#thanks');
  function openThanks(order) {
    $('#tName').textContent = order.name.split(' ')[0];
    $('#tId').textContent = order.orderId;
    $('#tProduct').textContent = order.product + ' × ' + order.quantity;
    $('#tWilaya').textContent = order.wilaya;
    $('#tTotal').textContent = priceText(order.total);
    $('#tPhone').textContent = order.phone;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else { dlg.setAttribute('open', ''); dlg.classList.add('fallback'); }
  }
  function closeThanks() {
    if (typeof dlg.close === 'function') dlg.close();
    else { dlg.removeAttribute('open'); }
  }
  dlg.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]') || e.target === dlg) closeThanks();
  });

  /* ---------------- submit ---------------- */
  var submitting = false;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitting) return;
    hideMsg();
    if (els.hp.value) return; // روبوت
    if (!validate()) return;

    if (!isOrderDestinationReady()) {
      showMsg('⚠️ الطلبات غير مربوطة بعد — ضع رابط GOOGLE_SHEET_URL (أو Google Form) في ملف config.js');
      console.warn('[Almes & Racim] لا يوجد Google Sheet ولا Google Form مربوط: راجع config.js');
      return;
    }

    var p = state.product, qty = state.qty, code = els.wilaya.value;
    var ship = shippingFor(code, state.delivery, qty);
    if (ship === null || ship === undefined) {
      showMsg('عذراً، التوصيل غير متوفر حالياً لهذه الولاية. اختر طريقة توصيل أخرى أو اتصل بنا.');
      return;
    }
    var sub = p.price * qty;
    var order = {
      orderId: makeOrderId(),
      product: p.name,
      name: els.name.value.trim(),
      phone: normalizePhone(els.phone.value),
      wilaya: code + ' - ' + wilayaName(code),
      commune: els.commune.value.trim(),
      delivery: state.delivery === 'desk' ? 'مكتب (Stop desk)' : 'المنزل',
      quantity: qty,
      shipping: ship,
      total: sub + ship,
      note: els.note.value.trim(),
      source: SOURCE,
      // بيانات إضافية لـ Conversions API (لا تظهر في الجدول)
      productId: p.id,
      eventName: C.PIXEL_ORDER_EVENT || 'Purchase',
      fbp: getCookie('_fbp'),
      fbc: getFbc(),
      ua: navigator.userAgent,
      url: location.href
    };

    submitting = true;
    setLoading(true);
    sendOrder(order)
      .then(function () {
        track(C.PIXEL_ORDER_EVENT || 'Purchase', {
          value: order.total,
          currency: CURRENCY,
          content_name: p.name,
          content_ids: [p.id],
          contents: [{ id: p.id, quantity: qty, item_price: p.price }],
          content_type: 'product',
          num_items: qty
        }, order.orderId);
        openThanks(order);
        form.reset();
        state.wilaya = ''; state.delivery = 'home';
        selectProduct(DEFAULT_PRODUCT);
        setQty(1);
        update();
      })
      .catch(function () {
        showMsg('تعذّر إرسال الطلب. تحقّق من اتصال الإنترنت ثم أعد المحاولة.');
      })
      .then(function () { submitting = false; setLoading(false); });
  });

  /* ---------------- events ---------------- */
  form.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'product') {
      var p = productById(t.value);
      if (p) selectProduct(p);
    } else if (t.name === 'wilaya') {
      state.wilaya = t.value;
    } else if (t.name === 'delivery') {
      state.delivery = t.value;
    } else { return; }
    update();
  });

  form.addEventListener('click', function (e) {
    var b = e.target.closest('[data-qty]');
    if (!b) return;
    setQty(state.qty + (+b.getAttribute('data-qty')));
    update();
  });

  // زر "اختر هذا البوكس" في قسم البوكسات
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-pick]');
    if (!b) return;
    var p = productById(b.getAttribute('data-pick'));
    if (!p) return;
    selectProduct(p);
    update();
    $('#products').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // البيكسل: بداية ملء الفورم (مرة واحدة)
  var started = false;
  function onStart() {
    if (started) return;
    started = true;
    track('InitiateCheckout', {
      value: state.product.price * state.qty, currency: CURRENCY,
      content_ids: [state.product.id], content_type: 'product', num_items: state.qty
    });
  }
  form.addEventListener('focusin', onStart);
  form.addEventListener('change', onStart);

  // gallery
  var main = $('#mainImage');
  $$('.thumb').forEach(function (b) {
    b.addEventListener('click', function () {
      main.src = b.getAttribute('data-src');
      main.alt = b.getAttribute('data-alt') || '';
      $$('.thumb').forEach(function (x) { x.classList.toggle('is-active', x === b); });
    });
  });

  // sticky CTA on mobile
  var sticky = $('#stickyCta'), formVisible = true;
  function refreshSticky() { sticky.classList.toggle('show', !formVisible && window.scrollY > 300); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      formVisible = entries[0].isIntersecting; refreshSticky();
    }, { threshold: 0.1 }).observe(form);
  }
  window.addEventListener('scroll', refreshSticky, { passive: true });

  // setup reminder (يختفي بعد إكمال الإعداد)
  var missing = [];
  if (!isOrderDestinationReady()) missing.push('Google Sheets');
  if (!pixelIds().length) missing.push('Facebook Pixel');
  if (missing.length) {
    var w = $('#setupWarning');
    w.textContent = '⚠️ وضع الإعداد: لم يتم ربط ' + missing.join(' و ') + ' بعد — عدّل ملف config.js (هذا الشريط يختفي تلقائياً بعد الربط)';
    w.hidden = false;
  }

  /* ---------------- init ---------------- */
  $('#year').textContent = new Date().getFullYear();
  renderProductOptions();
  renderBoxCards();
  selectProduct(DEFAULT_PRODUCT);
  setQty(1);
  fillStaticPrices();
  update();

  track('ViewContent', {
    content_name: 'بوكسات المفاجآت',
    content_ids: PRODUCTS.map(function (p) { return p.id; }),
    content_type: 'product',
    value: DEFAULT_PRODUCT.price,
    currency: CURRENCY
  });
})();
