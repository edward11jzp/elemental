import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../../context';
import { BarRow, Card, PALETTE, Pills, Stat } from '../../components/admin/ui';
import { addDays, fmt, isValidSale, saleCost, todayVe, veDay } from '../../lib/sales';
import type { SalesCtx } from '../AdminSales';
import { useSedes } from '../../lib/sedes';

type Range = 'day' | 'week' | 'month' | 'year';
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const SUBCAT_LABEL: Record<string, string> = { 't-shirts': 'Camisetas', polos: 'Polos', gorras: 'Gorras', hoodies: 'Hoodies', joggers: 'Joggers' };
const tip = { borderRadius: 8, border: '1px solid #e6e6e9', fontSize: 12, background: '#fff', color: '#111' };

export default function ReportsTab({ ctx }: { ctx: SalesCtx }) {
  const { products } = useApp();
  const [range, setRange] = useState<Range>('day');
  const valid = useMemo(() => ctx.sales.filter(isValidSale), [ctx.sales]);

  const totals = useMemo(() => {
    const revenue = valid.reduce((a, s) => a + s.total, 0);
    const cost = valid.reduce((a, s) => a + saleCost(s), 0);
    const profit = revenue - cost;
    return { revenue, cost, profit, margin: revenue ? Math.round((profit / revenue) * 100) : 0 };
  }, [valid]);

  const rangeTotal = useMemo(() => {
    const today = todayVe();
    const start = range === 'day' ? today : range === 'week' ? addDays(today, -7) : range === 'month' ? addDays(today, -30) : addDays(today, -365);
    return valid.filter((s) => veDay(s.date) >= start).reduce((a, s) => a + s.total, 0);
  }, [valid, range]);

  // Ventas y costo por período (como Bendito: 7 días / 4 semanas / 6 meses / 12 meses).
  const series = useMemo(() => {
    const today = todayVe();
    type B = { lab: string; test: (d: string) => boolean };
    const buckets: B[] = [];
    if (range === 'day') {
      for (let i = 6; i >= 0; i--) {
        const d = addDays(today, -i);
        buckets.push({ lab: `${+d.slice(8)}/${+d.slice(5, 7)}`, test: (x) => x === d });
      }
    } else if (range === 'week') {
      for (let i = 3; i >= 0; i--) {
        const fin = addDays(today, -i * 7), ini = addDays(fin, -6);
        buckets.push({ lab: `${+ini.slice(8)}/${+ini.slice(5, 7)}`, test: (x) => x >= ini && x <= fin });
      }
    } else {
      const n = range === 'month' ? 6 : 12;
      const y = +today.slice(0, 4), m = +today.slice(5, 7) - 1;
      for (let i = n - 1; i >= 0; i--) {
        const dt = new Date(Date.UTC(y, m - i, 1));
        const key = dt.toISOString().slice(0, 7);
        buckets.push({ lab: MESES[dt.getUTCMonth()], test: (x) => x.startsWith(key) });
      }
    }
    return buckets.map((b) => {
      const ss = valid.filter((s) => b.test(veDay(s.date)));
      return { label: b.lab, Ventas: Math.round(ss.reduce((a, s) => a + s.total, 0) * 100) / 100, Costo: Math.round(ss.reduce((a, s) => a + saleCost(s), 0) * 100) / 100 };
    });
  }, [valid, range]);

  const top = useMemo(() => {
    const prod = new Map<string, number>(), cats = new Map<string, number>();
    valid.forEach((s) =>
      s.items.forEach((i) => {
        prod.set(i.name, (prod.get(i.name) ?? 0) + i.qty);
        const p = i.id ? products.find((x) => x.id === i.id) : null;
        const c = p ? SUBCAT_LABEL[p.subcategory] ?? p.subcategory : i.free ? 'Líneas libres' : 'Otros';
        cats.set(c, (cats.get(c) ?? 0) + i.qty);
      }),
    );
    const sort = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { prod: sort(prod), cats: sort(cats) };
  }, [valid, products]);

  const lbl = { day: 'del día', week: 'de la semana', month: 'del mes', year: 'del año' }[range];
  const maxP = Math.max(1, ...top.prod.map((x) => x[1]));
  const maxC = Math.max(1, ...top.cats.map((x) => x[1]));

  return (
    <div className="space-y-4">
      <Pills<Range> value={range} onChange={setRange} options={[{ key: 'day', label: 'Día' }, { key: 'week', label: 'Semana' }, { key: 'month', label: 'Mes' }, { key: 'year', label: 'Año' }]} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label={'Ventas ' + lbl} value={fmt(rangeTotal)} />
        <Stat label="Ingresos totales" value={fmt(totals.revenue)} />
        <Stat label="Ganancia neta" value={fmt(totals.profit)} color="#16a34a" />
        <Stat label="Margen" value={totals.margin + '%'} />
      </div>
      <SedeBreakdown ctx={ctx} />
      <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
        <Card className="p-4">
          <h3 className="text-[14px] font-semibold mb-3">Ventas vs costo</h3>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <BarChart data={series} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#f0f0f2" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={tip} formatter={(v: number) => fmt(v)} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Ventas" fill="#22c55e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Costo" fill="#3b3b40" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-[14px] font-semibold mb-3">Costos vs ganancia</h3>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={[{ name: 'Ganancia', v: Math.max(0, totals.profit) }, { name: 'Costo', v: totals.cost }]} dataKey="v" nameKey="name" innerRadius="62%" outerRadius="85%" stroke="none">
                  <Cell fill="#22c55e" />
                  <Cell fill="#3b3b40" />
                </Pie>
                <Tooltip contentStyle={tip} formatter={(v: number) => fmt(v)} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <h3 className="text-[14px] font-semibold">Productos más vendidos</h3>
          {top.prod.length ? top.prod.map(([n, v], i) => <BarRow key={n} label={n} value={v} max={maxP} right={v + ' uds'} color={PALETTE[i % PALETTE.length]} />) : <p className="text-[13px] text-[#9ca3af]">Sin datos.</p>}
        </Card>
        <Card className="p-4 space-y-3">
          <h3 className="text-[14px] font-semibold">Categorías más vendidas</h3>
          {top.cats.length ? top.cats.map(([n, v], i) => <BarRow key={n} label={n} value={v} max={maxC} right={v + ' uds'} color={PALETTE[(i + 3) % PALETTE.length]} />) : <p className="text-[13px] text-[#9ca3af]">Sin datos.</p>}
        </Card>
      </div>
    </div>
  );
}

