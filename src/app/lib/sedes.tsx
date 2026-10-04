// Sedes: las ubicaciones de Elemental, usadas para separar inventario y ventas.
// El selector de la barra superior guarda cuál se está mirando ('' = todas).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { usePerms } from './perms';

export interface Sede {
  id: string;
  name: string;
  code: string;
  kind: 'tienda' | 'taller' | 'deposito' | 'envios';
  active: boolean;
}

const KEY = 'elemental_admin_sede';

export async function listSedes(): Promise<Sede[]> {
  const { data, error } = await supabase.from('locations').select('id,name,code,kind,active').order('name');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    // Hasta que se le ponga nombre corto, se usa el largo sin el «ELEMENTAL - ».
    code: (r.code || '').trim() || String(r.name || '').replace(/^\s*ELEMENTAL\s*-\s*/i, ''),
    kind: r.kind ?? 'tienda',
    active: r.active !== false,
  }));
}

interface SedesCtx {
  sedes: Sede[];
  ready: boolean;
  /** Sede que se está mirando. '' = todas juntas. */
  sede: string;
  setSede: (id: string) => void;
  /** Sede del usuario, la que usan sus ventas. */
  mySede: string;
  nameOf: (id?: string | null) => string;
  reload: () => void;
}
const Ctx = createContext<SedesCtx>({ sedes: [], ready: false, sede: '', setSede: () => {}, mySede: '', nameOf: () => '', reload: () => {} });

export function SedesProvider({ children }: { children: ReactNode }) {
  // Sólo un administrador o gerente cambia de sede; el resto ve la suya.
  const { isManager } = usePerms();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [ready, setReady] = useState(false);
  const [mySede, setMySede] = useState('');
  const [sede, setSedeState] = useState(() => {
    try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; }
  });

  const reload = useCallback(() => {
    listSedes()
      .then(setSedes)
      .catch(() => setSedes([]))
      .finally(() => setReady(true));
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      supabase.from('profiles').select('location_id').eq('id', uid).maybeSingle()
        .then(({ data: p }) => setMySede((p as any)?.location_id ?? ''));
    });
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const setSede = useCallback((id: string) => {
    setSedeState(id);
    try { localStorage.setItem(KEY, id); } catch { /* ventana privada */ }
  }, []);

  const value = useMemo<SedesCtx>(() => ({
    sedes, ready, mySede, reload,
    sede: isManager ? sede : mySede,
    setSede: isManager ? setSede : () => {},
    nameOf: (id) => (id ? sedes.find((s) => s.id === id)?.code ?? '—' : '—'),
  }), [sedes, ready, sede, setSede, mySede, reload, isManager]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSedes = () => useContext(Ctx);

/** Filtra por la sede que se está mirando. Sin sede elegida, pasa todo. */
export function bySede<T extends { locationId?: string | null }>(rows: T[], sede: string) {
  return sede ? rows.filter((r) => r.locationId === sede) : rows;
}
