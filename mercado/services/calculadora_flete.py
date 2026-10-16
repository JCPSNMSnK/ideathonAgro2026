"""
=============================================================================
MÓDULO CARRIL 3 (Responsable sugerido: Giovanni Piazza)
=============================================================================
Objetivo:
- Motor de cálculo de Flete por Peso vs. Volumen (Cubicaje en m3).
- Cruce con las Tarifas de Referencia 2026 (FADEEAC / CATAC / FeTrA / UBA).
- Cuatro modos de transporte:
    * VEHICULO_PROPIO: camión particular, camioneta, furgón, acoplado... (costo operativo)
    * IDA: contratar un flete desde cero (tarifa plena FADEEAC)
    * IDA_Y_VUELTA: un mismo camión lleva un envío de ida y trae otro de vuelta;
      el viaje redondo se divide entre ambos envíos
    * VUELTA: "Flete Calzado" en camión de retorno vacío (-45% por defecto)
- Comisión de la plataforma del 2% sobre el flete gestionado (+ comisión al vendedor).
- Distribución del flete: Comprador, Vendedor, 50/50 o Mutuo Acuerdo (el vendedor
  publica en su lote qué porcentaje del flete paga).
- Resultado económico de la operación: muestra cómo un negocio que da pérdida con
  flete tradicional pasa a ser rentable.

El motor matemático (`calcular_flete`) es una función pura que solo recibe números,
así se puede probar sin base de datos. `cotizar_operacion_completa` la usa con los
modelos de Django y arma la respuesta que consume la pantalla del Cotizador.
"""
import math
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:  # Solo para tipado: el motor no necesita Django para calcular
    from mercado.models import LoteSubproducto, CamionRetorno

# =============================================================================
# CUADRO TARIFARIO DE REFERENCIA 2026 (FADEEAC / CATAC / FeTrA)
# Valores por tonelada transportada sobre base de equipo de 30 tn.
# DATO SIMULADO / SUPUESTO: no se encontró publicada la tabla oficial 2026 completa;
# se usan los puntos de referencia del relevamiento del equipo (01-problema):
# - 100 km: $25.389 / tn
# - 400 km: $83.740 / tn (~$2.512.200 el camión completo de 30 tn)
# - 1.500 km (NEA/NOA): $148.417 / tn
# - Estadía (demora >24h): $223.180 / día ($8.995 / hora)
# El punto "500 km: $77.755 / tn" del relevamiento se EXCLUYE porque es menor que el
# de 400 km (una tarifa por tonelada no puede bajar al aumentar la distancia): hay que
# re-verificarlo contra la fuente antes de usarlo.
# El punto 0 km ($9.500 / tn) es el costo fijo de carga/descarga (SUPUESTO).
# =============================================================================
TABLA_TARIFAS_FADEEAC_2026 = [
    # (distancia_km, ARS por tonelada)
    (0, 9500.0),
    (100, 25389.0),
    (400, 83740.0),
    (1500, 148417.0),
]
DISTANCIA_MINIMA_KM = 20

TARIFA_ESTADIA_DIARIA_ARS = 223180.0
BASE_TONELADAS_CAMION_ESTANDAR = 30.0
CAPACIDAD_M3_CAMION_ESTANDAR = 85.0
DESCUENTO_RETORNO_PCT_DEFAULT = 45.0  # Flete Calzado: -45% por camión de retorno

# Ida y vuelta combinado: el fletero cobra un viaje redondo con carga en ambos sentidos.
# La tarifa FADEEAC de ida ya cubre volver vacío; volver cargado agrega gasoil, desgaste
# y tiempo de carga. SUPUESTO: +10% sobre la tarifa de ida del tramo más cargado.
RECARGO_VUELTA_CARGADA_PCT = 10.0

COMISION_FLETE_PCT = 2.0     # 2% de la plataforma sobre el flete gestionado
COMISION_VENDEDOR_PCT = 2.5  # 2,5% sobre beneficio neto del vendedor (03-costos-y-ganancias)

