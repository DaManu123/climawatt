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
  let avisoGuardado = false;
  function persistir() {
    if (!CW.store.guardar(S) && !avisoGuardado) {
      avisoGuardado = true;
      toast('Este navegador no permite guardar: tus cambios se perderán al cerrar');
    }
  }

  // ---------- Utilidades ----------
  const $ = id => document.getElementById(id);
  const ic = CW.icono;
  const fmt = (n, dec = 0) => (isFinite(n) ? Number(n) : 0).toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const money = n => '$' + fmt(n, 0);
  const horasTxt = n => (isFinite(n) ? Number(n) : 0).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + ' h';
  const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const tipo = a => CW.TIPOS[a.t] || CW.TIPOS.otro;
  const mesActual = () => new Date().getMonth() + 1;
  const temporada = () => S.temporada || (CW.calc.esVerano(mesActual(), S.config) ? 'verano' : 'invierno');
  const nombreTemp = t => (t === 'verano' ? 'verano' : 'resto del año');
  const COLOR_NIVEL = { ok: 'var(--green)', warn: 'var(--amber)', bad: 'var(--red)' };

  function hbar(a, val, pct) {
    const t = tipo(a);
    return `<div class="hbar"><div class="row"><span class="hb-l"><span class="hb-ic" style="color:${t.color}">${ic(t.ic)}</span>${esc(a.n)}</span><b>${val}</b></div>
      <div class="bar"><span style="width:${Math.max(1, Math.min(100, pct))}%;background:${t.color}"></span></div></div>`;
  }
  function icoAparato(a) {
    const t = tipo(a);
    return `<div class="ico" style="background:${t.color}1a;color:${t.color}">${ic(t.ic)}</div>`;
  }
  function alerta(clase, icono, html) {
    return `<div class="alert ${clase}">${ic(icono)}<div>${html}</div></div>`;
  }
  function periodoTxt(p) {
    const [y, m] = p.split('-').map(Number);
    const ini = (m - 2 + 12) % 12;
    return `${CW.MESES[ini]}–${CW.MESES[m - 1]} ${y}`;
  }

  let toastTimer;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  function confirmar(titulo, texto, txtSi = 'Aceptar', peligro = false) {
    return new Promise(res => {
      const previo = document.activeElement;
      $('m-title').textContent = titulo; $('m-text').textContent = texto; $('m-yes').textContent = txtSi;
      $('m-yes').className = 'btn' + (peligro ? ' danger-solid' : '');
      $('modal').classList.add('show');
      const fin = v => {
        $('modal').classList.remove('show');
        $('m-yes').onclick = $('m-no').onclick = null;
        document.removeEventListener('keydown', tecla);
        if (previo && previo.focus) previo.focus();
        res(v);
      };
      const tecla = e => { if (e.key === 'Escape') fin(false); };
      document.addEventListener('keydown', tecla);
      $('m-yes').onclick = () => fin(true);
      $('m-no').onclick = () => fin(false);
      $('m-no').focus();
    });
  }

  // ---------- Navegación ----------
  const TITULOS = {
    inicio:   () => [`Hola, ${S.hogar || 'familia'}`, 'Así va tu consumo de luz este mes'],
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
    $('seasonPill').innerHTML = ic(temp === 'verano' ? 'sol' : 'copo') + (temp === 'verano' ? 'Verano' : 'Resto del año');
    $('seasonPill').title = S.temporada
      ? 'Temporada elegida manualmente (toca para cambiar; en Recibo puedes volver a automática)'
      : 'Temporada automática según el mes (toca para cambiar)';
    const k = CW.calc.kwhTotal(S.aparatos, temp);
    const rec = CW.calc.recibo(k, temp, S.config);
    const ctx = { temp, k, rec, co2: CW.calc.co2(k, S.config) };
    ctx.ordenados = S.aparatos.map(a => ({ ...a, k: CW.calc.kwhAparato(a, temp) })).sort((a, b) => b.k - a.k);
    ctx.max = ctx.ordenados.length ? ctx.ordenados[0].k || 1 : 1;
    ctx.resumen = CW.calc.resumenRecibos(S.recibos, S.config);
    ctx.anual = CW.calc.promedioAnual(S.aparatos, S.config);
    ({ inicio: rInicio, aparatos: rAparatos, recibo: rRecibo, ahorro: rAhorro, huella: rHuella, ajustes: rAjustes })[vistaActual](ctx);
  }

  // ---------- Vista 1: Inicio ----------
  function rInicio(c) {
    $('i-cost').textContent = money(c.rec.total);
    $('i-bim').textContent = `Bimestre aprox: ${money(c.rec.total * 2)} · tarifa de ${nombreTemp(c.temp)}`;
    $('i-kwh').textContent = fmt(c.k) + ' kWh';
    $('i-co2').textContent = fmt(c.co2) + ' kg';

    // El límite DAC se compara contra el promedio de 12 meses, no contra un solo mes
    const n = CW.calc.nivelDAC(c.anual, S.config);
    $('i-pct').textContent = fmt(n.pct) + '%';
    $('i-bar').style.width = Math.min(100, n.pct) + '%'; $('i-bar').style.background = COLOR_NIVEL[n.clase];
    $('i-tag').className = 'tag ' + n.clase; $('i-tag').textContent = n.txt;
    $('i-dacmsg').textContent = `Tu promedio anual estimado es de ${fmt(c.anual)} de ${fmt(S.config.limiteDAC)} kWh al mes. Si el promedio de 12 meses pasa el límite, CFE te cambia a tarifa DAC (sin subsidio).`;

    const r = c.resumen;
    $('i-real').innerHTML = r ? alerta(r.nivel.clase === 'ok' ? 'info' : r.nivel.clase, 'documento',
      `<b>Promedio real del último año: ${fmt(r.promMensual)} kWh/mes</b>
       Según tus recibos registrados (${r.mesesConsiderados} meses). ${r.nivel.clase === 'bad' ? 'Estás muy cerca del límite DAC.' : r.nivel.clase === 'warn' ? 'Vigílalo en verano.' : 'Vas bien respecto al límite DAC.'}
       <button class="link" data-go="recibo" data-rtab="reales">Ver recibos</button>`) : '';

    const kc = CW.calc.kwhTotal(S.aparatos.filter(CW.calc.esEstacional), c.temp);
    const pc = c.k > 0 ? kc / c.k : 0;
    $('i-alert').innerHTML = !S.aparatos.length
      ? alerta('info', 'info', '<b>Empieza registrando tus aparatos</b><button class="link" data-go="aparatos">Ir a Mis aparatos</button>')
      : kc > 0 ? alerta(pc > 0.5 ? 'warn' : 'ok', pc > 0.5 ? 'alerta' : 'ok',
        `<b>${fmt(pc * 100)}% de tu consumo es para enfriar la casa</b>
         Ve a <button class="link" data-go="ahorro">Ahorro</button> para ver cuánto bajaría tu recibo si lo ajustas.`) : '';
    $('i-top').innerHTML = c.ordenados.length
      ? c.ordenados.slice(0, 4).map(a => hbar(a, fmt(a.k) + ' kWh', a.k / c.max * 100)).join('')
      : '<div class="empty">Sin aparatos registrados.</div>';
  }

  // ---------- Vista 2: Aparatos ----------
  function rAparatos(c) {
    $('a-count').textContent = S.aparatos.length + (S.aparatos.length === 1 ? ' registrado' : ' registrados');
    $('a-list').innerHTML = S.aparatos.length ? S.aparatos.map(a => {
      const horas = CW.calc.esEstacional(a)
        ? `${horasTxt(a.h)} verano / ${horasTxt(a.hi)} resto`
        : `${horasTxt(a.h)}/día`;
      return `
      <div class="dev" data-edit="${esc(a.id)}" tabindex="0" role="button" aria-label="Editar ${esc(a.n)}">
        ${icoAparato(a)}
        <div class="info"><div class="name">${esc(a.n)}</div><div class="muted">${fmt(a.w)} W · ${horas} · ${fmt(a.d)} días</div></div>
        <div class="kwh">${fmt(CW.calc.kwhAparato(a, c.temp))}<div class="muted">kWh/mes</div></div>
        <button class="del" title="Quitar" aria-label="Quitar ${esc(a.n)}" data-del="${esc(a.id)}">${ic('basura')}</button>
      </div>`;
    }).join('') : '<div class="empty">Aún no agregas aparatos. Usa el formulario de abajo.</div>';
    previewForm();
  }
  function llenarPresets() {
    $('a-preset').innerHTML = CW.PRESETS.map((p, i) => `<option value="${i}">${esc(p.n)}</option>`).join('');
  }
  function presetActual() {
    return CW.PRESETS[$('a-preset').value] || CW.PRESETS[CW.PRESETS.length - 1];
  }
  function mostrarCampoInvierno() {
    const est = !!CW.TIPOS[presetActual().t].estacional;
    $('a-hi-box').style.display = est ? 'block' : 'none';
    $('a-h-label').textContent = est ? 'Horas al día en verano' : 'Horas de uso al día';
  }
  function aplicarPreset() {
    const p = presetActual();
    $('a-name').value = p.n; $('a-w').value = p.w; $('a-h').value = p.h; $('a-hi').value = p.hi || 0;
    mostrarCampoInvierno();
    previewForm();
  }
  function aparatoDelForm() {
    const p = presetActual();
    const crudo = { id: $('a-id').value || undefined, t: p.t, n: $('a-name').value, w: $('a-w').value, h: $('a-h').value, hi: $('a-hi').value, d: $('a-d').value };
    return CW.store.normalizar({ aparatos: [crudo] }).aparatos[0] || null;
  }
  function previewForm() {
    const w = +$('a-w').value, h = +$('a-h').value, d = +$('a-d').value;
    if (!(w > 0 && h >= 0 && d > 0)) { $('a-preview').textContent = ''; return; }
    const a = aparatoDelForm(); if (!a) { $('a-preview').textContent = ''; return; }
    const temp = temporada();
    const k = CW.calc.kwhAparato(a, temp);
    // Costo real que agrega al recibo (según el escalón en el que cae)
    const otros = S.aparatos.filter(x => x.id !== $('a-id').value);
    const kOtros = CW.calc.kwhTotal(otros, temp);
    const costo = CW.calc.recibo(kOtros + k, temp, S.config).total - CW.calc.recibo(kOtros, temp, S.config).total;
    $('a-preview').textContent = `≈ ${fmt(k)} kWh al mes en ${nombreTemp(temp)} · +${money(costo)} en tu recibo · ${fmt(k * S.config.factorCO2)} kg CO₂`;
  }
  function resetForm() {
    $('a-id').value = ''; $('a-form-title').textContent = 'Agregar aparato';
    $('a-submit').innerHTML = ic('mas') + 'Agregar'; $('a-cancel').style.display = 'none';
    $('a-d').value = 30; $('a-preset').value = 0; aplicarPreset();
  }
  function editar(id) {
    const a = S.aparatos.find(x => x.id === id); if (!a) return;
    const idx = CW.PRESETS.findIndex(p => p.t === a.t);
    $('a-preset').value = idx < 0 ? CW.PRESETS.length - 1 : idx;
    $('a-id').value = a.id; $('a-name').value = a.n; $('a-w').value = a.w; $('a-h').value = a.h;
    $('a-hi').value = a.hi != null ? a.hi : 0; $('a-d').value = a.d;
    mostrarCampoInvierno();
    $('a-form-title').textContent = 'Editar aparato'; $('a-submit').textContent = 'Guardar cambios';
    $('a-cancel').style.display = 'block';
    previewForm();
    $('a-form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function guardarAparato(e) {
    e.preventDefault();
    const datos = aparatoDelForm();
    if (!datos || !(datos.w > 0)) { toast('Revisa la potencia del aparato'); return; }
    const id = $('a-id').value;
    const ex = id && S.aparatos.find(x => x.id === id);
    if (ex) {
      Object.keys(ex).forEach(k => delete ex[k]);
      Object.assign(ex, datos, { id });
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
    if (!await confirmar('¿Quitar aparato?', `Se eliminará "${a.n}" de tu lista.`, 'Quitar', true)) return;
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
    $('s-auto').classList.toggle('on', !S.temporada);
    $('s-ver').classList.toggle('on', S.temporada === 'verano');
    $('s-inv').classList.toggle('on', S.temporada === 'invierno');
    $('r-head').textContent = S.temporada
      ? `Proyección de tu recibo · tarifa de ${nombreTemp(c.temp)} (elegida)`
      : `Proyección de tu recibo · tarifa de ${nombreTemp(c.temp)} (según el mes)`;
    $('r-total').textContent = money(c.rec.total);
    $('r-sub').textContent = 'Mensual con IVA · Bimestre aprox: ' + money(c.rec.total * 2);
    $('r-table').innerHTML = `<tr><th>Escalón</th><th class="r">kWh</th><th class="r">$/kWh</th><th class="r">Importe</th></tr>` +
      c.rec.filas.map(r => `<tr class="${r.q ? '' : 'zero'}"><td>${esc(r.n)}</td><td class="r">${fmt(r.q)}</td><td class="r">${fmt(r.p, 3)}</td><td class="r">${money(r.imp)}</td></tr>`).join('') +
      `<tr><td>IVA ${fmt(S.config.iva * 100)}%</td><td></td><td></td><td class="r">${money(c.rec.iva)}</td></tr>
       <tr class="total"><td>Total</td><td class="r">${fmt(c.k)}</td><td></td><td class="r">${money(c.rec.total)}</td></tr>`;
    $('r-dev').innerHTML = c.ordenados.length
      ? c.ordenados.map(a => hbar(a, money(a.k * c.rec.precioPromedio), a.k / c.max * 100)).join('')
      : '<div class="empty">Sin aparatos registrados.</div>';
  }
  function rReales(c) {
    const r = c.resumen;
    if (!r) {
      $('rr-resumen').innerHTML = alerta('info', 'documento', '<b>Registra tus recibos de CFE</b>Con 6 recibos (un año) la app calcula tu promedio real y te dice si estás en riesgo de pasar a DAC.');
      $('rr-chart').innerHTML = '<div class="empty">Aún no hay recibos.</div>';
      $('rr-list').innerHTML = '<div class="empty">Sin registros.</div>';
      return;
    }
    const ultimo = r.ordenados[r.ordenados.length - 1];
    const realMes = ultimo.kwh / 2;
    // Se compara contra la estimación de la misma temporada que el recibo
    const mUlt = +ultimo.periodo.split('-')[1];
    const tUlt = CW.calc.esVerano(mUlt, S.config) ? 'verano' : 'invierno';
    const est = CW.calc.kwhTotal(S.aparatos, tUlt);
    const dif = est - realMes;
    const veredicto = !S.aparatos.length ? 'Registra tus aparatos para comparar.'
      : Math.abs(dif) / Math.max(realMes, 1) < 0.15 ? 'Muy parecido: tu registro de aparatos es bastante fiel.'
      : dif > 0 ? 'Revisa si las horas de uso que pusiste son muy altas.' : 'Puede que te falte registrar algún aparato.';
    $('rr-resumen').innerHTML = `
      <div class="card">
        <div class="row"><div class="muted">Promedio mensual del último año</div><span class="tag ${r.nivel.clase}">${r.nivel.txt}</span></div>
        <div class="big" style="margin:6px 0">${fmt(r.promMensual)} kWh</div>
        <div class="bar"><span style="width:${Math.min(100, r.nivel.pct)}%;background:${COLOR_NIVEL[r.nivel.clase]}"></span></div>
        <div class="muted">${fmt(r.nivel.pct)}% del límite DAC (${fmt(S.config.limiteDAC)} kWh/mes)${r.completo ? '' : ` · solo ${r.mesesConsiderados} meses registrados en el último año`}</div>
      </div>
      <div class="grid2">
        <div class="stat"><div class="l">${ic('billete')}Pagado en el periodo</div><div class="v">${money(r.gastoAnual)}</div></div>
        <div class="stat"><div class="l">${ic('nube')}CO₂ en el periodo</div><div class="v">${fmt(r.co2Anual / 1000, 2)} t</div></div>
      </div>
      ${alerta('info', 'lupa', `<b>Estimado vs. real</b>
        Tu último recibo (${periodoTxt(ultimo.periodo)}) fue de ${fmt(realMes)} kWh al mes y la app estima ${fmt(est)} kWh en ${nombreTemp(tUlt)} con tus aparatos. ${veredicto}`)}`;
    $('rr-chart').innerHTML = grafica(r.ordenados.slice(-8));
    $('rr-list').innerHTML = [...r.ordenados].reverse().map(x => `
      <div class="dev" style="cursor:default">
        <div class="ico" style="background:var(--green-l);color:var(--green-d)">${ic('documento')}</div>
        <div class="info"><div class="name">${periodoTxt(x.periodo)}</div><div class="muted">${x.monto ? money(x.monto) + ' pagado · ' : ''}${fmt(x.kwh / 2)} kWh/mes</div></div>
        <div class="kwh">${fmt(x.kwh)}<div class="muted">kWh</div></div>
        <button class="del" title="Quitar" aria-label="Quitar recibo de ${periodoTxt(x.periodo)}" data-delrec="${esc(x.id)}">${ic('basura')}</button>
      </div>`).join('');
  }
  function grafica(lista) {
    const W = 360, H = 190, pad = { l: 40, r: 8, t: 14, b: 30 };
    const limB = S.config.limiteDAC * 2;
    const maxV = Math.max(...lista.map(x => x.kwh));
    // Escala con números redondos (1, 2, 2.5 o 5 × 10^n por división)
    const crudo = Math.max(maxV * 1.1, 100) / 4;
    const pot = Math.pow(10, Math.floor(Math.log10(crudo)));
    const paso = [1, 2, 2.5, 5, 10].map(x => x * pot).find(x => x >= crudo);
    const top = paso * 4;
    const showLim = limB <= top;
    const bw = (W - pad.l - pad.r) / lista.length;
    const y = v => pad.t + (H - pad.t - pad.b) * (1 - v / top);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Consumo por bimestre">`;
    for (let i = 0; i <= 4; i++) {
      const v = top * i / 4, yy = y(v);
      s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${yy}" y2="${yy}" stroke="#e8efec"/>`;
      s += `<text x="${pad.l - 5}" y="${yy + 3}" font-size="9" fill="#8a9a94" text-anchor="end">${fmt(v)}</text>`;
    }
    lista.forEach((x, i) => {
      const [yy, mm] = x.periodo.split('-').map(Number);
      const ver = CW.calc.esVerano(mm, S.config) || CW.calc.esVerano(mm - 1 || 12, S.config);
      const bx = pad.l + i * bw + bw * 0.18, w = bw * 0.64, by = y(x.kwh);
      s += `<rect x="${bx}" y="${by}" width="${w}" height="${H - pad.b - by}" rx="4" fill="${ver ? '#f2a516' : '#2b7fd1'}"/>`;
      s += `<text x="${bx + w / 2}" y="${by - 3}" font-size="8.5" fill="#15302a" text-anchor="middle" font-weight="700">${fmt(x.kwh)}</text>`;
      s += `<text x="${bx + w / 2}" y="${H - pad.b + 12}" font-size="9" fill="#5f736d" text-anchor="middle">${CW.MESES[mm - 1]}</text>`;
      s += `<text x="${bx + w / 2}" y="${H - pad.b + 23}" font-size="8" fill="#9aa8a3" text-anchor="middle">${String(yy).slice(2)}</text>`;
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
    const r = CW.store.normalizar({ aparatos: [], recibos: [{ periodo, kwh: $('rr-kwh').value, monto: $('rr-monto').value }] }).recibos[0];
    if (!r) { toast('Revisa los kWh del recibo'); return; }
    const ex = S.recibos.find(x => x.periodo === periodo);
    if (ex) { ex.kwh = r.kwh; ex.monto = r.monto; toast('Recibo actualizado'); }
    else { S.recibos.push(r); toast('Recibo guardado'); }
    $('rr-kwh').value = ''; $('rr-monto').value = '';
    persistir(); render();
  }
  async function borrarRecibo(id) {
    if (!await confirmar('¿Quitar recibo?', 'Se eliminará este recibo del historial.', 'Quitar', true)) return;
    S.recibos = S.recibos.filter(r => r.id !== id); persistir(); render(); toast('Recibo eliminado');
  }

  // ---------- Vista 4: Ahorro ----------
  // Diferencia entre la situación actual y el escenario del simulador (positivo = ahorro)
  function ahorro(c) {
    const nuevo = CW.calc.escenarioAhorro(S.aparatos, S.sim);
    const k2 = CW.calc.kwhTotal(nuevo, c.temp);
    const r2 = CW.calc.recibo(k2, c.temp, S.config);
    return { dk: c.k - k2, dm: c.rec.total - r2.total, nuevo };
  }
  function rAhorro(c) {
    $('h-temp').value = S.sim.temp; $('h-hours').value = S.sim.horas;
    $('h-inv').checked = S.sim.inverter; $('h-vamp').checked = S.sim.espera;
    $('h-tval').textContent = S.sim.temp + ' °C';
    $('h-hval').textContent = horasTxt(S.sim.horas);
    const a = ahorro(c);
    const mas = a.dm < -0.5;
    $('h-box').classList.toggle('mas', mas);
    $('h-label').textContent = mas ? 'Con estos cambios gastarías de más al mes' : 'Con estos cambios ahorrarías al mes';
    $('h-money').textContent = money(Math.abs(a.dm) < 0.5 ? 0 : Math.abs(a.dm));
    $('h-kwh').textContent = a.dk < 0
      ? `${fmt(-a.dk)} kWh más · ${fmt(-a.dk * S.config.factorCO2)} kg CO₂ más`
      : `${fmt(a.dk)} kWh menos · ${fmt(a.dk * S.config.factorCO2)} kg CO₂ menos`;
    const hayClima = S.aparatos.some(CW.calc.esClima);
    $('h-foot').textContent = (hayClima ? '' : 'No tienes minisplits registrados, así que el simulador del clima no cambia nada. ') +
      `Calculado con la tarifa de ${nombreTemp(c.temp)}.`;
    const hechos = CW.CONSEJOS.filter(x => S.plan[x.id]).length;
    $('p-txt').textContent = `${hechos} de ${CW.CONSEJOS.length} acciones completadas`;
    $('p-bar').style.width = (hechos / CW.CONSEJOS.length * 100) + '%';
    $('p-list').innerHTML = CW.CONSEJOS.map(x => `<label class="check ${S.plan[x.id] ? 'done' : ''}"><input type="checkbox" data-plan="${esc(x.id)}" ${S.plan[x.id] ? 'checked' : ''}><span>${esc(x.txt)}</span></label>`).join('');
  }
  function leerSim() {
    S.sim = { temp: +$('h-temp').value, horas: +$('h-hours').value, inverter: $('h-inv').checked, espera: $('h-vamp').checked };
    persistir(); render();
  }

  // ---------- Vista 5: Huella ----------
  function rHuella(c) {
    const f = S.config.factorCO2;
    const nV = S.config.mesesVerano.length;
    $('c-head').textContent = `Tu huella de carbono por la luz este mes (${nombreTemp(c.temp)})`;
    $('c-kg').textContent = fmt(c.co2);
    const ring = Math.min(1, c.co2 / 1000);
    $('c-ring').setAttribute('stroke-dashoffset', 314 * (1 - ring));
    $('c-ring').setAttribute('stroke', c.co2 < 400 ? '#1f9d6b' : c.co2 < 700 ? '#f2a516' : '#d94b3d');
    const kgAnual = c.anual * 12 * f;
    $('c-trees').textContent = fmt(kgAnual / CW.SIM.kgCO2Arbol);
    $('c-km').textContent = fmt(c.co2 / CW.SIM.kgCO2Km);
    $('c-year').textContent = fmt(kgAnual / 1000, 1) + ' t';
    $('c-dev').innerHTML = c.ordenados.length
      ? c.ordenados.map(a => hbar(a, fmt(a.k * f) + ' kg', a.k / c.max * 100)).join('')
      : '<div class="empty">Sin aparatos registrados.</div>';
    const r = c.resumen;
    $('c-real').innerHTML = r ? alerta('info', 'documento', `<b>Según tus recibos reales</b>En los últimos ${r.mesesConsiderados} meses tu consumo generó ${fmt(r.co2Anual)} kg de CO₂ (lo que absorben ${fmt(r.co2Anual / CW.SIM.kgCO2Arbol)} árboles en un año).`) : '';

    // CO2 evitado con el simulador, por temporada
    const nuevo = CW.calc.escenarioAhorro(S.aparatos, S.sim);
    const dV = CW.calc.kwhTotal(S.aparatos, 'verano') - CW.calc.kwhTotal(nuevo, 'verano');
    const dI = CW.calc.kwhTotal(S.aparatos, 'invierno') - CW.calc.kwhTotal(nuevo, 'invierno');
    const kgMes = (c.temp === 'verano' ? dV : dI) * f;
    const kgVerano = dV * nV * f;
    const kgAnio = (dV * nV + dI * (12 - nV)) * f;
    const mas = kgAnio < 0;
    const kg = v => (v < 0 ? '+' : '') + fmt(Math.abs(v)) + ' kg';
    $('c-saved-l').textContent = mas ? 'Emitirías de más al mes' : 'Dejarías de emitir al mes';
    $('c-saved').textContent = kg(kgMes);
    $('c-saved6-l').textContent = `En la temporada de calor (${nV} meses)`;
    $('c-saved6').textContent = kg(kgVerano);
    $('c-savedtrees').textContent = fmt(Math.abs(kgAnio) / CW.SIM.kgCO2Arbol) + ' árboles';
    $('c-foot').textContent = `Factor de emisión usado: ${f} kg CO₂e por kWh (Sistema Eléctrico Nacional, SEMARNAT). Equivalencias aproximadas.`;
  }

  // ---------- Ajustes ----------
  function rAjustes() {
    if (document.activeElement !== $('s-hogar')) $('s-hogar').value = S.hogar || '';
    $('s-co2').value = S.config.factorCO2;
    $('s-dac').value = S.config.limiteDAC;
    $('s-version').textContent = CW.VERSION;
    const bloque = (temp, titulo, icono) => `<div class="tarifa-bloque"><b class="tarifa-tit">${ic(icono)}${titulo}</b>
      <table><tr><th>Escalón</th><th class="r">Hasta (kWh)</th><th class="r">$/kWh</th></tr>
      ${S.config.tarifas[temp].map((e, i) => `<tr><td>${esc(e.n)}</td>
        <td class="r" style="width:88px">${e.hasta == null ? '<span class="muted">resto</span>' : `<input type="number" step="1" min="1" value="${e.hasta}" data-tarifa="${temp}:${i}:hasta" aria-label="Límite de ${esc(e.n)}">`}</td>
        <td class="r" style="width:88px"><input type="number" step="0.001" min="0" value="${e.p}" data-tarifa="${temp}:${i}:p" aria-label="Precio de ${esc(e.n)}"></td></tr>`).join('')}</table></div>`;
    $('s-tarifas').innerHTML = bloque('verano', 'Verano', 'sol') + bloque('invierno', 'Resto del año', 'copo');
  }
  function cambiarTarifa(t) {
    const [temp, i, campo] = t.dataset.tarifa.split(':');
    const lista = S.config.tarifas[temp];
    const idx = +i;
    const v = parseFloat(t.value);
    if (!lista || !lista[idx] || !isFinite(v)) { rAjustes(); return; }
    if (campo === 'p') {
      if (v < 0) { toast('El precio no puede ser negativo'); rAjustes(); return; }
      lista[idx].p = v;
    } else {
      const min = idx > 0 ? lista[idx - 1].hasta : 0;
      const max = lista[idx + 1] && lista[idx + 1].hasta != null ? lista[idx + 1].hasta : Infinity;
      if (!(v > min && v < max)) { toast(`El límite debe estar entre ${fmt(min)} y ${max === Infinity ? 'el siguiente' : fmt(max)} kWh`); rAjustes(); return; }
      lista[idx].hasta = Math.round(v);
    }
    persistir(); toast('Tarifa actualizada');
  }

  async function accion(a) {
    switch (a) {
      case 'toggle-season':
        S.temporada = temporada() === 'verano' ? 'invierno' : 'verano'; persistir(); render();
        toast(S.temporada === 'verano' ? 'Mostrando tarifa de verano' : 'Mostrando tarifa del resto del año');
        break;
      case 'reset-tarifas':
        if (await confirmar('¿Restaurar valores de referencia?', 'Se restaurarán los precios, escalones, factor de CO₂ y límite DAC originales.', 'Restaurar')) {
          S.config = CW.store.normalizar({}).config; persistir(); render(); toast('Valores de referencia restaurados');
        }
        break;
      case 'exportar': {
        const json = CW.store.exportar(S);
        let descargado = false;
        try {
          const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
          const el = document.createElement('a'); el.href = url; el.download = `climawatt-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
          descargado = true;
        } catch (e) { /* descarga no permitida */ }
        try { await navigator.clipboard.writeText(json); toast(descargado ? 'Respaldo descargado y copiado al portapapeles' : 'Respaldo copiado al portapapeles'); }
        catch (e) { toast(descargado ? 'Respaldo descargado' : 'No se pudo exportar el respaldo'); }
        break;
      }
      case 'importar': $('s-file').click(); break;
      case 'ejemplo':
        if (await confirmar('¿Cargar la casa de ejemplo?', 'Se reemplazarán tus aparatos y recibos por los del ejemplo.', 'Cargar')) {
          S = CW.store.estadoEjemplo(); persistir(); resetForm(); ir('inicio'); toast('Casa de ejemplo cargada');
        }
        break;
      case 'borrar':
        if (await confirmar('¿Borrar todos tus datos?', 'Se eliminarán aparatos, recibos y ajustes de este dispositivo. No se puede deshacer.', 'Borrar todo', true)) {
          S = CW.store.estadoVacio(); persistir(); resetForm(); ir('inicio'); toast('Datos borrados');
        }
        break;
    }
  }

  // ---------- Eventos ----------
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-go],[data-action],[data-rtab],[data-season],[data-del],[data-delrec],[data-edit]');
    if (!t) return;
    if (t.dataset.del) return borrarAparato(t.dataset.del);
    if (t.dataset.delrec) return borrarRecibo(t.dataset.delrec);
    if (t.dataset.edit) return editar(t.dataset.edit);
    if (t.dataset.rtab) reciboTab = t.dataset.rtab;
    if (t.dataset.season) {
      S.temporada = t.dataset.season === 'auto' ? null : t.dataset.season; persistir();
      if (!S.temporada) toast('Temporada automática: ' + nombreTemp(temporada()));
    }
    if (t.dataset.go) return ir(t.dataset.go);
    if (t.dataset.action) return accion(t.dataset.action);
    render();
  });
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.edit) { e.preventDefault(); editar(e.target.dataset.edit); }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.plan) { S.plan[t.dataset.plan] = t.checked; if (!t.checked) delete S.plan[t.dataset.plan]; persistir(); render(); }
    if (t.dataset.tarifa) cambiarTarifa(t);
  });
  $('a-form').addEventListener('submit', guardarAparato);
  $('a-preset').addEventListener('change', aplicarPreset);
  ['a-w', 'a-h', 'a-hi', 'a-d'].forEach(id => $(id).addEventListener('input', previewForm));
  $('a-cancel').addEventListener('click', resetForm);
  $('rr-form').addEventListener('submit', guardarRecibo);
  ['h-temp', 'h-hours'].forEach(id => $(id).addEventListener('input', leerSim));
  ['h-inv', 'h-vamp'].forEach(id => $(id).addEventListener('change', leerSim));
  $('s-hogar').addEventListener('change', e => { S.hogar = e.target.value.trim().slice(0, 30); persistir(); toast('Nombre actualizado'); });
  $('s-co2').addEventListener('change', e => {
    const v = parseFloat(e.target.value);
    if (v >= 0 && v <= 5) { S.config.factorCO2 = v; persistir(); toast('Factor actualizado'); }
    else { toast('El factor debe estar entre 0 y 5'); e.target.value = S.config.factorCO2; }
  });
  $('s-dac').addEventListener('change', e => {
    const v = parseInt(e.target.value, 10);
    if (v > 0) { S.config.limiteDAC = v; persistir(); toast('Límite actualizado'); }
    else { toast('El límite debe ser mayor que 0'); e.target.value = S.config.limiteDAC; }
  });
  $('s-file').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const anterior = S;
      try {
        S = CW.store.importar(rd.result);
        resetForm(); ir('inicio');   // si algo falla al mostrarlo, no se guarda
        persistir(); toast('Respaldo importado');
      } catch (err) {
        S = anterior;
        try { resetForm(); ir('ajustes'); } catch (e2) { /* nada */ }
        toast('No se pudo importar: ' + err.message);
      }
      e.target.value = '';
    };
    rd.onerror = () => { toast('No se pudo leer el archivo'); e.target.value = ''; };
    rd.readAsText(f);
  });
  $('modal').addEventListener('click', e => { if (e.target.id === 'modal') $('m-no').click(); });
  window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v && v !== vistaActual) ir(v); });

  // ---------- Inicio ----------
  CW.pintarIconos();
  llenarPresets(); llenarSelectRecibo();
  try {
    resetForm();
    ir(location.hash.slice(1) || 'inicio', { scroll: false });
  } catch (err) {
    // Último recurso: si los datos guardados impiden mostrar la app, se apartan y se empieza de nuevo
    console.error(err);
    CW.store.apartarDanado(JSON.stringify(S));
    S = CW.store.estadoEjemplo(); persistir();
    resetForm(); ir('inicio', { scroll: false });
    toast('Tus datos guardados tenían un problema y se reiniciaron');
  }

  // Service worker: permite instalar la app y usarla sin internet
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }

  // Exponer para pruebas desde la consola
  window.ClimaWatt = { estado: () => S, ir };
})();
