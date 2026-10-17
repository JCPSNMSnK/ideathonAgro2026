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
- Proveer los casos precalculados de la Landing Page (CASOS_DEMO_LANDING) y la
  gestión de camiones con retorno vacío para el rol Logística / Camión.
"""
import json
import re
from typing import Dict, Iterable, List, Optional
from django.db.models import Q
from mercado.models import CamionRetorno, LoteSubproducto

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
    {
        "codigo": "ROSARIO",
        "nombre": "Rosario / Gran Rosario, Santa Fe",
        "distancias_km": {
            "Saladas": 580,
            "Bella Vista": 520,
            "Gobernador Virasoro": 790,
            "Presidencia Roque Sáenz Peña": 690,
            "San Martín": 780,
        },
    },
    {
        "codigo": "PERGAMINO",
        "nombre": "Pergamino / Norte de Bs. As.",
        "distancias_km": {
            "Saladas": 670,
            "Bella Vista": 610,
            "Gobernador Virasoro": 860,
            "Presidencia Roque Sáenz Peña": 760,
        },
    },
    {
        "codigo": "CORDOBA",
        "nombre": "Río Cuarto / Villa María, Córdoba",
        "distancias_km": {
            "Saladas": 680,
            "Bella Vista": 630,
            "Gobernador Virasoro": 920,
            "Presidencia Roque Sáenz Peña": 620,
            "San Martín": 510,
        },
    },
    {
        "codigo": "MENDOZA",
        "nombre": "San Martín / Gran Mendoza, Cuyo",
        "distancias_km": {
            "Saladas": 1100,
            "Bella Vista": 1080,
            "Gobernador Virasoro": 1390,
            "Presidencia Roque Sáenz Peña": 1020,
            "San Martín": 35,
        },
    },
    {
        "codigo": "TUCUMAN",
        "nombre": "San Miguel de Tucumán / NOA",
        "distancias_km": {
            "Saladas": 760,
            "Bella Vista": 780,
            "Gobernador Virasoro": 960,
            "Presidencia Roque Sáenz Peña": 450,
        },
    },
    {
        "codigo": "ALTO_VALLE",
        "nombre": "Alto Valle / Río Negro, Patagonia",
        "distancias_km": {
            "Saladas": 1420,
            "Bella Vista": 1390,
            "Gobernador Virasoro": 1680,
            "Presidencia Roque Sáenz Peña": 1450,
        },
    },
]

LOCALIDADES_COMPRADOR_ARGENTINA = LOCALIDADES_COMPRADOR_NEA

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

CASOS_DEMO_LANDING: List[Dict] = [
    {
        "id": "arrocero",
        "codigo": "ARROZ",
        "etiqueta_boton": "Caso 1 · Sector Arrocero",
        "titulo": "Caso Arrocero: Cascarilla de Arroz para Cama Avícola",
        "subproducto": "Cascarilla de Arroz Seca (Granel)",
        "empresa_vendedora": "Molino Arrocero San Lorenzo (Saladas)",
        "empresa_compradora": "Granja Avícola Santa Lucía (Goya)",
        "origen": "Saladas, Corrientes",
        "destino": "Goya, Corrientes",
        "ruta": "Saladas → Goya (RN 12 / RP 27)",
        "distancia_km": 135,
        "toneladas": 15.0,
        "densidad_kg_m3": 165,
        "volumen_m3": 90.9,
        "factor_limitante": "SATURA POR VOLUMEN (90.9 m³)",
        "modalidad_flete": "COMPRADOR",
        "modalidad_flete_label": "100% Comprador con Flete Calzado (-45%)",
        "precio_tonelada_ars": 22000,
        "subtotal_subproducto_ars": 330000,
        "flete_tradicional_ars": 1400000,
        "flete_calzado_ars": 770000,
        "ahorro_ars": 630000,
        "descuento_pct": 45,
        "pago_vendedor_flete_ars": 0,
        "pago_comprador_flete_ars": 770000,
        "transportista": "Transporte Litoral Express (Batea 90 m³)",
        "explicacion_logistica": (
            "15 tn a 165 kg/m³ ocupan 90.9 m³: el camión se llena por volumen antes que por peso. "
            "Al calzar una batea que regresaba vacía hacia Goya, el flete baja de $1.400.000 a $770.000."
        ),
        "impacto_ambiental": "Evita quema a cielo abierto en molino y reemplaza viruta comprada fuera de la provincia.",
    },
    {
        "id": "forestal",
        "codigo": "MADERA",
        "etiqueta_boton": "Caso 2 · Foresto-Industria",
        "titulo": "Caso Forestal: Aserrín de Pino Seco con Flete Compartido 50/50",
        "subproducto": "Aserrín y Viruta de Pino Seleccionado",
        "empresa_vendedora": "Aserradero Río Paraná SRL (Saladas)",
        "empresa_compradora": "Planta de Pellets y Biomasa Paiubre (Mercedes)",
        "origen": "Saladas, Corrientes",
        "destino": "Mercedes, Corrientes",
        "ruta": "Saladas → Mercedes (RN 118 / RN 123)",
        "distancia_km": 165,
        "toneladas": 14.0,
        "densidad_kg_m3": 210,
        "volumen_m3": 66.7,
        "factor_limitante": "ALTO VOLUMEN EN CAJA (66.7 m³)",
        "modalidad_flete": "COMPARTIDO_50_50",
        "modalidad_flete_label": "Flete Compartido 50% Vendedor / 50% Comprador",
        "precio_tonelada_ars": 18500,
        "subtotal_subproducto_ars": 259000,
        "flete_tradicional_ars": 1300000,
        "flete_calzado_ars": 676000,
        "ahorro_ars": 624000,
        "descuento_pct": 48,
        "pago_vendedor_flete_ars": 338000,
        "pago_comprador_flete_ars": 338000,
        "transportista": "Logística Guaraní SRL (Semirremolque 90 m³)",
        "explicacion_logistica": (
            "14 tn a 210 kg/m³ ocupan 66.7 m³. El aserradero necesita liberar patio de acopio y comparte "
            "el Flete Calzado 50/50 ($338.000 cada parte), destrabando una operación antes inviable."
        ),
        "impacto_ambiental": "Transforma pasivo forestal con riesgo de incendio en energía térmica renovable certificada.",
    },
    {
        "id": "citricola",
        "codigo": "CITRUS",
        "etiqueta_boton": "Caso 3 · Sector Citrícola",
        "titulo": "Caso Citrícola: Cáscara Húmeda de Citrus con Urgencia 48 hs",
        "subproducto": "Bagazo y Cáscara Húmeda de Citrus",
        "empresa_vendedora": "Jugos del Litoral SA (Bella Vista)",
        "empresa_compradora": "Feedlot y Recría Don Esteban (Goya)",
        "origen": "Bella Vista, Corrientes",
        "destino": "Goya, Corrientes",
        "ruta": "Bella Vista → Goya (RP 27)",
        "distancia_km": 85,
        "toneladas": 24.0,
        "densidad_kg_m3": 650,
        "volumen_m3": 36.9,
        "factor_limitante": "SATURA POR PESO (24 tn en solo 36.9 m³)",
        "modalidad_flete": "VENDEDOR",
        "modalidad_flete_label": "Flete 100% Vendedor (Urgencia ambiental 48 hs)",
        "precio_tonelada_ars": 14000,
        "subtotal_subproducto_ars": 336000,
        "flete_tradicional_ars": 950000,
        "flete_calzado_ars": 520000,
        "ahorro_ars": 430000,
        "descuento_pct": 45,
        "pago_vendedor_flete_ars": 520000,
        "pago_comprador_flete_ars": 0,
        "transportista": "Transporte Litoral Express (Batea Estanca)",
        "explicacion_logistica": (
            "24 tn a 650 kg/m³ ocupan apenas 36.9 m³ (carga pesada y húmeda). Por urgencia ambiental de 48 hs "
            "para evitar fermentación en planta, la juguera absorbe el 100% del Flete Calzado ($520.000)."
        ),
        "impacto_ambiental": "Evita vuelco y lixiviados ácidos convirtiendo 24 tn húmedas en fibra energética bovina.",
    },
]


import math

COORDENADAS_NODOS_ARGENTINA: Dict[str, Dict] = {
    # Litoral / NEA
    "Saladas": {
        "lat": -28.2539,
        "lng": -58.6258,
        "ruta": "RN 12 / RN 118",
        "zona": "Polo Arrocero y Forestal (Corrientes)",
    },
    "Bella Vista": {
        "lat": -28.5089,
        "lng": -59.0453,
        "ruta": "RP 27",
        "zona": "Cuenca Citrícola e Industrial (Corrientes)",
    },
    "Gobernador Virasoro": {
        "lat": -28.0500,
        "lng": -56.0167,
        "ruta": "RN 14",
        "zona": "Polo Foresto-Industrial y Biomasa (Corrientes)",
    },
    "Presidencia Roque Sáenz Peña": {
        "lat": -26.7852,
        "lng": -60.4388,
        "ruta": "RN 16",
        "zona": "Cuenca Algodonera y Desmotadoras (Chaco)",
    },
    "Goya": {
        "lat": -29.1400,
        "lng": -59.2626,
        "ruta": "RN 12 / RP 27",
        "zona": "Polo Avícola y Ganadero (Corrientes)",
    },
    "Mercedes": {
        "lat": -29.1842,
        "lng": -58.0753,
        "ruta": "RN 119 / RN 123",
        "zona": "Polo Ganadero y Arrocero (Corrientes)",
    },
    "Corrientes": {
        "lat": -27.4692,
        "lng": -58.8306,
        "ruta": "RN 12 / Puente Gral. Belgrano",
        "zona": "Nodo Logístico y Portuario (Corrientes)",
    },
    "Resistencia": {
        "lat": -27.4514,
        "lng": -58.9867,
        "ruta": "RN 11 / RN 16",
        "zona": "Polo Industrial y Portuario (Chaco)",
    },
    "San Roque": {
        "lat": -28.5736,
        "lng": -58.7092,
        "ruta": "RN 12",
        "zona": "Cuenca Arrocera y Ganadera (Corrientes)",
    },
    "Santa Rosa": {
        "lat": -28.2625,
        "lng": -58.1189,
        "ruta": "RP 5 / RP 118",
        "zona": "Polo Foresto-Maderero (Corrientes)",
    },
    "Santo Tomé": {
        "lat": -28.5492,
        "lng": -56.0408,
        "ruta": "RN 14",
        "zona": "Corredor Foresto-Industrial (Corrientes)",
    },
    "Monte Caseros": {
        "lat": -30.2533,
        "lng": -57.6367,
        "ruta": "RN 14 / RP 129",
        "zona": "Cuenca Citrícola del Río Uruguay (Corrientes)",
    },
    "Curuzú Cuatiá": {
        "lat": -29.7917,
        "lng": -58.0556,
        "ruta": "RN 119",
        "zona": "Polo Ganadero y Forrajero (Corrientes)",
    },
    "Posadas": {
        "lat": -27.3621,
        "lng": -55.8961,
        "ruta": "RN 12 / RN 105",
        "zona": "Polo Agroindustrial y Yerbatero (Misiones)",
    },
    "Reconquista": {
        "lat": -29.1500,
        "lng": -59.6500,
        "ruta": "RN 11",
        "zona": "Norte Santafesino Agroindustrial (Santa Fe)",
    },
    "Concordia": {
        "lat": -31.3930,
        "lng": -58.0209,
        "ruta": "RN 14",
        "zona": "Cuenca Citrícola y Foresto-Industrial (Entre Ríos)",
    },
    # Región Pampeana / Centro
    "Rosario": {
        "lat": -32.9468,
        "lng": -60.6393,
        "ruta": "RN 9 / RN 11 / Hidrovía",
        "zona": "Polo Portuario y Agroindustrial (Santa Fe)",
    },
    "Puerto San Lorenzo": {
        "lat": -32.7483,
        "lng": -60.7325,
        "ruta": "RN 11 / Puerto Gran Rosario",
        "zona": "Complejo Agroexportador Up-River (Santa Fe)",
    },
    "Rafaela": {
        "lat": -31.2503,
        "lng": -61.4867,
        "ruta": "RN 34",
        "zona": "Cuenca Lechera Central (Santa Fe)",
    },
    "Pergamino": {
        "lat": -33.8994,
        "lng": -60.5736,
        "ruta": "RN 8 / RN 188",
        "zona": "Núcleo Agrícola Pampeano (Buenos Aires)",
    },
    "Río Cuarto": {
        "lat": -33.1307,
        "lng": -64.3499,
        "ruta": "RN 8 / RN 36 / RN 158",
        "zona": "Polo Manisero, Maicero y Bioetanol (Córdoba)",
    },
    "Villa María": {
        "lat": -32.4075,
        "lng": -63.2403,
        "ruta": "RN 9 / RN 158",
        "zona": "Cuenca Láctea y Agroindustria (Córdoba)",
    },
    "Córdoba": {
        "lat": -31.4201,
        "lng": -64.1888,
        "ruta": "RN 9 / RN 19 / RN 20",
        "zona": "Centro Logístico Mediterráneo (Córdoba)",
    },
    # Región Cuyo
    "San Martín": {
        "lat": -33.0811,
        "lng": -68.4681,
        "ruta": "RN 7",
        "zona": "Oasis Este Vitivinícola y Frutícola (Mendoza)",
    },
    "Mendoza": {
        "lat": -32.8908,
        "lng": -68.8272,
        "ruta": "RN 7 / RN 40",
        "zona": "Polo Agroindustrial y Logístico Cuyo (Mendoza)",
    },
    "San Rafael": {
        "lat": -34.6177,
        "lng": -68.3301,
        "ruta": "RN 143 / RN 144",
        "zona": "Cuenca Frutícola y Vitivinícola Sur (Mendoza)",
    },
    "Villa Mercedes": {
        "lat": -33.6757,
        "lng": -65.4578,
        "ruta": "RN 7 / RN 8",
        "zona": "Polo Agroindustrial y Alfalfa (San Luis)",
    },
    # Región NOA
    "San Miguel de Tucumán": {
        "lat": -26.8083,
        "lng": -65.2176,
        "ruta": "RN 9 / RN 38",
        "zona": "Complejo Azucarero, Citrícola y Bioetanol (Tucumán)",
    },
    "Salta": {
        "lat": -24.7859,
        "lng": -65.4117,
        "ruta": "RN 9 / RN 34",
        "zona": "Valles Calchaquíes y Grano NOA (Salta)",
    },
    # Patagonia / Comahue
    "General Roca": {
        "lat": -39.0333,
        "lng": -67.5833,
        "ruta": "RN 22",
        "zona": "Alto Valle Frutícola y Sidrero (Río Negro)",
    },
    "Cipolletti": {
        "lat": -38.9339,
        "lng": -67.9903,
        "ruta": "RN 22 / RN 151",
        "zona": "Alto Valle de Río Negro (Río Negro)",
    },
}

COORDENADAS_NODOS_NEA = COORDENADAS_NODOS_ARGENTINA


def _calcular_km_entre_coordenadas(lat1: float, lng1: float, lat2: float, lng2: float) -> int:
    """Calcula distancia real estimada por ruta terrestre (Haversine * 1.28 factor de sinuosidad)."""
    rad = math.pi / 180.0
    dlat = (lat2 - lat1) * rad
    dlng = (lng2 - lng1) * rad
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(lat1 * rad) * math.cos(lat2 * rad) * math.sin(dlng / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    km_lineal = 6371.0 * c
    return max(20, int(round(km_lineal * 1.28)))


def obtener_coordenadas_nodo(localidad_texto: Optional[str]) -> Dict:
    """Devuelve coordenadas (lat, lng), ruta y zona para cualquier localidad o código de Argentina."""
    texto = (localidad_texto or "Saladas").strip()
    if texto in COORDENADAS_NODOS_ARGENTINA:
        return COORDENADAS_NODOS_ARGENTINA[texto]

    texto_lower = texto.lower().replace("_", " ")
    for nombre_nodo, info in COORDENADAS_NODOS_ARGENTINA.items():
        if nombre_nodo.lower() in texto_lower or texto_lower in nombre_nodo.lower():
            return info

    # Búsqueda por palabras clave regionales
    if "saenz" in texto_lower or "sáenz" in texto_lower or "chaco" in texto_lower:
        return COORDENADAS_NODOS_ARGENTINA["Presidencia Roque Sáenz Peña"]
    if "virasoro" in texto_lower or "santo tom" in texto_lower:
        return COORDENADAS_NODOS_ARGENTINA["Gobernador Virasoro"]
    if "bella vista" in texto_lower:
        return COORDENADAS_NODOS_ARGENTINA["Bella Vista"]
    if "goya" in texto_lower:
        return COORDENADAS_NODOS_ARGENTINA["Goya"]
    if "mercedes" in texto_lower or "curuz" in texto_lower:
        return COORDENADAS_NODOS_ARGENTINA["Mercedes"]
    if "corrientes" in texto_lower:
        return COORDENADAS_NODOS_ARGENTINA["Corrientes"]
    if "resistencia" in texto_lower:
        return COORDENADAS_NODOS_ARGENTINA["Resistencia"]
    if "reconquista" in texto_lower:
        return COORDENADAS_NODOS_ARGENTINA["Reconquista"]
    if "rosario" in texto_lower or "lorenzo" in texto_lower:
        return COORDENADAS_NODOS_ARGENTINA["Rosario"]
    if "pergamino" in texto_lower or "buenos aires" in texto_lower:
        return COORDENADAS_NODOS_ARGENTINA["Pergamino"]
    if "cuarto" in texto_lower or "maría" in texto_lower or "maria" in texto_lower or "cba" in texto_lower:
        return COORDENADAS_NODOS_ARGENTINA["Río Cuarto"]
    if "mendoza" in texto_lower or "cuyo" in texto_lower or "martín" in texto_lower or "martin" in texto_lower:
        return COORDENADAS_NODOS_ARGENTINA["San Martín"]
    if "tucum" in texto_lower or "noa" in texto_lower:
        return COORDENADAS_NODOS_ARGENTINA["San Miguel de Tucumán"]
    if "roca" in texto_lower or "cipolletti" in texto_lower or "negro" in texto_lower or "valle" in texto_lower:
        return COORDENADAS_NODOS_ARGENTINA["General Roca"]

    return COORDENADAS_NODOS_ARGENTINA["Saladas"]


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


obtener_perfil_detalle = obtener_perfil_por_codigo
obtener_localidad_detalle = obtener_localidad_por_codigo


def calcular_distancia_estimada_km(localidad_origen: str, codigo_destino: str = "GOYA") -> int:
    """
    Devuelve los kilómetros estimados entre el origen del lote y la localidad del comprador.
    Soporta coincidencia en matriz de distancias o cálculo geodésico Haversine con factor vial
    para cualquier punto del país.
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

    # Cálculo dinámico basado en coordenadas geográficas reales
    coord_origen = obtener_coordenadas_nodo(origen_str)
    coord_destino = obtener_coordenadas_nodo(loc_destino["nombre"])
    return _calcular_km_entre_coordenadas(
        coord_origen["lat"], coord_origen["lng"],
        coord_destino["lat"], coord_destino["lng"],
    )


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