# =============================================================================
# MODOS DE TRANSPORTE
# =============================================================================
MODO_VEHICULO_PROPIO = "VEHICULO_PROPIO"
MODO_IDA = "IDA"
MODO_IDA_Y_VUELTA = "IDA_Y_VUELTA"
MODO_VUELTA = "VUELTA"
MODOS_TRANSPORTE = {
    MODO_VEHICULO_PROPIO: "Vehículo propio (sin contratar flete)",
    MODO_IDA: "Flete de ida contratado desde cero (tarifa plena FADEEAC)",
    MODO_IDA_Y_VUELTA: "Ida y vuelta combinado (viaje redondo compartido entre dos envíos)",
    MODO_VUELTA: "Flete Calzado (camión de retorno vacío)",
}
MODO_DEFAULT = MODO_VUELTA

# Modos en los que la plataforma gestiona al transportista y cobra comisión de flete
MODOS_CON_COMISION_FLETE = {MODO_IDA, MODO_IDA_Y_VUELTA, MODO_VUELTA}

# =============================================================================
# VEHÍCULOS PROPIOS
# DATO SIMULADO / SUPUESTO: capacidades típicas y costo operativo por km recorrido
# (gasoil + cubiertas + mantenimiento, sin sueldo de chofer) a precios 2026.
# El vehículo propio hace el viaje redondo (ida vacío + vuelta cargado), así que
# cada viaje recorre 2 x distancia. Validar con productores reales.
# =============================================================================
VEHICULOS_PROPIOS = {
    "CAMIONETA": {
        "nombre": "Camioneta (caja de carga)",
        "capacidad_tn": 1.0, "capacidad_m3": 3.5, "costo_km_ars": 450.0,
    },
    "CAMIONETA_CON_ACOPLADO": {
        "nombre": "Camioneta con acoplado rural",
        "capacidad_tn": 2.5, "capacidad_m3": 9.0, "costo_km_ars": 620.0,
    },
    "FURGON": {
        "nombre": "Furgón utilitario",
        "capacidad_tn": 3.5, "capacidad_m3": 15.0, "costo_km_ars": 700.0,
    },
    "CAMION_CHASIS": {
        "nombre": "Camión chasis / balancín",
        "capacidad_tn": 8.0, "capacidad_m3": 30.0, "costo_km_ars": 1300.0,
    },
    "CAMION_CON_ACOPLADO": {
        "nombre": "Camión con acoplado",
        "capacidad_tn": 25.0, "capacidad_m3": 70.0, "costo_km_ars": 2300.0,
    },
    "SEMIRREMOLQUE": {
        "nombre": "Tractor con semirremolque propio",
        "capacidad_tn": 30.0, "capacidad_m3": 85.0, "costo_km_ars": 2500.0,
    },
}
VEHICULO_PROPIO_DEFAULT = "CAMION_CHASIS"

# =============================================================================
# MODALIDADES DE PAGO DEL FLETE (porcentaje que paga el vendedor)
# MUTUO_ACUERDO: el vendedor publica en su lote cuánto paga (porcentaje_flete_vendedor).
# Pensado para los fletes de ida y vuelta, donde las partes reparten el viaje.
# =============================================================================
PORCENTAJE_VENDEDOR_POR_MODALIDAD = {
    "COMPRADOR": 0.0,
    "COMPARTIDO_50_50": 50.0,
    "VENDEDOR": 100.0,
}

# =============================================================================
# PRECIO DE REEMPLAZO PUESTO EN DESTINO (ARS / tn)
# DATO SIMULADO / SUPUESTO: lo que el comprador pagaría hoy por el insumo que el
# subproducto reemplaza (viruta/cama comprada, forraje energético, leña, expeller...).
# Sirve para medir si el negocio deja ganancia o pérdida. Validar con compradores reales.
# =============================================================================
PRECIO_REEMPLAZO_TN_ARS = {
    "ARROZ": 85000.0,    # cama avícola comprada (viruta embolsada) puesta en granja
    "MADERA": 70000.0,   # cama / biomasa de reemplazo puesta en destino
    "CITRUS": 45000.0,   # equivalente energético en forraje húmedo
    "ALGODON": 125000.0, # suplemento proteico de reemplazo (expeller)
    "OTRO": 60000.0,
}


