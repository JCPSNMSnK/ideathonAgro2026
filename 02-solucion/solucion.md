# 02. La Solución

## 1. Idea Elegida
**SubRuta** es una plataforma web/móvil que conecta a las agroindustrias generadoras de subproductos con productores compradores, integrando dos motores clave:
1. **Recomendador de Oportunidades Productivas:** Traduce el "residuo" de una industria en un "insumo" claro para el comprador según su actividad (ej. le avisa a un productor avícola o ganadero que a 120 km hay cascarilla de arroz, aserrín o pulpa cítrica ideal para su campo).
2. **Calculadora de Cubicaje (Peso/Volumen) + Match de Flete Calzado:** Cruza la densidad del subproducto ($m^3$ vs. toneladas) con las tarifas de referencia **FADEEAC/CATAC 2026** y busca camiones que regresan vacíos por esa ruta (**Flete Calzado**), reduciendo el costo logístico entre un **40% y un 50%**.

> **Versatilidad y Escalabilidad:** Aunque el lanzamiento y validación inicial se enfocan en los subproductos del **NEA** (madera, arroz, citrus y algodón), la arquitectura de cálculo de densidad y retornos es 100% adaptable a los subproductos de la **Región Pampeana** (burlanda, expeller) y **Cuyo** (orujo de uva, carozo, olivo).

---

## 2. Ideas Descartadas y Alerta de Sobreingeniería

| Idea Evaluada | Estado | Por qué se descartó o recortó |
| :--- | :--- | :--- |
| **1. Clasificado simple (tipo Facebook Marketplace)** | ❌ Descartada | Publicar solo la foto y el precio en planta no sirve: el comprador no sabe cuánto le cuesta el camión ni cuántas toneladas entran por volumen, y la venta se cae. |
| **2. "Uber de camiones" con rastreo GPS satelital en tiempo real** | ❌ Descartada por **SOBREINGENIERÍA** | Obligar a los camioneros a mantener un GPS prendido en vivo requiere años de adopción y gasta batería/datos en rutas sin señal. Alcanza con publicar **hojas de ruta de retorno programadas** (origen, destino, fecha y capacidad). |
| **3. Pagos 100% en criptomonedas con billetera propia del productor** | ❌ Descartada por **SOBREINGENIERÍA** | Un productor rural o fletero en Saladas no va a usar la app si tiene que comprar cripto o guardar frases semilla. La blockchain debe ser invisible. |
| **4. Marketplace con Calculadora Peso/Volumen + Flete Calzado + Recomendador** | ✅ **ELEGIDA** | Ataca directo el cuello de botella real (el costo del flete y el desconocimiento de la oferta) con una interfaz simple que funciona desde el primer día. |

---

## 3. ¿Qué necesita para funcionar?
* **Software:** Aplicación web adaptable a celular (responsive) con base de datos de densidades de subproductos, cuadro tarifario FADEEAC/CATAC actualizado y motor de emparejamiento de rutas.
* **Logística / Terceros:** Empresas de transporte locales, cooperativas y camioneros independientes asociados que cargan sus tramos de vuelta vacíos.
* **Garantía y Trazabilidad (Blockchain Invisible):** Registro inalterable del lote despachado y retención del pago hasta la entrega en destino.

---

## 4. Única Funcionalidad Central de la Demo y Flujo de Usuario (4 Pasos)

Para la demostración en vivo frente al jurado, nos enfocamos en **conectar dos productores, calcular el costo real del flete y destrabar una oportunidad que antes daba pérdida**:

1. **Paso 1 — Publicación del Subproducto y Ruta de Retorno:** Un aserradero o arrocera en Saladas publica su lote (ej. 15 tn de cascarilla/aserrín) indicando quién absorbe el flete (Comprador, Vendedor o 50/50). En paralelo, el sistema detecta un camión con **Flete Calzado** que vuelve vacío por esa ruta.
2. **Paso 2 — Descubrimiento de la Oportunidad:** Un productor avícola o ganadero entra a la app, selecciona su perfil productivo y ubicación, y recibe la recomendación del subproducto disponible con su aplicación práctica (cama de pollo / nutrición animal).
3. **Paso 3 — Calculadora Peso/Volumen vs. Tarifa FADEEAC en Vivo:** La pantalla calcula cuántos metros cúbicos ocupa el lote y muestra la comparación lado a lado:
   * ❌ *Con Flete Tradicional (Tarifa plena FADEEAC):* Negocio no rentable.
   * ✅ *Con Flete Calzado (-45% por retorno):* Ahorro inmediato y negocio rentable.
4. **Paso 4 — Reserva con Pago en Garantía y Certificado Circular:** El comprador confirma la operación en un clic; el dinero queda resguardado hasta la descarga y se emite el **Certificado de Trazabilidad Ambiental** para la industria vendedora.

---

## 5. Prueba con Usuarios (Validación del Prototipo)
* **¿A quién se lo mostraríamos primero?**
  1. Al dueño o encargado de un **aserradero / molino arrocero en Saladas** (vendedor).
  2. A un **productor avícola o ganadero de Corrientes** (comprador).
  3. A un **transportista local** que hace viajes al puerto o entre provincias (logística).
* **Las 4 preguntas clave de validación:**
  1. *Comprensión:* "¿Se entiende en 5 segundos cómo llegamos al precio final del camión según el peso y el volumen?"
  2. *Descubrimiento:* "¿Sabías que podías usar este subproducto cercano a este precio final puesto en tu campo?"
  3. *Confianza y Seguridad:* "¿Qué dato o garantía necesitás ver en esta pantalla para animarte a señar la carga con un productor y un camionero que no son de tu círculo de conocidos?"
  4. *Intención de pago:* "Si hoy te ahorramos un 40% en el flete de vuelta, ¿usarías este botón para cerrar el viaje pagando una comisión del 2,5%?"
