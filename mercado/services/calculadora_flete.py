"""
=============================================================================
MÓDULO CARRIL 3 (Responsable sugerido: Giovanni Piazza)
=============================================================================
Objetivo:
- Motor de cálculo de Flete por Peso vs. Volumen (Cubicaje en m3).
- Cruce con las Tarifas de Referencia 2026 (FADEEAC / CATAC / FeTrA / UBA).
- Aplicación del descuento por "Flete Calzado" (camión de retorno vacío: -45% por defecto).
- Comisión SubRuta del 2% sobre el Flete Calzado gestionado (+ comisión al vendedor).
- Cálculo de distribución del flete (Comprador, Vendedor o 50/50).
- Resultado económico de la operación: muestra cómo un negocio que da pérdida con
  flete tradicional pasa a ser rentable con Flete Calzado.

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

COMISION_FLETE_PCT = 2.0     # 2% de SubRuta sobre el Flete Calzado gestionado
COMISION_VENDEDOR_PCT = 2.5  # 2,5% sobre beneficio neto del vendedor (03-costos-y-ganancias)

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


def calcular_flete(
    toneladas: float,
    distancia_km: float,
    densidad_kg_m3: float,
    capacidad_tn: float = BASE_TONELADAS_CAMION_ESTANDAR,
    capacidad_m3: float = CAPACIDAD_M3_CAMION_ESTANDAR,
    descuento_retorno_pct: float = DESCUENTO_RETORNO_PCT_DEFAULT,
    comision_flete_pct: float = COMISION_FLETE_PCT,
) -> dict:
    """
    Motor matemático Peso/Volumen + Flete Calzado.

    1. Volumen: m3 = (toneladas * 1000) / densidad.
    2. Peso aforado: el camión se cobra por lo que ocupa. Su relación de aforo es
       capacidad_tn / capacidad_m3 (30 tn / 85 m3 = 353 kg/m3). Una carga más liviana
       que eso (cascarilla 165 kg/m3, aserrín 210 kg/m3) llena la caja antes de llegar
       al peso máximo, y el fletero la factura como si pesara m3 * 0,353 tn.
       Toneladas facturables = max(peso real, peso aforado).
    3. Flete tradicional = toneladas facturables * tarifa FADEEAC por tn.
    4. Flete Calzado = flete tradicional con -descuento_retorno_pct sobre la parte que
       entra en el camión de retorno; si la carga necesita más de un camión, el excedente
       viaja a tarifa plena.
    5. Comisión SubRuta = comision_flete_pct sobre el Flete Calzado.
    """
    toneladas = max(0.0, float(toneladas))
    densidad = max(50.0, float(densidad_kg_m3))
    capacidad_tn = max(1.0, float(capacidad_tn))
    capacidad_m3 = max(1.0, float(capacidad_m3))
    descuento = min(100.0, max(0.0, float(descuento_retorno_pct)))

    # 1. Cubicaje
    volumen_m3 = toneladas * 1000.0 / densidad
    uso_volumen = volumen_m3 / capacidad_m3  # 1.0 = un camión lleno por volumen
    uso_peso = toneladas / capacidad_tn      # 1.0 = un camión lleno por peso
    uso_camion = max(uso_volumen, uso_peso)
    camiones_necesarios = max(1, math.ceil(round(uso_camion, 6))) if toneladas > 0 else 0

    limitante = (
        "VOLUMEN (Carga liviana de alto cubicaje)"
        if uso_volumen >= uso_peso
        else "PESO (Carga densa / húmeda)"
    )

    # 2. Peso aforado y toneladas facturables
    factor_aforo_tn_m3 = capacidad_tn / capacidad_m3
    peso_aforado_tn = volumen_m3 * factor_aforo_tn_m3
    toneladas_facturables = max(toneladas, peso_aforado_tn)

    # 3. Flete tradicional (tarifa plena FADEEAC)
    tarifa_tn = calcular_tarifa_referencia_fadeeac_por_tn(distancia_km)
    flete_tradicional = toneladas_facturables * tarifa_tn

    # 4. Flete Calzado: el descuento aplica a la porción que entra en el camión de retorno
    fraccion_en_retorno = min(1.0, 1.0 / uso_camion) if uso_camion > 0 else 1.0
    factor_calzado = fraccion_en_retorno * (1.0 - descuento / 100.0) + (1.0 - fraccion_en_retorno)
    flete_calzado = flete_tradicional * factor_calzado
    ahorro = flete_tradicional - flete_calzado

    # 5. Comisión SubRuta sobre el flete gestionado
    comision_flete = flete_calzado * comision_flete_pct / 100.0

    return {
        "toneladas": round(toneladas, 2),
        "densidad_kg_m3": round(densidad),
        "volumen_m3": round(volumen_m3, 1),
        "ocupacion_volumen_pct": round(min(100.0, uso_volumen * 100.0), 1),
        "ocupacion_peso_pct": round(min(100.0, uso_peso * 100.0), 1),
        "camiones_necesarios": camiones_necesarios,
        "factor_limitante": limitante,
        "factor_aforo_kg_m3": round(factor_aforo_tn_m3 * 1000.0),
        "peso_aforado_tn": round(peso_aforado_tn, 2),
        "toneladas_facturables": round(toneladas_facturables, 2),
        "distancia_km": max(DISTANCIA_MINIMA_KM, int(distancia_km)),
        "tarifa_tn_fadeeac_ars": tarifa_tn,
        "flete_tradicional_ars": round(flete_tradicional, 2),
        "descuento_retorno_pct": descuento,
        "porcentaje_carga_en_retorno": round(fraccion_en_retorno * 100.0, 1),
        "flete_calzado_ars": round(flete_calzado, 2),
        "ahorro_logistico_ars": round(ahorro, 2),
        "ahorro_logistico_pct": round(ahorro / flete_tradicional * 100.0, 1) if flete_tradicional else 0.0,
        "comision_flete_pct": comision_flete_pct,
        "comision_flete_ars": round(comision_flete, 2),
        "flete_calzado_con_comision_ars": round(flete_calzado + comision_flete, 2),
    }


def cotizar_operacion_completa(
    lote: "LoteSubproducto",
    camion: Optional["CamionRetorno"],
    distancia_km: int,
    toneladas_solicitadas: float = None,
    precio_reemplazo_tn_ars: float = None,
) -> dict:
    """
    Cotización completa para la pantalla del Cotizador Logístico (Paso 3 de la Demo).
    Compara en vivo Flete Tradicional (tarifa plena FADEEAC) contra Flete Calzado + 2%
    de comisión SubRuta, y calcula si el negocio deja ganancia en cada caso.
    """
    if toneladas_solicitadas is None:
        toneladas_solicitadas = lote.toneladas_disponibles
    toneladas = max(0.0, min(float(toneladas_solicitadas), float(lote.toneladas_disponibles)))

    flete = calcular_flete(
        toneladas=toneladas,
        distancia_km=distancia_km,
        densidad_kg_m3=lote.densidad_kg_m3,
        capacidad_tn=float(camion.capacidad_max_tn) if camion else BASE_TONELADAS_CAMION_ESTANDAR,
        capacidad_m3=float(camion.capacidad_max_m3) if camion else CAPACIDAD_M3_CAMION_ESTANDAR,
        descuento_retorno_pct=(
            float(camion.descuento_retorno_pct) if camion else DESCUENTO_RETORNO_PCT_DEFAULT
        ),
    )
    flete_tradicional = flete["flete_tradicional_ars"]
    flete_calzado = flete["flete_calzado_ars"]
    comision_flete = flete["comision_flete_ars"]

    # Valor del subproducto en planta (lo que cobra el vendedor)
    subtotal_subproducto_ars = round(toneladas * float(lote.precio_tonelada_ars), 2)

    # Distribución del flete según quién lo absorbe (Comprador / Vendedor / 50-50)
    if lote.modalidad_flete == "VENDEDOR":
        parte_comprador = 0.0
        modalidad_texto = "100% absorbido por el Vendedor (Urgencia por liberar galpón)"
    elif lote.modalidad_flete == "COMPARTIDO_50_50":
        parte_comprador = 0.5
        modalidad_texto = "Flete Compartido 50% Comprador / 50% Vendedor"
    else:
        parte_comprador = 1.0
        modalidad_texto = "100% a cargo del Comprador"
    flete_paga_comprador_ars = round(flete_calzado * parte_comprador, 2)
    flete_paga_vendedor_ars = round(flete_calzado - flete_paga_comprador_ars, 2)

    # Comisiones de la plataforma
    beneficio_neto_vendedor_ars = round(max(0.0, subtotal_subproducto_ars - flete_paga_vendedor_ars), 2)
    comision_vendedor_ars = round(beneficio_neto_vendedor_ars * COMISION_VENDEDOR_PCT / 100.0, 2)
    comision_total_plataforma_ars = round(comision_vendedor_ars + comision_flete, 2)
    neto_vendedor_despues_comision_ars = round(beneficio_neto_vendedor_ars - comision_vendedor_ars, 2)

    # Totales de la operación puesta en destino (subproducto + flete, sin importar quién lo paga)
    total_con_flete_tradicional_ars = round(subtotal_subproducto_ars + flete_tradicional, 2)
    total_operacion_subruta_ars = round(
        subtotal_subproducto_ars + flete_calzado + comision_total_plataforma_ars, 2
    )
    # Lo que desembolsa el comprador en SubRuta (su parte del flete + comisión de gestión)
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
        veredicto = "De pérdida a rentable gracias al Flete Calzado"
    elif rentable_subruta:
        veredicto = "Rentable en ambos casos; el Flete Calzado aumenta el margen"
    elif rentable_tradicional:
        veredicto = "Rentable solo con flete tradicional (revisar comisión/descuento)"
    else:
        veredicto = "No rentable aún: acortar distancia o sumar volumen"

    def por_tn(valor):
        return round(valor / toneladas, 2) if toneladas else 0.0

    return {
        "lote_id": lote.id,
        "lote_titulo": lote.titulo,
        "empresa_vendedora": lote.empresa_vendedora,
        "origen": f"{lote.localidad_origen}, {lote.provincia}",
        "toneladas": flete["toneladas"],
        "densidad_kg_m3": flete["densidad_kg_m3"],
        "volumen_m3": flete["volumen_m3"],
        "ocupacion_volumen_pct": flete["ocupacion_volumen_pct"],
        "ocupacion_peso_pct": flete["ocupacion_peso_pct"],
        "camiones_necesarios": flete["camiones_necesarios"],
        "factor_limitante": flete["factor_limitante"],
        "factor_aforo_kg_m3": flete["factor_aforo_kg_m3"],
        "peso_aforado_tn": flete["peso_aforado_tn"],
        "toneladas_facturables": flete["toneladas_facturables"],
        "distancia_km": flete["distancia_km"],
        "tarifa_tn_fadeeac_ars": flete["tarifa_tn_fadeeac_ars"],
        "subtotal_subproducto_ars": subtotal_subproducto_ars,
        "flete_tradicional_fadeeac_ars": flete_tradicional,
        "incidencia_flete_tradicional_pct": incidencia_flete_tradicional_pct,
        "descuento_retorno_pct": flete["descuento_retorno_pct"],
        "porcentaje_carga_en_retorno": flete["porcentaje_carga_en_retorno"],
        "flete_calzado_ars": flete_calzado,
        "flete_calzado_con_comision_ars": flete["flete_calzado_con_comision_ars"],
        "ahorro_logistico_ars": flete["ahorro_logistico_ars"],
        "ahorro_logistico_pct": flete["ahorro_logistico_pct"],
        "modalidad_flete_codigo": lote.modalidad_flete,
        "modalidad_flete_texto": modalidad_texto,
        "flete_paga_comprador_ars": flete_paga_comprador_ars,
        "flete_paga_vendedor_ars": flete_paga_vendedor_ars,
        "beneficio_neto_vendedor_ars": beneficio_neto_vendedor_ars,
        "neto_vendedor_despues_comision_ars": neto_vendedor_despues_comision_ars,
        "comision_flete_pct": COMISION_FLETE_PCT,
        "comision_vendedor_pct": COMISION_VENDEDOR_PCT,
        "comision_vendedor_ars": comision_vendedor_ars,
        "comision_flete_ars": comision_flete,
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
        "camion_seleccionado": {
            "id": camion.id if camion else None,
            "transportista": camion.transportista if camion else "Retorno Estándar NEA",
            "ruta": f"{camion.origen_viaje} → {camion.destino_viaje}" if camion else "Ruta NEA",
            "pasa_por": camion.pasa_por if camion else lote.localidad_origen,
            "tipo_carroceria": camion.tipo_carroceria if camion else lote.carroceria_requerida,
        },
    }
