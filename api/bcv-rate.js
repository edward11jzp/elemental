// Tasa oficial del BCV (dólar y euro), leída de la portada de bcv.org.ve.
// El certificado del BCV suele estar mal configurado: esta lectura de un dato
// público no valida TLS. Si falla, usa un espejo público (ve.dolarapi.com).
import https from 'node:https';

const numVE = (t) => Number(String(t).replace(/\./g, '').replace(',', '.'));

function getBcvHtml() {
  return new Promise((resolve, reject) => {
    const req = https.get('https://www.bcv.org.ve/', { rejectUnauthorized: false, timeout: 12000 }, (r) => {
      let body = '';
      r.on('data', (c) => { body += c; });
      r.on('end', () => resolve(body));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

async function fetchRates() {
  try {
    const html = await getBcvHtml();
    const pick = (id) => {
      const blk = html.match(new RegExp('id="' + id + '"([\\s\\S]{0,800}?)<\\/div>\\s*<\\/div>'));
      const n = blk && blk[1].match(/([0-9]{1,6},[0-9]{2,10})/);
      return n ? numVE(n[1]) : 0;
    };
    const usd = pick('dolar');
    const eur = pick('euro');
    const date = html.match(/content="(\d{4}-\d{2}-\d{2})/);
    if (usd > 0) return { usd, eur, date: date ? date[1] : null, source: 'bcv.org.ve' };
  } catch { /* espejo */ }
  try {
    const r = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', { signal: AbortSignal.timeout(10000) });
    const d = await r.json();
    if (d && d.promedio) {
      return { usd: Number(d.promedio), eur: 0, date: (d.fechaActualizacion || '').slice(0, 10), source: 've.dolarapi.com (espejo del BCV)' };
    }
  } catch { /* sin datos */ }
  return null;
}

export default async function handler(_req, res) {
  const data = await fetchRates();
  if (!data) return res.status(502).json({ error: 'No se pudo consultar el BCV' });
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=600');
  res.status(200).json(data);
}
