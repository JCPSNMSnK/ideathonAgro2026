/* =============================================================================
   5. SELECCIÓN DE LOTES Y FILTRADO EN CLIENTE (CARRIL 2)
   ============================================================================= */
function seleccionarLote(loteId, toneladasDefault, distanciaSugerida) {
    document.querySelectorAll("#contenedor-tarjetas-lotes .lote-card").forEach((card) => {
        const coincide = card.getAttribute("data-lote-id") === String(loteId);
        card.classList.toggle("selected", coincide);
    });

    const selectLote = document.getElementById("calc-lote-id");
    const inputLote = document.getElementById("calc-lote-id-hidden");
    const inputTn = document.getElementById("calc-toneladas");
    const inputKm = document.getElementById("calc-distancia-km");

    if (selectLote) selectLote.value = String(loteId);
    if (inputLote) inputLote.value = String(loteId);
    if (inputTn && toneladasDefault) inputTn.value = toneladasDefault;
    if (inputKm && distanciaSugerida) inputKm.value = distanciaSugerida;

    const badgePaso2 = document.getElementById("badge-lote-activo-paso2");
    if (badgePaso2 && selectLote) {
        const opt = selectLote.options[selectLote.selectedIndex];
        if (opt) badgePaso2.textContent = opt.text.split("—")[0].trim();
    }

    recalcularCotizacionEnVivo();
}

function seleccionarLoteYEnfocarCotizador(loteId, toneladasDefault, distanciaSugerida) {
    seleccionarLote(loteId, toneladasDefault, distanciaSugerida);
    cambiarSubTabComprador("paso2");
}

function calzarCamionConLote(loteId, camionId, toneladasDefault) {
    const selectCamion = document.getElementById("calc-camion-id");
    if (selectCamion && camionId) {
        selectCamion.value = String(camionId);
    }
    seleccionarLote(loteId, toneladasDefault, 160);
    cambiarVistaRol("vista-comprador");
    cambiarSubTabComprador("paso2");
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

let textoBusquedaCatalogoComprador = "";
let condicionFiltroCatalogoComprador = "TODOS";

function filtrarTarjetasEnCliente(texto) {
    textoBusquedaCatalogoComprador = (texto || "").trim().toLowerCase();
    estadoPaginacion.compradorLotes.page = 1;
    aplicarFiltroYPaginacionCatalogoComprador();
}

function filtrarPorCondicionLote(condicion, btnEl) {
    condicionFiltroCatalogoComprador = condicion || "TODOS";
    if (btnEl && btnEl.parentElement) {
        btnEl.parentElement.querySelectorAll(".chip-btn").forEach((b) => b.classList.remove("active"));
        btnEl.classList.add("active");
    }
    estadoPaginacion.compradorLotes.page = 1;
    aplicarFiltroYPaginacionCatalogoComprador();
}
