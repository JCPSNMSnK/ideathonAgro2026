# 03. Costos y Ganancias

## 1. ¿Se resuelve solo con software o necesita terceros?
El software hace la inteligencia (cálculo de peso/volumen y cruce de rutas), pero para que el subproducto llegue al campo **necesitamos terceros estratégicos**:
1. **Empresas de logística y camioneros asociados:** Aportan la flota que vuelve vacía (*Flete Calzado*). No son empleados nuestros: ellos ganan porque llenan un camión que iba a regresar a pérdida.
2. **Pasarela de pagos / Billetera custodia:** Permite retener el dinero en pesos del comprador y liberarlo cuando el camión descarga.
3. **Documentación obligatoria de tránsito:** El transportista debe circular con el remito o Carta de Porte / DTE correspondiente según el tipo de subproducto (responsabilidad de las partes, facilitada por los datos de la plataforma).

---

## 2. Flexibilidad Comercial: ¿Quién paga el flete?
A diferencia de un e-commerce rígido, en el agro quien paga el flete depende de la urgencia de cada punta. **Moñái** permite configurar en cada lote 3 modalidades:
* **Flete 100% a cargo del Comprador:** Cuando el productor ganadero o avícola busca activamente fibra o cama de pollo barata.
* **Flete 100% a cargo del Vendedor:** Cuando la agroindustria (ej. citrícola o aserradero) tiene el galpón colapsado y prefiere absorber el flete calzado antes que pagar una multa ambiental o un servicio de descarte.
* **Flete Compartido (50% y 50% o negociable):** Ambas puntas dividen el costo del camión de retorno para destrabar el negocio.

---

## 3. Modelo de Ingresos (Cómo ganamos plata sin matar al usuario)
Diseñamos un esquema de **comisión por éxito basada en volumen de viajes** (si el productor no vende, no paga nada):

* **Comisión al Vendedor (0,5% al 3% — promedio 2,5%):** Se calcula únicamente sobre el **beneficio neto del vendedor** (el valor del subproducto en planta, descontando el costo del flete).
* **Comisión por Gestión de Flete Calzado (2,5%):** Aplicada sobre el tramo logístico optimizado, justificada porque la plataforma le ahorra entre un **40% y un 50%** de tarifa respecto al cuadro pleno de FADEEAC.
* **Descuento por volumen:** Las industrias que despachan más de 15 camiones mensuales acceden al piso de comisión (0,5%–1%) para fidelizar su operatoria continua dentro de la app (**SUPUESTO**).

---

## 4. Estructura de Costos Fijos Mensuales (SUPUESTO / DATO SIMULADO)
Para operar durante los primeros 6 a 12 meses en el NEA con una estructura liviana:

| Rubro de Costo | Detalle | Costo Mensual Estimado (ARS) |
| :--- | :--- | :--- |
| **Infraestructura Cloud** | Servidores web, base de datos y backups | $120.000 ARS *(SUPUESTO)* |
| **APIs de Mapas y Rutas** | Cálculo de distancias por ruta y geolocalización | $80.000 ARS *(SUPUESTO)* |
| **Operaciones y Validación** | Soporte por WhatsApp y verificación de documentación de choferes (part-time) | $650.000 ARS *(SUPUESTO)* |
| **Sellado Blockchain (Hedera)** | Registro de certificados de trazabilidad (~$0,0001 USD por camión) | < $5.000 ARS *(SUPUESTO)* |
| **TOTAL COSTOS FIJOS** | **Costo mensual para mantener la operación activa** | **~$855.000 ARS / mes** |

---

## 5. Cuenta Simple por Operación y Punto de Equilibrio (DATOS SIMULADOS con base FADEEAC 2026)

### A. Ejemplo de 1 viaje promedio en el NEA (250 km)
* **Valor del lote de subproducto en planta** (beneficio del vendedor): **$500.000 ARS** *(SUPUESTO)*.
* **Flete Tradicional a tarifa plena FADEEAC (~250 km):** ~$1.400.000 ARS *(Dato basado en escala FADEEAC 2026)*.
* **Flete Calzado en Moñái (con 45% de descuento por retorno):** **~$770.000 ARS** *(Ahorro generado al usuario: **$630.000 ARS**)*.
* **Ingreso de Moñái en ese viaje:**
  * 2,5% sobre el beneficio del vendedor ($500.000) = **$12.500 ARS**.
  * 2,5% sobre el Flete Calzado gestionado ($770.000) = **$19.250 ARS**.
  * **Ganancia neta de la plataforma por camión:** **$31.750 ARS**.

### B. Punto de Equilibrio y Escalabilidad por Volumen (SUPUESTO)
* **Punto de equilibrio (Break-even):** Con solo **27 camiones cerrados por mes** en todo el NEA (menos de 1 viaje por día), la plataforma cubre el 100% de sus costos fijos ($855.000 ARS).
* **Proyección con 15 industrias activas en el NEA** (despachando 2 camiones por semana cada una = **120 camiones/mes**):
  * Facturación mensual en comisiones: **~$3.810.000 ARS / mes**.
  * Margen operativo limpio para crecer hacia Región Pampeana y Cuyo: **~$2.955.000 ARS / mes**.
