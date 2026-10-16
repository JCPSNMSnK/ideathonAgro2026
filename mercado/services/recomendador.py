"""
=============================================================================
MÓDULO CARRIL 2 (Responsable: Joel Marcori)
=============================================================================
Objetivo:
- Filtrar y recomendar subproductos según el perfil productivo del comprador
  (Avícola, Ganadería/Feedlot, Biomasa/Energía, Vivero/Sustrato) y su localidad.
- Calcular distancias logísticas estimadas entre nodos industriales del NEA y
  el establecimiento del comprador.
- Explicar al productor por qué le conviene cada lote y cómo impacta el cubicaje (m3).
- Permitir la publicación rápida de nuevos lotes con inferencia inteligente por rubro.
"""
from typing import Dict, List, Optional
from django.db.models import Q
from mercado.models import LoteSubproducto

PERFILES_PRODUCTIVOS: List[Dict[str, str]] = [
    {
        "codigo": "TODOS",
        "nombre": "Todas las actividades",
        "descripcion": "Vista completa de subproductos disponibles en molinos, aserraderos, jugueras y desmotadoras del NEA.",
    },
    {
        "codigo": "AVICOLA",
        "nombre": "Producción Avícola (Cama de Galpón)",
        "descripcion": "Cascarilla de arroz y aserrín o viruta seca de pino con alta absorción de humedad para galpones de pollos y ponedoras.",
    },
    {
        "codigo": "GANADERO",
        "nombre": "Ganadería y Feedlot (Fibra y Nutrición)",
        "descripcion": "Bagazo húmedo de citrus y semilla de algodón para aportar fibra digestible, proteína y energía a bajo costo por ración.",
    },
    {
        "codigo": "BIOMASA",
        "nombre": "Bioenergía y Calderas (Biomasa Térmica)",
        "descripcion": "Chips forestales, costanero, aserrín y cascarilla para generación de vapor industrial, secaderos y producción de biochar.",
    },
    {
        "codigo": "VIVERO",
        "nombre": "Viveros y Compostaje (Sustratos)",
        "descripcion": "Sustratos livianos, aireados y enmiendas orgánicas a base de corteza de pino, cascarilla de arroz y restos vegetales.",
    },
]

LOCALIDADES_COMPRADOR_NEA: List[Dict] = [
    {
        "codigo": "GOYA",
        "nombre": "Goya, Corrientes",
        "distancias_km": {
            "Saladas": 135,
            "Bella Vista": 85,
            "Gobernador Virasoro": 390,
            "Presidencia Roque Sáenz Peña": 340,
        },
    },
    {
        "codigo": "SALADAS",
        "nombre": "Saladas / San Roque, Corrientes",
        "distancias_km": {
            "Saladas": 25,
            "Bella Vista": 55,
            "Gobernador Virasoro": 310,
            "Presidencia Roque Sáenz Peña": 290,
        },
    },
    {
        "codigo": "BELLA_VISTA",
        "nombre": "Bella Vista, Corrientes",
        "distancias_km": {
            "Saladas": 55,
            "Bella Vista": 20,
            "Gobernador Virasoro": 350,
            "Presidencia Roque Sáenz Peña": 320,
        },
    },
    {
        "codigo": "MERCEDES",
        "nombre": "Mercedes / Curuzú Cuatiá, Corrientes",
        "distancias_km": {
            "Saladas": 165,
            "Bella Vista": 180,
            "Gobernador Virasoro": 240,
            "Presidencia Roque Sáenz Peña": 430,
        },
    },
    {
        "codigo": "CORRIENTES",
        "nombre": "Corrientes Capital / Resistencia",
        "distancias_km": {
            "Saladas": 105,
            "Bella Vista": 145,
            "Gobernador Virasoro": 330,
            "Presidencia Roque Sáenz Peña": 175,
        },
    },
    {
        "codigo": "RECONQUISTA",
        "nombre": "Reconquista / Norte de Santa Fe",
        "distancias_km": {
            "Saladas": 250,
            "Bella Vista": 195,
            "Gobernador Virasoro": 460,
            "Presidencia Roque Sáenz Peña": 310,
        },
    },
]

