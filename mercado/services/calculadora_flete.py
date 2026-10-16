"""
=============================================================================
MÓDULO CARRIL 3 (Responsable sugerido: Giovanni Piazza)
=============================================================================
Objetivo:
- Motor de cálculo de Flete por Peso vs. Volumen (Cubicaje en m3).
- Cruce con las Tarifas de Referencia Oficiales 2026 (FADEEAC / CATAC / FeTrA / UBA).
- Aplicación del descuento por "Flete Calzado" (camiones de retorno vacío: -40% a -50%).
- Cálculo de distribución del flete (Comprador, Vendedor o 50/50) y comisión de SubRuta (2,5%).
"""
from mercado.models import LoteSubproducto, CamionRetorno

# =============================================================================
# CUADRO TARIFARIO DE REFERENCIA 2026 (FADEEAC / CATAC / FeTrA)
# Valores auditados por tonelada transportada sobre base de equipo de 30 tn:
# - 100 km: $25.389 / tn
# - 400 km: $83.740 / tn (~$2.512.200 el camión completo de 30 tn)
# - 500 km: $77.755 / tn
# - 1.500 km (NEA/NOA): $148.417 / tn
# - Estadía (demora >24h): $223.180 / día ($8.995 / hora)
# =============================================================================
TARIFA_ESTADIA_DIARIA_ARS = 223180.0
BASE_TONELADAS_CAMION_ESTANDAR = 30.0
CAPACIDAD_M3_CAMION_ESTANDAR = 85.0
COMISION_VENDEDOR_PCT = 2.5  # 2,5% sobre beneficio neto del vendedor
COMISION_FLETE_PCT = 2.5     # 2,5% por gestión del Flete Calzado


def calcular_tarifa_referencia_fadeeac_por_tn(distancia_km: int) -> float:
    """
    Interpola la tarifa oficial de referencia 2026 (FADEEAC / CATAC / FeTrA)
    según la distancia en kilómetros.
    """
    km = max(20, int(distancia_km))
    if km <= 100:
        # Escala corta basada en $25.389 a 100 km
        return round(9500.0 + (km * 158.89), 2)
    elif km <= 450:
        # Escala media basada en $83.740 a 400 km
        return round(25389.0 + ((km - 100) * 194.50), 2)
    else:
        # Escala larga hacia los 1.500 km ($148.417/tn)
        return round(83740.0 + ((km - 400) * 58.80), 2)


