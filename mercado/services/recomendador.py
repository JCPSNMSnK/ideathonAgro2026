"""
=============================================================================
MÓDULO CARRIL 2 (Responsable sugerido: Joel Marcori)
=============================================================================
Objetivo:
- Filtrar y recomendar subproductos según el perfil productivo del comprador
  (Avícola, Ganadería/Feedlot, Biomasa/Energía, Vivero/Sustrato).
- Permitir la publicación rápida de nuevos lotes de subproductos desde las
  agroindustrias del NEA.
"""
from typing import List, Optional
from mercado.models import LoteSubproducto

PERFILES_PRODUCTIVOS = [
    {
        "codigo": "TODOS",
        "nombre": "Todos los sectores del NEA",
        "descripcion": "Vista completa de lotes disponibles en Corrientes, Chaco y Misiones.",
    },
    {
        "codigo": "AVICOLA",
        "nombre": "Productor Avícola (Pollos / Ponedoras)",
        "descripcion": "Ideal en Saladas y alrededores: cascarilla de arroz y aserrín seco para cama de galpón.",
    },
    {
        "codigo": "GANADERO",
        "nombre": "Ganadería Bovina / Feedlot / Tambo",
        "descripcion": "Fibra y energía barata: bagazo/cáscara húmeda de citrus y semilla de algodón.",
    },
    {
        "codigo": "BIOMASA",
        "nombre": "Secaderos / Calderas de Biomasa / Biochar",
        "descripcion": "Chips forestales, costanero, aserrín y cascarilla para energía térmica o biocarbón.",
    },
    {
        "codigo": "VIVERO",
        "nombre": "Viveros Forestales / Citricultura / Compost",
        "descripcion": "Sustratos livianos y enmiendas orgánicas a partir de corteza, pino y cascarilla.",
    },
]


def obtener_lotes_recomendados(perfil_comprador: Optional[str] = None) -> List[LoteSubproducto]:
    """
    Devuelve los lotes de subproductos que hacen match con la actividad del comprador.
    """
    qs = LoteSubproducto.objects.all()
    if perfil_comprador and perfil_comprador.upper() != "TODOS":
        codigo = perfil_comprador.upper().strip()
        qs = qs.filter(perfiles_comprador__icontains=codigo)
    return list(qs)


def crear_nuevo_lote(datos: dict) -> LoteSubproducto:
    """
    Registra un nuevo lote de subproducto publicado por una agroindustria.
    """
    return LoteSubproducto.objects.create(
        titulo=datos["titulo"],
        categoria=datos.get("categoria", "ARROZ"),
        empresa_vendedora=datos["empresa_vendedora"],
        localidad_origen=datos.get("localidad_origen", "Saladas"),
        provincia=datos.get("provincia", "Corrientes"),
        toneladas_disponibles=float(datos["toneladas_disponibles"]),
        densidad_kg_m3=int(datos.get("densidad_kg_m3", 200)),
        precio_tonelada_ars=float(datos["precio_tonelada_ars"]),
        humedad_estado=datos.get("humedad_estado", "Seco / A granel"),
        carroceria_requerida=datos.get("carroceria_requerida", "Batea / Semirremolque"),
        usos_recomendados=datos.get(
            "usos_recomendados",
            "Cama avícola, suplementación animal o bioenergía circular",
        ),
        perfiles_comprador=datos.get("perfiles_comprador", "AVICOLA,GANADERO,BIOMASA"),
        modalidad_flete=datos.get("modalidad_flete", "COMPRADOR"),
    )
