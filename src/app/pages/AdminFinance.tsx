// Calculadora financiera: conversión $ -> Bs -> USDT -> COP y ganancia neta
// por prenda. Replica la hoja de cálculo del admin (celdas amarillas =
// entrada manual, celdas azules = fórmulas calculadas).
//
// Persistencia: solo en localStorage de este navegador (herramienta interna,
// no viaja a Supabase). Si el admin abre el panel desde otro dispositivo,
// no verá los mismos datos — es una calculadora de trabajo, no un registro
// compartido.

import { useEffect, useState } from 'react';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import FxTable from '../components/admin/FxTable';

interface FinanceRow {
  id: string;
  precio: string;       // A: Precio ($)
  tasaCobro: string;    // B: Tasa Cobro (Bs)
  tasaUSDT: string;     // D: Tasa USDT (Bs)
  tasaCOP: string;      // F: Tasa COP
  precioReal: string;   // H: precio real
  costoPrenda: string;  // Costo Prenda (Pesos) — tabla 2
}

const STORAGE_KEY = 'elemental_finance_calc_v1';

function emptyRow(): FinanceRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    precio: '',
    tasaCobro: '',
    tasaUSDT: '',
    tasaCOP: '',
    precioReal: '',
    costoPrenda: '',
  };
}

function loadRows(): FinanceRow[] {
  if (typeof window === 'undefined') return [emptyRow()];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [emptyRow()];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [emptyRow()];
  } catch {
    return [emptyRow()];
  }
}

