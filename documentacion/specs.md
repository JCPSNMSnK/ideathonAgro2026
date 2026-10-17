# Especificaciones Técnicas del Sistema (SPECS) — Moñái

> **Proyecto:** Moñái — Logística Circular y Flete Calzado del NEA  
> **Evento:** Ideathon NEA Tech 2026 (Corrientes)  
> **Vertical:** Agro — Del subproducto al mercado  
> **Versión:** 1.0.0 (MVP Producción)  
> **Fecha:** Octubre 2026  

---

## 1. Visión General y Objetivo Técnico

**Moñái** es una plataforma web agroindustrial diseñada para erradicar el cuello de botella logístico de los subproductos agroindustriales del NEA (cascarilla de arroz, aserrín/chips de madera, cáscara de citrus). 

El sistema resuelve la asimetría de información y el descalce de costos mediante:
1. **Motor de cubicaje físico ($m^3$ vs. toneladas):** Calcula el factor limitante real de carga en batea cerealera de $85\text{ a }90\text{ m}^3$ o chasis con acoplado.
2. **Bolsa de Flete Calzado (Backhaul):** Empareja lotes con camiones que descargaron en centros de consumo del NEA y regresan vacíos por las rutas RN 12, RN 14, RN 118, RN 123 y RP 27, aplicando tarifas reducidas con un 40% a 50% de descuento respecto a las tarifas plenas FADEEAC/CATAC 2026.
3. **Escrow en Pesos (Pago en Garantía):** Custodia de fondos hasta confirmación de descarga efectiva en tranquera.
4. **Blockchain Invisible (Hedera HCS):** Anclaje criptográfico inmutable de Remitos Circulares y Certificados de Trazabilidad Ambiental sin exigir billeteras cripto a los productores.

---

## 2. Pila Tecnológica (Tech Stack)

| Capa | Tecnología | Justificación Técnica |
| :--- | :--- | :--- |
| **Backend** | Python 3.12 + Django 6.1 | Robustez, velocidad de desarrollo, ORM maduro y soporte nativo WSGI para serverless. |
| **Base de Datos** | Supabase Cloud (PostgreSQL 15) | Hospedada en São Paulo (`sa-east-1`). Utiliza Transaction Pooler (puerto 6543) para alta concurrencia y conexiones efímeras sin agotar el pool. |
| **Persistencia Local** | SQLite 3 (`db.sqlite3`) | Fallback automático en caso de corte de conectividad en salón de presentaciones o desarrollo offline. |
| **Frontend** | Vanilla JS (ES6+) + CSS3 Custom Properties | Cero dependencias npm/node_modules. Carga instantánea en conexiones rurales 3G/4G, soporte para View Transitions API y modo alto contraste rural. |
| **Blockchain** | Hedera Consensus Service (HCS) | Sello de consenso con costo predecible (\$0,0001 USD/tx), latencia de 3 a 5 segundos y consulta en vivo mediante REST Mirror Node de Hedera Testnet. |
| **Despliegue** | Vercel Serverless Functions + WhiteNoise | Despliegue continuo (CI/CD) conectado al repositorio GitHub, compresión estática gzip/brotli y cache-busting dinámico por timestamp. |

---

## 3. Modelo de Dominio y Esquema Relacional

```
 ┌──────────────────────┐          ┌──────────────────────────┐
 │   LoteSubproducto    │          │      CamionRetorno       │
 ├──────────────────────┤          ├──────────────────────────┤
 │ id (PK)              │          │ id (PK)                  │
 │ titulo               │          │ transportista            │
 │ categoria            │          │ origen_viaje             │
 │ empresa_vendedora    │          │ destino_viaje            │
 │ localidad_origen     │          │ pasa_por                 │
 │ provincia            │          │ tipo_carroceria          │
 │ toneladas_disponibles│          │ capacidad_max_tn         │
 │ densidad_kg_m3       │          │ capacidad_max_m3         │
 │ precio_tonelada_ars  │          │ descuento_retorno_pct    │
 │ modalidad_flete      │          │ disponible (bool)        │
 │ perfiles_comprador   │          └────────────┬─────────────┘
 └──────────┬───────────┘                       │
            │                                   │
            │      ┌─────────────────────┐      │
            └─────►│OperacionTrazabilidad│◄─────┘
                   ├─────────────────────┤
                   │ id (PK)             │
                   │ lote_id (FK)        │
                   │ camion_id (FK)      │
                   │ comprador_nombre    │
                   │ localidad_destino   │
                   │ toneladas_pactadas  │
                   │ flete_calzado_ars   │
                   │ estado_garantia     │
                   │ hash_certificado    │
                   │ red_blockchain      │
                   │ hashscan_url        │
                   └─────────────────────┘
```

