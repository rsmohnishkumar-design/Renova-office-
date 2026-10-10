// RENOVA OFFICE — Billing App (Firebase edition)
// Auth: Firebase Authentication (email + password). Data: Cloud Firestore.
// Access control is enforced by firebase/firestore.rules, not by this file.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc, writeBatch, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig, STORE_ID } from './firebase-config.js';

const $ = (id) => document.getElementById(id);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
const storeRef = doc(db, 'stores', STORE_ID);
const itemsRef = collection(storeRef, 'items');
const billsRef = collection(storeRef, 'bills');

// ---------- state ----------
let user = null;
let store = { name: 'Billing', currency: '₹', ownerUid: null, staff: [] };
let items = [];            // [{no, name, price}]
let bill = [];             // [{no, name, price, qty}]
let billNo = newBillNo();
let savedSig = '';         // signature of the last bill saved to Firestore
let unsubs = [];
let editingNo = null;

const isOwner = () => !!user && user.uid === store.ownerUid;

// ---------- helpers ----------
function el(tag, props, children) {
  const n = document.createElement(tag);
  Object.keys(props || {}).forEach((k) => {
    if (k === 'text') n.textContent = props[k];
    else if (k === 'class') n.className = props[k];
    else n.setAttribute(k, props[k]);
  });
  (children || []).forEach((c) => n.appendChild(c));
  return n;
}
const money = (n) => store.currency + ' ' + (Math.round(n * 100) / 100).toFixed(2);
const byNo = (a, b) => a.no.localeCompare(b.no, undefined, { numeric: true });
const findItem = (no) => items.filter((i) => i.no.toLowerCase() === String(no).trim().toLowerCase())[0];
function say(id, text, isErr) { const m = $(id); m.textContent = text; m.className = 'msg' + (isErr ? ' err' : ''); }
function newBillNo() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}
function errText(e) {
  if (e && e.code === 'permission-denied') return 'Not allowed for your account.';
  if (e && e.code === 'unavailable') return 'You are offline. The change will sync when you are back online.';
  return 'Something went wrong. Please try again.';
}
function show(view) {
  ['loading-view', 'login-view', 'noaccess-view', 'billing-view', 'admin-view'].forEach((v) => { $(v).hidden = v !== view; });
}

// ---------- auth ----------
$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('login-btn').disabled = true; say('login-msg', '');
  try {
    await signInWithEmailAndPassword(auth, $('login-email').value.trim(), $('login-pass').value);
    $('login-pass').value = '';
  } catch (err) {
    const bad = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'];
    say('login-msg', bad.indexOf(err.code) >= 0 ? 'Wrong email or password.'
      : err.code === 'auth/too-many-requests' ? 'Too many attempts. Wait a few minutes and try again.'
      : err.code === 'auth/network-request-failed' ? 'No internet connection.'
      : 'Could not sign in.', true);
  }
  $('login-btn').disabled = false;
});
$('btn-signout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (u) => {
  unsubs.forEach((f) => f()); unsubs = [];
  user = u;
  $('btn-signout').hidden = !u;
  if (!u) { items = []; bill = []; show('login-view'); return; }
  show('loading-view');
  let first = true;
  unsubs.push(onSnapshot(storeRef, (snap) => {
    if (!snap.exists()) {
      $('noaccess-text').textContent = 'The store has not been set up yet.';
      $('noaccess-uid').textContent = u.uid; show('noaccess-view'); return;
    }
    const d = snap.data();
    store = { name: d.name || 'Billing', currency: d.currency || '₹', ownerUid: d.ownerUid, staff: d.staff || [] };
    renderHeader(); renderItems(); renderBill();
    if (first) { first = false; show('billing-view'); $('add-no').focus(); }
    if (!$('admin-view').hidden) { renderAdmin(); }
  }, (err) => {
    if (err.code === 'permission-denied') {
      $('noaccess-text').textContent = 'You are signed in, but this account has not been added to the store.';
      $('noaccess-uid').textContent = u.uid; show('noaccess-view');
    } else { show('login-view'); say('login-msg', errText(err), true); }
  }));
  unsubs.push(onSnapshot(itemsRef, (snap) => {
    items = snap.docs.map((x) => x.data());
    renderItems(); renderBill();
    if (!$('admin-view').hidden) renderAdmin();
  }, () => { /* store snapshot already reports access problems */ }));
});

