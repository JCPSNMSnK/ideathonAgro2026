/* =============================================================================
   6.2. MAPA FEDERAL INTERACTIVO REAL (LEAFLET.JS + API GEOREF IGN + OSRM ROUTING)
   ============================================================================= */
let datosMapaNEA = null;
let modoMercadoActual = "catalogo";
let regionMapaFiltro = "TODAS";
let leafletMapInstance = null;
let leafletMarkersLayer = null;
let leafletRouteLayer = null;
let georefDebounceTimer = null;
let ultimoProdSeleccionadoMapa = null;

const VISTAS_REGIONALES_ARGENTINA = {
    TODAS: { center: [-32.2, -62.5], zoom: 5 },
    NEA: { center: [-28.25, -58.4], zoom: 7 },
    PAMPEANA: { center: [-32.8, -61.8], zoom: 6 },
    CUYO: { center: [-33.2, -67.8], zoom: 7 },
    NOA: { center: [-26.2, -64.8], zoom: 6 },
    PATAGONIA: { center: [-39.0, -67.6], zoom: 7 },
};

function cargarDatosMapa() {
    try {
        const scriptEl = document.getElementById("datos-mapa-nea");
        if (scriptEl && scriptEl.textContent) {
            datosMapaNEA = JSON.parse(scriptEl.textContent.trim());
        }
    } catch (e) {
        console.warn("No se pudieron parsear los datos del mapa federal:", e);
    }
}

function filtrarProdsPorRegion(prods, region) {
    if (!region || region === "TODAS") return prods;
    return prods.filter((p) => {
        if (p.region && p.region.toUpperCase() === region) return true;
        const prov = (p.provincia || "").toUpperCase();
        const loc = (p.localidad || "").toUpperCase();
        if (region === "NEA") {
            return prov.includes("CORRIENTES") || prov.includes("CHACO") || prov.includes("MISIONES") || prov.includes("FORMOSA") || prov.includes("ENTRE R");
        } else if (region === "PAMPEANA") {
            return prov.includes("SANTA FE") || prov.includes("CÓRDOBA") || prov.includes("CORDOBA") || prov.includes("BUENOS AIRES") || prov.includes("PAMPA");
        } else if (region === "CUYO") {
            return prov.includes("MENDOZA") || prov.includes("SAN LUIS") || prov.includes("SAN JUAN");
        } else if (region === "NOA") {
            return prov.includes("TUCUM") || prov.includes("SALTA") || prov.includes("JUJUY") || prov.includes("SANTIAGO") || prov.includes("CATAMARCA") || prov.includes("RIOJA");
        } else if (region === "PATAGONIA") {
            return prov.includes("RÍO NEGRO") || prov.includes("RIO NEGRO") || prov.includes("NEUQU") || prov.includes("CHUBUT") || prov.includes("SANTA CRUZ") || loc.includes("ROCA");
        }
        return true;
    });
}