def calcular_tarifa_referencia_fadeeac_por_tn(distancia_km: float) -> float:
    """
    Tarifa de referencia 2026 por tonelada, interpolada linealmente entre los puntos
    de TABLA_TARIFAS_FADEEAC_2026 (continua y creciente con la distancia).
    Más allá del último punto se extrapola con la pendiente del último tramo.
    """
    km = max(DISTANCIA_MINIMA_KM, float(distancia_km))
    tabla = TABLA_TARIFAS_FADEEAC_2026
    for (km_a, tarifa_a), (km_b, tarifa_b) in zip(tabla, tabla[1:]):
        if km <= km_b:
            return round(tarifa_a + (km - km_a) * (tarifa_b - tarifa_a) / (km_b - km_a), 2)
    (km_a, tarifa_a), (km_b, tarifa_b) = tabla[-2], tabla[-1]
    return round(tarifa_b + (km - km_b) * (tarifa_b - tarifa_a) / (km_b - km_a), 2)


def calcular_cubicaje(
    toneladas: float,
    densidad_kg_m3: float,
    capacidad_tn: float = BASE_TONELADAS_CAMION_ESTANDAR,
    capacidad_m3: float = CAPACIDAD_M3_CAMION_ESTANDAR,
) -> dict:
    """
    Peso vs. Volumen de una carga en un vehículo dado.

    - Volumen: m3 = (toneladas * 1000) / densidad.
    - Peso aforado: el vehículo se cobra por lo que ocupa. Su relación de aforo es
      capacidad_tn / capacidad_m3 (30 tn / 85 m3 = 353 kg/m3). Una carga más liviana
      que eso (cascarilla 165 kg/m3, aserrín 210 kg/m3) llena la caja antes de llegar
      al peso máximo y se factura como si pesara m3 * 0,353 tn.
      Toneladas facturables = max(peso real, peso aforado).
    - Viajes necesarios: cuántas cargas completas hacen falta (por peso o por volumen).
    """
    toneladas = max(0.0, float(toneladas))
    densidad = max(50.0, float(densidad_kg_m3))
    capacidad_tn = max(0.1, float(capacidad_tn))
    capacidad_m3 = max(0.1, float(capacidad_m3))

    volumen_m3 = toneladas * 1000.0 / densidad
    uso_volumen = volumen_m3 / capacidad_m3  # 1.0 = vehículo lleno por volumen
    uso_peso = toneladas / capacidad_tn      # 1.0 = vehículo lleno por peso
    uso_vehiculo = max(uso_volumen, uso_peso)
    viajes = max(1, math.ceil(round(uso_vehiculo, 6))) if toneladas > 0 else 0

    factor_aforo_tn_m3 = capacidad_tn / capacidad_m3
    peso_aforado_tn = volumen_m3 * factor_aforo_tn_m3
    return {
        "toneladas": toneladas,
        "densidad_kg_m3": densidad,
        "volumen_m3": volumen_m3,
        "uso_volumen": uso_volumen,
        "uso_peso": uso_peso,
        "uso_vehiculo": uso_vehiculo,
        "viajes_necesarios": viajes,
        "factor_limitante": (
            "VOLUMEN (Carga liviana de alto cubicaje)"
            if uso_volumen >= uso_peso
            else "PESO (Carga densa / húmeda)"
        ),
        "factor_aforo_tn_m3": factor_aforo_tn_m3,
        "peso_aforado_tn": peso_aforado_tn,
        "toneladas_facturables": max(toneladas, peso_aforado_tn),
    }


def costo_flete_ida(toneladas_facturables: float, distancia_km: float) -> float:
    """Flete contratado desde cero: tarifa plena FADEEAC (ya incluye volver vacío)."""
    return toneladas_facturables * calcular_tarifa_referencia_fadeeac_por_tn(distancia_km)


def costo_flete_vuelta(
    flete_ida: float, uso_camion_retorno: float, descuento_retorno_pct: float
) -> tuple:
    """
    Flete Calzado: descuento de retorno sobre la parte de la carga que entra en el
    camión que vuelve vacío. Si la carga necesita más de un camión, el excedente viaja
    a tarifa plena. Devuelve (costo, fracción de la carga que va en el retorno).
    """
    descuento = min(100.0, max(0.0, float(descuento_retorno_pct)))
    fraccion = min(1.0, 1.0 / uso_camion_retorno) if uso_camion_retorno > 0 else 1.0
    factor = fraccion * (1.0 - descuento / 100.0) + (1.0 - fraccion)
    return flete_ida * factor, fraccion


