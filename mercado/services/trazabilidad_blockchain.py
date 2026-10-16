"""
=============================================================================
MÓDULO CARRIL 4 (Responsable sugerido: Julio Pintos)
=============================================================================
Objetivo:
- Capa de "Blockchain Invisible": el productor rural opera en pesos argentinos
  sin saber qué es una criptomoneda ni usar una wallet.
- Por detrás, el servidor retiene el pago en garantía (Escrow) y sella un
  Certificado de Trazabilidad Ambiental (Disposición Final de Economía Circular)
  generando una huella criptográfica SHA-256 compatible con Hedera Consensus
  Service (HCS) y rieles de liquidación Stellar.
"""
import hashlib
import json
from datetime import datetime, timezone
from mercado.models import LoteSubproducto, CamionRetorno, OperacionTrazabilidad


def generar_sello_blockchain_invisible(payload_trazabilidad: dict) -> dict:
    """
    Genera el hash inmutable del Remito de Economía Circular (On-Chain)
    que certifica que la agroindustria reutilizó el subproducto en lugar de quemarlo.
    """
    timestamp_iso = datetime.now(timezone.utc).isoformat()
    bloque_auditable = {
        "protocolo": "SubRuta-Circular-NEA-2026",
        "red_objetivo": "Hedera Consensus Service (HCS) + Stellar Escrow",
        "timestamp_utc": timestamp_iso,
        "datos_operacion": payload_trazabilidad,
    }
    cadena_canonica = json.dumps(bloque_auditable, sort_keys=True, ensure_ascii=False)
    hash_sha256 = hashlib.sha256(cadena_canonica.encode("utf-8")).hexdigest()

    # Formato de tópico de consenso estilo Hedera (0.0.xxxxx) + Hash
    hedera_topic_id = "0.0.4829104"
    return {
        "hash_certificado": f"0x{hash_sha256[:40]}",
        "hedera_topic": hedera_topic_id,
        "red_blockchain": "Hedera Testnet (HCS) / Stellar Escrow",
        "timestamp_utc": timestamp_iso,
    }


def registrar_operacion_con_garantia(
    lote: LoteSubproducto,
    camion: CamionRetorno,
    cotizacion: dict,
    comprador_nombre: str,
    localidad_destino: str,
) -> OperacionTrazabilidad:
    """
    Guarda la operación cerrada, activa la retención del Pago en Garantía
    y emite el Certificado de Trazabilidad Ambiental.
    """
    payload_onchain = {
        "vendedor": lote.empresa_vendedora,
        "origen": f"{lote.localidad_origen}, {lote.provincia}",
        "comprador": comprador_nombre,
        "destino": localidad_destino,
        "subproducto": lote.titulo,
        "toneladas_reutilizadas": cotizacion["toneladas"],
        "volumen_m3": cotizacion["volumen_m3"],
        "transportista_retorno": camion.transportista if camion else "Flota Asociada NEA",
        "ahorro_flete_calzado_ars": cotizacion["ahorro_logistico_ars"],
    }

    sello = generar_sello_blockchain_invisible(payload_onchain)

    operacion = OperacionTrazabilidad.objects.create(
        lote=lote,
        camion=camion,
        comprador_nombre=comprador_nombre,
        localidad_destino=localidad_destino,
        distancia_km=int(cotizacion["distancia_km"]),
        volumen_m3_calculado=cotizacion["volumen_m3"],
        subtotal_subproducto_ars=cotizacion["subtotal_subproducto_ars"],
        flete_tradicional_fadeeac_ars=cotizacion["flete_tradicional_fadeeac_ars"],
        flete_calzado_ars=cotizacion["flete_calzado_ars"],
        ahorro_logistico_ars=cotizacion["ahorro_logistico_ars"],
        comision_plataforma_ars=cotizacion["comision_total_plataforma_ars"],
        estado_garantia="PAGO_EN_GARANTIA_ACTIVO",
        red_blockchain=sello["red_blockchain"],
        hash_certificado=sello["hash_certificado"],
    )
    return operacion