### Índices de Rendimiento en PostgreSQL (Supabase)
* `idx_lote_cat_disp`: `(categoria, toneladas_disponibles)` para acelerar el filtrado de biomasa activa.
* `idx_lote_origen`: `(localidad_origen)` para emparejamiento con el corredor vial.
* `idx_camion_disp_orig_dest`: `(disponible, origen_viaje, destino_viaje)` para matchear retornos en milisegundos.

---

## 4. Motor Matemático y Fórmulas de Negocio

### 4.1. Cálculo de Cubicaje Físico
Para cualquier lote de subproducto:
$$\text{Volumen Total } (m^3) = \frac{\text{Toneladas} \times 1000}{\text{Densidad } (kg/m^3)}$$

**Condición de Saturación (Batea estándar $90\text{ m}^3$ / $30\text{ tn}$):**
$$\% \text{ Volumen} = \min\left(100, \frac{\text{Volumen } m^3}{90} \times 100\right)$$
$$\% \text{ Peso} = \min\left(100, \frac{\text{Toneladas}}{30} \times 100\right)$$
$$\text{Factor Limitante} = \begin{cases} 
\text{"VOLUMEN FÍSICO"}, & \text{si } \frac{\text{Volumen}}{90} > \frac{\text{Toneladas}}{30} \\ 
\text{"PESO EN BALANZA"}, & \text{en caso contrario} 
\end{cases}$$

### 4.2. Tarifa Logística (FADEEAC 2026 vs. Flete Calzado)
Tarifa plena de referencia (FADEEAC/CATAC 2026 para viaje completo de 30 tn):
$$\text{Flete Tradicional (ARS)} = \max\left(350.000, \text{round}\left(350.000 + (\text{distancia\_km} \times 4.200), -3\right)\right)$$

Tarifa Flete Calzado (aplica el descuento de retorno vacío $D \in [20\%, 60\%]$, típico $45\%$):
$$\text{Flete Calzado (ARS)} = \text{round}\left(\text{Flete Tradicional} \times \left(1 - \frac{D}{100}\right), -3\right)$$
$$\text{Ahorro Logístico (ARS)} = \text{Flete Tradicional} - \text{Flete Calzado}$$

### 4.3. Absorción de Flete según Modalidad
* **`COMPRADOR` (100% Comprador):**  
  $\text{Comprador paga} = \text{Subproducto} + \text{Flete Calzado} + \text{Comisión}$
* **`COMPARTIDO_50_50` (50% Vendedor / 50% Comprador):**  
  $\text{Comprador paga} = \text{Subproducto} + (\text{Flete Calzado} / 2) + \text{Comisión}$  
  $\text{Vendedor absorbe} = (\text{Flete Calzado} / 2)$
* **`VENDEDOR` (100% Vendedor - Urgencia Ambiental 48 hs):**  
  $\text{Comprador paga} = \text{Subproducto} + \text{Comisión}$  
  $\text{Vendedor absorbe} = \text{Flete Calzado}$

### 4.4. Modelo de Monetización (Moñái)
$$\text{Comisión Vendedor} = 2,5\% \times \text{Subtotal Subproducto}$$
$$\text{Comisión Transporte} = 2,5\% \times \text{Flete Calzado}$$
$$\text{Comisión Total Plataforma} = \text{Comisión Vendedor} + \text{Comisión Transporte}$$

---

