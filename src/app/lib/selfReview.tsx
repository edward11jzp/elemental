// Auto-revisión: lo que un gerente hace sobre sí mismo (venderse, anular su
// propia venta, abonar a su crédito o pagarse la nómina) queda «por aprobar»
// hasta que un administrador lo confirme. Marcar no bloquea la operación.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from './supabase';
import { usePerms } from './perms';

export interface SelfReview {
  key: string;
  kind: 'sale' | 'void' | 'abono' | 'payroll';
  ref: string;
  byName: string;
  detail: string;
  at: string;
}

const Ctx = createContext<{ byRef: Map<string, SelfReview>; list: SelfReview[]; approve: (key: string) => Promise<void>; reload: () => void }>({
  byRef: new Map(),
  list: [],
  approve: async () => {},
  reload: () => {},
});

export function SelfReviewProvider({ children }: { children: ReactNode }) {
  const { isManager, ready } = usePerms();
  const [list, setList] = useState<SelfReview[]>([]);

  const reload = useCallback(() => {
    if (!isManager) return;
    supabase
      .from('self_reviews')
      .select('*')
      .then(({ data }) => {
        if (data) setList(data.map((r: any) => ({ key: r.key, kind: r.kind, ref: r.ref, byName: r.by_name ?? '', detail: r.detail ?? '', at: r.at })));
      });
  }, [isManager]);

  useEffect(() => {
    if (!ready) return;
    reload();
    const t = setInterval(() => !document.hidden && reload(), 60000);
    return () => clearInterval(t);
  }, [ready, reload]);

  const approve = useCallback(
    async (key: string) => {
      const { error } = await supabase.rpc('approve_self_review', { p_key: key });
      if (error) return toast.error(error.message);
      toast.success('Aprobado ✓');
      setList((x) => x.filter((r) => r.key !== key));
    },
    [],
  );

  // Indexado por referencia (id de venta, de abono o de gasto) para pintar el distintivo.
  const byRef = useMemo(() => {
    const m = new Map<string, SelfReview>();
    for (const r of list) {
      m.set(r.ref, r);
      if (r.kind === 'abono') m.set(r.ref.split('|')[1] ?? r.ref, r);
    }
    return m;
  }, [list]);

  return <Ctx.Provider value={{ byRef, list, approve, reload }}>{children}</Ctx.Provider>;
}

export const useSelfReviews = () => useContext(Ctx);

/** Distintivo «⏳ Por aprobar» para una venta, abono o gasto. Vacío si no aplica. */
export function SelfReviewBadge({ refId }: { refId: string }) {
  const { byRef, approve } = useSelfReviews();
  const { isAdmin } = usePerms();
  const r = byRef.get(refId);
  if (!r) return null;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-[#fef9c3] text-[#a16207]" title={`${r.byName} · ${r.detail}`}>
        ⏳ Por aprobar
      </span>
      {isAdmin && (
        <button
          type="button"
          className="rounded border border-[#e6e6e9] bg-[#fff] px-1.5 py-0.5 text-[10px] text-[#111] hover:bg-[#f4f4f5]"
          onClick={(e) => { e.stopPropagation(); approve(r.key); }}
        >
          ✓ Aprobar
        </button>
      )}
    </span>
  );
}

const KIND_LABEL: Record<SelfReview['kind'], string> = {
  sale: 'se facturó una venta a sí mismo',
  void: 'anuló su propia venta',
  abono: 'registró un abono a su propio crédito',
  payroll: 'registró su propio pago de sueldo',
};

/** Aviso con todo lo que está por aprobar. Lo ven admin y gerentes; sólo el admin aprueba. */
export function SelfReviewPanel() {
  const { list, approve } = useSelfReviews();
  const { isAdmin } = usePerms();
  if (!list.length) return null;
  return (
    <div className="mb-4 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-[13px] text-[#78350f]">
      <div className="font-semibold mb-2">
        ⏳ {list.length} operación{list.length === 1 ? '' : 'es'} por aprobar
        <span className="font-normal"> · alguien del equipo registró algo sobre sí mismo</span>
      </div>
      <div className="space-y-1">
        {list.map((r) => (
          <div key={r.key} className="flex flex-wrap items-center gap-2">
            <span className="flex-1 min-w-[220px]">
              <b>{r.byName}</b> {KIND_LABEL[r.kind]} · {r.detail}
              <span className="text-[11px] text-[#92400e]"> · {new Date(r.at).toLocaleString('es-VE')}</span>
            </span>
            {isAdmin && (
              <button type="button" className="rounded-md border border-[#e6e6e9] bg-[#fff] px-2 py-1 text-[12px] text-[#111] hover:bg-[#f4f4f5]" onClick={() => approve(r.key)}>
                ✓ Aprobar
              </button>
            )}
          </div>
        ))}
      </div>
      {!isAdmin && <div className="mt-2 text-[11px] text-[#92400e]">Sólo un administrador puede aprobarlas.</div>}
    </div>
  );
}