def cotizar_operacion_completa(
    lote: LoteSubproducto,
    camion: CamionRetorno,
    distancia_km: int,
    toneladas_solicitadas: float = None,
) -> dict:
    """
    Calcula el costo logístico exacto considerando la trampa del volumen vs. peso:
    En subproductos livianos (aserrín 210 kg/m3 o cascarilla de arroz 165 kg/m3),
    el camión llena sus 85-90 m3 con 12 a 15 toneladas.
    Un flete tradicional cobra el viaje completo (base 30 tn).
    Con SubRuta + Flete Calzado, se optimiza el cubicaje y se aplica el descuento de retorno.
    """
    toneladas = float(toneladas_solicitadas or lote.toneladas_disponibles)
    densidad = max(50, int(lote.densidad_kg_m3))

    # 1. Cálculo de Volumen (Cubicaje en m3)
    kilos_totales = toneladas * 1000.0
    volumen_m3 = round(kilos_totales / densidad, 1)

    cap_m3_camion = float(camion.capacidad_max_m3) if camion else CAPACIDAD_M3_CAMION_ESTANDAR
    cap_tn_camion = float(camion.capacidad_max_tn) if camion else BASE_TONELADAS_CAMION_ESTANDAR

    ocupacion_volumen_pct = min(100.0, round((volumen_m3 / cap_m3_camion) * 100.0, 1))
    ocupacion_peso_pct = min(100.0, round((toneladas / cap_tn_camion) * 100.0, 1))

    limitante = (
        "VOLUMEN (Carga liviana de alto cubicaje)"
        if ocupacion_volumen_pct >= ocupacion_peso_pct
        else "PESO (Carga densa / húmeda)"
    )

    # 2. Valor del subproducto en planta (Beneficio bruto del vendedor)
    subtotal_subproducto_ars = round(toneladas * float(lote.precio_tonelada_ars), 2)

    # 3. Costo con Flete Tradicional ("Flete Muerto" a tarifa plena FADEEAC por camión)
    tarifa_tn_fadeeac = calcular_tarifa_referencia_fadeeac_por_tn(distancia_km)
    # Si ocupa más del 65% del volumen del camión (caso cascarilla/aserrín), el fletero
    # tradicional cobra el viaje de equipo completo (base 30 tn)
    toneladas_facturadas_tradicional = max(
        toneladas,
        BASE_TONELADAS_CAMION_ESTANDAR * (ocupacion_volumen_pct / 100.0),
    )
    flete_tradicional_fadeeac_ars = round(toneladas_facturadas_tradicional * tarifa_tn_fadeeac, 2)

    # 4. Costo con "Flete Calzado" en SubRuta (Descuento de retorno 40%-50% + ajuste real)
    descuento_retorno_pct = float(camion.descuento_retorno_pct) if camion else 45.0
    # En plantas de subproductos se negocia sobre el 80% de referencia menos el descuento de retorno calzado
    factor_retorno = (1.0 - (descuento_retorno_pct / 100.0)) * 0.85
    flete_calzado_ars = round(flete_tradicional_fadeeac_ars * factor_retorno, 2)

    ahorro_logistico_ars = round(flete_tradicional_fadeeac_ars - flete_calzado_ars, 2)

    # 5. Distribución del Flete según quién lo absorbe (Comprador / Vendedor / 50-50)
    if lote.modalidad_flete == "VENDEDOR":
        flete_paga_comprador_ars = 0.0
        flete_paga_vendedor_ars = flete_calzado_ars
        modalidad_texto = "100% absorbido por el Vendedor (Urgencia por liberar galpón)"
    elif lote.modalidad_flete == "COMPARTIDO_50_50":
        flete_paga_comprador_ars = round(flete_calzado_ars * 0.5, 2)
        flete_paga_vendedor_ars = round(flete_calzado_ars * 0.5, 2)
        modalidad_texto = "Flete Compartido 50% Comprador / 50% Vendedor"
    else:
        flete_paga_comprador_ars = flete_calzado_ars
        flete_paga_vendedor_ars = 0.0
        modalidad_texto = "100% a cargo del Comprador"

    # 6. Comisión de la plataforma (2,5% sobre beneficio neto del vendedor + 2,5% gestión flete)
    beneficio_neto_vendedor_ars = max(0.0, subtotal_subproducto_ars - flete_paga_vendedor_ars)
    comision_vendedor_ars = round(beneficio_neto_vendedor_ars * (COMISION_VENDEDOR_PCT / 100.0), 2)
    comision_flete_ars = round(flete_calzado_ars * (COMISION_FLETE_PCT / 100.0), 2)
    comision_total_plataforma_ars = round(comision_vendedor_ars + comision_flete_ars, 2)

    # 7. Totales finales puesto en destino
    total_con_flete_tradicional_ars = round(subtotal_subproducto_ars + flete_tradicional_fadeeac_ars, 2)
    total_comprador_subruta_ars = round(
        subtotal_subproducto_ars + flete_paga_comprador_ars + comision_flete_ars, 2
    )

    incidencia_flete_tradicional_pct = round(
        (flete_tradicional_fadeeac_ars / total_con_flete_tradicional_ars) * 100.0, 1
    )

    return {
        "lote_id": lote.id,
        "lote_titulo": lote.titulo,
        "empresa_vendedora": lote.empresa_vendedora,
        "origen": f"{lote.localidad_origen}, {lote.provincia}",
        "toneladas": toneladas,
        "densidad_kg_m3": densidad,
        "volumen_m3": volumen_m3,
        "ocupacion_volumen_pct": ocupacion_volumen_pct,
        "ocupacion_peso_pct": ocupacion_peso_pct,
        "factor_limitante": limitante,
        "distancia_km": distancia_km,
        "tarifa_tn_fadeeac_ars": tarifa_tn_fadeeac,
        "subtotal_subproducto_ars": subtotal_subproducto_ars,
        "flete_tradicional_fadeeac_ars": flete_tradicional_fadeeac_ars,
        "incidencia_flete_tradicional_pct": incidencia_flete_tradicional_pct,
        "descuento_retorno_pct": descuento_retorno_pct,
        "flete_calzado_ars": flete_calzado_ars,
        "ahorro_logistico_ars": ahorro_logistico_ars,
        "modalidad_flete_codigo": lote.modalidad_flete,
        "modalidad_flete_texto": modalidad_texto,
        "flete_paga_comprador_ars": flete_paga_comprador_ars,
        "flete_paga_vendedor_ars": flete_paga_vendedor_ars,
        "beneficio_neto_vendedor_ars": beneficio_neto_vendedor_ars,
        "comision_vendedor_ars": comision_vendedor_ars,
        "comision_flete_ars": comision_flete_ars,
        "comision_total_plataforma_ars": comision_total_plataforma_ars,
        "total_con_flete_tradicional_ars": total_con_flete_tradicional_ars,
        "total_comprador_subruta_ars": total_comprador_subruta_ars,
        "alerta_estadia_fadeeac_ars": TARIFA_ESTADIA_DIARIA_ARS,
        "camion_seleccionado": {
            "id": camion.id if camion else None,
            "transportista": camion.transportista if camion else "Retorno Estándar NEA",
            "ruta": f"{camion.origen_viaje} → {camion.destino_viaje}" if camion else "Ruta NEA",
            "pasa_por": camion.pasa_por if camion else lote.localidad_origen,
            "tipo_carroceria": camion.tipo_carroceria if camion else lote.carroceria_requerida,
        },
    }
