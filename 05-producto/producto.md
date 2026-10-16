# 05. Producto, Pitch y Estrategia para el Jurado

## 1. Resumen en 4 Líneas (Estructura del Pitch)
* **Problema:** En Argentina sobran 40,2 millones de toneladas de biomasa residual al año, pero en el NEA el aserrín, la cascarilla de arroz y el descarte cítrico se desperdician porque ocupan mucho volumen y el flete común se come hasta el 80% del negocio.
* **Solución:** **SubRuta** conecta industrias y productores recomendando subproductos según su actividad y calculando el flete exacto por peso y volumen junto con camiones que vuelven vacíos (**Flete Calzado**, hasta 45% más barato).
* **Negocio:** Cobramos una comisión baja al éxito (**2,5% sobre el beneficio neto del vendedor + 2,5% sobre el Flete Calzado**), cubriendo todos nuestros costos con apenas 27 viajes al mes (**SUPUESTO**).
* **Tecnología y Confianza:** Usamos **Blockchain Invisible** para resguardar el pago en garantía entre desconocidos y emitir un Certificado de Trazabilidad Ambiental inalterable para la industria vendedora.

---

## 2. Pitch de 1 Minuto (Guion listo para leer en ~145 palabras)

> "En localidades como Saladas, acá en Corrientes, todos los días los aserraderos, las arroceras y las citrícolas acumulan montañas de aserrín, cascarilla de arroz y cáscara de citrus. A solo 150 kilómetros, hay productores avícolas y ganaderos que necesitan exactamente eso para cama de pollo o alimento animal.  
> ¿Por qué no se lo venden? Por dos motivos: primero, porque todo se maneja de boca en boca; y segundo, por **la trampa del flete**. Un camión de aserrín o cascarilla se llena de volumen con pocas toneladas, y pagar un flete tradicional de 2 millones y medio de pesos mata el negocio.  
> Por eso creamos **SubRuta**. Nuestra plataforma transforma descartes en negocios rentables. Primero, le recomienda al productor qué subproducto cercano le sirve. Segundo, nuestra calculadora cruza el peso y el volumen de la carga con las tarifas oficiales de FADEEAC y la conecta con un **Flete Calzado**: camiones que hoy vuelven vacíos y cobran hasta un **45% menos** por cubrir el gasoil de regreso.  
> Además, sacamos el mercado del manejo en negro: retenemos el pago en garantía hasta que el camión descarga y sellamos con **blockchain invisible** un Certificado de Trazabilidad Ambiental para la industria.  
> Cobramos apenas un 2,5% por punta sobre el negocio cerrado. Con **SubRuta**, el residuo deja de quemarse, el camión deja de volver vacío y el campo produce más barato."

---

## 3. Las 5 Preguntas Difíciles del Jurado (y cómo responderlas)

### Pregunta 1: *"¿Cómo evitan que el comprador y el vendedor se pasen el teléfono por afuera de la app para no pagarles la comisión?"*
* **Pista de respuesta:** "Por tres razones muy concretas: primero, nuestra comisión es bajísima (2,5%), nadie arriesga un viaje de más de un millón de pesos por ahorrarse 15 mil pesos. Segundo, el descuento del 45% está en el **Flete Calzado** que conseguimos nosotros, no en el contacto del aserradero. Y tercero, si van por afuera en negro, pierden el **Pago en Garantía** (si el camión no llega, pierden la plata) y la industria pierde el **Certificado de Trazabilidad Ambiental**."

### Pregunta 2: *"¿Cómo van a lograr que los camioneros carguen sus viajes de vuelta si en las rutas del NEA hay mala señal y no usan apps complejas?"*
* **Pista de respuesta:** "No obligamos al chofer a usar un GPS en vivo. Al principio trabajamos con las **empresas de transporte y cooperativas locales** que ya saben qué día vuelve vacío cada camión desde puerto o entre provincias, y habilitamos una carga rápida por WhatsApp/Web con solo 3 datos: origen, destino y fecha."

### Pregunta 3: *"¿Qué pasa si un camión de grano limpio no quiere cargar cáscara de citrus húmeda o aserrín porque le ensucia la batea?"*
* **Pista de respuesta:** "¡Excelente punto! Por eso nuestra calculadora no solo mide peso y volumen, sino también **compatibilidad de carrocería y humedad**. El sistema filtra automáticamente qué requiere batea, qué requiere jaula o semirremolque playo, y qué cargas van embolsadas o a granel."

### Pregunta 4: *"¿Por qué dicen que necesitan Blockchain? ¿No podrían hacer lo mismo con una base de datos normal?"*
* **Pista de respuesta:** "Para calcular el flete usamos una base de datos normal, porque ahí no hace falta blockchain. Donde sí aporta valor real es en el **Certificado de Disposición Final**: si una arrocera o citrícola quiere demostrar ante una auditoría ambiental o un banco que no quemó ni tiró 500 toneladas de residuos, un PDF emitido por nosotros se puede truchar; un sello de tiempo en **Hedera** cuesta 0,0001 dólares y es inalterable."

### Pregunta 5: *"¿Cómo arrancan mañana mismo si no tienen ni vendedores ni compradores cargados (el problema del huevo y la gallina)?"*
* **Pista de respuesta:** "Arrancamos por la punta que tiene la urgencia concentrada: las **plantas agroindustriales de un corredor específico** (como el nodo Saladas–Bella Vista–Goya en Corrientes). Con relevar solo 10 aserraderos, arroceras y jugueras que ya tienen sus propios camiones o fleteros habituales, ya tenemos la oferta y los primeros retornos listos para ofrecerle a los productores de la zona."

---

## 4. Riesgos Principales y Cómo Bajarlos

| Riesgo | Impacto | Cómo lo bajamos (Mitigación) |
| :--- | :--- | :--- |
| **1. Demoras en la carga o descarga en planta** *(FADEEAC calcula $223.180/día de estadía)* | Alto | La reserva en la app asigna una **ventana horaria de carga confirmada** por el aserradero/molino antes de que el camión se desvíe a buscar el subproducto. |
| **2. Diferencia de calidad o humedad del subproducto al llegar** | Medio | Al publicar el lote se exige foto real y ficha simple (seco/húmedo, a granel/embolsado). El pago queda retenido en garantía hasta que el comprador da el OK en destino. |
| **3. Baja adopción inicial de transportistas independientes** | Alto | Empezar cerrando acuerdos con **flotas de las propias agroindustrias** (que llevan madera o arroz y vuelven vacías) antes de depender de fleteros sueltos. |

---

## 5.3 Ideas para Mejorar la Solución (Próximos Pasos Post-Ideatón)
1. **Bot de WhatsApp para Fleteros y Productores:** Que el camionero pueda mandar un audio de WhatsApp diciendo *"Jueves vuelvo vacío de Rosario a Goya con batea"* y una IA liviana lo cargue directo como Flete Calzado en **SubRuta**.
2. **Compra Grupal ("Pool de Vecinos"):** Si un productor avícola chico necesita solo 5 toneladas de cascarilla de arroz y el camión carga 14 toneladas, que la app permita juntar a 2 o 3 productores vecinos de la misma ruta para llenar el camión y dividir el flete.
3. **Tablero de Impacto Ambiental (ESG) para las Industrias:** Un panel donde cada aserradero o citrícola vea en tiempo real cuántas toneladas de residuos reinsertó en el mercado y cuántas emisiones evitó, listo para presentar ante bancos para pedir créditos verdes.
