// Cobros por Zelle leídos de los avisos que Chase manda por correo
// («You received money with Zelle®»).
//
// Un filtro del correo personal reenvía esos avisos al buzón de la tienda
// (GMAIL_USER); esta función sólo LEE ese buzón, nunca escribe ni borra.
//
// Seguridad: cualquiera podría escribir un correo con ese asunto, así que sólo
// se aceptan los que traen la firma DKIM válida de chase.com. Gmail la comprueba
// al recibirlos y la anota en Authentication-Results; el reenvío la conserva.
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const SB_URL = process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const configured = () => !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

async function allowed(token) {
  if (!token || !SB_URL || !SB_KEY) return false;
  const r = await fetch(`${SB_URL}/rest/v1/rpc/can`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_module: 'Confirmación de pagos' }),
  });
  return r.ok && (await r.json()) === true;
}

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

// Texto del aviso de Chase → datos del cobro. Null si no es un aviso de cobro.
export function parseChaseZelle(text) {
  const t = String(text || '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ');
  const from = /([A-ZÁÉÍÓÚÑ0-9][^\n]{0,80}?)\s+sent you money/i.exec(t);
  const amount = /Amount\s*\$?\s*([\d,]+\.\d{2})/i.exec(t);
  if (!from || !amount) return null;
  const ref = /Transaction number\s*([A-Z0-9]+)/i.exec(t);
  const sent = /Sent on\s*([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),\s*(\d{4})/i.exec(t);
  // El memo va en la misma línea o en la siguiente; si esa línea viene vacía, no hay memo
  // (no tomar la línea de más abajo).
  const memo = /Memo:?[ \t]*\r?\n?[ \t]*([^\n]*)/i.exec(t);
  const memoText = memo ? memo[1].trim() : '';
  return {
    from: from[1].trim(),
    amount: Number(amount[1].replace(/,/g, '')),
    ref: ref ? ref[1] : '',
    // Chase deja la línea de Memo vacía cuando no hay nota: no tomar la siguiente.
    note: memoText && !/registered with a Zelle|sent you money|Transaction number|^Amount\b/i.test(memoText) ? memoText : '',
    sentOn: sent ? Date.UTC(+sent[3], MONTHS[sent[1].toLowerCase()] ?? 0, +sent[2], 16) : null,
  };
}

// ¿Viene firmado por chase.com? Se mira lo que anotó el correo al recibirlo.
function signedByChase(headers) {
  const auth =
    [].concat(headers.get('authentication-results') || []).join(' ') + ' ' +
    [].concat(headers.get('arc-authentication-results') || []).join(' ');
  return /dkim=pass[^;]*header\.(?:i=@|d=)(?:[\w.-]+\.)?chase\.com/i.test(auth);
}

async function incoming(days) {
  const client = new ImapFlow({
    host: 'imap.gmail.com', port: 993, secure: true, logger: false,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  const items = [];
  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX', { readOnly: true });
    try {
      const uids = await client.search(
        { since: new Date(Date.now() - days * 864e5), subject: 'received money with Zelle' },
        { uid: true },
      );
      for await (const msg of client.fetch(uids.slice(-300), { source: true, internalDate: true }, { uid: true })) {
        const mail = await simpleParser(msg.source);
        if (!signedByChase(mail.headers)) continue; // aviso no verificado: se descarta
        const d = parseChaseZelle(mail.text || '');
        if (!d) continue;
        items.push({
          ref: d.ref || 'Z-' + msg.uid,
          time: d.sentOn ?? (mail.date || msg.internalDate || new Date()).getTime(),
          amount: d.amount,
          currency: 'USD',
          from: d.from,
          note: d.note,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
  const seen = new Set();
  return items.filter((p) => (seen.has(p.ref) ? false : seen.add(p.ref))).sort((a, b) => b.time - a.time);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!(await allowed(token))) return res.status(403).json({ error: 'Sin permiso' });
  if (!configured()) return res.status(200).json({ connected: false, payments: [] });
  try {
    const days = Math.min(30, Math.max(1, Number(req.query.days) || 2));
    res.status(200).json({ connected: true, checkedAt: Date.now(), payments: await incoming(days) });
  } catch (e) {
    res.status(500).json({ error: 'Zelle: ' + e.message });
  }
}
