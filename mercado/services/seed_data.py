"""
=============================================================================
DATASET CURADO POTENTE — SubRuta (Ideathon NEA Tech 2026)
=============================================================================
Incluye:
- 15 lotes reales de subproductos (Polos Arrocero, Forestal, Citrícola,
  Algodonero y Yerbatero del NEA + casos de escalabilidad Pampeana y Cuyo)
  basados en densidades aparentes reales (INTA / INTI).
- 8 flotas de camiones con "Flete Calzado" (retornos vacíos en RN 12, RN 14,
  RN 16, RP 5 y corredores nacionales con descuentos del 40% al 50%).
- 4 operaciones históricas cerradas con Certificado de Trazabilidad Ambiental.
"""
from django.db import connection
from mercado.models import LoteSubproducto, CamionRetorno, OperacionTrazabilidad


LOTES_DATASET_COMPLETO = [
    # --- 1. SECTOR ARROCERO (Corrientes / Chaco) ---
    {
        "titulo": "Cascarilla de Arroz Seca a Granel (Galpón Sur)",
        "categoria": "ARROZ",
        "empresa_vendedora": "Molino Arrocero San Lorenzo",
        "localidad_origen": "Saladas",
        "provincia": "Corrientes",
        "toneladas_disponibles": 14.0,
        "densidad_kg_m3": 165,
        "precio_tonelada_ars": 22000.0,
        "humedad_estado": "Seco (11% hum.) / A granel",
        "carroceria_requerida": "Batea o Semirremolque con lona",
        "usos_recomendados": "Cama avícola térmica y absorbente para pollos/ponedoras (reemplaza viruta cara), sustrato de vivero y biomasa",
        "perfiles_comprador": "AVICOLA,VIVERO,BIOMASA",
        "modalidad_flete": "COMPRADOR",
    },
    {
        "titulo": "Afrechillo / Polvillo de Arroz Estabilizado",
        "categoria": "ARROZ",
        "empresa_vendedora": "Arrocera del Paiubre SA",
        "localidad_origen": "Mercedes",
        "provincia": "Corrientes",
        "toneladas_disponibles": 28.0,
        "densidad_kg_m3": 410,
        "precio_tonelada_ars": 68000.0,
        "humedad_estado": "Seco (12% hum.) / A granel o big-bag",
        "carroceria_requerida": "Batea o Tolva cerealera",
        "usos_recomendados": "Suplemento energético-proteico de alta grasa (14% lípidos) para recría bovina y feedlot; ahorra 30% frente al maíz",
        "perfiles_comprador": "GANADERO",
        "modalidad_flete": "COMPARTIDO_50_50",
    },
    {
        "titulo": "Arrocín y Grano Partido de Segunda para Ración",
        "categoria": "ARROZ",
        "empresa_vendedora": "Cooperativa Arrocera Río Paraná",
        "localidad_origen": "San Roque",
        "provincia": "Corrientes",
        "toneladas_disponibles": 24.0,
        "densidad_kg_m3": 580,
        "precio_tonelada_ars": 82000.0,
        "humedad_estado": "Seco / A granel limpio",
        "carroceria_requerida": "Tolva o Batea cerealera",
        "usos_recomendados": "Alimento energético directo para engorde avícola, porcino y suplementación invernal de terneros",
        "perfiles_comprador": "AVICOLA,GANADERO",
        "modalidad_flete": "COMPRADOR",
    },

    # --- 2. SECTOR FORESTO-INDUSTRIAL (Corrientes / Misiones) ---
    {
        "titulo": "Aserrín y Viruta Fina de Pino Seleccionado",
        "categoria": "MADERA",
        "empresa_vendedora": "Aserradero Río Paraná SRL",
        "localidad_origen": "Saladas",
        "provincia": "Corrientes",
        "toneladas_disponibles": 12.0,
        "densidad_kg_m3": 210,
        "precio_tonelada_ars": 18500.0,
        "humedad_estado": "Seco de horno / A granel o bolsones",
        "carroceria_requerida": "Semirremolque baranda volcable / Batea",
        "usos_recomendados": "Cama de galpón avícola libre de taninos, compostaje orgánico y prensado de pellets de bioenergía",
        "perfiles_comprador": "AVICOLA,BIOMASA,VIVERO",
        "modalidad_flete": "COMPARTIDO_50_50",
    },
    {
        "titulo": "Viruta de Eucalipto Enfardada Seca",
        "categoria": "MADERA",
        "empresa_vendedora": "Maderas Santa Rosa SA",
        "localidad_origen": "Santa Rosa",
        "provincia": "Corrientes",
        "toneladas_disponibles": 18.0,
        "densidad_kg_m3": 280,
        "precio_tonelada_ars": 24000.0,
        "humedad_estado": "Seco / En fardos prensados",
        "carroceria_requerida": "Semirremolque playo o baranda volcable",
        "usos_recomendados": "Cama limpia para granjas avícolas, cabañas bovinas/equinas y retención de humedad en viveros",
        "perfiles_comprador": "AVICOLA,GANADERO,VIVERO",
        "modalidad_flete": "COMPRADOR",
    },
    {
        "titulo": "Chips y Costanero Triturado para Caldera",
        "categoria": "MADERA",
        "empresa_vendedora": "Foresto Industrial Santo Tomé",
        "localidad_origen": "Gobernador Virasoro",
        "provincia": "Corrientes",
        "toneladas_disponibles": 22.0,
        "densidad_kg_m3": 320,
        "precio_tonelada_ars": 26000.0,
        "humedad_estado": "Semi-seco (25% hum.) / A granel",
        "carroceria_requerida": "Batea de gran volumen (90 m3)",
        "usos_recomendados": "Combustible renovable para secaderos de yerba mate, calderas industriales y producción de biochar",
        "perfiles_comprador": "BIOMASA",
        "modalidad_flete": "COMPARTIDO_50_50",
    },
    {
        "titulo": "Corteza de Pino Compostada (Sustrato Orgánico)",
        "categoria": "MADERA",
        "empresa_vendedora": "Biomasa Ituzaingó SRL",
        "localidad_origen": "Ituzaingó",
        "provincia": "Corrientes",
        "toneladas_disponibles": 20.0,
        "densidad_kg_m3": 350,
        "precio_tonelada_ars": 21000.0,
        "humedad_estado": "Estabilizado / Urgencia por liberar playa",
        "carroceria_requerida": "Batea o Semirremolque volcable",
        "usos_recomendados": "Sustrato profesional para viveros forestales, citrícolas y yerbateros; mejora aireación de suelos",
        "perfiles_comprador": "VIVERO,BIOMASA",
        "modalidad_flete": "VENDEDOR",
    },

    # --- 3. SECTOR CITRÍCOLA (Corrientes) ---
    {
        "titulo": "Bagazo y Cáscara Húmeda de Naranja/Limón",
        "categoria": "CITRUS",
        "empresa_vendedora": "Jugos del Litoral SA",
        "localidad_origen": "Bella Vista",
        "provincia": "Corrientes",
        "toneladas_disponibles": 24.0,
        "densidad_kg_m3": 650,
        "precio_tonelada_ars": 14000.0,
        "humedad_estado": "Húmedo (78% hum.) / Despacho urgente 48hs",
        "carroceria_requerida": "Batea cerealera estanca",
        "usos_recomendados": "Fibra altamente digestible y pectina para vacas de cría, recría y tambo (alta palatabilidad a costo mínimo)",
        "perfiles_comprador": "GANADERO",
        "modalidad_flete": "VENDEDOR",
    },
    {
        "titulo": "Pulpa y Semilla Cítrica Prensada para Feedlot",
        "categoria": "CITRUS",
        "empresa_vendedora": "Citromax Río Uruguay",
        "localidad_origen": "Monte Caseros",
        "provincia": "Corrientes",
        "toneladas_disponibles": 26.0,
        "densidad_kg_m3": 620,
        "precio_tonelada_ars": 19500.0,
        "humedad_estado": "Prensado semi-húmedo / A granel",
        "carroceria_requerida": "Batea cerealera estanca",
        "usos_recomendados": "Reemplaza hasta el 25% de grano húmedo o silaje en dietas de engorde a corral y recría pastoril",
        "perfiles_comprador": "GANADERO",
        "modalidad_flete": "COMPARTIDO_50_50",
    },

    # --- 4. SECTOR ALGODONERO Y YERBATERO (Chaco / Corrientes / Misiones) ---
    {
        "titulo": "Semilla de Algodón Bruta con Linter (Forrajera)",
        "categoria": "ALGODON",
        "empresa_vendedora": "Desmotadora Chaco-Corrientes",
        "localidad_origen": "Presidencia Roque Sáenz Peña",
        "provincia": "Chaco",
        "toneladas_disponibles": 26.0,
        "densidad_kg_m3": 480,
        "precio_tonelada_ars": 95000.0,
        "humedad_estado": "Seco / A granel",
        "carroceria_requerida": "Batea o Tolva cerealera",
        "usos_recomendados": "Triple aporte (proteína 22%, grasa y fibra efectiva) ideal para tambos, toros y vientres en invierno",
        "perfiles_comprador": "GANADERO",
        "modalidad_flete": "COMPRADOR",
    },
    {
        "titulo": "Cascarilla de Algodón para Fibra en Rumiantes",
        "categoria": "ALGODON",
        "empresa_vendedora": "Algodonera Santa Lucía",
        "localidad_origen": "Goya",
        "provincia": "Corrientes",
        "toneladas_disponibles": 16.0,
        "densidad_kg_m3": 260,
        "precio_tonelada_ars": 32000.0,
        "humedad_estado": "Seco / A granel liviano",
        "carroceria_requerida": "Batea de alto volumen o Jaula con lona",
        "usos_recomendados": "Fuente de fibra larga económica cuando falta rollo o pasto en rodeos de cría y feedlots",
        "perfiles_comprador": "GANADERO,AVICOLA",
        "modalidad_flete": "COMPARTIDO_50_50",
    },
    {
        "titulo": "Palo y Polvo de Descarte de Yerba Mate",
        "categoria": "OTRO",
        "empresa_vendedora": "Molino Yerbatero Zona Norte",
        "localidad_origen": "Gobernador Virasoro",
        "provincia": "Corrientes",
        "toneladas_disponibles": 18.0,
        "densidad_kg_m3": 340,
        "precio_tonelada_ars": 15000.0,
        "humedad_estado": "Seco / A granel o bolsones",
        "carroceria_requerida": "Batea o Semirremolque con lona",
        "usos_recomendados": "Enmienda orgánica rica en nitrógeno/potasio para viveros, compostaje acelerado y briquetas térmicas",
        "perfiles_comprador": "VIVERO,BIOMASA",
        "modalidad_flete": "VENDEDOR",
    },

    # --- 5. ESCALABILIDAD NACIONAL (Región Pampeana y Cuyo) ---
    {
        "titulo": "Expeller de Girasol y Soja Extrusado",
        "categoria": "OTRO",
        "empresa_vendedora": "Aceitera del Norte Santafesino",
        "localidad_origen": "Reconquista",
        "provincia": "Santa Fe",
        "toneladas_disponibles": 29.0,
        "densidad_kg_m3": 560,
        "precio_tonelada_ars": 135000.0,
        "humedad_estado": "Seco (10% hum.) / Pelleteado a granel",
        "carroceria_requerida": "Tolva o Batea cerealera",
        "usos_recomendados": "Núcleo proteico de alta digestibilidad para nutrición avícola, lechería y terminación a corral",
        "perfiles_comprador": "GANADERO,AVICOLA",
        "modalidad_flete": "COMPRADOR",
    },
    {
        "titulo": "Burlanda Húmeda de Maíz (WDGS - Bioetanol)",
        "categoria": "OTRO",
        "empresa_vendedora": "Bioetanol Río Cuarto SA",
        "localidad_origen": "Río Cuarto",
        "provincia": "Córdoba (Pampa Húmeda)",
        "toneladas_disponibles": 28.0,
        "densidad_kg_m3": 610,
        "precio_tonelada_ars": 54000.0,
        "humedad_estado": "Húmedo (65% hum.) / A granel",
        "carroceria_requerida": "Batea estanca",
        "usos_recomendados": "Caso Escalabilidad Región Pampeana: proteína bypass y energía para feedlots y tambos",
        "perfiles_comprador": "GANADERO",
        "modalidad_flete": "COMPARTIDO_50_50",
    },
    {
        "titulo": "Orujo Agotado de Uva y Carozo de Olivo",
        "categoria": "OTRO",
        "empresa_vendedora": "Derivados Agroindustriales de Cuyo",
        "localidad_origen": "San Martín",
        "provincia": "Mendoza (Cuyo)",
        "toneladas_disponibles": 25.0,
        "densidad_kg_m3": 580,
        "precio_tonelada_ars": 28000.0,
        "humedad_estado": "Semi-seco / A granel",
        "carroceria_requerida": "Batea o Baranda volcable",
        "usos_recomendados": "Caso Escalabilidad Región Cuyo: fibra antioxidante para rumiantes, compost vitivinícola y biomasa",
        "perfiles_comprador": "GANADERO,BIOMASA,VIVERO",
        "modalidad_flete": "VENDEDOR",
    },
]


