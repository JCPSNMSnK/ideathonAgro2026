-- =============================================================================
-- SCRIPT DE INICIALIZACIÓN PARA SUPABASE (SQL EDITOR)
-- Proyecto: SubRuta — Ideathon NEA Tech 2026 (Corrientes)
-- =============================================================================

DROP TABLE IF EXISTS mercado_operaciontrazabilidad CASCADE;
DROP TABLE IF EXISTS mercado_camionretorno CASCADE;
DROP TABLE IF EXISTS mercado_lotesubproducto CASCADE;

-- 1. Tabla de Lotes de Subproductos (Oferta Agroindustrial del NEA)
CREATE TABLE mercado_lotesubproducto (
    id BIGSERIAL PRIMARY KEY,
    titulo VARCHAR(160) NOT NULL,
    categoria VARCHAR(60) NOT NULL,
    empresa_vendedora VARCHAR(140) NOT NULL,
    localidad_origen VARCHAR(120) NOT NULL,
    provincia VARCHAR(80) NOT NULL DEFAULT 'Corrientes',
    toneladas_disponibles NUMERIC(8,2) NOT NULL,
    densidad_kg_m3 INTEGER NOT NULL,
    precio_tonelada_ars NUMERIC(12,2) NOT NULL,
    humedad_estado VARCHAR(120) NOT NULL DEFAULT 'Seco / A granel',
    carroceria_requerida VARCHAR(120) NOT NULL DEFAULT 'Batea / Semirremolque',
    usos_recomendados VARCHAR(255) NOT NULL,
    perfiles_comprador VARCHAR(140) NOT NULL,
    modalidad_flete VARCHAR(60) NOT NULL DEFAULT 'COMPRADOR',
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla de Camiones de Retorno ("Flete Calzado")
CREATE TABLE mercado_camionretorno (
    id BIGSERIAL PRIMARY KEY,
    transportista VARCHAR(140) NOT NULL,
    origen_viaje VARCHAR(120) NOT NULL,
    destino_viaje VARCHAR(120) NOT NULL,
    pasa_por VARCHAR(220) NOT NULL,
    fecha_disponible VARCHAR(100) NOT NULL,
    tipo_carroceria VARCHAR(120) NOT NULL,
    capacidad_max_tn NUMERIC(6,2) NOT NULL DEFAULT 30.00,
    capacidad_max_m3 NUMERIC(6,2) NOT NULL DEFAULT 85.00,
    descuento_retorno_pct NUMERIC(5,2) NOT NULL DEFAULT 45.00,
    disponible BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. Tabla de Operaciones Cerradas y Trazabilidad ("Blockchain Invisible")
CREATE TABLE mercado_operaciontrazabilidad (
    id BIGSERIAL PRIMARY KEY,
    lote_id BIGINT REFERENCES mercado_lotesubproducto(id) ON DELETE CASCADE,
    camion_id BIGINT REFERENCES mercado_camionretorno(id) ON DELETE SET NULL,
    comprador_nombre VARCHAR(140) NOT NULL,
    localidad_destino VARCHAR(120) NOT NULL,
    distancia_km INTEGER NOT NULL,
    volumen_m3_calculado NUMERIC(8,2) NOT NULL,
    subtotal_subproducto_ars NUMERIC(14,2) NOT NULL,
    flete_tradicional_fadeeac_ars NUMERIC(14,2) NOT NULL,
    flete_calzado_ars NUMERIC(14,2) NOT NULL,
    ahorro_logistico_ars NUMERIC(14,2) NOT NULL,
    comision_plataforma_ars NUMERIC(14,2) NOT NULL,
    estado_garantia VARCHAR(80) NOT NULL DEFAULT 'RETENIDO_EN_GARANTIA',
    red_blockchain VARCHAR(80) NOT NULL DEFAULT 'Hedera Testnet (HCS)',
    hash_certificado VARCHAR(140) NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- DATOS SEMILLA REALES DEL NEA (Casos Saladas, Bella Vista, Goya, Virasoro)
-- =============================================================================

INSERT INTO mercado_lotesubproducto 
(titulo, categoria, empresa_vendedora, localidad_origen, provincia, toneladas_disponibles, densidad_kg_m3, precio_tonelada_ars, humedad_estado, carroceria_requerida, usos_recomendados, perfiles_comprador, modalidad_flete)
VALUES
('Cascarilla de Arroz Seca (Lote Galpón Sur)', 'ARROZ', 'Molino Arrocero San Lorenzo', 'Saladas', 'Corrientes', 14.00, 165, 22000.00, 'Seco (11% hum.) / A granel', 'Batea o Semirremolque con lona', 'Cama para galpones avícolas (pollos/ponedoras), sustrato de vivero y biomasa térmica', 'AVICOLA,VIVERO,BIOMASA', 'COMPRADOR'),
('Aserrín y Viruta de Pino Seleccionado', 'MADERA', 'Aserradero Río Paraná SRL', 'Saladas', 'Corrientes', 12.00, 210, 18500.00, 'Seco / A granel o bolsones', 'Semirremolque baranda volcable / Batea', 'Cama de pollo de alta absorción, compostaje y fabricación de pellets de energía', 'AVICOLA,BIOMASA,GANADERO', 'COMPARTIDO_50_50'),
('Bagazo y Cáscara Húmeda de Citrus', 'CITRUS', 'Jugos del Litoral SA', 'Bella Vista', 'Corrientes', 24.00, 650, 14000.00, 'Húmedo (78% hum.) / Despacho urgente 48hs', 'Batea cerealera estanca', 'Suplementación energética y fibra digestible para recría bovina, tambo y feedlot', 'GANADERO', 'VENDEDOR'),
('Semilla de Algodón Bruta para Forraje', 'ALGODON', 'Desmotadora Chaco-Corrientes', 'Presidencia Roque Sáenz Peña', 'Chaco', 26.00, 480, 95000.00, 'Seco / A granel', 'Batea o Tolva cerealera', 'Suplemento proteico-energético de alta fibra para rodeos de cría e invernada', 'GANADERO', 'COMPRADOR'),
('Chip y Costanero Forestal para Caldera', 'MADERA', 'Foresto Industrial Santo Tomé', 'Gobernador Virasoro', 'Corrientes', 22.00, 320, 26000.00, 'Semi-seco / A granel', 'Batea de gran volumen (90 m3)', 'Generación de vapor industrial, secaderos de yerba/madera y producción de biochar', 'BIOMASA', 'COMPARTIDO_50_50');

INSERT INTO mercado_camionretorno
(transportista, origen_viaje, destino_viaje, pasa_por, fecha_disponible, tipo_carroceria, capacidad_max_tn, capacidad_max_m3, descuento_retorno_pct, disponible)
VALUES
('Transporte Litoral Express (Unidad #14)', 'Corrientes Capital', 'Goya / Esquina', 'Empedrado, Saladas, San Roque, Bella Vista', 'Hoy — Salida 16:30 hs', 'Batea Cerealera con Lona (85 m3)', 30.00, 85.00, 45.00, TRUE),
('Logística Guaraní SRL (Flota Retorno Puerto)', 'Resistencia / Corrientes', 'Mercedes / Curuzú Cuatiá', 'Saladas, Mburucuyá, Chavarría, Felipe Yofre', 'Mañana — 08:00 hs', 'Semirremolque Baranda Volcable (90 m3)', 28.00, 90.00, 48.00, TRUE),
('Expreso Río Uruguay (Camión #08)', 'Posadas (Misiones)', 'Monte Caseros / Concordia', 'Gobernador Virasoro, Santo Tomé, Alvear, Paso de los Libres', 'Jueves — Turno Mañana', 'Batea Forestal Alto Volumen (95 m3)', 30.00, 95.00, 42.00, TRUE);
