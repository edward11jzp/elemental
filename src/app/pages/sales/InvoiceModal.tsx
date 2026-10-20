import { toast } from 'sonner';
import { Btn, Modal } from '../../components/admin/ui';
import { docLabel, fmt, setSaleDate, setSaleShipping, todayVe, veDay } from '../../lib/sales';
import { invoiceHtml, printInvoice, printTicket } from '../../lib/salesPrint';
import type { SalesCtx } from '../AdminSales';

export default function InvoiceModal({ ctx, saleId, onClose }: { ctx: SalesCtx; saleId: string | null; onClose: () => void }) {
  const s = saleId ? ctx.sales.find((x) => x.id === saleId) : null;
  if (!s) return null;
  const co = ctx.settings.company;
  const fallback = ctx.settings.rates.exchangeRate;
  const rate = s.exchangeRate || fallback || 0;
  const totalBs = Math.round(s.totalBs || s.total * (rate || 1));

  const safe = (fn: () => void) => {
    try {
      fn();
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo imprimir');
    }
  };

  const editDate = async () => {
    const actual = veDay(s.date);
    const nueva = prompt('Fecha de la venta ' + s.id + ' (AAAA-MM-DD):', actual);
    if (!nueva || nueva.trim() === actual) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nueva.trim())) return toast.error('Formato: AAAA-MM-DD');
    if (nueva.trim() > todayVe()) return toast.error('No se puede poner una fecha futura');
    try {
      await setSaleDate(s.id, nueva.trim());
      await ctx.reloadSales();
      toast.success('Fecha actualizada: ' + nueva.trim());
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Abre el correo del equipo con el documento escrito; el PDF se adjunta guardándolo desde «A4».
  const sendMail = () => {
    const to = s.email || prompt('Correo del cliente:', '') || '';
    if (!to.trim()) return;
    const lineas = s.items.map((i) => `• ${i.qty} × ${i.name}${i.size ? ' ' + i.size : ''}${i.color ? ' ' + i.color : ''} — ${fmt(i.price * i.qty)}`);
    const body = [
      `Hola${s.customer ? ' ' + s.customer : ''},`,
      '',
      `Te enviamos tu ${docLabel(s.doc).toLowerCase()} ${s.id}:`,
      '',
      ...lineas,
      '',
      s.discount ? `Descuento: ${fmt(s.discount)}` : '',
      `Total: ${fmt(s.total)}${rate ? ` (Bs ${totalBs.toLocaleString('es-VE')})` : ''}`,
      '',
      co.name || 'Elemental',
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
    window.location.href = `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(`${docLabel(s.doc)} ${s.id} · ${co.name || 'Elemental'}`)}&body=${encodeURIComponent(body)}`;
  };

  const toggleEnvio = async (on: boolean) => {
    try {
      await setSaleShipping(s.id, on);
      await ctx.reloadSales();
      toast.success(on ? '🚚 Marcada como envío' : 'Ya no es envío');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={`${docLabel(s.doc)} ${s.id}`}
      actions={
        <div className="hidden sm:flex gap-2">
          <Btn variant="ghost" className="!py-1.5 !text-[12px]" onClick={() => safe(() => printInvoice(s, co, fallback))}>🖨️ A4</Btn>
          <Btn variant="ghost" className="!py-1.5 !text-[12px]" onClick={() => safe(() => printTicket(s, co, fallback))}>🧾 Ticket 80mm</Btn>
          <Btn variant="ghost" className="!py-1.5 !text-[12px]" onClick={sendMail}>✉️ Correo</Btn>
          {ctx.isAdmin && <Btn variant="ghost" className="!py-1.5 !text-[12px]" onClick={editDate}>📅 Fecha</Btn>}
          {s.doc === 'cotizacion' && !s.convertedTo && s.pay !== 'cancelado' && <Btn variant="success" className="!py-1.5 !text-[12px]" onClick={() => ctx.loadQuote(s)}>➜ Facturar</Btn>}
        </div>
      }
    >
      <div className="flex sm:hidden gap-2 mb-3">
        <Btn variant="ghost" className="flex-1 !text-[12px]" onClick={() => safe(() => printInvoice(s, co, fallback))}>🖨️ A4</Btn>
        <Btn variant="ghost" className="flex-1 !text-[12px]" onClick={() => safe(() => printTicket(s, co, fallback))}>🧾 Ticket</Btn>
        <Btn variant="ghost" className="flex-1 !text-[12px]" onClick={sendMail}>✉️</Btn>
        {ctx.isAdmin && <Btn variant="ghost" className="!text-[12px]" onClick={editDate}>📅</Btn>}
        {s.doc === 'cotizacion' && !s.convertedTo && s.pay !== 'cancelado' && <Btn variant="success" className="!text-[12px]" onClick={() => ctx.loadQuote(s)}>➜ Facturar</Btn>}
      </div>
      <div className="rounded-xl border border-[#ececef] overflow-x-auto" dangerouslySetInnerHTML={{ __html: invoiceHtml(s, co, fallback) }} />
      <div className="mt-3 rounded-lg border border-[#ececef] bg-[#fafafa] p-3 text-[12px] space-y-1">
        <div className="font-semibold uppercase tracking-wider text-[10px] text-[#71717a] mb-1">Datos internos (no visible al cliente)</div>
        <Row k="Total en $" v={fmt(s.total)} />
        <Row k="Tasa aplicada" v={rate ? `Bs ${Number(rate).toLocaleString('es-VE')} / $` : '—'} color="#b45309" />
        <Row k="Total en Bs" v={rate ? `Bs ${totalBs.toLocaleString('es-VE')}` : '—'} color="#b45309" />
        {s.realFactor > 0 && (
          <>
            <Row k="Factor real" v={'×' + s.realFactor} />
            <Row k="$ Real recibido" v={fmt(s.totalReal || Math.round(s.total * s.realFactor * 100) / 100)} color="#15803d" />
          </>
        )}
        <Row k="Facturó" v={s.userName || '—'} />
        {s.convertedTo && <Row k="Facturado en" v={s.convertedTo} color="#15803d" />}
        {s.doc !== 'cotizacion' && (
          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input type="checkbox" checked={s.isShipping} onChange={(e) => toggleEnvio(e.target.checked)} />
            <span className="font-medium">🚚 Es un envío</span>
          </label>
        )}
        {s.voidInfo && <Row k="Anulada" v={`${s.voidInfo.user} · ${s.voidInfo.reason}`} color="#dc2626" />}
      </div>
    </Modal>
  );
}

function Row({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[#71717a]">{k}</span>
      <span className="text-right" style={{ color }}>{v}</span>
    </div>
  );
}
