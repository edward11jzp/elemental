import { useApp } from '../context';
import { Link, useNavigate } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { Order, OrderStatus } from '../types';
import { getRetailUnitPrice } from '../lib/pricing';
import { SelfReviewPanel } from '../lib/selfReview';

type Range = 'today' | 'week' | 'month' | 'year';

const RANGES: { id: Range; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' },
];

const RANGE_SUBTITLE: Record<Range, string> = {
  today: 'hoy',
  week: '7 días',
  month: '30 días',
  year: '12 meses',
};

// Pedidos que cuentan como venta (misma regla que antes en el panel).
const REVENUE_STATUSES: OrderStatus[] = ['approved', 'in_progress', 'completed'];
const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'approved', 'in_progress'];

const STATUS_META: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: '#9ca3af' },
  approved: { label: 'Aprobado', color: '#22c55e' },
  in_progress: { label: 'En Proceso', color: '#3b82f6' },
  completed: { label: 'Listo', color: '#a855f7' },
  rejected: { label: 'Rechazado', color: '#ef4444' },
};

const LOW_STOCK = 50;
const DAY = 24 * 60 * 60 * 1000;

const money = (n: number) =>
  '$' + n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Inicio del rango actual y duración (para comparar con el período anterior).
function rangeWindow(range: Range, now: Date) {
  const end = now.getTime();
  if (range === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start: start.getTime(), end, length: DAY };
  }
  const days = range === 'week' ? 7 : range === 'month' ? 30 : 365;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return { start: start.getTime(), end, length: days * DAY };
}

// Serie para el gráfico: por hora (hoy), por día (semana/mes) o por mes (año).
function buildSeries(range: Range, orders: Order[], now: Date) {
  const sum = (from: number, to: number) =>
    orders
      .filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= from && t < to;
      })
      .reduce((s, o) => s + o.total, 0);

  if (range === 'today') {
    const base = new Date(now);
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 24 }, (_, h) => {
      const from = base.getTime() + h * 60 * 60 * 1000;
      return { label: `${h}h`, value: sum(from, from + 60 * 60 * 1000) };
    });
  }
  if (range === 'year') {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return {
        label: d.toLocaleDateString('es-VE', { month: 'short' }),
        value: sum(d.getTime(), next.getTime()),
      };
    });
  }
  const days = range === 'week' ? 7 : 30;
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (days - 1 - i));
    return {
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      value: sum(d.getTime(), d.getTime() + DAY),
    };
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border border-[#ececef] bg-[#fff] shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}>
      {children}
    </div>
  );
}

function BigStat({
  label,
  value,
  sub,
  subClass = 'text-[#6b7280]',
  valueClass = 'text-[#111]',
}: {
  label: string;
  value: string;
  sub: React.ReactNode;
  subClass?: string;
  valueClass?: string;
}) {
  return (
    <Card className="p-4 lg:p-5">
      <p className="text-[10px] font-medium tracking-[0.12em] text-[#52525b]">{label}</p>
      <p className={`mt-2 text-2xl lg:text-[26px] font-extrabold tracking-tight ${valueClass}`}>{value}</p>
      <p className={`mt-1 text-[11px] ${subClass}`}>{sub}</p>
    </Card>
  );
}

function SmallStat({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <Card className="px-3 py-3">
      <p className="text-[9px] font-medium tracking-[0.08em] leading-tight text-[#52525b]">{label}</p>
      <p className={`mt-1.5 text-[17px] font-extrabold ${valueClass}`}>{value}</p>
    </Card>
  );
}

