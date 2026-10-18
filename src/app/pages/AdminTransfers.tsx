// Traslados entre tiendas.
//   Pedido: una tienda pide       -> gerente aprueba -> la otra envía -> la primera confirma -> gerente cierra.
//   Envío:  una tienda lo prepara -> gerente aprueba -> la envía      -> la otra confirma    -> gerente cierra.
// Al confirmar se dice cuántas piezas llegaron; al cerrar, la gerente decide qué pasa con lo que falte.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '../context';
import { Btn, Card, Input, Label, Modal, Pills, Select, Textarea } from '../components/admin/ui';
import { useSedes } from '../lib/sedes';
import { usePerms } from '../lib/perms';
import { loadStock, stockIndex, type StockRow } from '../lib/stock';
import {
  aprobarTraslado, cerrarTraslado, enviarDirecto, enviarTraslado, listTraslados,
  recibirTraslado, revisarTraslado, type EstadoTraslado, type Traslado,
} from '../lib/transfers';

type Pestana = 'aprobar' | 'enviar' | 'camino' | 'cerrar' | 'historial';

const COLOR: Record<EstadoTraslado, string> = {
  pedido: '#ca8a04',
  aprobado: '#7c3aed',
  enviado: '#2563eb',
  recibido: '#16a34a',
  con_diferencia: '#dc2626',
  revisado: '#0891b2',
  rechazado: '#dc2626',
  cancelado: '#71717a',
};
const ETIQUETA: Record<EstadoTraslado, string> = {
  pedido: 'Esperando aprobación',
  aprobado: 'Aprobado · por enviar',
  enviado: 'En camino',
  recibido: 'Llegó completo · por cerrar',
  con_diferencia: 'Llegó incompleto · por cerrar',
  revisado: 'Cerrado',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function AdminTransfers() {
  const { sedes, mySede, nameOf } = useSedes();
  const { isManager } = usePerms();
  const [lista, setLista] = useState<Traslado[]>([]);
  const [tab, setTab] = useState<Pestana>('aprobar');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const recargar = useCallback(() => {
    listTraslados().then(setLista).catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    recargar();
    const t = setInterval(() => !document.hidden && recargar(), 30000);
    return () => clearInterval(t);
  }, [recargar]);

  const por = (st: EstadoTraslado[]) => lista.filter((t) => st.includes(t.status));
  const cuentas = {
    aprobar: por(['pedido']).length,
    enviar: por(['aprobado']).length,
    camino: por(['enviado']).length,
    cerrar: por(['recibido', 'con_diferencia']).length,
  };
  const mostrados = useMemo(() => {
    if (tab === 'aprobar') return por(['pedido']);
    if (tab === 'enviar') return por(['aprobado']);
    if (tab === 'camino') return por(['enviado']);
    if (tab === 'cerrar') return por(['recibido', 'con_diferencia']);
    return por(['revisado', 'rechazado', 'cancelado']);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista, tab]);

  const hacer = async (fn: () => Promise<void>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      recargar();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const confirmarLlegada = (t: Traslado) => {
    const resp = prompt(`¿Cuántas piezas llegaron de ${t.productName}? (se enviaron ${t.qty})`, String(t.qty));
    if (resp === null) return;
    const n = Math.floor(Number(resp));
    if (!(n >= 0)) return toast.error('Escribe un número');
    hacer(() => recibirTraslado(t.id, n), n < t.qty ? `Faltan ${t.qty - n}: queda para que la gerente lo revise` : 'Recibido completo');
  };

  const revisar = (t: Traslado, devolver: boolean) => {
    const falta = t.qty - (t.qtyReceived ?? 0);
    const nota = prompt(
      devolver
        ? `Se devolverán ${falta} piezas a ${nameOf(t.from)}. ¿Alguna nota?`
        : `Se darán por perdidas ${falta} piezas. ¿Qué pasó?`,
    );
    if (nota === null) return;
    hacer(() => revisarTraslado(t.id, devolver, nota), devolver ? 'Faltante devuelto al origen' : 'Faltante dado por perdido');
  };

  const opciones = [
    { key: 'aprobar' as const, label: `Por aprobar${cuentas.aprobar ? ` (${cuentas.aprobar})` : ''}` },
    { key: 'enviar' as const, label: `Por enviar${cuentas.enviar ? ` (${cuentas.enviar})` : ''}` },
    { key: 'camino' as const, label: `En camino${cuentas.camino ? ` (${cuentas.camino})` : ''}` },
    ...(isManager ? [{ key: 'cerrar' as const, label: `Por cerrar${cuentas.cerrar ? ` (${cuentas.cerrar})` : ''}` }] : []),
    { key: 'historial' as const, label: 'Historial' },
  ];

  return (
    <div className="px-4 lg:px-6 py-5 max-w-[1100px] space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold">Traslados entre tiendas</h2>
          <p className="text-[12px] text-[#6b7280] max-w-[640px]">
            Pide lo que no tienes o envía lo que te sobra. La gerente aprueba antes de que salga y
            cierra cuando llega. La mercancía sale al enviarse y entra al confirmar la llegada;
            mientras viaja no cuenta en ninguna tienda.
          </p>
        </div>
        {sedes.length > 1 && <Btn onClick={() => setEnviando(true)}>📦 Enviar a otra tienda</Btn>}
      </div>

      {error && (
        <Card className="p-4 text-[13px] text-[#b91c1c]">
          {/does not exist|relation|column/i.test(error) ? 'Falta ejecutar la migración de traslados en Supabase.' : error}
        </Card>
      )}


      <div className="overflow-x-auto">
        <Pills<Pestana> value={tab} onChange={setTab} options={opciones} />
      </div>

      <div className="space-y-2">
        {mostrados.map((t) => {
          const soyOrigen = t.from === mySede;
          const soyDestino = t.to === mySede;
          const falta = t.qty - (t.qtyReceived ?? 0);
          return (
            <Card key={t.id} className="p-4">
              <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                <div className="min-w-[200px] flex-1">
                  <div className="font-semibold">
                    {t.qty} × {t.productName}
                    {(t.size || t.color) && (
                      <span className="ml-1 text-[12px] font-normal text-[#6b7280]">{[t.size, t.color].filter(Boolean).join(' · ')}</span>
                    )}
                  </div>
                  <div className="text-[12px] text-[#6b7280] mt-0.5">
                    {nameOf(t.from)} → {nameOf(t.to)} · {t.kind === 'envio' ? `envío de ${t.sentBy}` : `pedido por ${t.askedBy}`}
                    {t.approvedBy && t.kind === 'pedido' ? ` · aprobó ${t.approvedBy}` : ''}
                    {t.sentBy && t.kind === 'pedido' ? ` · envió ${t.sentBy}` : ''}
                    {t.gotBy ? ` · recibió ${t.gotBy}` : ''}
                  </div>
                  {t.qtyReceived != null && t.qtyReceived < t.qty && (
                    <div className="text-[12px] text-[#dc2626] mt-1">
                      Llegaron {t.qtyReceived} de {t.qty}: faltan {falta}
                    </div>
                  )}
                  {t.note && <div className="text-[12px] text-[#111] mt-1">“{t.note}”</div>}
                  {t.reviewNote && <div className="text-[12px] text-[#0891b2] mt-1">Revisión de {t.reviewedBy}: {t.reviewNote}</div>}
                  <div className="text-[11px] text-[#9ca3af] mt-1">{fecha(t.createdAt)}</div>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
                  style={{ background: COLOR[t.status] + '22', color: COLOR[t.status] }}
                >
                  {ETIQUETA[t.status]}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mt-3 empty:hidden">
                {t.status === 'pedido' && !isManager && (
                  <span className="text-[12px] text-[#6b7280]">Esperando que la gerente lo apruebe.</span>
                )}
                {t.status === 'pedido' && isManager && (
                  <>
                    <Btn onClick={() => hacer(() => aprobarTraslado(t.id), 'Aprobado: ya pueden enviarlo')}>✓ Aprobar</Btn>
                    <Btn variant="danger" onClick={() => hacer(() => cerrarTraslado(t.id, 'rechazado'), 'Rechazado')}>Rechazar</Btn>
                  </>
                )}
                {t.status === 'aprobado' && (soyOrigen || isManager) && (
                  <>
                    <Btn onClick={() => hacer(() => enviarTraslado(t.id), 'Enviado · salió de tu inventario')}>📦 Enviar</Btn>
                    <Btn variant="danger" onClick={() => hacer(() => cerrarTraslado(t.id, 'rechazado'), 'Rechazado')}>No puedo enviarlo</Btn>
                  </>
                )}
                {(t.status === 'pedido' || t.status === 'aprobado') && soyDestino && !isManager && (
                  <Btn variant="ghost" onClick={() => hacer(() => cerrarTraslado(t.id, 'cancelado'), 'Cancelado')}>Cancelar pedido</Btn>
                )}
                {t.status === 'enviado' && (soyDestino || isManager) && (
                  <Btn variant="success" onClick={() => confirmarLlegada(t)}>✓ Llegó</Btn>
                )}
                {t.status === 'enviado' && !soyDestino && !isManager && (
                  <span className="text-[12px] text-[#6b7280]">Esperando que {nameOf(t.to)} confirme que llegó.</span>
                )}
                {t.status === 'recibido' && isManager && (
                  <Btn onClick={() => hacer(() => revisarTraslado(t.id, false, ''), 'Traslado cerrado')}>✓ Cerrar</Btn>
                )}
                {(t.status === 'recibido' || t.status === 'con_diferencia') && !isManager && (
                  <span className="text-[12px] text-[#6b7280]">Esperando que la gerente lo cierre.</span>
                )}
                {t.status === 'con_diferencia' && isManager && (
                  <>
                    <Btn variant="ghost" onClick={() => revisar(t, true)}>↩ Devolver {falta} a {nameOf(t.from)}</Btn>
                    <Btn variant="danger" onClick={() => revisar(t, false)}>Dar por perdido</Btn>
                  </>
                )}
              </div>
            </Card>
          );
        })}

        {!mostrados.length && (
          <Card className="p-6 text-center text-[13px] text-[#9ca3af]">
            {
              {
                aprobar: 'No hay pedidos esperando aprobación.',
                enviar: 'No hay nada aprobado por enviar.',
                camino: 'No hay nada en camino.',
                cerrar: 'No hay traslados por cerrar.',
                historial: 'Todavía no hay traslados cerrados.',
              }[tab]
            }
          </Card>
        )}
      </div>

      <p className="text-[11px] text-[#9ca3af]">Se actualiza solo cada 30 segundos.</p>

      {enviando && <EnvioModal onClose={() => setEnviando(false)} onSaved={() => { setEnviando(false); recargar(); setTab(isManager ? 'enviar' : 'aprobar'); }} />}
    </div>
  );
}

/** Mandar mercancía a otra tienda sin que la pidan. */
function EnvioModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { products } = useApp();
  const { sedes, mySede, nameOf } = useSedes();
  const { isManager } = usePerms();
  const [desde, setDesde] = useState(mySede);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [pid, setPid] = useState('');
  const [variante, setVariante] = useState('');
  const [qty, setQty] = useState('1');
  const [hacia, setHacia] = useState('');
  const [nota, setNota] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadStock().then(setStock).catch(() => setStock([])); }, []);
  const idx = useMemo(() => stockIndex(stock), [stock]);

  // Sólo lo que hay en la tienda que envía.
  const conStock = products.filter((p) => (idx.get(p.id) ?? []).some((r) => r.locationId === desde && r.qty > 0));
  const variantes = (idx.get(pid) ?? []).filter((r) => r.locationId === desde && r.qty > 0);
  const elegida = variantes.find((r) => `${r.size}|${r.color}` === variante);

  const enviar = async () => {
    const n = Math.floor(Number(qty));
    if (!pid || !elegida) return toast.error('Elige el producto, la talla y el color');
    if (!hacia) return toast.error('Elige la tienda a la que lo envías');
    if (!(n > 0) || n > elegida.qty) return toast.error(`Puedes enviar entre 1 y ${elegida.qty}`);
    setBusy(true);
    try {
      await enviarDirecto(pid, hacia, n, elegida.size, elegida.color, nota, isManager ? desde : null);
      toast.success(isManager ? `Aprobado: ya se puede enviar a ${nameOf(hacia)}` : `Envío a ${nameOf(hacia)} preparado · espera la aprobación de la gerente`);
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Enviar a otra tienda">
      <div className="space-y-3">
        <p className="text-[12px] text-[#6b7280]">La mercancía no sale todavía: primero lo aprueba la gerente y después pulsas Enviar en Traslados.</p>
        {isManager ? (
          <div>
            <Label>Sale de</Label>
            <Select value={desde} onChange={(e) => { setDesde(e.target.value); setPid(''); setVariante(''); }}>
              <option value="">— Elige la tienda —</option>
              {sedes.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.code}</option>)}
            </Select>
          </div>
        ) : (
          <p className="text-[12px] text-[#6b7280]">Sale de <b>{nameOf(mySede)}</b>.</p>
        )}
        <div>
          <Label>Producto</Label>
          <Select value={pid} onChange={(e) => { setPid(e.target.value); setVariante(''); }}>
            <option value="">— Elige —</option>
            {conStock.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
        {pid && (
          <div>
            <Label>Talla y color</Label>
            <Select value={variante} onChange={(e) => setVariante(e.target.value)}>
              <option value="">— Elige —</option>
              {variantes.map((r) => (
                <option key={`${r.size}|${r.color}`} value={`${r.size}|${r.color}`}>
                  {[r.size, r.color].filter(Boolean).join(' · ') || 'Única'} ({r.qty})
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Piezas</Label>
            <Input type="number" min={1} max={elegida?.qty} value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div>
            <Label>Va a</Label>
            <Select value={hacia} onChange={(e) => setHacia(e.target.value)}>
              <option value="">— Elige —</option>
              {sedes.filter((x) => x.active && x.id !== desde).map((x) => <option key={x.id} value={x.id}>{x.code}</option>)}
            </Select>
          </div>
        </div>
        <div>
          <Label>Nota (opcional)</Label>
          <Textarea rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Por ejemplo: van en la bolsa azul" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={busy} onClick={enviar}>{busy ? 'Guardando…' : isManager ? '📦 Preparar y aprobar' : '📦 Pedir aprobación'}</Btn>
        </div>
      </div>
    </Modal>
  );
}
