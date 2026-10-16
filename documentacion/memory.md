# Memoria del Proyecto y Decisiones de Arquitectura (MEMORY) — Moñái

> **Proyecto:** Moñái (*Protector Guaraní de los Caminos y los Campos*)  
> **Evento:** Ideathon NEA Tech 2026 (Corrientes)  
> **Vertical:** Agro — Del subproducto al mercado  
> **Equipo:**  
> • **Luciana Avalos** — Diseño Gráfico (Carril 1: UX/UI, Identidad y Certificados)  
> • **Joel Marcori** — Lic. en Sistemas (Carril 2: Recomendador Productivo y ABM)  
> • **Giovanni Piazza** — Lic. en Sistemas (Carril 3: Motor de Cubicaje y Flete FADEEAC 2026)  
> • **Julio Pintos** — Lic. en Sistemas (Carril 4: Escrow, Trazabilidad Hedera, Supabase y Deploy)  

---

## 1. Génesis del Proyecto y Significado de la Marca

Durante las primeras etapas de ideación, el proyecto fue concebido técnicamente bajo el nombre provisorio `SubRuta`. Sin embargo, para dotar a la propuesta de arraigo cultural y diferenciación en el **Ideathon NEA Tech 2026**, se adoptó la identidad definitiva **Moñái**:

* **Etimología Guaraní:** En la mitología guaraní, *Moñái* es el espíritu protector del aire, los campos abiertos y los caminos transitados.
* **Misión del Producto:** Cuidar los caminos evitando que los camiones viajen vacíos (reduciendo la huella de carbono y el desgaste de rutas) y proteger los campos evitando que los subproductos se quemen a cielo abierto o terminen en basurales clandestinos.

---

## 2. El Dolor Real del Territorio: Caso Testigo Saladas (Corrientes)

En el NEA argentino coexisten tres cadenas productivas de gran escala:
1. **Molinos Arroceros:** Generan toneladas diarias de cascarilla de arroz. Es un material muy liviano ($\approx 165\text{ kg/m}^3$) y de gran volumen.
2. **Foresto-Industria (Aserraderos de Pino/Eucalipto):** Generan aserrín, virutas y chips ($\approx 210\text{ kg/m}^3$). Acumularlo en playa representa un riesgo extremo de incendio y atrae sanciones.
3. **Industria Citrícola (Juguera):** Genera cáscara y bagazo húmedo ($\approx 650\text{ kg/m}^3$). Si no se evacúa en 48 horas, fermenta generando lixiviados y olores ácidos.

### La "Trampa del Cubicaje"
Un viaje tradicional de camión con semirremolque cobra por tarifa plena (alrededor de \$1.400.000 ARS para 250 km según FADEEAC 2026). Para un insumo de \$22.000/tn, **el flete representa entre el 70% y el 80% del costo total puesto en destino**, frenando la compra.

### El Descalce Logístico
Al mismo tiempo, cientos de camiones que descargan granos o mercadería en los puertos o centros de consumo del Litoral **regresan vacíos por la RN 12, RN 14 o RP 27**. Moñái monetiza ese retorno vacío (**Flete Calzado**, hasta -45% de tarifa), transformando un desecho inviable en un insumo económico en la tranquera del productor avícola o ganadero.

---

## 3. Registro de Decisiones de Arquitectura (ADRs)

### ADR-001: Pila Django 6.1 + Vanilla JS en lugar de React/Next.js
* **Contexto:** En eventos de hackathon o ideathones con conectividad inestable y evaluadores con perfiles de negocios/campo, las aplicaciones basadas en pesados bundles de Node/Webpack demoran en cargar y sufren incompatibilidades de red.
* **Decisión:** Implementar backend en Python 3.12 / Django 6.1 con plantillas HTML limpias y Vanilla JavaScript modular (`app.js`).
* **Consecuencias Positivas:** Cero tiempo de compilación (build), tiempo de respuesta menor a 80 ms, soporte nativo de *View Transitions API* y carga garantizada en redes 3G o teléfonos rurales.

### ADR-002: Base de Datos Dual (Supabase Cloud + Fallback SQLite)
* **Contexto:** El equipo requería una base de datos centralizada en la nube para que las altas y reservas se vieran reflejadas en tiempo real entre los dispositivos del equipo y el jurado, pero sin arriesgarse a una caída si se saturaba el Wi-Fi del salón.
* **Decisión:** 
  * En producción y desarrollo conectado: **Supabase PostgreSQL 15** (São Paulo) a través de su **Transaction Pooler (puerto 6543)**.
  * Si `DATABASE_URL` no está presente: fallback transparente a **SQLite 3 local**.
* **Ajuste Técnico Crítico:** Se configuró `CONN_MAX_AGE = 0` y `DISABLE_SERVER_SIDE_CURSORS = True` en Django para prevenir desconexiones del pooler de Supabase en Vercel Serverless.

