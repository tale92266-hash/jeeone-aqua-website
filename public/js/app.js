// Shared: products, cart (localStorage), header cart count
let PRODUCTS = [];
let cart = {};
try { cart = JSON.parse(localStorage.getItem('jea_cart') || '{}'); } catch (e) { cart = {}; }

async function loadProducts() {
  if (PRODUCTS.length) return PRODUCTS;
  const r = await fetch('/api/products');
  PRODUCTS = await r.json();
  return PRODUCTS;
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
