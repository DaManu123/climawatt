/* =========================================================
   ClimaWatt - calculos.js
   Funciones puras de cálculo: consumo, recibo, CO2, ahorro.
   No tocan el HTML, así se pueden probar por separado.
   ========================================================= */
window.CW = window.CW || {};

CW.calc = {
  esClima(a) {
    return !!(CW.TIPOS[a.t] && CW.TIPOS[a.t].clima);
  },

  esEstacional(a) {
    return !!(CW.TIPOS[a.t] && CW.TIPOS[a.t].estacional);
  },

  // Horas al día según la temporada. Los equipos de clima tienen
  // horas distintas en verano (h) y el resto del año (hi).
  horasDia(a, temporada) {
    if (temporada === 'invierno' && CW.calc.esEstacional(a) && a.hi != null) return a.hi;
    return a.h;
  },

  // kWh al mes de un aparato
  kwhAparato(a, temporada) {
    return (a.w / 1000) * CW.calc.horasDia(a, temporada) * a.d;
  },

  kwhTotal(lista, temporada) {
    return lista.reduce((s, a) => s + CW.calc.kwhAparato(a, temporada), 0);
  },

  // ¿El mes (1-12) es temporada de verano?
  esVerano(mes, config) {
    return config.mesesVerano.includes(mes);
  },

  // Promedio mensual estimado de todo el año (lo que CFE compara contra el límite DAC)
  promedioAnual(lista, config) {
    const nV = config.mesesVerano.length;
    return (CW.calc.kwhTotal(lista, 'verano') * nV + CW.calc.kwhTotal(lista, 'invierno') * (12 - nV)) / 12;
  },

  // Calcula el recibo mensual repartiendo el consumo en escalones
  recibo(kwh, temporada, config) {
    const escalones = config.tarifas[temporada];
    let previo = 0, subtotal = 0;
    const filas = escalones.map(e => {
      const tope = e.hasta == null ? Infinity : e.hasta;
      const q = Math.max(0, Math.min(kwh, tope) - previo);
      previo = Math.max(previo, tope);
      const imp = q * e.p;
      subtotal += imp;
      return { n: e.n, q, p: e.p, imp };
    });
    const iva = subtotal * config.iva;
    return { filas, subtotal, iva, total: subtotal + iva, precioPromedio: kwh > 0 ? (subtotal + iva) / kwh : 0 };
  },

  co2(kwh, config) {
    return kwh * config.factorCO2;
  },

  // Nivel respecto al límite DAC
  nivelDAC(kwhMes, config) {
    const pct = kwhMes / config.limiteDAC * 100;
    if (pct < 60) return { pct, clase: 'ok', txt: 'Consumo normal' };
    if (pct < 85) return { pct, clase: 'warn', txt: 'Consumo alto' };
    return { pct, clase: 'bad', txt: 'Riesgo DAC' };
  },

  // Aplica los cambios del simulador a una copia de los aparatos.
  // Temperaturas debajo de 22 °C aumentan el consumo (el resultado puede ser negativo).
  escenarioAhorro(aparatos, sim) {
    const f = Math.max(0.5, 1 - CW.SIM.ahorroPorGrado * (sim.temp - CW.SIM.tempBase));
    return aparatos.map(a => {
      const n = { ...a };
      if (CW.calc.esClima(a)) {
        n.h = Math.max(0, a.h - sim.horas);
        if (a.hi != null) n.hi = Math.max(0, a.hi - sim.horas);
        n.w = a.w * f;
        if (sim.inverter && a.t === 'clima') n.w = n.w * (1 - CW.SIM.ahorroInverter);
      } else if (sim.espera && CW.TIPOS[a.t] && CW.TIPOS[a.t].espera) {
        n.w = a.w * (1 - CW.SIM.ahorroEspera);
      }
      return n;
    });
  },

  // "2026-08" -> número de mes consecutivo (para comparar periodos)
  mesIndice(periodo) {
    const [y, m] = periodo.split('-').map(Number);
    return y * 12 + (m - 1);
  },

  // Resumen de recibos reales: promedio mensual de los 12 meses anteriores
  // al último recibo registrado (hasta 6 bimestres).
  resumenRecibos(recibos, config) {
    if (!recibos.length) return null;
    const ord = [...recibos].sort((a, b) => a.periodo.localeCompare(b.periodo));
    const fin = CW.calc.mesIndice(ord[ord.length - 1].periodo);
    const ult = ord.filter(r => CW.calc.mesIndice(r.periodo) > fin - 12).slice(-6);
    const kwhTot = ult.reduce((s, r) => s + r.kwh, 0);
    const meses = ult.length * 2;
    const promMensual = kwhTot / meses;
    const gastoTot = ult.reduce((s, r) => s + (r.monto || 0), 0);
    return {
      ordenados: ord,
      ultimos: ult,
      promMensual,
      mesesConsiderados: meses,
      gastoAnual: gastoTot,
      co2Anual: kwhTot * config.factorCO2,
      nivel: CW.calc.nivelDAC(promMensual, config),
      completo: ult.length >= 6
    };
  }
};
