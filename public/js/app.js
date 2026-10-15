// Shared: products, cart (localStorage), header cart count
// Backend API base — set to your backend URL when available, else uses static fallbacks
const API_BASE = (typeof JEA_API_BASE !== 'undefined' && JEA_API_BASE) || '';
let PRODUCTS = [];
let cart = {};
try { cart = JSON.parse(localStorage.getItem('jea_cart') || '{}'); } catch (e) { cart = {}; }

async function loadProducts() {
  if (PRODUCTS.length) return PRODUCTS;
  try {
    const r = await fetch(API_BASE + '/api/products');
    if (r.ok) { PRODUCTS = await r.json(); return PRODUCTS; }
  } catch(e) {}
  // Static fallback for Vercel/hosted version
  const r2 = await fetch('/data/products.json');
  PRODUCTS = await r2.json();
  return PRODUCTS;
}

// Static-mode API helpers (localStorage when server API unavailable)
async function apiGet(path) {
  try {
    const r = await fetch(API_BASE + path);
    if (r.ok) return await r.json();
  } catch(e) {}
  // Fallbacks
  if (path === '/api/orders') {
    try { return JSON.parse(localStorage.getItem('jea_orders') || '[]'); } catch(e) { return []; }
  }
  if (path.startsWith('/api/reviews')) {
    try { return JSON.parse(localStorage.getItem('jea_reviews') || '[]'); } catch(e) { return []; }
  }
  if (path === '/api/coupons') {
    return [
      { code: 'WELCOME20', title: '20% off first order', desc: 'New customers • Min order ₹149' },
      { code: 'JAR10', title: '₹10 off 20L jar', desc: 'On every 20L jar refill' },
      { code: 'FAMILY15', title: '15% off Family Combo', desc: 'On Family Combo pack' }
    ];
  }
  return null;
}
async function apiPost(path, data) {
  try {
    const r = await fetch(API_BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (r.ok) return await r.json();
  } catch(e) {}
  // Static fallbacks
  if (path === '/api/order') {
    const orders = JSON.parse(localStorage.getItem('jea_orders') || '[]');
    const id = 'JEA-' + Math.floor(100000 + Math.random() * 900000);
    orders.unshift({ id, ...data, placedAt: new Date().toISOString(), status: 'Confirmed' });
    localStorage.setItem('jea_orders', JSON.stringify(orders));
    return { ok: true, orderId: id };
  }
  if (path === '/api/review') {
    const revs = JSON.parse(localStorage.getItem('jea_reviews') || '[]');
    revs.push({ ...data, id: Date.now(), date: new Date().toISOString() });
    localStorage.setItem('jea_reviews', JSON.stringify(revs));
    return { ok: true };
  }
  if (path === '/api/feedback') return { ok: true };
  return { ok: false };
}
function saveCart() {
  localStorage.setItem('jea_cart', JSON.stringify(cart));
  updateCartBadge();
}
function cartCount() { return Object.values(cart).reduce((a, b) => a + b, 0); }
function cartTotal() {
  return Object.entries(cart).reduce((sum, [id, q]) => {
    const p = PRODUCTS.find(x => x.id === id);
    return sum + (p ? p.price * q : 0);
  }, 0);
}
function updateCartBadge() {
  document.querySelectorAll('.cart-count').forEach(el => {
    const n = cartCount();
    el.textContent = n; el.style.display = n ? 'flex' : 'none';
  });
}
function addToCart(id, qty) {
  cart[id] = (cart[id] || 0) + (qty || 1);
  saveCart();
}
function setQty(id, qty) {
  if (qty <= 0) delete cart[id]; else cart[id] = qty;
  saveCart();
}
function discount(p) { return Math.round((1 - p.price / p.mrp) * 100); }

function productCard(p) {
  const q = cart[p.id] || 0;
  const badge = p.badge ? `<span class="badge ${p.badge === 'NEW' ? 'new' : 'best'}">${p.badge === 'NEW' ? 'New' : 'Bestseller'}</span>` : '';
  const action = q === 0
    ? `<button class="add-btn" onclick="addToCart('${p.id}');renderCards()">Add</button>`
    : `<div class="stepper"><button onclick="setQty('${p.id}',${q - 1});renderCards()">−</button><span>${q}</span><button onclick="setQty('${p.id}',${q + 1});renderCards()">+</button></div>`;
  return `<div class="card">
    <div class="img-wrap">${badge}<a href="/product.html?id=${p.id}"><img src="${p.img}" alt="${p.name}" loading="lazy"></a></div>
    <div class="body">
      <h3>${p.name}</h3>
      <span class="size">${p.size}</span>
      <div class="rating"><span class="star">★</span> ${p.rating} (${p.ratingCount})</div>
      <div class="price-row"><span class="price">₹${p.price}</span><span class="mrp">₹${p.mrp}</span><span class="off">${discount(p)}% OFF</span></div>
      ${action}
    </div>
  </div>`;
}
document.addEventListener('DOMContentLoaded', updateCartBadge);