const num = (s: string): number => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n: number, decimals = 2): string =>
  Number.isFinite(n)
    ? n.toLocaleString('es-VE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : '—';

export default function AdminFinance() {
  const [rows, setRows] = useState<FinanceRow[]>(loadRows);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  const updateField = (id: string, field: keyof FinanceRow, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (id: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const resetAll = () => {
    if (!window.confirm('¿Borrar todas las filas y empezar de cero?')) return;
    setRows([emptyRow()]);
  };

  const inputCls =
    'w-full bg-yellow-500/10 border border-yellow-500/40 rounded px-2 py-1.5 text-sm text-white text-right focus:outline-none focus:ring-1 focus:ring-yellow-400';
  const computedCls =
    'w-full bg-blue-500/10 border border-blue-500/30 rounded px-2 py-1.5 text-sm text-white text-right';

  return (
    <div className="max-w-full">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Calculadora Financiera</h1>
        <p className="text-muted-foreground">
          Conversión $ → Bs → USDT → COP y ganancia neta por prenda. Los campos amarillos son de
          entrada manual; los azules se calculan solos.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Estos datos se guardan solo en este navegador — no se sincronizan entre dispositivos.
        </p>
      </div>

      {/* Tabla 1: conversión de tasas */}
      <div className="bg-secondary rounded-lg border border-border p-4 mb-6 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Conversión de Tasas</h2>
        <table className="min-w-[900px] w-full border-collapse text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-white/70">
              <th className="p-2 text-right">Precio ($)</th>
              <th className="p-2 text-right">Tasa Cobro (Bs)</th>
              <th className="p-2 text-right bg-blue-500/5">Bs a Recibir</th>
              <th className="p-2 text-right">Tasa USDT (Bs)</th>
              <th className="p-2 text-right bg-blue-500/5">USDT Comprados</th>
              <th className="p-2 text-right">Tasa COP</th>
              <th className="p-2 text-right bg-blue-500/5">Pesos Finales</th>
              <th className="p-2 text-right">Precio Real</th>
              <th className="p-2 text-right bg-blue-500/5">Tu Tasa Real ($ a COP)</th>
              <th className="p-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const precio = num(row.precio);
              const tasaCobro = num(row.tasaCobro);
              const bsARecibir = precio * tasaCobro;

              const tasaUSDT = num(row.tasaUSDT);
              const usdtComprados = tasaUSDT !== 0 ? bsARecibir / tasaUSDT : 0;

              const tasaCOP = num(row.tasaCOP);
              const pesosFinales = usdtComprados * tasaCOP;

              const precioReal = num(row.precioReal);
              const tasaReal = precioReal !== 0 ? pesosFinales / precioReal : 0;

              return (
                <tr key={row.id} className="border-t border-border/50">
                  <td className="p-1.5">
                    <input
                      type="number"
                      inputMode="decimal"
                      className={inputCls}
                      value={row.precio}
                      onChange={(e) => updateField(row.id, 'precio', e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="number"
                      inputMode="decimal"
                      className={inputCls}
                      value={row.tasaCobro}
                      onChange={(e) => updateField(row.id, 'tasaCobro', e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className="p-1.5">
                    <div className={computedCls}>{fmt(bsARecibir)}</div>
                  </td>
                  <td className="p-1.5">
                    <input
                      type="number"
                      inputMode="decimal"
                      className={inputCls}
                      value={row.tasaUSDT}
                      onChange={(e) => updateField(row.id, 'tasaUSDT', e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className="p-1.5">
                    <div className={computedCls}>{fmt(usdtComprados, 4)}</div>
                  </td>
                  <td className="p-1.5">
                    <input
                      type="number"
                      inputMode="decimal"
                      className={inputCls}
                      value={row.tasaCOP}
                      onChange={(e) => updateField(row.id, 'tasaCOP', e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className="p-1.5">
                    <div className={computedCls}>{fmt(pesosFinales)}</div>
                  </td>
                  <td className="p-1.5">
                    <input
                      type="number"
                      inputMode="decimal"
                      className={inputCls}
                      value={row.precioReal}
                      onChange={(e) => updateField(row.id, 'precioReal', e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className="p-1.5">
                    <div className={computedCls}>{fmt(tasaReal)}</div>
                  </td>
                  <td className="p-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Eliminar fila"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tabla 2: costo de prenda y ganancia neta, ligada fila-a-fila con la tabla 1 */}
      <div className="bg-secondary rounded-lg border border-border p-4 mb-6 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Costo y Ganancia por Prenda</h2>
        <table className="min-w-[800px] w-full border-collapse text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-white/70">
              <th className="p-2 text-right">Costo Prenda (Pesos)</th>
              <th className="p-2 text-right bg-blue-500/5">Tasa COP del Día</th>
              <th className="p-2 text-right bg-blue-500/5">Costo Real en $</th>
              <th className="p-2 text-right bg-blue-500/5">Pesos Finales Venta</th>
              <th className="p-2 text-right bg-blue-500/5">Ganancia Limpia (COP)</th>
              <th className="p-2 text-right bg-blue-500/5">Ganancia Limpia $</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const precio = num(row.precio);
              const tasaCobro = num(row.tasaCobro);
              const bsARecibir = precio * tasaCobro;
              const tasaUSDT = num(row.tasaUSDT);
              const usdtComprados = tasaUSDT !== 0 ? bsARecibir / tasaUSDT : 0;
              const tasaCOP = num(row.tasaCOP);
              const pesosFinales = usdtComprados * tasaCOP;
              const precioReal = num(row.precioReal);
              const tasaReal = precioReal !== 0 ? pesosFinales / precioReal : 0;

              const costoPrenda = num(row.costoPrenda);
              const costoRealUSD = tasaReal !== 0 ? costoPrenda / tasaReal : 0;
              const gananciaLimpiaCOP = pesosFinales - costoPrenda;
              const gananciaLimpiaUSD = tasaReal !== 0 ? gananciaLimpiaCOP / tasaReal : 0;

              return (
                <tr key={row.id} className="border-t border-border/50">
                  <td className="p-1.5">
                    <input
                      type="number"
                      inputMode="decimal"
                      className={inputCls}
                      value={row.costoPrenda}
                      onChange={(e) => updateField(row.id, 'costoPrenda', e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className="p-1.5">
                    <div className={computedCls}>{fmt(tasaReal)}</div>
                  </td>
                  <td className="p-1.5">
                    <div className={computedCls}>${fmt(costoRealUSD)}</div>
                  </td>
                  <td className="p-1.5">
                    <div className={computedCls}>{fmt(pesosFinales)}</div>
                  </td>
                  <td className="p-1.5">
                    <div className={computedCls}>{fmt(gananciaLimpiaCOP)}</div>
                  </td>
                  <td className="p-1.5">
                    <div className={computedCls}>${fmt(gananciaLimpiaUSD)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Agregar Fila
        </button>
        <button
          type="button"
          onClick={resetAll}
          className="inline-flex items-center gap-2 border border-border hover:bg-white/5 px-4 py-2 rounded-md text-sm transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Reiniciar Todo
        </button>
      </div>

      <FxTable />
    </div>
  );
}
