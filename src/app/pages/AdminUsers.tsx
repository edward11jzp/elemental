import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '../context';
import { supabase } from '../lib/supabase';
import { Btn, Card, Input, Label, Modal, Select, cx } from '../components/admin/ui';
import { LOCKED, MODULES, ROLES, ROLE_LABEL, isStaffRole, sanitize, savePermissions, usePerms, type Matrix } from '../lib/perms';
import type { User } from '../types';
import { useSedes } from '../lib/sedes';
import { supabase } from '../lib/supabase';

const GRADIENTS = ['from-[#a855f7] to-[#ef4444]', 'from-[#ef4444] to-[#22c55e]', 'from-[#06b6d4] to-[#3b82f6]', 'from-[#f59e0b] to-[#f97316]', 'from-[#22c55e] to-[#14b8a6]'];
const initials = (n: string) => n.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
const ROLE_HELP: Record<string, string> = {
  admin: 'Acceso total. Gestiona usuarios, permisos y ajustes.',
  manager: 'Gerente: anula ventas, aplica descuentos, ventas de días anteriores, tasas y créditos al personal.',
  production: 'Producción: pedidos e inventario.',
  sales: 'Ventas: punto de venta, clientes y pedidos. Sólo ve el día de hoy y ayer.',
  support: 'Soporte: pedidos y clientes.',
};

