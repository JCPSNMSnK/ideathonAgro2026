/* --- 6.5.4. Pestaña 3 Comprador: Mis Compras y Certificados (Con Firma y Cierre de Escrow) --- */
function cambiarFiltroComprasComprador(modo) {
    estadoPaginacion.compradorCompras.filtro = modo;
    estadoPaginacion.compradorCompras.page = 1;
    document.getElementById("btn-filtro-compras-mias")?.classList.toggle("active", modo === "MIAS");
    document.getElementById("btn-filtro-compras-todas")?.classList.toggle("active", modo === "TODAS");
    renderizarComprasComprador();
}

function irAPaginaComprasComprador(nuevaPagina) {
    estadoPaginacion.compradorCompras.page = nuevaPagina;
    renderizarComprasComprador();
}

function renderizarComprasComprador() {
    const compradorActivo = obtenerIdentidadRol("comprador");
    const badgePend = document.getElementById("badge-compras-pendientes");
    const container = document.getElementById("lista-compras-comprador");

    if (!compradorActivo) {
        if (badgePend) {
            badgePend.textContent = "Iniciar sesión";
        }
        const topPag = document.getElementById("paginador-comprador-compras-top");
        const botPag = document.getElementById("paginador-comprador-compras-bottom");
        if (topPag) topPag.innerHTML = "";
        if (botPag) botPag.innerHTML = "";
        if (container) {
            container.innerHTML = `
                <div class="empty-state-card">
                    <h4>Iniciá sesión como Comprador para ver tus compras y certificados</h4>
                    <p>Por privacidad comercial y resguardo del contrato en custodia (Escrow), cada establecimiento agropecuario solo puede acceder a sus propias compras y certificados ambientales.</p>
                    <div style="display:flex; justify-content:center; gap:0.75rem; flex-wrap:wrap; margin-top:0.85rem;">
                        <button type="button" class="btn-primary" style="width:auto; padding:0.65rem 1.35rem;" onclick="abrirModalLogin()">
                            Iniciar Sesión como Comprador →
                        </button>
                        <button type="button" class="btn-secondary" style="width:auto; padding:0.65rem 1.2rem;" onclick="cambiarVentanaPrincipalComprador('nueva')">
                            Explorar Catálogo Público
                        </button>
                    </div>
                </div>
            `;
        }
        return;
    }

    const misOperaciones = operacionesCertificados.filter((op) =>
        esRecursoPropio(op.comprador, compradorActivo)
    );
    const pendientesMias = misOperaciones.filter((op) => !op.esta_cerrado).length;

    const kpiMisCompras = document.getElementById("kpi-comp-mis-compras");
    if (kpiMisCompras) {
        kpiMisCompras.textContent = `${misOperaciones.length} (${pendientesMias} por firmar)`;
    }
    if (badgePend) {
        badgePend.textContent = pendientesMias > 0 ? `${pendientesMias} por firmar` : `${misOperaciones.length} compras`;
    }

    const listaFiltrada = misOperaciones;

    const total = listaFiltrada.length;
    const perPage = estadoPaginacion.compradorCompras.perPage;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    if (estadoPaginacion.compradorCompras.page > totalPages) {
        estadoPaginacion.compradorCompras.page = totalPages;
    }
    const page = estadoPaginacion.compradorCompras.page;
    const start = (page - 1) * perPage;
    const itemsPagina = listaFiltrada.slice(start, start + perPage);

    if (!container) return;

    if (itemsPagina.length === 0) {
        container.innerHTML = `
            <div class="empty-state-card">
                <h4>No tenés compras registradas bajo "${compradorActivo}"</h4>
                <p>Podés explorar lotes en el Paso 1, cotizar en el Paso 2 y reservar con Pago en Garantía (Escrow).</p>
                <button type="button" class="btn-primary" style="width:auto; padding:0.65rem 1.35rem; margin-top:0.65rem;" onclick="cambiarVentanaPrincipalComprador('nueva')">
                    Ir a Nueva Compra →
                </button>
            </div>
        `;
    } else {
        container.innerHTML = itemsPagina
            .map((op) => {
                const esMia = esRecursoPropio(op.comprador, compradorActivo);
                const cerrado = Boolean(op.esta_cerrado);
                const codigoOp = `#MN-2026-${String(op.id).padStart(4, "0")}`;

                let accionFirmaHtml = "";
                if (cerrado) {
                    accionFirmaHtml = `
                        <div class="cert-signed-banner">
                            <span>✓ <strong>Certificado Firmado y Cerrado en Tranquera</strong> · Fondos Escrow liberados al vendedor y transportista.</span>
                            <button type="button" class="btn-secondary-outline" style="padding:0.4rem 0.85rem; font-size:0.78rem;"
                                    onclick="verCertificadoA4DesdeComprador(${op.id})">
                                Ver / Imprimir Certificado A4
                            </button>
                        </div>
                    `;
                } else if (esMia) {
                    accionFirmaHtml = `
                        <div class="cert-pending-sign-banner">
                            <div>
                                <strong>Recepción Pendiente de Tu Firma Digital (${op.comprador})</strong>
                                <p>Cuando el camión descargue las <strong>${op.toneladas} tn</strong> en tu establecimiento (${op.destino}), firmá la conformidad para cerrar el Certificado Ambiental y liberar el Escrow.</p>
                            </div>
                            <button type="button" class="btn-primary" style="background:var(--verde-bosque); white-space:nowrap;"
                                    onclick="firmarYCerrarCertificadoComprador(${op.id})">
                                Firmar Conformidad en Tranquera y Cerrar Certificado →
                            </button>
                        </div>
                    `;
                } else {
                    accionFirmaHtml = `
                        <div class="readonly-lock-pill" style="margin-top:0.65rem;">
                            Solo el comprador titular (<strong>${op.comprador}</strong>) está autorizado a firmar la recepción y liberar los fondos en custodia.
                        </div>
                    `;
                }

                return `
                    <article class="cert-op-card ${cerrado ? "cert-op-closed" : "cert-op-active"} ${esMia ? "is-own-resource" : "is-readonly-resource"}">
                        <div class="cert-op-header">
                            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:0.5rem;">
                                <span class="mono" style="font-weight:700; font-size:0.85rem; color:var(--verde-bosque);">${codigoOp}</span>
                                <span class="${cerrado ? "badge-cert-closed" : "badge-cert-custody"}">
                                    ${cerrado ? "✓ CERTIFICADO CERRADO · ESCROW LIBERADO" : "● EN CUSTODIA (ESCROW ACTIVO) · PENDIENTE FIRMA"}
                                </span>
                                ${esMia ? '<span class="badge-own-resource">✓ Tu Compra</span>' : '<span class="badge-thirdparty-resource">Otro Comprador</span>'}
                            </div>
                            <span class="mono" style="font-size:0.78rem; color:var(--texto-atenuado);">${op.fecha_emision || "Oct 2026"}</span>
                        </div>

                        <div class="cert-op-body">
                            <div class="cert-op-main-info">
                                <h4>${op.subproducto} — <strong>${op.toneladas} tn</strong> (${op.volumen_m3} m³)</h4>
                                <p style="font-size:0.84rem; color:var(--texto-secundario); margin-top:0.2rem;">
                                    Origen: <strong>${op.vendedor}</strong> (${op.origen}) → Destino: <strong>${op.comprador}</strong> (${op.destino})
                                </p>
                                <p style="font-size:0.80rem; color:var(--texto-secundario); margin-top:0.15rem;">
                                    Logística: <strong>${op.transportista}</strong> · Hash Hedera: <code class="mono">${(op.hash_certificado || "").slice(0, 22)}...</code>
                                </p>
                            </div>
                            <div class="cert-op-financials">
                                <div class="cert-fin-item">
                                    <span>Ahorro Logístico</span>
                                    <strong style="color:var(--verde-hoja);">${formatoARS(op.ahorro_logistico_ars)} ARS</strong>
                                </div>
                                <div class="cert-fin-item">
                                    <span>Total en Garantía</span>
                                    <strong class="mono">${formatoARS(op.total_comprador_ars)} ARS</strong>
                                </div>
                            </div>
                        </div>

                        <!-- Stepper de Trazabilidad en 3 Pasos -->
                        <div class="cert-stepper-row">
                            <div class="cert-step done">
                                <span class="step-dot">1</span>
                                <span>Fondos en Garantía (Escrow)</span>
                            </div>
                            <div class="cert-step done">
                                <span class="step-dot">2</span>
                                <span>Flete en Ruta (${op.origen} → ${op.destino})</span>
                            </div>
                            <div class="cert-step ${cerrado ? "done" : "pending"}">
                                <span class="step-dot">${cerrado ? "✓" : "3"}</span>
                                <span>${cerrado ? "Firmado en Tranquera y Certificado Cerrado" : "Firma del Comprador en Tranquera"}</span>
                            </div>
                        </div>

                        ${accionFirmaHtml}
                    </article>
                `;
            })
            .join("");
    }

    renderizarControlesPaginacion(
        ["paginador-comprador-compras-top", "paginador-comprador-compras-bottom"],
        total,
        page,
        perPage,
        "irAPaginaComprasComprador"
    );
}
