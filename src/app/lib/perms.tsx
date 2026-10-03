// Roles y permisos por módulo del panel admin (igual que la matriz de Bendito).
// La base de datos aplica las mismas reglas con public.can(módulo); aquí sólo
// se decide qué se muestra.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { useApp } from '../context';

export const ROLES = ['admin', 'manager', 'production', 'sales', 'support'] as const;
export type StaffRole = (typeof ROLES)[number];
export const ROLE_LABEL: Record<string, string> = {
  admin: '👑 Admin',
  manager: '📋 Gerente',
  production: '🏭 Producción',
  sales: '💼 Ventas',
  employee: '💼 Ventas',
  support: '🎧 Soporte',
  customer: 'Cliente',
};
export const STAFF_ROLES = ['admin', 'manager', 'production', 'sales', 'support', 'employee'];
export const isStaffRole = (r?: string | null) => !!r && STAFF_ROLES.includes(r);

export const MODULES = [
  'Dashboard', 'Pedidos', 'Inventario', 'Clientes', 'Ventas', 'Confirmación de pagos', 'Gastos', 'Finanzas',
  'Ganancias y costos', 'Cambio de divisas', 'Personal', 'Proveedores', 'Usuarios y permisos', 'Registro de actividad', 'Configuración',
] as const;
export type Module = (typeof MODULES)[number];
// Siempre sólo del admin (nadie puede encerrarse fuera ni ver el historial).
export const LOCKED: Module[] = ['Usuarios y permisos', 'Registro de actividad', 'Configuración'];

export type Matrix = Record<string, number[]>;
export const DEFAULT_MATRIX: Matrix = {
  Dashboard: [1, 1, 1, 1, 1],
  Pedidos: [1, 1, 1, 1, 1],
  Inventario: [1, 1, 1, 0, 0],
  Clientes: [1, 1, 0, 1, 1],
  Ventas: [1, 1, 0, 1, 0],
  'Confirmación de pagos': [1, 1, 0, 1, 0],
  Gastos: [1, 1, 0, 0, 0],
  Finanzas: [1, 1, 0, 0, 0],
  'Ganancias y costos': [1, 1, 0, 0, 0],
  'Cambio de divisas': [1, 1, 0, 0, 0],
  Personal: [1, 1, 0, 0, 0],
  Proveedores: [1, 1, 0, 0, 0],
  'Usuarios y permisos': [1, 0, 0, 0, 0],
  'Registro de actividad': [1, 0, 0, 0, 0],
  Configuración: [1, 0, 0, 0, 0],
};

export function sanitize(raw: Matrix | null | undefined): Matrix {
  const out: Matrix = {};
  for (const m of MODULES) {
    const row = Array.isArray(raw?.[m]) ? raw![m] : DEFAULT_MATRIX[m];
    out[m] = ROLES.map((_, i) => (row[i] ? 1 : 0));
    out[m][0] = 1;
    if (LOCKED.includes(m)) out[m] = [1, 0, 0, 0, 0];
  }
  return out;
}

const roleIndex = (r?: string | null) =>
  r === 'admin' ? 0 : r === 'manager' ? 1 : r === 'production' ? 2 : r === 'sales' || r === 'employee' ? 3 : r === 'support' ? 4 : -1;

// Ruta del panel → módulo.
export const ROUTE_MODULE: Record<string, Module> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/orders': 'Pedidos',
  '/admin/inventory': 'Inventario',
  '/admin/customers': 'Clientes',
  '/admin/sales': 'Ventas',
  '/admin/payconf': 'Confirmación de pagos',
  '/admin/expenses': 'Gastos',
  '/admin/accounts': 'Finanzas',
  '/admin/finance': 'Cambio de divisas',
  '/admin/staff': 'Personal',
  '/admin/suppliers': 'Proveedores',
  '/admin/users': 'Usuarios y permisos',
  '/admin/audit': 'Registro de actividad',
  '/admin/locations': 'Configuración',
  '/admin/social': 'Configuración',
  '/admin/payment-info': 'Configuración',
  '/admin/settings': 'Configuración',
};
export const moduleOfPath = (path: string) => Object.entries(ROUTE_MODULE).find(([p]) => path.startsWith(p))?.[1];

interface PermsCtx {
  role: string | null;
  isAdmin: boolean;
  isManager: boolean; // admin o gerente: anular, fechas pasadas, descuentos, tasas, créditos
  matrix: Matrix;
  ready: boolean;
  can: (m: Module) => boolean;
  firstAllowedPath: () => string;
  reload: () => Promise<void>;
}

const Ctx = createContext<PermsCtx | null>(null);

export function PermsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useApp();
  const role = currentUser?.role ?? null;
  const [matrix, setMatrix] = useState<Matrix>(sanitize(DEFAULT_MATRIX));
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    if (!isStaffRole(role)) { setReady(true); return; }
    const { data } = await supabase.from('admin_settings').select('value').eq('key', 'permissions').maybeSingle();
    setMatrix(sanitize((data?.value as Matrix) ?? DEFAULT_MATRIX));
    setReady(true);
  }, [role]);
  useEffect(() => { reload(); }, [reload]);

  const value = useMemo<PermsCtx>(() => {
    const idx = roleIndex(role);
    const can = (m: Module) => idx === 0 || (idx > 0 && !!matrix[m]?.[idx]);
    return {
      role,
      isAdmin: role === 'admin',
      isManager: role === 'admin' || role === 'manager',
      matrix,
      ready,
      can,
      firstAllowedPath: () => Object.entries(ROUTE_MODULE).find(([, m]) => can(m))?.[0] ?? '/admin/login',
      reload,
    };
  }, [role, matrix, ready, reload]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePerms(): PermsCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePerms fuera de PermsProvider');
  return v;
}

export async function savePermissions(m: Matrix) {
  const { error } = await supabase.from('admin_settings').upsert({ key: 'permissions', value: sanitize(m), updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
