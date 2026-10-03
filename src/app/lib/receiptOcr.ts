// Lector de facturas: comprime la foto, la lee con Tesseract (en el navegador)
// y propone los datos del gasto. Nada sale del navegador salvo la descarga del lector.
import type { ExpenseType } from './adminData';

export function compressImage(file: File, max = 1600, q = 0.8): Promise<string> {
  return new Promise((ok, fail) => {
    const fr = new FileReader();
    fr.onerror = () => fail(new Error('No se pudo leer el archivo'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => fail(new Error('El archivo no es una imagen válida'));
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        const x = c.getContext('2d')!;
        x.fillStyle = '#fff';
        x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, 0, 0, c.width, c.height);
        ok(c.toDataURL('image/jpeg', q));
      };
      img.src = fr.result as string;
    };
    fr.readAsDataURL(file);
  });
}

let loading: Promise<void> | null = null;
function loadTesseract(): Promise<void> {
  if ((window as any).Tesseract) return Promise.resolve();
  if (!loading) {
    loading = new Promise((ok, fail) => {
      const sc = document.createElement('script');
      sc.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      sc.onload = () => ok();
      sc.onerror = () => {
        loading = null;
        fail(new Error('No se pudo cargar el lector'));
      };
      document.head.appendChild(sc);
    });
  }
  return loading;
}

export async function readReceipt(image: string, onProgress: (pct: number) => void): Promise<string> {
  await loadTesseract();
  const r = await (window as any).Tesseract.recognize(image, 'spa', {
    logger: (m: any) => m.status === 'recognizing text' && onProgress(Math.round(m.progress * 100)),
  });
  return r?.data?.text ?? '';
}

// Número en formato venezolano o gringo: 1.234,56 · 1,234.56 · 12.500 · 45,5
export function parseMoney(str: string): number {
  let t = String(str).replace(/[^\d.,]/g, '');
  if (!t) return 0;
  const lc = t.lastIndexOf(','), ld = t.lastIndexOf('.');
  if (lc > -1 && ld > -1) {
    const dec = lc > ld ? ',' : '.';
    t = t.split(dec === '.' ? ',' : '.').join('');
    t = t.replace(dec, '.');
  } else if (lc > -1) {
    t = /,\d{1,2}$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  } else if (ld > -1) {
    const parts = t.split('.');
    t = parts.length > 2 || /\.\d{3}$/.test(t) ? t.replace(/\./g, '') : t;
  }
  const n = parseFloat(t);
  return isFinite(n) ? n : 0;
}

export interface ReceiptGuess {
  amountUsd: number;
  bs: number;
  date: string;
  supplier: string;
  type: ExpenseType | '';
  category: string;
  description: string;
}

