"""
Controlador principal que une los 3 servicios modulares:
- Carril 2 (Joel): recomendador.py
- Carril 3 (Giovanni): calculadora_flete.py
- Carril 4 (Julio): trazabilidad_blockchain.py
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
    CASOS_DEMO_LANDING,
    obtener_perfil_por_codigo,
    obtener_localidad_por_codigo,
    obtener_lotes_recomendados,
    crear_nuevo_lote,
    crear_nuevo_camion_retorno,
    enriquecer_camiones_con_cargas,
)
from mercado.services.calculadora_flete import cotizar_operacion_completa
from mercado.services.trazabilidad_blockchain import registrar_operacion_con_garantia


def home_demo(request):
    """
    Renderiza la interfaz principal de la Demo (Landing + Roles Comprador, Vendedor y Logística).
    Si la base está vacía, precarga automáticamente los casos del NEA.
    """
    asegurar_datos_iniciales_nea()

    rol_activo = request.GET.get("rol", "inicio").lower().strip()
    if rol_activo not in ("inicio", "comprador", "vendedor", "logistica"):
        rol_activo = "inicio"

    perfil_actual = request.GET.get("perfil", "TODOS").upper()
    localidad_actual = request.GET.get("localidad", "GOYA").upper()
    q = request.GET.get("q", "").strip()

    perfil_actual_obj = obtener_perfil_por_codigo(perfil_actual)
    localidad_actual_obj = obtener_localidad_por_codigo(localidad_actual)

    lotes = obtener_lotes_recomendados(perfil_actual, localidad_actual, q)
    camiones = list(CamionRetorno.objects.filter(disponible=True))
    enriquecer_camiones_con_cargas(camiones, lotes)
    certificados_recientes = OperacionTrazabilidad.objects.select_related("lote", "camion")[:5]

    context = {
        "rol_activo": rol_activo,
        "casos_demo_landing": CASOS_DEMO_LANDING,
        "perfiles": PERFILES_PRODUCTIVOS,
        "perfil_actual": perfil_actual_obj["codigo"],
        "perfil_actual_obj": perfil_actual_obj,
        "localidades_comprador": LOCALIDADES_COMPRADOR_NEA,
        "localidad_actual": localidad_actual_obj["codigo"],
        "localidad_actual_obj": localidad_actual_obj,
        "busqueda_q": q,
        "lotes": lotes,
        "camiones": camiones,
        "certificados_recientes": certificados_recientes,
        "db_mode_label": getattr(settings, "DB_MODE_LABEL", "Supabase / Local"),
    }
    return render(request, "mercado/index.html", context)


@require_http_methods(["GET"])
def api_cotizar_flete(request):
    """
    Endpoint JSON para calcular en vivo Peso/Volumen + Tarifa FADEEAC 2026 + Flete Calzado.
    Parámetros: ?lote_id=1&camion_id=1&distancia_km=160&toneladas=14
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
    Confirma la operación, retiene el Pago en Garantía y genera el
    Certificado de Trazabilidad Ambiental (Blockchain Invisible).
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
                "estado_garantia": operacion.estado_garantia,
                "vendedor": lote.empresa_vendedora,
                "origen": f"{lote.localidad_origen}, {lote.provincia}",
                "comprador": operacion.comprador_nombre,
                "destino": operacion.localidad_destino,
                "subproducto": lote.titulo,
                "toneladas": cotizacion["toneladas"],
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
def api_publicar_lote(request):
    """
    Endpoint JSON para que el vendedor publique un nuevo subproducto en vivo durante la demo.
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
def api_publicar_camion(request):
    """
    Endpoint JSON para que un transportista o flota registre un nuevo camión con retorno vacío
    durante la demo desde la vista Logística / Camión.
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
