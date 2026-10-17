from django.db import models


class LoteSubproducto(models.Model):
    """
    Tabla 1: Oferta de subproductos agroindustriales del NEA (y escalable al país).
    Incluye densidad (kg/m3) para calcular el cubicaje real en el camión.
    """
    CATEGORIAS = [
        ("ARROZ", "Sector Arrocero (Cascarilla / Afrechillo)"),
        ("MADERA", "Foresto-Industria (Aserrín / Viruta / Chips)"),
        ("CITRUS", "Sector Citrícola (Bagazo / Cáscara húmeda)"),
        ("ALGODON", "Sector Algodonero (Semilla / Cascarilla)"),
        ("OTRO", "Otros Subproductos Regionales (Yerba / Cuyo / Pampa)"),
    ]

    MODALIDADES_FLETE = [
        ("COMPRADOR", "100% a cargo del Comprador"),
        ("VENDEDOR", "100% absorbido por el Vendedor (Urgencia de vaciado)"),
        ("COMPARTIDO_50_50", "50% Vendedor / 50% Comprador (Flete Compartido)"),
        ("MUTUO_ACUERDO", "Mutuo acuerdo (el Vendedor publica qué porcentaje paga)"),
    ]

    titulo = models.CharField(max_length=160)
    categoria = models.CharField(max_length=60, choices=CATEGORIAS, default="ARROZ")
    empresa_vendedora = models.CharField(max_length=140)
    localidad_origen = models.CharField(max_length=120, default="Saladas")
    provincia = models.CharField(max_length=80, default="Corrientes")
    toneladas_disponibles = models.DecimalField(max_digits=8, decimal_places=2)
    densidad_kg_m3 = models.IntegerField(
        help_text="Kilos que entran en 1 metro cúbico (ej: Cascarilla=165, Aserrín=210, Citrus=650)"
    )
    precio_tonelada_ars = models.DecimalField(max_digits=12, decimal_places=2)
    humedad_estado = models.CharField(max_length=120, default="Seco / A granel")
    carroceria_requerida = models.CharField(max_length=120, default="Batea / Semirremolque")
    usos_recomendados = models.CharField(max_length=255)
    perfiles_comprador = models.CharField(
        max_length=140,
        default="AVICOLA,GANADERO,BIOMASA",
        help_text="Perfiles separados por coma: AVICOLA, GANADERO, BIOMASA, VIVERO",
    )
    modalidad_flete = models.CharField(
        max_length=60, choices=MODALIDADES_FLETE, default="COMPRADOR"
    )
    porcentaje_flete_vendedor = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Solo para MUTUO_ACUERDO: porcentaje del flete que paga el Vendedor (0 a 100)",
    )
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado_en"]

    @property
    def volumen_total_m3(self) -> float:
        """Calcula cuántos metros cúbicos (m3) ocupa el lote completo según su densidad."""
        if not self.densidad_kg_m3 or self.densidad_kg_m3 <= 0:
            return 0.0
        kilos_totales = float(self.toneladas_disponibles) * 1000.0
        return round(kilos_totales / float(self.densidad_kg_m3), 1)

    @property
    def valor_total_lote_ars(self) -> float:
        return round(float(self.toneladas_disponibles) * float(self.precio_tonelada_ars), 2)

    def __str__(self):
        return f"{self.titulo} ({self.localidad_origen}, {self.provincia})"


class CamionRetorno(models.Model):
    """
    Tabla 2: Bolsa de camiones que regresan vacíos ('Flete Calzado').
    """
    transportista = models.CharField(max_length=140)
    origen_viaje = models.CharField(max_length=120)
    destino_viaje = models.CharField(max_length=120)
    pasa_por = models.CharField(max_length=220)
    fecha_disponible = models.CharField(max_length=100)
    tipo_carroceria = models.CharField(max_length=120)
    capacidad_max_tn = models.DecimalField(max_digits=6, decimal_places=2, default=30.00)
    capacidad_max_m3 = models.DecimalField(max_digits=6, decimal_places=2, default=85.00)
    descuento_retorno_pct = models.DecimalField(max_digits=5, decimal_places=2, default=45.00)
    disponible = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.transportista} ({self.origen_viaje} -> {self.destino_viaje} | -{self.descuento_retorno_pct}%)"


class OperacionTrazabilidad(models.Model):
    """
    Tabla 3: Operaciones cerradas con Pago en Garantía (Escrow) y
    Certificado de Trazabilidad Ambiental (Blockchain Invisible).
    """
    lote = models.ForeignKey(LoteSubproducto, on_delete=models.CASCADE)
    camion = models.ForeignKey(CamionRetorno, on_delete=models.SET_NULL, null=True, blank=True)
    comprador_nombre = models.CharField(max_length=140)
    localidad_destino = models.CharField(max_length=120)
    distancia_km = models.IntegerField()
    volumen_m3_calculado = models.DecimalField(max_digits=8, decimal_places=2)
    subtotal_subproducto_ars = models.DecimalField(max_digits=14, decimal_places=2)
    flete_tradicional_fadeeac_ars = models.DecimalField(max_digits=14, decimal_places=2)
    flete_calzado_ars = models.DecimalField(max_digits=14, decimal_places=2)
    ahorro_logistico_ars = models.DecimalField(max_digits=14, decimal_places=2)
    comision_plataforma_ars = models.DecimalField(max_digits=14, decimal_places=2)
    estado_garantia = models.CharField(max_length=80, default="RETENIDO_EN_GARANTIA")
    red_blockchain = models.CharField(max_length=80, default="Hedera Testnet (HCS)")
    hash_certificado = models.CharField(max_length=140)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado_en"]

    def __str__(self):
        return f"Certificado #{self.id} - {self.lote.titulo} ({self.hash_certificado[:16]}...)"