def costo_flete_ida_y_vuelta(
    toneladas_facturables_propio: float,
    toneladas_facturables_contraparte: float,
    distancia_km: float,
    recargo_vuelta_cargada_pct: float = RECARGO_VUELTA_CARGADA_PCT,
) -> dict:
    """
    Un mismo camión lleva este envío en un sentido y el envío de la contraparte en el
    otro (A→B y B→A, misma distancia). Se paga un solo viaje redondo:

        viaje redondo = tarifa de ida del tramo más cargado * (1 + recargo vuelta cargada)

    y se reparte entre ambos envíos en proporción a sus toneladas facturables.
    Si las dos cargas son parecidas, cada una paga ~55% de lo que pagaría sola.
    """
    propio = max(0.0, float(toneladas_facturables_propio))
    contraparte = max(0.0, float(toneladas_facturables_contraparte))
    tarifa_tn = calcular_tarifa_referencia_fadeeac_por_tn(distancia_km)
    viaje_redondo = max(propio, contraparte) * tarifa_tn * (1.0 + recargo_vuelta_cargada_pct / 100.0)
    total_tn = propio + contraparte
    participacion = propio / total_tn if total_tn else 0.0
    return {
        "viaje_redondo_ars": viaje_redondo,
        "participacion_envio_pct": participacion * 100.0,
        "costo_envio_ars": viaje_redondo * participacion,
        "costo_contraparte_ars": viaje_redondo * (1.0 - participacion),
    }


def costo_vehiculo_propio(
    viajes: int, distancia_km: float, costo_km_ars: float
) -> float:
    """Vehículo propio: cada viaje recorre ida y vuelta (2 x distancia) a costo operativo."""
    km = max(DISTANCIA_MINIMA_KM, float(distancia_km))
    return viajes * 2.0 * km * float(costo_km_ars)


