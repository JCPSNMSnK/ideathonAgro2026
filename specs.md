# Especificaciones Técnicas y de Negocio — Plataforma Moñai
> **Proyecto:** Ideathon NEA Tech 2026  
> **Nombre Comercial:** Moñai (anteriormente SubRuta)  
> **Propósito:** Marketplace B2B de Economía Circular Agroindustrial y Optimización Logística con "Flete Calzado" (retornos vacíos) y Pago en Garantía (Escrow) con Trazabilidad Ambiental Hedera HCS.

---

## 1. Visión General del Producto

Moñai conecta a los tres actores fundamentales de las cadenas agroindustriales de Argentina:
1. **Agroindustrias Generadoras (Vendedores):** Molinos arroceros, aserraderos forestales, jugueras cítricas y desmotadoras de algodón que generan miles de toneladas diarias de descartes o subproductos con riesgo de saturación de silos, descomposición o multas ambientales.
2. **Productores Agropecuarios e Industrias (Compradores):** Granjas avícolas, feedlots ganaderos, tambos, viveros y plantas de biomasa que necesitan estos subproductos (ej. cascarilla para cama de galpón o suplementación forrajera) a un costo accesible en tranquera.
3. **Empresas Transportistas y Fleteros (Logística):** Camiones que regresan vacíos por las rutas nacionales (RN 12, RN 14, RN 16, RN 11, etc.) y aceptan tarifas con 40% a 50% de descuento (Flete Calzado) frente al tarifario tradicional FADEEAC para cubrir costos de combustible y monetizar el retorno.

---

## 2. Pilares de la Solución y Reglas de Negocio

### 2.1. Flete Calzado vs. Flete Tradicional FADEEAC
- **Flete Tradicional:** Si un comprador contrata un flete exclusivo de ida y vuelta para traer 14 tn de cascarilla a 135 km, paga tarifa plena de ida y vuelta (FADEEAC 2026).
- **Flete Calzado Moñai:** Se aprovecha la capacidad ociosa de una unidad que ya vuelve vacía por ese corredor vial.
- **Descuentos Típicos:** 40% a 50% respecto al flete tradicional.
- **Cálculo de Saturación por Volumen:** Los subproductos agroindustriales livianos (ej. cascarilla de arroz con densidad ~165 kg/m³) saturan la batea de 90 m³ antes de alcanzar el peso máximo en toneladas (30 tn). El motor de cubicaje evalúa peso vs. volumen físico real.

> [!CAUTION]
> **REGLA DE ORO DE DESARROLLO:**  
> **NUNCA modificar `mercado/services/calculadora_flete.py`**. Este archivo implementa el motor de tarifas oficiales FADEEAC 2026, cálculo haversine vial y cubicaje desarrollado por otro carril técnico.

### 2.2. Modalidades de Absorción de Flete
Al publicar un lote, el vendedor puede definir quién cubre el transporte:
- `COMPRADOR`: El comprador abona el 100% del flete calzado en tranquera.
- `VENDEDOR`: El vendedor absorbe el 100% del flete (utilizado para evacuaciones críticas en 24 hs o para evitar multas de vuelco).
- `COMPARTIDO_50_50`: Reparto mutuo del costo logístico (50% vendedor, 50% comprador) acordado al publicar.

### 2.3. Lotes Urgentes vs. Lotes Futuros (Preventa de Sublotes)
- **Lotes de Despacho Urgente (24 hs / 48 hs):** Subproductos perecederos (ej. bagazo de citrus con 78% humedad con riesgo inminente de fermentación) o saturación de acopio. Se resaltan con badges animados y máxima prioridad de match.
- **Lotes Futuros (Zafra Programada):** Permiten la preventa fraccionada en **sublotes** (desde 5 tn) antes de la salida física del acopio. La reserva descuenta cupo en tiempo real.

### 2.4. Pago en Garantía (Escrow) y Remito Circular Hedera HCS
- Toda reserva retiene los fondos del comprador en garantía oficial (Escrow en ARS).
- **Ciclo de Estados:**
  1. `PAGO_EN_GARANTIA_ACTIVO`: Fondos resguardados, flete en ruta hacia el establecimiento del comprador.
  2. `DESCARGA_CONFIRMADA_PAGO_LIBERADO`: **Únicamente el comprador titular** puede firmar la recepción en tranquera desde su panel. Esto cierra el Certificado Ambiental y libera automáticamente la liquidación al vendedor y al transportista.
