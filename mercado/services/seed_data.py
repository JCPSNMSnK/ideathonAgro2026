"""
Datos semilla reales del NEA (Saladas, Bella Vista, Gobernador Virasoro, Sáenz Peña)
Se cargan automáticamente si la base de datos (Supabase o SQLite local) está vacía.
"""
from mercado.models import LoteSubproducto, CamionRetorno


def asegurar_datos_iniciales_nea():
    """
    Si no hay lotes cargados en la base de datos activa, inserta los casos
    reales del NEA y los camiones de retorno ('Flete Calzado').
    Si ya existen los lotes iniciales sin metadatos de Lote Futuro, actualiza
    suavemente los lotes de zafra para habilitar la preventa de sublotes en la demo.
    """
    if LoteSubproducto.objects.exists():
        tiene_lote_futuro = (
            LoteSubproducto.objects.filter(humedad_estado__icontains="futuro").exists()
            or LoteSubproducto.objects.filter(humedad_estado__icontains="zafra").exists()
        )
        if not tiene_lote_futuro:
            LoteSubproducto.objects.filter(categoria="ALGODON").update(
                humedad_estado="Lote Futuro (Zafra Quincenal) · Fraccionable desde 5 tn",
                toneladas_disponibles=30.0,
            )
            LoteSubproducto.objects.filter(
                categoria="MADERA", localidad_origen__icontains="Virasoro"
            ).update(
                humedad_estado="Lote Futuro (Entrega 15 días) · Sublotes desde 5 tn",
                toneladas_disponibles=30.0,
            )
        return

    lotes_nea = [
        {
            "titulo": "Cascarilla de Arroz Seca (Lote Galpón Sur)",
            "categoria": "ARROZ",
            "empresa_vendedora": "Molino Arrocero San Lorenzo",
            "localidad_origen": "Saladas",
            "provincia": "Corrientes",
            "toneladas_disponibles": 14.0,
            "densidad_kg_m3": 165,
            "precio_tonelada_ars": 22000.0,
            "humedad_estado": "Seco (11% hum.) / A granel · Sublotes desde 5 tn",
            "carroceria_requerida": "Batea o Semirremolque con lona",
            "usos_recomendados": "Cama para galpones avícolas (pollos/ponedoras), sustrato de vivero y biomasa térmica",
            "perfiles_comprador": "AVICOLA,VIVERO,BIOMASA",
            "modalidad_flete": "COMPRADOR",
        },
        {
            "titulo": "Aserrín y Viruta de Pino Seleccionado",
            "categoria": "MADERA",
            "empresa_vendedora": "Aserradero Río Paraná SRL",
            "localidad_origen": "Saladas",
            "provincia": "Corrientes",
            "toneladas_disponibles": 12.0,
            "densidad_kg_m3": 210,
            "precio_tonelada_ars": 18500.0,
            "humedad_estado": "Seco / A granel o bolsones · Sublotes desde 5 tn",
            "carroceria_requerida": "Semirremolque baranda volcable / Batea",
            "usos_recomendados": "Cama de pollo de alta absorción, compostaje y fabricación de pellets de energía",
            "perfiles_comprador": "AVICOLA,BIOMASA,GANADERO",
            "modalidad_flete": "COMPARTIDO_50_50",
        },
        {
            "titulo": "Bagazo y Cáscara Húmeda de Citrus",
            "categoria": "CITRUS",
            "empresa_vendedora": "Jugos del Litoral SA",
            "localidad_origen": "Bella Vista",
            "provincia": "Corrientes",
            "toneladas_disponibles": 24.0,
            "densidad_kg_m3": 650,
            "precio_tonelada_ars": 14000.0,
            "humedad_estado": "Húmedo (78% hum.) / Despacho urgente 48hs",
            "carroceria_requerida": "Batea cerealera estanca",
            "usos_recomendados": "Suplementación energética y fibra digestible para recría bovina, tambo y feedlot",
            "perfiles_comprador": "GANADERO",
            "modalidad_flete": "VENDEDOR",
        },
        {
            "titulo": "Semilla de Algodón Bruta para Forraje",
            "categoria": "ALGODON",
            "empresa_vendedora": "Desmotadora Chaco-Corrientes",
            "localidad_origen": "Presidencia Roque Sáenz Peña",
            "provincia": "Chaco",
            "toneladas_disponibles": 30.0,
            "densidad_kg_m3": 480,
            "precio_tonelada_ars": 95000.0,
            "humedad_estado": "Lote Futuro (Zafra Quincenal) · Fraccionable desde 5 tn",
            "carroceria_requerida": "Batea o Tolva cerealera",
            "usos_recomendados": "Suplemento proteico-energético de alta fibra para rodeos de cría e invernada",
            "perfiles_comprador": "GANADERO",
            "modalidad_flete": "COMPRADOR",
        },
        {
            "titulo": "Chip y Costanero Forestal para Caldera",
            "categoria": "MADERA",
            "empresa_vendedora": "Foresto Industrial Santo Tomé",
            "localidad_origen": "Gobernador Virasoro",
            "provincia": "Corrientes",
            "toneladas_disponibles": 30.0,
            "densidad_kg_m3": 320,
            "precio_tonelada_ars": 26000.0,
            "humedad_estado": "Lote Futuro (Entrega 15 días) · Sublotes desde 5 tn",
            "carroceria_requerida": "Batea de gran volumen (90 m3)",
            "usos_recomendados": "Generación de vapor industrial, secaderos de yerba/madera y producción de biochar",
            "perfiles_comprador": "BIOMASA",
            "modalidad_flete": "COMPARTIDO_50_50",
        },
    ]

    for item in lotes_nea:
        LoteSubproducto.objects.create(**item)

    camiones_nea = [
        {
            "transportista": "Transporte Litoral Express (Unidad #14)",
            "origen_viaje": "Corrientes Capital",
            "destino_viaje": "Goya / Esquina",
            "pasa_por": "Empedrado, Saladas, San Roque, Bella Vista",
            "fecha_disponible": "Hoy — Salida 16:30 hs",
            "tipo_carroceria": "Batea Cerealera con Lona (85 m3)",
            "capacidad_max_tn": 30.0,
            "capacidad_max_m3": 85.0,
            "descuento_retorno_pct": 45.0,
            "disponible": True,
        },
        {
            "transportista": "Logística Guaraní SRL (Flota Retorno Puerto)",
            "origen_viaje": "Resistencia / Corrientes",
            "destino_viaje": "Mercedes / Curuzú Cuatiá",
            "pasa_por": "Saladas, Mburucuyá, Chavarría, Felipe Yofre",
            "fecha_disponible": "Mañana — 08:00 hs",
            "tipo_carroceria": "Semirremolque Baranda Volcable (90 m3)",
            "capacidad_max_tn": 28.0,
            "capacidad_max_m3": 90.0,
            "descuento_retorno_pct": 48.0,
            "disponible": True,
        },
        {
            "transportista": "Expreso Río Uruguay (Camión #08)",
            "origen_viaje": "Posadas (Misiones)",
            "destino_viaje": "Monte Caseros / Concordia",
            "pasa_por": "Gobernador Virasoro, Santo Tomé, Alvear, Paso de los Libres",
            "fecha_disponible": "Jueves — Turno Mañana",
            "tipo_carroceria": "Batea Forestal Alto Volumen (95 m3)",
            "capacidad_max_tn": 30.0,
            "capacidad_max_m3": 95.0,
            "descuento_retorno_pct": 42.0,
            "disponible": True,
        },
    ]

    for cam in camiones_nea:
        CamionRetorno.objects.create(**cam)