DEFAULTS_POR_CATEGORIA: Dict[str, Dict] = {
    "ARROZ": {
        "densidad_kg_m3": 165,
        "humedad_estado": "Seco (11% hum.) / A granel",
        "carroceria_requerida": "Batea o Semirremolque con lona",
        "usos_recomendados": "Cama para galpones avícolas (pollos/ponedoras), sustrato de vivero y biomasa térmica",
        "perfiles_comprador": "AVICOLA,VIVERO,BIOMASA",
    },
    "MADERA": {
        "densidad_kg_m3": 210,
        "humedad_estado": "Seco / A granel o bolsones",
        "carroceria_requerida": "Semirremolque baranda volcable / Batea",
        "usos_recomendados": "Cama avícola de alta absorción, calderas de biomasa y compostaje forestal",
        "perfiles_comprador": "AVICOLA,BIOMASA,VIVERO",
    },
    "CITRUS": {
        "densidad_kg_m3": 650,
        "humedad_estado": "Húmedo (78% hum.) / Despacho urgente 48hs",
        "carroceria_requerida": "Batea cerealera estanca",
        "usos_recomendados": "Suplementación energética y fibra digestible para recría bovina, tambo y feedlot",
        "perfiles_comprador": "GANADERO",
    },
    "ALGODON": {
        "densidad_kg_m3": 480,
        "humedad_estado": "Seco / A granel",
        "carroceria_requerida": "Batea o Tolva cerealera",
        "usos_recomendados": "Suplemento proteico-energético de alta fibra para rodeos de cría e invernada",
        "perfiles_comprador": "GANADERO",
    },
    "OTRO": {
        "densidad_kg_m3": 300,
        "humedad_estado": "Seco / A granel",
        "carroceria_requerida": "Batea / Semirremolque",
        "usos_recomendados": "Bioenergía térmica, enmienda orgánica o suplementación regional",
        "perfiles_comprador": "BIOMASA,VIVERO,GANADERO",
    },
}


def obtener_perfil_por_codigo(codigo: Optional[str]) -> Dict[str, str]:
    """Devuelve el diccionario del perfil productivo activo o TODOS por defecto."""
    codigo_limpio = (codigo or "TODOS").upper().strip()
    for perfil in PERFILES_PRODUCTIVOS:
        if perfil["codigo"] == codigo_limpio:
            return perfil
    return PERFILES_PRODUCTIVOS[0]


def obtener_localidad_por_codigo(codigo: Optional[str]) -> Dict:
    """Devuelve el diccionario de la localidad del comprador o GOYA por defecto."""
    codigo_limpio = (codigo or "GOYA").upper().strip()
    for loc in LOCALIDADES_COMPRADOR_NEA:
        if loc["codigo"] == codigo_limpio:
            return loc
    return LOCALIDADES_COMPRADOR_NEA[0]


def calcular_distancia_estimada_km(localidad_origen: str, codigo_destino: str = "GOYA") -> int:
    """
    Devuelve los kilómetros estimados entre el origen del lote y la localidad del comprador.
    Soporta coincidencia exacta y parcial con los nodos generadores del NEA.
    """
    loc_destino = obtener_localidad_por_codigo(codigo_destino)
    mapa_distancias = loc_destino.get("distancias_km", {})
    origen_str = (localidad_origen or "").strip()

    if origen_str in mapa_distancias:
        return int(mapa_distancias[origen_str])

    origen_lower = origen_str.lower()
    for nodo, km in mapa_distancias.items():
        if nodo.lower() in origen_lower or origen_lower in nodo.lower():
            return int(km)

    if "saenz" in origen_lower or "sáenz" in origen_lower or "chaco" in origen_lower:
        return int(mapa_distancias.get("Presidencia Roque Sáenz Peña", 320))
    if "virasoro" in origen_lower or "santo tom" in origen_lower:
        return int(mapa_distancias.get("Gobernador Virasoro", 340))
    if "bella vista" in origen_lower:
        return int(mapa_distancias.get("Bella Vista", 90))
    if "saladas" in origen_lower:
        return int(mapa_distancias.get("Saladas", 120))

    return 160


def _construir_explicacion_comprador(lote: LoteSubproducto, codigo_perfil: str) -> str:
    """
    Genera una explicación clara y concisa de por qué sirve el lote según la actividad
    del comprador y cómo aprovechar su cubicaje (m3).
    """
    volumen_m3 = lote.volumen_total_m3
    densidad = lote.densidad_kg_m3
    toneladas = float(lote.toneladas_disponibles)

    if densidad <= 220:
        detalle_cubicaje = (
            f"Ocupa {volumen_m3} m³ ({densidad} kg/m³): carga liviana que llena rápido la caja en volumen "
            f"y aprovecha al máximo bateas de 85 a 95 m³ sin exceder el peso máximo."
        )
    elif densidad >= 550:
        detalle_cubicaje = (
            f"Ocupa solo {volumen_m3} m³ ({densidad} kg/m³): carga pesada y compacta que satura por tonelaje "
            f"({toneladas:.0f} tn) ocupando menos de la mitad del volumen del semirremolque."
        )
    else:
        detalle_cubicaje = (
            f"Ocupa {volumen_m3} m³ ({densidad} kg/m³): relación equilibrada entre peso y volumen "
            f"para completar equipo estándar en un solo viaje."
        )

    if codigo_perfil == "AVICOLA":
        uso_directo = "Ideal para renovar cama de galpón avícola con baja humedad y excelente aislación térmica."
    elif codigo_perfil == "GANADERO":
        uso_directo = "Excelente aporte de fibra y energía para abaratar la ración diaria en recría, tambo o feedlot."
    elif codigo_perfil == "BIOMASA":
        uso_directo = "Alto poder calorífico por tonelada para alimentar calderas industriales, secaderos o biochar."
    elif codigo_perfil == "VIVERO":
        uso_directo = "Óptima porosidad y retención de humedad para formular sustratos forestales y compostaje."
    else:
        uso_directo = f"Recomendado para {lote.usos_recomendados.lower()}."

    return f"{uso_directo} {detalle_cubicaje}"