export function parseReceipt(text: string, rate: number, today: string): ReceiptGuess {
  const raw = String(text || ''), low = raw.toLowerCase();
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const numRe = /(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+[.,]\d{1,2}|\d+)/g;

  // Monto: la última línea de "total" que no sea subtotal; si no, el número más grande con decimales.
  let amount = 0, amountLine = '';
  const totalLines = lines.filter((l) => /(total|monto|importe|a pagar|pagado|neto)/i.test(l) && !/sub\s*-?\s*total/i.test(l));
  for (const l of totalLines) {
    const nums = (l.match(numRe) || []).map(parseMoney).filter((x) => x > 0);
    if (nums.length) { amount = Math.max(...nums); amountLine = l; }
  }
  if (!amount) {
    const all = (raw.match(/\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\b/g) || []).map(parseMoney);
    if (all.length) amount = Math.max(...all);
  }

  // Moneda: Bs si lo dice la línea del total o el documento, o si el monto es muy grande para ser $.
  const saysUsd = /(\$|usd|us\$|d[oó]lar)/i.test(amountLine);
  const saysBs = /\bbs\.?|bol[ií]var|ves\b/i.test(amountLine) || (!saysUsd && /\bbs\.?\s*\d|bol[ií]vares/i.test(low));
  let bs = 0, amountUsd = 0;
  if (amount) {
    if (saysBs || (!saysUsd && amount >= 1000)) {
      bs = Math.round(amount * 100) / 100;
      amountUsd = rate ? Math.round((amount / rate) * 100) / 100 : 0;
    } else amountUsd = Math.round(amount * 100) / 100;
  }

  // Fecha dd/mm/aaaa (Venezuela) o aaaa-mm-dd; nunca en el futuro.
  let date = '';
  const m1 = raw.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/), m2 = raw.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (m2) date = `${m2[1]}-${m2[2]}-${m2[3]}`;
  else if (m1) {
    const y = m1[3].length === 2 ? '20' + m1[3] : m1[3];
    const d = m1[1].padStart(2, '0'), mo = m1[2].padStart(2, '0');
    if (+mo >= 1 && +mo <= 12 && +d >= 1 && +d <= 31) date = `${y}-${mo}-${d}`;
  }
  if (date && (date > today || date < '2020-01-01')) date = '';

  // Proveedor: la línea antes del RIF, o la primera línea con nombre.
  const generic = /^(factura|fiscal|seniat|rif|nit|recibo|nota|comprobante|fecha|hora|caja|cliente|operaci[oó]n|referencia|pago m[oó]vil|transferencia)\b/i;
  let supplier = '';
  const ri = lines.findIndex((l) => /\b(rif|r\.i\.f)|\b[jvgep]-?\d{6,9}/i.test(l));
  if (ri > 0 && /[a-záéíóúñ]{3}/i.test(lines[ri - 1]) && !generic.test(lines[ri - 1])) supplier = lines[ri - 1];
  if (!supplier) supplier = lines.find((l) => /[a-záéíóúñ]{4}/i.test(l) && !generic.test(l) && !/\d{4,}/.test(l)) || '';
  supplier = supplier.replace(/[^\wáéíóúñÁÉÍÓÚÑ .,&-]/g, '').trim().slice(0, 50);

  // Tipo y categoría por palabras clave (insumos de confección).
  const has = (re: RegExp) => re.test(low);
  let type: ExpenseType | '' = '', category = '';
  if (has(/merma|dañad|defectu|desech|fallid|desperdic|retazo/)) {
    type = 'merma';
    category = has(/tinta/) ? 'Tinta desperdiciada' : has(/estamp|impres/) ? 'Estampado fallido' : has(/retazo|tela/) ? 'Retazos de tela' : 'Material dañado';
  } else if (has(/tela|algod[oó]n|poli[eé]ster|jersey|hilo|tinta|serigraf|vinil|dtf|transfer|etiqueta|bolsa|empaque|bot[oó]n|cierre|cremallera|el[aá]stic|insumo/)) {
    type = 'materia_prima';
    category = has(/tela|algod|poli[eé]ster|jersey/) ? 'Tela' : has(/hilo/) ? 'Hilo' : has(/tinta|serigraf/) ? 'Tinta / Serigrafía' : has(/vinil|dtf|transfer/) ? 'Vinil / DTF'
      : has(/etiqueta/) ? 'Etiquetas' : has(/bolsa|empaque/) ? 'Empaques / Bolsas' : has(/bot[oó]n|cierre|cremallera/) ? 'Botones / Cierres' : 'Otros insumos';
  } else {
    const op: [RegExp, string][] = [
      [/alquiler|arriendo|condominio|canon/, 'Alquiler'],
      [/corpoelec|electric|hidrolago|agua potable|\bgas\b|aseo/, 'Servicios'],
      [/internet|cantv|inter\b|netuno|movistar|digitel|fibra|wifi/, 'Internet'],
      [/gasolina|combustible|taxi|delivery|env[ií]o|mrw|zoom|tealca|transporte|ridery|yummy|flete/, 'Transporte'],
      [/publicidad|instagram|facebook|\bmeta\b|\bads\b|google|anuncio/, 'Publicidad'],
      [/seniat|impuesto|alcald|tributo|patente/, 'Impuestos'],
      [/mantenimiento|reparaci|t[eé]cnico|repuesto|m[aá]quina de coser/, 'Mantenimiento'],
      [/n[oó]mina|sueldo|salario|quincena|bono/, 'Empleados'],
      [/seguro|p[oó]liza/, 'Seguros'],
    ];
    for (const [re, c] of op) if (has(re)) { type = 'operativo'; category = c; break; }
  }

  const items = lines
    .filter((l) => /[a-záéíóúñ]{3}/i.test(l) && !generic.test(l) && l !== supplier && !/(total|iva|rif|fecha|hora|caja|cajero|tel[eé]f|direcci|av\.|calle)/i.test(l))
    .slice(0, 2);
  const clean = (l: string) => l.replace(/[“”"'|]/g, '').replace(/(\s+(bs\.?|\$|usd|x)?\s*[\d.,]+[.,]?)+\s*$/i, '').replace(/\s+/g, ' ').trim();
  const description = (items.map(clean).filter(Boolean).join(' · ') || (supplier ? 'Compra en ' + supplier : '')).slice(0, 80);
  return { amountUsd, bs, date, supplier, type, category, description };
}
