import 'dotenv/config';
import crypto from 'crypto';

const URL = 'http://localhost:5000/api/orders/webhook';
const body = JSON.stringify({ event: 'charge.success', data: { reference: 'abc123', amount: 1500 } });
const sign = (b) =>
  crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(b).digest('hex');

const send = async (label, payload, headers = {}) => {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: payload,
  });
  console.log(label.padEnd(20), res.status, await res.text());
};

const goodSig = sign(body);
await send('valid', body, { 'x-paystack-signature': goodSig });
await send('missing signature', body);
await send('wrong signature', body, { 'x-paystack-signature': 'wrong' });
await send('tampered body', body.replace('1500', '1'), { 'x-paystack-signature': goodSig });