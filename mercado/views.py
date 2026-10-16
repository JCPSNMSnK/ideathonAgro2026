"""
Controlador principal que une los 3 servicios modulares:
- Carril 2 (Joel): recomendador.py (Recomendador + ABM de Lotes y Camiones)
- Carril 3 (Giovanni): calculadora_flete.py (Motor Peso/Volumen + Tarifas FADEEAC 2026)
- Carril 4 (Julio): trazabilidad_blockchain.py (Reserva Escrow + Hedera Testnet)
"""
import json
from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from mercado.models import LoteSubproducto, CamionRetorno, OperacionTrazabilidad
from mercado.services.seed_data import asegurar_datos_iniciales_nea
from mercado.services.recomendador import (
    PERFILES_PRODUCTIVOS,
    LOCALIDADES_COMPRADOR_NEA,
    PERFILES_USUARIO_DEMO,
    obtener_lotes_recomendados,
    obtener_camiones_con_oportunidades,
    obtener_perfil_detalle,
    obtener_localidad_detalle,
    crear_nuevo_lote,
    crear_nuevo_camion_retorno,
    editar_lote_existente,
    eliminar_lote_existente,
    editar_camion_existente,
    eliminar_camion_existente,
)
from mercado.services.calculadora_flete import cotizar_operacion_completa
from mercado.services.trazabilidad_blockchain import (
    registrar_operacion_con_garantia,
    liberar_pago_en_garantia,
)


def home_demo(request):
    """
    Renderiza la interfaz principal de la Demo.
    Si la base está vacía, precarga automáticamente los casos del NEA.
    """
    asegurar_datos_iniciales_nea()

    perfil_param = request.GET.get("perfil", "TODOS").upper().strip()
    localidad_param = request.GET.get("localidad", "GOYA").upper().strip()
    q = request.GET.get("q", "").strip()

    perfil_actual_obj = obtener_perfil_detalle(perfil_param)
    localidad_actual_obj = obtener_localidad_detalle(localidad_param)

    lotes = obtener_lotes_recomendados(
        perfil_comprador=perfil_actual_obj["codigo"],
        localidad_comprador=localidad_actual_obj["codigo"],
        busqueda_q=q,
    )
    camiones = obtener_camiones_con_oportunidades(lotes=lotes)
    todos_los_camiones = CamionRetorno.objects.all().order_by("-id")
    todos_los_lotes = LoteSubproducto.objects.all().order_by("-creado_en")
    certificados_recientes = OperacionTrazabilidad.objects.select_related("lote", "camion")[:8]

    context = {
        "perfiles": PERFILES_PRODUCTIVOS,
        "perfil_actual": perfil_actual_obj["codigo"],
        "perfil_actual_obj": perfil_actual_obj,
        "localidades_comprador": LOCALIDADES_COMPRADOR_NEA,
        "localidad_actual": localidad_actual_obj["codigo"],
        "localidad_actual_obj": localidad_actual_obj,
        "perfiles_usuario_demo": PERFILES_USUARIO_DEMO,
        "busqueda_q": q,
        "lotes": lotes,
        "todos_los_lotes": todos_los_lotes,
        "camiones": camiones,
        "todos_los_camiones": todos_los_camiones,
        "certificados_recientes": certificados_recientes,
        "db_mode_label": getattr(settings, "DB_MODE_LABEL", "Supabase / Local"),
    }
    return render(request, "mercado/index.html", context)


@require_http_methods(["GET"])
def api_cotizar_flete(request):
    """
    Endpoint JSON para calcular en vivo Peso/Volumen + Tarifa FADEEAC 2026 + Flete Calzado.
    """
    lote_id = request.GET.get("lote_id")
    camion_id = request.GET.get("camion_id")
    distancia_km = int(request.GET.get("distancia_km", 160))
    toneladas_param = request.GET.get("toneladas")

    lote = get_object_or_404(LoteSubproducto, id=lote_id)
    camion = (
        CamionRetorno.objects.filter(id=camion_id).first()
        if camion_id
        else CamionRetorno.objects.filter(disponible=True).first()
    )
    toneladas = float(toneladas_param) if toneladas_param else float(lote.toneladas_disponibles)

    resultado = cotizar_operacion_completa(
        lote=lote,
        camion=camion,
        distancia_km=distancia_km,
        toneladas_solicitadas=toneladas,
    )
    return JsonResponse({"ok": True, "cotizacion": resultado})


