# Moñái — Del Subproducto al Mercado con Flete Calzado

> **Ideathon NEA Tech 2026 (Corrientes)**  
> **Vertical:** Agro  
> **Escenario:** Del subproducto al mercado

---

## 1. Frase del Problema
> **"Las agroindustrias del NEA (aserraderos, arroceras y citrícolas) necesitan vender y despachar rápido sus excedentes de subproductos con un flete que cierre en números, porque hoy se les acumulan en planta generando costos y pasivos ambientales mientras posibles compradores a pocos kilómetros ni se enteran o desisten por el costo del transporte."**

---

## 2. Resumen del Producto (en 4 líneas)
1. **Problema:** En el NEA sobran toneladas de subproductos útiles (aserrín, cascarilla de arroz, descarte cítrico), pero el negocio se cae porque ocupan mucho volumen por su bajo valor y contratar un flete común come hasta el 80% del margen.
2. **Solución:** **Moñái** conecta industrias vendedoras y productores compradores recomendando oportunidades según su actividad y calculando el costo exacto por peso/volumen junto con camiones que vuelven vacíos (**Flete Calzado**, hasta 45% más barato).
3. **Modelo de Negocio:** Cobramos una comisión baja por operación cerrada (**2,5% sobre el beneficio neto del vendedor + 2,5% sobre la gestión del Flete Calzado**), alcanzando el punto de equilibrio con solo 28 viajes mensuales (**SUPUESTO**).
4. **Blockchain Invisible:** El productor opera en pesos de forma simple y, por detrás, sellamos en **Hedera/Stellar** el pago en garantía (*escrow*) y el Certificado de Trazabilidad Ambiental que demuestra el destino sustentable del subproducto.

---

## 3. El Equipo
Un equipo interdisciplinario con foco en diseño de experiencia de usuario (UX/UI) e ingeniería de software:
- **Avalos, Luciana** — Diseño Gráfico (UX/UI, identidad visual y prototipado)
- **Marcori, Joel** — Lic. en Sistemas (Arquitectura, desarrollo y lógica de negocio)
- **Piazza, Giovanni** — Lic. en Sistemas (Desarrollo full-stack y motor de cálculo logístico)
- **Pintos, Julio** — Lic. en Sistemas (Desarrollo, integraciones y capa de trazabilidad)

---

## 4. Índice del Repositorio (`documentacion/`)
- [`/documentacion/01-problema/problema.md`](./documentacion/01-problema/problema.md) — Actor, dolor, resolución actual, datos auditados (BCCBA, FADEEAC 2026) y supuestos validados.
- [`/documentacion/02-solucion/solucion.md`](./documentacion/02-solucion/solucion.md) — Idea elegida, ideas descartadas, alerta de sobreingeniería, flujo de la demo en 4 pasos y validación.
- [`/documentacion/03-costos-y-ganancias/costos-y-ganancias.md`](./documentacion/03-costos-y-ganancias/costos-y-ganancias.md) — Estructura de costos, terceros necesarios, flexibilidad del flete y cuenta estimada.
- [`/documentacion/04-blockchain/blockchain.md`](./documentacion/04-blockchain/blockchain.md) — Criterio de uso de Blockchain Invisible, tabla On-Chain vs. Off-Chain y estrategia de implementación.
- [`/documentacion/05-producto/producto.md`](./documentacion/05-producto/producto.md) — Pitch de 1 minuto, 5 preguntas difíciles del jurado, gestión de riesgos y hoja de ruta.

---

## 5. Contexto para IA (Prompt de lectura rápida)
*Copiá y pegá este bloque si vas a pedirle a una IA que programe, diseñe pantallas o arme presentaciones sobre nuestro proyecto:*

