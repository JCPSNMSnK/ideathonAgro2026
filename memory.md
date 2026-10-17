# Memoria Técnica y Guía de Continuidad — Moñai
> **Fecha de Actualización:** 17 de Octubre de 2026  
> **Ramas Activas:** `identidad-visual` (rama de desarrollo actual) y `main` (sincronizadas con `origin`).  
> **Objetivo de este documento:** Proveer a agentes autónomos y desarrolladores el contexto completo del proyecto, decisiones de arquitectura, lecciones aprendidas y reglas operativas para trabajar de forma ágil sin tener que reexplorar todo el código base.

---

## 1. Mapa Rápido del Repositorio

| Archivo / Ruta | Responsabilidad Principal |
| :--- | :--- |
| [`manage.py`](file:///c:/Users/joelm/Mio/Ideathon/manage.py) | Punto de entrada Django. **Nota de ejecución:** En este entorno usar `py -3.10 manage.py <comando>`. |
| [`mercado/models.py`](file:///c:/Users/joelm/Mio/Ideathon/mercado/models.py) | Modelos Django: `LoteSubproducto`, `CamionRetorno`, `OperacionTrazabilidad`. |
| [`mercado/views.py`](file:///c:/Users/joelm/Mio/Ideathon/mercado/views.py) | Controlador principal. Une los 3 carriles, expone endpoints JSON y la vista `home_demo`. |
| [`mercado/urls.py`](file:///c:/Users/joelm/Mio/Ideathon/mercado/urls.py) | Ruteo de endpoints `/api/cotizar/`, `/api/reservar/`, `/api/liberar-garantia/`, etc. |
| [`mercado/services/recomendador.py`](file:///c:/Users/joelm/Mio/Ideathon/mercado/services/recomendador.py) | **Carril 2:** Recomendador por perfil, datos de mapa federal interactivo, ABM de lotes y camiones. |
| [`mercado/services/calculadora_flete.py`](file:///c:/Users/joelm/Mio/Ideathon/mercado/services/calculadora_flete.py) | **Carril 3 (INMUTABLE):** Motor FADEEAC 2026, cálculo Peso vs. Volumen, distancias y tarifas. **¡NO TOCAR!** |
| [`mercado/services/trazabilidad_blockchain.py`](file:///c:/Users/joelm/Mio/Ideathon/mercado/services/trazabilidad_blockchain.py) | **Carril 4:** Registro y cierre de garantías Escrow con hash Hedera Testnet (HCS Topic). |
| [`mercado/services/seed_data.py`](file:///c:/Users/joelm/Mio/Ideathon/mercado/services/seed_data.py) | Precarga de 15 lotes reales, 8 camiones de retorno y 5 operaciones históricas cerradas. |
| [`mercado/services/georef_service.py`](file:///c:/Users/joelm/Mio/Ideathon/mercado/services/georef_service.py) | Integración con la API Oficial Georef de Datos Argentina (IGN) y ruteo vial OSRM. |
| [`templates/mercado/index.html`](file:///c:/Users/joelm/Mio/Ideathon/templates/mercado/index.html) | Plantilla principal HTML5. Contiene las 4 vistas (Inicio, Comprador, Vendedor, Logística) y modales. |
| [`static/js/app.js`](file:///c:/Users/joelm/Mio/Ideathon/static/js/app.js) | Lógica interactiva cliente: cotizador, paginadores, mapa Leaflet, RBAC y sesión en `localStorage`. |
| [`static/css/styles.css`](file:///c:/Users/joelm/Mio/Ideathon/static/css/styles.css) | Estilos generales, componentes, modales, grids y diseño responsivo. |
| [`static/css/variables.css`](file:///c:/Users/joelm/Mio/Ideathon/static/css/variables.css) | Tokens de color, tipografía y soporte para temas claro/oscuro. |

---

## 2. Personas y Entidades Demo en Base de Datos

Para pruebas y flujos demostrativos, la base de datos precarga tres actores principales con registros exactos:

### 2.1. Comprador
- **Nombre:** `Don Aníbal Gómez`
- **Organización Exacta:** `Granja Avícola San Isidro SRL`
- **Localidad:** `Goya, Corrientes`
- **Operaciones en BD:** Tiene 2 operaciones de cascarilla de arroz asignadas (una activa en custodia `PAGO_EN_GARANTIA_ACTIVO` lista para ser firmada en tranquera, y una cerrada históricamente `DESCARGA_CONFIRMADA_PAGO_LIBERADO`).

### 2.2. Vendedor
- **Nombre:** `Ing. Carlos Romero`
- **Organización Exacta:** `Molino Arrocero San Lorenzo` *(¡Sin sufijo SRL en el modelo `LoteSubproducto`!)*
- **Localidad:** `Saladas, Corrientes`
- **Lotes en BD:** Cascarilla de Arroz Seca a Granel (14 tn) y operaciones de compra vinculadas a sus lotes.

### 2.3. Logística
- **Nombre:** `Horacio Giménez`
- **Organización Exacta:** `Transportes Don Horacio` *(o `"Transportes Don Horacio (Retorno Gran Rosario)"` en el dataset de camiones)*
- **Localidad:** `Corrientes Capital`
- **Unidades en BD:** Batea Cerealera Estanca de 82 m³ / 30 tn con -50% de descuento por retorno Rosario → Saladas/Bella Vista, y viajes en tránsito asignados.

---

## 3. Decisiones de Diseño y Lecciones Aprendidas

### 3.1. Normalización de Identidades y Ownership (`esRecursoPropio`)
**Problema anterior:** Cuando un usuario iniciaba sesión como `Transportes Don Horacio`, no veía sus camiones ni sus viajes porque en la base de datos el camión se llamaba `"Transportes Don Horacio (Retorno Gran Rosario)"`. Asimismo, pequeñas discrepancias como `"Molino Arrocero San Lorenzo SRL"` vs `"Molino Arrocero San Lorenzo"` rompían la comparación de cadenas.

**Solución aplicada:**
En [`static/js/app.js`](file:///c:/Users/joelm/Mio/Ideathon/static/js/app.js) y [`mercado/views.py`](file:///c:/Users/joelm/Mio/Ideathon/mercado/views.py), la función `normalizarIdentidadActor`:
1. Elimina acentos y tildes (NFKD).
2. Pasa todo a minúsculas.
3. **Elimina contenido entre paréntesis** `\([^)]*\)` (ej. `(Retorno Gran Rosario)`, `(Batea 85 m3)`).
4. **Remueve palabras vacías comunes** (`"transporte"`, `"transportes"`, `"molino"`, `"molinos"`, `"granja"`, `"establecimiento"`, `"aserradero"`, `"srl"`, `"sa"`, `"coop"`).
5. `esRecursoPropio(recurso, actor)` compara `p === a || p.includes(a) || a.includes(p)`.
Gracias a esto, `"Transportes Don Horacio"` hace match perfecto con `"Transportes Don Horacio (Retorno Gran Rosario)"` y `"Molino Arrocero San Lorenzo"` con `"Molino Arrocero San Lorenzo SRL"`.

### 3.2. Aislamiento Estricto de Roles (RBAC)
**Problema anterior:** Si un usuario iniciaba sesión como Comprador, el código mostraba las vistas privadas de Vendedor y Logística (`vendedorPrivate.style.display = 'block'`), permitiendo ver pantallas de otros roles pero con los datos vacíos o rotos.

**Solución aplicada:**
- En `aplicarDatosSesionEnUI`:
  - `vendedorPrivate` solo se muestra si `usuarioActivo.rol === 'vendedor'`.
  - `logisticaPrivate` solo se muestra si `usuarioActivo.rol === 'logistica'`.
  - En caso contrario, se muestra la tarjeta de acceso restringido (`vendedorGated` / `logisticaGated`).
- En `cambiarVistaRol(panelId)`:
  - Si un usuario con sesión de Logística hace clic en el tab de Vendedor (o viceversa), la navegación se intercepta con un mensaje de advertencia y se abre el modal para cambiar de cuenta.
  - Los botones de la barra de navegación muestran la clase `.role-tab-btn.nav-role-locked` para roles ajenos.

### 3.3. Privacidad del Comprador No Autenticado
- Los inputs del cotizador (`calc-comprador`, `calc-destino`) ya no tienen valores precargados estáticamente en el HTML. Se muestran vacíos con placeholders explicativos.
- Si un usuario no autenticado entra a la sub-pestaña *"Mis Compras y Certificados"*, `renderizarComprasComprador` no lista operaciones de terceros, sino que presenta una pantalla explicativa de resguardo de custodia Escrow e invita a iniciar sesión.

---

## 4. Invariantes y Reglas No Negociables

1. **NO TOCAR `mercado/services/calculadora_flete.py`**: Es el código base del Carril 3 de tarifas y cubicaje. Toda integración debe usar `cotizar_operacion_completa` como caja negra.
2. **CERO EMOJIS EN LA INTERFAZ**: Mantener el estilo sobrio, limpio y profesional según los estándares de `apple-design` y `frontend-design`.
3. **BALANCE DE ETIQUETAS HTML**: Antes de commitear cualquier cambio en [`templates/mercado/index.html`](file:///c:/Users/joelm/Mio/Ideathon/templates/mercado/index.html), verificar que la cantidad de `<div` coincida exactamente con la cantidad de `</div>` (actualmente 369 tags balanceados).
4. **ENLACES CLICKABLES**: En todas las respuestas dirigidas al usuario o reportes markdown, incluir links navegables con el esquema `file:///` a los archivos y rangos de líneas modificados.

---

## 5. Comandos Frecuentes y Verificaciones

### 5.1. Chequeo de Integridad Django
En el entorno Windows local, el Python con las dependencias instaladas es la versión 3.10:
```powershell
py -3.10 manage.py check
```
*(Debe retornar: `System check identified no issues (0 silenced)`).*

### 5.2. Chequeo de Sintaxis JavaScript
```powershell
node --check static\js\app.js
```

### 5.3. Chequeo de Balance de Divs en HTML
```powershell
$content = Get-Content "templates\mercado\index.html" -Raw
$openDivs = ([regex]::Matches($content, "<div\b")).Count
$closeDivs = ([regex]::Matches($content, "</div>")).Count
Write-Host "Open divs: $openDivs, Close divs: $closeDivs"
```

### 5.4. Flujo Git Dual (Ramas en Sincronía)
El repositorio opera con la rama de trabajo `identidad-visual` y la rama principal `main`:
```powershell
# 1. Commit en rama de trabajo
git add .
git commit -m "tipo: descripción clara del cambio"
git push origin identidad-visual

# 2. Sincronizar con main
git checkout main
git merge identidad-visual --ff-only
git push origin main
git checkout identidad-visual
```