def obtener_lotes_recomendados(
    perfil_comprador: Optional[str] = None,
    localidad_comprador: Optional[str] = "GOYA",
    texto_busqueda: Optional[str] = None,
) -> List[LoteSubproducto]:
    """
    Filtra los lotes por perfil productivo y búsqueda libre, y enriquece cada lote en memoria
    con la distancia hacia el campo del comprador y la explicación técnica de cubicaje (m3).
    """
    qs = LoteSubproducto.objects.all()

    codigo_perfil = (perfil_comprador or "TODOS").upper().strip()
    if codigo_perfil and codigo_perfil != "TODOS":
        qs = qs.filter(perfiles_comprador__icontains=codigo_perfil)

    if texto_busqueda and texto_busqueda.strip():
        termino = texto_busqueda.strip()
        qs = qs.filter(
            Q(titulo__icontains=termino)
            | Q(localidad_origen__icontains=termino)
            | Q(empresa_vendedora__icontains=termino)
            | Q(usos_recomendados__icontains=termino)
        )

    loc_obj = obtener_localidad_por_codigo(localidad_comprador)
    codigo_destino = loc_obj["codigo"]
    nombre_destino = loc_obj["nombre"]

    lotes = list(qs)
    for lote in lotes:
        lote.distancia_sugerida_km = calcular_distancia_estimada_km(
            lote.localidad_origen, codigo_destino
        )
        lote.localidad_comprador_nombre = nombre_destino
        perfiles_lote = [
            p.strip().upper()
            for p in (lote.perfiles_comprador or "").split(",")
            if p.strip()
        ]
        lote.es_recomendado_destacado = (
            codigo_perfil != "TODOS" and codigo_perfil in perfiles_lote
        )
        lote.explicacion_para_comprador = _construir_explicacion_comprador(
            lote, codigo_perfil
        )

    return lotes


def crear_nuevo_lote(datos: dict) -> LoteSubproducto:
    """
    Registra un nuevo lote de subproducto publicado por una agroindustria,
    infiriendo perfiles_comprador, humedad_estado, carroceria_requerida, usos_recomendados
    y densidad_kg_m3 coherentes según la categoría si no vienen especificados.
    """
    categoria = (datos.get("categoria") or "ARROZ").upper().strip()
    defaults = DEFAULTS_POR_CATEGORIA.get(categoria, DEFAULTS_POR_CATEGORIA["OTRO"])

    densidad_raw = datos.get("densidad_kg_m3")
    densidad_kg_m3 = (
        int(densidad_raw)
        if densidad_raw not in (None, "", 0, "0")
        else defaults["densidad_kg_m3"]
    )

    humedad_estado = (
        datos.get("humedad_estado", "").strip() or defaults["humedad_estado"]
    )
    carroceria_requerida = (
        datos.get("carroceria_requerida", "").strip()
        or defaults["carroceria_requerida"]
    )
    usos_recomendados = (
        datos.get("usos_recomendados", "").strip() or defaults["usos_recomendados"]
    )
    perfiles_comprador = (
        datos.get("perfiles_comprador", "").strip() or defaults["perfiles_comprador"]
    )

    return LoteSubproducto.objects.create(
        titulo=datos["titulo"].strip(),
        categoria=categoria,
        empresa_vendedora=datos["empresa_vendedora"].strip(),
        localidad_origen=(datos.get("localidad_origen") or "Saladas").strip(),
        provincia=(datos.get("provincia") or "Corrientes").strip(),
        toneladas_disponibles=float(datos["toneladas_disponibles"]),
        densidad_kg_m3=densidad_kg_m3,
        precio_tonelada_ars=float(datos["precio_tonelada_ars"]),
        humedad_estado=humedad_estado,
        carroceria_requerida=carroceria_requerida,
        usos_recomendados=usos_recomendados,
        perfiles_comprador=perfiles_comprador,
        modalidad_flete=(datos.get("modalidad_flete") or "COMPRADOR").strip(),
    )
