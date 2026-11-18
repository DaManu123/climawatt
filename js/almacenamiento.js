/* =========================================================
   ClimaWatt - almacenamiento.js
   Guarda y carga el estado en localStorage del navegador.
   Si el navegador no permite guardar, la app sigue funcionando
   en memoria.
   ========================================================= */
window.CW = window.CW || {};

CW.store = (function () {
  const KEY = 'climawatt_v1';
  let id = Date.now();
  const nuevoId = () => (id++).toString(36);

  function estadoEjemplo() {
    return {
      hogar: 'Familia',
      aparatos: CW.EJEMPLO_APARATOS.map(a => ({ ...a, id: nuevoId() })),
      recibos: CW.EJEMPLO_RECIBOS.map(r => ({ ...r, id: nuevoId() })),
      config: JSON.parse(JSON.stringify(CW.CONFIG_DEFAULT)),
      sim: { temp: 22, horas: 0, inverter: false, espera: false },
      plan: {},
      temporada: 'verano' // la casa de ejemplo es un escenario de verano; null = automática según el mes
    };
  }

  function estadoVacio() {
    const e = estadoEjemplo();
    e.aparatos = [];
    e.recibos = [];
    e.temporada = null;
    return e;
  }

  // Une lo guardado con los valores por defecto (por si faltan campos)
  function normalizar(e) {
    const base = estadoEjemplo();
    const out = { ...base, ...e };
    out.config = { ...base.config, ...(e.config || {}) };
    out.config.tarifas = { ...base.config.tarifas, ...((e.config || {}).tarifas || {}) };
    out.sim = { ...base.sim, ...(e.sim || {}) };
    out.plan = e.plan || {};
    out.aparatos = (e.aparatos || []).map(a => ({ ...a, id: a.id || nuevoId() }));
    out.recibos = (e.recibos || []).map(r => ({ ...r, id: r.id || nuevoId() }));
    return out;
  }

  function cargar() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return normalizar(JSON.parse(raw));
    } catch (err) { /* sin almacenamiento disponible */ }
    return estadoEjemplo();
  }

  function guardar(estado) {
    try { localStorage.setItem(KEY, JSON.stringify(estado)); return true; }
    catch (err) { return false; }
  }

  function exportar(estado) {
    return JSON.stringify({ app: 'ClimaWatt', version: CW.VERSION, fecha: new Date().toISOString(), datos: estado }, null, 2);
  }

  function importar(texto) {
    const obj = JSON.parse(texto);
    const datos = obj && obj.datos ? obj.datos : obj;
    if (!datos || !Array.isArray(datos.aparatos)) throw new Error('El archivo no es un respaldo de ClimaWatt');
    return normalizar(datos);
  }

  return { cargar, guardar, exportar, importar, estadoEjemplo, estadoVacio, nuevoId };
})();