export default function AdminUsers() {
  const { users, currentUser, refreshUsers } = useApp();
  const { matrix, reload } = usePerms();
  const staff = users.filter((u) => isStaffRole(u.role));
  const [edit, setEdit] = useState<User | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [m, setM] = useState<Matrix>(matrix);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setM(matrix); setDirty(false); }, [matrix]);
  useEffect(() => { refreshUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (mod: string, i: number) => {
    setM((x) => ({ ...x, [mod]: x[mod].map((v, j) => (j === i ? (v ? 0 : 1) : v)) }));
    setDirty(true);
  };
  const saveMatrix = async () => {
    try {
      await savePermissions(sanitize(m));
      await reload();
      toast.success('Permisos actualizados');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="px-4 lg:px-6 py-5 max-w-[1600px]">
      <div className="grid xl:grid-cols-[380px_1fr] gap-4 items-start">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-semibold">Usuarios</h3>
            <div className="flex gap-2">
              <Btn variant="ghost" className="!py-1.5 !text-[12px]" onClick={() => setPwOpen(true)}>🔑 Mi contraseña</Btn>
              <Btn className="!py-1.5 !text-[12px]" onClick={() => setInviteOpen(true)}>+ Invitar</Btn>
            </div>
          </div>
          <div className="space-y-1">
            {staff.map((u, i) => (
              <button key={u.id} type="button" onClick={() => setEdit(u)} className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left hover:bg-[#f4f4f5]">
                <div className={cx('h-9 w-9 shrink-0 rounded-full bg-gradient-to-br flex items-center justify-center text-[12px] font-bold [color:#fff]', GRADIENTS[i % GRADIENTS.length])}>{initials(u.name || u.email)}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{u.name}{u.id === currentUser?.id ? ' (tú)' : ''}</div>
                  <div className="truncate text-[11px] text-[#6b7280]">{u.email}</div>
                </div>
                <span className="rounded-md border border-[#e6e6e9] bg-[#f4f4f5] px-2 py-0.5 text-[11px] whitespace-nowrap">{ROLE_LABEL[u.role] ?? u.role}</span>
                <span className="h-2 w-2 rounded-full" style={{ background: u.active ? '#22c55e' : '#a1a1aa' }} title={u.active ? 'Activo' : 'Inactivo'} />
              </button>
            ))}
            {!staff.length && <p className="text-center text-[13px] text-[#9ca3af] py-6">No hay usuarios registrados.</p>}
          </div>
          <div className="mt-4 space-y-1.5 border-t border-[#f0f0f2] pt-3">
            {ROLES.map((r) => <p key={r} className="text-[11px] text-[#6b7280]"><b className="text-[#111]">{ROLE_LABEL[r]}</b> · {ROLE_HELP[r]}</p>)}
          </div>
        </Card>

        <Card className="p-4 overflow-x-auto">
          <h3 className="text-[15px] font-semibold mb-3">Matriz de permisos</h3>
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[1.6fr_repeat(5,1fr)] gap-2 pb-2 border-b border-[#ececef] text-[11px] font-semibold text-[#71717a] uppercase tracking-wider">
              <div>Módulo</div>
              {['Admin', 'Gerente', 'Prod.', 'Ventas', 'Soporte'].map((h) => <div key={h} className="text-center">{h}</div>)}
            </div>
            {MODULES.map((mod) => (
              <div key={mod} className="grid grid-cols-[1.6fr_repeat(5,1fr)] gap-2 items-center py-2 border-b border-[#f6f6f7] text-[13px]">
                <div className="font-medium">{mod}{LOCKED.includes(mod) && <span className="ml-1 text-[10px] text-[#a1a1aa]">🔒</span>}</div>
                {(m[mod] ?? [1, 0, 0, 0, 0]).map((v, i) => {
                  const fixed = i === 0 || LOCKED.includes(mod);
                  return (
                    <div key={i} className="flex justify-center">
                      <button
                        type="button"
                        disabled={fixed}
                        onClick={() => toggle(mod, i)}
                        className={cx('relative h-5 w-9 rounded-full transition-colors', v ? 'bg-[#16a34a]' : 'bg-[#d4d4d8]', fixed && 'opacity-50 cursor-not-allowed')}
                        aria-label={`${mod} · ${ROLES[i]}`}
                      >
                        <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-[#fff] shadow transition-all', v ? 'left-[18px]' : 'left-0.5')} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Btn disabled={!dirty} onClick={saveMatrix}>Guardar permisos</Btn>
            <span className="text-[12px] text-[#6b7280]">El administrador siempre conserva acceso total. «Ganancias y costos» decide quién ve costos, ganancia y márgenes.</span>
          </div>
        </Card>
      </div>

      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
      {edit && <EditUserModal user={edit} self={edit.id === currentUser?.id} onClose={() => setEdit(null)} />}
      {pwOpen && <PasswordModal onClose={() => setPwOpen(false)} />}
    </div>
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const { createStaffUser } = useApp();
  const [f, setF] = useState({ name: '', email: '', password: '', phone: '', role: 'sales' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.name.trim() || !f.email.trim()) return toast.error('Nombre y email son obligatorios');
    if (f.password.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres');
    setBusy(true);
    try {
      await createStaffUser(f.email.trim(), f.password, f.name.trim(), f.role, f.phone || undefined);
      toast.success('✅ Usuario creado: ' + f.email);
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo crear');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="Invitar usuario">
      <div className="space-y-3">
        <div><Label>Nombre</Label><Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div><Label>Teléfono</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><Label>Contraseña inicial</Label><Input type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="mín. 6 caracteres" /></div>
          <div>
            <Label>Rol</Label>
            <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </Select>
          </div>
        </div>
        <p className="text-[11px] text-[#6b7280]">Comparte el correo y la contraseña inicial con la persona; podrá cambiarla desde «🔑 Mi contraseña».</p>
        <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn disabled={busy} onClick={save}>{busy ? 'Creando…' : 'Crear usuario'}</Btn></div>
      </div>
    </Modal>
  );
}

function EditUserModal({ user, self, onClose }: { user: User; self: boolean; onClose: () => void }) {
  const { updateUser, deleteUser } = useApp();
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role === 'employee' ? 'sales' : user.role);
  const [active, setActive] = useState(user.active);
  const { sedes } = useSedes();
  const [loc, setLoc] = useState<string>('');
  const [enviando, setEnviando] = useState(false);

  // Restablecer la contraseña de otra persona: se le manda el correo de Supabase.
  const enviarCorreo = async () => {
    if (!user.email) return toast.error('Ese usuario no tiene correo');
    setEnviando(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin + '/admin/login',
      });
      if (error) throw new Error(error.message);
      toast.success('Correo enviado a ' + user.email);
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo enviar');
    } finally {
      setEnviando(false);
    }
  };
  // La sede vive en el perfil; sus ventas y movimientos se registran ahí.
  useEffect(() => {
    supabase.from('profiles').select('location_id').eq('id', user.id).maybeSingle()
      .then(({ data }) => setLoc((data as any)?.location_id ?? ''));
  }, [user.id]);
  const save = async () => {
    if (!name.trim()) return toast.error('El nombre es obligatorio');
    try {
      await updateUser(user.id, { name: name.trim(), role: role as User['role'], ...(active !== user.active ? { active } : {}) });
      const { error } = await supabase.from('profiles').update({ location_id: loc || null }).eq('id', user.id);
      if (error) throw new Error(error.message);
      toast.success('Usuario actualizado ✓');
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo actualizar');
    }
  };
  const del = async () => {
    if (!confirm(`¿Eliminar a "${user.name}"? No podrá acceder al panel.`)) return;
    try { await deleteUser(user.id); toast.success('Usuario eliminado'); onClose(); } catch (e: any) { toast.error(e?.message ?? 'No se pudo eliminar'); }
  };
  return (
    <Modal open onClose={onClose} title="Editar usuario">
      <div className="space-y-3">
        <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Email</Label><Input value={user.email} disabled /></div>
        <div>
          <Label>Rol</Label>
          <Select value={role} onChange={(e) => setRole(e.target.value as User['role'])} disabled={self}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </Select>
        </div>
        <div className="rounded-lg border border-[#ececef] p-3">
          <div className="text-[13px] font-medium mb-1">Contraseña</div>
          <p className="text-[11px] text-[#6b7280] mb-2">
            Se le envía un correo para que la cambie. Nadie, ni tú, puede ver la contraseña de otra persona.
          </p>
          <Btn variant="ghost" disabled={enviando} onClick={enviarCorreo}>
            {enviando ? 'Enviando…' : '✉️ Enviar correo para cambiar la contraseña'}
          </Btn>
        </div>

        {sedes.length > 0 && (
          <div>
            <Label>Sede</Label>
            <Select value={loc} onChange={(e) => setLoc(e.target.value)}>
              <option value="">— Sin sede —</option>
              {sedes.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.code}</option>)}
            </Select>
            <p className="text-[11px] text-[#6b7280] mt-1">Sus ventas y movimientos de inventario se registran en esta sede.</p>
          </div>
        )}
        {!self && (
          <label className="flex items-center gap-2 text-[13px] cursor-pointer">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Activo (puede entrar al panel)
          </label>
        )}
        <div className="flex items-center justify-between pt-1">
          {!self ? <Btn variant="danger" onClick={del}>Eliminar</Btn> : <span />}
          <div className="flex gap-2"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>Guardar</Btn></div>
        </div>
      </div>
    </Modal>
  );
}

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (a.length < 6) return toast.error('La nueva debe tener al menos 6 caracteres');
    if (a !== b) return toast.error('Las dos contraseñas no coinciden');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: a });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Tu contraseña fue cambiada');
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Cambiar mi contraseña">
      <div className="space-y-3">
        <div><Label>Nueva contraseña</Label><Input type="password" value={a} onChange={(e) => setA(e.target.value)} autoFocus /></div>
        <div><Label>Repite la nueva contraseña</Label><Input type="password" value={b} onChange={(e) => setB(e.target.value)} /></div>
        <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn disabled={busy} onClick={save}>{busy ? 'Cambiando…' : 'Cambiar contraseña'}</Btn></div>
      </div>
    </Modal>
  );
}
