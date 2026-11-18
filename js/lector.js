/* =========================================================
   ClimaWatt - lector.js
   Lee un recibo de CFE (PDF o imagen) directamente en el
   dispositivo del usuario y extrae periodo, kWh y total.
   - PDF digital: se lee el texto con pdf.js.
   - Imagen o PDF escaneado: reconocimiento de texto (OCR)
     con Tesseract.js.
   Las librerías se descargan solo cuando se usan. El recibo
   nunca se sube a ningún servidor.
   ========================================================= */
window.CW = window.CW || {};

CW.lector = (function () {
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const TESSERACT = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

  // ---------- Carga de librerías bajo demanda ----------
  const cargando = {};
  function cargarScript(url) {
    if (!cargando[url]) {
      cargando[url] = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = url; s.async = true; s.crossOrigin = 'anonymous';
        s.onload = res;
        s.onerror = () => { delete cargando[url]; s.remove(); rej(new Error('No se pudo descargar el lector de recibos. Revisa tu conexión a internet.')); };
        document.head.appendChild(s);
      });
    }
    return cargando[url];
  }

  async function pdfjs() {
    await cargarScript(PDFJS);
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return window.pdfjsLib;
  }

  async function abrirPDF(archivo) {
    const lib = await pdfjs();
    const datos = new Uint8Array(await archivo.arrayBuffer());
    try {
      return await lib.getDocument({ data: datos }).promise;
    } catch (err) {
      throw new Error(err && err.name === 'PasswordException' ? 'el PDF tiene contraseña' : 'el archivo no es un PDF válido');
    }
  }

  // Texto de las primeras páginas del PDF, respetando los saltos de línea
  async function textoDePDF(archivo) {
    const doc = await abrirPDF(archivo);
    let texto = '';
    for (let i = 1; i <= Math.min(doc.numPages, 3); i++) {
      const pag = await doc.getPage(i);
      const cont = await pag.getTextContent();
      cont.items.forEach(it => { texto += it.str + (it.hasEOL ? '\n' : ' '); });
      texto += '\n';
    }
    return texto;
  }

  // Primera página del PDF como imagen (para PDFs escaneados)
  async function pdfAImagen(archivo) {
    const doc = await abrirPDF(archivo);
    const pag = await doc.getPage(1);
    const vp = pag.getViewport({ scale: 2.5 });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width; canvas.height = vp.height;
    await pag.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    return canvas;
  }

  // Reduce fotos muy grandes para que el OCR no tarde demasiado
  async function prepararImagen(fuente) {
    if (fuente instanceof HTMLCanvasElement) return fuente;
    const url = URL.createObjectURL(fuente);
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(new Error('no se pudo abrir la imagen'));
        i.src = url;
      });
      const MAX = 2400;
      const f = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * f);
      canvas.height = Math.round(img.naturalHeight * f);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function ocr(fuente, alAvanzar) {
    await cargarScript(TESSERACT);
    const imagen = await prepararImagen(fuente);
    const r = await window.Tesseract.recognize(imagen, 'spa', {
      logger: m => { if (alAvanzar && m.status === 'recognizing text') alAvanzar(m.progress); }
    });
    return r.data.text || '';
  }

  // ---------- Análisis del texto ----------
  const MESES = { ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, SEP: 9, SET: 9, OCT: 10, NOV: 11, DIC: 12 };
  const MES = '(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEPT?|SET|OCT|NOV|DIC)[A-Z]*\\.?';
  const SEP = '\\s*(?:-|–|—|AL|A)\\s*';
  const RE_PERIODO_TXT = new RegExp(`(\\d{1,2})\\s*(?:DE\\s*)?${MES}\\s*(?:DE\\s*)?(\\d{2,4})${SEP}(\\d{1,2})\\s*(?:DE\\s*)?${MES}\\s*(?:DE\\s*)?(\\d{2,4})`);
  const RE_PERIODO_NUM = new RegExp(`(\\d{1,2})[/.-](\\d{1,2})[/.-](\\d{2,4})${SEP}(\\d{1,2})[/.-](\\d{1,2})[/.-](\\d{2,4})`);

  // Mayúsculas, sin acentos y con espacios normalizados
  function normalizar(t) {
    return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
      .replace(/[ \t ]+/g, ' ').replace(/ ?\n ?/g, '\n');
  }
  const entero = s => parseInt(String(s).replace(/[,.\s]/g, ''), 10);
  function dinero(s) {
    s = String(s).replace(/\s/g, '');
    if (/[.,]\d{2}$/.test(s)) return parseFloat(s.slice(0, -3).replace(/[.,]/g, '') + '.' + s.slice(-2));
    return parseFloat(s.replace(/[.,]/g, ''));
  }
  const anioCompleto = y => (String(y).length === 2 ? 2000 + +y : +y);
  const anioValido = y => y >= 2010 && y <= new Date().getFullYear() + 1;

  function buscarPeriodo(t) {
    // Se busca primero después de "PERIODO FACTURADO" para no confundirlo con el historial
    const i = t.search(/PERIODO\s*FACTURADO|PERIODO\s*DE\s*CONSUMO|PERIODO/);
    const zonas = i >= 0 ? [t.slice(i, i + 200), t] : [t];
    for (const z of zonas) {
      let m = z.match(RE_PERIODO_TXT);
      if (m) {
        const mes = MESES[m[5].slice(0, 3)], anio = anioCompleto(m[6]);
        if (mes && anioValido(anio)) return { mes, anio };
      }
      m = z.match(RE_PERIODO_NUM);
      if (m) {
        const mes = +m[5], anio = anioCompleto(m[6]);
        if (mes >= 1 && mes <= 12 && anioValido(anio)) return { mes, anio };
      }
    }
    return null;
  }

  function buscarKwh(t) {
    const ok = n => isFinite(n) && n >= 1 && n <= 100000;
    // 1) Renglón de lecturas: "ENERGIA (KWH) 45,210 43,310 1,900"
    let m = t.match(/ENERGIA\s*\(?\s*KWH\s*\)?[\s:]*([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)/);
    if (m) {
      const [a, b, c] = [entero(m[1]), entero(m[2]), entero(m[3])];
      if (ok(c) && (Math.abs(a - b) === c)) return c;
    }
    // 2) "TOTAL PERIODO 1,900" o "CONSUMO ... 1,900 KWH"
    m = t.match(/TOTAL\s*(?:DEL\s*)?PERIODO[\s:]*([\d,.]+)/);
    if (m && ok(entero(m[1]))) return entero(m[1]);
    m = t.match(/CONSUMO(?:\s*TOTAL)?(?:\s*DEL\s*PERIODO)?[\s:(]*(?:KWH\)?[\s:]*)?([\d,.]+)\s*KWH/);
    if (m && ok(entero(m[1]))) return entero(m[1]);
    // 3) Lecturas actual y anterior por separado
    const la = t.match(/LECTURA\s*ACTUAL[\s:]*([\d,.]+)/), lb = t.match(/LECTURA\s*ANTERIOR[\s:]*([\d,.]+)/);
    if (la && lb) {
      const d = entero(la[1]) - entero(lb[1]);
      if (ok(d)) return d;
    }
    // 4) Suma de los bloques de consumo (básico, intermedios y excedente)
    let suma = 0, n = 0;
    const re = /\b(BASICO|INTERMEDIO(?:\s*BAJO|\s*ALTO)?|EXCEDENTE)\s+([\d,.]+)\s+\d+[.,]\d{2,3}\b/g;
    while ((m = re.exec(t))) { suma += entero(m[2]); n++; }
    if (n && ok(suma)) return suma;
    // 5) Un solo número seguido de "KWH"
    const todos = [...t.matchAll(/([\d,.]{2,7})\s*KWH\b/g)].map(x => entero(x[1])).filter(ok);
    if (todos.length === 1) return todos[0];
    return null;
  }

  function buscarMonto(t) {
    const ok = n => isFinite(n) && n >= 0 && n <= 1e6;
    let m = t.match(/TOTAL\s*A\s*PAGAR[\s:]*[$S]?\s*([\d][\d,.\s]*\d)/);
    if (m && ok(dinero(m[1]))) return dinero(m[1]);
    m = t.match(/\bTOTAL\b[\s:]*[$S]\s*([\d][\d,.]*[.,]\d{2})/);
    if (m && ok(dinero(m[1]))) return dinero(m[1]);
    return null;
  }

  function buscarTarifa(t) {
    const m = t.match(/TARIFA[\s:]*(1[A-F]?|DAC|PDBT|GDBT)\b/);
    return m ? m[1] : null;
  }

  function analizar(texto) {
    const t = normalizar(texto);
    const periodo = buscarPeriodo(t);
    return {
      anio: periodo ? periodo.anio : null,
      mes: periodo ? periodo.mes : null,
      kwh: buscarKwh(t),
      monto: buscarMonto(t),
      tarifa: buscarTarifa(t),
      esCFE: /CFE|COMISION\s*FEDERAL|SUMINISTRADOR\s*DE\s*SERVICIOS\s*BASICOS/.test(t)
    };
  }

  return { textoDePDF, pdfAImagen, ocr, analizar };
})();
