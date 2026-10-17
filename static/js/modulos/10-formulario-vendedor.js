/* =============================================================================
   6.3. CONTROL DE FORMULARIO DE PUBLICACIÓN DEL VENDEDOR (FUTURO, URGENCIA, MUTUO)
   ============================================================================= */
function alternarCamposLoteFuturo(tipo) {
    const container = document.getElementById("pub-campos-lote-futuro");
    if (container) {
        container.style.display = tipo === "FUTURO" ? "block" : "none";
    }
}

function alCambiarUrgenciaVendedor(urgencia) {
    const selectModalidad = document.getElementById("pub-modalidad");
    if (selectModalidad && urgencia.startsWith("URGENTE")) {
        selectModalidad.value = "VENDEDOR";
        alternarCampoMutuoAcuerdo("VENDEDOR");
    }
}

function alternarCampoMutuoAcuerdo(modalidad) {
    const group = document.getElementById("pub-porcentaje-vendedor-group");
    if (group) {
        group.style.display = modalidad === "MUTUO_ACUERDO" ? "block" : "none";
    }
}

function actualizarLabelMutuoAcuerdo(val) {
    const vPct = parseInt(val || 50, 10);
    const cPct = Math.max(0, 100 - vPct);
    const label = document.getElementById("pub-porcentaje-vendedor-label");
    if (label) {
        label.textContent = `${vPct}% Vendedor / ${cPct}% Comprador`;
    }
}
