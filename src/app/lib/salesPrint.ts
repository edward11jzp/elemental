// Documentos imprimibles: factura/nota A4, ticket térmico 80 mm y cierre del día.
import logo from 'figma:asset/480ee1658c29520edefebbfe9dcbc0d422f8424b.png';
import type { Sale } from './sales';
import { docLabel, fmt, bsFmt, saleDateLabel } from './sales';
import type { Company } from './adminData';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const logoAbs = () => new URL(logo, location.href).href;

function openAndPrint(html: string, w = 460, h = 800) {
  const win = window.open('', '_blank', `width=${w},height=${h}`);
  if (!win) throw new Error('El navegador bloqueó la ventana. Permite ventanas emergentes.');
  win.document.open();
  win.document.write(html);
  win.document.close();
  const imgs = Array.from(win.document.images).map((i) => (i.complete ? Promise.resolve() : new Promise((r) => { i.onload = i.onerror = r; })));
  Promise.race([Promise.all(imgs), new Promise((r) => setTimeout(r, 3000))]).then(() => {
    win.focus();
    win.print();
  });
}

const lineLabel = (i: Sale['items'][number]) => [i.name, i.size, i.color].filter(Boolean).join(' · ');

/** HTML del documento A4 (también se muestra dentro del modal). */
export function invoiceHtml(s: Sale, co: Company, fallbackRate: number) {
  const rate = s.exchangeRate || fallbackRate || 0;
  const useBs = s.docCurrency === 'BS' && rate > 0;
  const r = rate || 1;
  const f = (v: number) => (useBs ? 'Bs ' + Math.round(v * r).toLocaleString('es-VE') : fmt(v));
  const totalBs = Math.round(s.totalBs || s.total * r);
  const td = 'padding:8px;border-bottom:1px solid #eee';
  const rows = s.items
    .map(
      (i) => `<tr><td style="${td}">${esc(lineLabel(i))}</td><td style="${td};text-align:center">${i.qty}</td>
      <td style="${td};text-align:right">${f(i.price)}</td><td style="${td};text-align:right">${f(i.price * i.qty)}</td></tr>`,
    )
    .join('');
  return `<div id="invoiceDoc" style="background:#fff;color:#111;border-radius:12px;padding:28px;font-size:13px;font-family:Inter,Arial,sans-serif">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:14px">
      <img src="${logoAbs()}" style="height:40px;filter:invert(1) grayscale(1)" alt="Elemental">
      <div style="text-align:right">
        <div style="font-weight:800;font-size:18px;text-transform:uppercase">${esc(docLabel(s.doc))}</div>
        <div style="color:#666"># ${esc(s.id)}</div>
        <div style="color:#666">${esc(saleDateLabel(s.date))}</div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:14px">
      <div>
        <div style="font-weight:700">${esc(co.name)}</div>
        ${co.rif ? `<div style="color:#666">${esc(co.rif)}</div>` : ''}
        ${co.address ? `<div style="color:#666">${esc(co.address)}</div>` : ''}
        ${co.phone ? `<div style="color:#666">${esc(co.phone)}</div>` : ''}
      </div>
      <div style="text-align:right">
        <div style="color:#999;text-transform:uppercase;font-size:11px;letter-spacing:.1em">Cliente</div>
        <div style="font-weight:700">${esc(s.customer || 'Consumidor final')}</div>
        ${s.email ? `<div style="color:#666">${esc(s.email)}</div>` : ''}
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
      <thead><tr style="background:#f4f4f4">
        <th style="padding:8px;text-align:left">Producto</th><th style="padding:8px;text-align:center">Cant.</th>
        <th style="padding:8px;text-align:right">P. Unit.</th><th style="padding:8px;text-align:right">Importe</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-end"><div style="width:260px">
      <div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:#666">Subtotal</span><span>${f(s.subtotal)}</span></div>
      ${s.discount ? `<div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:#666">Descuento</span><span>-${f(s.discount)}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:#666">IVA (${s.taxRate}%)</span><span>${f(s.tax)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid #111;font-weight:800;font-size:16px"><span>TOTAL</span><span>${useBs ? 'Bs ' + totalBs.toLocaleString('es-VE') : fmt(s.total)}</span></div>
    </div></div>
    ${s.notes ? `<div style="margin-top:14px;color:#666"><b>Notas:</b> ${esc(s.notes)}</div>` : ''}
    <div style="margin-top:18px;text-align:center;border-top:1px solid #eee;padding-top:12px">
      <div style="font-size:12px;font-weight:600">Gracias por tu compra.</div>
      <div style="font-size:11px;color:#666;margin-top:3px">Elemental · Redefine tu estilo.</div>
      <div style="font-size:10px;color:#999;margin-top:8px">${esc(co.name)}${co.email ? ' · ' + esc(co.email) : ''}</div>
    </div>
  </div>`;
}

export function printInvoice(s: Sale, co: Company, fallbackRate: number) {
  openAndPrint(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(docLabel(s.doc))} ${esc(s.id)}</title>
    <style>@page{size:A4;margin:14mm}html,body{margin:0;padding:0;background:#fff}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    #invoiceDoc{border-radius:0!important;padding:0!important;max-width:720px;margin:0 auto}</style></head>
    <body>${invoiceHtml(s, co, fallbackRate)}</body></html>`,
    800,
    900,
  );
}

