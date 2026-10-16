/**
 * =============================================================================
 * FRONTEND INTERACTIVO — Moñái (Ideathon NEA Tech 2026)
 * =============================================================================
 * Arquitectura de Experiencia dividida por Tipo de Usuario + Landing con Demo:
 * - vista-inicio     : Landing Page y Pseudo-Demostración Interactiva en Vivo
 * - vista-comprador  : Recomendador Productivo + Catálogo + Cotizador + Reserva
 * - vista-vendedor   : Publicación de Excedentes + Estrategia de Flete + Certificado
 * - vista-logistica  : Bolsa de Flete Calzado + Match en Corredor + Alta de Camión
 */

function formatoARS(valor) {
    return "$" + Number(valor || 0).toLocaleString("es-AR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}

/* =============================================================================
   CASOS REALES PRECARGADOS PARA LA PSEUDO-DEMOSTRACIÓN DE LA LANDING
   ============================================================================= */
const CASOS_DEMO_LANDING = [
    {
        indice: 0,
        loteIndex: 0,
        ruta: "Saladas, Corrientes → Goya, Corrientes (250 km)",
        actor: "Molino Arrocero San Lorenzo · Destino: Cama Avícola de Galpón",
        modalidad: "Flete: 100% Comprador",
        densidad: "Densidad: 165 kg/m³",
        volumenM3: "90.9 m³",
        volumenPctTexto: "100% Batea llena",
        volumenPctNum: 100,
        pesoTn: "15 tn",
        pesoPctTexto: "50% Capacidad",
        pesoPctNum: 50,
        explicacionTrampa:
            "Con 15 tn de cascarilla seca (165 kg/m³) llenás el 100% del volumen físico de la batea (90 m³) aunque el camión esté a mitad de peso. El flete tradicional te cobra el viaje de 30 tn.",
        precioRojo: "$1.400.000",
        descRojo: "Representa el 73,7% del costo total puesto en campo. La venta se cae y el residuo se quema.",
        descuentoPct: "-45%",
        precioVerde: "$770.000",
        descVerde: "Camión que descargó en Corrientes y vuelve vacío hacia Goya por RN 12. Negocio rentable.",
        ahorro: "$630.000 ARS",
        distanciaKm: 250,
        toneladas: 15,
    },
    {
        indice: 1,
        loteIndex: 1,
        ruta: "Saladas, Corrientes → Mercedes, Corrientes (165 km)",
        actor: "Aserradero Río Paraná SRL · Destino: Cama Avícola y Pellets de Biomasa",
        modalidad: "Flete: 50% y 50% Compartido",
        densidad: "Densidad: 210 kg/m³",
        volumenM3: "57.1 m³",
        volumenPctTexto: "67% Volumen acoplado",
        volumenPctNum: 67,
        pesoTn: "12 tn",
        pesoPctTexto: "43% Capacidad",
        pesoPctNum: 43,
        explicacionTrampa:
            "El aserrín seco ocupa gran volumen con bajo peso. Al dividir 50/50 un camión de retorno (-48%), el aserradero libera su playa colapsada y el productor recibe insumo a mitad de costo.",
        precioRojo: "$1.148.000",
        descRojo: "Flete tradicional consume más del 80% del valor del aserrín en planta.",
        descuentoPct: "-48%",
        precioVerde: "$507.000",
        descVerde: "Semirremolque baranda volcable en retorno hacia Mercedes/Curuzú Cuatiá.",
        ahorro: "$641.000 ARS",
        distanciaKm: 165,
        toneladas: 12,
    },
    {
        indice: 2,
        loteIndex: 2,
        ruta: "Bella Vista, Corrientes → Goya, Corrientes (85 km)",
        actor: "Jugos del Litoral SA · Destino: Fibra y Energía para Feedlot Bovino",
        modalidad: "Flete: 100% Vendedor (Urgencia 48hs)",
        densidad: "Densidad: 650 kg/m³",
        volumenM3: "36.9 m³",
        volumenPctTexto: "43% Volumen batea",
        volumenPctNum: 43,
        pesoTn: "24 tn",
        pesoPctTexto: "80% Capacidad Peso",
        pesoPctNum: 80,
        explicacionTrampa:
            "La cáscara húmeda de citrus fermenta en 48 hs generando multas ambientales. La juguera absorbe el Flete Calzado (-45%) porque le sale más barato que el pasivo ambiental.",
        precioRojo: "$552.000",
        descRojo: "Contratar batea estanca de urgencia a tarifa plena frena la evacuación diaria.",
        descuentoPct: "-45%",
        precioVerde: "$258.000",
        descVerde: "Flete absorbido por la citrícola con camión de retorno + Certificado Ambiental Hedera.",
        ahorro: "$294.000 ARS",
        distanciaKm: 85,
        toneladas: 24,
    },
];

let casoDemoActivo = CASOS_DEMO_LANDING[0];

function seleccionarCasoDemoLanding(index) {
    const caso = CASOS_DEMO_LANDING[index] || CASOS_DEMO_LANDING[0];
    casoDemoActivo = caso;

    document.querySelectorAll(".demo-preset-btn").forEach((btn, idx) => {
        btn.classList.toggle("active", idx === index);
    });

    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setTxt("demo-ruta-texto", caso.ruta);
    setTxt("demo-actor-texto", caso.actor);
    setTxt("demo-modalidad-pill", caso.modalidad);
    setTxt("demo-densidad-badge", caso.densidad);
    setTxt("demo-vol-m3", caso.volumenM3);
    setTxt("demo-vol-pct", caso.volumenPctTexto);
    setTxt("demo-peso-tn", caso.pesoTn);
    setTxt("demo-peso-pct", caso.pesoPctTexto);
    setTxt("demo-trampa-explicacion", caso.explicacionTrampa);
    setTxt("demo-precio-rojo", caso.precioRojo);
    setTxt("demo-desc-rojo", caso.descRojo);
    setTxt("demo-desc-pct", caso.descuentoPct);
    setTxt("demo-precio-verde", caso.precioVerde);
    setTxt("demo-desc-verde", caso.descVerde);
    setTxt("demo-ahorro-valor", caso.ahorro);

    const barVol = document.getElementById("demo-bar-vol");
    const barPeso = document.getElementById("demo-bar-peso");
    if (barVol) barVol.style.width = `${caso.volumenPctNum}%`;
    if (barPeso) barPeso.style.width = `${caso.pesoPctNum}%`;
}

function abrirCasoDemoEnCotizador() {
    const selectLote = document.getElementById("calc-lote-id");
    if (selectLote && selectLote.options[casoDemoActivo.loteIndex]) {
        selectLote.selectedIndex = casoDemoActivo.loteIndex;
        const loteId = selectLote.value;
        seleccionarLote(loteId, casoDemoActivo.toneladas, casoDemoActivo.distanciaKm);
    }
    cambiarVistaRol("vista-comprador");
    setTimeout(() => {
        const panel = document.getElementById("panel-cotizador-comprador");
        if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
}

/* =============================================================================
   1. MODO CLARO / MODO OSCURO SENCILLO DE ENTENDER
   ============================================================================= */
function aplicarTema(tema) {
    const html = document.documentElement;
    const meta = document.querySelector('meta[name="color-scheme"]');
    const btnText = document.getElementById("theme-toggle-text");
    const iconSun = document.getElementById("theme-icon-sun");
    const iconMoon = document.getElementById("theme-icon-moon");

    html.setAttribute("data-theme", tema);
    if (meta) meta.setAttribute("content", tema);

    if (tema === "dark") {
        if (btnText) btnText.textContent = "Modo Claro";
        if (iconSun) iconSun.style.display = "inline-block";
        if (iconMoon) iconMoon.style.display = "none";
    } else {
        if (btnText) btnText.textContent = "Modo Oscuro";
        if (iconSun) iconSun.style.display = "none";
        if (iconMoon) iconMoon.style.display = "inline-block";
    }
}

function alternarTema() {
    const actual = document.documentElement.getAttribute("data-theme") || "light";
    const nuevo = actual === "dark" ? "light" : "dark";
    try {
        localStorage.setItem("monai-theme", nuevo);
        localStorage.setItem("color-scheme", nuevo);
    } catch (e) {}
    aplicarTema(nuevo);
}

/* =============================================================================
   2. NAVEGACIÓN POR TIPO DE USUARIO (CON VIEW TRANSITIONS SI ESTÁ DISPONIBLE)
   ============================================================================= */
function ejecutarCambioVista(panelId) {
    document.querySelectorAll(".user-view-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.id === panelId);
    });

    document.querySelectorAll(".role-tab-btn").forEach((btn) => {
        const activo = btn.getAttribute("data-role-target") === panelId;
        btn.classList.toggle("active", activo);
        btn.setAttribute("aria-selected", activo ? "true" : "false");
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function cambiarVistaRol(panelId) {
    if (document.startViewTransition) {
        document.startViewTransition(() => ejecutarCambioVista(panelId));
    } else {
        ejecutarCambioVista(panelId);
    }
}

// Alias de compatibilidad
function cambiarPestana(panelId) {
    const mapa = {
        "panel-oportunidades": "vista-comprador",
        "panel-cotizador": "vista-comprador",
        "panel-publicar": "vista-vendedor",
        "panel-certificado": "vista-vendedor",
    };
    cambiarVistaRol(mapa[panelId] || panelId);
}

/* =============================================================================
   3. RECOMENDADOR Y SELECCIÓN DE LOTES (VISTA COMPRADOR)
   ============================================================================= */
function seleccionarLote(loteId, toneladasDefault, distanciaSugerida) {
    document.querySelectorAll(".lote-card[data-lote-id]").forEach((card) => {
        card.classList.toggle("selected", Number(card.dataset.loteId) === Number(loteId));
    });

    const inputLote = document.getElementById("calc-lote-id");
    const inputTn = document.getElementById("calc-toneladas");
    const inputKm = document.getElementById("calc-distancia-km");

    if (inputLote) inputLote.value = String(loteId);
    if (inputTn && toneladasDefault) inputTn.value = toneladasDefault;
    if (inputKm && distanciaSugerida) inputKm.value = distanciaSugerida;

    recalcularCotizacionEnVivo();
}

function seleccionarLoteYEnfocarCotizador(loteId, toneladasDefault, distanciaSugerida) {
    seleccionarLote(loteId, toneladasDefault, distanciaSugerida);
    const panel = document.getElementById("panel-cotizador-comprador");
    if (panel) {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function calzarCamionConLote(loteId, camionId, toneladasDefault) {
    const selectCamion = document.getElementById("calc-camion-id");
    if (selectCamion && camionId) {
        selectCamion.value = String(camionId);
    }
    seleccionarLote(loteId, toneladasDefault, 160);
    cambiarVistaRol("vista-comprador");
    setTimeout(() => {
        const panel = document.getElementById("panel-cotizador-comprador");
        if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
}

function alCambiarSelectorLote(selectEl) {
    const opt = selectEl.options[selectEl.selectedIndex];
    const tn = opt ? opt.getAttribute("data-toneladas") : null;
    const km = opt ? opt.getAttribute("data-distancia") : null;
    seleccionarLote(selectEl.value, tn, km);
}

function actualizarLocalidadComprador(selectEl) {
    const opt = selectEl.options[selectEl.selectedIndex];
    const nombreDestino = opt ? opt.getAttribute("data-nombre") : "";
    const inputDestino = document.getElementById("calc-destino");
    if (inputDestino && nombreDestino) {
        inputDestino.value = nombreDestino;
    }
    if (selectEl.form) {
        selectEl.form.submit();
    }
}

function filtrarTarjetasEnCliente(texto) {
    const q = (texto || "").trim().toLowerCase();
    document.querySelectorAll("#contenedor-tarjetas-lotes .lote-card").forEach((card) => {
        const contenido = (card.getAttribute("data-busqueda") || "").toLowerCase();
        card.style.display = !q || contenido.includes(q) ? "" : "none";
    });
}

/* =============================================================================
   4. COTIZADOR PESO/VOLUMEN Y FLETE CALZADO (CARRIL 3 - /api/cotizar/)
   ============================================================================= */
async function recalcularCotizacionEnVivo() {
    const loteId = document.getElementById("calc-lote-id")?.value;
    const camionId = document.getElementById("calc-camion-id")?.value;
    const distanciaKm = document.getElementById("calc-distancia-km")?.value || 160;
    const toneladas = document.getElementById("calc-toneladas")?.value || 14;

    if (!loteId) return;

    const params = new URLSearchParams({
        lote_id: loteId,
        camion_id: camionId,
        distancia_km: distanciaKm,
        toneladas: toneladas,
    });

    try {
        const res = await fetch(`/api/cotizar/?${params.toString()}`);
        const data = await res.json();
        if (!data.ok) return;

        const c = data.cotizacion;

        document.getElementById("res-lote-titulo").textContent = c.lote_titulo;
        document.getElementById("res-origen").textContent = `${c.empresa_vendedora} (${c.origen})`;
        document.getElementById("res-modalidad").textContent = c.modalidad_flete_texto;

        document.getElementById("res-volumen-m3").textContent = `${c.volumen_m3} m³ (Densidad: ${c.densidad_kg_m3} kg/m³)`;
        document.getElementById("res-limitante").textContent = c.factor_limitante;
        document.getElementById("pct-vol-label").textContent = `${c.ocupacion_volumen_pct}%`;
        document.getElementById("pct-peso-label").textContent = `${c.ocupacion_peso_pct}%`;
        document.getElementById("bar-volumen").style.width = `${c.ocupacion_volumen_pct}%`;
        document.getElementById("bar-peso").style.width = `${c.ocupacion_peso_pct}%`;

        document.getElementById("res-flete-tradicional").textContent = formatoARS(c.flete_tradicional_fadeeac_ars);
        document.getElementById("res-incidencia-pct").textContent = `${c.incidencia_flete_tradicional_pct}% del total`;
        document.getElementById("res-flete-calzado").textContent = formatoARS(c.flete_calzado_ars);
        document.getElementById("res-descuento-pct").textContent = `-${c.descuento_retorno_pct}% por Retorno`;
        document.getElementById("res-ahorro").textContent = `${formatoARS(c.ahorro_logistico_ars)} ARS`;

        document.getElementById("res-subtotal-prod").textContent = formatoARS(c.subtotal_subproducto_ars);
        document.getElementById("res-comision").textContent = formatoARS(c.comision_total_plataforma_ars);
        document.getElementById("res-total-comprador").textContent = formatoARS(c.total_comprador_subruta_ars);
    } catch (err) {
        console.error("Error al cotizar flete:", err);
    }
}

/* =============================================================================
   5. RESERVA CON GARANTÍA Y CERTIFICADO AMBIENTAL (CARRIL 4 - /api/reservar/)
   ============================================================================= */
async function confirmarReservaConGarantia() {
    const loteId = document.getElementById("calc-lote-id")?.value;
    const camionId = document.getElementById("calc-camion-id")?.value;
    const distanciaKm = document.getElementById("calc-distancia-km")?.value || 160;
    const toneladas = document.getElementById("calc-toneladas")?.value || 14;
    const compradorNombre = document.getElementById("calc-comprador")?.value || "Granja Avícola San Isidro";
    const destino = document.getElementById("calc-destino")?.value || "Goya, Corrientes";

    const btn = document.getElementById("btn-confirmar-reserva");
    btn.disabled = true;
    btn.textContent = "Sellando Garantía y Certificado Circular...";

    try {
        const res = await fetch("/api/reservar/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                lote_id: loteId,
                camion_id: camionId,
                distancia_km: distanciaKm,
                toneladas: toneladas,
                comprador_nombre: compradorNombre,
                localidad_destino: destino,
            }),
        });
        const data = await res.json();
        if (data.ok) {
            mostrarModalCertificado(data.certificado);
        }
    } catch (err) {
        alert("No se pudo procesar la reserva. Verificá la conexión.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Reservar con Pago en Garantía + Emitir Certificado";
    }
}

function mostrarModalCertificado(cert) {
    document.getElementById("cert-id").textContent = `#MN-2026-${String(cert.id).padStart(4, "0")}`;
    document.getElementById("cert-vendedor").textContent = `${cert.vendedor} (${cert.origen})`;
    document.getElementById("cert-comprador").textContent = `${cert.comprador} (${cert.destino})`;
    document.getElementById("cert-subproducto").textContent = `${cert.subproducto} — ${cert.toneladas} tn (${cert.volumen_m3} m³)`;
    document.getElementById("cert-transportista").textContent = cert.transportista;
    document.getElementById("cert-ahorro").textContent = `${formatoARS(cert.ahorro_logistico_ars)} ARS`;
    document.getElementById("cert-total").textContent = `${formatoARS(cert.total_comprador_ars)} ARS`;
    document.getElementById("cert-hash").textContent = cert.hash_certificado;
    document.getElementById("cert-red").textContent = cert.red_blockchain;

    cambiarVistaRol("vista-vendedor");
    setTimeout(() => {
        const card = document.getElementById("tarjeta-certificado-activo");
        if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 140);
}

/* =============================================================================
   6. PUBLICACIÓN DE EXCEDENTE (VENDEDOR) Y ALTA DE CAMIÓN (LOGÍSTICA)
   ============================================================================= */
function sugerirValoresPorSector(sector) {
    const inputDensidad = document.getElementById("pub-densidad");
    const inputPrecio = document.getElementById("pub-precio");
    const inputUsos = document.getElementById("pub-usos");
    if (!inputDensidad) return;

    if (sector === "ARROZ") {
        inputDensidad.value = 165;
        if (inputPrecio) inputPrecio.value = 22000;
        if (inputUsos) inputUsos.value = "Cama para galpones avícolas, sustrato de vivero y biomasa térmica";
    } else if (sector === "MADERA") {
        inputDensidad.value = 210;
        if (inputPrecio) inputPrecio.value = 18500;
        if (inputUsos) inputUsos.value = "Cama de pollo de alta absorción, compostaje y pellets de biomasa";
    } else if (sector === "CITRUS") {
        inputDensidad.value = 650;
        if (inputPrecio) inputPrecio.value = 14000;
        if (inputUsos) inputUsos.value = "Suplementación energética y fibra digestible para recría bovina y feedlot";
    } else if (sector === "ALGODON") {
        inputDensidad.value = 480;
        if (inputPrecio) inputPrecio.value = 95000;
        if (inputUsos) inputUsos.value = "Suplemento proteico-energético de alta fibra para rodeos de cría e invernada";
    }
    actualizarPreviewCubicajePublicacion();
}

function actualizarPreviewCubicajePublicacion() {
    const tn = parseFloat(document.getElementById("pub-toneladas")?.value || 15);
    const dens = parseFloat(document.getElementById("pub-densidad")?.value || 165);
    const preview = document.getElementById("pub-volumen-preview");
    if (preview && dens > 0) {
        const m3 = ((tn * 1000) / dens).toFixed(1);
        const equipos = Math.max(1, Math.ceil(parseFloat(m3) / 90));
        preview.textContent = `${m3} m³ (${equipos} ${equipos === 1 ? "equipo Batea" : "equipos Batea"})`;
    }
}

async function enviarNuevoLote(event) {
    event.preventDefault();
    const payload = {
        titulo: document.getElementById("pub-titulo").value,
        categoria: document.getElementById("pub-categoria").value,
        empresa_vendedora: document.getElementById("pub-empresa").value,
        localidad_origen: document.getElementById("pub-localidad").value,
        toneladas_disponibles: document.getElementById("pub-toneladas").value,
        densidad_kg_m3: document.getElementById("pub-densidad").value,
        precio_tonelada_ars: document.getElementById("pub-precio").value,
        usos_recomendados: document.getElementById("pub-usos").value,
        modalidad_flete: document.getElementById("pub-modalidad").value,
    };

    const res = await fetch("/api/publicar/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.ok) {
        window.location.href = "/?rol=comprador";
    }
}

async function enviarNuevoCamion(event) {
    event.preventDefault();
    const payload = {
        transportista: document.getElementById("cam-transportista").value,
        origen_viaje: document.getElementById("cam-origen").value,
        destino_viaje: document.getElementById("cam-destino").value,
        pasa_por: document.getElementById("cam-pasa-por").value,
        tipo_carroceria: document.getElementById("cam-carroceria").value,
        fecha_disponible: document.getElementById("cam-fecha").value,
        capacidad_max_m3: document.getElementById("cam-cap-m3").value,
        descuento_retorno_pct: document.getElementById("cam-descuento").value,
    };

    try {
        const res = await fetch("/api/publicar-camion/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.ok) {
            window.location.href = "/?rol=logistica";
        }
    } catch (e) {
        window.location.href = "/?rol=logistica";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    aplicarTema(currentTheme);
    actualizarPreviewCubicajePublicacion();
    recalcularCotizacionEnVivo();

    // Si la URL trae ?rol=comprador / vendedor / logistica, o ?perfil=..., abrir esa vista automáticamente
    const params = new URLSearchParams(window.location.search);
    const rolParam = (params.get("rol") || "").toLowerCase();
    if (rolParam === "comprador" || params.has("perfil") || params.has("localidad") || params.has("q")) {
        ejecutarCambioVista("vista-comprador");
    } else if (rolParam === "vendedor") {
        ejecutarCambioVista("vista-vendedor");
    } else if (rolParam === "logistica") {
        ejecutarCambioVista("vista-logistica");
    }
});
