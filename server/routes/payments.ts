import { Hono, type Context } from 'hono';
import { all, get, run, tx } from '../db.js';
import { getEnv } from '../env.js';
import { md5, safeEqual } from '../lib/crypto.js';
import { RE } from '../lib/http.js';
import { orders, type OrderRecord } from '../models.js';
import type { AppEnv } from '../types.js';

/**
 * To'lov tizimlari bilan server-server integratsiya.
 * - Payme Merchant API (JSON-RPC 2.0, Basic auth "Paycom:<KEY>")
 * - Click SHOP API (prepare/complete, MD5 imzo)
 * Buyurtma faqat shu webhook'lar orqali "to'langan" deb belgilanadi.
 *
 * MUHIM: Ishga tushirishdan oldin Payme va Click sandbox (test) muhitlarida to'liq sinovdan o'tkazing.
 */
export const paymentRoutes = new Hono<AppEnv>();

const TX_TIMEOUT_MS = 12 * 3600_000;

/* ================================ PAYME ================================ */

type RpcId = string | number | null;

const PAYME_ERRORS: Record<number, { uz: string; ru: string; en: string }> = {
  [-32700]: { uz: "So'rov formati noto'g'ri", ru: 'Ошибка разбора JSON', en: 'Parse error' },
  [-32600]: { uz: "So'rov noto'g'ri", ru: 'Неверный запрос', en: 'Invalid request' },
  [-32601]: { uz: 'Metod topilmadi', ru: 'Метод не найден', en: 'Method not found' },
  [-32504]: { uz: "Ruxsat yo'q", ru: 'Недостаточно привилегий', en: 'Insufficient privilege' },
  [-31001]: { uz: "Summa noto'g'ri", ru: 'Неверная сумма', en: 'Incorrect amount' },
  [-31003]: { uz: 'Tranzaksiya topilmadi', ru: 'Транзакция не найдена', en: 'Transaction not found' },
  [-31008]: { uz: "Amalni bajarib bo'lmaydi", ru: 'Невозможно выполнить операцию', en: 'Unable to perform operation' },
  [-31050]: { uz: 'Buyurtma topilmadi', ru: 'Заказ не найден', en: 'Order not found' },
  [-31051]: { uz: "Buyurtma to'lovni kutmoqda", ru: 'Заказ ожидает оплаты', en: 'Order is awaiting payment' },
  [-31052]: { uz: "Buyurtma allaqachon to'langan yoki bekor qilingan", ru: 'Заказ уже оплачен или отменён', en: 'Order already paid or cancelled' },
};

const rpcOk = (id: RpcId, result: unknown) => ({ jsonrpc: '2.0', id, result });
const rpcErr = (id: RpcId, code: number, data?: string) => ({ jsonrpc: '2.0', id, error: { code, message: PAYME_ERRORS[code] ?? PAYME_ERRORS[-32600], data } });

interface PaymeParams {
  id?: unknown;
  time?: unknown;
  amount?: unknown;
  reason?: unknown;
  from?: unknown;
  to?: unknown;
  account?: { order_id?: unknown };
}

interface PaymeTxRow {
  id: string;
  order_id: string;
  amount: number;
  state: number;
  time: number;
  create_time: number;
  perform_time: number;
  cancel_time: number;
  reason: number | null;
}

function paymeCheckOrder(params: PaymeParams): { order: OrderRecord } | { code: number } {
  const orderId = params.account?.order_id;
  if (typeof orderId !== 'string' || !RE.orderId.test(orderId)) return { code: -31050 };
  const order = orders.byId(orderId);
  if (!order || order.paymentMethod !== 'payme') return { code: -31050 };
  if (order.paymentStatus !== 'pending' || order.status === 'cancelled') return { code: -31052 };
  if (typeof params.amount !== 'number' || params.amount !== order.total * 100) return { code: -31001 };
  return { order };
}

const txView = (t: PaymeTxRow) => ({
  create_time: t.create_time,
  perform_time: t.perform_time,
  cancel_time: t.cancel_time,
  transaction: t.id,
  state: t.state,
  reason: t.reason,
});

const findTx = (id: string) => get<PaymeTxRow>('SELECT * FROM payme_tx WHERE id = ?', [id]);

