import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Btn, Card, Input, Label, Stat } from '../../components/admin/ui';
import { listExpenses, type Expense } from '../../lib/adminData';
import { fmt, isValidSale, todayVe, veDay, type Sale } from '../../lib/sales';
import { useSedes } from '../../lib/sedes';

/*
 * Cierre de mes por sede, con el mismo formato del Excel «Formato de rentabilidad»:
 * productos vendidos a costo, gastos, ventas, utilidad, % gastado y rentabilidad.
 * Las tiendas comparten la cuenta bancaria, así que además se calcula cuánto
 * dinero aportó cada una (cobrado − gastos), en el mes y acumulado.
 * Los gastos generales (sin sede) se reparten por el % de ventas del mes.
 */

const SIN = '__sin__';
const r2 = (v: number) => Math.round(v * 100) / 100;

interface Bloque {
  id: string;
  nombre: string;
  ventas: number;
  productos: { nombre: string; unidades: number; costoU: number; valor: number }[];
  costo: number;
  gastos: { nombre: string; valor: number }[];
  totalGastos: number;
  pctVentas: number;
  utilidad: number;
  pctGastado: number;
  rentabilidad: number;
  cobrado: number;
  neto: number;
  netoAcum: number;
  envios: number;
  enviosMonto: number;
}

/** Lo que entró al banco por una venta, por día: abonos o, si no los hay, el total al venderse. */
function cobros(s: Sale): { date: string; amount: number }[] {
  if (s.payments.length) return s.payments.filter((p) => p.method !== 'nomina').map((p) => ({ date: p.date, amount: p.amount }));
  return s.pay === 'pagado' ? [{ date: veDay(s.date), amount: s.total }] : [];
}

/** Parte de cada gasto por sede. Los generales se reparten con el peso de ventas dado. */
function gastoPorSede(e: Expense, peso: Map<string, number>): [string, number][] {
  if (e.splits?.length) return e.splits.map((x) => [x.locationId, x.amount]);
  if (e.locationId) return [[e.locationId, e.amount]];
  if (!peso.size) return [[SIN, e.amount]];
  return [...peso.entries()].map(([id, p]) => [id, e.amount * p]);
}

