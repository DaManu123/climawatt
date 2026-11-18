/* =========================================================
   ClimaWatt - app.js
   Interfaz: navegación, render de vistas y eventos.
   ========================================================= */
(function () {
  'use strict';

  // ---------- Estado ----------
  let S = CW.store.cargar();
  let vistaActual = 'inicio';
  let reciboTab = 'estimado';
  const persistir = () => CW.store.guardar(S);

  // ---------- Utilidades ----------
  const $ = id => document.getElementById(id);
  const fmt = (n, dec = 0) => Number(n).toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const money = n => '$' + fmt(n, 0);
  const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const tipo = a => CW.TIPOS[a.t] || CW.TIPOS.otro;
  const mesActual = () => new Date().getMonth() + 1;
  const temporada = () => S.temporada || (CW.calc.esVerano(mesActual(), S.config) ? 'verano' : 'invierno');

  function hbar(label, val, pct, color) {
    return `<div class="hbar"><div class="row"><span>${esc(label)}</span><b>${val}</b></div>
      <div class="bar"><span style="width:${Math.max(1, pct)}%;background:${color}"></span></div></div>`;
  }
  function periodoTxt(p) {
    const [y, m] = p.split('-').map(Number);
    const ini = ((m - 2 + 12) % 12);
    return `${CW.MESES[ini]}–${CW.MESES[m - 1]} ${y}`;
  }

  let toastTimer;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function confirmar(titulo, texto, txtSi = 'Aceptar') {
    return new Promise(res => {
      $('m-title').textContent = titulo; $('m-text').textContent = texto; $('m-yes').textContent = txtSi;
      $('modal').classList.add('show');
      const fin = v => { $('modal').classList.remove('show'); $('m-yes').onclick = $('m-no').onclick = null; res(v); };
      $('m-yes').onclick = () => fin(true);
      $('m-no').onclick = () => fin(false);
    });
  }

  // ---------- Navegación ----------
  const TITULOS = {
    inicio:   () => [`Hola, ${S.hogar || 'familia'} 👋`, 'Así va tu consumo de luz este mes'],
    aparatos: () => ['Mis aparatos', 'Registra lo que tienes conectado en casa'],
    recibo:   () => ['Mi recibo', 'Proyección con la tarifa de Hermosillo'],
    ahorro:   () => ['Ahorra energía', 'Simula cambios y arma tu plan'],
    huella:   () => ['Huella de carbono', 'El impacto ambiental de tu consumo'],
    ajustes:  () => ['Ajustes', 'Tarifas, datos y respaldo']
  };
  function ir(v, { scroll = true } = {}) {
    if (!TITULOS[v]) v = 'inicio';
    vistaActual = v;
    document.querySelectorAll('.view').forEach(x => x.classList.toggle('active', x.id === 'v-' + v));
    document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.go === v));
    const [t, s] = TITULOS[v](); $('hTitle').textContent = t; $('hSub').textContent = s;
    if (location.hash.slice(1) !== v) history.replaceState(null, '', '#' + v);
    render();
    if (scroll) window.scrollTo(0, 0);
  }

  // ---------- Render general ----------
  function render() {
    const temp = temporada();
    $('seasonPill').textContent = temp === 'verano' ? '☀️ Verano' : '❄️ Resto del año';
    $('seasonPill').title = S.temporada ? 'Temporada elegida manualmente' : 'Temporada automática según el mes';
    const k = CW.calc.kwhTotal(S.aparatos);
    const rec = CW.calc.recibo(k, temp, S.config);
    const ctx = { temp, k, rec, co2: CW.calc.co2(k, S.config) };
    ctx.ordenados = S.aparatos.map(a => ({ ...a, k: CW.calc.kwhAparato(a) })).sort((a, b) => b.k - a.k);
    ctx.max = ctx.ordenados.length ? ctx.ordenados[0].k || 1 : 1;
    ctx.resumen = CW.calc.resumenRecibos(S.recibos, S.config);
    ({ inicio: rInicio, aparatos: rAparatos, recibo: rRecibo, ahorro: rAhorro, huella: rHuella, ajustes: rAjustes })[vistaActual](ctx);
  }

  // ---------- Vista 1: Inicio ----------
  function rInicio(c) {
    $('i-cost').textContent = money(c.rec.total);
    $('i-bim').textContent = `Bimestre aprox: ${money(c.rec.total * 2)} · ${c.temp === 'verano' ? 'temporada de verano' : 'resto del año'}`;
    $('i-kwh').textContent = fmt(c.k) + ' kWh';
    $('i-co2').textContent = fmt(c.co2) + ' kg';
    const n = CW.calc.nivelDAC(c.k, S.config);
    const col = { ok: 'var(--green)', warn: 'var(--amber)', bad: 'var(--red)' }[n.clase];
    $('i-pct').textContent = fmt(n.pct) + '%';
    $('i-bar').style.width = Math.min(100, n.pct) + '%'; $('i-bar').style.background = col;
    $('i-tag').className = 'tag ' + n.clase; $('i-tag').textContent = n.txt;
    $('i-dacmsg').textContent = `Llevas ${fmt(c.k)} de ${fmt(S.config.limiteDAC)} kWh al mes. Si tu promedio del año pasa el límite, CFE te cambia a tarifa DAC (sin subsidio).`;

    // Promedio real (si hay recibos)
    const r = c.resumen;
    $('i-real').innerHTML = r ? `<div class="alert ${r.nivel.clase === 'ok' ? 'info' : r.nivel.clase}"><span>📄</span><div>
        <b>Promedio real del último año: ${fmt(r.promMensual)} kWh/mes</b>
        Según tus recibos registrados (${r.mesesConsiderados} meses). ${r.nivel.clase === 'bad' ? 'Estás muy cerca del límite DAC.' : r.nivel.clase === 'warn' ? 'Vigílalo en verano.' : 'Vas bien respecto al límite DAC.'}
        <button class="link" data-go="recibo" data-rtab="reales">Ver recibos</button></div></div>` : '';

    const kc = CW.calc.kwhTotal(S.aparatos.filter(CW.calc.esClima));
    $('i-alert').innerHTML = !S.aparatos.length
      ? `<div class="alert info"><span>👋</span><div><b>Empieza registrando tus aparatos</b><button class="link" data-go="aparatos">Ir a Mis aparatos</button></div></div>`
      : kc > 0 ? `<div class="alert ${kc / c.k > 0.5 ? 'warn' : 'ok'}"><span>${kc / c.k > 0.5 ? '⚠️' : '✅'}</span><div>
        <b>${fmt(kc / c.k * 100)}% de tu consumo es aire acondicionado</b>
        Ve a <button class="link" data-go="ahorro">Ahorro</button> para ver cuánto bajaría tu recibo si lo ajustas.</div></div>` : '';
    $('i-top').innerHTML = c.ordenados.length
      ? c.ordenados.slice(0, 4).map(a => hbar(tipo(a).ic + ' ' + a.n, fmt(a.k) + ' kWh', a.k / c.max * 100, tipo(a).color)).join('')
      : '<div class="empty">Sin aparatos registrados.</div>';
  }

  // ---------- Vista 2: Aparatos ----------
  function rAparatos(c) {
    $('a-count').textContent = S.aparatos.length + (S.aparatos.length === 1 ? ' registrado' : ' registrados');
    $('a-list').innerHTML = S.aparatos.length ? S.aparatos.map(a => `
      <div class="dev" data-edit="${a.id}">
        <div class="ico" style="background:${tipo(a).color}22">${tipo(a).ic}</div>
        <div class="info"><div class="name">${esc(a.n)}</div><div class="muted">${fmt(a.w)} W · ${fmt(a.h, 1)} h/día · ${a.d} días</div></div>
        <div class="kwh">${fmt(CW.calc.kwhAparato(a))}<div class="muted">kWh/mes</div></div>
        <button class="del" title="Quitar" data-del="${a.id}">✕</button>
      </div>`).join('') : '<div class="empty">Aún no agregas aparatos. Usa el formulario de abajo 👇</div>';
    previewForm(c);
  }
  function llenarPresets() {
    $('a-preset').innerHTML = CW.PRESETS.map((p, i) => `<option value="${i}">${CW.TIPOS[p.t].ic} ${esc(p.n)}</option>`).join('');
  }
  function aplicarPreset() {
    const p = CW.PRESETS[$('a-preset').value];
    $('a-name').value = p.n; $('a-w').value = p.w; $('a-h').value = p.h;
    previewForm();
  }
  function previewForm(c) {
    const w = +$('a-w').value, h = +$('a-h').value, d = +$('a-d').value;
    if (!(w > 0 && h >= 0 && d > 0)) { $('a-preview').textContent = ''; return; }
    const k = (w / 1000) * h * d;
    const prom = c ? c.rec.precioPromedio : CW.calc.recibo(CW.calc.kwhTotal(S.aparatos), temporada(), S.config).precioPromedio;
    $('a-preview').textContent = `≈ ${fmt(k)} kWh al mes · ${money(k * (prom || 1))} · ${fmt(k * S.config.factorCO2)} kg CO₂`;
  }
  function resetForm() {
    $('a-id').value = ''; $('a-form-title').textContent = 'Agregar aparato';
    $('a-submit').textContent = '+ Agregar'; $('a-cancel').style.display = 'none';
    $('a-d').value = 30; $('a-preset').value = 0; aplicarPreset();
  }
  function editar(id) {
    const a = S.aparatos.find(x => x.id === id); if (!a) return;
    const idx = CW.PRESETS.findIndex(p => p.t === a.t);
    $('a-preset').value = idx < 0 ? CW.PRESETS.length - 1 : idx;
    $('a-id').value = a.id; $('a-name').value = a.n; $('a-w').value = a.w; $('a-h').value = a.h; $('a-d').value = a.d;
    $('a-form-title').textContent = 'Editar aparato'; $('a-submit').textContent = 'Guardar cambios';
    $('a-cancel').style.display = 'block';
    previewForm();
    $('a-form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function guardarAparato(e) {
    e.preventDefault();
    const p = CW.PRESETS[$('a-preset').value];
    const datos = { t: p.t, n: $('a-name').value.trim() || p.n, w: +$('a-w').value, h: +$('a-h').value, d: +$('a-d').value };
    const id = $('a-id').value;
    if (id) {
      const a = S.aparatos.find(x => x.id === id); Object.assign(a, datos);
      toast('Aparato actualizado');
    } else {
      S.aparatos.push({ ...datos, id: CW.store.nuevoId() });
      toast('Aparato agregado');
    }
    persistir(); resetForm(); render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function borrarAparato(id) {
    const a = S.aparatos.find(x => x.id === id); if (!a) return;
    if (!await confirmar('¿Quitar aparato?', `Se eliminará "${a.n}" de tu lista.`, 'Quitar')) return;
    S.aparatos = S.aparatos.filter(x => x.id !== id);
    if ($('a-id').value === id) resetForm();
    persistir(); render(); toast('Aparato eliminado');
  }

  // ---------- Vista 3: Recibo ----------
  function rRecibo(c) {
    document.querySelectorAll('#r-tabs button').forEach(b => b.classList.toggle('on', b.dataset.rtab === reciboTab));
    $('r-estimado').style.display = reciboTab === 'estimado' ? 'block' : 'none';
    $('r-reales').style.display = reciboTab === 'reales' ? 'block' : 'none';
    if (reciboTab === 'estimado') rEstimado(c); else rReales(c);
  }
  function rEstimado(c) {
    $('s-ver').classList.toggle('on', c.temp === 'verano');
    $('s-inv').classList.toggle('on', c.temp === 'invierno');
    $('r-total').textContent = money(c.rec.total);
    $('r-sub').textContent = 'Mensual con IVA · Bimestre aprox: ' + money(c.rec.total * 2);
    $('r-table').innerHTML = `<tr><th>Escalón</th><th class="r">kWh</th><th class="r">$/kWh</th><th class="r">Importe</th></tr>` +
      c.rec.filas.map(r => `<tr class="${r.q ? '' : 'zero'}"><td>${r.n}</td><td class="r">${fmt(r.q)}</td><td class="r">${r.p.toFixed(3)}</td><td class="r">${money(r.imp)}</td></tr>`).join('') +
      `<tr><td>IVA ${fmt(S.config.iva * 100)}%</td><td></td><td></td><td class="r">${money(c.rec.iva)}</td></tr>
       <tr class="total"><td>Total</td><td class="r">${fmt(c.k)}</td><td></td><td class="r">${money(c.rec.total)}</td></tr>`;
    $('r-dev').innerHTML = c.ordenados.length
      ? c.ordenados.map(a => hbar(tipo(a).ic + ' ' + a.n, money(a.k * c.rec.precioPromedio), a.k / c.max * 100, tipo(a).color)).join('')
      : '<div class="empty">Sin aparatos registrados.</div>';
  }
  function rReales(c) {
    const r = c.resumen;
    if (!r) {
      $('rr-resumen').innerHTML = `<div class="alert info"><span>📄</span><div><b>Registra tus recibos de CFE</b>Con 6 recibos (un año) la app calcula tu promedio real y te dice si estás en riesgo de pasar a DAC.</div></div>`;
      $('rr-chart').innerHTML = '<div class="empty">Aún no hay recibos.</div>';
      $('rr-list').innerHTML = '<div class="empty">Sin registros.</div>';
      return;
    }
    const col = { ok: 'var(--green)', warn: 'var(--amber)', bad: 'var(--red)' }[r.nivel.clase];
    const ultimo = r.ordenados[r.ordenados.length - 1];
    const realMes = ultimo.kwh / 2;
    const dif = c.k - realMes;
    $('rr-resumen').innerHTML = `
      <div class="card">
        <div class="row"><div class="muted">Promedio mensual del último año</div><span class="tag ${r.nivel.clase}">${r.nivel.txt}</span></div>
        <div class="big" style="margin:6px 0">${fmt(r.promMensual)} kWh</div>
        <div class="bar"><span style="width:${Math.min(100, r.nivel.pct)}%;background:${col}"></span></div>
        <div class="muted">${fmt(r.nivel.pct)}% del límite DAC (${fmt(S.config.limiteDAC)} kWh/mes)${r.completo ? '' : ` · solo ${r.mesesConsiderados} meses registrados`}</div>
      </div>
      <div class="grid2">
        <div class="stat"><div class="l">💵 Pagado en el año</div><div class="v">${money(r.gastoAnual)}</div></div>
        <div class="stat"><div class="l">🌎 CO₂ en el año</div><div class="v">${fmt(r.co2Anual / 1000, 2)} t</div></div>
      </div>
      <div class="alert info"><span>🔍</span><div><b>Estimado vs. real</b>
        Tu último recibo (${periodoTxt(ultimo.periodo)}) fue de ${fmt(realMes)} kWh al mes y la app estima ${fmt(c.k)} kWh con tus aparatos.
        ${Math.abs(dif) / Math.max(realMes, 1) < 0.15 ? 'Muy parecido 👍' : dif > 0 ? 'Revisa si las horas de uso que pusiste son muy altas.' : 'Puede que te falte registrar algún aparato.'}</div></div>`;
    $('rr-chart').innerHTML = grafica(r.ordenados.slice(-8));
    $('rr-list').innerHTML = [...r.ordenados].reverse().map(x => `
      <div class="dev" style="cursor:default">
        <div class="ico" style="background:var(--green-l)">📄</div>
        <div class="info"><div class="name">${periodoTxt(x.periodo)}</div><div class="muted">${x.monto ? money(x.monto) + ' pagado · ' : ''}${fmt(x.kwh / 2)} kWh/mes</div></div>
        <div class="kwh">${fmt(x.kwh)}<div class="muted">kWh</div></div>
        <button class="del" title="Quitar" data-delrec="${x.id}">✕</button>
      </div>`).join('');
  }
  function grafica(lista) {
    const W = 360, H = 190, pad = { l: 38, r: 8, t: 12, b: 30 };
    const limB = S.config.limiteDAC * 2;
    const maxV = Math.max(...lista.map(x => x.kwh));
    const escala = Math.max(maxV * 1.15, 100);
    const showLim = limB <= escala * 1.0;
    const top = showLim ? escala : escala;
    const bw = (W - pad.l - pad.r) / lista.length;
    const y = v => pad.t + (H - pad.t - pad.b) * (1 - v / top);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Consumo por bimestre">`;
    for (let i = 0; i <= 4; i++) {
      const v = top * i / 4, yy = y(v);
      s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${yy}" y2="${yy}" stroke="#e8efec"/>`;
      s += `<text x="${pad.l - 5}" y="${yy + 3}" font-size="9" fill="#8a9a94" text-anchor="end">${fmt(v)}</text>`;
    }
    lista.forEach((x, i) => {
      const m = +x.periodo.split('-')[1];
      const ver = CW.calc.esVerano(m, S.config) || CW.calc.esVerano(m - 1 || 12, S.config);
      const bx = pad.l + i * bw + bw * 0.18, w = bw * 0.64, by = y(x.kwh);
      s += `<rect x="${bx}" y="${by}" width="${w}" height="${H - pad.b - by}" rx="4" fill="${ver ? '#f2a516' : '#2b7fd1'}"/>`;
      s += `<text x="${bx + w / 2}" y="${by - 3}" font-size="8.5" fill="#15302a" text-anchor="middle" font-weight="700">${fmt(x.kwh)}</text>`;
      const [yy, mm] = x.periodo.split('-');
      s += `<text x="${bx + w / 2}" y="${H - pad.b + 12}" font-size="9" fill="#5f736d" text-anchor="middle">${CW.MESES[mm - 1]}</text>`;
      s += `<text x="${bx + w / 2}" y="${H - pad.b + 23}" font-size="8" fill="#9aa8a3" text-anchor="middle">${yy.slice(2)}</text>`;
    });
    if (showLim) {
      const yy = y(limB);
      s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${yy}" y2="${yy}" stroke="#d94b3d" stroke-dasharray="4 3" stroke-width="1.5"/>`;
    }
    s += '</svg>';
    s += `<div class="legend"><span><i style="background:#f2a516"></i>Bimestre de verano</span><span><i style="background:#2b7fd1"></i>Resto del año</span>${showLim ? '<span><i style="background:#d94b3d"></i>Límite DAC por bimestre</span>' : `<span>Límite DAC: ${fmt(limB)} kWh por bimestre</span>`}</div>`;
    return s;
  }
  function llenarSelectRecibo() {
    $('rr-mes').innerHTML = CW.MESES.map((m, i) => `<option value="${i + 1}">${m.charAt(0).toUpperCase() + m.slice(1)}</option>`).join('');
    const y = new Date().getFullYear();
    $('rr-anio').innerHTML = [y, y - 1, y - 2].map(a => `<option>${a}</option>`).join('');
    $('rr-mes').value = mesActual();
  }
  function guardarRecibo(e) {
    e.preventDefault();
    const periodo = `${$('rr-anio').value}-${String($('rr-mes').value).padStart(2, '0')}`;
    const datos = { periodo, kwh: +$('rr-kwh').value, monto: +$('rr-monto').value || 0 };
    const ex = S.recibos.find(r => r.periodo === periodo);
    if (ex) { Object.assign(ex, datos); toast('Recibo actualizado'); }
    else { S.recibos.push({ ...datos, id: CW.store.nuevoId() }); toast('Recibo guardado'); }
    $('rr-kwh').value = ''; $('rr-monto').value = '';
    persistir(); render();
  }
  async function borrarRecibo(id) {
    if (!await confirmar('¿Quitar recibo?', 'Se eliminará este recibo del historial.', 'Quitar')) return;
    S.recibos = S.recibos.filter(r => r.id !== id); persistir(); render();
  }

  // ---------- Vista 4: Ahorro ----------
  function rAhorro(c) {
    $('h-temp').value = S.sim.temp; $('h-hours').value = S.sim.horas;
    $('h-inv').checked = S.sim.inverter; $('h-vamp').checked = S.sim.espera;
    $('h-tval').textContent = S.sim.temp + ' °C';
    $('h-hval').textContent = S.sim.horas + ' h';
    const a = ahorro(c);
    $('h-money').textContent = money(a.dm);
    $('h-kwh').textContent = `${fmt(a.dk)} kWh menos · ${fmt(a.dk * S.config.factorCO2)} kg CO₂ menos`;
    const hechos = CW.CONSEJOS.filter(x => S.plan[x.id]).length;
    $('p-txt').textContent = `${hechos} de ${CW.CONSEJOS.length} acciones completadas`;
    $('p-bar').style.width = (hechos / CW.CONSEJOS.length * 100) + '%';
    $('p-list').innerHTML = CW.CONSEJOS.map(x => `<label class="check ${S.plan[x.id] ? 'done' : ''}"><input type="checkbox" data-plan="${x.id}" ${S.plan[x.id] ? 'checked' : ''}><span>${esc(x.txt)}</span></label>`).join('');
  }
  function ahorro(c) {
    const nuevo = CW.calc.escenarioAhorro(S.aparatos, S.sim);
    const k2 = CW.calc.kwhTotal(nuevo);
    const r2 = CW.calc.recibo(k2, c.temp, S.config);
    return { dk: Math.max(0, c.k - k2), dm: Math.max(0, c.rec.total - r2.total) };
  }
  function leerSim() {
    S.sim = { temp: +$('h-temp').value, horas: +$('h-hours').value, inverter: $('h-inv').checked, espera: $('h-vamp').checked };
    persistir(); render();
  }

  // ---------- Vista 5: Huella ----------
  function rHuella(c) {
    $('c-kg').textContent = fmt(c.co2);
    const ring = Math.min(1, c.co2 / 1000);
    $('c-ring').setAttribute('stroke-dashoffset', 314 * (1 - ring));
    $('c-ring').setAttribute('stroke', c.co2 < 400 ? '#1f9d6b' : c.co2 < 700 ? '#f2a516' : '#d94b3d');
    $('c-trees').textContent = fmt(c.co2 * 12 / CW.SIM.kgCO2Arbol);
    $('c-km').textContent = fmt(c.co2 / CW.SIM.kgCO2Km);
    $('c-season').textContent = fmt(c.co2 * 6 / 1000, 1) + ' t';
    $('c-dev').innerHTML = c.ordenados.length
      ? c.ordenados.map(a => hbar(tipo(a).ic + ' ' + a.n, fmt(a.k * S.config.factorCO2) + ' kg', a.k / c.max * 100, tipo(a).color)).join('')
      : '<div class="empty">Sin aparatos registrados.</div>';
    const r = c.resumen;
    $('c-real').innerHTML = r ? `<div class="alert info"><span>📄</span><div><b>Según tus recibos reales</b>En el último año tu consumo generó ${fmt(r.co2Anual)} kg de CO₂ (${fmt(r.co2Anual / CW.SIM.kgCO2Arbol)} árboles para absorberlo).</div></div>` : '';
    const a = ahorro(c);
    const kg = a.dk * S.config.factorCO2;
    $('c-saved').textContent = fmt(kg) + ' kg';
    $('c-saved6').textContent = fmt(kg * 6) + ' kg';
    $('c-savedtrees').textContent = fmt(kg * 6 / CW.SIM.kgCO2Arbol) + ' árboles';
    $('c-foot').textContent = `Factor de emisión usado: ${S.config.factorCO2} kg CO₂e por kWh (Sistema Eléctrico Nacional, SEMARNAT). Equivalencias aproximadas.`;
  }

  // ---------- Ajustes ----------
  function rAjustes() {
    $('s-hogar').value = S.hogar || '';
    $('s-co2').value = S.config.factorCO2;
    $('s-dac').value = S.config.limiteDAC;
    $('s-version').textContent = CW.VERSION;
    const bloque = (temp, titulo) => `<div style="margin-top:6px"><b style="font-size:13px">${titulo}</b>
      <table>${S.config.tarifas[temp].map((e, i) => `<tr><td>${e.n} <span class="muted">${e.hasta == null ? '(resto)' : '(hasta ' + fmt(e.hasta) + ' kWh)'}</span></td>
      <td class="r" style="width:96px"><input type="number" step="0.001" min="0" value="${e.p}" data-tarifa="${temp}:${i}"></td></tr>`).join('')}</table></div>`;
    $('s-tarifas').innerHTML = bloque('verano', '☀️ Verano (mayo–octubre)') + bloque('invierno', '❄️ Resto del año');
  }

  async function accion(a) {
    switch (a) {
      case 'toggle-season':
        S.temporada = temporada() === 'verano' ? 'invierno' : 'verano'; persistir(); render();
        toast(S.temporada === 'verano' ? 'Mostrando tarifa de verano' : 'Mostrando tarifa del resto del año');
        break;
      case 'reset-tarifas':
        S.config = JSON.parse(JSON.stringify(CW.CONFIG_DEFAULT)); persistir(); render(); toast('Valores de referencia restaurados');
        break;
      case 'exportar': {
        const json = CW.store.exportar(S);
        try {
          const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
          const el = document.createElement('a'); el.href = url; el.download = `climawatt-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) { /* descarga no permitida */ }
        try { await navigator.clipboard.writeText(json); toast('Respaldo descargado y copiado al portapapeles'); }
        catch (e) { toast('Respaldo descargado'); }
        break;
      }
      case 'importar': $('s-file').click(); break;
      case 'ejemplo':
        if (await confirmar('¿Cargar la casa de ejemplo?', 'Se reemplazarán tus aparatos y recibos por los del ejemplo.', 'Cargar')) {
          S = CW.store.estadoEjemplo(); persistir(); ir('inicio'); toast('Casa de ejemplo cargada');
        }
        break;
      case 'borrar':
        if (await confirmar('¿Borrar todos tus datos?', 'Se eliminarán aparatos, recibos y ajustes de este dispositivo. No se puede deshacer.', 'Borrar todo')) {
          S = CW.store.estadoVacio(); persistir(); ir('inicio'); toast('Datos borrados');
        }
        break;
    }
  }

  // ---------- Eventos ----------
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-go],[data-action],[data-rtab],[data-season],[data-del],[data-delrec],[data-edit]');
    if (!t) return;
    if (t.dataset.del) { e.stopPropagation(); return borrarAparato(t.dataset.del); }
    if (t.dataset.delrec) return borrarRecibo(t.dataset.delrec);
    if (t.dataset.edit) return editar(t.dataset.edit);
    if (t.dataset.rtab) reciboTab = t.dataset.rtab;
    if (t.dataset.season) { S.temporada = t.dataset.season; persistir(); }
    if (t.dataset.go) return ir(t.dataset.go);
    if (t.dataset.action) return accion(t.dataset.action);
    render();
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.plan) { S.plan[t.dataset.plan] = t.checked; persistir(); render(); }
    if (t.dataset.tarifa) {
      const [temp, i] = t.dataset.tarifa.split(':'); const v = parseFloat(t.value);
      if (v >= 0) { S.config.tarifas[temp][+i].p = v; persistir(); toast('Tarifa actualizada'); }
    }
  });
  $('a-form').addEventListener('submit', guardarAparato);
  $('a-preset').addEventListener('change', aplicarPreset);
  ['a-w', 'a-h', 'a-d'].forEach(id => $(id).addEventListener('input', () => previewForm()));
  $('a-cancel').addEventListener('click', resetForm);
  $('rr-form').addEventListener('submit', guardarRecibo);
  ['h-temp', 'h-hours'].forEach(id => $(id).addEventListener('input', leerSim));
  ['h-inv', 'h-vamp'].forEach(id => $(id).addEventListener('change', leerSim));
  $('s-hogar').addEventListener('change', e => { S.hogar = e.target.value.trim(); persistir(); });
  $('s-co2').addEventListener('change', e => { const v = parseFloat(e.target.value); if (v >= 0) { S.config.factorCO2 = v; persistir(); toast('Factor actualizado'); } });
  $('s-dac').addEventListener('change', e => { const v = parseInt(e.target.value, 10); if (v > 0) { S.config.limiteDAC = v; persistir(); toast('Límite actualizado'); } });
  $('s-file').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try { S = CW.store.importar(rd.result); persistir(); ir('inicio'); toast('Respaldo importado'); }
      catch (err) { toast('No se pudo leer el archivo: ' + err.message); }
      e.target.value = '';
    };
    rd.readAsText(f);
  });
  $('modal').addEventListener('click', e => { if (e.target.id === 'modal') $('m-no').click(); });
  window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v && v !== vistaActual) ir(v); });

  // ---------- Inicio ----------
  llenarPresets(); llenarSelectRecibo(); resetForm();
  ir(location.hash.slice(1) || 'inicio', { scroll: false });

  // Service worker: permite instalar la app y usarla sin internet
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }

  // Exponer para pruebas desde la consola
  window.ClimaWatt = { estado: () => S, ir };
})();
