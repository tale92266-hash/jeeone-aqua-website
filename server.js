const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;
const ROOT = path.join(__dirname, 'public');
const DATA = path.join(__dirname, 'data');

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.apk': 'application/vnd.android.package-archive',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/plain' });
  res.end(body);
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) { send(res, 404, 'Not found'); return; }
    send(res, 200, data, MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
  });
}

function readBody(req, cb) {
  let b = '';
  req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
  req.on('end', () => cb(b));
}

function getOrders() {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, 'orders.json'), 'utf8')); }
  catch (e) { return []; }
}
function saveOrders(o) {
  fs.writeFileSync(path.join(DATA, 'orders.json'), JSON.stringify(o, null, 2));
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  let p = decodeURIComponent(parsed.pathname);

  // --- API ---
  if (p === '/api/products' && req.method === 'GET') {
    return serveFile(res, path.join(DATA, 'products.json'));
  }
  if (p === '/api/orders' && req.method === 'GET') {
    return send(res, 200, JSON.stringify(getOrders()), 'application/json');
  }
  if (p === '/api/order' && req.method === 'POST') {
    return readBody(req, raw => {
      let body = {};
      try { body = JSON.parse(raw); } catch (e) {}
      const orders = getOrders();
      const id = 'JEA-' + Math.floor(100000 + Math.random() * 900000);
      const order = {
        id, items: body.items || [], total: body.total || 0,
        name: body.name || '', phone: body.phone || '',
        address: body.address || '', slot: body.slot || '',
        payment: body.payment || 'Cash on Delivery',
        placedAt: new Date().toISOString(), status: 'Confirmed'
      };
      orders.unshift(order); saveOrders(orders);
      send(res, 200, JSON.stringify({ ok: true, orderId: id }), 'application/json');
    });
  }
  if (p === '/api/coupons' && req.method === 'GET') {
    return send(res, 200, JSON.stringify([
      { code: 'WELCOME20', title: '20% off first order', desc: 'New customers • Min order ₹149' },
      { code: 'JAR10', title: '₹10 off 20L jar', desc: 'On every 20L jar refill' },
      { code: 'FAMILY15', title: '15% off Family Combo', desc: 'On Family Combo pack' }
    ]), 'application/json');
  }
  if (p === '/api/feedback' && req.method === 'POST') {
    return readBody(req, raw => {
      let body = {};
      try { body = JSON.parse(raw); } catch (e) {}
      const fp = path.join(DATA, 'feedback.json');
      let fb = [];
      try { fb = JSON.parse(fs.readFileSync(fp, 'utf8')); } catch (e) {}
      fb.unshift(body); fs.writeFileSync(fp, JSON.stringify(fb, null, 2));
      send(res, 200, JSON.stringify({ ok: true }), 'application/json');
    });
  }
  if (p === '/api/reviews' && req.method === 'GET') {
    const pid = parsed.query.product || '';
    let rv = [];
    try { rv = JSON.parse(fs.readFileSync(path.join(DATA, 'reviews.json'), 'utf8')); } catch (e) {}
    return send(res, 200, JSON.stringify(rv.filter(r => !pid || r.product === pid)), 'application/json');
  }
  if (p === '/api/review' && req.method === 'POST') {
    return readBody(req, raw => {
      let body = {};
      try { body = JSON.parse(raw); } catch (e) {}
      const fp = path.join(DATA, 'reviews.json');
      let rv = [];
      try { rv = JSON.parse(fs.readFileSync(fp, 'utf8')); } catch (e) {}
      rv.unshift(body); fs.writeFileSync(fp, JSON.stringify(rv, null, 2));
      send(res, 200, JSON.stringify({ ok: true }), 'application/json');
    });
  }
  // --- APK download ---
  if (p === '/download-app') {
    const apk = path.join(ROOT, 'downloads', 'jeevan-aqua.apk');
    if (!fs.existsSync(apk)) {
      return send(res, 404, 'APK not uploaded yet. Please check back soon.', 'text/plain');
    }
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="jeevan-aqua.apk"'
    });
    return fs.createReadStream(apk).pipe(res);
  }
  // --- Static ---
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return serveFile(res, path.join(ROOT, 'index.html'));
    serveFile(res, file);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('JeeOne Aqua website live at http://localhost:' + PORT);
});
