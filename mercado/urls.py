from django.urls import path
from . import views

urlpatterns = [
    path("", views.home_demo, name="home_demo"),
    path("api/cotizar/", views.api_cotizar_flete, name="api_cotizar_flete"),
    path("api/reservar/", views.api_reservar_con_garantia, name="api_reservar_con_garantia"),
    path("api/publicar/", views.api_publicar_lote, name="api_publicar_lote"),
]
