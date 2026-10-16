from django.contrib import admin
from .models import LoteSubproducto, CamionRetorno, OperacionTrazabilidad


@admin.register(LoteSubproducto)
class LoteSubproductoAdmin(admin.ModelAdmin):
    list_display = (
        "titulo",
        "categoria",
        "empresa_vendedora",
        "localidad_origen",
        "toneladas_disponibles",
        "densidad_kg_m3",
        "precio_tonelada_ars",
        "modalidad_flete",
    )
    list_filter = ("categoria", "provincia", "modalidad_flete")


@admin.register(CamionRetorno)
class CamionRetornoAdmin(admin.ModelAdmin):
    list_display = (
        "transportista",
        "origen_viaje",
        "destino_viaje",
        "fecha_disponible",
        "capacidad_max_tn",
        "capacidad_max_m3",
        "descuento_retorno_pct",
        "disponible",
    )


@admin.register(OperacionTrazabilidad)
class OperacionTrazabilidadAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "comprador_nombre",
        "lote",
        "distancia_km",
        "ahorro_logistico_ars",
        "estado_garantia",
        "hash_certificado",
        "creado_en",
    )