## 5. Especificación de Endpoints de la API REST

### 5.1. Cotizador en Vivo
* **Ruta:** `GET /api/cotizar/`
* **Parámetros Query:** `lote_id`, `camion_id`, `distancia_km`, `toneladas`
* **Respuesta Exitosa (200 OK):**
```json
{
  "ok": true,
  "cotizacion": {
    "lote_titulo": "Cascarilla de Arroz Seca",
    "volumen_m3": 90.9,
    "factor_limitante": "VOLUMEN FÍSICO",
    "porcentaje_volumen_camion": 100.0,
    "porcentaje_peso_camion": 50.0,
    "flete_tradicional_fadeeac_ars": 1400000,
    "flete_calzado_ars": 770000,
    "ahorro_logistico_ars": 630000,
    "subtotal_subproducto_ars": 330000,
    "comision_total_plataforma_ars": 27500,
    "total_comprador_subruta_ars": 1127500
  }
}
```

### 5.2. Reserva con Pago en Garantía (Escrow)
* **Ruta:** `POST /api/reservar/`
* **Headers:** `Content-Type: application/json`
* **Payload:**
```json
{
  "lote_id": 1,
  "camion_id": 1,
  "distancia_km": 155,
  "toneladas": 15,
  "comprador_nombre": "Granja Avícola San Isidro SRL",
  "localidad_destino": "Goya, Corrientes · Turno: Mañana 08:00 a 10:00 hs (Sin demora)"
}
```
* **Efectos Secundarios:**
  1. Descuenta automáticamente las toneladas de `LoteSubproducto.toneladas_disponibles`.
  2. Crea el registro `OperacionTrazabilidad` con estado `PAGO_EN_GARANTIA_RETENIDO`.
  3. Consulta en vivo el Mirror Node de Hedera Testnet (`https://testnet.mirrornode.hedera.com/api/v1/blocks?limit=1`) para anclar el bloque y generar la URL de auditoría en HashScan.

### 5.3. Confirmar Descarga y Liberar Escrow
* **Ruta:** `POST /api/liberar-garantia/`
* **Payload:** `{ "operacion_id": 1 }` (u omitir para impactar la última activa)
* **Efecto:** Cambia el estado a `DESCARGA_CONFIRMADA_PAGO_LIBERADO`.

### 5.4. ABM de Lotes (Vendedor)
* `POST /api/publicar/`: Alta de nuevo lote con inferencia de densidad y carrocería.
* `POST /api/lote/<id>/editar/`: Modificación de precio, volumen, stock o absorción.
* `POST /api/lote/<id>/eliminar/`: Baja lógica/física del catálogo activo.

### 5.5. ABM de Camiones (Logística)
* `POST /api/publicar-camion/`: Alta de viaje de retorno con porcentaje de descuento.
* `POST /api/camion/<id>/editar/`: Edición de corredor, carrocería, fecha o disponibilidad.
* `POST /api/camion/<id>/eliminar/`: Baja de la unidad de la bolsa de flete.

---

## 6. Variables de Entorno y Configuración

El archivo `.env` local (nunca versionado en Git) se estructura según:

```bash
# Modo Base de Datos: Supabase Transaction Pooler (Port 6543)
DATABASE_URL="postgres://postgres.PROJECT_REF:PASSWORD@aws-1-sa-east-1.pooler.supabase.com:6543/postgres"

# Configuración Django
DJANGO_SECRET_KEY="clave-secreta-produccion"
DEBUG="True"
ALLOWED_HOSTS="localhost,127.0.0.1,.vercel.app"

# Integración Hedera Testnet (Mirror Node REST gratuito)
HEDERA_TOPIC_ID="0.0.4829104"
HEDERA_NETWORK="testnet"
```

### Configuración Crítica para Supabase Pooler en `subruta_config/settings.py`
Para evitar errores `OperationalError: server closed the connection unexpectedly` en entornos Serverless:
```python
DATABASES['default']['CONN_MAX_AGE'] = 0
DATABASES['default']['DISABLE_SERVER_SIDE_CURSORS'] = True
```
