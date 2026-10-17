/* --- 6.5.5. Pestaña 3 Vendedor: Mis Certificados Ambientales (Solo Lectura de Escrow) --- */
function cambiarFiltroCertificadosVendedor(modo) {
    estadoPaginacion.vendedorCerts.filtro = modo;
    estadoPaginacion.vendedorCerts.page = 1;
    document.getElementById("btn-filtro-cert-vend-mios")?.classList.toggle("active", modo === "MIOS");
    document.getElementById("btn-filtro-cert-vend-todos")?.classList.toggle("active", modo === "TODOS");
    renderizarCertificadosVendedor();
}

function irAPaginaCertificadosVendedor(nuevaPagina) {
    estadoPaginacion.vendedorCerts.page = nuevaPagina;
    renderizarCertificadosVendedor();
}

function renderizarCertificadosVendedor() {
    const vendedorActivo = obtenerIdentidadRol("vendedor");
    const container = document.getElementById("lista-certificados-vendedor");

    if (!vendedorActivo) {
        if (container) {
            container.innerHTML = `
                <div class="empty-state-card">
                    <h4>Iniciá sesión como Vendedor para auditar tus certificados</h4>
                    <p>Cada agroindustria accede de forma privada a los certificados de economía circular emitidos para sus propios lotes.</p>
                </div>
            `;
        }
        return;
    }

    const misCerts = operacionesCertificados.filter((op) =>
        esRecursoPropio(op.vendedor, vendedorActivo)
    );

    const kpiCerts = document.getElementById("kpi-vend-mis-certs");
    if (kpiCerts) {
        kpiCerts.textContent = `${misCerts.length} ${misCerts.length === 1 ? "emitido" : "emitidos"}`;
    }

    const modo = estadoPaginacion.vendedorCerts.filtro;
    const listaFiltrada = modo === "TODOS" ? operacionesCertificados : misCerts;

    const total = listaFiltrada.length;
    const perPage = estadoPaginacion.vendedorCerts.perPage;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    if (estadoPaginacion.vendedorCerts.page > totalPages) {
        estadoPaginacion.vendedorCerts.page = totalPages;
    }
    const page = estadoPaginacion.vendedorCerts.page;
    const start = (page - 1) * perPage;
    const itemsPagina = listaFiltrada.slice(start, start + perPage);

    if (!container) return;

    if (itemsPagina.length === 0) {
        container.innerHTML = `
            <div class="empty-state-card">
                <h4>Sin certificados emitidos para "${vendedorActivo}" aún</h4>
                <p>Cuando un comprador reserve o firme un lote de tu planta, el Certificado Ambiental Oficial aparecerá aquí con trazabilidad Hedera HCS.</p>
            </div>
        `;
    } else {
        container.innerHTML = itemsPagina
            .map((op) => {
                const cerrado = Boolean(op.esta_cerrado);
                const esMio = esRecursoPropio(op.vendedor, vendedorActivo);
                const activoId = ultimoCertificadoEmitido ? ultimoCertificadoEmitido.id : null;
                const esSeleccionado = activoId === op.id;

                return `
                    <article class="cert-op-card cert-op-compact ${esSeleccionado ? "selected" : ""}"
                             onclick="seleccionarCertificadoVendedor(${op.id})"
                             style="cursor:pointer;">
                        <div class="cert-op-header">
                            <span class="mono" style="font-weight:700; color:var(--verde-bosque);">#MN-2026-${String(op.id).padStart(4, "0")}</span>
                            <span class="${cerrado ? "badge-cert-closed" : "badge-cert-custody"}">
                                ${cerrado ? "✓ CERRADO POR COMPRADOR" : "● EN CUSTODIA (ESPERANDO FIRMA COMPRADOR)"}
                            </span>
                        </div>
                        <h4 style="font-size:0.95rem; margin:0.35rem 0 0.2rem;">${op.subproducto} (${op.toneladas} tn)</h4>
                        <p style="font-size:0.80rem; color:var(--texto-secundario);">
                            Planta: <strong>${op.vendedor}</strong> → Comprador: <strong>${op.comprador}</strong> (${op.destino})
                        </p>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem; font-size:0.78rem;">
                            <span class="mono">Total: <strong>${formatoARS(op.total_comprador_ars)} ARS</strong></span>
                            <span style="color:var(--verde-bosque); font-weight:700;">
                                ${esMio ? "✓ Tu Planta · Ver A4 →" : "Otra Planta · Ver A4 →"}
                            </span>
                        </div>
                    </article>
                `;
            })
            .join("");

        // Sincronizar el visor A4 con el primer certificado de la lista si el actual no está
        if (itemsPagina.length > 0 && (!ultimoCertificadoEmitido || !itemsPagina.some((i) => i.id === ultimoCertificadoEmitido.id))) {
            seleccionarCertificadoVendedor(itemsPagina[0].id);
        } else if (ultimoCertificadoEmitido) {
            actualizarCertificadoEnPortalVendedor(ultimoCertificadoEmitido);
        }
    }

    renderizarControlesPaginacion(
        ["paginador-vendedor-cert-top", "paginador-vendedor-cert-bottom"],
        total,
        page,
        perPage,
        "irAPaginaCertificadosVendedor"
    );
}