export default function AdminDashboard() {
  const { currentUser, orders, products } = useApp();
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>('week');

  useEffect(() => {
    if (!currentUser) {
      navigate('/admin/login');
    }
  }, [currentUser, navigate]);

  const stats = useMemo(() => {
    const now = new Date();
    const paid = orders.filter((o) => REVENUE_STATUSES.includes(o.status));
    const { start, end, length } = rangeWindow(range, now);
    const inWindow = (o: Order, from: number, to: number) => {
      const t = new Date(o.createdAt).getTime();
      return t >= from && t <= to;
    };
    const current = paid.filter((o) => inWindow(o, start, end));
    const previous = paid.filter((o) => inWindow(o, start - length, start - 1));
    const revenue = current.reduce((s, o) => s + o.total, 0);
    const prevRevenue = previous.reduce((s, o) => s + o.total, 0);
    const delta = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null;
    const rangeOrders = orders.filter((o) => inWindow(o, start, end));

    const count = (s: OrderStatus) => orders.filter((o) => o.status === s).length;
    const byStatus = (Object.keys(STATUS_META) as OrderStatus[])
      .map((s) => ({ status: s, name: STATUS_META[s].label, value: count(s), color: STATUS_META[s].color }));

    // Top productos (unidades vendidas en pedidos válidos)
    const sold = new Map<string, { name: string; image: string; units: number; revenue: number }>();
    paid.forEach((o) =>
      o.items.forEach((it) => {
        const key = it.product.id;
        const prev = sold.get(key) ?? { name: it.product.name, image: it.product.image, units: 0, revenue: 0 };
        prev.units += it.quantity;
        sold.set(key, prev);
      }),
    );
    const topProducts = [...sold.values()].sort((a, b) => b.units - a.units).slice(0, 5);

    return {
      revenue,
      delta,
      rangeOrders: rangeOrders.length,
      active: orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
      completed: count('completed'),
      pending: count('pending'),
      rejected: count('rejected'),
      totalSales: paid.reduce((s, o) => s + o.total, 0),
      totalOrders: orders.length,
      avgTicket: current.length ? revenue / current.length : 0,
      unitsSold: paid.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0), 0),
      stockUnits: products.reduce((s, p) => s + (p.stock ?? 0), 0),
      stockValue: products.reduce((s, p) => s + (p.stock ?? 0) * getRetailUnitPrice(p), 0),
      outOfStock: products.filter((p) => (p.stock ?? 0) <= 0).length,
      lowStock: products.filter((p) => p.stock > 0 && p.stock < LOW_STOCK).length,
      series: buildSeries(range, paid, now),
      byStatus,
      topProducts,
    };
  }, [orders, products, range]);

  if (!currentUser) return null; // el acceso por módulo lo controla AdminRoot

  const pieData = stats.byStatus.filter((s) => s.value > 0);
  const lowStockList = products
    .filter((p) => p.stock < LOW_STOCK)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6);
  const recent = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div className="px-4 lg:px-6 py-5 space-y-4 max-w-[1600px]">
      <SelfReviewPanel />
      {/* Selector de rango */}
      <div className="inline-flex rounded-lg border border-[#e6e6e9] bg-[#f1f1f3] p-1">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={`rounded-md px-3 py-1 text-[12px] transition-colors ${
              range === r.id ? 'bg-[#111] font-semibold [color:#fff]' : 'text-[#52525b] hover:text-[#111]'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
        <BigStat
          label="INGRESOS (RANGO)"
          value={money(stats.revenue)}
          sub={
            stats.delta === null
              ? `${stats.rangeOrders} pedidos en ${RANGE_SUBTITLE[range]}`
              : `${stats.delta >= 0 ? '▲' : '▼'} ${Math.abs(stats.delta).toFixed(1)}% vs período anterior`
          }
          subClass={
            stats.delta === null ? 'text-[#6b7280]' : stats.delta >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'
          }
        />
        <BigStat label="PEDIDOS ACTIVOS" value={String(stats.active)} sub="en proceso" />
        <BigStat label="COMPLETADOS" value={String(stats.completed)} sub="listos / entregados" subClass="text-[#16a34a]" />
        <BigStat
          label="TICKET PROMEDIO"
          value={money(stats.avgTicket)}
          sub={`por pedido · ${RANGE_SUBTITLE[range]}`}
          valueClass="text-[#15803d]"
        />
      </div>

      {/* KPIs secundarios */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        <SmallStat label="VENTAS TOTALES" value={money(stats.totalSales)} valueClass="text-[#15803d]" />
        <SmallStat label="PEDIDOS TOTALES" value={String(stats.totalOrders)} valueClass="text-[#1d4ed8]" />
        <SmallStat label="INVENTARIO (UDS)" value={stats.stockUnits.toLocaleString('es-VE')} valueClass="text-[#0e7490]" />
        <SmallStat label="VALOR INVENTARIO" value={money(stats.stockValue)} valueClass="text-[#4d7c0f]" />
        <SmallStat label="PRODUCTOS AGOTADOS" value={String(stats.outOfStock)} valueClass="text-[#52525b]" />
        <SmallStat label="INVENTARIO BAJO" value={String(stats.lowStock)} valueClass="text-[#52525b]" />
        <SmallStat label="PEDIDOS PENDIENTES" value={String(stats.pending)} valueClass="text-[#7e22ce]" />
        <SmallStat label="UNIDADES VENDIDAS" value={String(stats.unitsSold)} valueClass="text-[#15803d]" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_440px] gap-4">
        <Card className="p-4 lg:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-semibold text-[#111]">Ingresos</h2>
            <span className="text-[11px] text-[#6b7280]">{RANGE_SUBTITLE[range]}</span>
          </div>
          <div className="h-[280px] lg:h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f0f0f2" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} minTickGap={16} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                  width={50}
                />
                <Tooltip
                  formatter={(v: number) => [money(v), 'Ingresos']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e6e6e9', fontSize: 12, background: '#fff', color: '#111' }}
                  labelStyle={{ color: '#6b7280' }}
                />
                <Area type="monotone" dataKey="value" stroke="#111" strokeWidth={1.5} fill="url(#revFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 lg:p-5 flex flex-col">
          <h2 className="text-[14px] font-semibold text-[#111] mb-3">Pedidos por estado</h2>
          <div className="flex-1 min-h-[240px] relative">
            {pieData.length === 0 ? (
              <p className="absolute inset-0 flex items-center justify-center text-[12px] text-[#9ca3af]">Aún no hay pedidos</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} stroke="none">
                    {pieData.map((d) => (
                      <Cell key={d.status} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e6e6e9', fontSize: 12, background: '#fff', color: '#111' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            {pieData.length > 0 && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-[#111]">{stats.totalOrders}</span>
                <span className="text-[10px] text-[#6b7280]">pedidos</span>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
            {stats.byStatus.map((s) => (
              <span key={s.status} className="inline-flex items-center gap-1 text-[10px] text-[#52525b]">
                <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Listas */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_440px] gap-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4 lg:p-5">
            <h2 className="text-[14px] font-semibold text-[#111] mb-3">Productos más vendidos</h2>
            {stats.topProducts.length === 0 ? (
              <p className="py-8 text-center text-[12px] text-[#9ca3af]">Sin ventas todavía</p>
            ) : (
              <ul className="divide-y divide-[#f0f0f2]">
                {stats.topProducts.map((p, i) => (
                  <li key={p.name + i} className="flex items-center gap-3 py-2.5">
                    <span className="w-4 text-[11px] font-semibold text-[#9ca3af]">{i + 1}</span>
                    <img src={p.image} alt={p.name} className="h-9 w-9 rounded-md object-cover bg-[#f1f1f3]" />
                    <span className="flex-1 truncate text-[13px] text-[#111]">{p.name}</span>
                    <span className="text-[12px] font-semibold text-[#111]">{p.units} uds</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4 lg:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-semibold text-[#111]">Alertas de inventario</h2>
              <Link to="/admin/inventory" className="text-[11px] text-[#6b7280] hover:text-[#111]">Ver todo</Link>
            </div>
            {lowStockList.length === 0 ? (
              <p className="py-8 text-center text-[12px] text-[#9ca3af]">Todos los productos bien surtidos</p>
            ) : (
              <ul className="divide-y divide-[#f0f0f2]">
                {lowStockList.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <img src={p.image} alt={p.name} className="h-9 w-9 rounded-md object-cover bg-[#f1f1f3]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-[#111]">{p.name}</p>
                      <p className="text-[11px] text-[#6b7280] capitalize">{p.category}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        p.stock <= 0 ? 'bg-[#fee2e2] text-[#b91c1c]' : 'bg-[#fef3c7] text-[#a16207]'
                      }`}
                    >
                      {p.stock <= 0 ? 'Agotado' : `${p.stock} restantes`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="p-4 lg:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-semibold text-[#111]">Actividad reciente</h2>
            <Link to="/admin/orders" className="text-[11px] text-[#6b7280] hover:text-[#111]">Ver pedidos</Link>
          </div>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-[#9ca3af]">Aún no hay pedidos</p>
          ) : (
            <ul className="divide-y divide-[#f0f0f2]">
              {recent.map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-2.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_META[o.status].color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-[#111]">
                      #{o.id} · {o.customerName}
                    </p>
                    <p className="text-[11px] text-[#6b7280]">
                      {STATUS_META[o.status].label} · {timeAgo(o.createdAt)}
                    </p>
                  </div>
                  <span className="text-[12px] font-semibold text-[#111]">{money(o.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
