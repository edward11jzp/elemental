import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { Btn, Card, Input, Modal, Select, Table } from '../components/admin/ui';
import { ROLE_LABEL } from '../lib/perms';
import { todayVe } from '../lib/sales';

interface Entry { id: number; at: string; user_name: string; role: string; action: string; ip: string | null }

const when = (iso: string) => new Date(iso).toLocaleString('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Se conserva siempre el mes anterior completo: se puede borrar lo anterior a su día 1.
function purgeCutoff() {
  const t = todayVe();
  const y = +t.slice(0, 4), m = +t.slice(5, 7) - 1;
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toISOString().slice(0, 10);
}

export default function AdminAudit() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [q, setQ] = useState('');
  const [user, setUser] = useState('');
  const [old, setOld] = useState<{ count: number; sample: Entry[] } | null>(null);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cutoff = purgeCutoff();

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from('audit_log').select('*').order('at', { ascending: false }).limit(2000);
    if (error) return setError(error.message);
    setRows(data as Entry[]);
    const cutTs = new Date(cutoff + 'T04:00:00Z').toISOString(); // medianoche en Venezuela
    const { data: o, count } = await supabase.from('audit_log').select('*', { count: 'exact' }).lt('at', cutTs).order('at').limit(50);
    setOld(count ? { count, sample: o as Entry[] } : null);
  }, [cutoff]);
  useEffect(() => { reload(); }, [reload]);

  const users = useMemo(() => [...new Set(rows.map((r) => r.user_name))], [rows]);
  const s = q.trim().toLowerCase();
  const shown = rows.filter((r) => (!user || r.user_name === user) && (!s || r.action.toLowerCase().includes(s) || r.user_name.toLowerCase().includes(s) || when(r.at).includes(s)));
  const showBanner = !!old && +todayVe().slice(8, 10) >= 15;
  const prevLabel = (() => { const d = new Date(cutoff + 'T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() - 1); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} y antes`; })();

  const purge = async () => {
    const { data, error } = await supabase.rpc('audit_purge', { p_cutoff: cutoff });
    if (error) return toast.error(error.message);
    toast.success(`${data} entradas borradas del registro`);
    setPurgeOpen(false);
    reload();
  };

  return (
    <div className="px-4 lg:px-6 py-5 max-w-[1600px] space-y-4">
      {error && <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#b91c1c]">{error.includes('audit_log') ? 'Falta ejecutar la migración de la fase 4 en Supabase.' : error}</div>}
      {showBanner && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-[13px] text-[#1e3a8a]">
          <span>🗂️ El registro de <b>{prevLabel}</b> está listo para borrar: {old!.count} entradas.</span>
          <Btn className="ml-auto !py-1.5 !text-[12px]" onClick={() => setPurgeOpen(true)}>Revisar y borrar</Btn>
        </div>
      )}
      <p className="text-[12px] text-[#6b7280]">
        Cada acción importante queda registrada automáticamente. El registro no se borra solo: cada día 15 aparece un aviso para borrar lo anterior al mes pasado (siempre se conserva el mes anterior completo), y tú confirmas.
      </p>
      <Card className="p-3 flex flex-wrap gap-2">
        <Input placeholder="Buscar en el registro…" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 min-w-[200px]" />
        <Select value={user} onChange={(e) => setUser(e.target.value)} className="!w-auto">
          <option value="">Todos los usuarios</option>
          {users.map((u) => <option key={u}>{u}</option>)}
        </Select>
      </Card>
      <Card>
        <Table head={['Fecha y hora', 'Usuario', 'Rol', 'Acción', 'IP']} empty={shown.length ? false : 'Sin actividad registrada.'}>
          {shown.map((r) => (
            <tr key={r.id}>
              <td className="text-[12px] text-[#6b7280] whitespace-nowrap">{when(r.at)}</td>
              <td className="font-medium whitespace-nowrap">{r.user_name}</td>
              <td><span className="rounded-md border border-[#e6e6e9] bg-[#f4f4f5] px-2 py-0.5 text-[11px] whitespace-nowrap">{ROLE_LABEL[r.role] ?? r.role}</span></td>
              <td>{r.action}</td>
              <td className="text-[12px] text-[#6b7280] whitespace-nowrap">{r.ip ?? '—'}</td>
            </tr>
          ))}
        </Table>
      </Card>
      {purgeOpen && old && (
        <Modal open onClose={() => setPurgeOpen(false)} title="Borrar registro viejo">
          <p className="text-[13px] mb-1">Se borrará el registro de <b>{prevLabel}</b>: <b>{old.count}</b> entradas anteriores al <b>{cutoff}</b>.</p>
          <p className="text-[12px] text-[#6b7280] mb-3">Es permanente. Todo lo desde el {cutoff} en adelante no se toca.</p>
          <div className="max-h-72 overflow-y-auto rounded-lg bg-[#fafafa] p-2 text-[12px] mb-3">
            {old.sample.map((a) => <div key={a.id} className="py-1 border-b border-[#f0f0f2]"><span className="text-[#6b7280]">{when(a.at)}</span> · {a.user_name} · {a.action}</div>)}
          </div>
          <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setPurgeOpen(false)}>Ahora no</Btn><Btn variant="danger" onClick={purge}>Borrar {old.count} entradas</Btn></div>
        </Modal>
      )}
    </div>
  );
}
