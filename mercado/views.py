"""
Controlador principal que une los 3 servicios modulares:
- Carril 2 (Joel): recomendador.py (Recomendador + ABM de Lotes y Camiones)
- Carril 3 (Giovanni): calculadora_flete.py (Motor Peso/Volumen + Tarifas FADEEAC 2026)
- Carril 4 (Julio): trazabilidad_blockchain.py (Reserva Escrow + Hedera Testnet)
"""
import json
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
    obtener_datos_mapa_productores,
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


def _parametros_modo_transporte(datos) -> dict:
    """
    Lee de la query string o del JSON los parámetros opcionales del modo de transporte:
    modo_transporte (VEHICULO_PROPIO, IDA, IDA_Y_VUELTA, VUELTA), tipo_vehiculo_propio,
    costo_km_vehiculo_propio_ars, toneladas_contraparte y densidad_contraparte_kg_m3.
    """
    def numero(clave):
        valor = datos.get(clave)
        return float(valor) if valor not in (None, "") else None

    return {
        "modo_transporte": str(datos.get("modo_transporte") or "VUELTA").upper().strip(),
        "tipo_vehiculo_propio": str(datos.get("tipo_vehiculo_propio") or "CAMION_CHASIS").upper().strip(),
        "costo_km_vehiculo_propio_ars": numero("costo_km_vehiculo_propio_ars"),
        "toneladas_contraparte": numero("toneladas_contraparte"),
        "densidad_contraparte_kg_m3": numero("densidad_contraparte_kg_m3"),
    }
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
    nodos_mapa_nea_json = obtener_datos_mapa_productores(
        lotes, localidad_actual_obj["codigo"]
    )

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
        "nodos_mapa_nea_json": nodos_mapa_nea_json,
    }
    return render(request, "mercado/index.html", context)


@require_http_methods(["GET"])
def api_cotizar_flete(request):
    """
    Endpoint JSON para calcular en vivo Peso/Volumen + Tarifa FADEEAC 2026 + Flete Calzado.
    """
    lote_id = request.GET.get("lote_id")
    camion_id = request.GET.get("camion_id")

    try:
        distancia_km = max(20, int(request.GET.get("distancia_km", 160)))
    except (ValueError, TypeError):
        distancia_km = 160

    try:
        lote = get_object_or_404(LoteSubproducto, id=lote_id)
    except Exception:
        return JsonResponse({"ok": False, "mensaje": "Lote no encontrado."}, status=404)

    camion = (
        CamionRetorno.objects.filter(id=camion_id).first()
        if camion_id
        else CamionRetorno.objects.filter(disponible=True).first()
    )

    try:
        toneladas_param = request.GET.get("toneladas")
        toneladas = max(0.5, float(toneladas_param)) if toneladas_param else float(lote.toneladas_disponibles)
    except (ValueError, TypeError):
        toneladas = float(lote.toneladas_disponibles)

    try:
        resultado = cotizar_operacion_completa(
            lote=lote,
            camion=camion,
            distancia_km=distancia_km,
            toneladas_solicitadas=toneladas,
            **_parametros_modo_transporte(request.GET),
        )
    except (ValueError, TypeError) as e:
        return JsonResponse({"ok": False, "mensaje": str(e)}, status=400)
    return JsonResponse({"ok": True, "cotizacion": resultado})