export default function MonthTab({ allSales }: { allSales: Sale[] }) {
  const { sedes, nameOf } = useSedes();
  const [mes, setMes] = useState(todayVe().slice(0, 7));
  const [expenses, setExpenses] = useState<Expense[]>([]);
  useEffect(() => { listExpenses().then(setExpenses).catch((e) => toast.error(e.message)); }, []);

  const bloques = useMemo(() => {
    const valid = allSales.filter(isValidSale);
    const sedeDe = (s: Sale) => s.locationId ?? SIN;
    // Sedes activas más cualquier otra que tenga ventas (p. ej. una ya desactivada).
    const ids = [...new Set([...sedes.map((s) => s.id), ...valid.map((s) => s.locationId).filter((x): x is string => !!x), SIN])];

    // Peso de ventas por mes, para repartir los generales de cada mes (también en el acumulado).
    const pesoCache = new Map<string, Map<string, number>>();
    const pesoDe = (m: string) => {
      if (pesoCache.has(m)) return pesoCache.get(m)!;
      const v = new Map<string, number>();
      valid.filter((s) => veDay(s.date).startsWith(m) && s.locationId).forEach((s) => v.set(s.locationId!, (v.get(s.locationId!) ?? 0) + s.total));
      const tot = [...v.values()].reduce((a, x) => a + x, 0);
      const p = new Map<string, number>();
      if (tot > 0) v.forEach((x, k) => p.set(k, x / tot));
      pesoCache.set(m, p);
      return p;
    };

    const out: Bloque[] = ids.map((id) => {
      const delMes = valid.filter((s) => sedeDe(s) === id && veDay(s.date).startsWith(mes));
      const ventas = delMes.reduce((a, s) => a + s.total, 0);
      const envios = delMes.filter((s) => s.isShipping);
      const prod = new Map<string, { unidades: number; valor: number }>();
      delMes.forEach((s) => s.items.forEach((i) => {
        const p = prod.get(i.name) ?? { unidades: 0, valor: 0 };
        p.unidades += i.qty;
        p.valor += (i.cost ?? 0) * i.qty;
        prod.set(i.name, p);
      }));
      const productos = [...prod.entries()]
        .map(([nombre, p]) => ({ nombre, unidades: p.unidades, costoU: p.unidades ? r2(p.valor / p.unidades) : 0, valor: r2(p.valor) }))
        .sort((a, b) => b.valor - a.valor);
      const costo = productos.reduce((a, p) => a + p.valor, 0);

      const g = new Map<string, number>();
      let netoGastoAcum = 0;
      expenses.forEach((e) => {
        const m = e.date.slice(0, 7);
        if (m > mes) return;
        const parte = gastoPorSede(e, pesoDe(m)).filter(([k]) => k === id).reduce((a, [, v]) => a + v, 0);
        if (!parte) return;
        netoGastoAcum += parte;
        if (m === mes) {
          const nombre = !e.splits?.length && !e.locationId ? `${e.category} (general)` : e.category;
          g.set(nombre, (g.get(nombre) ?? 0) + parte);
        }
      });
      const gastos = [...g.entries()].map(([nombre, valor]) => ({ nombre, valor: r2(valor) })).sort((a, b) => b.valor - a.valor);
      const totalGastos = r2(gastos.reduce((a, x) => a + x.valor, 0));

      let cobrado = 0, cobradoAcum = 0;
      valid.filter((s) => sedeDe(s) === id).forEach((s) => cobros(s).forEach((c) => {
        if (c.date.slice(0, 7) === mes) cobrado += c.amount;
        if (c.date.slice(0, 7) <= mes) cobradoAcum += c.amount;
      }));

      const usado = costo + totalGastos;
      return {
        id,
        nombre: id === SIN ? 'Sin sede' : nameOf(id),
        ventas: r2(ventas),
        productos,
        costo: r2(costo),
        gastos,
        totalGastos,
        pctVentas: pesoDe(mes).get(id) ?? 0,
        utilidad: r2(ventas - usado),
        pctGastado: ventas ? (usado * 100) / ventas : 0,
        rentabilidad: ventas ? 100 - (usado * 100) / ventas : 0,
        cobrado: r2(cobrado),
        neto: r2(cobrado - totalGastos),
        netoAcum: r2(cobradoAcum - netoGastoAcum),
        envios: envios.length,
        enviosMonto: r2(envios.reduce((a, s) => a + s.total, 0)),
      };
    });
    return out.filter((b) => sedes.some((x) => x.id === b.id) || b.ventas || b.totalGastos || b.netoAcum);
  }, [allSales, expenses, sedes, mes, nameOf]);

  const tot = bloques.reduce(
    (a, b) => ({ ventas: a.ventas + b.ventas, costo: a.costo + b.costo, gastos: a.gastos + b.totalGastos, neto: a.neto + b.neto, acum: a.acum + b.netoAcum, envios: a.envios + b.envios, enviosMonto: a.enviosMonto + b.enviosMonto }),
    { ventas: 0, costo: 0, gastos: 0, neto: 0, acum: 0, envios: 0, enviosMonto: 0 },
  );
  const utilTot = tot.ventas - tot.costo - tot.gastos;

  const exportar = () => {
    const td = (v: string | number, b = false) => `<td${b ? ' style="font-weight:bold"' : ''}>${typeof v === 'number' ? String(r2(v)).replace('.', ',') : v}</td>`;
    const tr = (...c: string[]) => `<tr>${c.join('')}</tr>`;
    let h = `<h2>CIERRE ${mes} · TODAS LAS SEDES</h2><table border="1">`;
    h += tr(td('SEDE', true), td('VENTAS', true), td('COSTO', true), td('GASTOS', true), td('INGRESOS', true), td('RENTABILIDAD %', true), td('COBRADO', true), td('NETO MES', true), td('SALDO ACUMULADO', true), td('ENVIOS', true), td('VENTAS POR ENVIO', true));
    bloques.forEach((b) => (h += tr(td(b.nombre), td(b.ventas), td(b.costo), td(b.totalGastos), td(b.utilidad), td(b.rentabilidad), td(b.cobrado), td(b.neto), td(b.netoAcum), td(b.envios), td(b.enviosMonto))));
    h += tr(td('TOTAL', true), td(tot.ventas, true), td(tot.costo, true), td(tot.gastos, true), td(utilTot, true), td(tot.ventas ? 100 - ((tot.costo + tot.gastos) * 100) / tot.ventas : 0, true), td(''), td(tot.neto, true), td(tot.acum, true), td(tot.envios, true), td(tot.enviosMonto, true));
    h += '</table>';
    bloques.forEach((b) => {
      h += `<br><h3>${b.nombre}</h3><table border="1">`;
      const filas = Math.max(b.productos.length, b.gastos.length + 1);
      h += tr(td('PRODUCTOS', true), td('COSTO UNITARIO', true), td('UNIDADES', true), td('VALOR', true), '<td></td>', td('GASTOS', true), td('VALOR', true), '<td></td>', td('INGRESOS', true), td(b.utilidad, true));
      const lado = [
        ['INGRESOS GASTADOS %', b.pctGastado], ['RENTABILIDAD %', b.rentabilidad], ['VENTAS TOTALES', b.ventas],
        ['GASTOS Y COSTOS TOTALES', b.costo + b.totalGastos], ['COBRADO EN EL MES', b.cobrado], ['NETO DEL MES', b.neto], ['SALDO ACUMULADO', b.netoAcum], ['ENVIOS (CANTIDAD)', b.envios], ['VENTAS POR ENVIO', b.enviosMonto],
      ] as [string, number][];
      for (let i = 0; i < Math.max(filas, lado.length); i++) {
        const p = b.productos[i], g = b.gastos[i], l = lado[i];
        const gCell = g ? td(g.nombre) + td(g.valor) : i === b.gastos.length ? td('TOTAL', true) + td(b.totalGastos, true) : '<td></td><td></td>';
        h += tr(p ? td(p.nombre) + td(p.costoU) + td(p.unidades) + td(p.valor) : '<td></td><td></td><td></td><td></td>', '<td></td>', gCell, '<td></td>', l ? td(l[0]) + td(l[1]) : '<td></td><td></td>');
      }
      h += tr(td(''), td(''), td('COSTO TOTAL', true), td(b.costo, true));
      h += '</table>';
    });
    const blob = new Blob([`<html><head><meta charset="utf-8"></head><body>${h}</body></html>`], { type: 'application/vnd.ms-excel' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rentabilidad_${mes}.xls`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const pct = (v: number) => (Math.round(v * 10) / 10).toLocaleString('es-VE') + '%';
  return (
    <div className="space-y-4">
      <Card className="p-3 flex flex-wrap items-end gap-3">
        <div><Label>Mes</Label><Input type="month" value={mes} max={todayVe().slice(0, 7)} onChange={(e) => setMes(e.target.value)} /></div>
        <p className="flex-1 min-w-[200px] text-[12px] text-[#6b7280]">
          Todas las sedes, sin importar el selector de arriba. Los gastos generales se reparten por el % de ventas del mes.
        </p>
        <Btn onClick={exportar}>⬇️ Exportar a Excel</Btn>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Ventas" value={fmt(tot.ventas)} />
        <Stat label="Costo + gastos" value={fmt(tot.costo + tot.gastos)} color="#dc2626" />
        <Stat label="Ingresos" value={fmt(utilTot)} sub={tot.ventas ? 'rentabilidad ' + pct((utilTot * 100) / tot.ventas) : undefined} color={utilTot >= 0 ? '#15803d' : '#dc2626'} />
        <Stat label="En las cuentas (acumulado)" value={fmt(tot.acum)} sub="cobrado − gastos, todas las sedes" />
      </div>

      <Card className="p-4 overflow-x-auto">
        <h3 className="text-[14px] font-semibold mb-1">🚚 Ventas por envío</h3>
        <p className="text-[11px] text-[#6b7280] mb-3">Ventas del mes marcadas como envío en cada sede.</p>
        <table className="w-full text-[13px]">
          <thead className="text-[11px] text-[#6b7280] text-left">
            <tr><th className="py-1">Sede</th><th className="text-right">Envíos</th><th className="text-right">Monto</th><th className="text-right">% de sus ventas</th></tr>
          </thead>
          <tbody>
            {bloques.map((b) => (
              <tr key={b.id} className="border-t border-[#f1f1f3]">
                <td className="py-1.5 font-medium">{b.nombre}</td>
                <td className="text-right">{b.envios}</td>
                <td className="text-right">{fmt(b.enviosMonto)}</td>
                <td className="text-right">{b.ventas ? pct((b.enviosMonto * 100) / b.ventas) : '—'}</td>
              </tr>
            ))}
            <tr className="border-t border-[#e6e6e9] font-semibold">
              <td className="py-1.5">Total</td>
              <td className="text-right">{tot.envios}</td>
              <td className="text-right">{fmt(tot.enviosMonto)}</td>
              <td className="text-right">{tot.ventas ? pct((tot.enviosMonto * 100) / tot.ventas) : '—'}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card className="p-4 overflow-x-auto">
        <h3 className="text-[14px] font-semibold mb-1">¿De quién es el dinero de la cuenta?</h3>
        <p className="text-[11px] text-[#6b7280] mb-3">Lo que cada sede ha cobrado menos lo que ha gastado, desde el inicio hasta este mes.</p>
        <table className="w-full text-[13px]">
          <thead className="text-[11px] text-[#6b7280] text-left">
            <tr><th className="py-1">Sede</th><th className="text-right">% ventas</th><th className="text-right">Cobrado mes</th><th className="text-right">Gastos mes</th><th className="text-right">Neto mes</th><th className="text-right">Saldo acumulado</th></tr>
          </thead>
          <tbody>
            {bloques.map((b) => (
              <tr key={b.id} className="border-t border-[#f1f1f3]">
                <td className="py-1.5 font-medium">{b.nombre}</td>
                <td className="text-right">{pct(b.pctVentas * 100)}</td>
                <td className="text-right">{fmt(b.cobrado)}</td>
                <td className="text-right text-[#dc2626]">{fmt(b.totalGastos)}</td>
                <td className={`text-right ${b.neto < 0 ? 'text-[#dc2626]' : ''}`}>{fmt(b.neto)}</td>
                <td className={`text-right font-semibold ${b.netoAcum < 0 ? 'text-[#dc2626]' : 'text-[#15803d]'}`}>{fmt(b.netoAcum)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {bloques.some((b) => b.netoAcum < 0) && <p className="mt-2 text-[11px] text-[#b45309]">⚠️ Un saldo en rojo significa que esa sede ha gastado dinero que generaron las otras.</p>}
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {bloques.map((b) => (
          <Card key={b.id} className="p-4 space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-[15px] font-semibold">{b.nombre}</h3>
              <span className={`text-[13px] font-semibold ${b.rentabilidad >= 0 ? 'text-[#15803d]' : 'text-[#dc2626]'}`}>rentabilidad {pct(b.rentabilidad)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[12px]">
              <div><div className="text-[#6b7280]">Ventas</div><b>{fmt(b.ventas)}</b></div>
              <div><div className="text-[#6b7280]">Gastos y costos</div><b>{fmt(b.costo + b.totalGastos)}</b> <span className="text-[#6b7280]">({pct(b.pctGastado)})</span></div>
              <div><div className="text-[#6b7280]">Ingresos</div><b className={b.utilidad < 0 ? 'text-[#dc2626]' : ''}>{fmt(b.utilidad)}</b></div>
            </div>
            <details>
              <summary className="cursor-pointer text-[12px] text-[#6b7280]">Productos vendidos a costo · {fmt(b.costo)}</summary>
              <table className="w-full text-[12px] mt-1">
                <thead className="text-[#6b7280] text-left"><tr><th>Producto</th><th className="text-right">Costo u.</th><th className="text-right">Unid.</th><th className="text-right">Valor</th></tr></thead>
                <tbody>{b.productos.map((p) => <tr key={p.nombre}><td>{p.nombre}</td><td className="text-right">{fmt(p.costoU)}</td><td className="text-right">{p.unidades}</td><td className="text-right">{fmt(p.valor)}</td></tr>)}</tbody>
              </table>
            </details>
            <details>
              <summary className="cursor-pointer text-[12px] text-[#6b7280]">Gastos · {fmt(b.totalGastos)}</summary>
              <table className="w-full text-[12px] mt-1">
                <tbody>{b.gastos.map((g) => <tr key={g.nombre}><td>{g.nombre}</td><td className="text-right">{fmt(g.valor)}</td></tr>)}</tbody>
              </table>
            </details>
          </Card>
        ))}
      </div>
    </div>
  );
}
