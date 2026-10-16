/**
 * =============================================================================
 * FRONTEND INTERACTIVO — Moñái (Ideathon NEA Tech 2026)
 * =============================================================================
 * Herramienta web mobile-first seccionada por pestañas:
 * 1. Recomendador y Catálogo de Lotes
 * 2. Publicar Excedente Industrial
 * 3. Cotizador Peso/Volumen + Tarifas FADEEAC 2026 + Flete Calzado (/api/cotizar/)
 * 4. Garantía Escrow + Certificado de Trazabilidad Ambiental (/api/reservar/)
 */

function formatoARS(valor) {
    return "$" + Number(valor || 0).toLocaleString("es-AR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
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
   2. NAVEGACIÓN POR PESTAÑAS (MOBILE-FIRST TABS)
   ============================================================================= */
function cambiarPestana(panelId) {
    document.querySelectorAll(".app-tab-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.id === panelId);
    });

    document.querySelectorAll(".app-tab-btn").forEach((btn) => {
        const activo = btn.getAttribute("data-tab-target") === panelId;
        btn.classList.toggle("active", activo);
        btn.setAttribute("aria-selected", activo ? "true" : "false");
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =============================================================================
   3. RECOMENDADOR Y SELECCIÓN DE LOTES (CARRIL 2 -> CARRIL 3)
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

function seleccionarLoteYCotizar(loteId, toneladasDefault, distanciaSugerida) {
    seleccionarLote(loteId, toneladasDefault, distanciaSugerida);
    cambiarPestana("panel-cotizador");
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

        // Actualizar encabezados
        document.getElementById("res-lote-titulo").textContent = c.lote_titulo;
        document.getElementById("res-origen").textContent = `${c.empresa_vendedora} (${c.origen})`;
        document.getElementById("res-modalidad").textContent = c.modalidad_flete_texto;

        // Actualizar barras de cubicaje (Peso vs Volumen)
        document.getElementById("res-volumen-m3").textContent = `${c.volumen_m3} m³ (Densidad: ${c.densidad_kg_m3} kg/m³)`;
        document.getElementById("res-limitante").textContent = c.factor_limitante;
        document.getElementById("pct-vol-label").textContent = `${c.ocupacion_volumen_pct}%`;
        document.getElementById("pct-peso-label").textContent = `${c.ocupacion_peso_pct}%`;
        document.getElementById("bar-volumen").style.width = `${c.ocupacion_volumen_pct}%`;
        document.getElementById("bar-peso").style.width = `${c.ocupacion_peso_pct}%`;

        // Actualizar comparador FADEEAC vs Flete Calzado
        document.getElementById("res-flete-tradicional").textContent = formatoARS(c.flete_tradicional_fadeeac_ars);
        document.getElementById("res-incidencia-pct").textContent = `${c.incidencia_flete_tradicional_pct}% del total`;
        document.getElementById("res-flete-calzado").textContent = formatoARS(c.flete_calzado_ars);
        document.getElementById("res-descuento-pct").textContent = `-${c.descuento_retorno_pct}% por Retorno`;
        document.getElementById("res-ahorro").textContent = `${formatoARS(c.ahorro_logistico_ars)} ARS`;

        // Desglose transparente
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
        btn.textContent = "Reservar Lote + Camión con Pago en Garantía";
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

    cambiarPestana("panel-certificado");
}

function cerrarModalCertificado() {
    const modal = document.getElementById("modal-certificado");
    if (modal) modal.style.display = "none";
}

/* =============================================================================
   6. PUBLICACIÓN DE NUEVO EXCEDENTE INDUSTRIAL (CARRIL 2 - /api/publicar/)
   ============================================================================= */
function abrirModalPublicar() {
    cambiarPestana("panel-publicar");
}

function cerrarModalPublicar() {
    cambiarPestana("panel-oportunidades");
}

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
        preview.textContent = `${m3} m³ (${tn} tn a ${dens} kg/m³)`;
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
        window.location.href = "/";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    aplicarTema(currentTheme);
    actualizarPreviewCubicajePublicacion();
    recalcularCotizacionEnVivo();
});
