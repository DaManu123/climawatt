/* =========================================================
   ClimaWatt - almacenamiento.js
   Guarda y carga el estado en localStorage del navegador.
   Todo lo que se carga (guardado o importado) pasa por
   normalizar(), que descarta o corrige datos inválidos para
   que un archivo dañado nunca rompa la app.
   Si el navegador no permite guardar, la app sigue funcionando
   en memoria.
   ========================================================= */
window.CW = window.CW || {};

CW.store = (function () {
  const KEY = 'climawatt_v1';
  const KEY_DANADO = 'climawatt_v1_danado';
  let id = Date.now();
  const nuevoId = () => (id++).toString(36);

  // ---------- Validación ----------
  const num = (v, min, max, def) => {
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
    return typeof n === 'number' && isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  };
  const texto = (v, max, def) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : def);
  const idValido = v => (typeof v === 'string' && /^[a-z0-9]{1,20}$/i.test(v) ? v : nuevoId());
  const PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;
  const copia = o => JSON.parse(JSON.stringify(o));

  function limpiarAparato(a) {
    if (!a || typeof a !== 'object') return null;
    const t = CW.TIPOS[a.t] ? a.t : 'otro';
    const w = num(a.w, 0, 20000, null);
    if (w == null) return null;
    const out = {
      id: idValido(a.id),
      t,
      n: texto(a.n, 40, CW.TIPOS[t].nombre),
      w,
      h: num(a.h, 0, 24, 0),
      d: Math.round(num(a.d, 1, 31, 30))
    };
    if (CW.TIPOS[t].estacional) out.hi = num(a.hi, 0, 24, 0);
    return out;
  }

  function limpiarRecibo(r) {
    if (!r || typeof r !== 'object' || typeof r.periodo !== 'string' || !PERIODO.test(r.periodo)) return null;
    const kwh = num(r.kwh, 1, 100000, null);
    if (kwh == null) return null;
    return { id: idValido(r.id), periodo: r.periodo, kwh, monto: num(r.monto, 0, 1e7, 0) };
  }

  function limpiarEscalones(lista, def) {
    // Debe tener los mismos escalones que la tarifa de referencia
    if (!Array.isArray(lista) || lista.length !== def.length) return copia(def);
    let previo = 0;
    const out = [];
    for (let i = 0; i < lista.length; i++) {
      const e = lista[i] || {};
      const ultimo = i === lista.length - 1;
      const hasta = ultimo ? null : num(e.hasta, previo + 1, 100000, null);
      const p = num(e.p, 0, 100, null);
      if ((!ultimo && hasta == null) || p == null) return copia(def);
      out.push({ n: texto(e.n, 30, 'Escalón ' + (i + 1)), hasta, p });
      if (hasta != null) previo = hasta;
    }
    return out;
  }

  function limpiarConfig(c) {
    const def = CW.CONFIG_DEFAULT;
    c = c && typeof c === 'object' ? c : {};
    const meses = Array.isArray(c.mesesVerano)
      ? [...new Set(c.mesesVerano.map(Number).filter(m => Number.isInteger(m) && m >= 1 && m <= 12))]
      : null;
    const t = c.tarifas && typeof c.tarifas === 'object' ? c.tarifas : {};
    return {
      factorCO2: num(c.factorCO2, 0, 5, def.factorCO2),
      limiteDAC: num(c.limiteDAC, 1, 100000, def.limiteDAC),
      iva: num(c.iva, 0, 1, def.iva),
      mesesVerano: meses && meses.length && meses.length < 12 ? meses : [...def.mesesVerano],
      tarifas: {
        verano: limpiarEscalones(t.verano, def.tarifas.verano),
        invierno: limpiarEscalones(t.invierno, def.tarifas.invierno)
      }
    };
  }

  // Une lo guardado con los valores por defecto y descarta lo inválido
  function normalizar(e) {
    e = e && typeof e === 'object' ? e : {};
    const s = e.sim && typeof e.sim === 'object' ? e.sim : {};
    const plan = {};
    if (e.plan && typeof e.plan === 'object') {
      CW.CONSEJOS.forEach(c => { if (e.plan[c.id] === true) plan[c.id] = true; });
    }
    const recibos = [];
    (Array.isArray(e.recibos) ? e.recibos : []).map(limpiarRecibo).forEach(r => {
      if (r && !recibos.some(x => x.periodo === r.periodo)) recibos.push(r);
    });
    return {
      hogar: typeof e.hogar === 'string' ? e.hogar.trim().slice(0, 30) : 'Familia',
      aparatos: (Array.isArray(e.aparatos) ? e.aparatos : []).map(limpiarAparato).filter(Boolean),
      recibos,
      config: limpiarConfig(e.config),
      sim: {
        temp: Math.round(num(s.temp, 18, 27, 22)),
        horas: num(s.horas, 0, 4, 0),
        inverter: s.inverter === true,
        espera: s.espera === true
      },
      plan,
      temporada: e.temporada === 'verano' || e.temporada === 'invierno' ? e.temporada : null
    };
  }

  function estadoEjemplo() {
    return normalizar({
      hogar: 'Familia',
      aparatos: copia(CW.EJEMPLO_APARATOS),
      recibos: copia(CW.EJEMPLO_RECIBOS),
      // la casa de ejemplo es un escenario de verano (el del documento);
      // se puede regresar a temporada automática desde Recibo
      temporada: 'verano'
    });
  }

  function estadoVacio() {
    return normalizar({ hogar: '' });
  }

  function cargar() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (err) { /* sin almacenamiento disponible */ }
    if (!raw) return estadoEjemplo();
    try {
      return normalizar(JSON.parse(raw));
    } catch (err) {
      // Datos ilegibles: se apartan (por si se quieren recuperar) y se empieza con el ejemplo
      apartarDanado(raw);
      return estadoEjemplo();
    }
  }

  function apartarDanado(raw) {
    try { localStorage.setItem(KEY_DANADO, raw); } catch (err) { /* nada */ }
  }

  function guardar(estado) {
    try { localStorage.setItem(KEY, JSON.stringify(estado)); return true; }
    catch (err) { return false; }
  }

  function exportar(estado) {
    return JSON.stringify({ app: 'ClimaWatt', version: CW.VERSION, fecha: new Date().toISOString(), datos: estado }, null, 2);
  }

  function importar(texto) {
    let obj;
    try { obj = JSON.parse(texto); } catch (err) { throw new Error('el archivo no es un JSON válido'); }
    const datos = obj && obj.datos ? obj.datos : obj;
    if (!datos || typeof datos !== 'object' || !Array.isArray(datos.aparatos)) {
      throw new Error('no es un respaldo de ClimaWatt');
    }
    return normalizar(datos);
  }

  return { cargar, guardar, exportar, importar, normalizar, estadoEjemplo, estadoVacio, nuevoId, apartarDanado };
})();