/** Comparativa entre sedes. Sólo aparece al mirar todas juntas. */
function SedeBreakdown({ ctx }: { ctx: SalesCtx }) {
  const { sedes, sede, setSede } = useSedes();
  const rows = useMemo(() => {
    const valid = ctx.sales.filter(isValidSale);
    return sedes
      .map((s) => {
        const mine = valid.filter((v) => v.locationId === s.id);
        const revenue = mine.reduce((a, v) => a + v.total, 0);
        const cost = mine.reduce((a, v) => a + saleCost(v), 0);
        return { sede: s, count: mine.length, revenue, profit: revenue - cost };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [ctx.sales, sedes]);
  const sinSede = useMemo(() => ctx.sales.filter(isValidSale).filter((v) => !v.locationId).length, [ctx.sales]);
  if (sede || sedes.length < 2) return null;
  const max = Math.max(1, ...rows.map((r) => r.revenue));

  return (
    <Card className="p-4">
      <h3 className="text-[14px] font-semibold mb-1">Comparativa por sede</h3>
      <p className="text-[11px] text-[#6b7280] mb-3">Toca una sede para ver sólo la suya en todo el panel.</p>
      <div className="space-y-1">
        {rows.map((r, i) => (
          <button key={r.sede.id} type="button" onClick={() => setSede(r.sede.id)} className="w-full text-left">
            <BarRow
              label={r.sede.code}
              value={r.revenue}
              max={max}
              right={`${fmt(r.revenue)} · ${r.count} vta${r.count === 1 ? '' : 's'}`}
              color={PALETTE[i % PALETTE.length]}
            />
          </button>
        ))}
      </div>
      {sinSede > 0 && (
        <p className="mt-2 text-[11px] text-[#b45309]">{sinSede} venta(s) sin sede: son anteriores a que separaras las sedes.</p>
      )}
    </Card>
  );
}
