import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Btn, Card } from '../../components/admin/ui';
import { deliverPending, listPending, type Pending } from '../../lib/sales';
import { useSedes } from '../../lib/sedes';
import type { SalesCtx } from '../AdminSales';

/** Ventas por encargo: lo que ya se cobró y falta entregar al cliente. */
export default function EncargosTab({ ctx }: { ctx: SalesCtx }) {
  const { sedes, nameOf } = useSedes();
  const [rows, setRows] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const load = async () => {
    try {
      setRows(await listPending());
    } catch (e: any) {
      toast.error('No se pudieron cargar los encargos: ' + e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const porVenta = useMemo(() => {
    const m = new Map<string, Pending[]>();
    rows.forEach((r) => m.set(r.saleId, [...(m.get(r.saleId) ?? []), r]));
    return [...m.entries()];
  }, [rows]);

  const entregar = async (r: Pending) => {
    const falta = r.ordered - r.delivered;
    const n = Math.floor(Number(prompt(`¿Cuántas piezas entregas hoy de ${r.productName}? (faltan ${falta})`, String(falta)) ?? 0));
    if (!n || n < 1) return;
    setBusy(r.id);
    try {
      const quedan = await deliverPending(r.id, n);
      toast.success(quedan > 0 ? `Entregadas ${n} · faltan ${quedan}` : `Entregadas ${n} · ¡completo!`);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Card className="p-6 text-[13px] text-[#6b7280]">Cargando…</Card>;
  if (!porVenta.length) return <Card className="p-6 text-[13px] text-[#6b7280]">No hay encargos pendientes por entregar. 🎉</Card>;

  const totalFalta = rows.reduce((a, r) => a + r.ordered - r.delivered, 0);
  return (
    <div className="space-y-3">
      <div className="text-[13px] text-[#6b7280]">
        {porVenta.length} venta(s) por encargo · <b className="text-[#b45309]">{totalFalta}</b> piezas por entregar. Al entregar, salen del inventario de la tienda donde se hizo la venta.
      </div>
      {porVenta.map(([saleId, items]) => {
        const sale = ctx.sales.find((s) => s.id === saleId);
        return (
          <Card key={saleId} className="p-3">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <button type="button" className="font-mono text-[13px] font-semibold underline" onClick={() => ctx.openInvoice(saleId)}>{saleId}</button>
              <span className="text-[13px]">{sale?.customer || 'Cliente'}</span>
              {sedes.length > 1 && <span className="text-[11px] text-[#6b7280]">🏢 {nameOf(items[0].locationId)}</span>}
              <span className="ml-auto text-[11px] text-[#6b7280]">{new Date(items[0].createdAt).toLocaleDateString('es-VE')}</span>
            </div>
            <div className="divide-y divide-[#f1f1f3]">
              {items.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-2 py-2 text-[13px]">
                  <span className="font-medium">{r.productName}</span>
                  <span className="text-[#6b7280]">{[r.size, r.color].filter(Boolean).join(' · ')}</span>
                  <span className="ml-auto text-[12px]">
                    entregadas {r.delivered}/{r.ordered} · faltan <b className="text-[#b45309]">{r.ordered - r.delivered}</b>
                  </span>
                  <Btn variant="success" disabled={busy === r.id} onClick={() => entregar(r)}>📦 Entregar</Btn>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