function filtrarMapaPorRegion(region, btnEl) {
    regionMapaFiltro = region;
    document.querySelectorAll(".map-region-pill").forEach((btn) => btn.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");
    cerrarCardMapa();
    renderizarMapaProductores(true);
}

function cambiarModoMercado(modo) {
    modoMercadoActual = modo;
    const btnCatalogo = document.getElementById("btn-vista-catalogo");
    const btnMapa = document.getElementById("btn-vista-mapa");
    const seccionMapa = document.getElementById("seccion-mapa-productores");

    if (modo === "mapa") {
        if (btnCatalogo) btnCatalogo.classList.remove("active");
        if (btnMapa) btnMapa.classList.add("active");
        if (seccionMapa) seccionMapa.style.display = "block";
        setTimeout(() => {
            renderizarMapaProductores(false);
            if (leafletMapInstance) {
                leafletMapInstance.invalidateSize();
            }
        }, 60);
    } else {
        if (btnCatalogo) btnCatalogo.classList.add("active");
        if (btnMapa) btnMapa.classList.remove("active");
        if (seccionMapa) seccionMapa.style.display = "none";
    }
}

function inicializarInstanciaLeaflet() {
    const mapContainer = document.getElementById("leaflet-mapa-argentina");
    if (!mapContainer || typeof L === "undefined") return null;
    if (leafletMapInstance) return leafletMapInstance;

    if (!datosMapaNEA) cargarDatosMapa();
    const tileCfg = (datosMapaNEA && datosMapaNEA.tile_config) || {};
    const cartoUrl =
        tileCfg.carto_voyager_url ||
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    const capaCartoVoyager = L.tileLayer(cartoUrl, {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.ign.gob.ar/">IGN</a>',
        subdomains: "abcd",
        maxZoom: 18,
    });

    const capaOpenStreetMap = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Rutas DNV Argentina',
            maxZoom: 18,
        }
    );

    const capaArgenmapIGN = L.tileLayer(
        "https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG%3A3857@png/{z}/{x}/{-y}.png",
        {
            attribution: '&copy; <a href="https://www.ign.gob.ar/">Instituto Geográfico Nacional (IGN)</a> — Argenmap Oficial',
            maxZoom: 18,
        }
    );

    const capaInicial = tileCfg.has_carto_key ? capaCartoVoyager : capaOpenStreetMap;

    leafletMapInstance = L.map(mapContainer, {
        center: [-30.5, -60.2],
        zoom: 5,
        layers: [capaInicial],
        scrollWheelZoom: true,
    });

    L.control
        .layers(
            {
                "CARTO Voyager (Vial Claro)": capaCartoVoyager,
                "OpenStreetMap Vial Nacional": capaOpenStreetMap,
                "Argenmap Oficial (IGN Argentina)": capaArgenmapIGN,
            },
            null,
            { position: "topright" }
        )
        .addTo(leafletMapInstance);

    leafletRouteLayer = L.layerGroup().addTo(leafletMapInstance);
    leafletMarkersLayer = L.layerGroup().addTo(leafletMapInstance);

    return leafletMapInstance;
}

function renderizarMapaProductores(forzarZoomRegion = false) {
    if (!datosMapaNEA) cargarDatosMapa();
    if (!datosMapaNEA) return;

    const comp = datosMapaNEA.comprador || {
        lat: -29.14,
        lng: -59.2626,
        nombre: "Goya, Corrientes",
    };

    const todosProds = datosMapaNEA.productores || [];
    const prodsVisibles = filtrarProdsPorRegion(todosProds, regionMapaFiltro);

    // Si Leaflet está disponible, usar el mapa interactivo real con ruteo OSRM
    const map = inicializarInstanciaLeaflet();
    if (map && leafletMarkersLayer && leafletRouteLayer) {
        leafletMarkersLayer.clearLayers();
        leafletRouteLayer.clearLayers();

        const boundsCoords = [[comp.lat, comp.lng]];

        // 1. Marcador del Establecimiento Comprador (Tu Campo)
        const iconoComprador = L.divIcon({
            className: "leaflet-custom-div-icon",
            html: `
                <div class="l-marker-pin l-marker-buyer" title="Tu Establecimiento: ${comp.nombre}">
                    <span class="l-marker-pulse"></span>
                    <span class="l-marker-core">●</span>
                    <span class="l-marker-label">${(comp.nombre || "Tu Campo").split(",")[0]}</span>
                </div>
            `,
            iconSize: [120, 42],
            iconAnchor: [60, 21],
        });

        const markerComp = L.marker([comp.lat, comp.lng], { icon: iconoComprador, zIndexOffset: 900 });
        markerComp.bindTooltip(
            `<strong>Tu Establecimiento Receptor</strong><br>${comp.nombre}<br><small>Centroide Oficial IGN: ${comp.lat}, ${comp.lng}</small>`,
            { direction: "top", offset: [0, -14] }
        );
        leafletMarkersLayer.addLayer(markerComp);

        // 2. Corredores de conexión y Marcadores de cada Productor / Lote
        prodsVisibles.forEach((prod) => {
            if (!prod.lat || !prod.lng) return;
            boundsCoords.push([prod.lat, prod.lng]);

            // Línea base de referencia hasta que el usuario haga clic y trace la ruta vial real OSRM
            const colorBase = prod.es_urgente ? "#dc2626" : prod.es_lote_futuro ? "#7c3aed" : "#15803d";
            const lineaRef = L.polyline(
                [
                    [prod.lat, prod.lng],
                    [comp.lat, comp.lng],
                ],
                {
                    color: colorBase,
                    weight: 2,
                    opacity: 0.35,
                    dashArray: "6, 8",
                }
            );
            leafletRouteLayer.addLayer(lineaRef);

            const tipoClase = prod.es_urgente
                ? "l-marker-urgent"
                : prod.es_lote_futuro
                ? "l-marker-future"
                : "l-marker-producer";
            const simboloPin = prod.es_urgente ? "!" : prod.es_lote_futuro ? "◆" : "■";

            const iconoProd = L.divIcon({
                className: "leaflet-custom-div-icon",
                html: `
                    <div class="l-marker-pin ${tipoClase}">
                        ${prod.es_urgente ? '<span class="l-marker-pulse-red"></span>' : ""}
                        <span class="l-marker-core">${simboloPin}</span>
                        <span class="l-marker-label">${prod.localidad} · ${prod.toneladas} tn</span>
                    </div>
                `,
                iconSize: [140, 42],
                iconAnchor: [70, 21],
            });

            const mProd = L.marker([prod.lat, prod.lng], {
                icon: iconoProd,
                zIndexOffset: prod.es_urgente ? 700 : 500,
            });

            mProd.on("click", () => {
                seleccionarProductorEnMapaLeaflet(prod);
            });

            leafletMarkersLayer.addLayer(mProd);
        });

        // Ajustar encuadre del mapa según la región o los nodos visibles
        if (forzarZoomRegion && VISTAS_REGIONALES_ARGENTINA[regionMapaFiltro]) {
            const v = VISTAS_REGIONALES_ARGENTINA[regionMapaFiltro];
            map.flyTo(v.center, v.zoom, { duration: 0.65 });
        } else if (boundsCoords.length > 1) {
            map.fitBounds(boundsCoords, { padding: [45, 45], maxZoom: 8 });
        }

        // Si hay al menos un productor visible, trazar la ruta vial real OSRM del primero o del activo
        const prodInicial = ultimoProdSeleccionadoMapa && prodsVisibles.some((p) => p.id === ultimoProdSeleccionadoMapa.id)
            ? ultimoProdSeleccionadoMapa
            : prodsVisibles[0];
        if (prodInicial) {
            trazarRutaVialOSRM(prodInicial, comp, false);
        }
        return;
    }
}