function seleccionarCertificadoVendedor(opId) {
    const op = operacionesCertificados.find((item) => item.id === opId);
    if (!op) return;
    ultimoCertificadoEmitido = op;
    actualizarCertificadoEnPortalVendedor(op);
    document.querySelectorAll("#lista-certificados-vendedor .cert-op-card").forEach((el) => {
        el.classList.toggle("selected", el.textContent.includes(String(op.id).padStart(4, "0")));
    });
}

function verCertificadoA4DesdeComprador(opId) {
    const op = operacionesCertificados.find((item) => item.id === opId);
    if (op) {
        ultimoCertificadoEmitido = op;
        actualizarCertificadoEnPortalVendedor(op);
    }
    cambiarVistaRol("vista-vendedor");
    cambiarSubTabVendedor("certificados");
    setTimeout(() => {
        const card = document.getElementById("tarjeta-certificado-activo");
        if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
}

/* --- 6.5.6. Pestaña 3 Logística: Viajes Calzados y Liquidaciones --- */
function cambiarFiltroViajesLogistica(modo) {
    estadoPaginacion.logisticaViajes.filtro = modo;
    estadoPaginacion.logisticaViajes.page = 1;
    document.getElementById("btn-filtro-viajes-mios")?.classList.toggle("active", modo === "MIOS");
    document.getElementById("btn-filtro-viajes-todos")?.classList.toggle("active", modo === "TODOS");
    renderizarViajesLogistica();
}

function irAPaginaViajesLogistica(nuevaPagina) {
    estadoPaginacion.logisticaViajes.page = nuevaPagina;
    renderizarViajesLogistica();
}

function renderizarViajesLogistica() {
    const transportistaActivo = obtenerIdentidadRol("logistica");
    const container = document.getElementById("lista-viajes-logistica");

    if (!transportistaActivo) {
        if (container) {
            container.innerHTML = `
                <div class="empty-state-card">
                    <h4>Iniciá sesión como Logística para auditar tus viajes y cobros</h4>
                    <p>Cada empresa transportista accede de forma privada a sus liquidaciones y fletes calzados en tránsito.</p>
                </div>
            `;
        }
        return;
    }

    const misViajes = operacionesCertificados.filter((op) =>
        esRecursoPropio(op.transportista, transportistaActivo)
    );

    const kpiViajes = document.getElementById("kpi-log-mis-viajes");
    if (kpiViajes) {
        kpiViajes.textContent = `${misViajes.length} ${misViajes.length === 1 ? "operación" : "operaciones"}`;
    }

    const modo = estadoPaginacion.logisticaViajes.filtro;
    const listaFiltrada = modo === "TODOS" ? operacionesCertificados : misViajes;

    const total = listaFiltrada.length;
    const perPage = estadoPaginacion.logisticaViajes.perPage;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    if (estadoPaginacion.logisticaViajes.page > totalPages) {
        estadoPaginacion.logisticaViajes.page = totalPages;
    }
    const page = estadoPaginacion.logisticaViajes.page;
    const start = (page - 1) * perPage;
    const itemsPagina = listaFiltrada.slice(start, start + perPage);

    if (!container) return;

    if (itemsPagina.length === 0) {
        container.innerHTML = `
            <div class="empty-state-card">
                <h4>No hay viajes calzados registrados para "${transportistaActivo}" aún</h4>
                <p>Publicá tu unidad con retorno vacío en la pestaña "Publicar Viaje de Regreso" para calzar cargas con -45% FADEEAC y cobrar con pago en garantía.</p>
            </div>
        `;
    } else {
        container.innerHTML = itemsPagina
            .map((op) => {
                const cerrado = Boolean(op.esta_cerrado);
                const esMio = esRecursoPropio(op.transportista, transportistaActivo);
                return `
                    <article class="cert-op-card ${cerrado ? "cert-op-closed" : "cert-op-active"}">
                        <div class="cert-op-header">
                            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                                <span class="mono" style="font-weight:700; color:var(--verde-bosque);">#MN-VIAJE-${String(op.id).padStart(4, "0")}</span>
                                <span class="${cerrado ? "badge-cert-closed" : "badge-cert-custody"}">
                                    ${cerrado ? "✓ FLETE LIQUIDADO Y LIBERADO" : "● FLETE EN CUSTODIA (EN TRÁNSITO)"}
                                </span>
                                ${esMio ? '<span class="badge-own-resource">✓ Tu Unidad</span>' : '<span class="badge-thirdparty-resource">Otro Transportista</span>'}
                            </div>
                            <span class="mono" style="font-size:0.78rem; color:var(--texto-atenuado);">${op.fecha_emision || "Oct 2026"}</span>
                        </div>
                        <div class="cert-op-body">
                            <div class="cert-op-main-info">
                                <h4>${op.transportista} — Carga: ${op.subproducto} (${op.toneladas} tn / ${op.volumen_m3} m³)</h4>
                                <p style="font-size:0.84rem; color:var(--texto-secundario); margin-top:0.2rem;">
                                    Retiro en Planta: <strong>${op.vendedor} (${op.origen})</strong> → Descarga en Tranquera: <strong>${op.comprador} (${op.destino})</strong>
                                </p>
                            </div>
                            <div class="cert-op-financials">
                                <div class="cert-fin-item">
                                    <span>Estado Liquidación</span>
                                    <strong style="color:${cerrado ? "var(--verde-bosque)" : "var(--ambar-trigo)"};">
                                        ${cerrado ? "Transferido a CBU ✓" : "Retenido en Escrow"}
                                    </strong>
                                </div>
                                <div class="cert-fin-item">
                                    <span>Operación Total</span>
                                    <strong class="mono">${formatoARS(op.total_comprador_ars)} ARS</strong>
                                </div>
                            </div>
                        </div>
                    </article>
                `;
            })
            .join("");
    }

    renderizarControlesPaginacion(
        ["paginador-logistica-viajes-top", "paginador-logistica-viajes-bottom"],
        total,
        page,
        perPage,
        "irAPaginaViajesLogistica"
    );
}

function sincronizarPropiedadYListasPorRol() {
    aplicarFiltroYPaginacionCatalogoComprador();
    aplicarPropiedadYPaginacionLotesVendedor();
    aplicarPropiedadYPaginacionFlotaLogistica();
    renderizarComprasComprador();
    renderizarCertificadosVendedor();
    renderizarViajesLogistica();
}
