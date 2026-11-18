# ClimaWatt ⚡

Aplicación web para medir, entender y reducir el consumo eléctrico del aire acondicionado en los hogares de Hermosillo. Proyecto final de Sustentabilidad.

> Versión de prueba (no para producción). Los datos se guardan solo en el navegador de cada usuario.

## Funciones

| Vista | Qué hace |
|---|---|
| **Inicio** | Recibo estimado, consumo en kWh, CO₂ del mes, barra del límite DAC, promedio real de tus recibos y los aparatos que más gastan |
| **Aparatos** | Agregar, editar y eliminar aparatos con tipos precargados (minisplit, inverter, refri, etc.) y vista previa del consumo |
| **Recibo** | Recibo estimado con los escalones de la Tarifa 1F (verano y resto del año) + historial de recibos reales de CFE con gráfica y promedio anual contra el límite DAC |
| **Ahorro** | Simulador (temperatura, horas, inverter, modo espera) y plan de ahorro con casillas para marcar avances |
| **Huella** | kg de CO₂ del mes, equivalencias (árboles, km en auto), CO₂ por aparato y CO₂ evitado con los cambios |
| **Ajustes ⚙️** | Editar precios de la tarifa, factor de CO₂ y límite DAC; exportar/importar respaldo; cargar ejemplo o borrar todo |

Además es **PWA**: se puede *instalar* en el celular como si fuera app y funciona sin internet.

## Estructura

```
climawatt/
├── index.html              ← estructura de las vistas
├── manifest.webmanifest    ← datos para instalar la app (nombre, icono, colores)
├── sw.js                   ← service worker (funciona sin internet)
├── css/styles.css          ← estilos
├── img/                    ← iconos
└── js/
    ├── datos.js            ← tarifas, catálogo de aparatos y datos de ejemplo
    ├── calculos.js         ← fórmulas (kWh, recibo, CO₂, ahorro)
    ├── almacenamiento.js   ← guardar/cargar en localStorage, respaldos
    └── app.js              ← interfaz y eventos
```

No usa frameworks ni necesita compilar nada: es HTML, CSS y JavaScript puro.

## Fórmulas principales

- **Consumo:** `kWh/mes = (watts ÷ 1000) × horas al día × días al mes`
- **Recibo:** el consumo se reparte en los escalones de la Tarifa 1F y se le suma 16% de IVA
- **CO₂:** `kg CO₂ = kWh × 0.444` (factor del Sistema Eléctrico Nacional 2024, SEMARNAT)
- **Simulador:** ~6% menos por cada °C arriba de 22 °C; inverter ~35% menos que convencional (estimaciones)

---

## Cómo probarla en tu computadora

**Opción rápida:** doble clic en `index.html`. Funciona todo, menos la instalación como app.

**Con servidor local** (para probar también la instalación como app):

```bash
# dentro de la carpeta del proyecto
python -m http.server 8000
# abrir http://localhost:8000
```

O con la extensión **Live Server** de VS Code: clic derecho en `index.html` → *Open with Live Server*.

---

## Cómo publicarla gratis

Como es un sitio estático (solo archivos), se puede publicar gratis en varios lugares. Recomendamos **GitHub Pages** porque el link no caduca.

### Opción 1: GitHub Pages (recomendada, link permanente)

1. Entra a [github.com](https://github.com) e inicia sesión.
2. Clic en **New repository** → nombre: `climawatt` → **Public** → *Create repository*.
3. En el repositorio vacío, clic en **uploading an existing file**.
4. Arrastra **el contenido** de la carpeta (`index.html`, `css/`, `js/`, `img/`, `sw.js`, `manifest.webmanifest`, `README.md`). Importante: `index.html` debe quedar en la raíz, no dentro de otra carpeta.
5. Clic en **Commit changes**.
6. Ve a **Settings → Pages**.
7. En *Build and deployment* → *Source*: **Deploy from a branch** → Branch: **main** y carpeta **/ (root)** → **Save**.
8. Espera 1–2 minutos y recarga. Aparece el link:
   `https://TU-USUARIO.github.io/climawatt/`

Para actualizar: sube los archivos modificados al repositorio y en un par de minutos se actualiza solo.

**Con Git desde la terminal** (alternativa al paso 3–5):

```bash
cd climawatt
git init
git add .
git commit -m "ClimaWatt v1.0"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/climawatt.git
git push -u origin main
```

### Opción 2: Netlify Drop (la más rápida, arrastrar y soltar)

1. Entra a [app.netlify.com/drop](https://app.netlify.com/drop).
2. Arrastra la carpeta `climawatt` completa.
3. En segundos te da un link tipo `https://nombre-raro.netlify.app`.

Sin cuenta el sitio se borra en aproximadamente una hora. Para que se quede, crea una cuenta gratis y dale **Claim** al sitio. Para actualizarlo, arrastra la carpeta otra vez en la pestaña *Deploys* del sitio.

### Opción 3: Vercel o Cloudflare

- **Vercel Drop:** [vercel.com/drop](https://vercel.com/drop), arrastras la carpeta o el `.zip`.
- **Cloudflare Pages:** en el panel de Cloudflare → *Workers & Pages* → *Create* → *Pages* → *Upload assets* y subes la carpeta.

Igual que Netlify, si se sube sin cuenta hay que "reclamar" el sitio para que no caduque.

---

## Instalar en el celular

Ya publicada (con `https://`):

- **Android (Chrome):** abre el link → menú ⋮ → **Agregar a pantalla principal** / **Instalar app**.
- **iPhone (Safari):** abre el link → botón compartir → **Agregar a inicio**.

## Respaldo de datos

Los datos se guardan en el navegador de cada dispositivo. Para pasarlos a otro: **Ajustes → Exportar respaldo** (descarga un `.json`) y en el otro dispositivo **Ajustes → Importar**.

## Fuentes

- CFE: límite de alto consumo para Tarifa 1F (2,500 kWh/mes) y escalones de la tarifa.
- SEMARNAT: Factor de Emisión del Sistema Eléctrico Nacional 2024 (0.444 kg CO₂e/kWh).
- Los porcentajes de ahorro del simulador y las equivalencias (árboles, km) son estimaciones generales.
