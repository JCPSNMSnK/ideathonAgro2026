/* =============================================================================
   6.2.1. AUTOCOMPLETADO OFICIAL EN VIVO (API GEOREF DATOS ARGENTINA + OSRM)
   ============================================================================= */
function autocompletarLocalidadGeoref(texto, provinciaOpcional) {
    const q = (texto || "").trim();
    if (q.length < 2) return;

    if (georefDebounceTimer) clearTimeout(georefDebounceTimer);
    georefDebounceTimer = setTimeout(async () => {
        try {
            const params = new URLSearchParams({ q: q, max: "12" });
            if (provinciaOpcional) params.set("provincia", provinciaOpcional);

            const res = await fetch(`/api/georef/localidades/?${params.toString()}`);
            const data = await res.json();
            if (!data.ok || !Array.isArray(data.localidades)) return;

            const datalist = document.getElementById("datalist-localidades-argentina");
            if (!datalist) return;

            datalist.innerHTML = "";
            data.localidades.forEach((loc) => {
                const opt = document.createElement("option");
                opt.value = loc.etiqueta || `${loc.nombre}, ${loc.provincia}`;
                opt.label = `${loc.zona || loc.provincia} · IGN (${loc.lat}, ${loc.lng})`;
                datalist.appendChild(opt);
            });
        } catch (err) {
            console.warn("Autocompletado Georef no disponible temporalmente:", err);
        }
    }, 220);
}

async function actualizarRutaRealDesdeDestino(destinoTexto) {
    const destino = (destinoTexto || "").trim();
    if (destino.length < 3) return;

    if (!datosMapaNEA) cargarDatosMapa();
    const selectLote = document.getElementById("calc-lote-id");
    const loteId = selectLote ? parseInt(selectLote.value, 10) : null;
    const prodActivo =
        (datosMapaNEA &&
            datosMapaNEA.productores &&
            datosMapaNEA.productores.find((p) => p.id === loteId)) ||
        (datosMapaNEA && datosMapaNEA.productores ? datosMapaNEA.productores[0] : null);

    try {
        const params = new URLSearchParams({
            origen: prodActivo ? `${prodActivo.localidad}, ${prodActivo.provincia}` : "Saladas, Corrientes",
            destino: destino,
        });
        if (prodActivo && prodActivo.lat && prodActivo.lng) {
            params.set("origen_lat", prodActivo.lat);
            params.set("origen_lng", prodActivo.lng);
        }

        const res = await fetch(`/api/georef/ruta/?${params.toString()}`);
        const data = await res.json();
        if (data.ok && data.ruta && data.destino) {
            const inputKm = document.getElementById("calc-distancia-km");
            if (inputKm && data.ruta.distancia_km) {
                inputKm.value = data.ruta.distancia_km;
            }

            if (datosMapaNEA) {
                datosMapaNEA.comprador = {
                    codigo: destino.toUpperCase(),
                    nombre: `${data.destino.nombre}${data.destino.provincia ? ", " + data.destino.provincia : ""}`,
                    lat: data.destino.lat,
                    lng: data.destino.lng,
                    ruta: data.destino.ruta || data.ruta.resumen_rutas,
                    zona: data.destino.zona || "",
                };
            }

            recalcularCotizacionEnVivo();
            if (modoMercadoActual === "mapa") {
                renderizarMapaProductores(false);
            }
        }
    } catch (e) {
        console.warn("No se pudo actualizar ruta real desde destino:", e);
    }
}

function fijarDestinoCompradorDesdeMapa() {
    const inputMapa = document.getElementById("mapa-georef-input");
    const valor = (inputMapa ? inputMapa.value : "").trim();
    if (!valor) return;

    const inputDestino = document.getElementById("calc-destino");
    if (inputDestino) inputDestino.value = valor;

    actualizarRutaRealDesdeDestino(valor);
}