def calcular_flete(
    toneladas: float,
    distancia_km: float,
    densidad_kg_m3: float,
    modo: str = MODO_DEFAULT,
    capacidad_tn: float = BASE_TONELADAS_CAMION_ESTANDAR,
    capacidad_m3: float = CAPACIDAD_M3_CAMION_ESTANDAR,
    descuento_retorno_pct: float = DESCUENTO_RETORNO_PCT_DEFAULT,
    tipo_vehiculo_propio: str = VEHICULO_PROPIO_DEFAULT,
    costo_km_vehiculo_propio_ars: float = None,
    toneladas_contraparte: float = None,
    densidad_contraparte_kg_m3: float = None,
    comision_flete_pct: float = COMISION_FLETE_PCT,
) -> dict:
    """
    Motor matemático Peso/Volumen + costo de transporte según el modo elegido.

    - Siempre calcula el flete de IDA a tarifa plena FADEEAC como referencia
      ("flete tradicional") para mostrar el ahorro.
    - capacidad_tn / capacidad_m3 / descuento_retorno_pct: camión de retorno (VUELTA)
      o camión compartido (IDA_Y_VUELTA). La referencia de IDA usa el equipo estándar
      de 30 tn / 85 m3.
    - tipo_vehiculo_propio / costo_km_vehiculo_propio_ars: solo VEHICULO_PROPIO.
    - toneladas_contraparte / densidad_contraparte_kg_m3: carga del otro sentido en
      IDA_Y_VUELTA. Si no se informa, se supone una carga equivalente a la propia.
    """
    modo = (modo or MODO_DEFAULT).upper().strip()
    if modo not in MODOS_TRANSPORTE:
        raise ValueError(f"Modo de transporte desconocido: {modo}")

    km = max(DISTANCIA_MINIMA_KM, float(distancia_km))
    tarifa_tn = calcular_tarifa_referencia_fadeeac_por_tn(km)

    # Referencia: flete de ida contratado a tarifa plena con el equipo estándar
    cubicaje_ref = calcular_cubicaje(toneladas, densidad_kg_m3)
    flete_tradicional = costo_flete_ida(cubicaje_ref["toneladas_facturables"], km)

    detalle_modo = {}
    vehiculo = None
    if modo == MODO_VEHICULO_PROPIO:
        codigo = (tipo_vehiculo_propio or VEHICULO_PROPIO_DEFAULT).upper().strip()
        if codigo not in VEHICULOS_PROPIOS:
            raise ValueError(f"Tipo de vehículo propio desconocido: {codigo}")
        vehiculo = VEHICULOS_PROPIOS[codigo]
        costo_km = (
            float(costo_km_vehiculo_propio_ars)
            if costo_km_vehiculo_propio_ars is not None
            else vehiculo["costo_km_ars"]
        )
        cubicaje = calcular_cubicaje(
            toneladas, densidad_kg_m3, vehiculo["capacidad_tn"], vehiculo["capacidad_m3"]
        )
        costo_transporte = costo_vehiculo_propio(cubicaje["viajes_necesarios"], km, costo_km)
        detalle_modo = {
            "tipo_vehiculo_propio": codigo,
            "vehiculo_propio_nombre": vehiculo["nombre"],
            "costo_km_vehiculo_propio_ars": costo_km,
            "km_recorridos": round(cubicaje["viajes_necesarios"] * 2.0 * km, 1),
        }
    elif modo == MODO_IDA:
        cubicaje = cubicaje_ref
        costo_transporte = flete_tradicional
    elif modo == MODO_IDA_Y_VUELTA:
        cubicaje = calcular_cubicaje(toneladas, densidad_kg_m3, capacidad_tn, capacidad_m3)
        if toneladas_contraparte is None:
            facturables_contraparte = cubicaje["toneladas_facturables"]
        else:
            facturables_contraparte = calcular_cubicaje(
                toneladas_contraparte,
                densidad_contraparte_kg_m3 or densidad_kg_m3,
                capacidad_tn,
                capacidad_m3,
            )["toneladas_facturables"]
        reparto = costo_flete_ida_y_vuelta(
            cubicaje["toneladas_facturables"], facturables_contraparte, km
        )
        costo_transporte = reparto["costo_envio_ars"]
        detalle_modo = {
            "toneladas_facturables_contraparte": round(facturables_contraparte, 2),
            "viaje_redondo_ars": round(reparto["viaje_redondo_ars"], 2),
            "participacion_envio_pct": round(reparto["participacion_envio_pct"], 1),
            "costo_contraparte_ars": round(reparto["costo_contraparte_ars"], 2),
            "recargo_vuelta_cargada_pct": RECARGO_VUELTA_CARGADA_PCT,
        }
    else:  # MODO_VUELTA (Flete Calzado)
        cubicaje = calcular_cubicaje(toneladas, densidad_kg_m3, capacidad_tn, capacidad_m3)
        flete_ida_mismo_camion = costo_flete_ida(cubicaje["toneladas_facturables"], km)
        costo_transporte, fraccion = costo_flete_vuelta(
            flete_ida_mismo_camion, cubicaje["uso_vehiculo"], descuento_retorno_pct
        )
        detalle_modo = {
            "descuento_retorno_pct": min(100.0, max(0.0, float(descuento_retorno_pct))),
            "porcentaje_carga_en_retorno": round(fraccion * 100.0, 1),
        }

    ahorro = flete_tradicional - costo_transporte
    pct_comision = comision_flete_pct if modo in MODOS_CON_COMISION_FLETE else 0.0
    comision_flete = costo_transporte * pct_comision / 100.0

    resultado = {
        "modo_transporte": modo,
        "modo_transporte_texto": MODOS_TRANSPORTE[modo],
        "toneladas": round(cubicaje["toneladas"], 2),
        "densidad_kg_m3": round(cubicaje["densidad_kg_m3"]),
        "volumen_m3": round(cubicaje["volumen_m3"], 1),
        "ocupacion_volumen_pct": round(min(100.0, cubicaje["uso_volumen"] * 100.0), 1),
        "ocupacion_peso_pct": round(min(100.0, cubicaje["uso_peso"] * 100.0), 1),
        "camiones_necesarios": cubicaje["viajes_necesarios"],
        "viajes_necesarios": cubicaje["viajes_necesarios"],
        "factor_limitante": cubicaje["factor_limitante"],
        "factor_aforo_kg_m3": round(cubicaje["factor_aforo_tn_m3"] * 1000.0),
        "peso_aforado_tn": round(cubicaje["peso_aforado_tn"], 2),
        "toneladas_facturables": round(cubicaje["toneladas_facturables"], 2),
        "distancia_km": int(km),
        "tarifa_tn_fadeeac_ars": tarifa_tn,
        "flete_tradicional_ars": round(flete_tradicional, 2),
        "costo_transporte_ars": round(costo_transporte, 2),
        "ahorro_logistico_ars": round(ahorro, 2),
        "ahorro_logistico_pct": round(ahorro / flete_tradicional * 100.0, 1) if flete_tradicional else 0.0,
        "comision_flete_pct": pct_comision,
        "comision_flete_ars": round(comision_flete, 2),
        "costo_transporte_con_comision_ars": round(costo_transporte + comision_flete, 2),
        # Compatibilidad: claves usadas por la pantalla y el certificado actuales
        "descuento_retorno_pct": 0.0,
        "porcentaje_carga_en_retorno": 0.0,
        "flete_calzado_ars": round(costo_transporte, 2),
        "flete_calzado_con_comision_ars": round(costo_transporte + comision_flete, 2),
    }
    resultado.update(detalle_modo)
    return resultado