@csrf_exempt
@require_http_methods(["POST"])
def api_reservar_con_garantia(request):
    """
    Endpoint JSON para el Paso 4 de la Demo:
    Confirma la operación, descuenta toneladas del lote, retiene el Pago en Garantía
    y genera el Certificado de Trazabilidad Ambiental anclado en Hedera Testnet.
    """
    data = json.loads(request.body.decode("utf-8"))
    lote = get_object_or_404(LoteSubproducto, id=data["lote_id"])
    camion = (
        CamionRetorno.objects.filter(id=data.get("camion_id")).first()
        or CamionRetorno.objects.filter(disponible=True).first()
    )
    distancia_km = int(data.get("distancia_km", 160))
    toneladas = float(data.get("toneladas", lote.toneladas_disponibles))
    comprador_nombre = data.get("comprador_nombre", "Establecimiento Avícola / Ganadero (Goya)")
    localidad_destino = data.get("localidad_destino", "Goya, Corrientes")
    ventana_carga = data.get("ventana_carga", "Turno Confirmado (Sin demora de estadía)")

    cotizacion = cotizar_operacion_completa(
        lote=lote,
        camion=camion,
        distancia_km=distancia_km,
        toneladas_solicitadas=toneladas,
    )

    operacion = registrar_operacion_con_garantia(
        lote=lote,
        camion=camion,
        cotizacion=cotizacion,
        comprador_nombre=comprador_nombre,
        localidad_destino=localidad_destino,
    )

    return JsonResponse(
        {
            "ok": True,
            "certificado": {
                "id": operacion.id,
                "hash_certificado": operacion.hash_certificado,
                "red_blockchain": operacion.red_blockchain,
                "hashscan_url": getattr(
                    operacion, "hashscan_url", "https://hashscan.io/testnet/mainnet"
                ),
                "estado_garantia": operacion.estado_garantia,
                "vendedor": lote.empresa_vendedora,
                "origen": f"{lote.localidad_origen}, {lote.provincia}",
                "comprador": operacion.comprador_nombre,
                "destino": operacion.localidad_destino,
                "ventana_carga": ventana_carga,
                "subproducto": lote.titulo,
                "lote_id": lote.id,
                "toneladas": cotizacion["toneladas"],
                "stock_restante_lote_tn": getattr(
                    operacion, "toneladas_restantes_lote", float(lote.toneladas_disponibles)
                ),
                "toneladas_restantes_lote": getattr(
                    operacion, "toneladas_restantes_lote", float(lote.toneladas_disponibles)
                ),
                "volumen_m3": cotizacion["volumen_m3"],
                "transportista": camion.transportista if camion else "Flota Retorno NEA",
                "flete_tradicional_ars": cotizacion["flete_tradicional_fadeeac_ars"],
                "flete_calzado_ars": cotizacion["flete_calzado_ars"],
                "ahorro_logistico_ars": cotizacion["ahorro_logistico_ars"],
                "comision_plataforma_ars": cotizacion["comision_total_plataforma_ars"],
                "total_comprador_ars": cotizacion["total_comprador_subruta_ars"],
                "fecha": operacion.creado_en.strftime("%d/%m/%Y %H:%M hs"),
            },
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def api_liberar_garantia(request):
    """
    Endpoint JSON para confirmar la descarga del camión en destino y liberar el
    Pago en Garantía (Escrow) al vendedor y al transportista.
    """
    data = json.loads(request.body.decode("utf-8"))
    operacion_id = data.get("operacion_id")
    if operacion_id:
        op = liberar_pago_en_garantia(int(operacion_id))
    else:
        op = OperacionTrazabilidad.objects.first()
        if op:
            op = liberar_pago_en_garantia(op.id)

    if not op:
        return JsonResponse({"ok": False, "mensaje": "No se encontró la operación."}, status=404)

    return JsonResponse(
        {
            "ok": True,
            "operacion_id": op.id,
            "estado_garantia": op.estado_garantia,
            "mensaje": f"Descarga confirmada en {op.localidad_destino}. Fondos liberados al vendedor y al transportista.",
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def api_publicar_lote(request):
    """
    Alta de nuevo lote de subproducto.
    """
    data = json.loads(request.body.decode("utf-8"))
    lote = crear_nuevo_lote(data)
    return JsonResponse(
        {
            "ok": True,
            "lote_id": lote.id,
            "mensaje": f"Lote '{lote.titulo}' publicado exitosamente en {lote.localidad_origen}.",
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def api_editar_lote(request, lote_id: int):
    """
    Modificación de un lote existente (ABM Vendedor).
    """
    data = json.loads(request.body.decode("utf-8"))
    lote = editar_lote_existente(lote_id, data)
    return JsonResponse(
        {
            "ok": True,
            "lote_id": lote.id,
            "mensaje": f"Lote '{lote.titulo}' actualizado correctamente.",
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def api_eliminar_lote(request, lote_id: int):
    """
    Baja de un lote existente (ABM Vendedor).
    """
    titulo = eliminar_lote_existente(lote_id)
    return JsonResponse(
        {
            "ok": True,
            "mensaje": f"Lote '{titulo}' eliminado de la oferta activa.",
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def api_publicar_camion(request):
    """
    Alta de un nuevo camión con retorno vacío (ABM Logística).
    """
    data = json.loads(request.body.decode("utf-8"))
    camion = crear_nuevo_camion_retorno(data)
    return JsonResponse(
        {
            "ok": True,
            "camion_id": camion.id,
            "mensaje": (
                f"Camión de '{camion.transportista}' ({camion.origen_viaje} → {camion.destino_viaje}) "
                f"registrado con -{camion.descuento_retorno_pct:.0f}% de Flete Calzado."
            ),
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def api_editar_camion(request, camion_id: int):
    """
    Modificación de ruta, descuento o estado disponible de un camión (ABM Logística).
    """
    data = json.loads(request.body.decode("utf-8"))
    camion = editar_camion_existente(camion_id, data)
    return JsonResponse(
        {
            "ok": True,
            "camion_id": camion.id,
            "disponible": camion.disponible,
            "mensaje": f"Unidad '{camion.transportista}' actualizada correctamente.",
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def api_eliminar_camion(request, camion_id: int):
    """
    Baja de un camión de retorno (ABM Logística).
    """
    nombre = eliminar_camion_existente(camion_id)
    return JsonResponse(
        {
            "ok": True,
            "mensaje": f"Unidad '{nombre}' dada de baja de la bolsa de retornos.",
        }
    )
