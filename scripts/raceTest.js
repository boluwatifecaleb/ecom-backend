const BASE = 'http://localhost:5000';
const [email, password] = process.argv.slice(2);

const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');

const fire = (key) =>
  fetch(`${BASE}/api/orders/checkout`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Idempotency-Key': key },
  }).then(async (r) => ({ status: r.status, body: await r.json() }));

const results = await Promise.all([fire(`race-a-${Date.now()}`), fire(`race-b-${Date.now()}`)]);
console.log(results.map((r) => `${r.status} ${r.body.message}`));