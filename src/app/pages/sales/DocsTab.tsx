import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Btn, Card, Chip, Input, Select, Table } from '../../components/admin/ui';
import { docLabel, fmt, payState, PAY_STATES, saleDateLabel, setSalePay, todayVe, veDay, voidSale, type PayState, type Sale } from '../../lib/sales';
import type { SalesCtx } from '../AdminSales';

export default function DocsTab({ ctx }: { ctx: SalesCtx }) {
  const [q, setQ] = useState('');
  const [pf, setPf] = useState('');
  const { isAdmin } = ctx;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ctx.sales.filter((x) => (!pf || x.pay === pf) && (!s || x.id.toLowerCase().includes(s) || x.customer.toLowerCase().includes(s)));
  }, [ctx.sales, q, pf]);

  const changePay = async (s: Sale, pay: PayState) => {
    try {
      await setSalePay(s.id, pay);
      await ctx.reloadSales();
      toast.success(`${s.id}: ${payState(pay).label}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const anular = async (s: Sale) => {
    const detalle = s.items.map((i) => i.qty + '× ' + i.name).join(', ');
    const reason = prompt(`Anular ${s.id} (${fmt(s.total)})\n${detalle}\n\nLos productos vuelven al inventario.\n\n¿Motivo de la anulación? (obligatorio)`);
    if (reason === null) return;
    if (reason.trim().length < 4) return toast.error('Escribe el motivo de la anulación');
    try {
      await voidSale(s.id, reason.trim());
      await ctx.reloadSales();
      toast.success(`${s.id} anulada · stock devuelto`);
    } catch (e: any) {
      toast.error('No se pudo anular: ' + e.message);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-3 flex flex-wrap gap-2">
        <Input placeholder="Buscar factura o cliente…" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 min-w-[180px]" />
        <Select value={pf} onChange={(e) => setPf(e.target.value)} className="!w-auto">
          <option value="">Todos los pagos</option>
          {PAY_STATES.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </Select>
      </Card>
      {!isAdmin && <p className="text-[12px] text-[#6b7280]">Ves los documentos de hoy y ayer.</p>}
      <Card>
        <Table
          head={['N° Documento', 'Tipo', 'Fecha', 'Cliente', 'Total ($)', 'Tasa', 'Total Bs', '$ Real', 'Pago', '']}
          empty={list.length ? false : 'Sin documentos.'}
        >
          {list.map((s) => {
            const st = payState(s.pay);
            const canEdit = isAdmin || veDay(s.date) === todayVe();
            return (
              <tr key={s.id} className="cursor-pointer hover:bg-[#fafafa]" onClick={() => ctx.openInvoice(s.id)}>
                <td className="font-semibold whitespace-nowrap">{s.id}</td>
                <td><span className="rounded-md border border-[#e6e6e9] bg-[#f4f4f5] px-2 py-0.5 text-[11px] whitespace-nowrap">{docLabel(s.doc)}</span></td>
                <td className="text-[12px] text-[#6b7280] whitespace-nowrap">{saleDateLabel(s.date)}</td>
                <td>{s.customer || 'Consumidor final'}</td>
                <td className="font-semibold">{fmt(s.total)}</td>
                <td className="text-[12px] text-[#b45309] whitespace-nowrap">{s.exchangeRate ? 'Bs ' + s.exchangeRate.toLocaleString('es-VE') : '—'}</td>
                <td className="font-semibold text-[#b45309] whitespace-nowrap">{s.exchangeRate ? 'Bs ' + Math.round(s.totalBs || s.total * s.exchangeRate).toLocaleString('es-VE') : '—'}</td>
                <td className="font-semibold text-[#15803d]">{s.realFactor ? fmt(s.totalReal || Math.round(s.total * s.realFactor * 100) / 100) : '—'}</td>
                <td><Chip color={st.color}>{st.label}</Chip></td>
                <td onClick={(e) => e.stopPropagation()}>
                  {s.pay === 'cancelado' ? (
                    <div className="text-[11px] text-[#dc2626] max-w-[220px]">
                      Anulada{s.voidInfo ? ` por ${s.voidInfo.user}` : ''}
                      {s.voidInfo && <div className="text-[#6b7280] whitespace-normal">Motivo: {s.voidInfo.reason}</div>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {s.payMethod === 'credito' && <span className="text-[11px] text-[#2563eb] whitespace-nowrap">💳 crédito · Personal</span>}
                      {canEdit && s.payMethod !== 'credito' && (
                        <Select value={s.pay} onChange={(e) => changePay(s, e.target.value as PayState)} className="!w-auto !py-1 !px-2 !text-[12px]">
                          {PAY_STATES.filter((p) => p.key !== 'cancelado' && (isAdmin || p.key !== 'reembolsado' || s.pay === 'reembolsado')).map((p) => (
                            <option key={p.key} value={p.key}>{p.label}</option>
                          ))}
                        </Select>
                      )}
                      {isAdmin && s.doc !== 'cotizacion' && (
                        <Btn variant="danger" className="!py-1 !px-2 !text-[11px] whitespace-nowrap" onClick={() => anular(s)} title="Anular venta">🚫 Anular</Btn>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}
