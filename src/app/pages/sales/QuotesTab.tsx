import { useMemo, useState } from 'react';
import { Btn, Card, Input, Pills } from '../../components/admin/ui';
import { fmt, saleDateLabel } from '../../lib/sales';
import type { SalesCtx } from '../AdminSales';

type Filtro = 'pendientes' | 'facturados' | 'todos';

/** Presupuestos guardados: se imprimen para el cliente y, cuando vuelve, se facturan sin rehacerlos. */
export default function QuotesTab({ ctx }: { ctx: SalesCtx }) {
  const [filtro, setFiltro] = useState<Filtro>('pendientes');
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return ctx.sales
      .filter((s) => s.doc === 'cotizacion' && s.pay !== 'cancelado')
      .filter((s) => (filtro === 'pendientes' ? !s.convertedTo : filtro === 'facturados' ? !!s.convertedTo : true))
      .filter((s) => !t || `${s.id} ${s.customer} ${s.items.map((i) => i.name).join(' ')}`.toLowerCase().includes(t))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [ctx.sales, filtro, q]);

  return (
    <div className="space-y-3">
      <Card className="p-3 flex flex-wrap items-center gap-3">
        <Pills<Filtro>
          value={filtro}
          onChange={setFiltro}
          options={[{ key: 'pendientes', label: 'Por facturar' }, { key: 'facturados', label: 'Facturados' }, { key: 'todos', label: 'Todos' }]}
        />
        <Input placeholder="Buscar cliente, número o producto…" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 min-w-[180px]" />
        <p className="w-full text-[11px] text-[#6b7280]">
          Para hacer uno nuevo: en <b>Nueva venta</b> elige el documento <b>Cotización</b>. No mueve inventario y queda guardado aquí.
        </p>
      </Card>

      {!rows.length && <Card className="p-6 text-[13px] text-[#6b7280]">No hay presupuestos {filtro === 'pendientes' ? 'por facturar' : ''}.</Card>}

      {rows.map((s) => (
        <Card key={s.id} className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="font-mono text-[13px] font-semibold underline" onClick={() => ctx.openInvoice(s.id)}>{s.id}</button>
            <span className="text-[13px] font-medium">{s.customer || 'Sin cliente'}</span>
            <span className="text-[11px] text-[#6b7280]">{saleDateLabel(s.date)}</span>
            <span className="ml-auto text-[14px] font-semibold">{fmt(s.total)}</span>
          </div>
          <div className="mt-1 text-[12px] text-[#6b7280] line-clamp-2">
            {s.items.map((i) => `${i.qty}× ${i.name}${i.size ? ' ' + i.size : ''}${i.color ? ' ' + i.color : ''}`).join(' · ')}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Btn variant="ghost" className="!py-1 !text-[12px]" onClick={() => ctx.openInvoice(s.id)}>🖨️ Ver / imprimir</Btn>
            {s.convertedTo ? (
              <span className="text-[12px] text-[#15803d]">✓ Facturado en <button type="button" className="underline" onClick={() => ctx.openInvoice(s.convertedTo!)}>{s.convertedTo}</button></span>
            ) : (
              <Btn variant="success" className="!py-1 !text-[12px]" onClick={() => ctx.loadQuote(s)}>➜ Facturar</Btn>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
