// Traslados entre tiendas: lo que pedí, lo que me piden y lo que va en camino.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Btn, Card, Pills, cx } from '../components/admin/ui';
import { useSedes } from '../lib/sedes';
import { usePerms } from '../lib/perms';
import {
  cerrarTraslado, enviarTraslado, listTraslados, recibirTraslado,
  type EstadoTraslado, type Traslado,
} from '../lib/transfers';

type Pestana = 'pendientes' | 'camino' | 'historial';

const COLOR: Record<EstadoTraslado, string> = {
  pedido: '#ca8a04',
  enviado: '#2563eb',
  recibido: '#16a34a',
  rechazado: '#dc2626',
  cancelado: '#71717a',
};
const ETIQUETA: Record<EstadoTraslado, string> = {
  pedido: 'Pedido',
  enviado: 'En camino',
  recibido: 'Recibido',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
};

export default function AdminTransfers() {
  const { sedes, mySede, nameOf } = useSedes();
  const { isManager } = usePerms();
  const [lista, setLista] = useState<Traslado[]>([]);
  const [tab, setTab] = useState<Pestana>('pendientes');
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(() => {
    listTraslados().then(setLista).catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    recargar();
    const t = setInterval(() => !document.hidden && recargar(), 30000);
    return () => clearInterval(t);
  }, [recargar]);

  const mostrados = useMemo(() => {
    if (tab === 'pendientes') return lista.filter((t) => t.status === 'pedido');
    if (tab === 'camino') return lista.filter((t) => t.status === 'enviado');
    return lista.filter((t) => t.status !== 'pedido' && t.status !== 'enviado');
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

  const pendientes = lista.filter((t) => t.status === 'pedido').length;
  const camino = lista.filter((t) => t.status === 'enviado').length;

  return (
    <div className="px-4 lg:px-6 py-5 max-w-[1100px] space-y-4">
      <div>
        <h2 className="text-[18px] font-bold">Traslados entre tiendas</h2>
        <p className="text-[12px] text-[#6b7280]">
          Pide lo que no tienes. La tienda que lo tiene lo envía y tú confirmas cuando llegue;
          mientras viaja no cuenta en el inventario de ninguna.
        </p>
      </div>

      {error && (
        <Card className="p-4 text-[13px] text-[#b91c1c]">
          {/does not exist|relation/i.test(error) ? 'Falta ejecutar la migración de traslados en Supabase.' : error}
        </Card>
      )}

      <Pills<Pestana>
        value={tab}
        onChange={setTab}
        options={[
          { key: 'pendientes', label: `Por atender${pendientes ? ` (${pendientes})` : ''}` },
          { key: 'camino', label: `En camino${camino ? ` (${camino})` : ''}` },
          { key: 'historial', label: 'Historial' },
        ]}
      />

      <div className="space-y-2">
        {mostrados.map((t) => {
          const meLoPiden = t.from === mySede;
          const loPedi = t.to === mySede;
          return (
            <Card key={t.id} className="p-4">
              <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                <div className="min-w-[200px] flex-1">
                  <div className="font-semibold">
                    {t.qty} × {t.productName}
                    {(t.size || t.color) && (
                      <span className="ml-1 text-[12px] font-normal text-[#6b7280]">
                        {[t.size, t.color].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-[#6b7280] mt-0.5">
                    {nameOf(t.from)} → {nameOf(t.to)} · pidió {t.askedBy}
                    {t.sentBy ? ` · envió ${t.sentBy}` : ''}
                    {t.gotBy ? ` · recibió ${t.gotBy}` : ''}
                  </div>
                  {t.note && <div className="text-[12px] text-[#111] mt-1">“{t.note}”</div>}
                  <div className="text-[11px] text-[#9ca3af] mt-1">
                    {new Date(t.createdAt).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
                  style={{ background: COLOR[t.status] + '22', color: COLOR[t.status] }}
                >
                  {ETIQUETA[t.status]}
                </span>
              </div>

              {(t.status === 'pedido' || t.status === 'enviado') && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {t.status === 'pedido' && (meLoPiden || isManager) && (
                    <>
                      <Btn onClick={() => hacer(() => enviarTraslado(t.id), 'Enviado · sale de tu inventario')}>
                        📦 Enviar
                      </Btn>
                      <Btn variant="danger" onClick={() => hacer(() => cerrarTraslado(t.id, 'rechazado'), 'Rechazado')}>
                        No puedo enviarlo
                      </Btn>
                    </>
                  )}
                  {t.status === 'pedido' && (loPedi || isManager) && (
                    <Btn variant="ghost" onClick={() => hacer(() => cerrarTraslado(t.id, 'cancelado'), 'Cancelado')}>
                      Cancelar pedido
                    </Btn>
                  )}
                  {t.status === 'enviado' && (loPedi || isManager) && (
                    <Btn variant="success" onClick={() => hacer(() => recibirTraslado(t.id), 'Recibido · entró a tu inventario')}>
                      ✓ Llegó
                    </Btn>
                  )}
                  {t.status === 'enviado' && !loPedi && !isManager && (
                    <span className="text-[12px] text-[#6b7280]">Esperando que {nameOf(t.to)} confirme que llegó.</span>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {!mostrados.length && (
          <Card className="p-6 text-center text-[13px] text-[#9ca3af]">
            {tab === 'pendientes' ? 'No hay pedidos por atender.' : tab === 'camino' ? 'No hay nada en camino.' : 'Todavía no hay traslados.'}
          </Card>
        )}
      </div>

      {sedes.length < 2 && (
        <Card className="p-4 text-[13px] text-[#6b7280]">Necesitas más de una sede para trasladar mercancía.</Card>
      )}
      <p className={cx('text-[11px] text-[#9ca3af]')}>Se actualiza solo cada 30 segundos.</p>
    </div>
  );
}
