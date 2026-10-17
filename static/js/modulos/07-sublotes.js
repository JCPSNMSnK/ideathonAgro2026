/* =============================================================================
   6.1. SUBLOTES, FRACCIONAMIENTO Y LOTES FUTUROS (MARKETPLACE AGRO 2026)
   ============================================================================= */
function comprarSubloteDirecto(loteId, toneladas, distanciaKm) {
    seleccionarLote(loteId, toneladas, distanciaKm);

    // Marcar tag visual de sublote
    const subloteTag = document.getElementById("calc-sublote-tag");
    if (subloteTag) subloteTag.style.display = "inline-block";

    // Actualizar botones de sublotes en cotizador
    fijarToneladasCotizador(toneladas);

    // Llevar directamente al Paso 2 (Cotizador en Tranquera y Reserva)
    cambiarSubTabComprador("paso2");
}

function fijarToneladasCotizador(toneladas) {
    const inputTn = document.getElementById("calc-toneladas");
    const selectLote = document.getElementById("calc-lote-id");
    if (!inputTn) return;

    if (toneladas === "total") {
        const opt = selectLote?.options[selectLote.selectedIndex];
        const tnTotal = opt ? parseFloat(opt.getAttribute("data-toneladas") || "14") : 14;
        inputTn.value = tnTotal;
        const subloteTag = document.getElementById("calc-sublote-tag");
        if (subloteTag) subloteTag.style.display = "none";
    } else {
        inputTn.value = toneladas;
        const subloteTag = document.getElementById("calc-sublote-tag");
        if (subloteTag) subloteTag.style.display = "inline-block";

        // Si son cargas menores para productores o pymes (<= 2.5 tn), sugerir automáticamente Vehículo Propio
        if (parseFloat(toneladas) <= 2.5) {
            const selectModo = document.getElementById("calc-modo-transporte");
            const selectVeh = document.getElementById("calc-tipo-vehiculo-propio");
            if (selectModo) {
                selectModo.value = "VEHICULO_PROPIO";
                alCambiarModoTransporte("VEHICULO_PROPIO");
            }
            if (selectVeh) {
                selectVeh.value = parseFloat(toneladas) <= 1.0 ? "CAMIONETA" : "CAMIONETA_CON_ACOPLADO";
            }
        }
    }

    actualizarBotonesSubloteCotizador(toneladas);
    recalcularCotizacionEnVivo();
}

function actualizarBotonesSubloteCotizador(toneladasSeleccionadas) {
    document.querySelectorAll(".sublote-calc-pill").forEach(btn => {
        btn.classList.remove("active");
        const txt = btn.textContent.trim();
        if (toneladasSeleccionadas === "total" && btn.id === "btn-sublote-total") {
            btn.classList.add("active");
        } else if (txt.startsWith(`${toneladasSeleccionadas} `) || txt === `${toneladasSeleccionadas} tn`) {
            btn.classList.add("active");
        }
    });
}
