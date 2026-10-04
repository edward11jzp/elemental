/**
 * Avisos de Zelle de Chase → Elemental.
 *
 * Corre dentro del Gmail de la tienda (script.google.com). Cada pocos minutos
 * busca los avisos «You received money with Zelle», comprueba que vengan
 * firmados por chase.com y los manda al buzón de cobros de Elemental.
 *
 * No borra, no responde y no toca ningún correo: sólo les pone la etiqueta
 * "Elemental/procesado" para no mandar dos veces el mismo aviso.
 *
 * Antes de usarlo, en Configuración del proyecto → Propiedades del script,
 * crea estas tres propiedades:
 *   SUPABASE_URL   https://xxxxx.supabase.co
 *   SUPABASE_KEY   la clave pública (anon) de Elemental
 *   INGEST_TOKEN   el mismo código que pusiste en la base de datos
 */

var LABEL = 'Elemental/procesado';
var MESES = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

function revisarZelle() {
  var cfg = PropertiesService.getScriptProperties().getProperties();
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_KEY || !cfg.INGEST_TOKEN) {
    throw new Error('Faltan las propiedades del script (SUPABASE_URL, SUPABASE_KEY, INGEST_TOKEN).');
  }
  var label = GmailApp.getUserLabelByName(LABEL) || GmailApp.createLabel(LABEL);
  var hilos = GmailApp.search('subject:"received money with Zelle" newer_than:14d -label:"' + LABEL + '"', 0, 50);
  var enviados = 0;

  for (var i = 0; i < hilos.length; i++) {
    var mensajes = hilos[i].getMessages();
    var todosOk = true;
    for (var j = 0; j < mensajes.length; j++) {
      var m = mensajes[j];
      var crudo = m.getRawContent();
      if (!firmadoPorChase(crudo)) { todosOk = false; continue; } // aviso sin firma válida: se ignora
      var d = leerAviso(m.getPlainBody());
      if (!d) { todosOk = false; continue; } // no se pudo leer: que no quede marcado
      var ok = enviar(cfg, {
        p_token: cfg.INGEST_TOKEN,
        p_provider: 'zelle',
        p_ref: d.ref || ('Z-' + m.getId()),
        p_at: new Date(d.fecha || m.getDate().getTime()).toISOString(),
        p_amount: d.monto,
        p_currency: 'USD',
        p_from: d.de,
        p_note: d.nota,
      });
      if (ok) { enviados++; } else { todosOk = false; }
    }
    if (todosOk) { hilos[i].addLabel(label); } // sólo se marca si todo salió bien
  }
  console.log('Avisos enviados: ' + enviados + ' de ' + hilos.length + ' conversación(es) revisada(s).');
}

/** ¿Lo firmó chase.com? Se mira la comprobación que anotó Gmail al recibirlo. */
function firmadoPorChase(crudo) {
  // Se desdoblan las cabeceras (las continuaciones empiezan con espacio).
  var cabeceras = String(crudo).split(/\r?\n\r?\n/)[0].replace(/\r?\n[ \t]+/g, ' ');
  var lineas = cabeceras.split(/\r?\n/);
  // Sólo vale la comprobación que escribió Gmail al recibir el correo, que va
  // de primera. Quien manda un correo puede escribir más abajo una línea
  // idéntica diciendo que viene de Chase, y sería mentira.
  for (var i = 0; i < lineas.length; i++) {
    if (!/^Authentication-Results:/i.test(lineas[i])) { continue; }
    var v = lineas[i].replace(/^Authentication-Results:\s*/i, '');
    if (!/^mx\.google\.com\b/i.test(v)) { return false; }
    return /dkim=pass[^;]*header\.(?:i=@|d=)(?:[\w.-]+\.)?chase\.com/i.test(v);
  }
  return false; // sin comprobación de Gmail no se acepta
}

/** Texto del aviso de Chase → datos del cobro. Null si no es un aviso de cobro. */
function leerAviso(texto) {
  // Chase escribe los valores entre asteriscos: «Amount *$132.00*».
  var t = String(texto || '').replace(/\u00a0/g, ' ').replace(/\*/g, '').replace(/[ \t]+/g, ' ');
  var de = /([A-ZÁÉÍÓÚÑ0-9][^\n]{0,80}?)\s+sent you money/i.exec(t);
  var monto = /Amount\s*\$?\s*([\d,]+\.\d{2})/i.exec(t);
  if (!de || !monto) { return null; }
  var ref = /Transaction number\s*([A-Z0-9]+)/i.exec(t);
  var env = /Sent on\s*([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),\s*(\d{4})/i.exec(t);
  // El memo va en la misma línea o en la siguiente; si viene vacía, no hay memo.
  var memo = /Memo:?[ \t]*\r?\n?[ \t]*([^\n]*)/i.exec(t);
  var nota = memo ? memo[1].trim() : '';
  if (!nota || nota === 'N/A' || /registered with a Zelle|sent you money|Transaction number|^Amount\b/i.test(nota)) { nota = ''; }
  return {
    de: de[1].trim(),
    monto: Number(monto[1].replace(/,/g, '')),
    ref: ref ? ref[1] : '',
    nota: nota,
    fecha: env ? Date.UTC(+env[3], MESES[env[1].toLowerCase()] || 0, +env[2], 16) : null,
  };
}

function enviar(cfg, cuerpo) {
  var r = UrlFetchApp.fetch(cfg.SUPABASE_URL + '/rest/v1/rpc/ingest_payment', {
    method: 'post',
    contentType: 'application/json',
    headers: { apikey: cfg.SUPABASE_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_KEY },
    payload: JSON.stringify(cuerpo),
    muteHttpExceptions: true,
  });
  if (r.getResponseCode() >= 300) {
    console.error('No se pudo enviar ' + cuerpo.p_ref + ': ' + r.getContentText());
    return false;
  }
  return true;
}

/** Ejecútala UNA vez para que el script se revise solo cada 5 minutos. */
function instalarRevisionAutomatica() {
  var t = ScriptApp.getProjectTriggers();
  for (var i = 0; i < t.length; i++) { ScriptApp.deleteTrigger(t[i]); }
  ScriptApp.newTrigger('revisarZelle').timeBased().everyMinutes(5).create();
  console.log('Listo: se revisará cada 5 minutos.');
}

/** Quita la etiqueta "procesado" para volver a revisar todo desde cero. */
function empezarDeNuevo() {
  var label = GmailApp.getUserLabelByName(LABEL);
  if (!label) { console.log('No hay nada marcado.'); return; }
  var hilos = label.getThreads(0, 200);
  for (var i = 0; i < hilos.length; i++) { hilos[i].removeLabel(label); }
  console.log('Se desmarcaron ' + hilos.length + ' conversación(es).');
}

/** Comprobación: dice qué leyó de los últimos avisos y si venían firmados. No manda nada. */
function comprobarUltimos() {
  var hilos = GmailApp.search('subject:"received money with Zelle" newer_than:30d', 0, 10);
  console.log('Avisos encontrados: ' + hilos.length);
  for (var i = 0; i < hilos.length; i++) {
    var m = hilos[i].getMessages()[0];
    var ok = firmadoPorChase(m.getRawContent());
    var d = leerAviso(m.getPlainBody());
    console.log((ok ? '✅ firmado por Chase' : '❌ SIN firma válida — se descarta') + ' · ' +
      (d ? ('$' + d.monto + ' de ' + d.de + ' · ref ' + d.ref) : 'no se pudo leer el aviso'));
  }
}