def resolver_porcentaje_flete_vendedor(lote: "LoteSubproducto") -> float:
    """
    Porcentaje del flete que paga el vendedor según la modalidad publicada en el lote.
    En MUTUO_ACUERDO es el valor que el vendedor declaró en su publicación.
    """
    modalidad = (lote.modalidad_flete or "COMPRADOR").upper()
    if modalidad == "MUTUO_ACUERDO":
        pct = getattr(lote, "porcentaje_flete_vendedor", None)
        if pct is None:
            raise ValueError("El lote es a mutuo acuerdo pero no publica qué porcentaje del flete paga el vendedor.")
        return min(100.0, max(0.0, float(pct)))
    return PORCENTAJE_VENDEDOR_POR_MODALIDAD.get(modalidad, 0.0)


def texto_modalidad_flete(modalidad: str, pct_vendedor: float) -> str:
    if modalidad == "VENDEDOR":
        return "100% absorbido por el Vendedor (Urgencia por liberar galpón)"
    if modalidad == "COMPARTIDO_50_50":
        return "Flete Compartido 50% Comprador / 50% Vendedor"
    if modalidad == "MUTUO_ACUERDO":
        return (
            f"Mutuo acuerdo: el Vendedor paga {pct_vendedor:g}% y el Comprador "
            f"{100.0 - pct_vendedor:g}% del flete"
        )
    return "100% a cargo del Comprador"


