import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, Chip, Input, Label, Pills, Select, Stat, Table } from '../../components/admin/ui';
import { fmt, payState, PAY_STATES, saleCost, saleDateLabel, setSalePay, todayVe, veDay, type PayState } from '../../lib/sales';
import { expenseTotals, listExpenses, type Expense } from '../../lib/adminData';
import type { SalesCtx } from '../AdminSales';

type Sub = 'summary' | 'income' | 'ledger' | 'receivable' | 'taxes';
const tip = { borderRadius: 8, border: '1px solid #e6e6e9', fontSize: 12, background: '#fff', color: '#111' };

function Help({ text }: { text: string }) {
  return (
    <span title={text} className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#d4d4d8] text-[9px] text-[#71717a] cursor-help align-middle">?</span>
  );
}

function Line({ k, v, help, strong, color, border = true }: { k: ReactNode; v: ReactNode; help?: string; strong?: boolean; color?: string; border?: boolean }) {
  return (
    <div className={`flex justify-between py-2 text-[13px] ${border ? 'border-b border-[#f0f0f2]' : ''}`}>
      <span className={strong ? 'font-semibold' : 'text-[#6b7280]'}>
        {k}
        {help && <Help text={help} />}
      </span>
      <span className={strong ? 'font-semibold' : ''} style={{ color }}>{v}</span>
    </div>
  );
}