CAMIONES_DATASET_COMPLETO = [
    {
        "transportista": "Transporte Litoral Express (Unidad #14)",
        "origen_viaje": "Corrientes Capital",
        "destino_viaje": "Goya / Esquina",
        "pasa_por": "RN 12: Empedrado, Saladas, San Roque, Bella Vista",
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
        "pasa_por": "RN 14: Virasoro, Santo Tomé, Alvear, Paso de los Libres",
        "fecha_disponible": "Jueves — Turno Mañana",
        "tipo_carroceria": "Batea Forestal Alto Volumen (95 m3)",
        "capacidad_max_tn": 30.0,
        "capacidad_max_m3": 95.0,
        "descuento_retorno_pct": 42.0,
        "disponible": True,
    },
    {
        "transportista": "Transportes Don Horacio (Retorno Gran Rosario)",
        "origen_viaje": "Puerto San Lorenzo (Santa Fe)",
        "destino_viaje": "Bella Vista / Saladas (Corrientes)",
        "pasa_por": "RN 11 y RN 12: Reconquista, Goya, Lavalle, Bella Vista, Saladas",
        "fecha_disponible": "Hoy — 19:00 hs",
        "tipo_carroceria": "Batea Cerealera Estanca (82 m3)",
        "capacidad_max_tn": 30.0,
        "capacidad_max_m3": 82.0,
        "descuento_retorno_pct": 50.0,
        "disponible": True,
    },
    {
        "transportista": "Coop. de Camioneros del Chaco (Unidad #22)",
        "origen_viaje": "Puerto Barranqueras / Corrientes",
        "destino_viaje": "Sáenz Peña / Charata (Chaco)",
        "pasa_por": "RN 16: Makallé, Presidencia de la Plaza, Machagai, Sáenz Peña",
        "fecha_disponible": "Mañana — 14:00 hs",
        "tipo_carroceria": "Tolva / Batea Semillera (85 m3)",
        "capacidad_max_tn": 30.0,
        "capacidad_max_m3": 85.0,
        "descuento_retorno_pct": 44.0,
        "disponible": True,
    },
    {
        "transportista": "Fletes del Iberá SRL (Unidad #05)",
        "origen_viaje": "Ituzaingó / Santa Rosa",
        "destino_viaje": "Concepción / Goya",
        "pasa_por": "RP 5 y RN 12: Santa Rosa, Saladas, San Roque, Mantilla",
        "fecha_disponible": "Viernes — 07:30 hs",
        "tipo_carroceria": "Piso Móvil Forestal Gran Volumen (98 m3)",
        "capacidad_max_tn": 28.0,
        "capacidad_max_m3": 98.0,
        "descuento_retorno_pct": 46.0,
        "disponible": True,
    },
    {
        "transportista": "TransPampa - Litoral SA (Unidad #31)",
        "origen_viaje": "Río Cuarto / Villa María (Córdoba)",
        "destino_viaje": "Corrientes / Resistencia",
        "pasa_por": "RN 19 y RN 11: Santa Fe, Vera, Reconquista, Resistencia",
        "fecha_disponible": "Viernes — Turno Tarde",
        "tipo_carroceria": "Batea Acero Inoxidable p/ Húmedos (80 m3)",
        "capacidad_max_tn": 30.0,
        "capacidad_max_m3": 80.0,
        "descuento_retorno_pct": 40.0,
        "disponible": True,
    },
    {
        "transportista": "Andes Cargas SA (Corredor Cuyo #19)",
        "origen_viaje": "Villa Mercedes (San Luis)",
        "destino_viaje": "San Martín / Maipú (Mendoza)",
        "pasa_por": "RN 7: La Paz, Santa Rosa, San Martín (Mendoza)",
        "fecha_disponible": "Sábado — 09:00 hs",
        "tipo_carroceria": "Semirremolque Baranda Volcable (88 m3)",
        "capacidad_max_tn": 29.0,
        "capacidad_max_m3": 88.0,
        "descuento_retorno_pct": 43.0,
        "disponible": True,
    },
]