// ---------- billing ----------
function renderHeader() {
  $('store-title').textContent = store.name;
  $('receipt-store').textContent = store.name;
  document.title = store.name + ' — Billing';
  $('bill-no').textContent = billNo;
  $('bill-date').textContent = new Date().toLocaleString();
}
function renderItems() {
  const grid = $('item-grid');
  grid.textContent = '';
  items.slice().sort(byNo).forEach((it) => {
    const b = el('button', { type: 'button', class: 'item-tile' }, [
      el('span', { class: 'no', text: it.no }),
      el('span', { class: 'nm', text: it.name }),
      el('span', { class: 'pr', text: money(it.price) })
    ]);
    b.addEventListener('click', () => addToBill(it.no, 1));
    grid.appendChild(b);
  });
  $('no-items').hidden = items.length > 0;
}
function addToBill(no, qty) {
  const it = findItem(no);
  if (!it) { say('add-msg', 'No item with number "' + no + '".', true); return false; }
  const line = bill.filter((l) => l.no === it.no)[0];
  if (line) line.qty += qty; else bill.push({ no: it.no, name: it.name, price: it.price, qty });
  say('add-msg', 'Added: ' + it.name + ' × ' + qty);
  renderBill();
  return true;
}
function totals() {
  const sub = bill.reduce((s, l) => s + l.price * l.qty, 0);
  const disc = Math.min(Math.max(parseFloat($('discount').value) || 0, 0), sub);
  return { sub, disc, total: sub - disc };
}
function renderBill() {
  const body = $('bill-body');
  body.textContent = '';
  bill.forEach((l, idx) => {
    const minus = el('button', { type: 'button', class: 'qty-btn', 'aria-label': 'Decrease ' + l.name, text: '−' });
    const plus = el('button', { type: 'button', class: 'qty-btn', 'aria-label': 'Increase ' + l.name, text: '+' });
    const rm = el('button', { type: 'button', class: 'btn btn-small btn-danger', 'aria-label': 'Remove ' + l.name, text: 'x' });
    minus.addEventListener('click', () => { l.qty = Math.max(1, l.qty - 1); renderBill(); });
    plus.addEventListener('click', () => { l.qty += 1; renderBill(); });
    rm.addEventListener('click', () => { bill.splice(idx, 1); renderBill(); });
    body.appendChild(el('tr', {}, [
      el('td', { text: l.no }), el('td', { text: l.name }),
      el('td', { class: 'num', text: money(l.price) }),
      el('td', { class: 'num' }, [minus, document.createTextNode(' ' + l.qty + ' '), plus]),
      el('td', { class: 'num', text: money(l.price * l.qty) }),
      el('td', { class: 'no-print' }, [rm])
    ]));
  });
  const t = totals();
  $('t-sub').textContent = money(t.sub);
  $('t-disc').textContent = money(t.disc);
  $('t-total').textContent = money(t.total);
  $('bill-empty').hidden = bill.length > 0;
  $('t-disc-row').hidden = t.disc === 0;
}
$('add-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const qty = Math.max(1, parseInt($('add-qty').value, 10) || 1);
  if (addToBill($('add-no').value, qty)) { $('add-no').value = ''; $('add-qty').value = 1; }
  $('add-no').focus();
});
$('discount').addEventListener('input', renderBill);

function billSignature() { return JSON.stringify([bill, $('discount').value]); }
function saveBill() {
  const sig = billSignature();
  if (sig === savedSig) return;
  const t = totals();
  savedSig = sig;
  // Not awaited: when offline, Firestore queues the write and syncs it later.
  addDoc(billsRef, {
    number: billNo,
    lines: bill.map((l) => ({ no: l.no, name: l.name, price: l.price, qty: l.qty })),
    subtotal: t.sub, discount: t.disc, total: t.total,
    createdAt: serverTimestamp(), createdBy: user.uid
  }).catch((err) => { savedSig = ''; say('add-msg', 'Bill was not saved online: ' + errText(err), true); });
}
$('btn-print').addEventListener('click', () => {
  if (!bill.length) { say('add-msg', 'Add at least one item before printing.', true); return; }
  saveBill();
  $('bill-date').textContent = new Date().toLocaleString();
  window.print();
});
$('btn-new').addEventListener('click', () => {
  if (bill.length && billSignature() !== savedSig && !confirm('This bill was not printed or saved. Start a new bill anyway?')) return;
  bill = []; savedSig = ''; billNo = newBillNo(); $('discount').value = 0;
  say('add-msg', ''); renderHeader(); renderBill(); $('add-no').focus();
});

// ---------- hidden admin entry (owner only): tap the logo 5 times within 3 seconds ----------
let taps = [];
function tryAdmin() {
  if (!user || $('billing-view').hidden) return;
  if (!isOwner()) { say('add-msg', 'Admin room is for the store owner only.', true); return; }
  showAdmin();
}
$('logo').addEventListener('click', () => {
  const now = Date.now();
  taps = taps.filter((t) => now - t < 3000); taps.push(now);
  if (taps.length >= 5) { taps = []; tryAdmin(); }
});
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') { e.preventDefault(); tryAdmin(); }
});

