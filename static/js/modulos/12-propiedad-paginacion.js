/* =============================================================================
   6.5. REGLAS DE NEGOCIO DE PROPIEDAD ESTRICTA Y MOTOR DE PAGINACIÓN REUTILIZABLE
   ============================================================================= */
let operacionesCertificados = [];

const estadoPaginacion = {
    compradorLotes: { page: 1, perPage: 4 },
    compradorCompras: { page: 1, perPage: 3, filtro: "MIAS" },
    vendedorLotes: { page: 1, perPage: 4, filtro: "MIOS" },
    vendedorCerts: { page: 1, perPage: 3, filtro: "MIOS" },
    logisticaFlota: { page: 1, perPage: 3, filtro: "MIOS" },
    logisticaViajes: { page: 1, perPage: 3, filtro: "MIOS" },
};

function normalizarIdentidadActor(texto) {
    if (!texto) return "";
    return String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\([^)]*\)/g, " ")
        .replace(/\b(srl|sa|s\.a\.|s\.r\.l\.|coop\.|cooperativa|ltda|sas|sh)\b/g, " ")
        .replace(/\b(transportes|transporte|molino|molinos|granja|establecimiento|aserradero)\b/g, " ")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function esRecursoPropio(propietarioRecurso, identidadActor) {
    if (!propietarioRecurso || !identidadActor) return false;
    const p = normalizarIdentidadActor(propietarioRecurso);
    const a = normalizarIdentidadActor(identidadActor);
    if (!p || !a) return false;
    return p === a || p.includes(a) || a.includes(p);
}

function obtenerIdentidadRol(rol) {
    if (!usuarioActivo || usuarioActivo.rol !== rol) {
        return "";
    }
    return usuarioActivo.organizacion || usuarioActivo.nombre || "";
}

function cambiarActorDemoRol(rol, organizacionNombre) {
    if (!organizacionNombre) return;
    if (usuarioActivo && usuarioActivo.rol === rol) {
        usuarioActivo.organizacion = organizacionNombre;
        try {
            localStorage.setItem("monai_sesion_activa", JSON.stringify(usuarioActivo));
        } catch (e) {}
    }

    if (rol === "comprador") {
        const inputComp = document.getElementById("calc-comprador");
        if (inputComp) inputComp.value = organizacionNombre;
    } else if (rol === "vendedor") {
        const inputEmp = document.getElementById("pub-empresa");
        const labelPlanta = document.getElementById("label-planta-activa-vendedor");
        if (inputEmp) inputEmp.value = organizacionNombre;
        if (labelPlanta) labelPlanta.textContent = organizacionNombre;
    } else if (rol === "logistica") {
        const inputTrans = document.getElementById("cam-transportista");
        const labelEmp = document.getElementById("label-empresa-activa-logistica");
        if (inputTrans) inputTrans.value = organizacionNombre;
        if (labelEmp) labelEmp.textContent = organizacionNombre;
    }

    sincronizarPropiedadYListasPorRol();
}

function cargarCertificadosIniciales() {
    try {
        const el = document.getElementById("datos-certificados-iniciales");
        if (el && el.textContent) {
            const parsed = JSON.parse(el.textContent.trim());
            if (Array.isArray(parsed)) {
                operacionesCertificados = parsed;
                if (operacionesCertificados.length > 0 && !ultimoCertificadoEmitido) {
                    ultimoCertificadoEmitido = operacionesCertificados[0];
                }
            }
        }
    } catch (e) {
        console.warn("No se pudieron cargar los certificados iniciales:", e);
    }
}

function renderizarControlesPaginacion(containersIds, totalItems, currentPage, perPage, onPageChangeFnName) {
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const startIdx = totalItems === 0 ? 0 : (safePage - 1) * perPage + 1;
    const endIdx = Math.min(totalItems, safePage * perPage);

    let pagesHtml = "";
    for (let p = 1; p <= totalPages; p++) {
        pagesHtml += `
            <button type="button" class="pagination-page-btn ${p === safePage ? "active" : ""}"
                    onclick="${onPageChangeFnName}(${p})"
                    aria-label="Página ${p}">
                ${p}
            </button>
        `;
    }

    const html = `
        <div class="pagination-summary">
            Mostrando <strong>${startIdx}–${endIdx}</strong> de <strong>${totalItems}</strong> registros
        </div>
        <div class="pagination-controls">
            <button type="button" class="pagination-nav-btn"
                    ${safePage <= 1 ? "disabled" : ""}
                    onclick="${onPageChangeFnName}(${safePage - 1})">
                ← Anterior
            </button>
            <div class="pagination-pages-group">
                ${pagesHtml}
            </div>
            <button type="button" class="pagination-nav-btn"
                    ${safePage >= totalPages ? "disabled" : ""}
                    onclick="${onPageChangeFnName}(${safePage + 1})">
                Siguiente →
            </button>
        </div>
    `;

    containersIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (totalItems <= perPage && totalPages <= 1) {
            el.innerHTML = `
                <div class="pagination-summary">
                    Mostrando <strong>${totalItems}</strong> de <strong>${totalItems}</strong> registros activos
                </div>
            `;
        } else {
            el.innerHTML = html;
        }
    });
}

/* --- 6.5.1. Paginación del Catálogo Comprador (Paso 1) --- */
function irAPaginaCatalogoComprador(nuevaPagina) {
    estadoPaginacion.compradorLotes.page = nuevaPagina;
    aplicarFiltroYPaginacionCatalogoComprador();
    const grid = document.getElementById("contenedor-tarjetas-lotes");
    if (grid) grid.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function aplicarFiltroYPaginacionCatalogoComprador() {
    const cards = Array.from(document.querySelectorAll("#contenedor-tarjetas-lotes .lote-card"));
    if (cards.length === 0) return;

    const filtradas = cards.filter((card) => {
        const texto = (card.getAttribute("data-busqueda") || "").toLowerCase();
        const coincideTexto = !textoBusquedaCatalogoComprador || texto.includes(textoBusquedaCatalogoComprador);
        let coincideCondicion = true;
        if (condicionFiltroCatalogoComprador === "URGENTE") {
            coincideCondicion = card.getAttribute("data-es-urgente") === "1";
        } else if (condicionFiltroCatalogoComprador === "FUTURO") {
            coincideCondicion = card.getAttribute("data-es-futuro") === "1";
        }
        return coincideTexto && coincideCondicion;
    });

    const total = filtradas.length;
    const perPage = estadoPaginacion.compradorLotes.perPage;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    if (estadoPaginacion.compradorLotes.page > totalPages) {
        estadoPaginacion.compradorLotes.page = totalPages;
    }
    const page = estadoPaginacion.compradorLotes.page;
    const start = (page - 1) * perPage;
    const end = start + perPage;

    cards.forEach((c) => (c.style.display = "none"));
    filtradas.slice(start, end).forEach((c) => (c.style.display = ""));

    renderizarControlesPaginacion(
        ["paginador-comprador-top", "paginador-comprador-bottom"],
        total,
        page,
        perPage,
        "irAPaginaCatalogoComprador"
    );
}
