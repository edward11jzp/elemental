// Piezas de interfaz del panel admin (estilo claro tipo Bendito).
// Colores literales: el tema admin remapea white/black de Tailwind.
import { useEffect, type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type ButtonHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { X } from 'lucide-react';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cx('rounded-xl border border-[#ececef] bg-[#fff] shadow-[0_1px_2px_rgba(0,0,0,0.03)]', className)}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <h3 className="text-[14px] font-semibold text-[#111]">{children}</h3>
      {right}
    </div>
  );
}

export function Stat({ label, value, sub, color, className }: { label: string; value: ReactNode; sub?: ReactNode; color?: string; className?: string }) {
  return (
    <Card className={cx('p-4', className)}>
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#52525b]">{label}</p>
      <p className="mt-1.5 text-[20px] font-extrabold tracking-tight" style={{ color: color ?? '#111' }}>
        {value}
      </p>
      {sub != null && <p className="mt-0.5 text-[11px] text-[#6b7280]">{sub}</p>}
    </Card>
  );
}

/** Pestañas subrayadas (como Ventas / Gastos en Bendito). */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: ReactNode; hidden?: boolean }[]; value: T; onChange: (k: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[#ececef] mb-5 -mx-1 px-1">
      {tabs.filter((t) => !t.hidden).map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cx(
            'whitespace-nowrap px-3 py-2.5 text-[13px] border-b-2 -mb-px transition-colors',
            value === t.key ? 'border-[#111] text-[#111] font-semibold' : 'border-transparent text-[#6b7280] hover:text-[#111]',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Grupo de botones tipo píldora (Hoy / Semana / Mes…). */
export function Pills<T extends string>({ options, value, onChange, size = 'md' }: { options: { key: T; label: ReactNode }[]; value: T | null; onChange: (k: T) => void; size?: 'sm' | 'md' }) {
  return (
    <div className="inline-flex flex-wrap rounded-lg border border-[#e6e6e9] bg-[#f1f1f3] p-1 gap-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cx(
            'rounded-md transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1 text-[12px]',
            value === o.key ? 'bg-[#111] font-semibold [color:#fff]' : 'text-[#52525b] hover:text-[#111]',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Btn({ variant = 'primary', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'success' }) {
  const styles = {
    primary: 'bg-[#111] [color:#fff] hover:bg-[#27272a]',
    ghost: 'bg-[#fff] text-[#111] border border-[#e6e6e9] hover:bg-[#f4f4f5]',
    danger: 'bg-[#fff] text-[#dc2626] border border-[#fecaca] hover:bg-[#fef2f2]',
    success: 'bg-[#16a34a] [color:#fff] hover:bg-[#15803d]',
  }[variant];
  return (
    <button
      type="button"
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        styles,
        className,
      )}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="block text-[11px] font-medium text-[#52525b] mb-1">{children}</label>;
}

const fieldCls =
  'w-full rounded-lg border border-[#e6e6e9] bg-[#fff] px-3 py-2 text-[13px] text-[#111] placeholder:text-[#a1a1aa] outline-none focus:border-[#a1a1aa] disabled:bg-[#f4f4f5] disabled:text-[#71717a]';

export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(fieldCls, className)} />;
}
export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...p} className={cx(fieldCls, 'pr-8', className)}>
      {children}
    </select>
  );
}
export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cx(fieldCls, className)} />;
}

export function Chip({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap" style={{ background: color + '22', color }}>
      {children}
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide, actions }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean; actions?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-[#000]/40" onClick={onClose} />
      <div
        className={cx(
          'relative w-full max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[#fff] text-[#111] shadow-2xl p-5',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-[16px] font-bold">{title}</h3>
          <div className="flex items-center gap-2">
            {actions}
            <button type="button" onClick={onClose} className="p-1.5 rounded-md text-[#6b7280] hover:bg-[#f4f4f5]" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Tabla con estilo admin. En el teléfono se desplaza horizontalmente. */
export function Table({ head, children, foot, empty, colSpan }: { head: ReactNode[]; children: ReactNode; foot?: ReactNode; empty?: string | false; colSpan?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-[0.08em] text-[#71717a]">
            {head.map((h, i) => (
              <th key={i} className="px-3 py-2.5 font-medium whitespace-nowrap border-b border-[#ececef]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-[#f0f0f2] [&>tr>td]:px-3 [&>tr>td]:py-2.5">
          {children}
          {empty && (
            <tr>
              <td colSpan={colSpan ?? head.length} className="text-center text-[#9ca3af] !py-10">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
        {foot && <tfoot className="[&>tr>td]:px-3 [&>tr>td]:py-2.5 font-bold border-t-2 border-[#e6e6e9]">{foot}</tfoot>}
      </table>
    </div>
  );
}

/** Barra horizontal con etiqueta (top productos, categorías…). */
export function BarRow({ label, value, max, right, color }: { label: ReactNode; value: number; max: number; right: ReactNode; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[13px] mb-1">
        <span className="truncate pr-2">{label}</span>
        <span className="text-[#6b7280] whitespace-nowrap">{right}</span>
      </div>
      <div className="h-2 rounded-full bg-[#f1f1f3]">
        <div className="h-full rounded-full" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, background: color }} />
      </div>
    </div>
  );
}

export const PALETTE = ['#3b82f6', '#ef4444', '#f59e0b', '#22c55e', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];