paymentRoutes.post('/payme', async (c) => {
  const env = getEnv();
  let req: { id?: RpcId; method?: unknown; params?: PaymeParams };
  try {
    req = JSON.parse(await c.req.text()) as typeof req;
  } catch {
    return c.json(rpcErr(null, -32700));
  }
  const id: RpcId = typeof req.id === 'number' || typeof req.id === 'string' ? req.id : null;
  const expected = `Basic ${Buffer.from(`Paycom:${env.PAYME_KEY ?? ''}`).toString('base64')}`;
  if (!env.payme || !safeEqual(c.req.header('authorization') ?? '', expected)) return c.json(rpcErr(id, -32504));

  const params: PaymeParams = req.params && typeof req.params === 'object' ? req.params : {};
  const now = Date.now();

  switch (req.method) {
    case 'CheckPerformTransaction': {
      const r = paymeCheckOrder(params);
      return c.json('code' in r ? rpcErr(id, r.code) : rpcOk(id, { allow: true }));
    }
    case 'CreateTransaction': {
      if (typeof params.id !== 'string' || params.id.length > 64 || typeof params.time !== 'number') return c.json(rpcErr(id, -32600));
      const txId = params.id;
      const time = params.time;
      return c.json(
        tx(() => {
          const existing = findTx(txId);
          if (existing) {
            if (existing.state !== 1) return rpcErr(id, -31008);
            if (now - existing.create_time > TX_TIMEOUT_MS) {
              run('UPDATE payme_tx SET state = -1, cancel_time = ?, reason = 4 WHERE id = ? AND state = 1', [now, existing.id]);
              return rpcErr(id, -31008);
            }
            return rpcOk(id, { create_time: existing.create_time, transaction: existing.id, state: 1 });
          }
          const r = paymeCheckOrder(params);
          if ('code' in r) return rpcErr(id, r.code);
          if (get('SELECT id FROM payme_tx WHERE order_id = ? AND state = 1', [r.order.id])) return rpcErr(id, -31051);
          run('INSERT INTO payme_tx (id, order_id, amount, state, time, create_time, perform_time, cancel_time, reason) VALUES (?, ?, ?, 1, ?, ?, 0, 0, NULL)', [
            txId,
            r.order.id,
            params.amount as number,
            time,
            now,
          ]);
          return rpcOk(id, { create_time: now, transaction: txId, state: 1 });
        }),
      );
    }
    case 'PerformTransaction': {
      if (typeof params.id !== 'string') return c.json(rpcErr(id, -32600));
      const txId = params.id;
      return c.json(
        tx(() => {
          const t = findTx(txId);
          if (!t) return rpcErr(id, -31003);
          if (t.state === 2) return rpcOk(id, { transaction: t.id, perform_time: t.perform_time, state: 2 });
          if (t.state !== 1) return rpcErr(id, -31008);
          if (now - t.create_time > TX_TIMEOUT_MS) {
            run('UPDATE payme_tx SET state = -1, cancel_time = ?, reason = 4 WHERE id = ? AND state = 1', [now, t.id]);
            return rpcErr(id, -31008);
          }
          if (!run('UPDATE payme_tx SET state = 2, perform_time = ? WHERE id = ? AND state = 1', [now, t.id])) return rpcErr(id, -31008);
          orders.setPaymentStatus(t.order_id, 'pending', 'paid');
          return rpcOk(id, { transaction: t.id, perform_time: now, state: 2 });
        }),
      );
    }
    case 'CancelTransaction': {
      if (typeof params.id !== 'string') return c.json(rpcErr(id, -32600));
      const txId = params.id;
      const reason = typeof params.reason === 'number' ? params.reason : null;
      return c.json(
        tx(() => {
          const t = findTx(txId);
          if (!t) return rpcErr(id, -31003);
          if (t.state === 1 || t.state === 2) {
            const newState = t.state === 1 ? -1 : -2;
            run('UPDATE payme_tx SET state = ?, cancel_time = ?, reason = ? WHERE id = ? AND state = ?', [newState, now, reason, t.id, t.state]);
            if (t.state === 2) orders.setPaymentStatus(t.order_id, 'paid', 'cancelled');
            return rpcOk(id, { transaction: t.id, cancel_time: now, state: newState });
          }
          return rpcOk(id, { transaction: t.id, cancel_time: t.cancel_time, state: t.state });
        }),
      );
    }
    case 'CheckTransaction': {
      if (typeof params.id !== 'string') return c.json(rpcErr(id, -32600));
      const t = findTx(params.id);
      return c.json(t ? rpcOk(id, txView(t)) : rpcErr(id, -31003));
    }
    case 'GetStatement': {
      if (typeof params.from !== 'number' || typeof params.to !== 'number') return c.json(rpcErr(id, -32600));
      const list = all<PaymeTxRow>('SELECT * FROM payme_tx WHERE create_time BETWEEN ? AND ? LIMIT 1000', [params.from, params.to]);
      return c.json(rpcOk(id, { transactions: list.map((t) => ({ id: t.id, time: t.time, amount: t.amount, account: { order_id: t.order_id }, ...txView(t) })) }));
    }
    default:
      return c.json(rpcErr(id, -32601));
  }
});

/* ================================ CLICK ================================ */

async function clickFields(c: Context<AppEnv>): Promise<Record<string, string>> {
  const form = await c.req.parseBody();
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(form)) if (typeof v === 'string') out[k] = v.slice(0, 200);
  return out;
}

const clickReply = (f: Record<string, string>, error: number, note: string, extra: Record<string, unknown> = {}) => ({
  click_trans_id: f.click_trans_id,
  merchant_trans_id: f.merchant_trans_id,
  ...extra,
  error,
  error_note: note,
});