def _enriquecer_metadatos_lote(lote: LoteSubproducto) -> None:
    """
    Enriquece el lote en memoria con coordenadas geográficas, indicadores de urgencia,
    disponibilidad como Lote Futuro (preventa de zafra) y fraccionamiento en sublotes.
    """
    nodo = obtener_coordenadas_nodo(lote.localidad_origen)
    lote.lat = nodo["lat"]
    lote.lng = nodo["lng"]
    lote.ruta_corredor = nodo["ruta"]
    lote.zona_productiva = nodo["zona"]

    humedad_lower = (lote.humedad_estado or "").lower()
    titulo_lower = (lote.titulo or "").lower()
    texto_combinado = f"{humedad_lower} {titulo_lower}"

    # 1. Detección de Urgencia
    palabras_urgencia = ("urgente", "48hs", "48 hs", "24hs", "24 hs", "inmediat")
    lote.es_urgente = (
        lote.modalidad_flete == "VENDEDOR"
        or any(p in texto_combinado for p in palabras_urgencia)
    )
    if lote.es_urgente:
        if lote.categoria == "CITRUS":
            lote.etiqueta_urgencia = "VENTA INMEDIATA · RIESGO FERMENTACIÓN"
            lote.motivo_urgencia = "Evacuación crítica en 48 hs para evitar fermentación en planta (Flete 100% Vendedor)"
        elif lote.modalidad_flete == "VENDEDOR":
            lote.etiqueta_urgencia = "EVACUACIÓN URGENTE 48 HS"
            lote.motivo_urgencia = "Liberación inmediata de acopio con flete absorbido por el generador"
        else:
            lote.etiqueta_urgencia = "PRIORIDAD DE VACIADO DE SILO"
            lote.motivo_urgencia = "Despacho prioritario para liberar capacidad operativa en planta"
    else:
        lote.etiqueta_urgencia = ""
        lote.motivo_urgencia = ""

    # 2. Detección de Lote Futuro y Sublotes
    palabras_futuro = ("futuro", "zafra", "programad", "[futuro", "preventa", "15 días", "15 dias", "quincenal")
    lote.es_lote_futuro = any(p in texto_combinado for p in palabras_futuro)

    match_fecha = re.search(r"lote futuro\s*\(([^)]+)\)", lote.humedad_estado or "", re.IGNORECASE)
    if match_fecha:
        lote.fecha_entrega_futura = match_fecha.group(1).strip()
    elif lote.es_lote_futuro:
        lote.fecha_entrega_futura = "Zafra Quincenal · Entrega 15 días"
    else:
        lote.fecha_entrega_futura = ""

    match_min_tn = re.search(r"desde\s+(\d+)\s*tn", texto_combinado)
    tn_disp = max(1.0, float(lote.toneladas_disponibles))
    sublote_min = int(match_min_tn.group(1)) if match_min_tn else 5
    lote.sublote_min_tn = min(sublote_min, int(max(1.0, round(tn_disp))))
    lote.permite_sublotes = tn_disp > 6.0 or lote.es_lote_futuro

    opciones = []
    for paso in (lote.sublote_min_tn, 10, 15, 20):
        if 1 <= paso < tn_disp and paso not in opciones:
            opciones.append(paso)
    tn_entero = int(round(tn_disp))
    if tn_entero not in opciones:
        opciones.append(tn_entero)
    lote.opciones_sublote_tn = sorted(opciones)

    if lote.es_lote_futuro:
        lote.cupo_original_tn = 40.0 if tn_disp <= 32.0 else 60.0
    else:
        lote.cupo_original_tn = max(tn_disp, 24.0)

    lote.toneladas_totales_emision = lote.cupo_original_tn
    lote.porcentaje_disponible = min(
        100, max(12, int(round((tn_disp / lote.cupo_original_tn) * 100)))
    )
    lote.cantidad_sublotes_sugeridos = max(1, int(tn_disp // max(1, lote.sublote_min_tn)))


def obtener_lotes_recomendados(
    perfil_comprador: Optional[str] = None,
    localidad_comprador: Optional[str] = "GOYA",
    texto_busqueda: Optional[str] = None,
    busqueda_q: Optional[str] = None,
) -> List[LoteSubproducto]:
    """
    Filtra los lotes por perfil productivo y búsqueda libre, y enriquece cada lote en memoria
    con la distancia hacia el campo del comprador, coordenadas, urgencia, lotes futuros/sublotes
    y la explicación técnica de cubicaje (m3).
    """
    qs = LoteSubproducto.objects.all()

    codigo_perfil = (perfil_comprador or "TODOS").upper().strip()
    if codigo_perfil and codigo_perfil != "TODOS":
        qs = qs.filter(perfiles_comprador__icontains=codigo_perfil)

    termino_raw = texto_busqueda if texto_busqueda is not None else busqueda_q
    if termino_raw and termino_raw.strip():
        termino = termino_raw.strip()
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
        _enriquecer_metadatos_lote(lote)
        lote.explicacion_para_comprador = _construir_explicacion_comprador(
            lote, codigo_perfil
        )

    return lotes


MODALIDADES_FLETE_VALIDAS = {"COMPRADOR", "VENDEDOR", "COMPARTIDO_50_50", "MUTUO_ACUERDO"}


def _resolver_modalidad_flete(modalidad_raw, porcentaje_raw):
    """
    Valida la modalidad de pago del flete. En MUTUO_ACUERDO el vendedor debe publicar
    en su lote qué porcentaje del flete paga (0 a 100); en las demás no se guarda.
    """
    modalidad = (str(modalidad_raw or "COMPRADOR")).upper().strip()
    if modalidad not in MODALIDADES_FLETE_VALIDAS:
        raise ValueError(f"Modalidad de flete inválida: {modalidad}")
    if modalidad != "MUTUO_ACUERDO":
        return modalidad, None
    if porcentaje_raw in (None, ""):
        raise ValueError(
            "En flete a mutuo acuerdo el vendedor debe publicar qué porcentaje del flete paga."
        )
    porcentaje = float(porcentaje_raw)
    if not 0.0 <= porcentaje <= 100.0:
        raise ValueError("El porcentaje del flete que paga el vendedor debe estar entre 0 y 100.")
    return modalidad, round(porcentaje, 2)


def obtener_datos_mapa_productores(
    lotes: Iterable[LoteSubproducto],
    codigo_localidad_comprador: Optional[str] = "GOYA",
) -> str:
    """
    Serializa en JSON las coordenadas del comprador actual y la lista de lotes/productores
    enriquecidos para renderizar el mapa logístico interactivo de Argentina en el frontend.
    """
    loc_comprador = obtener_localidad_por_codigo(codigo_localidad_comprador)
    coord_comprador = obtener_coordenadas_nodo(loc_comprador["nombre"])

    conteo_por_origen: Dict[str, int] = {}
    productores_data = []

    for lote in lotes:
        if not hasattr(lote, "lat") or not hasattr(lote, "es_urgente"):
            _enriquecer_metadatos_lote(lote)
        distancia_km = getattr(
            lote,
            "distancia_sugerida_km",
            calcular_distancia_estimada_km(lote.localidad_origen, loc_comprador["codigo"]),
        )
        clave_origen = (lote.localidad_origen or "Saladas").strip().lower()
        idx_origen = conteo_por_origen.get(clave_origen, 0)
        conteo_por_origen[clave_origen] = idx_origen + 1

        # Leve desplazamiento visual si hay múltiples lotes en la misma localidad
        offset_lat = (idx_origen * 0.018) if idx_origen else 0.0
        offset_lng = (idx_origen * -0.015) if idx_origen else 0.0

        productores_data.append(
            {
                "id": lote.id,
                "titulo": lote.titulo,
                "categoria": lote.categoria,
                "empresa": lote.empresa_vendedora,
                "localidad": lote.localidad_origen,
                "provincia": lote.provincia,
                "lat": round(float(lote.lat) + offset_lat, 4),
                "lng": round(float(lote.lng) + offset_lng, 4),
                "ruta": lote.ruta_corredor,
                "zona": getattr(lote, "zona_productiva", ""),
                "toneladas": float(lote.toneladas_disponibles),
                "volumen_m3": float(lote.volumen_total_m3),
                "densidad": int(lote.densidad_kg_m3),
                "precio_tn": float(lote.precio_tonelada_ars),
                "distancia_km": int(distancia_km),
                "es_urgente": bool(lote.es_urgente),
                "etiqueta_urgencia": lote.etiqueta_urgencia,
                "es_lote_futuro": bool(lote.es_lote_futuro),
                "fecha_entrega_futura": lote.fecha_entrega_futura,
                "permite_sublotes": bool(lote.permite_sublotes),
                "sublote_min_tn": int(lote.sublote_min_tn),
                "opciones_sublote_tn": getattr(lote, "opciones_sublote_tn", [2, 5, 10]),
                "modalidad_flete": lote.modalidad_flete,
            }
        )

    payload = {
        "comprador": {
            "codigo": loc_comprador["codigo"],
            "nombre": loc_comprador["nombre"],
            "lat": coord_comprador["lat"],
            "lng": coord_comprador["lng"],
            "ruta": coord_comprador["ruta"],
            "zona": coord_comprador["zona"],
        },
        "productores": productores_data,
    }
    return json.dumps(payload, ensure_ascii=False)


def crear_nuevo_lote(datos: dict) -> LoteSubproducto:
    """
    Registra un nuevo lote de subproducto publicado por una agroindustria,
    infiriendo perfiles_comprador, humedad_estado, carroceria_requerida, usos_recomendados
    y densidad_kg_m3 coherentes según la categoría si no vienen especificados.
    Soporta publicación de Lotes Urgentes y Lotes Futuros fraccionables en sublotes.
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
    tipo_publicacion = (datos.get("tipo_publicacion") or "INMEDIATO").upper().strip()
    es_urgente = bool(datos.get("es_urgente")) or tipo_publicacion == "URGENTE"
    sublote_min_raw = datos.get("sublote_min_tn")
    sublote_min_tn = int(float(sublote_min_raw)) if sublote_min_raw not in (None, "", 0, "0") else 5

    if tipo_publicacion == "FUTURO":
        fecha_disp = (datos.get("fecha_disponibilidad") or "Entrega 15 días").strip()
        if "futuro" not in humedad_estado.lower():
            humedad_estado = f"Lote Futuro ({fecha_disp}) · Fraccionable desde {sublote_min_tn} tn"
    elif es_urgente:
        if "urgente" not in humedad_estado.lower() and "48hs" not in humedad_estado.lower():
            humedad_estado = f"{humedad_estado} / Despacho urgente 48hs"
    elif datos.get("permite_sublotes") and "desde" not in humedad_estado.lower():
        humedad_estado = f"{humedad_estado} · Sublotes desde {sublote_min_tn} tn"

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

    modalidad_flete, porcentaje_flete_vendedor = _resolver_modalidad_flete(
        datos.get("modalidad_flete"), datos.get("porcentaje_flete_vendedor")
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
        modalidad_flete=modalidad_flete,
        porcentaje_flete_vendedor=porcentaje_flete_vendedor,
    )


def crear_nuevo_camion_retorno(datos: dict) -> CamionRetorno:
    """
    Permite que un transportista o flota registre un nuevo camión con retorno vacío
    en la bolsa de Flete Calzado del NEA.
    """
    transportista = (datos.get("transportista") or "Transporte Regional NEA").strip()
    origen_viaje = (datos.get("origen_viaje") or "Corrientes Capital").strip()
    destino_viaje = (datos.get("destino_viaje") or "Goya, Corrientes").strip()
    pasa_por = (
        datos.get("pasa_por") or "Saladas, San Roque, Bella Vista"
    ).strip()
    fecha_disponible = (
        datos.get("fecha_disponible") or "Hoy — Salida 17:00 hs"
    ).strip()
    tipo_carroceria = (
        datos.get("tipo_carroceria") or "Batea Cerealera con Lona (85 m3)"
    ).strip()

    cap_tn_raw = datos.get("capacidad_max_tn")
    capacidad_max_tn = (
        float(cap_tn_raw) if cap_tn_raw not in (None, "", 0, "0") else 30.0
    )

    cap_m3_raw = datos.get("capacidad_max_m3")
    capacidad_max_m3 = (
        float(cap_m3_raw) if cap_m3_raw not in (None, "", 0, "0") else 85.0
    )

    desc_raw = datos.get("descuento_retorno_pct")
    descuento_retorno_pct = (
        float(desc_raw) if desc_raw not in (None, "", 0, "0") else 45.0
    )

    return CamionRetorno.objects.create(
        transportista=transportista,
        origen_viaje=origen_viaje,
        destino_viaje=destino_viaje,
        pasa_por=pasa_por,
        fecha_disponible=fecha_disponible,
        tipo_carroceria=tipo_carroceria,
        capacidad_max_tn=capacidad_max_tn,
        capacidad_max_m3=capacidad_max_m3,
        descuento_retorno_pct=descuento_retorno_pct,
        disponible=True,
    )


def enriquecer_camiones_con_cargas(
    camiones: Iterable[CamionRetorno],
    lotes: Iterable[LoteSubproducto],
) -> List[CamionRetorno]:
    """
    Para cada camión de retorno, adjunta en memoria:
    - camion.lotes_compatibles_ruta: lotes cuya localidad de origen coincide o está en el corredor del camión.
    - camion.ingreso_estimado_retorno_ars: monto estimado (~$520.000 a $770.000 ARS) que recupera el
      transportista en lugar de regresar vacío.
    """
    lista_camiones = list(camiones)
    lista_lotes = list(lotes) if lotes is not None else list(LoteSubproducto.objects.all())

    for camion in lista_camiones:
        corredor_texto = " ".join(
            [
                camion.origen_viaje or "",
                camion.destino_viaje or "",
                camion.pasa_por or "",
            ]
        ).lower()

        compatibles: List[LoteSubproducto] = []
        for lote in lista_lotes:
            origen_lote = (lote.localidad_origen or "").strip().lower()
            provincia_lote = (lote.provincia or "").strip().lower()
            if origen_lote and origen_lote in corredor_texto:
                compatibles.append(lote)
            elif "sáenz peña" in origen_lote or "saenz peña" in origen_lote:
                if "resistencia" in corredor_texto or "chaco" in corredor_texto:
                    compatibles.append(lote)
            elif provincia_lote == "chaco" and "resistencia" in corredor_texto:
                compatibles.append(lote)

        if not compatibles and lista_lotes:
            compatibles = lista_lotes[:2]

        camion.lotes_compatibles_ruta = compatibles
        camion.cantidad_lotes_compatibles = len(compatibles)

        descuento_pct = float(camion.descuento_retorno_pct or 45.0)
        capacidad_m3 = float(camion.capacidad_max_m3 or 85.0)
        tarifa_base_corredor = 1400000.0 if capacidad_m3 >= 85.0 else 1100000.0
        ingreso_calculado = round(
            tarifa_base_corredor * (1.0 - (descuento_pct / 100.0)), -3
        )
        camion.ingreso_estimado_retorno_ars = int(
            max(520000, min(770000, ingreso_calculado))
        )

    return lista_camiones


def obtener_camiones_con_oportunidades(
    lotes: Optional[Iterable[LoteSubproducto]] = None,
) -> List[CamionRetorno]:
    """
    Devuelve los camiones de retorno disponibles enriquecidos con los lotes compatibles en su ruta.
    """
    camiones_qs = CamionRetorno.objects.filter(disponible=True).order_by("-id")
    return enriquecer_camiones_con_cargas(camiones_qs, lotes)


PERFILES_USUARIO_DEMO = [
    {
        "id": "usr-comprador",
        "rol": "comprador",
        "nombre": "Don Aníbal Gómez",
        "organizacion": "Granja Avícola San Isidro SRL",
        "localidad": "Goya, Corrientes",
        "actividad": "Producción Avícola",
        "descripcion": "Busca cascarilla o aserrín para cama de galpón puesta en tranquera.",
        "codigo_perfil": "AVICOLA",
        "codigo_localidad": "GOYA",
    },
    {
        "id": "usr-vendedor",
        "rol": "vendedor",
        "nombre": "Ing. Carlos Romero",
        "organizacion": "Molino Arrocero San Lorenzo SRL",
        "localidad": "Saladas, Corrientes",
        "actividad": "Molino Arrocero",
        "descripcion": "Genera 15 tn/día de cascarilla seca y necesita evacuar galpón sin multas.",
        "codigo_perfil": "ARROZ",
        "codigo_localidad": "SALADAS",
    },
    {
        "id": "usr-logistica",
        "rol": "logistica",
        "nombre": "Horacio Giménez",
        "organizacion": "Transporte Don Horacio (Batea 85 m³)",
        "localidad": "Corrientes Capital",
        "actividad": "Transportista Independiente",
        "descripcion": "Regresa vacío por RN 12 hacia Goya/Reconquista y busca calzar carga.",
        "codigo_perfil": "LOGISTICA",
        "codigo_localidad": "CORRIENTES",
    },
]


def editar_lote_existente(lote_id: int, datos: dict) -> LoteSubproducto:
    """
    Modifica los datos de un lote de subproducto publicado en Supabase.
    """
    lote = LoteSubproducto.objects.get(id=lote_id)
    if "titulo" in datos and datos["titulo"]:
        lote.titulo = str(datos["titulo"]).strip()
    if "categoria" in datos and datos["categoria"]:
        lote.categoria = str(datos["categoria"]).upper().strip()
    if "empresa_vendedora" in datos and datos["empresa_vendedora"]:
        lote.empresa_vendedora = str(datos["empresa_vendedora"]).strip()
    if "localidad_origen" in datos and datos["localidad_origen"]:
        lote.localidad_origen = str(datos["localidad_origen"]).strip()
    if "toneladas_disponibles" in datos and datos["toneladas_disponibles"] is not None:
        lote.toneladas_disponibles = max(1.0, float(datos["toneladas_disponibles"]))
    if "densidad_kg_m3" in datos and datos["densidad_kg_m3"] is not None:
        lote.densidad_kg_m3 = max(50, int(datos["densidad_kg_m3"]))
    if "precio_tonelada_ars" in datos and datos["precio_tonelada_ars"] is not None:
        lote.precio_tonelada_ars = max(0.0, float(datos["precio_tonelada_ars"]))
    if datos.get("modalidad_flete") or "porcentaje_flete_vendedor" in datos:
        lote.modalidad_flete, lote.porcentaje_flete_vendedor = _resolver_modalidad_flete(
            datos.get("modalidad_flete") or lote.modalidad_flete,
            datos.get("porcentaje_flete_vendedor", lote.porcentaje_flete_vendedor),
        )
    if "usos_recomendados" in datos and datos["usos_recomendados"]:
        lote.usos_recomendados = str(datos["usos_recomendados"]).strip()
    lote.save()
    return lote


def eliminar_lote_existente(lote_id: int) -> str:
    """
    Da de baja un lote de subproducto de la base de datos.
    """
    lote = LoteSubproducto.objects.get(id=lote_id)
    titulo = lote.titulo
    lote.delete()
    return titulo


def editar_camion_existente(camion_id: int, datos: dict) -> CamionRetorno:
    """
    Modifica los datos o disponibilidad de un camión con Flete Calzado.
    """
    camion = CamionRetorno.objects.get(id=camion_id)
    if "transportista" in datos and datos["transportista"]:
        camion.transportista = str(datos["transportista"]).strip()
    if "origen_viaje" in datos and datos["origen_viaje"]:
        camion.origen_viaje = str(datos["origen_viaje"]).strip()
    if "destino_viaje" in datos and datos["destino_viaje"]:
        camion.destino_viaje = str(datos["destino_viaje"]).strip()
    if "pasa_por" in datos and datos["pasa_por"]:
        camion.pasa_por = str(datos["pasa_por"]).strip()
    if "fecha_disponible" in datos and datos["fecha_disponible"]:
        camion.fecha_disponible = str(datos["fecha_disponible"]).strip()
    if "tipo_carroceria" in datos and datos["tipo_carroceria"]:
        camion.tipo_carroceria = str(datos["tipo_carroceria"]).strip()
    if "capacidad_max_m3" in datos and datos["capacidad_max_m3"] is not None:
        camion.capacidad_max_m3 = max(20.0, float(datos["capacidad_max_m3"]))
    if "descuento_retorno_pct" in datos and datos["descuento_retorno_pct"] is not None:
        camion.descuento_retorno_pct = max(10.0, min(70.0, float(datos["descuento_retorno_pct"])))
    if "disponible" in datos and datos["disponible"] is not None:
        camion.disponible = bool(datos["disponible"])
    camion.save()
    return camion


def eliminar_camion_existente(camion_id: int) -> str:
    """
    Da de baja un camión de retorno de la bolsa logística.
    """
    camion = CamionRetorno.objects.get(id=camion_id)
    nombre = camion.transportista
    camion.delete()
    return nombre