- **Trazabilidad Hedera Hashgraph:** Cada certificado genera un hash criptográfico inmutable registrado en Hedera Consensus Service (HCS), verificable en HashScan, con métricas de CO₂ evitado por no quema/no vuelco y elegibilidad para créditos verdes nacionales (Ley 25.916).

---

## 3. Arquitectura del Sistema

```
                  ┌───────────────────────────────────────────────┐
                  │                 FRONTEND SPA                  │
                  │  (HTML5 MVT + Vanilla JS + CSS Tokens)        │
                  │  - Leaflet Map (Georef IGN + Ruteo OSRM)      │
                  │  - Modales: Reserva, Login ABM, Voucher       │
                  │  - State: usuarioActivo en localStorage       │
                  └───────────────▲───────────────┬───────────────┘
                                  │ JSON          │ POST / GET
                                  │               ▼
                  ┌───────────────────────────────────────────────┐
                  │              DJANGO APPLICATION               │
                  │  mercado/views.py  ───►  mercado/urls.py      │
                  └───────┬───────────────┬───────────────┬───────┘
                          │               │               │
        ┌─────────────────▼──┐   ┌────────▼──────────┐   ┌▼─────────────────┐
        │  Carril 2:         │   │  Carril 3:        │   │  Carril 4:       │
        │  recomendador.py   │   │  calculadora_     │   │  trazabilidad_   │
        │  georef_service.py │   │  flete.py (INMUT) │   │  blockchain.py   │
        └─────────────────┬──┘   └────────┬──────────┘   └┬─────────────────┘
                          │               │               │
                          └───────────────┼───────────────┘
                                          ▼
                  ┌───────────────────────────────────────────────┐
                  │               BASE DE DATOS                   │
                  │    SQLite (Local) / Supabase PostgreSQL       │
                  │    - LoteSubproducto                          │
                  │    - CamionRetorno                            │
                  │    - OperacionTrazabilidad                    │
                  └───────────────────────────────────────────────┘
```

---

## 4. Roles de Usuario y Reglas de Acceso (RBAC)

La plataforma aplica **aislamiento estricto de roles** para proteger la privacidad comercial y el resguardo de fondos:

| Rol | Vistas Permitidas | Acceso Prohibido | Identidad Demo en BD |
| :--- | :--- | :--- | :--- |
| **Comprador** | `Inicio`, `Comprador (Catálogo, Cotizador, Mis Compras)` | `Vendedor`, `Logística` | `Granja Avícola San Isidro SRL` (Goya, Corrientes) |
| **Vendedor** | `Inicio`, `Comprador (Catálogo público)`, `Vendedor` | `Logística` | `Molino Arrocero San Lorenzo` (Saladas, Corrientes) |
| **Logística** | `Inicio`, `Comprador (Catálogo público)`, `Logística` | `Vendedor` | `Transportes Don Horacio` (Corrientes Capital) |
| **Sin Sesión (Externo)** | `Inicio`, `Comprador (Catálogo y Cotizador)` | `Mis Compras`, `Vendedor privado`, `Logística privada` | Ninguna (Campos en blanco con placeholder) |

### Reglas de Control de Navegación:
- Si un usuario autenticado como `logistica` intenta acceder a `vista-vendedor`, `cambiarVistaRol` bloquea la navegación, muestra una advertencia emergente y abre el modal de cambio de cuenta.
- Lo mismo ocurre si un `vendedor` intenta ingresar a `vista-logistica`.
- Si un comprador externo sin sesión hace clic en *"Mis Compras y Certificados"*, ve una tarjeta de privacidad comercial y se le solicita iniciar sesión. Nunca se listan compras ajenas.

---

## 5. Modelos de Datos (`mercado/models.py`)

### 5.1. `LoteSubproducto`
- `titulo` (CharField): Nombre comercial del lote.
- `categoria` (CharField): `ARROZ`, `MADERA`, `CITRUS`, `ALGODON`, `OTRO`.
- `empresa_vendedora` (CharField): Razón social de la agroindustria titular.
- `localidad_origen` / `provincia` (CharField): Localidad de planta.
- `toneladas_disponibles` (DecimalField): Stock físico o cupo restante.
- `densidad_kg_m3` (PositiveIntegerField): Densidad aparente según INTA/INTI.
- `precio_tonelada_ars` (DecimalField): Precio en planta por tonelada.
- `humedad_estado` (CharField): Estado físico, zafra o metadato de urgencia/lote futuro.
- `carroceria_requerida` (CharField): Requerimiento técnico de batea/tolva.
- `usos_recomendados` (TextField): Aplicaciones agronómicas o industriales.
- `perfiles_comprador` (CharField): `AVICOLA`, `GANADERO`, `BIOMASA`, `VIVERO`.
- `modalidad_flete` (CharField): `COMPRADOR`, `VENDEDOR`, `COMPARTIDO_50_50`.
- `porcentaje_flete_vendedor` (PositiveIntegerField): % si es compartido (def: 50).

