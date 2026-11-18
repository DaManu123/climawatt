# ClimaWatt

Aplicación web para medir, entender y reducir el consumo eléctrico del aire acondicionado en los hogares de Hermosillo, Sonora.

**Abrir la app:** [https://damanu123.github.io/climawatt/](https://damanu123.github.io/climawatt/)

El usuario registra los aparatos de su casa y la app le muestra cuánto consume, cuánto le va a llegar de recibo con la Tarifa 1F de CFE, qué tan cerca está de pasar a la tarifa DAC (sin subsidio) y cuánto CO₂ genera. Incluye un simulador de ahorro y puede leer el recibo de CFE desde un PDF o una foto.

## Funciones

| Vista | Qué hace |
|---|---|
| **Inicio** | Recibo estimado del mes y del bimestre, consumo en kWh, CO₂ del mes, promedio anual estimado contra el límite DAC, promedio real de los recibos y los aparatos que más gastan |
| **Aparatos** | Agregar, editar y eliminar aparatos con tipos precargados (minisplit, inverter, refrigerador, etc.). Los equipos de clima tienen horas distintas en verano y el resto del año. Vista previa del consumo y de cuánto sube el recibo |
| **Recibo** | Recibo estimado con los escalones de la Tarifa 1F (temporada automática según el mes, o elegida a mano) e historial de recibos reales de CFE con gráfica y promedio de los últimos 12 meses contra el límite DAC. Los recibos se capturan a mano o se leen desde el PDF o una foto |
| **Ahorro** | Simulador (temperatura, horas de uso, cambio a inverter, modo espera) que muestra el ahorro o el gasto extra en pesos, kWh y CO₂, y un plan de ahorro con acciones para marcar |
| **Huella** | kg de CO₂ del mes y estimado del año, equivalencias (árboles, km en auto), CO₂ por aparato y CO₂ evitado con los cambios del simulador |
| **Ajustes** | Editar precios y escalones de la tarifa, factor de CO₂ y límite DAC; exportar e importar respaldo; cargar una casa de ejemplo o borrar los datos |

## Cómo está hecha

- **HTML5, CSS3 y JavaScript**, sin frameworks y sin paso de compilación: los archivos se sirven tal cual.
- **PWA (aplicación web progresiva):** con `manifest.webmanifest` y un *service worker* (`sw.js`) se puede instalar en el celular y funciona sin internet.
- **Sin servidor ni base de datos:** los datos se guardan en el `localStorage` del navegador, así que nunca salen del dispositivo. Se pueden exportar e importar como respaldo en un archivo `.json`.
- **Validación de datos:** todo lo que se carga o se importa se revisa; los datos inválidos se descartan o se corrigen y la app sigue funcionando aunque un respaldo venga dañado.
- **Lectura de recibos:** [pdf.js](https://mozilla.github.io/pdf.js/) para leer el texto de los PDF y [Tesseract.js](https://tesseract.projectnaptha.com/) para reconocer el texto de las fotos (OCR). Se descargan solo cuando se usan y el recibo se procesa en el dispositivo, sin subirse a ningún servidor.
- **Íconos SVG propios**, que heredan el color del texto.
- **Publicación:** sitio estático en GitHub Pages.

## Estructura del proyecto

```
climawatt/
├── index.html              ← estructura de las pantallas
├── manifest.webmanifest    ← datos para instalar la app (nombre, ícono, colores)
├── sw.js                   ← service worker (caché para funcionar sin internet)
├── css/
│   └── styles.css          ← estilos
├── img/                    ← íconos de la app
└── js/
    ├── datos.js            ← tarifas, catálogo de aparatos, datos de ejemplo y consejos
    ├── iconos.js           ← íconos SVG de la interfaz
    ├── calculos.js         ← fórmulas: consumo, recibo, CO₂, ahorro y límite DAC
    ├── almacenamiento.js   ← guardar y cargar datos, respaldos y validación
    ├── lector.js           ← lectura de recibos de CFE en PDF o imagen
    └── app.js              ← pantallas, navegación y eventos
```

Los cálculos (`calculos.js`) no dependen de la interfaz, así que se pueden revisar o probar por separado.

## Fórmulas principales

- **Consumo:** `kWh/mes = (watts ÷ 1000) × horas al día × días al mes` (en equipos de clima se usan las horas de la temporada).
- **Recibo:** el consumo se reparte en los escalones de la Tarifa 1F, a cada parte se le aplica su precio y se suma el 16% de IVA. No incluye cargos fijos ni Derecho de Alumbrado Público (DAP).
- **Límite DAC:** `promedio anual = (kWh en verano × 6 + kWh el resto del año × 6) ÷ 12`, comparado contra 2,500 kWh al mes.
- **CO₂:** `kg CO₂ = kWh × 0.444` (factor de emisión del Sistema Eléctrico Nacional 2024).
- **Simulador:** alrededor de 6% menos consumo por cada °C arriba de 22 °C y alrededor de 35% menos con equipo inverter (estimaciones generales).

## Lectura del recibo de CFE

En **Recibo → Mis recibos reales** se puede subir el recibo para que se llenen el periodo, los kWh y el total pagado:

- **PDF:** se lee el texto del recibo digital de CFE. Es la opción más confiable.
- **Foto o imagen:** se reconoce el texto de la imagen. Depende de la calidad de la foto, así que puede que no se llenen todos los campos; los que faltan se marcan para completarlos a mano. Los PDF escaneados también se leen así.

Los datos leídos solo llenan el formulario; se guardan hasta que el usuario los revisa y confirma.

## Probarla en tu computadora

Como usa un *service worker*, conviene abrirla con un servidor local:

```bash
# dentro de la carpeta del proyecto
python -m http.server 8000
# abrir http://localhost:8000
```

También funciona con la extensión **Live Server** de VS Code. Abriendo `index.html` con doble clic funciona todo menos la instalación como app.

## Instalar en el celular

Abre [https://damanu123.github.io/climawatt/](https://damanu123.github.io/climawatt/) y:

- **Android (Chrome):** menú ⋮ → **Instalar app** o **Agregar a pantalla principal**.
- **iPhone (Safari):** botón compartir → **Agregar a inicio**.

## Fuentes

- CFE: Tarifa 1F, escalones de consumo y límite de alto consumo (DAC) de 2,500 kWh al mes. Los precios son de referencia y se pueden actualizar en Ajustes.
- SEMARNAT: Factor de Emisión del Sistema Eléctrico Nacional 2024 (0.444 kg CO₂e/kWh).
- Los porcentajes del simulador y las equivalencias (árboles, km en auto) son estimaciones generales.
