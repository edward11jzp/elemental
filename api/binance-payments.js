// Cobros recibidos por Binance Pay (cuenta de Elemental), con una clave de
// SOLO LECTURA en las variables de Vercel: BINANCE_API_KEY / BINANCE_API_SECRET.
// Binance bloquea servidores de EE. UU. (451): esta función corre en São Paulo (vercel.json).
// Sólo responde a usuarios del panel con permiso «Confirmación de pagos».
import crypto from 'node:crypto';

const SB_URL = process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const configured = () => !!(process.env.BINANCE_API_KEY && process.env.BINANCE_API_SECRET);

async function allowed(token) {
  if (!token || !SB_URL || !SB_KEY) return false;
  const r = await fetch(`${SB_URL}/rest/v1/rpc/can`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_module: 'Confirmación de pagos' }),
  });
  return r.ok && (await r.json()) === true;
}

async function signedGet(path, params = {}) {
  const q = new URLSearchParams({ ...params, recvWindow: '10000', timestamp: String(Date.now()) });
  q.set('signature', crypto.createHmac('sha256', process.env.BINANCE_API_SECRET).update(q.toString()).digest('hex'));
  const r = await fetch(`https://api.binance.com${path}?${q}`, { headers: { 'X-MBX-APIKEY': process.env.BINANCE_API_KEY } });
  const text = await r.text();
  let body; try { body = JSON.parse(text); } catch { body = { msg: text.slice(0, 200) }; }
  if (!r.ok) throw Object.assign(new Error(body.msg || 'HTTP ' + r.status), { status: r.status });
  return body;
}

// La clave no puede mover dinero: si tiene permisos de retiro/trading, se niega a trabajar.
async function readOnly() {
  const p = await signedGet('/sapi/v1/account/apiRestrictions');
  const risky = ['enableWithdrawals', 'enableInternalTransfer', 'permitsUniversalTransfer', 'enableSpotAndMarginTrading',
    'enableMargin', 'enableFutures', 'enableVanillaOptions', 'enablePortfolioMarginTrading', 'enableFixApiTrade'].filter((k) => p[k]);
  return { ok: !!p.enableReading && risky.length === 0, risky };
}

async function incoming(days) {
  const out = [];
  const end = Date.now();
  // Binance Pay devuelve máx. 100 por consulta: se pide por tramos de 24 h.
  for (let t = end - days * 864e5; t < end; t += 864e5) {
    const r = await signedGet('/sapi/v1/pay/transactions', { startTime: String(t), endTime: String(Math.min(end, t + 864e5)), limit: '100' });
    for (const x of r.data || []) {
      if (Number(x.amount) <= 0) continue; // sólo cobros recibidos
      out.push({
        ref: String(x.transactionId), time: x.transactionTime, amount: Number(x.amount), currency: x.currency,
        from: x.payerInfo ? x.payerInfo.name || x.payerInfo.binanceId || '' : '', note: x.note || x.remark || '',
      });
    }
  }
  const seen = new Set();
  return out.filter((p) => (seen.has(p.ref) ? false : seen.add(p.ref))).sort((a, b) => b.time - a.time);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!(await allowed(token))) return res.status(403).json({ error: 'Sin permiso' });
  if (!configured()) return res.status(200).json({ connected: false, payments: [] });
  try {
    const ro = await readOnly();
    if (!ro.ok) return res.status(400).json({ error: 'La clave de Binance puede mover dinero (' + ro.risky.join(', ') + '). Crea una de SOLO LECTURA.' });
    const days = Math.min(30, Math.max(1, Number(req.query.days) || 2));
    res.status(200).json({ connected: true, checkedAt: Date.now(), payments: await incoming(days) });
  } catch (e) {
    res.status(e.status === 451 ? 502 : 500).json({ error: 'Binance: ' + e.message });
  }
}
