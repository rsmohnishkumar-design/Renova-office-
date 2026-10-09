// RENOVA OFFICE — Billing App (client-side only; data stays in this browser)
(function () {
  'use strict';

  var KEY = 'renova-billing-v1';
  var $ = function (id) { return document.getElementById(id); };

  // ---------- storage ----------
  var db = load();
  var bill = [];   // [{no, name, price, qty}]

  function defaults() {
    return { store: 'My Store', currency: '₹', nextBill: 1, pinHash: null, salt: null, items: [] };
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(defaults(), JSON.parse(raw));
    } catch (e) { /* storage blocked or corrupt: start fresh */ }
    return defaults();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
    catch (e) { return false; }
  }

  // ---------- helpers ----------
  function el(tag, props, children) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'text') n.textContent = props[k];
      else if (k === 'class') n.className = props[k];
      else n.setAttribute(k, props[k]);
    });
    (children || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }
  function money(n) { return db.currency + ' ' + (Math.round(n * 100) / 100).toFixed(2); }
  function findItem(no) {
    return db.items.filter(function (i) { return i.no === String(no).trim(); })[0];
  }
  function say(id, text, isErr) {
    var m = $(id); m.textContent = text; m.className = 'msg' + (isErr ? ' err' : '');
  }

  // ---------- billing view ----------
  function renderItems() {
    var grid = $('item-grid');
    grid.textContent = '';
    db.items.slice().sort(byNo).forEach(function (it) {
      var b = el('button', { type: 'button', class: 'item-tile' }, [
        el('span', { class: 'no', text: it.no }),
        el('span', { class: 'nm', text: it.name }),
        el('span', { class: 'pr', text: money(it.price) })
      ]);
      b.addEventListener('click', function () { addToBill(it.no, 1); });
      grid.appendChild(b);
    });
    $('no-items').hidden = db.items.length > 0;
  }
  function byNo(a, b) {
    return a.no.localeCompare(b.no, undefined, { numeric: true });
  }

  function addToBill(no, qty) {
    var it = findItem(no);
    if (!it) { say('add-msg', 'No item with number "' + no + '".', true); return false; }
    var line = bill.filter(function (l) { return l.no === it.no; })[0];
    if (line) line.qty += qty;
    else bill.push({ no: it.no, name: it.name, price: it.price, qty: qty });
    say('add-msg', 'Added: ' + it.name + ' × ' + qty);
    renderBill();
    return true;
  }

  function renderBill() {
    var body = $('bill-body');
    body.textContent = '';
    var sub = 0;
    bill.forEach(function (l, idx) {
      var amt = l.price * l.qty; sub += amt;
      var minus = el('button', { type: 'button', class: 'qty-btn', 'aria-label': 'Decrease ' + l.name, text: '−' });
      var plus = el('button', { type: 'button', class: 'qty-btn', 'aria-label': 'Increase ' + l.name, text: '+' });
      var rm = el('button', { type: 'button', class: 'btn btn-small btn-danger', 'aria-label': 'Remove ' + l.name, text: 'x' });
      minus.addEventListener('click', function () { l.qty = Math.max(1, l.qty - 1); renderBill(); });
      plus.addEventListener('click', function () { l.qty += 1; renderBill(); });
      rm.addEventListener('click', function () { bill.splice(idx, 1); renderBill(); });
      var qtyCell = el('td', { class: 'num' }, [minus, document.createTextNode(' ' + l.qty + ' '), plus]);
      body.appendChild(el('tr', {}, [
        el('td', { text: l.no }),
        el('td', { text: l.name }),
        el('td', { class: 'num', text: money(l.price) }),
        qtyCell,
        el('td', { class: 'num', text: money(amt) }),
        el('td', { class: 'no-print' }, [rm])
      ]));
    });
    var disc = Math.min(Math.max(parseFloat($('discount').value) || 0, 0), sub);
    $('t-sub').textContent = money(sub);
    $('t-disc').textContent = money(disc);
    $('t-total').textContent = money(sub - disc);
    $('bill-empty').hidden = bill.length > 0;
    $('t-disc-row').hidden = disc === 0;
  }

  function renderHeader() {
    $('store-title').textContent = db.store;
    $('receipt-store').textContent = db.store;
    document.title = db.store + ' — Billing';
    $('bill-no').textContent = db.nextBill;
    $('bill-date').textContent = new Date().toLocaleString();
  }

  $('add-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var qty = Math.max(1, parseInt($('add-qty').value, 10) || 1);
    if (addToBill($('add-no').value, qty)) {
      $('add-no').value = ''; $('add-qty').value = 1;
    }
    $('add-no').focus();
  });
  $('discount').addEventListener('input', renderBill);

  $('btn-print').addEventListener('click', function () {
    if (!bill.length) { say('add-msg', 'Add at least one item before printing.', true); return; }
    $('bill-date').textContent = new Date().toLocaleString();
    window.print();
  });
  $('btn-new').addEventListener('click', function () {
    if (bill.length && !confirm('Start a new bill? The current bill will be cleared.')) return;
    if (bill.length) { db.nextBill += 1; save(); }
    bill = []; $('discount').value = 0;
    say('add-msg', '');
    renderHeader(); renderBill(); $('add-no').focus();
  });

  // ---------- PIN ----------
  function hashPin(pin, salt) {
    var data = new TextEncoder().encode(salt + ':' + pin);
    return crypto.subtle.digest('SHA-256', data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return ('0' + b.toString(16)).slice(-2);
      }).join('');
    });
  }
  function randomSalt() {
    var a = new Uint8Array(16); crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  var dlg = $('pin-dialog');
  var pinMode = 'verify';   // verify | create | change
  var onPinOk = null;

  function openPin(mode, cb) {
    pinMode = mode; onPinOk = cb;
    var creating = mode !== 'verify';
    $('pin-title').textContent = mode === 'create' ? 'Create admin PIN' : mode === 'change' ? 'Set a new PIN' : 'Admin PIN';
    $('pin-help').textContent = creating ? 'Choose a PIN of 4 to 12 digits. Do not forget it.' : 'Enter the admin PIN.';
    $('pin-input2').hidden = !creating;
    $('pin-input2').required = creating;
    $('pin-input').value = ''; $('pin-input2').value = ''; $('pin-msg').textContent = '';
    if (!dlg.open) dlg.showModal();
    $('pin-input').focus();
  }
  $('pin-cancel').addEventListener('click', function () { dlg.close(); });
  $('pin-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var pin = $('pin-input').value;
    var msg = $('pin-msg');
    if (!window.crypto || !crypto.subtle) { msg.textContent = 'Secure features unavailable. Open this page over https.'; return; }
    if (pinMode === 'verify') {
      hashPin(pin, db.salt).then(function (h) {
        if (h === db.pinHash) { dlg.close(); onPinOk(); }
        else { msg.textContent = 'Wrong PIN.'; $('pin-input').value = ''; }
      });
      return;
    }
    if (!/^\d{4,12}$/.test(pin)) { msg.textContent = 'PIN must be 4 to 12 digits.'; return; }
    if (pin !== $('pin-input2').value) { msg.textContent = 'PINs do not match.'; return; }
    var salt = randomSalt();
    hashPin(pin, salt).then(function (h) {
      db.salt = salt; db.pinHash = h;
      if (!save()) { msg.textContent = 'Could not save (browser storage is blocked).'; return; }
      dlg.close(); onPinOk();
    });
  });

  // ---------- hidden admin entry: tap the logo 5 times within 3 seconds ----------
  var taps = [];
  function tryAdmin() {
    if (db.pinHash) openPin('verify', showAdmin);
    else openPin('create', showAdmin);
  }
  $('logo').addEventListener('click', function () {
    var now = Date.now();
    taps = taps.filter(function (t) { return now - t < 3000; });
    taps.push(now);
    if (taps.length >= 5) { taps = []; tryAdmin(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') { e.preventDefault(); tryAdmin(); }
  });

  // ---------- admin ----------
  var editingNo = null;

  function showAdmin() {
    $('billing-view').hidden = true;
    $('admin-view').hidden = false;
    $('set-store').value = db.store;
    $('set-cur').value = db.currency;
    resetItemForm();
    renderAdmin();
    window.scrollTo(0, 0);
  }
  function exitAdmin() {
    $('admin-view').hidden = true;
    $('billing-view').hidden = false;
    renderHeader(); renderItems(); renderBill();
  }
  $('admin-exit').addEventListener('click', exitAdmin);

  $('settings-form').addEventListener('submit', function (e) {
    e.preventDefault();
    db.store = $('set-store').value.trim() || db.store;
    db.currency = $('set-cur').value.trim() || db.currency;
    var ok = save();
    say('sec-msg', ok ? 'Settings saved.' : 'Could not save (browser storage is blocked).', !ok);
  });

  function renderAdmin() {
    var body = $('admin-body');
    body.textContent = '';
    db.items.slice().sort(byNo).forEach(function (it) {
      var edit = el('button', { type: 'button', class: 'btn btn-small btn-ghost', text: 'Edit' });
      var del = el('button', { type: 'button', class: 'btn btn-small btn-danger', text: 'Delete' });
      edit.addEventListener('click', function () { startEdit(it); });
      del.addEventListener('click', function () {
        if (!confirm('Delete item ' + it.no + ' (' + it.name + ')?')) return;
        db.items = db.items.filter(function (x) { return x.no !== it.no; });
        save(); renderAdmin(); say('item-msg', 'Item deleted.');
      });
      body.appendChild(el('tr', {}, [
        el('td', { text: it.no }), el('td', { text: it.name }),
        el('td', { class: 'num', text: money(it.price) }),
        el('td', { class: 'num' }, [edit, document.createTextNode(' '), del])
      ]));
    });
    $('admin-empty').hidden = db.items.length > 0;
  }

  function resetItemForm() {
    editingNo = null;
    $('item-form').reset();
    $('it-save').textContent = 'Add item';
    $('it-cancel').hidden = true;
    $('it-no').readOnly = false;
  }
  function startEdit(it) {
    editingNo = it.no;
    $('it-no').value = it.no; $('it-no').readOnly = true;
    $('it-name').value = it.name; $('it-price').value = it.price;
    $('it-save').textContent = 'Update item';
    $('it-cancel').hidden = false;
    $('it-name').focus();
    say('item-msg', 'Editing item ' + it.no + '. The item number cannot be changed; delete and re-add to change it.');
  }
  $('it-cancel').addEventListener('click', function () { resetItemForm(); say('item-msg', ''); });

  $('item-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var no = $('it-no').value.trim();
    var name = $('it-name').value.trim();
    var price = parseFloat($('it-price').value);
    if (!no || !name || !(price >= 0)) { say('item-msg', 'Enter a number, a name and a valid price.', true); return; }
    var existing = findItem(no);
    if (existing && editingNo !== no) { say('item-msg', 'Item number ' + no + ' is already used by "' + existing.name + '".', true); return; }
    if (editingNo) { existing.name = name; existing.price = price; }
    else db.items.push({ no: no, name: name, price: price });
    if (!save()) { say('item-msg', 'Could not save (browser storage is blocked).', true); return; }
    say('item-msg', editingNo ? 'Item updated.' : 'Item added.');
    resetItemForm(); renderAdmin(); $('it-no').focus();
  });

  // backup / restore / change PIN
  $('btn-export').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify({ store: db.store, currency: db.currency, items: db.items }, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'billing-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  $('file-import').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        if (!Array.isArray(d.items)) throw new Error('bad');
        var items = d.items.filter(function (i) { return i && i.no != null && i.name && i.price >= 0; })
          .map(function (i) { return { no: String(i.no).trim(), name: String(i.name), price: Number(i.price) }; });
        if (!confirm('Replace current items with ' + items.length + ' items from the backup?')) return;
        db.items = items;
        if (d.store) db.store = String(d.store);
        if (d.currency) db.currency = String(d.currency);
        save(); showAdmin(); say('sec-msg', 'Backup restored.');
      } catch (err) { say('sec-msg', 'That file is not a valid backup.', true); }
    };
    r.readAsText(f);
    e.target.value = '';
  });
  $('btn-pin').addEventListener('click', function () {
    openPin('change', function () { say('sec-msg', 'PIN changed.'); });
  });

  // ---------- init ----------
  renderHeader(); renderItems(); renderBill();
})();
