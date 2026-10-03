import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Btn, Card, Input, Label, Pills, Stat, Table } from '../../components/admin/ui';
import { addDays, bsFmt, daysBetween, fmt, isValidSale, niceDay, saleCost, todayVe, veDay, type Sale } from '../../lib/sales';
import { accountByKey } from '../../lib/adminData';
import { printDailyClose, rateText, type CloseReport } from '../../lib/salesPrint';
import type { SalesCtx } from '../AdminSales';

type Preset = 'today' | 'yesterday' | 'week' | 'last7' | 'month' | 'lastmonth';

const r2 = (v: number) => Math.round(v * 100) / 100;

function presetRange(p: Preset): [string, string] {
  const today = todayVe();
  const d = new Date(today + 'T12:00:00Z');
  if (p === 'yesterday') return [addDays(today, -1), addDays(today, -1)];
  if (p === 'week') return [addDays(today, -((d.getUTCDay() + 6) % 7)), today]; // desde el lunes
  if (p === 'last7') return [addDays(today, -6), today];
  if (p === 'month') return [today.slice(0, 8) + '01', today];
  if (p === 'lastmonth') {
    const to = addDays(today.slice(0, 8) + '01', -1);
    return [to.slice(0, 8) + '01', to];
  }
  return [today, today];
}

const methodLabel = (k: string | null) => {
  if (!k) return '— sin registrar';
  const a = accountByKey(k);
  return a ? `${a.icon} ${a.name}` : k;
};

