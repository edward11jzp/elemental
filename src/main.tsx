import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import App from './app/App';

// Al publicar una versión nueva, los archivos cambian de nombre. Una pestaña
// que lleva rato abierta pide uno que ya no existe y la pantalla se rompe.
// Cuando pasa, se recarga sola una vez; el guardado evita que entre en bucle
// si el fallo fuera de conexión y no de versión.
const RECARGA = 'elemental_recarga_version';

function recargarUnaVez() {
  try {
    const ultima = Number(sessionStorage.getItem(RECARGA) || 0);
    if (Date.now() - ultima < 20000) return; // ya se intentó hace nada
    sessionStorage.setItem(RECARGA, String(Date.now()));
  } catch {
    /* ventana privada: se recarga igual */
  }
  window.location.reload();
}

window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  recargarUnaVez();
});

window.addEventListener('unhandledrejection', (e) => {
  const msg = String((e.reason as Error)?.message ?? e.reason ?? '');
  if (/dynamically imported module|Importing a module script failed|Failed to fetch/i.test(msg)) {
    recargarUnaVez();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
