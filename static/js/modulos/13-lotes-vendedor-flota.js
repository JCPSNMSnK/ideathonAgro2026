/* --- 6.5.2. Propiedad y Paginación de Lotes en Planta (Vendedor Tab 1) --- */
function cambiarFiltroLotesVendedor(modo) {
    estadoPaginacion.vendedorLotes.filtro = modo;
    estadoPaginacion.vendedorLotes.page = 1;
    document.getElementById("btn-filtro-vend-mios")?.classList.toggle("active", modo === "MIOS");
    document.getElementById("btn-filtro-vend-todos")?.classList.toggle("active", modo === "TODOS");
    aplicarPropiedadYPaginacionLotesVendedor();
}

function irAPaginaLotesVendedor(nuevaPagina) {
    estadoPaginacion.vendedorLotes.page = nuevaPagina;
    aplicarPropiedadYPaginacionLotesVendedor();
}

function aplicarPropiedadYPaginacionLotesVendedor() {
    const plantaActiva = obtenerIdentidadRol("vendedor");
    const labelPlanta = document.getElementById("label-planta-activa-vendedor");
    if (labelPlanta) labelPlanta.textContent = plantaActiva;

    const switcher = document.getElementById("switcher-actor-vendedor");
    if (switcher) {
        Array.from(switcher.options).forEach((opt) => {
            if (esRecursoPropio(opt.value, plantaActiva)) switcher.value = opt.value;
        });
    }

    const cards = Array.from(document.querySelectorAll("#lista-lotes-vendedor-abm .vendedor-lote-row-card"));
    let misLotesCount = 0;

    cards.forEach((card) => {
        const empresaLote = card.getAttribute("data-empresa-vendedora") || "";
        const esMio = esRecursoPropio(empresaLote, plantaActiva);
        if (esMio) misLotesCount++;

        card.classList.toggle("is-own-resource", esMio);
        card.classList.toggle("is-readonly-resource", !esMio);

        const badgeSlot = card.querySelector(".ownership-badge-slot");
        const actionsGroup = card.querySelector(".owner-actions-group");
        const readonlySlot = card.querySelector(".readonly-notice-slot");

        if (badgeSlot) {
            badgeSlot.innerHTML = esMio
                ? `<span class="badge-own-resource">✓ Tu Planta</span>`
                : `<span class="badge-thirdparty-resource">Otra Planta</span>`;
        }
        if (actionsGroup) actionsGroup.style.display = esMio ? "flex" : "none";
        if (readonlySlot) readonlySlot.style.display = esMio ? "none" : "block";
    });

    const kpiMisLotes = document.getElementById("kpi-vend-mis-lotes");
    if (kpiMisLotes) kpiMisLotes.textContent = `${misLotesCount} ${misLotesCount === 1 ? "lote" : "lotes"}`;

    const modo = estadoPaginacion.vendedorLotes.filtro;
    const visibles = cards.filter((card) => {
        if (modo === "TODOS") return true;
        return card.classList.contains("is-own-resource");
    });

    const total = visibles.length;
    const perPage = estadoPaginacion.vendedorLotes.perPage;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    if (estadoPaginacion.vendedorLotes.page > totalPages) {
        estadoPaginacion.vendedorLotes.page = totalPages;
    }
    const page = estadoPaginacion.vendedorLotes.page;
    const start = (page - 1) * perPage;
    const end = start + perPage;

    cards.forEach((c) => (c.style.display = "none"));
    visibles.slice(start, end).forEach((c) => (c.style.display = ""));

    renderizarControlesPaginacion(
        ["paginador-vendedor-lotes-top", "paginador-vendedor-lotes-bottom"],
        total,
        page,
        perPage,
        "irAPaginaLotesVendedor"
    );
}

/* --- 6.5.3. Propiedad y Paginación de Flota en Retorno (Logística Tab 1) --- */
function cambiarFiltroFlotaLogistica(modo) {
    estadoPaginacion.logisticaFlota.filtro = modo;
    estadoPaginacion.logisticaFlota.page = 1;
    document.getElementById("btn-filtro-log-mios")?.classList.toggle("active", modo === "MIOS");
    document.getElementById("btn-filtro-log-todos")?.classList.toggle("active", modo === "TODOS");
    aplicarPropiedadYPaginacionFlotaLogistica();
}

function irAPaginaFlotaLogistica(nuevaPagina) {
    estadoPaginacion.logisticaFlota.page = nuevaPagina;
    aplicarPropiedadYPaginacionFlotaLogistica();
}

function aplicarPropiedadYPaginacionFlotaLogistica() {
    const empresaActiva = obtenerIdentidadRol("logistica");
    const labelEmp = document.getElementById("label-empresa-activa-logistica");
    if (labelEmp) labelEmp.textContent = empresaActiva;

    const switcher = document.getElementById("switcher-actor-logistica");
    if (switcher) {
        Array.from(switcher.options).forEach((opt) => {
            if (esRecursoPropio(opt.value, empresaActiva)) switcher.value = opt.value;
        });
    }

    const cards = Array.from(document.querySelectorAll("#contenedor-camiones-logistica .truck-route-card"));
    let miFlotaCount = 0;

    cards.forEach((card) => {
        const transportistaCard = card.getAttribute("data-transportista") || "";
        const esMio = esRecursoPropio(transportistaCard, empresaActiva);
        if (esMio) miFlotaCount++;

        card.classList.toggle("is-own-resource", esMio);
        card.classList.toggle("is-readonly-resource", !esMio);

        const badgeSlot = card.querySelector(".ownership-badge-slot");
        const actionsGroup = card.querySelector(".owner-actions-group");
        const readonlySlot = card.querySelector(".readonly-notice-slot");

        if (badgeSlot) {
            badgeSlot.innerHTML = esMio
                ? `<span class="badge-own-resource">✓ Tu Flota</span>`
                : `<span class="badge-thirdparty-resource">Otra Transportista</span>`;
        }
        if (actionsGroup) actionsGroup.style.display = esMio ? "flex" : "none";
        if (readonlySlot) readonlySlot.style.display = esMio ? "none" : "block";
    });

    const kpiMiFlota = document.getElementById("kpi-log-mi-flota");
    if (kpiMiFlota) kpiMiFlota.textContent = `${miFlotaCount} ${miFlotaCount === 1 ? "unidad" : "unidades"}`;

    const modo = estadoPaginacion.logisticaFlota.filtro;
    const visibles = cards.filter((card) => {
        if (modo === "TODOS") return true;
        return card.classList.contains("is-own-resource");
    });

    const total = visibles.length;
    const perPage = estadoPaginacion.logisticaFlota.perPage;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    if (estadoPaginacion.logisticaFlota.page > totalPages) {
        estadoPaginacion.logisticaFlota.page = totalPages;
    }
    const page = estadoPaginacion.logisticaFlota.page;
    const start = (page - 1) * perPage;
    const end = start + perPage;

    cards.forEach((c) => (c.style.display = "none"));
    visibles.slice(start, end).forEach((c) => (c.style.display = ""));

    renderizarControlesPaginacion(
        ["paginador-logistica-flota-top", "paginador-logistica-flota-bottom"],
        total,
        page,
        perPage,
        "irAPaginaFlotaLogistica"
    );
}