### ADR-003: "Blockchain Invisible" sobre Hedera Consensus Service (HCS)
* **Contexto:** Exigir MetaMask, gas fees o manejo de claves privadas a un camionero o arrocero del interior de Corrientes destruye la adopción.
* **Decisión:** El usuario opera 100% en pesos argentinos con interfaces tradicionales. Por detrás, el servidor consulta el **Mirror Node de Hedera Testnet** (`https://testnet.mirrornode.hedera.com`), ancla el hash SHA-256 de la operación y genera un enlace verificable a **HashScan**.
* **Beneficio:** Trazabilidad inmutable sin fricción para el usuario y costo operativo predecible (\$0,0001 USD por mensaje).

### ADR-004: Modelo de Desarrollo en 4 Carriles Paralelos
* **Contexto:** 4 integrantes trabajando intensamente en el mismo repositorio durante un fin de semana corren riesgo constante de pisarse código y generar conflictos de merge (`git rebase` / `merge conflicts`).
* **Decisión:** Segmentar la arquitectura en 4 archivos/servicios independientes:
  * Carril 1: `variables.css` y `styles.css` (Luciana Avalos)
  * Carril 2: `recomendador.py` (Joel Marcori)
  * Carril 3: `calculadora_flete.py` (Giovanni Piazza)
  * Carril 4: `trazabilidad_blockchain.py` (Julio Pintos)
* **Resultado:** Cero conflictos de fusión durante todo el ciclo de desarrollo.

---

## 4. Estado de Funcionalidades Completadas (Checklist de Entrega)

- [x] **Recomendador de Oportunidades:** Filtrado dinámico por perfiles de actividad (*Avícola, Ganadero, Biomasa, Vivero, General*).
- [x] **Motor Peso vs. Volumen:** Cálculo automático de cubicaje en $m^3$ y alerta de saturación en batea.
- [x] **Comparador Visual de Flete:** Contraste en vivo entre Flete Tradicional FADEEAC y Flete Calzado Moñái.
- [x] **Selector Rápido de Comprador y Ventana de Carga:** 5 presets agropecuarios del NEA y turnos de carga para evitar costos de estadía.
- [x] **Descuento de Stock en Supabase:** Deducción automática de toneladas en el inventario de la planta al confirmar reserva.
- [x] **Escrow en Pesos y Liberación:** Retención en garantía de fondos y botón `Confirmar Descarga y Liberar Pago`.
- [x] **Integración Hedera HashScan:** Anclaje de transacciones y verificación en explorador de bloques público de Hedera Testnet.
- [x] **ABM Completo de Oferta (Lotes):** Alta, edición en formulario sincronizado y baja de lotes en Supabase.
- [x] **ABM Completo de Logística (Camiones):** Alta, edición de ruta/descuento y baja de unidades en retorno.
- [x] **ABM Completo de Usuarios:** Identificación rápida en 1 clic y gestión de perfiles personalizados en almacenamiento local.
- [x] **Modo Claro / Modo Oscuro:** Diseñado con estándares de accesibilidad y contraste para uso diurno bajo sol de campo.
- [x] **Remito y Certificado A4 Imprimible:** Maquetado con hoja membretada para presentación institucional o descarga en PDF.

---

## 5. Historial de Desafíos Técnicos Resueltos

1. **Permisos de Python en Windows:**  
   * *Problema:* El directorio global `C:\Python312\Scripts` carecía de permisos de escritura para el usuario estándar.
   * *Solución:* Instalación de dependencias con la bandera `python -m pip install --user`.
2. **Agotamiento de Conexiones en Supabase (Puerto 5432 vs 6543):**  
   * *Problema:* En Vercel Serverless, cada invocación abría una conexión persistente a PostgreSQL que agotaba rápidamente el límite de 15 conexiones de Supabase.
   * *Solución:* Migración al Transaction Pooler (puerto 6543), desactivación de prepared statements en Django (`DISABLE_SERVER_SIDE_CURSORS = True`) y cierre de conexión por ciclo de request (`CONN_MAX_AGE = 0`).
3. **Caché de Archivos Estáticos en Vercel:**  
   * *Problema:* Al modificar `styles.css` o `app.js`, Vercel y el navegador cacheaban los archivos impidiendo visualizar cambios en la demo.
   * *Solución:* Configuración de WhiteNoise con `WHITENOISE_MAX_AGE = 0` y parámetro dinámico de versión `?v={% now 'U' %}` en la plantilla HTML.

---

## 6. Hoja de Ruta Post-Ideathon (Next Steps)

1. **Integración con WhatsApp Bot (Twilio / Meta Cloud API):** Permitir a los transportistas notificar disponibilidad de retorno simplemente enviando una nota de voz o ubicación por WhatsApp.
2. **Integración con Básculas de Planta (IoT):** Conexión vía API con balanzas de pesaje para emitir el certificado y liberar el escrow de forma automática al registrar la pesada de salida y de entrada.
3. **Contratos Inteligentes en Hedera EVM o Stellar Soroban:** Automatizar la dispersión de fondos a través de contratos inteligentes que liberen pesos tokenizados directamente a la cuenta del fletero y de la planta.