async function trazarRutaVialOSRM(prod, comp, abrirFicha = true) {
    if (!prod || !comp) return;
    ultimoProdSeleccionadoMapa = prod;

    const summaryEl = document.getElementById("map-osrm-route-summary");
    if (summaryEl) {
        summaryEl.textContent = `Calculando ruta vial real por carreteras nacionales (${prod.localidad} → ${comp.nombre})...`;
    }

    try {
        const params = new URLSearchParams({
            origen: `${prod.localidad}, ${prod.provincia}`,
            origen_lat: prod.lat,
            origen_lng: prod.lng,
            destino: comp.nombre,
            destino_lat: comp.lat,
            destino_lng: comp.lng,
        });
        const res = await fetch(`/api/georef/ruta/?${params.toString()}`);
        const data = await res.json();
        if (data.ok && data.ruta) {
            const r = data.ruta;
            prod.distancia_km = r.distancia_km || prod.distancia_km;
            prod.duracion_formateada = r.duracion_formateada || "";
            prod.resumen_rutas = r.resumen_rutas || prod.ruta;

            if (summaryEl) {
                summaryEl.innerHTML = `<strong>Ruta Vial ${prod.localidad} → ${comp.nombre}:</strong> ${r.distancia_km} km reales (${r.duracion_formateada}) vía <strong>${r.resumen_rutas}</strong>`;
            }

            if (leafletMapInstance && leafletRouteLayer && Array.isArray(r.coordenadas_ruta) && r.coordenadas_ruta.length > 1) {
                // Limpiar polilínea activa previa y dibujar la ruta real OSRM
                leafletRouteLayer.eachLayer((layer) => {
                    if (layer.options && layer.options.className === "osrm-active-route-line") {
                        leafletRouteLayer.removeLayer(layer);
                    }
                });

                const colorRuta = prod.es_urgente ? "#dc2626" : "#15803d";
                const polyActiva = L.polyline(r.coordenadas_ruta, {
                    color: colorRuta,
                    weight: 5,
                    opacity: 0.9,
                    className: "osrm-active-route-line",
                });
                leafletRouteLayer.addLayer(polyActiva);
            }
        }
    } catch (e) {
        console.warn("Error consultando ruta vial OSRM:", e);
    }

    if (abrirFicha) {
        mostrarCardEnMapa(prod);
    }
}