```markdown
### Contexto del Proyecto: Moñái (Ideathon NEA Tech 2026)
- **Qué es:** Plataforma web/móvil que transforma subproductos agroindustriales en negocios rentables conectando oferta agroindustrial, demanda productiva y camiones de retorno ("Flete Calzado").
- **Foco geográfico inicial:** Región NEA (Corrientes, Misiones, Chaco, Formosa), con casos testigo en Saladas (Corrientes) para los sectores foresto-industrial (aserrín/chips), arrocero (cascarilla/afrechillo) y citrícola (bagazo/cáscara húmeda), y proyección de escalabilidad a Región Pampeana y Cuyo.
- **Problema central:** Los subproductos tienen bajo precio por tonelada y alta relación volumen/peso (cubicaje). Un flete tradicional a tarifa plena hace inviable su traslado a más de 100 km. Hoy se comercializan de boca en boca, en grupos cerrados de WhatsApp y en negro, sin garantías de pago ni trazabilidad ambiental.
- **Funcionalidad Estrella (MVP Demo):**
  1. Recomendador de oportunidades: sugiere al comprador (ej. avícola o ganadero) qué subproducto cercano le sirve para cama de pollo, fibra animal o biomasa.
  2. Calculadora Peso/Volumen + Flete Calzado: cruza la densidad del subproducto (m3 vs. toneladas) con las tarifas de referencia FADEEAC/CATAC 2026 y aplica el descuento de retorno vacío (40% a 50% menos), permitiendo elegir quién absorbe el flete (comprador, vendedor o 50/50).
  3. Cierre con Garantía y Certificado Circular: retención de pago hasta confirmar entrega y emisión de un Certificado de Disposición Final (trazabilidad ambiental).
- **Regla de diseño y código:** Cero jerga cripto para el usuario final. Interfaz limpia, pensada para productores y transportistas que usan el celular con baja señal. Toda la complejidad de cálculo de cubicaje y registro en blockchain (Hedera/Stellar) ocurre en el backend de forma transparente.
```

---

## 6. Arquitectura Modular para Desarrollo en Paralelo (Sin conflictos en Git)

Para que los 4 integrantes trabajen en simultáneo sin pisarse archivos, el proyecto está dividido en **4 carriles independientes**:

| Integrante | Carril / Responsabilidad | Archivos asignados para editar |
| :--- | :--- | :--- |
| **Luciana Avalos** *(Diseño Gráfico)* | **Carril 1:** Identidad visual (Tapé / Jopói / Cachapé / Jangada), paleta de colores NEA, tarjetas UI y Certificado Ambiental. | • [`static/css/variables.css`](./static/css/variables.css)<br>• [`static/css/styles.css`](./static/css/styles.css) |
| **Joel Marcori** *(Lic. en Sistemas)* | **Carril 2:** Recomendador de subproductos según perfil del comprador (Avícola, Ganadero, Biomasa, Vivero) y publicación de lotes. | • [`mercado/services/recomendador.py`](./mercado/services/recomendador.py) |
| **Giovanni Piazza** *(Lic. en Sistemas)* | **Carril 3:** Motor matemático de Peso vs. Volumen ($m^3$), tarifas oficiales FADEEAC 2026, descuento por Flete Calzado y comisión (2,5%). | • [`mercado/services/calculadora_flete.py`](./mercado/services/calculadora_flete.py) |
| **Julio Pintos** *(Lic. en Sistemas)* | **Carril 4:** Pago en Garantía (*Escrow*), Certificado de Trazabilidad Ambiental (*Blockchain Invisible*), conexión a Supabase y Deploy. | • [`mercado/services/trazabilidad_blockchain.py`](./mercado/services/trazabilidad_blockchain.py)<br>• [`supabase/init_supabase.sql`](./supabase/init_supabase.sql) |

### Cómo levantar el proyecto en 1 minuto (Local o con Supabase)
```bash
# 1. Crear y activar entorno virtual
python -m venv .venv
.\.venv\Scripts\activate   # En Windows

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Migrar tablas y levantar servidor (precarga automáticamente los datos de Saladas/NEA)
python manage.py migrate
python manage.py runserver
```
> **Modo híbrido Supabase / Local:** Si crean un archivo `.env` con `DATABASE_URL` apuntando a **Supabase (PostgreSQL)**, el proyecto se conecta a la nube compartida por todo el equipo. Si `DATABASE_URL` está vacío (o se corta el Wi-Fi en el salón), usa automáticamente SQLite local con los mismos datos del NEA precargados.

