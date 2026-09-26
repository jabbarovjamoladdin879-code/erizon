import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cartItem, Client, startTestServer, stopTestServer } from './helpers.js';

const PAYME_KEY = 'test-payme-key-123456';
const CLICK_SECRET = 'click-secret-key';

let app: Awaited<ReturnType<typeof startTestServer>>;

beforeAll(async () => {
  app = await startTestServer({
    PAYME_MERCHANT_ID: 'merchant-0000000001',
    PAYME_KEY,
    PAYME_TEST: 'true',
    CLICK_SERVICE_ID: '1111',
    CLICK_MERCHANT_ID: '2222',
    CLICK_SECRET_KEY: CLICK_SECRET,
  });
});
afterAll(stopTestServer);

async function placeOrder(paymentMethod: 'payme' | 'click') {
  const c = await new Client(app).init();
  const r = await c.req<{ order: { id: string; total: number }; paymentUrl: string }>(
    'POST',
    '/api/orders',
    {
      customerName: 'Test',
      phone: '+998901234567',
      deliveryMethod: 'pickup',
      deliveryTime: 'asap',
      paymentMethod,
      items: [cartItem('ff-01', 2)],
    },
    { headers: { 'idempotency-key': randomUUID() } },
  );
  expect(r.status).toBe(201);
  return { client: c, ...r.body };
}

const md5 = (s: string) => createHash('md5').update(s).digest('hex');

describe('Payme Merchant API', () => {
  const rpc = (method: string, params: unknown, auth = `Basic ${Buffer.from(`Paycom:${PAYME_KEY}`).toString('base64')}`) =>
    new Client(app, null).req<{ result?: Record<string, unknown>; error?: { code: number } }>('POST', '/api/payments/payme', { jsonrpc: '2.0', id: 1, method, params }, { headers: { authorization: auth } });

  it('noto\'g\'ri avtorizatsiya — -32504', async () => {
    const r = await rpc('CheckPerformTransaction', {}, 'Basic d3Jvbmc6a2V5');
    expect(r.body.error?.code).toBe(-32504);
  });

  it('to\'liq oqim: tekshirish → yaratish → bajarish → buyurtma to\'langan', async () => {
    const { order, paymentUrl, client } = await placeOrder('payme');
    expect(paymentUrl).toMatch(/^https:\/\/test\.paycom\.uz\//);
    const amount = order.total * 100;
    expect((await rpc('CheckPerformTransaction', { amount: amount - 100, account: { order_id: order.id } })).body.error?.code).toBe(-31001);
    expect((await rpc('CheckPerformTransaction', { amount, account: { order_id: order.id } })).body.result).toEqual({ allow: true });
    const created = await rpc('CreateTransaction', { id: 'payme-tx-1', time: Date.now(), amount, account: { order_id: order.id } });
    expect(created.body.result?.state).toBe(1);
    // Boshqa tranzaksiya shu buyurtma uchun yaratilmaydi
    expect((await rpc('CreateTransaction', { id: 'payme-tx-2', time: Date.now(), amount, account: { order_id: order.id } })).body.error?.code).toBe(-31051);
    const performed = await rpc('PerformTransaction', { id: 'payme-tx-1' });
    expect(performed.body.result?.state).toBe(2);
    // Takroriy chaqiruv idempotent
    expect((await rpc('PerformTransaction', { id: 'payme-tx-1' })).body.result?.state).toBe(2);
    expect(await paymentStatusOf(order.id)).toBe('paid');
    expect(client.cookies.size).toBeGreaterThan(0);
    const check = await rpc('CheckTransaction', { id: 'payme-tx-1' });
    expect(check.body.result?.state).toBe(2);
  });
});

describe('Click SHOP API', () => {
  const post = (path: string, fields: Record<string, string>) =>
    new Client(app, null).req<Record<string, unknown>>('POST', path, undefined, {
      raw: new URLSearchParams(fields).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });

  it('imzo noto\'g\'ri — -1', async () => {
    const r = await post('/api/payments/click/prepare', { click_trans_id: '1', service_id: '1111', merchant_trans_id: 'EM-AAAAAAAA', amount: '1000', action: '0', sign_time: 'x', sign_string: 'bad' });
    expect(r.body.error).toBe(-1);
  });

  it('prepare → complete → buyurtma to\'langan; summa noto\'g\'ri bo\'lsa rad', async () => {
    const { order } = await placeOrder('click');
    const base = { click_trans_id: '555', service_id: '1111', click_paydoc_id: '9', merchant_trans_id: order.id, sign_time: '2026-09-26 10:00:00', error: '0', error_note: 'ok' };
    const wrongAmount = String(order.total - 1);
    const bad = await post('/api/payments/click/prepare', {
      ...base,
      amount: wrongAmount,
      action: '0',
      sign_string: md5(`555${'1111'}${CLICK_SECRET}${order.id}${wrongAmount}0${base.sign_time}`),
    });
    expect(bad.body.error).toBe(-2);

    const amount = String(order.total);
    const prep = await post('/api/payments/click/prepare', {
      ...base,
      amount,
      action: '0',
      sign_string: md5(`555${'1111'}${CLICK_SECRET}${order.id}${amount}0${base.sign_time}`),
    });
    expect(prep.body.error).toBe(0);
    const prepareId = String(prep.body.merchant_prepare_id);
    const done = await post('/api/payments/click/complete', {
      ...base,
      amount,
      action: '1',
      merchant_prepare_id: prepareId,
      sign_string: md5(`555${'1111'}${CLICK_SECRET}${order.id}${prepareId}${amount}1${base.sign_time}`),
    });
    expect(done.body.error).toBe(0);
    const again = await post('/api/payments/click/complete', {
      ...base,
      amount,
      action: '1',
      merchant_prepare_id: prepareId,
      sign_string: md5(`555${'1111'}${CLICK_SECRET}${order.id}${prepareId}${amount}1${base.sign_time}`),
    });
    expect(again.body.error).toBe(-4);
    expect(await paymentStatusOf(order.id)).toBe('paid');
  });
});

async function paymentStatusOf(orderId: string): Promise<string | undefined> {
  const admin = await new Client(app).init();
  await admin.req('POST', '/api/auth/login', { phone: '+998900000001', password: 'Admin12345' });
  const r = await admin.req<{ orders: Array<{ id: string; paymentStatus: string }> }>('GET', '/api/admin/orders');
  return r.body.orders.find((o) => o.id === orderId)?.paymentStatus;
}