function clickCheckOrder(f: Record<string, string>): { order: OrderRecord } | { error: number; note: string } {
  if (!RE.orderId.test(f.merchant_trans_id ?? '')) return { error: -5, note: 'Order not found' };
  const order = orders.byId(f.merchant_trans_id);
  if (!order || order.paymentMethod !== 'click') return { error: -5, note: 'Order not found' };
  if (order.paymentStatus === 'paid') return { error: -4, note: 'Already paid' };
  if (order.status === 'cancelled' || order.paymentStatus === 'cancelled') return { error: -9, note: 'Transaction cancelled' };
  const amount = Number(f.amount);
  if (!Number.isFinite(amount) || Math.abs(amount - order.total) > 0.01) return { error: -2, note: 'Incorrect parameter amount' };
  return { order };
}

interface ClickTxRow {
  id: string;
  order_id: string;
  prepare_id: number;
  status: string;
}

paymentRoutes.post('/click/prepare', async (c) => {
  const env = getEnv();
  const f = await clickFields(c);
  if (!env.click) return c.json(clickReply(f, -8, 'Error in request from click'));
  const sign = md5(`${f.click_trans_id}${f.service_id}${env.CLICK_SECRET_KEY}${f.merchant_trans_id}${f.amount}${f.action}${f.sign_time}`);
  if (!f.sign_string || !safeEqual(sign, f.sign_string)) return c.json(clickReply(f, -1, 'SIGN CHECK FAILED!'));
  if (f.service_id !== env.CLICK_SERVICE_ID) return c.json(clickReply(f, -8, 'Error in request from click'));
  if (f.action !== '0') return c.json(clickReply(f, -3, 'Action not found'));
  return c.json(
    tx(() => {
      const r = clickCheckOrder(f);
      if ('error' in r) return clickReply(f, r.error, r.note);
      const existing = get<ClickTxRow>('SELECT * FROM click_tx WHERE id = ?', [f.click_trans_id]);
      let prepareId = existing?.prepare_id;
      if (!prepareId) {
        run('INSERT INTO counters (id, seq) VALUES (?, 1) ON CONFLICT(id) DO UPDATE SET seq = seq + 1', ['clickPrepare']);
        prepareId = get<{ seq: number }>('SELECT seq FROM counters WHERE id = ?', ['clickPrepare'])?.seq ?? Date.now();
        run("INSERT INTO click_tx (id, order_id, amount, prepare_id, status, created_at) VALUES (?, ?, ?, ?, 'prepared', ?)", [
          f.click_trans_id,
          r.order.id,
          r.order.total,
          prepareId,
          Date.now(),
        ]);
      }
      return clickReply(f, 0, 'Success', { merchant_prepare_id: prepareId });
    }),
  );
});

paymentRoutes.post('/click/complete', async (c) => {
  const env = getEnv();
  const f = await clickFields(c);
  if (!env.click) return c.json(clickReply(f, -8, 'Error in request from click'));
  const sign = md5(`${f.click_trans_id}${f.service_id}${env.CLICK_SECRET_KEY}${f.merchant_trans_id}${f.merchant_prepare_id}${f.amount}${f.action}${f.sign_time}`);
  if (!f.sign_string || !safeEqual(sign, f.sign_string)) return c.json(clickReply(f, -1, 'SIGN CHECK FAILED!'));
  if (f.service_id !== env.CLICK_SERVICE_ID) return c.json(clickReply(f, -8, 'Error in request from click'));
  if (f.action !== '1') return c.json(clickReply(f, -3, 'Action not found'));

  return c.json(
    tx(() => {
      const t = get<ClickTxRow>('SELECT * FROM click_tx WHERE id = ?', [f.click_trans_id ?? '']);
      if (!t || String(t.prepare_id) !== f.merchant_prepare_id || t.order_id !== f.merchant_trans_id) return clickReply(f, -6, 'Transaction does not exist');
      if (t.status === 'completed') return clickReply(f, -4, 'Already paid');
      if (t.status === 'cancelled') return clickReply(f, -9, 'Transaction cancelled');
      // Click to'lov amalga oshmaganini bildirsa (error < 0) — tranzaksiyani bekor qilamiz
      if (Number(f.error) < 0) {
        run("UPDATE click_tx SET status = 'cancelled' WHERE id = ? AND status = 'prepared'", [t.id]);
        return clickReply(f, -9, 'Transaction cancelled');
      }
      const r = clickCheckOrder(f);
      if ('error' in r) return clickReply(f, r.error, r.note);
      if (!run("UPDATE click_tx SET status = 'completed' WHERE id = ? AND status = 'prepared'", [t.id])) return clickReply(f, -4, 'Already paid');
      orders.setPaymentStatus(t.order_id, 'pending', 'paid');
      return clickReply(f, 0, 'Success', { merchant_confirm_id: t.prepare_id });
    }),
  );
});
