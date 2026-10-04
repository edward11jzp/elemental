import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '../context';
import { Btn, Card, Input, Select, cx } from '../components/admin/ui';
import { listSales, veDay, todayVe, addDays, type Sale } from '../lib/sales';
import { candidatesFrom, fetchProviderPayments, loadLinks, markPayment, matchPayments, type IncomingPayment, type PayLink } from '../lib/payconf';

const PROVIDERS = [
  { key: 'binance', name: 'Binance Pay', icon: '🟡', method: 'binance', live: true, hint: '' },
  { key: 'pago_movil', name: 'Pago Móvil', icon: '📱', method: 'pago_movil', live: false, hint: 'Pago móvil y transferencias en Bs. Se conectará leyendo las notificaciones del banco o con una pasarela de pago.' },
  { key: 'zelle', name: 'Zelle', icon: '🇺🇸', method: 'zelle', live: true, hint: '' },
];

export default function AdminPayConf() {
  const { orders, currentUser } = useApp();
  const [prov, setProv] = useState('binance');
  const [days, setDays] = useState(2);
  const [q, setQ] = useState('');
  const [showIgnored, setShowIgnored] = useState(false);
  const [payments, setPayments] = useState<IncomingPayment[]>([]);
  const [conn, setConn] = useState<Record<string, boolean>>({});
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [links, setLinks] = useState<PayLink[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [error, setError] = useState<string | null>(null);
  const p = PROVIDERS.find((x) => x.key === prov)!;

  const load = useCallback(async () => {
    if (!p.live) return;
    try {
      const [r, l, s] = await Promise.all([fetchProviderPayments(prov, days), loadLinks(prov), listSales(addDays(todayVe(), -(days + 1)))]);
      setConn((c) => ({ ...c, [prov]: r.connected })); setPayments(r.payments); setCheckedAt(r.checkedAt ?? Date.now()); setLinks(l); setSales(s); setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo consultar');
    }
  }, [days, prov, p.live]);

  // En el mostrador: se actualiza solo cada 30 s mientras la pantalla está abierta.
  useEffect(() => {
    load();
    const t = setInterval(() => !document.hidden && load(), 30000);
    return () => clearInterval(t);
  }, [load]);

  const cands = useMemo(() => candidatesFrom(sales, orders), [sales, orders]);
  const { items, used } = useMemo(() => matchPayments(payments, cands, links, p.method), [payments, cands, links, p.method]);
  const shownFrom = Date.now() - days * 864e5;
  const visible = items.filter((i) => i.time >= shownFrom);
  const s = q.trim().toLowerCase().replace(',', '.');
  const list = visible.filter((i) => (showIgnored || !i.ignored) && (!s || String(i.amount).includes(s) || i.ref.toLowerCase().includes(s) || i.from.toLowerCase().includes(s) || (i.sale?.id ?? '').toLowerCase().includes(s)));
  const tienda = visible.filter((i) => i.sale), pend = visible.filter((i) => !i.sale && !i.ignored), ajenos = visible.filter((i) => i.ignored);
  const sum = (a: typeof visible) => a.reduce((x, i) => x + i.amount, 0).toFixed(2);
  const cur = visible[0]?.currency ?? 'USDT';
  const orphans = cands.filter((c) => c.method === p.method && !used.has(c.id) && veDay(c.date) >= veDay(new Date(shownFrom)));

  const mark = async (ref: string, status: 'store' | 'ignored' | 'clear', saleId: string | null = null) => {
    try {
      await markPayment(prov, ref, status, saleId, currentUser?.name ?? '');
      toast.success(status === 'ignored' ? 'Marcado como ajeno a la tienda' : status === 'clear' ? 'Marca quitada' : 'Vinculado a ' + saleId);
      setLinks(await loadLinks(prov));
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const linkOther = (ref: string) => {
    const id = prompt('¿A qué venta o pedido corresponde este cobro?\n\nEscribe el número (por ejemplo NE-000047 u order-…).');
    if (id?.trim()) mark(ref, 'store', id.trim());
  };
  const when = (t: number) => new Date(t).toLocaleString('es-VE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="px-4 lg:px-6 py-5 max-w-[1600px] space-y-4">
      <div>
        <h2 className="text-[18px] font-bold">Confirmación de pagos</h2>
        <p className="text-[12px] text-[#6b7280]">Cobros que ya entraron a tus cuentas, con su referencia. Úsalo en el mostrador para confirmar el pago del cliente antes de entregar.</p>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-[#ececef]">
        {PROVIDERS.map((x) => (
          <button key={x.key} type="button" onClick={() => setProv(x.key)} className={cx('whitespace-nowrap px-4 py-2.5 text-[13px] font-semibold border-b-2 -mb-px', x.key === prov ? 'border-[#111]' : 'border-transparent text-[#6b7280]')}>
            {x.icon} {x.name} {x.live && conn[x.key] ? <span className="text-[#16a34a]">●</span> : <span className="text-[10px] font-normal">(por conectar)</span>}
          </button>
        ))}
      </div>

      {!p.live || conn[prov] === false ? (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-3">{p.icon}</div>
          <div className="font-semibold mb-1">{p.name} todavía no está conectado</div>
          <div className="text-[13px] text-[#6b7280] max-w-md mx-auto">
            {p.key === 'binance'
              ? 'Falta la clave de SOLO LECTURA de Binance de Elemental (BINANCE_API_KEY y BINANCE_API_SECRET en Vercel).'
              : p.key === 'zelle'
                ? 'Falta instalar el script dentro del Gmail de Elemental, el que lee los avisos de Chase y los deja aquí. Mientras no llegue el primer aviso, esta pestaña se queda así.'
                : p.hint}
          </div>
          <div className="text-[12px] text-[#9ca3af] mt-3">Mientras tanto, confirma estos pagos revisando la app.</div>
        </Card>
      ) : (
        <>
          <Card className="p-3 flex flex-wrap gap-2 items-center">
            <Input placeholder="🔍 Monto, referencia o nombre" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 min-w-[200px]" />
            <Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="!w-auto">
              <option value={1}>Hoy y ayer</option><option value={2}>Últimos 2 días</option><option value={7}>Últimos 7 días</option><option value={30}>Últimos 30 días</option>
            </Select>
            <Btn variant="ghost" onClick={load}>↻ Actualizar</Btn>
          </Card>
          {error && <Card className="p-4 text-[13px] text-[#dc2626]">⚠️ {error}</Card>}
          {conn[prov] && (
            <p className="text-[12px] text-[#6b7280]">
              <b>{tienda.length}</b> de la tienda ({sum(tienda)} {cur}) · <b>{pend.length}</b> por revisar ({sum(pend)} {cur}) · {ajenos.length} ajenos
              {ajenos.length > 0 && <label className="ml-2 cursor-pointer"><input type="checkbox" checked={showIgnored} onChange={(e) => setShowIgnored(e.target.checked)} /> mostrar ajenos</label>}
              {checkedAt && <> · actualizado {new Date(checkedAt).toLocaleTimeString('es-VE')} (se actualiza solo)</>}
            </p>
          )}
          <div className="space-y-2">
            {list.map((i) => (
              <Card key={i.ref} className={cx('p-4 flex flex-wrap items-center gap-x-4 gap-y-2', i.ignored && 'opacity-50')}>
                <div className={cx('text-[22px] font-extrabold whitespace-nowrap', !i.ignored && 'text-[#16a34a]')}>+{i.amount} <span className="text-[13px]">{i.currency}</span></div>
                <div className="flex-1 min-w-[160px]">
                  <div className="font-semibold">{i.from || 'Sin nombre'}</div>
                  <div className="text-[12px] text-[#6b7280]">{when(i.time)} · Ref. <span className="font-mono select-all">{i.ref}</span>{i.note ? ` · “${i.note}”` : ''}</div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                  {i.ignored ? (
                    <>
                      <span className="rounded-md border border-[#e6e6e9] bg-[#f4f4f5] px-2 py-1">✕ No es de la tienda{i.markedBy ? ' · ' + i.markedBy : ''}</span>
                      <button type="button" className="underline text-[#6b7280]" onClick={() => mark(i.ref, 'clear')}>deshacer</button>
                    </>
                  ) : i.sale ? (
                    <>
                      <span className="rounded-md border border-[#bbf7d0] bg-[#f0fdf4] px-2 py-1 text-[#15803d]">✓ {i.manual ? 'Vinculado' : 'Confirmado'} · {i.sale.id}{i.sale.customer ? ' · ' + i.sale.customer : ''}</span>
                      {i.manual ? (
                        <><span className="text-[10px] text-[#6b7280]">por {i.markedBy}</span><button type="button" className="underline text-[#6b7280]" onClick={() => mark(i.ref, 'clear')}>deshacer</button></>
                      ) : (
                        <><span className="text-[10px] text-[#6b7280]">(mismo monto y día)</span><button type="button" className="underline text-[#6b7280]" onClick={() => mark(i.ref, 'ignored')}>no es de la tienda</button></>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="rounded-full bg-[#fef9c3] px-2 py-1 font-semibold text-[#a16207]">Por revisar</span>
                      {i.suggest.map((c) => (
                        <Btn key={c.id} variant="ghost" className="!py-1 !px-2 !text-[11px]" onClick={() => mark(i.ref, 'store', c.id)}>¿Es {c.id}? ({c.customer})</Btn>
                      ))}
                      <Btn variant="ghost" className="!py-1 !px-2 !text-[11px]" onClick={() => linkOther(i.ref)}>✓ Es de la tienda…</Btn>
                      <Btn variant="ghost" className="!py-1 !px-2 !text-[11px]" onClick={() => mark(i.ref, 'ignored')}>✕ No es de la tienda</Btn>
                    </>
                  )}
                </div>
              </Card>
            ))}
            {conn[prov] && !list.length && <Card className="p-6 text-center text-[13px] text-[#9ca3af]">{q ? `Ningún cobro coincide con «${q}».` : 'Sin cobros en este período.'}</Card>}
          </div>
          {orphans.length > 0 && (
            <Card className="p-4 text-[13px]">
              <div className="font-semibold mb-1 text-[#dc2626]">⚠️ Ventas o pedidos cobrados por este medio sin un pago que coincida</div>
              <div className="text-[#6b7280] space-y-0.5">{orphans.map((c) => <div key={c.id}>{c.id} · ${c.total} · {veDay(c.date)} · {c.customer}</div>)}</div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
