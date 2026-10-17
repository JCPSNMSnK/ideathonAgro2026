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
from mercado.services.georef_service import (
    buscar_localidades_oficiales,
    calcular_ruta_vial_osrm,
    geocodificar_localidad_argentina,
    obtener_provincias_oficiales,
)
from mercado.services.recomendador import (
    PERFILES_PRODUCTIVOS,
    LOCALIDADES_COMPRADOR_NEA,
    PERFILES_USUARIO_DEMO,
    obtener_lotes_recomendados,
    obtener_datos_mapa_productores,
    obtener_casos_demo_landing_dinamicos,
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
import re
import unicodedata


def _normalizar_identidad_actor(texto: str) -> str:
    """
    Normaliza nombres de empresas/actores eliminando tildes, paréntesis aclaratorios
    y sufijos societarios comunes (SRL, SA, etc.) para validar reglas de Ownership.
    """
    if not texto:
        return ""
    s = unicodedata.normalize("NFKD", str(texto)).encode("ascii", "ignore").decode("ascii").lower()
    s = re.sub(r"\([^)]*\)", " ", s)
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    palabras_ignorar = {"srl", "sa", "sas", "sh", "s", "r", "l", "a", "de", "del", "la", "el", "los", "las", "granja", "establecimiento", "transportes", "transporte", "molino", "molinos", "aserradero", "cooperativa", "coop"}
    tokens = [t for t in s.split() if t and t not in palabras_ignorar]
    return " ".join(tokens)


def _es_recurso_propio(propietario_recurso: str, actor_organizacion: str = "", actor_nombre: str = "") -> bool:
    """
    Verifica si el recurso (lote, camión u operación) pertenece al actor autenticado.
    """
    prop_norm = _normalizar_identidad_actor(propietario_recurso)
    if not prop_norm:
        return False

    for candidato in (actor_organizacion, actor_nombre):
        cand_norm = _normalizar_identidad_actor(candidato)
        if not cand_norm:
            continue
        if cand_norm == prop_norm or cand_norm in prop_norm or prop_norm in cand_norm:
            return True
    return False


def _serializar_operacion_certificado(op: OperacionTrazabilidad) -> dict:
    """
    Serializa un registro OperacionTrazabilidad para las vistas de certificados
    de Comprador (Mis Compras y Certificados), Vendedor (Mis Certificados Ambientales)
    y Logística (Mis Viajes Calzados).
    """
    lote = op.lote
    camion = op.camion
    densidad = float(getattr(lote, "densidad_kg_m3", 200) or 200)
    vol_m3 = float(op.volumen_m3_calculado or 0.0)
    toneladas_calc = round((vol_m3 * densidad) / 1000.0, 1) if vol_m3 > 0 else float(getattr(lote, "toneladas_disponibles", 14.0))
    toneladas_calc = max(1.0, toneladas_calc)

    subtotal = float(op.subtotal_subproducto_ars or 0.0)
    flete_calzado = float(op.flete_calzado_ars or 0.0)
    comision = float(op.comision_plataforma_ars or 0.0)
    total_comprador = round(subtotal + flete_calzado + (comision * 0.5), 0)
    co2_evitado_kg = int(round(toneladas_calc * 145))

    return {
        "id": op.id,
        "codigo": f"#MN-2026-{op.id:04d}",
        "hash_certificado": op.hash_certificado,
        "red_blockchain": op.red_blockchain,
        "hashscan_url": "https://hashscan.io/testnet/mainnet",
        "estado_garantia": op.estado_garantia,
        "vendedor": lote.empresa_vendedora if lote else "Molino Arrocero San Lorenzo",
        "origen": f"{lote.localidad_origen}, {lote.provincia}" if lote else "Saladas, Corrientes",
        "comprador": op.comprador_nombre,
        "destino": op.localidad_destino,
        "subproducto": lote.titulo if lote else "Subproducto Agroindustrial",
        "categoria": lote.categoria if lote else "ARROZ",
        "lote_id": lote.id if lote else None,
        "toneladas": toneladas_calc,
        "volumen_m3": round(vol_m3, 1),
        "transportista": camion.transportista if camion else "Retiro / Flota Regional",
        "distancia_km": op.distancia_km,
        "subtotal_subproducto_ars": subtotal,
        "flete_tradicional_ars": float(op.flete_tradicional_fadeeac_ars or 0.0),
        "flete_calzado_ars": flete_calzado,
        "ahorro_logistico_ars": float(op.ahorro_logistico_ars or 0.0),
        "comision_plataforma_ars": comision,
        "total_comprador_ars": total_comprador,
        "co2_evitado_kg": co2_evitado_kg,
        "credito_ambiental_elegible": True,
        "fecha": op.creado_en.strftime("%d/%m/%Y %H:%M hs") if op.creado_en else "16/10/2026 18:30 hs",
    }


def home_demo(request):
    """
    Renderiza la interfaz principal de la Demo.
    Si la base está vacía, precarga automáticamente los casos iniciales.
    """
    asegurar_datos_iniciales_nea()

    perfil_param = request.GET.get("perfil", "TODOS").upper().strip()
    localidad_param = request.GET.get("localidad", "GOYA").strip()
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
    certificados_recientes = list(OperacionTrazabilidad.objects.select_related("lote", "camion")[:24])
    certificados_json = json.dumps(
        [_serializar_operacion_certificado(op) for op in certificados_recientes],
        ensure_ascii=False,
    )
    nodos_mapa_nea_json = obtener_datos_mapa_productores(
        lotes, localidad_actual_obj["codigo"], camiones=camiones
    )
    casos_demo_landing_json = obtener_casos_demo_landing_dinamicos(
        lotes=todos_los_lotes, camiones=todos_los_camiones
    )
    provincias_oficiales = obtener_provincias_oficiales()

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
        "certificados_json": certificados_json,
        "nodos_mapa_nea_json": nodos_mapa_nea_json,
        "casos_demo_landing_json": casos_demo_landing_json,
        "provincias_oficiales": provincias_oficiales,
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
    Endpoint JSON para confirmar la descarga del camión en destino, firmar el
    Certificado Ambiental y liberar el Pago en Garantía (Escrow) al vendedor y al transportista.
    REGLA DE NEGOCIO: Solo el Comprador titular de la compra puede firmar la recepción
    y cerrar el certificado. Un vendedor o transportista jamás puede auto-liberarse el Escrow.
    """
    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except (json.JSONDecodeError, UnicodeDecodeError):
        data = {}

    actor_rol = str(data.get("actor_rol") or "").lower().strip()
    actor_organizacion = str(data.get("actor_organizacion") or "").strip()
    actor_nombre = str(data.get("actor_nombre") or "").strip()

    if actor_rol and actor_rol != "comprador":
        return JsonResponse(
            {
                "ok": False,
                "mensaje": (
                    "Acción bloqueada por regla de negocio: Solo el establecimiento Comprador "
                    "puede firmar la recepción en tranquera, cerrar el certificado y liberar el pago en garantía (Escrow)."
                ),
            },
            status=403,
        )

    operacion_id = data.get("operacion_id")
    if operacion_id:
        op_target = OperacionTrazabilidad.objects.select_related("lote", "camion").filter(id=int(operacion_id)).first()
    else:
        op_target = OperacionTrazabilidad.objects.select_related("lote", "camion").first()

    if not op_target:
        return JsonResponse({"ok": False, "mensaje": "No se encontró la operación."}, status=404)

    if (actor_organizacion or actor_nombre) and not _es_recurso_propio(
        op_target.comprador_nombre, actor_organizacion, actor_nombre
    ):
        return JsonResponse(
            {
                "ok": False,
                "mensaje": (
                    f"Permiso denegado: Esta operación pertenece a '{op_target.comprador_nombre}'. "
                    "Solo el comprador titular puede firmar la recepción y cerrar su certificado."
                ),
            },
            status=403,
        )

    op = liberar_pago_en_garantia(op_target.id)
    cert_serializado = _serializar_operacion_certificado(op)

    return JsonResponse(
        {
            "ok": True,
            "operacion_id": op.id,
            "estado_garantia": op.estado_garantia,
            "certificado": cert_serializado,
            "mensaje": (
                f"Recepción firmada en {op.localidad_destino} por {op.comprador_nombre}. "
                "Certificado Ambiental cerrado y fondos liberados al vendedor y al transportista."
            ),
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
    REGLA DE NEGOCIO: Un vendedor solo puede editar lotes de su propia planta/empresa.
    """
    try:
        data = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"ok": False, "mensaje": "JSON inválido."}, status=400)

    try:
        lote_actual = LoteSubproducto.objects.get(id=int(lote_id))
    except LoteSubproducto.DoesNotExist:
        return JsonResponse({"ok": False, "mensaje": "Lote no encontrado."}, status=404)

    actor_rol = str(data.get("actor_rol") or "").lower().strip()
    actor_org = str(data.get("actor_organizacion") or "").strip()
    actor_nom = str(data.get("actor_nombre") or "").strip()

    if actor_rol and actor_rol != "vendedor":
        return JsonResponse(
            {"ok": False, "mensaje": "Permiso denegado: Solo una cuenta de rol Vendedor puede editar lotes."},
            status=403,
        )

    if (actor_org or actor_nom) and not _es_recurso_propio(lote_actual.empresa_vendedora, actor_org, actor_nom):
        return JsonResponse(
            {
                "ok": False,
                "mensaje": (
                    f"Permiso denegado: El lote pertenece a '{lote_actual.empresa_vendedora}'. "
                    "Cada agroindustria vendedora solo puede modificar sus propios lotes."
                ),
            },
            status=403,
        )

    try:
        lote = editar_lote_existente(int(lote_id), data)
        return JsonResponse(
            {
                "ok": True,
                "lote_id": lote.id,
                "mensaje": f"Lote '{lote.titulo}' actualizado correctamente.",
            }
        )
    except Exception as e:
        return JsonResponse({"ok": False, "mensaje": f"Error al editar lote: {str(e)}"}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def api_eliminar_lote(request, lote_id: int):
    """
    Baja de un lote existente (ABM Vendedor).
    REGLA DE NEGOCIO: Un vendedor solo puede dar de baja lotes de su propia planta/empresa.
    """
    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except (json.JSONDecodeError, UnicodeDecodeError):
        data = {}

    try:
        lote_actual = LoteSubproducto.objects.get(id=int(lote_id))
    except LoteSubproducto.DoesNotExist:
        return JsonResponse({"ok": False, "mensaje": "Lote no encontrado."}, status=404)

    actor_rol = str(data.get("actor_rol") or "").lower().strip()
    actor_org = str(data.get("actor_organizacion") or "").strip()
    actor_nom = str(data.get("actor_nombre") or "").strip()

    if actor_rol and actor_rol != "vendedor":
        return JsonResponse(
            {"ok": False, "mensaje": "Permiso denegado: Solo una cuenta de rol Vendedor puede dar de baja lotes."},
            status=403,
        )

    if (actor_org or actor_nom) and not _es_recurso_propio(lote_actual.empresa_vendedora, actor_org, actor_nom):
        return JsonResponse(
            {
                "ok": False,
                "mensaje": (
                    f"Permiso denegado: El lote pertenece a '{lote_actual.empresa_vendedora}'. "
                    "No podés eliminar publicaciones de otra empresa."
                ),
            },
            status=403,
        )

    try:
        titulo = eliminar_lote_existente(int(lote_id))
        return JsonResponse(
            {
                "ok": True,
                "mensaje": f"Lote '{titulo}' eliminado de la oferta activa.",
            }
        )
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
    REGLA DE NEGOCIO: Una empresa de logística solo puede editar camiones de su propia flota.
    """
    try:
        data = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"ok": False, "mensaje": "JSON inválido."}, status=400)

    try:
        camion_actual = CamionRetorno.objects.get(id=int(camion_id))
    except CamionRetorno.DoesNotExist:
        return JsonResponse({"ok": False, "mensaje": "Camión no encontrado."}, status=404)

    actor_rol = str(data.get("actor_rol") or "").lower().strip()
    actor_org = str(data.get("actor_organizacion") or "").strip()
    actor_nom = str(data.get("actor_nombre") or "").strip()

    if actor_rol and actor_rol != "logistica":
        return JsonResponse(
            {"ok": False, "mensaje": "Permiso denegado: Solo una empresa de Logística puede modificar camiones."},
            status=403,
        )

    if (actor_org or actor_nom) and not _es_recurso_propio(camion_actual.transportista, actor_org, actor_nom):
        return JsonResponse(
            {
                "ok": False,
                "mensaje": (
                    f"Permiso denegado: Esta unidad pertenece a '{camion_actual.transportista}'. "
                    "Una empresa de logística no puede modificar camiones de otra empresa."
                ),
            },
            status=403,
        )

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
    except Exception as e:
        return JsonResponse({"ok": False, "mensaje": f"Error al editar camión: {str(e)}"}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def api_eliminar_camion(request, camion_id: int):
    """
    Baja de un camión de retorno (ABM Logística).
    REGLA DE NEGOCIO: Una empresa de logística solo puede dar de baja camiones de su propia flota.
    """
    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except (json.JSONDecodeError, UnicodeDecodeError):
        data = {}

    try:
        camion_actual = CamionRetorno.objects.get(id=int(camion_id))
    except CamionRetorno.DoesNotExist:
        return JsonResponse({"ok": False, "mensaje": "Camión no encontrado."}, status=404)

    actor_rol = str(data.get("actor_rol") or "").lower().strip()
    actor_org = str(data.get("actor_organizacion") or "").strip()
    actor_nom = str(data.get("actor_nombre") or "").strip()

    if actor_rol and actor_rol != "logistica":
        return JsonResponse(
            {"ok": False, "mensaje": "Permiso denegado: Solo una empresa de Logística puede dar de baja camiones."},
            status=403,
        )

    if (actor_org or actor_nom) and not _es_recurso_propio(camion_actual.transportista, actor_org, actor_nom):
        return JsonResponse(
            {
                "ok": False,
                "mensaje": (
                    f"Permiso denegado: Esta unidad pertenece a '{camion_actual.transportista}'. "
                    "Una empresa de logística no puede eliminar camiones de otra empresa."
                ),
            },
            status=403,
        )

    try:
        nombre = eliminar_camion_existente(int(camion_id))
        return JsonResponse(
            {
                "ok": True,
                "mensaje": f"Unidad '{nombre}' dada de baja de la bolsa de retornos.",
            }
        )
    except Exception as e:
        return JsonResponse({"ok": False, "mensaje": f"Error al eliminar camión: {str(e)}"}, status=400)


@require_http_methods(["GET"])
def api_georef_localidades(request):
    """
    Endpoint conectado a la API Oficial Georef de Datos Argentina
    (https://apis.datos.gob.ar/georef/api/localidades) para autocompletar localidades
    y obtener coordenadas oficiales del IGN (Instituto Geográfico Nacional) en todo el país.
    """
    q = (request.GET.get("q") or request.GET.get("nombre") or "").strip()
    provincia = (request.GET.get("provincia") or "").strip() or None
    try:
        max_results = max(1, min(25, int(request.GET.get("max", 12))))
    except (ValueError, TypeError):
        max_results = 12

    localidades = buscar_localidades_oficiales(
        query=q,
        provincia=provincia,
        max_results=max_results,
    )
    return JsonResponse(
        {
            "ok": True,
            "fuente": "API Georef Datos Argentina (apis.datos.gob.ar / IGN)",
            "cantidad": len(localidades),
            "localidades": localidades,
        }
    )


@require_http_methods(["GET"])
def api_georef_ruta_vial(request):
    """
    Endpoint de ruteo vial real y geocodificación nacional:
    Resuelve coordenadas oficiales vía Georef Argentina (IGN) si se pasan nombres de
    localidades y calcula la ruta terrestre real (km viales, duración y polilínea GeoJSON)
    usando el motor público OSRM (https://router.project-osrm.org).
    """
    origen_texto = (request.GET.get("origen") or "").strip()
    destino_texto = (request.GET.get("destino") or "").strip()

    try:
        if request.GET.get("origen_lat") and request.GET.get("origen_lng"):
            lat1 = float(request.GET["origen_lat"])
            lng1 = float(request.GET["origen_lng"])
            nodo_origen = {"nombre": origen_texto or "Origen", "lat": lat1, "lng": lng1}
        else:
            nodo_origen = geocodificar_localidad_argentina(origen_texto or "Saladas, Corrientes")
            lat1, lng1 = float(nodo_origen["lat"]), float(nodo_origen["lng"])

        if request.GET.get("destino_lat") and request.GET.get("destino_lng"):
            lat2 = float(request.GET["destino_lat"])
            lng2 = float(request.GET["destino_lng"])
            nodo_destino = {"nombre": destino_texto or "Destino", "lat": lat2, "lng": lng2}
        else:
            nodo_destino = geocodificar_localidad_argentina(destino_texto or "Goya, Corrientes")
            lat2, lng2 = float(nodo_destino["lat"]), float(nodo_destino["lng"])
    except (ValueError, TypeError) as e:
        return JsonResponse({"ok": False, "mensaje": f"Coordenadas inválidas: {e}"}, status=400)

    ruta = calcular_ruta_vial_osrm(lat1, lng1, lat2, lng2, incluir_geometria=True)
    return JsonResponse(
        {
            "ok": True,
            "origen": nodo_origen,
            "destino": nodo_destino,
            "ruta": ruta,
        }
    )