export default function AccountingTab({ ctx }: { ctx: SalesCtx }) {
  const [from, setFrom] = useState(todayVe().slice(0, 4) + '-01-01');
  const [to, setTo] = useState('');
  const [sub, setSub] = useState<Sub>('summary');
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    listExpenses().then(setExpenses).catch(() => setExpenses([]));
  }, []);

  const toEff = to || '2099-12-31';
  const sales = useMemo(() => ctx.sales.filter((s) => s.doc !== 'cotizacion' && veDay(s.date) >= from && veDay(s.date) <= toEff), [ctx.sales, from, toEff]);
  const valid = sales.filter((s) => s.pay !== 'cancelado' && s.pay !== 'reembolsado');
  const sum = (l: typeof valid, f: (s: (typeof valid)[number]) => number) => l.reduce((a, s) => a + f(s), 0);

  const totalRevenue = sum(valid, (s) => s.total);
  const totalSubtotal = sum(valid, (s) => s.subtotal);
  const totalDiscount = sum(valid, (s) => s.discount);
  const totalTax = sum(valid, (s) => s.tax);
  const totalCost = sum(valid, saleCost);
  const exp = expenseTotals(expenses.filter((e) => e.date >= from && e.date <= toEff));
  const grossProfit = totalSubtotal - totalDiscount - totalCost;
  const netProfit = grossProfit - exp.total;
  const pending = sales.filter((s) => s.pay === 'pendiente' || s.pay === 'parcial');
  const pendingTotal = sum(pending, (s) => s.total);
  const paidTotal = sum(valid.filter((s) => s.pay === 'pagado'), (s) => s.total);
  const rate = ctx.settings.rates.exchangeRate || 1;
  const rFactor = ctx.settings.rates.realFactor || 0;
  const totalBsAll = Math.round(sum(valid, (s) => s.totalBs || s.total * (s.exchangeRate || rate)));
  const totalRealAll = sum(valid, (s) => s.totalReal || Math.round(s.total * (s.realFactor || rFactor) * 100) / 100);
  const diffCambio = totalRevenue - totalRealAll;
  const red = '#dc2626', green = '#16a34a', yellow = '#ca8a04';

  const changePay = async (id: string, pay: PayState) => {
    try {
      await setSalePay(id, pay);
      await ctx.reloadSales();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-3 flex flex-wrap gap-3 items-end">
        <div><Label>Desde</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>Hasta</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </Card>
      <Pills<Sub>
        value={sub}
        onChange={setSub}
        options={[
          { key: 'summary', label: 'Resumen' },
          { key: 'income', label: 'Estado de resultados' },
          { key: 'ledger', label: 'Libro de ventas' },
          { key: 'receivable', label: 'Cuentas por cobrar' },
          { key: 'taxes', label: 'Impuestos' },
        ]}
      />

      {sub === 'summary' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Ventas ($ lista)" value={fmt(totalSubtotal)} sub="Precio cobrado al cliente" />
            <Stat label="Ventas (Bs)" value={'Bs ' + totalBsAll.toLocaleString('es-VE')} sub="Bolívares recibidos" color="#b45309" />
            <Stat label="Ventas ($ real)" value={fmt(totalRealAll)} sub="Después del cambio" color="#15803d" />
            <Stat label="Utilidad neta" value={fmt(netProfit)} sub={`Margen ${totalRevenue ? Math.round((netProfit / totalRevenue) * 100) : 0}%`} color={netProfit >= 0 ? green : red} />
          </div>
          <div className="grid lg:grid-cols-[3fr_2fr] gap-4">
            <Card className="p-4">
              <h3 className="text-[14px] font-semibold mb-2">Balance general</h3>
              <Line k="Ventas brutas" help="Lo vendido según los precios, antes de descuentos e IVA." v={fmt(totalSubtotal)} />
              <Line k="(-) Descuentos otorgados" help="Rebajas hechas a los clientes en las ventas." v={'-' + fmt(totalDiscount)} color={red} />
              <Line k="= Ventas netas" help="Ventas brutas menos descuentos: lo que realmente se vendió." v={fmt(totalSubtotal - totalDiscount)} />
              <Line k="(-) Costo de ventas" help="Lo que costaron los productos que se vendieron." v={'-' + fmt(totalCost)} color={red} />
              <Line k="= Utilidad bruta" strong help="Ventas netas menos costo de ventas: ganancia antes de gastos." v={fmt(grossProfit)} color={grossProfit >= 0 ? green : red} />
              <Line k="(-) Materia prima" help="Compras de insumos para producir (tela, hilo, tinta…)." v={'-' + fmt(exp.materiaPrima)} color={red} />
              <Line k="(-) Mermas / desechos" help="Material dañado o perdido que no se pudo vender." v={'-' + fmt(exp.merma)} color={red} />
              <Line k="(-) Gastos operativos" help="Gastos del negocio: alquiler, sueldos, servicios, etc." v={'-' + fmt(exp.operativo)} color={red} />
              <Line k="= Utilidad neta" strong help="Lo que queda de ganancia después de todos los costos y gastos." v={fmt(netProfit)} color={netProfit >= 0 ? green : red} />
              <Line k="(+) IVA cobrado" help="Impuesto cobrado en las ventas. No es ganancia: se le debe al SENIAT." v={fmt(totalTax)} color={yellow} />
              <div className="flex justify-between py-2 border-b-2 border-[#111] text-[16px] font-bold"><span>= Total cobrado</span><span>{fmt(totalRevenue)}</span></div>
              <Line k="Cobrado efectivo" help="Lo que ya se pagó de verdad (cualquier medio de pago)." v={fmt(paidTotal)} color={green} border={false} />
              <Line k="Pendiente de cobro" help="Ventas con pago pendiente que aún no se cobran." v={fmt(pendingTotal)} color="#ea580c" border={false} />
            </Card>
            <Card className="p-4">
              <h3 className="text-[14px] font-semibold mb-2">Distribución de ingresos</h3>
              <div className="h-[300px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Utilidad', v: Math.max(0, grossProfit) },
                        { name: 'Costo', v: totalCost },
                        { name: 'IVA', v: totalTax },
                        { name: 'Descuentos', v: totalDiscount },
                      ]}
                      dataKey="v"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="82%"
                      stroke="none"
                    >
                      {['#22c55e', '#ef4444', '#eab308', '#a855f7'].map((c) => <Cell key={c} fill={c} />)}
                    </Pie>
                    <Tooltip contentStyle={tip} formatter={(v: number) => fmt(v)} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}

      {sub === 'income' && (
        <Card className="p-5">
          <div className="flex items-start justify-between mb-5 gap-3">
            <div>
              <h3 className="text-[17px] font-bold">Estado de Resultados</h3>
              <p className="text-[12px] text-[#6b7280]">{ctx.settings.company.name} · Período seleccionado</p>
            </div>
            <div className="text-right text-[12px] text-[#6b7280]">{from} — {to || 'Hoy'}</div>
          </div>
          <div className="text-[13px] space-y-0.5">
            <Head>INGRESOS</Head>
            <Row k="Ventas brutas" v={fmt(totalSubtotal)} />
            <Row k="(-) Descuentos y bonificaciones" v={'-' + fmt(totalDiscount)} color={red} />
            <Row k="Ingresos netos por ventas" v={fmt(totalSubtotal - totalDiscount)} strong />
            <Head>COSTO DE VENTAS</Head>
            <Row k="Costo de productos vendidos" v={fmt(totalCost)} />
            <Row k="UTILIDAD BRUTA" v={fmt(grossProfit)} strong color={grossProfit >= 0 ? green : red} />
            <Head>GASTOS</Head>
            <Row k="(-) Materia prima (tela, hilo, insumos)" v={'-' + fmt(exp.materiaPrima)} color={red} />
            <Row k="(-) Mermas / desechos (pérdidas de producción)" v={'-' + fmt(exp.merma)} color={red} />
            <Row k="(-) Gastos operativos (alquiler, nómina, servicios)" v={'-' + fmt(exp.operativo)} color={red} />
            <Row k="Total gastos" v={'-' + fmt(exp.total)} strong color={red} />
            <Head>IMPUESTOS</Head>
            <Row k={`IVA cobrado (${valid[0]?.taxRate ?? 0}%)`} v={fmt(totalTax)} />
            <div className="flex justify-between py-3 px-3 border-t-2 border-[#111] font-bold text-[16px] mt-3">
              <span>UTILIDAD NETA</span><span style={{ color: netProfit >= 0 ? green : red }}>{fmt(netProfit)}</span>
            </div>
            {totalRealAll > 0 && (
              <>
                <Head color="#b45309">REPRESENTACIÓN EN DIVISAS</Head>
                <Row k="Ventas totales ($ lista)" v={fmt(totalRevenue)} />
                <Row k="Ventas totales (Bs cobrados)" v={'Bs ' + totalBsAll.toLocaleString('es-VE')} color="#b45309" />
                <Row k="Ventas totales ($ real recibido)" v={fmt(totalRealAll)} color="#15803d" />
                <Row k="(-) Diferencial cambiario" v={'-' + fmt(diffCambio)} color={red} />
                <Row k="Utilidad neta real ($ efectivo)" v={fmt(netProfit - diffCambio)} strong color={netProfit - diffCambio >= 0 ? '#15803d' : red} />
              </>
            )}
          </div>
        </Card>
      )}

      {sub === 'ledger' && (
        <Card>
          <Table
            head={['Fecha', 'Documento', 'Cliente', 'Subtotal', 'Desc.', 'Base imp.', 'IVA', 'Total', 'Estado']}
            empty={valid.length ? false : 'Sin registros en este período.'}
            foot={
              valid.length ? (
                <tr>
                  <td colSpan={3}>TOTALES ({valid.length} docs)</td>
                  <td>{fmt(totalSubtotal)}</td>
                  <td style={{ color: red }}>{totalDiscount ? '-' + fmt(totalDiscount) : '—'}</td>
                  <td>{fmt(totalSubtotal - totalDiscount)}</td>
                  <td style={{ color: yellow }}>{fmt(totalTax)}</td>
                  <td>{fmt(totalRevenue)}</td>
                  <td />
                </tr>
              ) : undefined
            }
          >
            {valid.map((s) => {
              const st = payState(s.pay);
              return (
                <tr key={s.id} className="cursor-pointer hover:bg-[#fafafa]" onClick={() => ctx.openInvoice(s.id)}>
                  <td className="text-[12px] text-[#6b7280] whitespace-nowrap">{saleDateLabel(s.date)}</td>
                  <td className="font-semibold">{s.id}</td>
                  <td>{s.customer || 'Consumidor final'}</td>
                  <td>{fmt(s.subtotal)}</td>
                  <td style={{ color: s.discount ? red : undefined }}>{s.discount ? '-' + fmt(s.discount) : '—'}</td>
                  <td>{fmt(s.subtotal - s.discount)}</td>
                  <td style={{ color: yellow }}>{fmt(s.tax)}</td>
                  <td className="font-semibold">{fmt(s.total)}</td>
                  <td><Chip color={st.color}>{st.label}</Chip></td>
                </tr>
              );
            })}
          </Table>
        </Card>
      )}

      {sub === 'receivable' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat label="Total por cobrar" value={fmt(pendingTotal)} color="#ea580c" />
            <Stat label="Pendientes" value={String(sales.filter((s) => s.pay === 'pendiente').length)} sub={fmt(sum(sales.filter((s) => s.pay === 'pendiente'), (s) => s.total))} />
            <Stat label="Pagos parciales" value={String(sales.filter((s) => s.pay === 'parcial').length)} sub={fmt(sum(sales.filter((s) => s.pay === 'parcial'), (s) => s.total))} color={yellow} />
          </div>
          <Card>
            <Table head={['Documento', 'Cliente', 'Fecha', 'Total', 'Estado', 'Acción']} empty={pending.length ? false : 'No hay cuentas por cobrar. ¡Todo al día!'}>
              {pending.map((s) => {
                const st = payState(s.pay);
                return (
                  <tr key={s.id}>
                    <td className="font-semibold">{s.id}</td>
                    <td>{s.customer || 'Consumidor final'}</td>
                    <td className="text-[12px] text-[#6b7280] whitespace-nowrap">{saleDateLabel(s.date)}</td>
                    <td className="font-semibold">{fmt(s.total)}</td>
                    <td><Chip color={st.color}>{st.label}</Chip></td>
                    <td>
                      {s.payMethod === 'credito' ? <span className="text-[12px] text-[#2563eb]">💳 Abonos en Personal</span> : <Select value={s.pay} onChange={(e) => changePay(s.id, e.target.value as PayState)} className="!w-auto !py-1 !px-2 !text-[12px]">
                        {PAY_STATES.filter((p) => p.key !== 'cancelado').map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                      </Select>}
                    </td>
                  </tr>
                );
              })}
            </Table>
          </Card>
        </>
      )}

      {sub === 'taxes' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat label="Base imponible" value={fmt(totalSubtotal - totalDiscount)} />
            <Stat label="IVA recaudado" value={fmt(totalTax)} color={yellow} />
            <Stat label="Tasa promedio" value={(totalSubtotal - totalDiscount ? Math.round((totalTax / (totalSubtotal - totalDiscount)) * 100) : 0) + '%'} />
          </div>
          <Card className="p-4">
            <h3 className="text-[14px] font-semibold mb-2">Detalle de IVA por documento</h3>
            <Table
              head={['Documento', 'Fecha', 'Base imponible', 'Tasa', 'IVA cobrado']}
              empty={valid.length ? false : 'Sin registros.'}
              foot={valid.length ? <tr><td colSpan={2}>TOTAL</td><td>{fmt(totalSubtotal - totalDiscount)}</td><td /><td style={{ color: yellow }}>{fmt(totalTax)}</td></tr> : undefined}
            >
              {valid.map((s) => (
                <tr key={s.id}>
                  <td className="font-semibold">{s.id}</td>
                  <td className="text-[12px] text-[#6b7280] whitespace-nowrap">{saleDateLabel(s.date)}</td>
                  <td>{fmt(s.subtotal - s.discount)}</td>
                  <td>{s.taxRate}%</td>
                  <td style={{ color: yellow }}>{fmt(s.tax)}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}

function Head({ children, color }: { children: ReactNode; color?: string }) {
  return <div className="flex justify-between py-2 px-3 mt-3 font-semibold bg-[#f4f4f5] rounded-lg" style={{ color }}>{children}</div>;
}
function Row({ k, v, strong, color }: { k: ReactNode; v: ReactNode; strong?: boolean; color?: string }) {
  return (
    <div className={`flex justify-between py-2 px-3 ${strong ? 'border-t border-[#f0f0f2] font-semibold' : ''}`}>
      <span style={!strong ? { color } : undefined}>{k}</span>
      <span style={{ color }}>{v}</span>
    </div>
  );
}
