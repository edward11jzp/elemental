// AdminOrderNotifier — se monta dentro del layout admin (AdminRoot).
//
// Cuando llega una nueva orden vía Supabase Realtime, dispara 3 cosas
// simultáneamente para que el admin no pierda ninguna venta:
//
// 1) Un beep corto (Web Audio) — sonido audible en escritorio y móvil
// 2) Una notificación nativa del navegador (Notification API) — visible
//    incluso si el admin está en otra pestaña, siempre que tenga el sitio
//    abierto. En móvil solo funciona si el sitio está instalado como PWA;
//    en escritorio funciona siempre que el navegador tenga permiso.
// 3) Un toast interno como fallback siempre visible en la app
//
// El permiso de notificación se solicita al montarse (una sola vez por
// navegador). Si el usuario lo niega, seguimos con sonido + toast.

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useApp } from '../context';
import type { Order } from '../types';

function playBeep() {
  try {
    const Ctx: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    // Un "ding" doble corto — más notable que un beep plano, no molesto.
    const play = (freq: number, when: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + when + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + duration + 0.02);
    };
    play(880, 0, 0.18);
    play(1174, 0.14, 0.24);
    // Cerramos el contexto luego para liberar recursos.
    setTimeout(() => ctx.close(), 800);
  } catch {
    // No pasa nada — el sonido es opcional.
  }
}

function showBrowserNotification(order: Order) {
  try {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    const total = typeof order.total === 'number' ? order.total.toFixed(2) : String(order.total);
    new Notification('Nueva orden — Elemental Fabrica', {
      body: `${order.customerName || 'Cliente'} · $${total}`,
      // 'tag' evita duplicar notificaciones si el mismo id se emite dos veces
      // (por ejemplo si Realtime reenvia el evento por reconexión).
      tag: order.id,
    });
  } catch {
    // Silencioso — la notificación es best-effort.
  }
}

export function AdminOrderNotifier() {
  const { currentUser, onNewOrder } = useApp();

  // Solicita permiso de notificación una vez al montar (solo si hay admin
  // logueado). Los navegadores requieren interacción del usuario para el
  // popup de permiso; usar requestPermission dentro de un evento sería
  // ideal pero al momento del montaje es aceptable porque el admin ya
  // inició sesión (hizo click).
  useEffect(() => {
    if (!currentUser) return;
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [currentUser]);

  // Suscribe listener a nuevas órdenes.
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onNewOrder((order) => {
      playBeep();
      showBrowserNotification(order);
      toast.success(
        `Nueva orden de ${order.customerName || 'Cliente'} — $${
          typeof order.total === 'number' ? order.total.toFixed(2) : order.total
        }`,
        { duration: 8000 },
      );
    });
    return unsub;
  }, [currentUser, onNewOrder]);

  return null;
}