export function buildCloseReport(all: Sale[], from: string, to: string, hideCosts: boolean): CloseReport {
  const inRange = all.filter((s) => {
    const d = veDay(s.date);
    return d >= from && d <= to;
  });
  const quotes = inRange.filter((s) => s.doc === 'cotizacion');
  const voided = inRange.filter((s) => s.pay === 'cancelado');
  const valid = inRange.filter(isValidSale);
  const sum = (l: Sale[], f: (s: Sale) => number) => r2(l.reduce((a, s) => a + f(s), 0));
  const bsOf = (s: Sale) => s.totalBs || (s.exchangeRate ? s.total * s.exchangeRate : 0);
  const usd = sum(valid, (s) => s.total);
  const units = valid.reduce((a, s) => a + s.items.reduce((b, i) => b + i.qty, 0), 0);
  const cost = sum(valid, saleCost);
  const collected = valid.filter((s) => s.pay === 'pagado' && s.payMethod !== 'credito');
  // Abonos de créditos del personal recibidos en el período (de cualquier venta).
  const abonos = all.filter((s) => s.pay !== 'cancelado').flatMap((s) => s.payments ?? []).filter((p) => p.method !== 'nomina' && p.date >= from && p.date <= to);
  const abonosUsd = r2(abonos.reduce((a, p) => a + p.amount, 0));

  const byDayMap = new Map<string, { date: string; count: number; usd: number; bs: number; profit: number }>();
  const byMethodMap = new Map<string, { method: string; label: string; count: number; usd: number; bs: number }>();
  const byUserMap = new Map<string, { user: string; count: number; usd: number }>();
  const prodMap = new Map<string, { name: string; qty: number; usd: number }>();
  valid.forEach((s) => {
    const day = veDay(s.date);
    const d = byDayMap.get(day) ?? { date: day, count: 0, usd: 0, bs: 0, profit: 0 };
    d.count++; d.usd += s.total; d.bs += bsOf(s); d.profit += s.subtotal - s.discount - saleCost(s);
    byDayMap.set(day, d);
    if ((s.pay === 'pagado' || s.pay === 'parcial') && s.payMethod !== 'credito') {
      const k = s.payMethod ?? 'sin-registrar';
      const m = byMethodMap.get(k) ?? { method: k, label: methodLabel(s.payMethod), count: 0, usd: 0, bs: 0 };
      m.count++; m.usd += s.total; m.bs += bsOf(s);
      byMethodMap.set(k, m);
    }
    const u = byUserMap.get(s.userName) ?? { user: s.userName || '—', count: 0, usd: 0 };
    u.count++; u.usd += s.total;
    byUserMap.set(s.userName, u);
    s.items.forEach((i) => {
      const p = prodMap.get(i.name) ?? { name: i.name, qty: 0, usd: 0 };
      p.qty += i.qty; p.usd += i.qty * i.price;
      prodMap.set(i.name, p);
    });
  });
  abonos.forEach((p) => {
    const m = byMethodMap.get(p.method) ?? { method: p.method, label: methodLabel(p.method), count: 0, usd: 0, bs: 0 };
    m.count++; m.usd += p.amount; m.bs += p.bs ?? 0;
    byMethodMap.set(p.method, m);
  });
  const rates = [...new Set(valid.map((s) => s.exchangeRate).filter((x) => x > 0))];
  const isRange = from !== to;
  const fmtShort = (iso: string) => niceDay(iso, { day: 'numeric', month: 'short', year: 'numeric' });
  return {
    from,
    to,
    isRange,
    periodLabel: isRange ? `del ${fmtShort(from)} al ${fmtShort(to)}` : niceDay(from),
    generatedAt: new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' }),
    hideCosts,
    rates,
    counts: { issued: valid.length, voided: voided.length, quotes: quotes.length },
    totals: {
      usd,
      bs: sum(valid, bsOf),
      subtotal: sum(valid, (s) => s.subtotal),
      discount: sum(valid, (s) => s.discount),
      tax: sum(valid, (s) => s.tax),
      units,
      avgTicket: valid.length ? r2(usd / valid.length) : 0,
      collectedUsd: r2(sum(collected, (s) => s.total) + abonosUsd),
      pendingUsd: sum(valid.filter((s) => s.pay === 'pendiente' || s.pay === 'parcial'), (s) => s.total),
      voidedUsd: sum(voided, (s) => s.total),
      cost,
      profit: r2(sum(valid, (s) => s.subtotal - s.discount) - cost),
    },
    byDay: [...byDayMap.values()].sort((a, b) => a.date.localeCompare(b.date)).map((x) => ({ ...x, usd: r2(x.usd), profit: r2(x.profit) })),
    byMethod: [...byMethodMap.values()].sort((a, b) => b.usd - a.usd),
    byUser: [...byUserMap.values()].sort((a, b) => b.usd - a.usd),
    products: [...prodMap.values()].sort((a, b) => b.qty - a.qty),
    pendingList: valid.filter((s) => s.pay === 'pendiente' || s.pay === 'parcial').map((s) => ({ id: s.id, customer: s.customer || 'Consumidor final', total: s.total })),
    voidedList: voided.map((s) => ({ id: s.id, customer: s.customer || 'Consumidor final', total: s.total, reason: s.voidInfo?.reason ?? '', by: s.voidInfo?.user ?? '', at: s.voidInfo?.at ?? '' })),
  };
}