const TICKET_CSS = `@page{size:80mm 297mm;margin:4mm}html,body{margin:0;padding:0;background:#fff;color:#000}
  body{width:72mm;max-width:72mm;font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.35}
  .c{text-align:center}.b{font-weight:700}.huge{font-size:19px}.tiny{font-size:10px;color:#333}
  .hr{border-top:1px dashed #000;margin:6px 0}.r{display:flex;justify-content:space-between;gap:6px}.r span:first-child{flex:1}
  .sub{color:#333;font-size:11px;padding-left:4px}.box{border:2px solid #000;padding:6px 7px;margin:6px 0}
  .lbl{font-size:10px;letter-spacing:1px}.sec{font-weight:700;margin-top:6px}
  img{width:38mm;display:block;margin:0 auto 4px;filter:invert(1) grayscale(1)}`;

export function printTicket(s: Sale, co: Company, fallbackRate: number) {
  const rate = s.exchangeRate || fallbackRate || 0;
  const useBs = s.docCurrency === 'BS' && rate > 0;
  const r = rate || 1;
  const f = (v: number) => (useBs ? 'Bs ' + Math.round(v * r).toLocaleString('es-VE') : fmt(v));
  const totalBs = Math.round(s.totalBs || s.total * r);
  const totalLabel =
    s.pay === 'pendiente' ? 'TOTAL A PAGAR' : s.pay === 'parcial' ? 'TOTAL DE LA COMPRA' : s.pay === 'reembolsado' ? 'TOTAL REEMBOLSADO' : s.pay === 'cancelado' ? 'TOTAL ANULADO' : 'TOTAL PAGADO';
  const rows = s.items
    .map((i) => `<div class="r"><span>${esc(lineLabel(i))}</span></div><div class="r sub"><span>${i.qty} x ${f(i.price)}</span><span>${f(i.price * i.qty)}</span></div>`)
    .join('');
  openAndPrint(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Ticket ${esc(s.id)}</title><style>${TICKET_CSS}</style></head><body>
    <img src="${logoAbs()}" alt="Elemental">
    <div class="c b">${esc(co.name)}</div>
    ${co.rif ? `<div class="c">${esc(co.rif)}</div>` : ''}${co.address ? `<div class="c">${esc(co.address)}</div>` : ''}${co.phone ? `<div class="c">${esc(co.phone)}</div>` : ''}
    <div class="hr"></div>
    <div class="r"><span class="b">${esc(docLabel(s.doc).toUpperCase())}</span><span>${esc(s.id)}</span></div>
    <div>${esc(saleDateLabel(s.date))}</div>
    <div>Cliente: ${esc(s.customer || 'Consumidor final')}</div>
    <div class="hr"></div>${rows}<div class="hr"></div>
    <div class="r"><span>Subtotal</span><span>${f(s.subtotal)}</span></div>
    ${s.discount ? `<div class="r"><span>Descuento</span><span>-${f(s.discount)}</span></div>` : ''}
    <div class="r"><span>IVA ${s.taxRate}%</span><span>${f(s.tax)}</span></div>
    <div class="box c"><div class="lbl">${totalLabel}</div>
      <div class="b huge">${useBs ? 'Bs ' + totalBs.toLocaleString('es-VE') : fmt(s.total)}</div>
      <div class="tiny">${useBs ? 'equivale a ' + fmt(s.total) : rate > 0 ? 'equivale a Bs ' + totalBs.toLocaleString('es-VE') : ''}</div></div>
    ${rate > 0 ? `<div class="c tiny">Tasa BCV: Bs ${Number(r).toLocaleString('es-VE')} / $</div>` : ''}
    ${s.notes ? `<div class="hr"></div><div>${esc(s.notes)}</div>` : ''}
    <div class="hr"></div><div class="c b">Gracias por tu compra.</div><div class="c">Elemental · Redefine tu estilo.</div>
    <div class="hr"></div>${co.email ? `<div class="c">${esc(co.email)}</div>` : ''}<div class="c">elementalfabrica.com</div>
  </body></html>`);
}

export interface CloseReport {
  from: string;
  to: string;
  isRange: boolean;
  periodLabel: string;
  generatedAt: string;
  hideCosts: boolean;
  rates: number[];
  counts: { issued: number; voided: number; quotes: number };
  totals: {
    usd: number; bs: number; subtotal: number; discount: number; tax: number; units: number; avgTicket: number;
    collectedUsd: number; pendingUsd: number; voidedUsd: number; cost: number; profit: number;
  };
  byDay: { date: string; count: number; usd: number; bs: number; profit: number }[];
  byMethod: { method: string; label: string; count: number; usd: number; bs: number }[];
  byUser: { user: string; count: number; usd: number }[];
  products: { name: string; qty: number; usd: number }[];
  pendingList: { id: string; customer: string; total: number }[];
  voidedList: { id: string; customer: string; total: number; reason: string; by: string; at: string }[];
}

export function rateText(d: CloseReport) {
  if (!d.rates.length) return 'Sin tasa registrada';
  const mn = Math.min(...d.rates), mx = Math.max(...d.rates);
  if (mn === mx) return 'Tasa: Bs ' + Math.round(mn).toLocaleString('es-VE') + ' / $';
  return 'Tasas entre Bs ' + Math.round(mn).toLocaleString('es-VE') + ' y ' + Math.round(mx).toLocaleString('es-VE');
}

export function printDailyClose(d: CloseReport, co: Company) {
  const t = d.totals, c = d.counts;
  const row = (a: string, b: string | number) => `<div class="r"><span>${esc(a)}</span><span>${esc(b)}</span></div>`;
  openAndPrint(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${d.isRange ? 'Reporte ' + d.from + ' a ' + d.to : 'Cierre ' + d.from}</title><style>${TICKET_CSS}</style></head><body>
    <img src="${logoAbs()}" alt="Elemental">
    <div class="c b">${esc(co.name)}</div>${co.rif ? `<div class="c tiny">${esc(co.rif)}</div>` : ''}
    <div class="hr"></div>
    <div class="c b">${d.isRange ? 'REPORTE DE VENTAS' : 'CIERRE DEL DIA'}</div>
    <div class="c tiny">${esc(d.periodLabel)}</div><div class="c tiny">Generado: ${esc(d.generatedAt)}</div>
    <div class="hr"></div>
    ${row('Documentos emitidos', c.issued)}${row('Unidades vendidas', t.units)}${row('Ticket promedio', fmt(t.avgTicket))}
    ${c.voided ? row('Anuladas', c.voided + ' (' + fmt(t.voidedUsd) + ')') : ''}${c.quotes ? row('Cotizaciones', c.quotes) : ''}
    <div class="hr"></div>
    ${row('Subtotal', fmt(t.subtotal))}${t.discount ? row('Descuentos', '-' + fmt(t.discount)) : ''}${row('IVA', fmt(t.tax))}
    <div class="box c"><div class="lbl">TOTAL VENDIDO</div><div class="b huge">${fmt(t.usd)}</div><div class="tiny">${bsFmt(t.bs)}</div></div>
    <div class="c tiny">${esc(rateText(d))}</div>
    ${d.isRange ? `<div class="hr"></div><div class="sec">VENTAS POR DIA</div>${d.byDay.map((x) => row(x.date.slice(8, 10) + '/' + x.date.slice(5, 7) + ' (' + x.count + ')', fmt(x.usd)) + `<div class="tiny" style="text-align:right">${bsFmt(x.bs)}</div>`).join('') || '<div class="tiny">—</div>'}` : ''}
    <div class="hr"></div><div class="sec">COBRADO POR MEDIO</div>
    ${d.byMethod.length ? d.byMethod.map((m) => row(m.label + ' (' + m.count + ')', fmt(m.usd)) + `<div class="tiny" style="text-align:right">${bsFmt(m.bs)}</div>`).join('') : '<div class="tiny">Sin cobros registrados.</div>'}
    <div class="hr"></div>${row('Total cobrado', fmt(t.collectedUsd))}${t.pendingUsd ? row('Por cobrar', fmt(t.pendingUsd)) : ''}
    <div class="hr"></div>
    ${d.hideCosts ? '' : `<div class="sec">RESULTADO</div>${row('Costo de lo vendido', fmt(t.cost))}${row('Ganancia bruta', fmt(t.profit))}<div class="hr"></div>`}
    <div class="sec">POR VENDEDOR</div>${d.byUser.map((u) => row(u.user + ' (' + u.count + ')', fmt(u.usd))).join('') || '<div class="tiny">—</div>'}
    <div class="hr"></div><div class="sec">MAS VENDIDO</div>${d.products.slice(0, 8).map((p) => row(p.qty + 'x ' + p.name.slice(0, 22), fmt(p.usd))).join('') || '<div class="tiny">—</div>'}
    ${d.pendingList.length ? `<div class="hr"></div><div class="sec">PENDIENTES DE COBRO</div>${d.pendingList.map((p) => row(p.id, fmt(p.total))).join('')}` : ''}
    <div class="hr"></div><div class="r"><span>Firma</span><span>__________________</span></div><div style="height:10px"></div>
    ${co.email ? `<div class="c tiny">${esc(co.email)}</div>` : ''}
  </body></html>`);
}