def _asegurar_operacion_activa_demo():
    """
    Garantiza que exista al menos una operación en estado PAGO_EN_GARANTIA_ACTIVO
    entre los perfiles principales de la demo (Granja Avícola San Isidro SRL,
    Molino Arrocero San Lorenzo y Transportes Don Horacio) para demostrar la firma
    y cierre de certificado por parte del comprador.
    """
    hash_demo_activa = "0x4d92b711e503a89c14027f88d34c9012a6731b8e"
    if OperacionTrazabilidad.objects.filter(hash_certificado=hash_demo_activa).exists():
        return

    lote_molino = (
        LoteSubproducto.objects.filter(empresa_vendedora__icontains="San Lorenzo").first()
        or LoteSubproducto.objects.first()
    )
    camion_horacio = (
        CamionRetorno.objects.filter(transportista__icontains="Don Horacio").first()
        or CamionRetorno.objects.first()
    )
    if not lote_molino:
        return

    OperacionTrazabilidad.objects.get_or_create(
        hash_certificado=hash_demo_activa,
        defaults={
            "lote": lote_molino,
            "camion": camion_horacio,
            "comprador_nombre": "Granja Avícola San Isidro SRL",
            "localidad_destino": "Goya, Corrientes",
            "distancia_km": 135,
            "volumen_m3_calculado": 60.6,
            "subtotal_subproducto_ars": 220000.0,
            "flete_tradicional_fadeeac_ars": 942000.0,
            "flete_calzado_ars": 471000.0,
            "ahorro_logistico_ars": 471000.0,
            "comision_plataforma_ars": 17275.0,
            "estado_garantia": "PAGO_EN_GARANTIA_ACTIVO",
            "red_blockchain": "Hedera Testnet (HCS Topic 0.0.4829104)",
        },
    )


