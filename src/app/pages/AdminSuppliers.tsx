import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Btn, Card, Chip, Input, Label, Modal, Select, Table, Textarea } from '../components/admin/ui';
import { deleteSupplier, listSuppliers, saveSupplier, type Supplier, type SupplierInput } from '../lib/suppliers';

const STATUS_COLOR: Record<string, string> = { Activo: '#22c55e', Pendiente: '#f59e0b', Inactivo: '#8b8b92' };
const EMPTY: SupplierInput = { name: '', category: '', contact: '', phone: '', email: '', notes: '', status: 'Activo' };

export default function AdminSuppliers() {
  const [list, setList] = useState<Supplier[]>([]);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Supplier | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => listSuppliers().then(setList).catch((e) => setError(e.message)), []);
  useEffect(() => { reload(); }, [reload]);

  const s = q.trim().toLowerCase();
  const shown = list.filter((x) => !s || x.name.toLowerCase().includes(s) || x.category.toLowerCase().includes(s));

  const remove = async (x: Supplier) => {
    if (!confirm(`¿Eliminar proveedor "${x.name}"?`)) return;
    try { await deleteSupplier(x.id); toast.success('Proveedor eliminado'); reload(); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="px-4 lg:px-6 py-5 max-w-[1600px] space-y-4">
      {error && <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#b91c1c]">{error.includes('suppliers') ? 'Falta ejecutar la migración de la fase 4 en Supabase.' : error}</div>}
      <Card className="p-3 flex flex-wrap gap-2">
        <Input placeholder="Buscar proveedor…" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 min-w-[200px]" />
        <Btn onClick={() => setEdit(null)}>+ Nuevo proveedor</Btn>
      </Card>
      <Card>
        <Table head={['Proveedor', 'Categoría', 'Contacto', 'Teléfono', 'Estado', '']} empty={shown.length ? false : 'Sin proveedores. Agrega uno con el botón "+".'}>
          {shown.map((x) => (
            <tr key={x.id} className="cursor-pointer hover:bg-[#fafafa]" onClick={() => setEdit(x)}>
              <td className="font-medium">{x.name}</td>
              <td className="text-[#6b7280]">{x.category || '—'}</td>
              <td>{x.contact || '—'}{x.email && <span className="text-[#6b7280]"> · {x.email}</span>}</td>
              <td className="text-[#6b7280]">{x.phone || '—'}</td>
              <td><Chip color={STATUS_COLOR[x.status] ?? '#888'}>{x.status}</Chip></td>
              <td onClick={(e) => e.stopPropagation()}><button type="button" className="text-[#9ca3af] hover:text-[#dc2626]" onClick={() => remove(x)} title="Eliminar">🗑️</button></td>
            </tr>
          ))}
        </Table>
      </Card>
      {edit !== undefined && <SupplierModal supplier={edit} onClose={() => setEdit(undefined)} onSaved={() => { setEdit(undefined); reload(); }} />}
    </div>
  );
}

function SupplierModal({ supplier, onClose, onSaved }: { supplier: Supplier | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<SupplierInput>(supplier ? { ...supplier } : EMPTY);
  const set = (p: Partial<SupplierInput>) => setF((x) => ({ ...x, ...p }));
  const save = async () => {
    if (!f.name.trim()) return toast.error('El nombre es obligatorio');
    const { ...data } = f as any;
    delete data.id; delete data.created_at;
    try { await saveSupplier({ ...data, name: f.name.trim() }, supplier?.id); toast.success(supplier ? 'Proveedor actualizado ✓' : 'Proveedor creado ✓'); onSaved(); } catch (e: any) { toast.error(e.message); }
  };
  const del = async () => {
    if (!supplier || !confirm(`¿Eliminar proveedor "${supplier.name}"?`)) return;
    try { await deleteSupplier(supplier.id); toast.success('Proveedor eliminado'); onSaved(); } catch (e: any) { toast.error(e.message); }
  };
  return (
    <Modal open onClose={onClose} title={supplier ? 'Editar proveedor' : 'Nuevo proveedor'}>
      <div className="space-y-3">
        <div><Label>Nombre</Label><Input autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Categoría</Label><Input value={f.category} onChange={(e) => set({ category: e.target.value })} placeholder="Ej: Telas, Hilos, Etiquetas" /></div>
          <div>
            <Label>Estado</Label>
            <Select value={f.status} onChange={(e) => set({ status: e.target.value as SupplierInput['status'] })}>
              <option>Activo</option><option>Pendiente</option><option>Inactivo</option>
            </Select>
          </div>
          <div><Label>Contacto</Label><Input value={f.contact} onChange={(e) => set({ contact: e.target.value })} /></div>
          <div><Label>Teléfono</Label><Input value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
        </div>
        <div><Label>Correo</Label><Input type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} /></div>
        <div><Label>Notas</Label><Textarea rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} /></div>
        <div className="flex items-center justify-between pt-1">
          {supplier ? <Btn variant="danger" onClick={del}>Eliminar</Btn> : <span />}
          <div className="flex gap-2"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>Guardar</Btn></div>
        </div>
      </div>
    </Modal>
  );
}