function seleccionarProductorEnMapaLeaflet(prod) {
    const comp = (datosMapaNEA && datosMapaNEA.comprador) || {
        lat: -29.14,
        lng: -59.2626,
        nombre: "Goya, Corrientes",
    };
    mostrarCardEnMapa(prod);
    trazarRutaVialOSRM(prod, comp, true);
}

function mostrarCardEnMapa(prod) {
    const card = document.getElementById("map-producer-card");
    const content = document.getElementById("map-card-content");
    if (!card || !content) return;

    let etiquetaBadge = "";
    if (prod.es_urgente) {
        etiquetaBadge = `<span class="badge-urgente-pulse"><span class="pulse-dot"></span> ${prod.etiqueta_urgencia || "VENTA INMEDIATA 48 HS"}</span>`;
    } else if (prod.es_lote_futuro) {
        etiquetaBadge = `<span class="badge-lote-futuro">Lote Futuro (${prod.fecha_entrega_futura || "Zafra"})</span>`;
    }

    const duracionTexto = prod.duracion_formateada ? ` · ${prod.duracion_formateada}` : "";

    content.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; margin-bottom:0.4rem;">
            <span class="badge-cat badge-cat-${(prod.categoria || "arroz").toLowerCase()}">${prod.categoria}</span>
            ${etiquetaBadge}
        </div>
        <h4 style="font-size:1.05rem; font-family:var(--fuente-display); margin-bottom:0.25rem; color:var(--texto-principal);">${prod.titulo}</h4>
        <div style="font-size:0.80rem; color:var(--texto-secundario); margin-bottom:0.6rem;">
            <strong>${prod.empresa}</strong> · ${prod.localidad}, ${prod.provincia} (${prod.resumen_rutas || prod.ruta || "RN"})
        </div>
        <div class="map-card-metrics">
            <div><span>Disponible:</span><strong>${prod.toneladas} tn (${prod.volumen_m3} m³)</strong></div>
            <div><span>Ruta Vial OSRM:</span><strong>${prod.distancia_km} km${duracionTexto}</strong></div>
            <div><span>Precio:</span><strong>$${Number(prod.precio_tn).toLocaleString("es-AR")}/tn</strong></div>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:0.45rem; margin-top:0.75rem;">
            <button type="button" class="btn-primary" style="padding:0.45rem 0.85rem; font-size:0.80rem; min-height:34px; flex:1;"
                    onclick="comprarSubloteDesdeMapa('${prod.id}', '${prod.sublote_min_tn || 5}', '${prod.distancia_km}')">
                Sublote (${prod.sublote_min_tn || 5} tn) →
            </button>
            <button type="button" class="chip-btn" style="padding:0.45rem 0.7rem; font-size:0.80rem;"
                    onclick="comprarSubloteDesdeMapa('${prod.id}', '1', '${prod.distancia_km}')">
                Retiro 1 tn
            </button>
            <button type="button" class="chip-btn" style="padding:0.45rem 0.7rem; font-size:0.80rem;"
                    onclick="comprarSubloteDesdeMapa('${prod.id}', '${prod.toneladas}', '${prod.distancia_km}')">
                Lote Entero
            </button>
        </div>
    `;

    card.style.display = "block";
    card.style.right = "18px";
    card.style.bottom = "18px";
    card.style.left = "auto";
    card.style.top = "auto";
}

function comprarSubloteDesdeMapa(loteId, toneladas, distanciaKm) {
    cerrarCardMapa();
    comprarSubloteDirecto(loteId, toneladas, distanciaKm);
}

function cerrarCardMapa() {
    const card = document.getElementById("map-producer-card");
    if (card) card.style.display = "none";
}