### 5.2. `CamionRetorno`
- `transportista` (CharField): Razón social del transportista o chofer.
- `origen_viaje` / `destino_viaje` (CharField): Trayecto del viaje de regreso.
- `pasa_por` (TextField): Localidades intermedias del corredor.
- `fecha_disponible` (CharField): Ventana temporal de salida.
- `tipo_carroceria` (CharField): Tipo de batea o semirremolque.
- `capacidad_max_tn` / `capacidad_max_m3` (DecimalField): Carga máxima permitida.
- `descuento_retorno_pct` (DecimalField): Descuento respecto a FADEEAC (ej. 45% a 50%).
- `disponible` (BooleanField): Estado operativo.

### 5.3. `OperacionTrazabilidad`
- `lote` (FK LoteSubproducto), `camion` (FK CamionRetorno).
- `comprador_nombre` (CharField): Razón social del comprador que retira.
- `localidad_destino` (CharField): Establecimiento de destino.
- `distancia_km` (PositiveIntegerField): Distancia vial calculada.
- `volumen_m3_calculado` (DecimalField): Metros cúbicos de carga.
- `subtotal_subproducto_ars`, `flete_tradicional_fadeeac_ars`, `flete_calzado_ars`, `ahorro_logistico_ars`, `comision_plataforma_ars` (DecimalField).
- `estado_garantia` (CharField): `PAGO_EN_GARANTIA_ACTIVO`, `DESCARGA_CONFIRMADA_PAGO_LIBERADO`.
- `red_blockchain` (CharField): Red y Topic ID Hedera HCS.
- `hash_certificado` (CharField): Hash SHA-256 / Hedera inmutable.

---

## 6. Endpoints de la API REST

| Método | Ruta | Descripción | Rol / Permiso |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Vista principal SSR con datasets iniciales precargados | Público |
| `GET` | `/api/cotizar/` | Cotización en vivo de flete calzado y FADEEAC según peso/volumen | Público |
| `POST` | `/api/reservar/` | Reserva con retención de fondos en Escrow y descuento de stock | Comprador |
| `POST` | `/api/liberar-garantia/` | Firma de recepción en tranquera y liberación de fondos al vendedor y transportista | Solo Comprador titular |
| `POST` | `/api/publicar/` | Alta de nuevo lote de subproducto en acopio | Vendedor |
| `POST` | `/api/lote/<id>/editar/` | Modificación de lote de planta | Solo Vendedor titular |
| `POST` | `/api/lote/<id>/eliminar/` | Baja de lote de planta | Solo Vendedor titular |
| `POST` | `/api/publicar-camion/` | Publicación de viaje de retorno vacío | Logística |
| `POST` | `/api/camion/<id>/editar/` | Modificación de ruta o disponibilidad de camión | Solo Transportista titular |
| `POST` | `/api/camion/<id>/eliminar/` | Baja de unidad de transporte | Solo Transportista titular |
| `GET` | `/api/georef/localidades/` | Búsqueda oficial IGN con coordenadas oficiales de Argentina | Público |
| `GET` | `/api/georef/ruta/` | Cálculo vial exacto por OSRM | Público |

---

## 7. Criterios de Calidad, Diseño y UI/UX

1. **Sin Emojis:** La identidad visual de Moñai es profesional, técnica y corporativa agroindustrial. No se permiten emojis en botones, títulos ni badges; se utilizan iconos SVG limpios, badges de estado tipográficos y chips monocromáticos.
2. **Tokens de Diseño y Modo Oscuro:** Centralizados en `static/css/variables.css` y `static/css/styles.css` con variables CSS (`--color-primario`, `--fondo-base`, `--borde-color`, etc.) y soporte para View Transitions API.
3. **Paginación en Cliente y Rendimiento:** Tablas y grids paginados dinámicamente mediante `renderizarControlesPaginacion` para soportar gran volumen de transacciones sin ralentizar la interfaz.
4. **Integridad del Marcado HTML:** Todas las etiquetas `<div` y `</div` deben mantenerse estrictamente balanceadas (verificar con script de conteo antes de cada commit).