export default function CloseTab({ ctx }: { ctx: SalesCtx }) {
  const min = ctx.isAdmin ? '' : addDays(todayVe(), -1);
  const [preset, setPreset] = useState<Preset | null>('today');
  const [[from, to], setRange] = useState<[string, string]>(presetRange('today'));

  const d = useMemo(() => buildCloseReport(ctx.sales, from, to, !ctx.canCosts), [ctx.sales, from, to, ctx.isAdmin]);
  const t = d.totals, c = d.counts;
  const nDays = daysBetween(from, to) + 1;
  const periodo = d.isRange ? 'del período' : 'del día';

  const choose = (p: Preset) => {
    const [f, tt] = presetRange(p);
    if (min && f < min) return toast.error('Puedes ver hoy y ayer.');
    setPreset(p);
    setRange([f, tt]);
  };
  const change = (which: 'from' | 'to', v: string) => {
    let f = which === 'from' ? v || to : from;
    let tt = which === 'to' ? v || from : to;
    if (f > tt) which === 'from' ? (tt = f) : (f = tt);
    if (min) { if (f < min) f = min; if (tt < min) tt = min; }
    setPreset(null);
    setRange([f, tt]);
  };
  const shift = (k: number) => {
    const len = nDays;
    const nf = addDays(from, k * len), nt = addDays(to, k * len);
    if (nf > todayVe() || (min && nf < min)) return;
    setPreset(null);
    setRange([nf, nt > todayVe() ? todayVe() : nt]);
  };

  return (
    <div className="space-y-4">
      <Card className="p-3 flex flex-wrap items-end gap-2">
        <div><Label>Desde</Label><Input type="date" value={from} min={min} max={todayVe()} onChange={(e) => change('from', e.target.value)} /></div>
        <div><Label>Hasta</Label><Input type="date" value={to} min={min} max={todayVe()} onChange={(e) => change('to', e.target.value)} /></div>
        <Btn variant="ghost" onClick={() => shift(-1)} title="Período anterior">←</Btn>
        <Btn variant="ghost" onClick={() => shift(1)} title="Período siguiente">→</Btn>
        <Btn onClick={() => { try { printDailyClose(d, ctx.settings.company); } catch (e: any) { toast.error(e.message); } }}>🖨️ Imprimir</Btn>
      </Card>
      <Pills<Preset>
        size="sm"
        value={preset}
        onChange={choose}
        options={[
          { key: 'today', label: 'Hoy' },
          { key: 'yesterday', label: 'Ayer' },
          { key: 'week', label: 'Esta semana' },
          { key: 'last7', label: 'Últimos 7 días' },
          { key: 'month', label: 'Este mes' },
          { key: 'lastmonth', label: 'Mes pasado' },
        ]}
      />

      <div className="text-[13px] text-[#6b7280]">
        {d.isRange ? 'Reporte' : 'Cierre'} <b className="text-[#111]">{d.periodLabel}</b>
        {d.isRange ? ` · ${nDays} días` : ''}
        {c.issued === 0 ? ' · sin ventas registradas' : ''}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label={'Ventas ' + periodo} value={fmt(t.usd)} sub={`${c.issued} documento${c.issued === 1 ? '' : 's'}`} />
        <Stat label="En bolívares" value={bsFmt(t.bs)} sub={rateText(d)} color="#b45309" />
        <Stat label="Cobrado" value={fmt(t.collectedUsd)} sub={t.pendingUsd ? 'pendiente ' + fmt(t.pendingUsd) : 'todo cobrado'} color="#16a34a" />
        {d.hideCosts ? (
          <Stat label="Unidades vendidas" value={String(t.units)} sub={`${c.issued} documento${c.issued === 1 ? '' : 's'}`} />
        ) : (
          <Stat label="Ganancia bruta" value={fmt(t.profit)} sub={'costo ' + fmt(t.cost)} color="#9333ea" />
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Ticket promedio" value={fmt(t.avgTicket)} sub={t.units + ' unidades'} />
        {d.isRange ? (
          <Stat label="Promedio diario" value={fmt(r2(t.usd / nDays))} sub={`${d.byDay.length} de ${nDays} días con ventas`} />
        ) : (
          <Stat label="Subtotal / IVA" value={fmt(t.subtotal)} sub={'IVA ' + fmt(t.tax)} />
        )}
        <Stat label="Descuentos" value={fmt(t.discount)} sub={'aplicados ' + (d.isRange ? 'en el período' : 'en el día')} />
        <Stat label="Anuladas" value={String(c.voided)} sub={c.voided ? fmt(t.voidedUsd) + ' no cuentan' : 'ninguna'} color={c.voided ? '#dc2626' : undefined} />
      </div>

      {d.isRange && (
        <Card className="p-4">
          <h3 className="text-[14px] font-semibold mb-3">📅 Ventas por día</h3>
          {d.byDay.length ? (
            <Table
              head={['Día', 'Ventas', 'USD', 'Bs', ...(d.hideCosts ? [] : ['Ganancia'])]}
              foot={
                <tr>
                  <td>Total</td><td>{c.issued}</td><td>{fmt(t.usd)}</td><td className="text-[#b45309]">{bsFmt(t.bs)}</td>
                  {!d.hideCosts && <td className="text-[#9333ea]">{fmt(t.profit)}</td>}
                </tr>
              }
            >
              {d.byDay.map((x) => (
                <tr key={x.date}>
                  <td>{niceDay(x.date, { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                  <td>{x.count}</td>
                  <td className="font-medium">{fmt(x.usd)}</td>
                  <td className="text-[#b45309]">{bsFmt(x.bs)}</td>
                  {!d.hideCosts && <td className="text-[#9333ea]">{fmt(x.profit)}</td>}
                </tr>
              ))}
            </Table>
          ) : (
            <p className="text-[13px] text-[#9ca3af] py-3">Sin ventas en el período.</p>
          )}
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-[14px] font-semibold mb-3">💵 Cómo te pagaron</h3>
          {d.byMethod.length ? (
            <Table head={['Medio', 'Ventas', 'USD', 'Bs']}>
              {d.byMethod.map((m) => (
                <tr key={m.method}>
                  <td>{m.label}</td><td>{m.count}</td><td className="font-medium">{fmt(m.usd)}</td><td className="text-[#b45309]">{bsFmt(m.bs)}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <p className="text-[13px] text-[#9ca3af] py-3">Sin cobros registrados.</p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-[14px] font-semibold mb-3">👤 Quién facturó</h3>
          {d.byUser.length ? (
            <div className="divide-y divide-[#f0f0f2] text-[13px]">
              {d.byUser.map((u) => (
                <div key={u.user} className="flex justify-between py-2">
                  <span>{u.user}</span>
                  <span className="text-[#6b7280]">{u.count} venta{u.count === 1 ? '' : 's'}</span>
                  <span className="font-medium">{fmt(u.usd)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[#9ca3af] py-3">Sin ventas.</p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-[14px] font-semibold mb-3">📦 Lo más vendido</h3>
          {d.products.length ? (
            <Table head={['Producto', 'Uds', 'Total']}>
              {d.products.slice(0, 10).map((p) => (
                <tr key={p.name}><td>{p.name}</td><td>{p.qty}</td><td className="font-medium">{fmt(p.usd)}</td></tr>
              ))}
            </Table>
          ) : (
            <p className="text-[13px] text-[#9ca3af] py-3">Sin productos vendidos.</p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-[14px] font-semibold mb-3">⚠️ Requiere atención</h3>
          {d.pendingList.length || d.voidedList.length ? (
            <div className="text-[13px]">
              {d.pendingList.length > 0 && (
                <>
                  <div className="text-[10px] uppercase tracking-wider text-[#71717a] mb-1">Por cobrar</div>
                  {d.pendingList.map((p) => (
                    <button key={p.id} type="button" onClick={() => ctx.openInvoice(p.id)} className="flex w-full justify-between py-1 hover:underline">
                      <span>{p.id} · {p.customer}</span><span className="font-medium">{fmt(p.total)}</span>
                    </button>
                  ))}
                </>
              )}
              {d.voidedList.length > 0 && (
                <>
                  <div className="text-[10px] uppercase tracking-wider text-[#71717a] mt-3 mb-1">Anuladas</div>
                  {d.voidedList.map((p) => (
                    <div key={p.id} className="py-1.5 border-b border-[#f0f0f2]">
                      <div className="flex justify-between text-[#6b7280]"><span>{p.id} · {p.customer}</span><span className="line-through">{fmt(p.total)}</span></div>
                      <div className="text-[12px] mt-0.5"><b>Motivo:</b> {p.reason || '—'} · <span className="text-[#6b7280]">{p.by}{p.at ? ' · ' + new Date(p.at).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span></div>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <p className="text-[13px] text-[#9ca3af] py-3">Nada pendiente. {d.isRange ? 'Período' : 'Día'} limpio ✓</p>
          )}
        </Card>
      </div>
    </div>
  );
}
