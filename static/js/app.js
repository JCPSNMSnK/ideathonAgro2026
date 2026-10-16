/**
 * =============================================================================
 * FRONTEND INTERACTIVO — SubRuta (Ideathon NEA Tech 2026)
 * =============================================================================
 * Conecta la interfaz con los 3 endpoints de Django:
 * 1. /api/cotizar/   -> Calculadora Peso/Volumen + Tarifas FADEEAC + Flete Calzado
 * 2. /api/reservar/  -> Pago en Garantía + Certificado Trazabilidad (Blockchain Invisible)
 * 3. /api/publicar/  -> Publicación rápida de nuevos subproductos
 */

function formatoARS(valor) {
    return "$" + Number(valor || 0).toLocaleString("es-AR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}

function seleccionarLote(loteId, toneladasDefault) {
    document.querySelectorAll(".lote-card").forEach((card) => {
        card.classList.toggle("selected", Number(card.dataset.loteId) === Number(loteId));
    });

    const inputLote = document.getElementById("calc-lote-id");
    const inputTn = document.getElementById("calc-toneladas");
    if (inputLote) inputLote.value = loteId;
    if (inputTn && toneladasDefault) inputTn.value = toneladasDefault;

    recalcularCotizacionEnVivo();
}

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
        document.getElementById("res-ahorro").textContent = formatoARS(c.ahorro_logistico_ars);

        // Desglose transparente
        document.getElementById("res-subtotal-prod").textContent = formatoARS(c.subtotal_subproducto_ars);
        document.getElementById("res-comision").textContent = formatoARS(c.comision_total_plataforma_ars);
        document.getElementById("res-total-comprador").textContent = formatoARS(c.total_comprador_subruta_ars);
    } catch (err) {
        console.error("Error al cotizar flete:", err);
    }
}

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
        btn.textContent = "4. Reservar con Pago en Garantía + Emitir Certificado";
    }
}

function mostrarModalCertificado(cert) {
    document.getElementById("cert-id").textContent = `#SR-2026-${String(cert.id).padStart(4, "0")}`;
    document.getElementById("cert-vendedor").textContent = `${cert.vendedor} (${cert.origen})`;
    document.getElementById("cert-comprador").textContent = `${cert.comprador} (${cert.destino})`;
    document.getElementById("cert-subproducto").textContent = `${cert.subproducto} — ${cert.toneladas} tn (${cert.volumen_m3} m³)`;
    document.getElementById("cert-transportista").textContent = cert.transportista;
    document.getElementById("cert-ahorro").textContent = formatoARS(cert.ahorro_logistico_ars);
    document.getElementById("cert-total").textContent = formatoARS(cert.total_comprador_ars);
    document.getElementById("cert-hash").textContent = cert.hash_certificado;
    document.getElementById("cert-red").textContent = cert.red_blockchain;

    document.getElementById("modal-certificado").style.display = "flex";
}

function cerrarModalCertificado() {
    document.getElementById("modal-certificado").style.display = "none";
}

function abrirModalPublicar() {
    document.getElementById("modal-publicar").style.display = "flex";
}

function cerrarModalPublicar() {
    document.getElementById("modal-publicar").style.display = "none";
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
        window.location.reload();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    recalcularCotizacionEnVivo();
});
