from django.urls import path
from . import views

urlpatterns = [
    path("", views.home_demo, name="home_demo"),
    path("api/cotizar/", views.api_cotizar_flete, name="api_cotizar_flete"),
    path("api/reservar/", views.api_reservar_con_garantia, name="api_reservar_con_garantia"),
    path("api/liberar-garantia/", views.api_liberar_garantia, name="api_liberar_garantia"),
    path("api/publicar/", views.api_publicar_lote, name="api_publicar_lote"),
    path("api/lote/<int:lote_id>/editar/", views.api_editar_lote, name="api_editar_lote"),
    path("api/lote/<int:lote_id>/eliminar/", views.api_eliminar_lote, name="api_eliminar_lote"),
    path("api/publicar-camion/", views.api_publicar_camion, name="api_publicar_camion"),
    path("api/camion/<int:camion_id>/editar/", views.api_editar_camion, name="api_editar_camion"),
    path("api/camion/<int:camion_id>/eliminar/", views.api_eliminar_camion, name="api_eliminar_camion"),
    path("api/georef/localidades/", views.api_georef_localidades, name="api_georef_localidades"),
    path("api/georef/ruta/", views.api_georef_ruta_vial, name="api_georef_ruta_vial"),
]