@csrf_exempt
@require_http_methods(["POST"])
def api_reservar_con_garantia(request):
    """
    Endpoint JSON para el Paso 4 de la Demo:
    Confirma la operación, descuenta el sublote del cupo disponible del lote,
    retiene el Pago en Garantía y genera el Certificado de Trazabilidad Ambiental
    anclado en Hedera Testnet y apto créditos nacionales de economía circular.
    """
    try:
        data = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"ok": False, "mensaje": "Cuerpo de solicitud JSON inválido."}, status=400)

    lote_id = data.get("lote_id")
    if not lote_id:
        return JsonResponse({"ok": False, "mensaje": "Falta el ID del lote."}, status=400)

    try:
        lote = LoteSubproducto.objects.get(id=lote_id)
    except LoteSubproducto.DoesNotExist:
        return JsonResponse({"ok": False, "mensaje": "El lote solicitado no existe."}, status=404)

    camion = (
        CamionRetorno.objects.filter(id=data.get("camion_id")).first()
        or CamionRetorno.objects.filter(disponible=True).first()
    )
    toneladas_lote_previas = float(lote.toneladas_disponibles)

    try:
        distancia_km = max(20, int(data.get("distancia_km", 160)))
        toneladas = max(0.5, float(data.get("toneladas", lote.toneladas_disponibles)))
    except (ValueError, TypeError):
        distancia_km = 160
        toneladas = float(lote.toneladas_disponibles)

    comprador_nombre = str(data.get("comprador_nombre", "Establecimiento Avícola / Ganadero (Goya)")).strip()[:150]
    localidad_destino = str(data.get("localidad_destino", "Goya, Corrientes")).strip()[:150]
    ventana_carga = str(data.get("ventana_carga", "Turno Confirmado (Sin demora de estadía)")).strip()[:100]

    try:
        cotizacion = cotizar_operacion_completa(
            lote=lote,
            camion=camion,
            distancia_km=distancia_km,
            toneladas_solicitadas=toneladas,
            **_parametros_modo_transporte(data),
        )
    except (ValueError, TypeError) as e:
        return JsonResponse({"ok": False, "mensaje": str(e)}, status=400)

    operacion = registrar_operacion_con_garantia(
        lote=lote,
        camion=camion,
        cotizacion=cotizacion,
        comprador_nombre=comprador_nombre,
        localidad_destino=localidad_destino,
    )

    es_sublote = float(toneladas) < toneladas_lote_previas
    restante = max(0.0, toneladas_lote_previas - float(toneladas))
    if restante >= 1.0:
        lote.toneladas_disponibles = round(restante, 1)
    else:
        lote.toneladas_disponibles = 15.0
    lote.save(update_fields=["toneladas_disponibles"])

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
                "toneladas_restantes_lote": round(float(lote.toneladas_disponibles), 1),
                "es_sublote": es_sublote,
                "credito_ambiental_elegible": True,
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
    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except (json.JSONDecodeError, UnicodeDecodeError):
        data = {}

    operacion_id = data.get("operacion_id")
    if operacion_id:
        try:
            op = liberar_pago_en_garantia(int(operacion_id))
        except (ValueError, TypeError):
            op = None
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
    try:
        data = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"ok": False, "mensaje": "JSON inválido."}, status=400)

    if not data.get("titulo") or not data.get("empresa_vendedora"):
        return JsonResponse({"ok": False, "mensaje": "Denominación y Razón Social son obligatorias."}, status=400)

    try:
        lote = crear_nuevo_lote(data)
        return JsonResponse(
            {
                "ok": True,
                "lote_id": lote.id,
                "mensaje": f"Lote '{lote.titulo}' publicado exitosamente en {lote.localidad_origen}.",
            }
        )
    except Exception as e:
        return JsonResponse({"ok": False, "mensaje": f"Error al crear lote: {str(e)}"}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def api_editar_lote(request, lote_id: int):
    """
    Modificación de un lote existente (ABM Vendedor).
    """
    try:
        data = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"ok": False, "mensaje": "JSON inválido."}, status=400)

    try:
        lote = editar_lote_existente(int(lote_id), data)
        return JsonResponse(
            {
                "ok": True,
                "lote_id": lote.id,
                "mensaje": f"Lote '{lote.titulo}' actualizado correctamente.",
            }
        )
    except LoteSubproducto.DoesNotExist:
        return JsonResponse({"ok": False, "mensaje": "Lote no encontrado."}, status=404)
    except Exception as e:
        return JsonResponse({"ok": False, "mensaje": f"Error al editar lote: {str(e)}"}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def api_eliminar_lote(request, lote_id: int):
    """
    Baja de un lote existente (ABM Vendedor).
    """
    try:
        titulo = eliminar_lote_existente(int(lote_id))
        return JsonResponse(
            {
                "ok": True,
                "mensaje": f"Lote '{titulo}' eliminado de la oferta activa.",
            }
        )
    except LoteSubproducto.DoesNotExist:
        return JsonResponse({"ok": False, "mensaje": "Lote no encontrado."}, status=404)
    except Exception as e:
        return JsonResponse({"ok": False, "mensaje": f"Error al eliminar lote: {str(e)}"}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def api_publicar_camion(request):
    """
    Alta de un nuevo camión con retorno vacío (ABM Logística).
    """
    try:
        data = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"ok": False, "mensaje": "JSON inválido."}, status=400)

    if not data.get("transportista"):
        return JsonResponse({"ok": False, "mensaje": "El nombre del transportista es obligatorio."}, status=400)

    try:
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
    except Exception as e:
        return JsonResponse({"ok": False, "mensaje": f"Error al registrar camión: {str(e)}"}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def api_editar_camion(request, camion_id: int):
    """
    Modificación de ruta, descuento o estado disponible de un camión (ABM Logística).
    """
    try:
        data = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"ok": False, "mensaje": "JSON inválido."}, status=400)

    try:
        camion = editar_camion_existente(int(camion_id), data)
        return JsonResponse(
            {
                "ok": True,
                "camion_id": camion.id,
                "disponible": camion.disponible,
                "mensaje": f"Unidad '{camion.transportista}' actualizada correctamente.",
            }
        )
    except CamionRetorno.DoesNotExist:
        return JsonResponse({"ok": False, "mensaje": "Camión no encontrado."}, status=404)
    except Exception as e:
        return JsonResponse({"ok": False, "mensaje": f"Error al editar camión: {str(e)}"}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def api_eliminar_camion(request, camion_id: int):
    """
    Baja de un camión de retorno (ABM Logística).
    """
    try:
        nombre = eliminar_camion_existente(int(camion_id))
        return JsonResponse(
            {
                "ok": True,
                "mensaje": f"Unidad '{nombre}' dada de baja de la bolsa de retornos.",
            }
        )
    except CamionRetorno.DoesNotExist:
        return JsonResponse({"ok": False, "mensaje": "Camión no encontrado."}, status=404)
    except Exception as e:
        return JsonResponse({"ok": False, "mensaje": f"Error al eliminar camión: {str(e)}"}, status=400)
