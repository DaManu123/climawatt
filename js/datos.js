/* =========================================================
   ClimaWatt - datos.js
   Constantes, tarifas de referencia, catálogo de aparatos
   y datos de ejemplo.
   ========================================================= */
window.CW = window.CW || {};

CW.VERSION = '1.0.0';

// Configuración por defecto (el usuario la puede cambiar en Ajustes)
CW.CONFIG_DEFAULT = {
  factorCO2: 0.444,          // kg CO2e por kWh - SEMARNAT, Sistema Eléctrico Nacional 2024
  limiteDAC: 2500,           // kWh promedio mensual para Tarifa 1F
  iva: 0.16,
  mesesVerano: [5, 6, 7, 8, 9, 10], // mayo a octubre
  tarifas: {
    // Tarifa 1F - precios de referencia por kWh (sin IVA)
    verano: [
      { n: 'Básico',          hasta: 300,  p: 0.803 },
      { n: 'Intermedio bajo', hasta: 1200, p: 0.996 },
      { n: 'Intermedio alto', hasta: 2500, p: 2.423 },
      { n: 'Excedente',       hasta: null, p: 3.833 }
    ],
    invierno: [
      { n: 'Básico',     hasta: 75,   p: 1.125 },
      { n: 'Intermedio', hasta: 175,  p: 1.369 },
      { n: 'Excedente',  hasta: null, p: 4.004 }
    ]
  }
};

// Supuestos del simulador de ahorro
CW.SIM = {
  tempBase: 22,          // °C de referencia
  ahorroPorGrado: 0.06,  // ~6% menos por cada grado arriba de la base
  ahorroInverter: 0.35,  // inverter consume ~35% menos que convencional
  ahorroEspera: 0.05,    // consumo en modo espera ~5%
  kgCO2Arbol: 22,        // kg de CO2 que absorbe un árbol al año (estimación)
  kgCO2Km: 0.17          // kg de CO2 por km en auto promedio (estimación)
};

// Catálogo de tipos de aparato
CW.TIPOS = {
  clima:  { ic: '❄️', nombre: 'Minisplit convencional', color: '#2b7fd1', clima: true },
  climai: { ic: '❄️', nombre: 'Minisplit inverter',     color: '#5aa2e6', clima: true },
  cooler: { ic: '💨', nombre: 'Cooler / enfriador',     color: '#7cc3e8' },
  refri:  { ic: '🧊', nombre: 'Refrigerador',           color: '#1f9d6b' },
  tv:     { ic: '📺', nombre: 'Televisión',             color: '#f2a516', espera: true },
  pc:     { ic: '💻', nombre: 'Computadora / consola',  color: '#8e6bd6', espera: true },
  lav:    { ic: '🧺', nombre: 'Lavadora / secadora',    color: '#e0739a' },
  luz:    { ic: '💡', nombre: 'Iluminación',            color: '#f5c84b' },
  bomba:  { ic: '🚰', nombre: 'Bomba de agua',          color: '#3fb3a6' },
  cocina: { ic: '🍳', nombre: 'Cocina (micro, horno)',  color: '#e07b39' },
  otro:   { ic: '🔌', nombre: 'Otro',                   color: '#9aa8a3', espera: true }
};

// Aparatos precargados para el formulario (potencias típicas aproximadas)
CW.PRESETS = [
  { t: 'clima',  n: 'Minisplit 1 ton convencional',   w: 1300, h: 8 },
  { t: 'clima',  n: 'Minisplit 1.5 ton convencional', w: 1800, h: 8 },
  { t: 'clima',  n: 'Minisplit 2 ton convencional',   w: 2200, h: 8 },
  { t: 'climai', n: 'Minisplit 1 ton inverter',       w: 900,  h: 8 },
  { t: 'climai', n: 'Minisplit 1.5 ton inverter',     w: 1200, h: 8 },
  { t: 'climai', n: 'Minisplit 2 ton inverter',       w: 1500, h: 8 },
  { t: 'cooler', n: 'Cooler (enfriador evaporativo)', w: 250,  h: 8 },
  { t: 'refri',  n: 'Refrigerador',                   w: 200,  h: 8 },
  { t: 'tv',     n: 'Televisión',                     w: 120,  h: 5 },
  { t: 'pc',     n: 'Computadora de escritorio',      w: 350,  h: 5 },
  { t: 'pc',     n: 'Laptop',                         w: 65,   h: 6 },
  { t: 'pc',     n: 'Consola de videojuegos',         w: 180,  h: 3 },
  { t: 'lav',    n: 'Lavadora',                       w: 500,  h: 1 },
  { t: 'lav',    n: 'Secadora eléctrica',             w: 3000, h: 1 },
  { t: 'luz',    n: 'Focos LED (10)',                 w: 90,   h: 6 },
  { t: 'bomba',  n: 'Bomba de agua',                  w: 750,  h: 0.5 },
  { t: 'cocina', n: 'Horno de microondas',            w: 1200, h: 0.3 },
  { t: 'otro',   n: 'Otro aparato',                   w: 100,  h: 2 }
];

// Casa de ejemplo (la misma que se usa en el documento)
CW.EJEMPLO_APARATOS = [
  { t: 'clima',  n: 'Clima de la sala (2 ton)',         w: 2200, h: 10,  d: 30 },
  { t: 'climai', n: 'Clima recámara (1 ton inverter)',  w: 900,  h: 9,   d: 30 },
  { t: 'refri',  n: 'Refrigerador',                     w: 200,  h: 8,   d: 30 },
  { t: 'pc',     n: 'Computadora',                      w: 350,  h: 5,   d: 30 },
  { t: 'tv',     n: 'Televisión',                       w: 120,  h: 6,   d: 30 },
  { t: 'luz',    n: 'Focos LED (10)',                   w: 90,   h: 6,   d: 30 },
  { t: 'bomba',  n: 'Bomba de agua',                    w: 750,  h: 0.5, d: 30 },
  { t: 'lav',    n: 'Lavadora',                         w: 500,  h: 1,   d: 12 }
];

// Recibos de ejemplo (kWh del bimestre). Periodo = mes en que cierra el bimestre.
CW.EJEMPLO_RECIBOS = [
  { periodo: '2025-12', kwh: 520,  monto: 690 },
  { periodo: '2026-02', kwh: 430,  monto: 590 },
  { periodo: '2026-04', kwh: 780,  monto: 820 },
  { periodo: '2026-06', kwh: 2050, monto: 2280 },
  { periodo: '2026-08', kwh: 2350, monto: 2690 },
  { periodo: '2026-10', kwh: 1900, monto: 2110 }
];

// Plan de acción (consejos que el usuario puede marcar como hechos)
CW.CONSEJOS = [
  { id: 'temp',    txt: 'Poner el clima en 24–25 °C y usar ventilador de techo para repartir el aire frío.' },
  { id: 'filtros', txt: 'Limpiar los filtros del minisplit cada mes en temporada de calor.' },
  { id: 'cort',    txt: 'Cerrar cortinas en la tarde, que es cuando más pega el sol.' },
  { id: 'empaque', txt: 'Revisar empaques de puertas y ventanas para que no se salga el aire.' },
  { id: 'timer',   txt: 'Programar el apagado del clima en la madrugada, cuando baja la temperatura.' },
  { id: 'cuartos', txt: 'Enfriar solo los cuartos que se están usando y cerrar las puertas.' },
  { id: 'espera',  txt: 'Desconectar TV, consola y cargadores cuando no se usan (consumo fantasma).' },
  { id: 'techo',   txt: 'Pintar el techo de blanco o con impermeabilizante reflectivo.' }
];

CW.MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
