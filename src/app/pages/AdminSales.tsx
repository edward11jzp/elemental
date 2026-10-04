import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { usePerms } from '../lib/perms';
import { Tabs } from '../components/admin/ui';
import { listSales, todayVe, type Sale } from '../lib/sales';
import {
  DEFAULT_SETTINGS,
  fetchBcv,
  listCustomers,
  loadAdminSettings,
  saveAdminSetting,
  type AdminSettings,
  type Customer,
} from '../lib/adminData';
import PosTab from './sales/PosTab';
import DocsTab from './sales/DocsTab';
import CloseTab from './sales/CloseTab';
import ReportsTab from './sales/ReportsTab';
import AccountingTab from './sales/AccountingTab';
import InvoiceModal from './sales/InvoiceModal';
import { bySede, useSedes } from '../lib/sedes';

export interface SalesCtx {
  isAdmin: boolean; // admin o gerente (anular, fechas pasadas, descuentos, tasas, crédito)
  canCosts: boolean; // módulo «Ganancias y costos»
  sales: Sale[];
  settings: AdminSettings;
  setSettings: (s: AdminSettings) => void;
  customers: Customer[];
  setCustomers: (c: Customer[]) => void;
  reloadSales: () => Promise<void>;
  openInvoice: (id: string) => void;
}

type Tab = 'pos' | 'docs' | 'reports' | 'close' | 'accounting';

// Hora de Venezuela (UTC-4).
const veHour = () => new Date(Date.now() - 4 * 3600e3).getUTCHours();

export default function AdminSales() {
  const { isManager, can } = usePerms();
  const isAdmin = isManager;
  const canCosts = can('Ganancias y costos');
  const [tab, setTab] = useState<Tab>('pos');
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const { sede } = useSedes();
  // Lo que se ve en Facturación, Reportes, Cierre y Contabilidad sigue al selector de sede.
  const sales = useMemo(() => bySede(allSales, sede), [allSales, sede]);
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reloadSales = useCallback(async () => {
    try {
      setAllSales(await listSales());
    } catch (e: any) {
      setLoadError(e?.message ?? 'No se pudieron cargar las ventas');
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [st, cs] = await Promise.all([loadAdminSettings(), listCustomers()]);
        setSettings(st);
        setCustomers(cs);
        // Tasa automática: a partir de las 5:00 a.m. (Venezuela) se toma la del BCV una vez al día.
        if (isAdmin && st.rates.rateAuto && st.rates.rateDate !== todayVe() && veHour() >= 5) {
          try {
            const b = await fetchBcv();
            const rate = st.rates.rateCurrency === 'EUR' ? b.eur : b.usd;
            if (rate > 0) {
              const rates = { ...st.rates, exchangeRate: rate, rateDate: todayVe() };
              await saveAdminSetting('rates', rates);
              setSettings({ ...st, rates });
              toast.success('Tasa BCV del día aplicada: Bs ' + rate.toLocaleString('es-VE'));
            }
          } catch {
            /* se reintenta en la próxima carga */
          }
        }
      } catch (e: any) {
        setLoadError(e?.message ?? 'Error cargando datos');
      }
    })();
    reloadSales();
  }, [isAdmin, reloadSales]);

  const ctx: SalesCtx = {
    isAdmin,
    canCosts,
    sales,
    settings,
    setSettings,
    customers,
    setCustomers,
    reloadSales,
    openInvoice: setInvoiceId,
  };

  return (
    <div className="px-4 lg:px-6 py-5 max-w-[1600px]">
      {loadError && (
        <div className="mb-4 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#b91c1c]">
          {loadError.includes('does not exist') || loadError.includes('schema cache')
            ? 'Falta ejecutar la migración supabase/admin_phase1_sales_expenses.sql en Supabase.'
            : loadError}
        </div>
      )}
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'pos', label: '🧾 Nueva venta' },
          { key: 'docs', label: '📄 Facturación' },
          { key: 'reports', label: '📊 Reportes', hidden: !canCosts },
          { key: 'close', label: '🌙 Cierre del día' },
          { key: 'accounting', label: '📑 Contabilidad', hidden: !canCosts },
        ]}
      />
      {tab === 'pos' && <PosTab ctx={ctx} />}
      {tab === 'docs' && <DocsTab ctx={ctx} />}
      {tab === 'reports' && canCosts && <ReportsTab ctx={ctx} />}
      {tab === 'close' && <CloseTab ctx={ctx} />}
      {tab === 'accounting' && canCosts && <AccountingTab ctx={ctx} />}

      <InvoiceModal ctx={ctx} saleId={invoiceId} onClose={() => setInvoiceId(null)} />
    </div>
  );
}
