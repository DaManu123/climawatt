/* =========================================================
   ClimaWatt - iconos.js
   Iconos de línea (SVG 24x24, trazo de 2px) usados en toda
   la interfaz. Heredan el color del texto (currentColor).
   ========================================================= */
window.CW = window.CW || {};

CW.ICONOS = {
  inicio:    '<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  aparatos:  '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  recibo:    '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  ahorro:    '<path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  hoja:      '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.1-6"/>',
  ajustes:   '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  rayo:      '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  nube:      '<path d="M17.5 19H8a6 6 0 1 1 5.7-7.9A4.5 4.5 0 1 1 17.5 19z"/>',
  sol:       '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  copo:      '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7"/><path d="m9 3.5 3 2 3-2M9 20.5l3-2 3 2M3.6 10.5l3.4-.5-1.3-3.2M20.4 13.5l-3.4.5 1.3 3.2M5.7 17.2 7 14l-3.4-.5M18.3 6.8 17 10l3.4.5"/>',
  auto:      '<path d="M21 12a9 9 0 0 1-15.4 6.4L3 16M3 21v-5h5M3 12a9 9 0 0 1 15.4-6.4L21 8M21 3v5h-5"/>',
  viento:    '<path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h6"/>',
  refri:     '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 10h14M9 5v2M9 13v4"/>',
  tv:        '<rect x="2" y="7" width="20" height="13" rx="2"/><path d="m8 3 4 4 4-4"/>',
  pc:        '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  lavadora:  '<rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M8 6h.01M11 6h.01"/>',
  foco:      '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>',
  gota:      '<path d="M12 3s-6 6.5-6 11a6 6 0 0 0 12 0c0-4.5-6-11-6-11z"/>',
  micro:     '<rect x="2" y="4" width="20" height="15" rx="2"/><rect x="5" y="7" width="10" height="9" rx="1"/><path d="M18 8h.01M18 12h.01M18 16h.01"/>',
  enchufe:   '<path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0zM12 17v5"/>',
  documento: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  alerta:    '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  ok:        '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
  info:      '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  lupa:      '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  billete:   '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  bajar:     '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  subir:     '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
  basura:    '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
  mas:       '<path d="M12 5v14M5 12h14"/>',
  casa:      '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  grafica:   '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-6"/>'
};

// Devuelve el SVG de un icono como texto HTML
CW.icono = function (nombre, clase) {
  const p = CW.ICONOS[nombre] || CW.ICONOS.enchufe;
  return `<svg class="ic${clase ? ' ' + clase : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
};

// Reemplaza los <span data-i="nombre"></span> del HTML por su icono
CW.pintarIconos = function (raiz) {
  (raiz || document).querySelectorAll('[data-i]').forEach(el => {
    el.innerHTML = CW.icono(el.dataset.i);
    el.removeAttribute('data-i');
  });
};
