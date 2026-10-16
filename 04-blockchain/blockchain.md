# 04. Blockchain: ¿Sí o No?

## 1. Decisión: SÍ, bajo el modelo de "Blockchain Invisible"
Pasamos nuestro problema por el triple filtro de validación antes de decidir usar blockchain:

1. **¿Los actores no confían entre sí?** **SÍ.** Hoy el mercado de subproductos está encerrado en el "boca en boca" porque un productor no confía en transferirle dinero a una industria o a un camionero desconocido a 200 km.
2. **¿Hace falta trazabilidad o un registro que nadie pueda modificar?** **SÍ.** Las agroindustrias (arroz, forestal, citrus) enfrentan cada vez más controles por pasivos ambientales (quema de aserrín/cascarilla o vuelco de efluentes cítricos). Necesitan un **Certificado de Disposición Final y Economía Circular** inalterable que demuestre que sus toneladas de residuos se reutilizaron productivamente.
3. **¿Se mueve plata o derechos?** **SÍ.** Se mueve el pago del lote y del flete de retorno, que debe quedar retenido en garantía hasta que el camión descarga.

> **Por qué la llamamos "Blockchain Invisible":**  
> Ni el dueño del aserradero en Saladas, ni el productor ganadero, ni el chofer del camión tienen que saber qué es una criptomoneda, ni instalar una billetera virtual cripto (*wallet*), ni pagar comisiones de red (*gas*). Ellos operan 100% en pesos argentinos desde una pantalla web simple, y nuestro servidor registra las pruebas en la blockchain por detrás.

---

## 2. Tabla de Arquitectura: OFF-CHAIN vs. ON-CHAIN

| Va OFF-CHAIN (Servidor tradicional y Base de Datos) | Va ON-CHAIN (En la Blockchain - Inalterable) |
| :--- | :--- |
| • **Catálogo y Recomendador:** Publicaciones de lotes, fotos, ubicación y sugerencias por actividad productiva.<br>• **Motor de Cálculo Logístico:** Algoritmo de relación Peso/Volumen (cubicaje) y cruce con tarifas de referencia FADEEAC/CATAC 2026.<br>• **Bolsa de Retornos:** Rutas, fechas y capacidad disponible de camiones con *Flete Calzado*.<br>• **Datos Privados y Fiscales (KYC):** CUIT, teléfonos, patentes de camiones y datos bancarios de los usuarios. | • **Certificado de Trazabilidad Ambiental (*Hash* del Remito Circular):** Sello de tiempo inmutable que registra ID de operación, tipo de subproducto, toneladas recuperadas, kilómetros recorridos y huella de reutilización.<br>• **Estado de Garantía del Pago (*Escrow*):** Registro auditable de los 3 hitos del viaje: 1) Fondos depositados en garantía, 2) Carga despachada en planta, y 3) Descarga confirmada en destino y liberación del pago. |

---

## 3. Red Elegida y Estrategia de Implementación

### A. Redes compatibles del ecosistema
* **Para Trazabilidad Ambiental (Principal):** **Hedera** (*Hedera Consensus Service - HCS*). Permite sellar cada certificado de reutilización de subproductos en segundos, con un costo fijo de **$0,0001 USD por transacción** y siendo una red carbono-negativa (alineada 100% con el propósito ambiental del proyecto).
* **Para Pagos en Garantía (*Escrow* en evolución):** **Stellar**, ideal para liquidar pagos retenidos de forma instantánea y a costo casi nulo cuando se integran rieles de dinero digitalizado.

### B. Alcance realista en el Prototipo de la Ideathon vs. Producción
Siguiendo el principio de **"evitar la sobreingeniería y priorizar que el producto principal funcione de punta a punta"**:
1. **En la Demo de la Ideathon (Hoy):** El foco del desarrollo está puesto en el **motor de cálculo Peso/Volumen + Flete Calzado + Recomendador**. Al cerrar una operación, el prototipo genera en vivo el **Certificado Digital de Trazabilidad y Garantía** con su identificador único de auditoría (simulado o conectado vía API liviana a *Hedera Testnet*).
2. **En Producción (Fase 2):** Automatización completa del sellado en *Hedera Mainnet* para que las agroindustrias del NEA puedan descargar a fin de año su reporte auditado de toneladas reinsertadas en la bioeconomía circular (apto para certificaciones ambientales y futuros bonos de carbono).