def asegurar_datos_iniciales_nea(forzar_recarga: bool = False):
    """
    Si la base tiene menos de 15 lotes (o si se pide forzar_recarga=True),
    sincroniza el Dataset Curado Completo de 15 lotes + 8 camiones + 5 certificados
    y crea índices de velocidad en PostgreSQL/SQLite.
    """
    if not forzar_recarga and LoteSubproducto.objects.count() >= 15:
        # Asegurar que al menos existan lotes etiquetados para la demo de Lote Futuro y Sublotes
        if not LoteSubproducto.objects.filter(humedad_estado__icontains="futuro").exists():
            LoteSubproducto.objects.filter(categoria="ALGODON").update(
                humedad_estado="Lote Futuro (Zafra Quincenal) · Fraccionable desde 5 tn"
            )
            LoteSubproducto.objects.filter(categoria="MADERA", localidad_origen__icontains="Virasoro").update(
                humedad_estado="Lote Futuro (Entrega 15 días) · Sublotes desde 5 tn"
            )
        _asegurar_operacion_activa_demo()
        return

    # 1. Sincronizar Lotes (actualiza o crea por título)
    lotes_creados = []
    for item in LOTES_DATASET_COMPLETO:
        obj, _ = LoteSubproducto.objects.update_or_create(
            titulo=item["titulo"],
            defaults=item,
        )
        lotes_creados.append(obj)

    # 2. Sincronizar Camiones de Retorno
    camiones_creados = []
    for cam in CAMIONES_DATASET_COMPLETO:
        obj, _ = CamionRetorno.objects.update_or_create(
            transportista=cam["transportista"],
            defaults=cam,
        )
        camiones_creados.append(obj)

    # 3. Precargar Certificados de Trazabilidad Históricos si aún no hay suficientes
    if OperacionTrazabilidad.objects.count() < 4 and lotes_creados and camiones_creados:
        historicos = [
            {
                "lote": lotes_creados[0],
                "camion": camiones_creados[0],
                "comprador_nombre": "Granja Avícola San Isidro SRL",
                "localidad_destino": "Goya, Corrientes",
                "distancia_km": 155,
                "volumen_m3_calculado": 84.8,
                "subtotal_subproducto_ars": 308000.0,
                "flete_tradicional_fadeeac_ars": 1081500.0,
                "flete_calzado_ars": 505600.0,
                "ahorro_logistico_ars": 575900.0,
                "comision_plataforma_ars": 20340.0,
                "estado_garantia": "DESCARGA_CONFIRMADA_PAGO_LIBERADO",
                "red_blockchain": "Hedera Testnet (HCS Topic 0.0.4829104)",
                "hash_certificado": "0x9f84c2a17e30b5d8c61209fa4e77b3108c29a11e",
            },
            {
                "lote": lotes_creados[7],
                "camion": camiones_creados[3],
                "comprador_nombre": "Establecimiento Ganadero El Ceibo",
                "localidad_destino": "San Roque, Corrientes",
                "distancia_km": 95,
                "volumen_m3_calculado": 36.9,
                "subtotal_subproducto_ars": 336000.0,
                "flete_tradicional_fadeeac_ars": 590200.0,
                "flete_calzado_ars": 250835.0,
                "ahorro_logistico_ars": 339365.0,
                "comision_plataforma_ars": 14670.0,
                "estado_garantia": "DESCARGA_CONFIRMADA_PAGO_LIBERADO",
                "red_blockchain": "Hedera Testnet (HCS Topic 0.0.4829104)",
                "hash_certificado": "0x3b71e904d22c81a5f00478e91c63d442a7180f2c",
            },
            {
                "lote": lotes_creados[1],
                "camion": camiones_creados[1],
                "comprador_nombre": "Feedlot Las Tres Marías SA",
                "localidad_destino": "Curuzú Cuatiá, Corrientes",
                "distancia_km": 140,
                "volumen_m3_calculado": 68.3,
                "subtotal_subproducto_ars": 1904000.0,
                "flete_tradicional_fadeeac_ars": 928700.0,
                "flete_calzado_ars": 410485.0,
                "ahorro_logistico_ars": 518215.0,
                "comision_plataforma_ars": 52730.0,
                "estado_garantia": "PAGO_EN_GARANTIA_ACTIVO",
                "red_blockchain": "Hedera Testnet (HCS Topic 0.0.4829104)",
                "hash_certificado": "0x7c15a833f901b44e27189c05a33e8910b5217d4a",
            },
            {
                "lote": lotes_creados[5],
                "camion": camiones_creados[2],
                "comprador_nombre": "Secadero Yerbales del Sur SRL",
                "localidad_destino": "Santo Tomé, Corrientes",
                "distancia_km": 75,
                "volumen_m3_calculado": 68.8,
                "subtotal_subproducto_ars": 572000.0,
                "flete_tradicional_fadeeac_ars": 471200.0,
                "flete_calzado_ars": 232300.0,
                "ahorro_logistico_ars": 238900.0,
                "comision_plataforma_ars": 17205.0,
                "estado_garantia": "DESCARGA_CONFIRMADA_PAGO_LIBERADO",
                "red_blockchain": "Hedera Testnet (HCS Topic 0.0.4829104)",
                "hash_certificado": "0x5e42d198a073c66b12098f34e11a7629c8402e9b",
            },
        ]
        for h in historicos:
            OperacionTrazabilidad.objects.get_or_create(
                hash_certificado=h["hash_certificado"],
                defaults=h,
            )

    _asegurar_operacion_activa_demo()

    # 4. Crear índices de rendimiento en la base de datos (PostgreSQL / SQLite)
    with connection.cursor() as cursor:
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_lote_categoria ON mercado_lotesubproducto (categoria);"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_lote_modalidad ON mercado_lotesubproducto (modalidad_flete);"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_camion_disponible ON mercado_camionretorno (disponible);"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_operacion_creado ON mercado_operaciontrazabilidad (creado_en);"
        )