def cotizar_operacion_completa(
    lote: "LoteSubproducto",
    camion: Optional["CamionRetorno"],
    distancia_km: int,
    toneladas_solicitadas: float = None,
    precio_reemplazo_tn_ars: float = None,
    modo_transporte: str = MODO_DEFAULT,
    tipo_vehiculo_propio: str = VEHICULO_PROPIO_DEFAULT,
    costo_km_vehiculo_propio_ars: float = None,
    toneladas_contraparte: float = None,
    densidad_contraparte_kg_m3: float = None,
) -> dict:
    """
    Cotización completa para la pantalla del Cotizador Logístico (Paso 3 de la Demo).
    Compara en vivo el Flete Tradicional (ida a tarifa plena FADEEAC) contra el modo de
    transporte elegido + comisión de la plataforma, y calcula si el negocio deja ganancia.
    Incluye `comparativa_modos` con el costo de los cuatro modos para la misma carga.
    """
    if toneladas_solicitadas is None:
        toneladas_solicitadas = lote.toneladas_disponibles
    toneladas = max(0.0, min(float(toneladas_solicitadas), float(lote.toneladas_disponibles)))

    parametros_flete = dict(
        toneladas=toneladas,
        distancia_km=distancia_km,
        densidad_kg_m3=lote.densidad_kg_m3,
        capacidad_tn=float(camion.capacidad_max_tn) if camion else BASE_TONELADAS_CAMION_ESTANDAR,
        capacidad_m3=float(camion.capacidad_max_m3) if camion else CAPACIDAD_M3_CAMION_ESTANDAR,
        descuento_retorno_pct=(
            float(camion.descuento_retorno_pct) if camion else DESCUENTO_RETORNO_PCT_DEFAULT
        ),
        tipo_vehiculo_propio=tipo_vehiculo_propio,
        costo_km_vehiculo_propio_ars=costo_km_vehiculo_propio_ars,
        toneladas_contraparte=toneladas_contraparte,
        densidad_contraparte_kg_m3=densidad_contraparte_kg_m3,
    )
    flete = calcular_flete(modo=modo_transporte, **parametros_flete)
    flete_tradicional = flete["flete_tradicional_ars"]
    costo_transporte = flete["costo_transporte_ars"]
    comision_flete = flete["comision_flete_ars"]

    comparativa_modos = []
    for codigo_modo, texto_modo in MODOS_TRANSPORTE.items():
        f = flete if codigo_modo == flete["modo_transporte"] else calcular_flete(modo=codigo_modo, **parametros_flete)
        comparativa_modos.append({
            "modo": codigo_modo,
            "texto": texto_modo,
            "costo_transporte_ars": f["costo_transporte_ars"],
            "comision_flete_ars": f["comision_flete_ars"],
            "costo_total_ars": f["costo_transporte_con_comision_ars"],
            "ahorro_vs_tradicional_pct": f["ahorro_logistico_pct"],
            "viajes_necesarios": f["viajes_necesarios"],
        })
    modo_mas_barato = min(comparativa_modos, key=lambda m: m["costo_total_ars"])["modo"]

    # Valor del subproducto en planta (lo que cobra el vendedor)
    subtotal_subproducto_ars = round(toneladas * float(lote.precio_tonelada_ars), 2)

    # Distribución del costo de transporte según quién lo absorbe
    modalidad = (lote.modalidad_flete or "COMPRADOR").upper()
    pct_vendedor = resolver_porcentaje_flete_vendedor(lote)
    flete_paga_vendedor_ars = round(costo_transporte * pct_vendedor / 100.0, 2)
    flete_paga_comprador_ars = round(costo_transporte - flete_paga_vendedor_ars, 2)

    # Comisiones de la plataforma
    beneficio_neto_vendedor_ars = round(max(0.0, subtotal_subproducto_ars - flete_paga_vendedor_ars), 2)
    comision_vendedor_ars = round(beneficio_neto_vendedor_ars * COMISION_VENDEDOR_PCT / 100.0, 2)
    comision_total_plataforma_ars = round(comision_vendedor_ars + comision_flete, 2)
    neto_vendedor_despues_comision_ars = round(beneficio_neto_vendedor_ars - comision_vendedor_ars, 2)

    # Totales de la operación puesta en destino (subproducto + flete, sin importar quién lo paga)
    total_con_flete_tradicional_ars = round(subtotal_subproducto_ars + flete_tradicional, 2)
    total_operacion_subruta_ars = round(
        subtotal_subproducto_ars + costo_transporte + comision_total_plataforma_ars, 2
    )
    # Lo que desembolsa el comprador (su parte del flete + comisión de gestión del flete)
    total_comprador_subruta_ars = round(
        subtotal_subproducto_ars + flete_paga_comprador_ars + comision_flete, 2
    )

    incidencia_flete_tradicional_pct = (
        round(flete_tradicional / total_con_flete_tradicional_ars * 100.0, 1)
        if total_con_flete_tradicional_ars
        else 0.0
    )

    # Resultado del negocio: valor de reemplazo en destino vs. costo total puesto en destino
    if precio_reemplazo_tn_ars is None:
        precio_reemplazo_tn_ars = PRECIO_REEMPLAZO_TN_ARS.get(lote.categoria, PRECIO_REEMPLAZO_TN_ARS["OTRO"])
    valor_reemplazo_ars = round(toneladas * float(precio_reemplazo_tn_ars), 2)
    resultado_tradicional_ars = round(valor_reemplazo_ars - total_con_flete_tradicional_ars, 2)
    resultado_subruta_ars = round(valor_reemplazo_ars - total_operacion_subruta_ars, 2)
    rentable_tradicional = resultado_tradicional_ars > 0
    rentable_subruta = resultado_subruta_ars > 0
    if rentable_subruta and not rentable_tradicional:
        veredicto = "De pérdida a rentable con el modo de transporte elegido"
    elif rentable_subruta:
        veredicto = "Rentable en ambos casos; el modo elegido aumenta el margen"
    elif rentable_tradicional:
        veredicto = "Rentable solo con flete tradicional (revisar modo de transporte)"
    else:
        veredicto = "No rentable aún: acortar distancia, sumar volumen o compartir el viaje"

    def por_tn(valor):
        return round(valor / toneladas, 2) if toneladas else 0.0

    datos_flete = {k: v for k, v in flete.items() if k != "flete_tradicional_ars"}
    return {
        "lote_id": lote.id,
        "lote_titulo": lote.titulo,
        "empresa_vendedora": lote.empresa_vendedora,
        "origen": f"{lote.localidad_origen}, {lote.provincia}",
        **datos_flete,
        "subtotal_subproducto_ars": subtotal_subproducto_ars,
        "flete_tradicional_fadeeac_ars": flete_tradicional,
        "incidencia_flete_tradicional_pct": incidencia_flete_tradicional_pct,
        "comparativa_modos": comparativa_modos,
        "modo_mas_barato": modo_mas_barato,
        "modalidad_flete_codigo": modalidad,
        "modalidad_flete_texto": texto_modalidad_flete(modalidad, pct_vendedor),
        "porcentaje_flete_vendedor": pct_vendedor,
        "porcentaje_flete_comprador": round(100.0 - pct_vendedor, 2),
        "flete_paga_comprador_ars": flete_paga_comprador_ars,
        "flete_paga_vendedor_ars": flete_paga_vendedor_ars,
        "beneficio_neto_vendedor_ars": beneficio_neto_vendedor_ars,
        "neto_vendedor_despues_comision_ars": neto_vendedor_despues_comision_ars,
        "comision_vendedor_pct": COMISION_VENDEDOR_PCT,
        "comision_vendedor_ars": comision_vendedor_ars,
        "comision_total_plataforma_ars": comision_total_plataforma_ars,
        "total_con_flete_tradicional_ars": total_con_flete_tradicional_ars,
        "total_operacion_subruta_ars": total_operacion_subruta_ars,
        "total_comprador_subruta_ars": total_comprador_subruta_ars,
        "costo_tn_destino_tradicional_ars": por_tn(total_con_flete_tradicional_ars),
        "costo_tn_destino_subruta_ars": por_tn(total_operacion_subruta_ars),
        "precio_reemplazo_tn_ars": float(precio_reemplazo_tn_ars),
        "valor_reemplazo_ars": valor_reemplazo_ars,
        "resultado_tradicional_ars": resultado_tradicional_ars,
        "resultado_subruta_ars": resultado_subruta_ars,
        "negocio_rentable_tradicional": rentable_tradicional,
        "negocio_rentable_subruta": rentable_subruta,
        "veredicto": veredicto,
        "alerta_estadia_fadeeac_ars": TARIFA_ESTADIA_DIARIA_ARS,
        # Alias con los nombres que lee static/js/app.js (antes llegaban como undefined)
        "vendedor": lote.empresa_vendedora,
        "localidad_origen": lote.localidad_origen,
        "porcentaje_volumen_camion": flete["ocupacion_volumen_pct"],
        "porcentaje_peso_camion": flete["ocupacion_peso_pct"],
        "descuento_aplicado_pct": flete["ahorro_logistico_pct"],
        "modalidad_flete": texto_modalidad_flete(modalidad, pct_vendedor),
        "camion_seleccionado": {
            "id": camion.id if camion else None,
            "transportista": camion.transportista if camion else "Retorno Estándar NEA",
            "ruta": f"{camion.origen_viaje} → {camion.destino_viaje}" if camion else "Ruta NEA",
            "pasa_por": camion.pasa_por if camion else lote.localidad_origen,
            "tipo_carroceria": camion.tipo_carroceria if camion else lote.carroceria_requerida,
        },
    }