// ---------- admin ----------
function showAdmin() {
  show('admin-view');
  $('set-store').value = store.name; $('set-cur').value = store.currency;
  $('set-staff').value = store.staff.join('\n');
  resetItemForm(); renderAdmin(); window.scrollTo(0, 0);
}
$('admin-exit').addEventListener('click', () => { show('billing-view'); renderHeader(); renderItems(); renderBill(); });

$('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const staff = Array.from(new Set($('set-staff').value.split(/\s+/).map((s) => s.trim()).filter(Boolean)));
  try {
    await updateDoc(storeRef, { name: $('set-store').value.trim(), currency: $('set-cur').value.trim(), staff });
    say('set-msg', 'Settings saved.');
  } catch (err) { say('set-msg', errText(err), true); }
});

function renderAdmin() {
  const body = $('admin-body');
  body.textContent = '';
  items.slice().sort(byNo).forEach((it) => {
    const edit = el('button', { type: 'button', class: 'btn btn-small btn-ghost', text: 'Edit' });
    const del = el('button', { type: 'button', class: 'btn btn-small btn-danger', text: 'Delete' });
    edit.addEventListener('click', () => startEdit(it));
    del.addEventListener('click', async () => {
      if (!confirm('Delete item ' + it.no + ' (' + it.name + ')?')) return;
      try { await deleteDoc(doc(itemsRef, it.no)); say('item-msg', 'Item deleted.'); }
      catch (err) { say('item-msg', errText(err), true); }
    });
    body.appendChild(el('tr', {}, [
      el('td', { text: it.no }), el('td', { text: it.name }),
      el('td', { class: 'num', text: money(it.price) }),
      el('td', { class: 'num' }, [edit, document.createTextNode(' '), del])
    ]));
  });
  $('admin-empty').hidden = items.length > 0;
}
function resetItemForm() {
  editingNo = null; $('item-form').reset();
  $('it-save').textContent = 'Add item'; $('it-cancel').hidden = true; $('it-no').readOnly = false;
}
function startEdit(it) {
  editingNo = it.no;
  $('it-no').value = it.no; $('it-no').readOnly = true;
  $('it-name').value = it.name; $('it-price').value = it.price;
  $('it-save').textContent = 'Update item'; $('it-cancel').hidden = false; $('it-name').focus();
  say('item-msg', 'Editing item ' + it.no + '. To change the number, delete it and add it again.');
}
$('it-cancel').addEventListener('click', () => { resetItemForm(); say('item-msg', ''); });

$('item-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const no = $('it-no').value.trim(), name = $('it-name').value.trim(), price = parseFloat($('it-price').value);
  if (!/^[A-Za-z0-9_-]{1,20}$/.test(no) || !name || !(price >= 0)) {
    say('item-msg', 'Enter a number (letters, digits, - or _), a name and a valid price.', true); return;
  }
  const existing = findItem(no);
  if (existing && editingNo !== existing.no) { say('item-msg', 'Item number ' + no + ' is already used by "' + existing.name + '".', true); return; }
  try {
    await setDoc(doc(itemsRef, no), { no, name, price });
    say('item-msg', editingNo ? 'Item updated.' : 'Item added.');
    resetItemForm(); $('it-no').focus();
  } catch (err) { say('item-msg', errText(err), true); }
});

$('btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ store: store.name, currency: store.currency, items }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'billing-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('file-import').addEventListener('change', (e) => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = async () => {
    try {
      const d = JSON.parse(r.result);
      if (!Array.isArray(d.items)) throw new Error('bad');
      const list = d.items
        .map((i) => ({ no: String(i && i.no).trim(), name: String(i && i.name || '').trim(), price: Number(i && i.price) }))
        .filter((i) => /^[A-Za-z0-9_-]{1,20}$/.test(i.no) && i.name && i.name.length <= 60 && i.price >= 0);
      if (!list.length) throw new Error('empty');
      if (!confirm('Add or overwrite ' + list.length + ' items from this backup?')) return;
      for (let i = 0; i < list.length; i += 400) {
        const batch = writeBatch(db);
        list.slice(i, i + 400).forEach((it) => batch.set(doc(itemsRef, it.no), it));
        await batch.commit();
      }
      say('sec-msg', 'Backup restored.');
    } catch (err) { say('sec-msg', err.code ? errText(err) : 'That file is not a valid backup.', true); }
  };
  r.readAsText(f); e.target.value = '';
});

show('loading-view');
