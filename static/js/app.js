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
   1. GESTIÓN DE SESIÓN Y PERFIL DE USUARIO ACCESIBLE (PRODUCTOR RURAL)
   ============================================================================= */
let usuarioActivo = null;
let reservaPendiente = false;

function obtenerPerfilesGuardados() {
    try {
        const raw = localStorage.getItem("monai_perfiles_guardados");
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function guardarListaPerfiles(lista) {
    try {
        localStorage.setItem("monai_perfiles_guardados", JSON.stringify(lista));
    } catch (e) {}
}

function renderizarPerfilesABM() {
    const container = document.getElementById("custom-users-abm-container");
    const listEl = document.getElementById("custom-users-abm-list");
    if (!container || !listEl) return;

    const perfiles = obtenerPerfilesGuardados();
    if (!perfiles.length) {
        container.style.display = "none";
        listEl.innerHTML = "";
        return;
    }

    const rolEtiqueta = {
        comprador: "Comprador",
        vendedor: "Vendedor",
        logistica: "Logística",
    };

    container.style.display = "block";
    listEl.innerHTML = perfiles
        .map(
            (p, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; padding:0.5rem 0.75rem; background:var(--bg-bloque-suave); border:1px solid var(--borde-color); border-radius:var(--radio-sm); font-size:0.84rem;">
            <div>
                <strong>${p.nombre}</strong> · <span style="color:var(--color-primario); font-weight:700;">${rolEtiqueta[p.rol] || p.rol}</span>
                <span style="color:var(--texto-secundario);">(${p.localidad})</span>
            </div>
            <div style="display:flex; gap:0.35rem;">
                <button type="button" class="chip-btn" style="padding:0.2rem 0.5rem; font-size:0.76rem;" onclick="seleccionarPerfilGuardadoABM(${idx})">Usar</button>
                <button type="button" class="chip-btn" style="padding:0.2rem 0.5rem; font-size:0.76rem;" onclick="editarPerfilGuardadoABM(${idx})">✏️</button>
                <button type="button" class="chip-btn" style="padding:0.2rem 0.5rem; font-size:0.76rem; color:var(--color-peligro);" onclick="eliminarPerfilGuardadoABM(${idx})">🗑️</button>
            </div>
        </div>
    `
        )
        .join("");
}

function seleccionarPerfilGuardadoABM(idx) {
    const perfiles = obtenerPerfilesGuardados();
    const p = perfiles[idx];
    if (!p) return;
    identificarseComoRol(p.rol, p.nombre, p.organizacion || p.nombre, p.localidad);
}

function editarPerfilGuardadoABM(idx) {
    const perfiles = obtenerPerfilesGuardados();
    const p = perfiles[idx];
    if (!p) return;
    const inputIdx = document.getElementById("login-edit-index");
    const inputNombre = document.getElementById("login-nombre");
    const selectRol = document.getElementById("login-rol-select");
    const inputLoc = document.getElementById("login-localidad");
    const labelMode = document.getElementById("login-form-mode-label");
    const btnSubmit = document.getElementById("login-btn-submit");

    if (inputIdx) inputIdx.value = String(idx);
    if (inputNombre) inputNombre.value = p.nombre;
    if (selectRol) selectRol.value = p.rol;
    if (inputLoc) inputLoc.value = p.localidad;
    if (labelMode) labelMode.textContent = `Editando perfil: ${p.nombre}`;
    if (btnSubmit) btnSubmit.textContent = "Guardar Cambios del Perfil";
}

function eliminarPerfilGuardadoABM(idx) {
    const perfiles = obtenerPerfilesGuardados();
    if (!perfiles[idx]) return;
    perfiles.splice(idx, 1);
    guardarListaPerfiles(perfiles);
    renderizarPerfilesABM();
}

function abrirModalLogin() {
    renderizarPerfilesABM();
    const modal = document.getElementById("modal-login");
    if (modal) {
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
    }
}

function cerrarModalLogin() {
    const modal = document.getElementById("modal-login");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "";
    }
    const notice = document.getElementById("login-modal-notice");
    if (notice) notice.style.display = "none";
}

function cerrarSesion() {
    usuarioActivo = null;
    reservaPendiente = false;
    try {
        localStorage.removeItem("monai_usuario_activo");
    } catch (e) {}

    // Resetear valores de formularios a ejemplos neutrales
    const inputComprador = document.getElementById("calc-comprador");
    const inputDestino = document.getElementById("calc-destino");
    const inputEmpresa = document.getElementById("pub-empresa");
    const inputLocalidad = document.getElementById("pub-localidad");
    const inputTransportista = document.getElementById("cam-transportista");

    if (inputComprador) inputComprador.value = "Granja Avícola San Isidro SRL";
    if (inputDestino) inputDestino.value = "Goya, Corrientes";
    if (inputEmpresa) inputEmpresa.value = "Molino Arrocero San Lorenzo SRL";
    if (inputLocalidad) inputLocalidad.value = "Saladas";
    if (inputTransportista) inputTransportista.value = "Transporte Don Horacio";

    aplicarDatosSesionEnUI();
    cambiarVistaRol("vista-inicio");
}

function identificarseComoRol(rol, nombre, organizacion, localidad) {
    usuarioActivo = { rol, nombre, organizacion, localidad };
    guardarYActualizarSesion();
    cerrarModalLogin();

    // Si había una reserva en curso en el cotizador, ejecutarla inmediatamente
    if (reservaPendiente) {
        reservaPendiente = false;
        cambiarVistaRol("vista-comprador");
        setTimeout(() => {
            confirmarReservaConGarantia();
        }, 160);
        return;
    }

    // Navegar directamente a la vista de su rol para máxima conveniencia
    if (rol === "comprador") cambiarVistaRol("vista-comprador");
    else if (rol === "vendedor") cambiarVistaRol("vista-vendedor");
    else if (rol === "logistica") cambiarVistaRol("vista-logistica");
}

function guardarIdentificacionManual(event) {
    event.preventDefault();
    const nombre = document.getElementById("login-nombre")?.value || "Usuario Productor";
    const rol = document.getElementById("login-rol-select")?.value || "comprador";
    const localidad = document.getElementById("login-localidad")?.value || "Goya, Corrientes";
    const editIdxRaw = document.getElementById("login-edit-index")?.value;

    const nuevoPerfil = {
        rol,
        nombre,
        organizacion: nombre,
        localidad,
    };

    const perfiles = obtenerPerfilesGuardados();
    if (editIdxRaw !== "" && editIdxRaw !== undefined && perfiles[Number(editIdxRaw)]) {
        perfiles[Number(editIdxRaw)] = nuevoPerfil;
    } else {
        perfiles.push(nuevoPerfil);
    }
    guardarListaPerfiles(perfiles);

    // Resetear estado de edición del formulario
    const inputIdx = document.getElementById("login-edit-index");
    const labelMode = document.getElementById("login-form-mode-label");
    const btnSubmit = document.getElementById("login-btn-submit");
    if (inputIdx) inputIdx.value = "";
    if (labelMode) labelMode.textContent = "o creá / editá un perfil de usuario";
    if (btnSubmit) btnSubmit.textContent = "Guardar Perfil y Entrar";

    usuarioActivo = nuevoPerfil;
    guardarYActualizarSesion();
    cerrarModalLogin();

    if (reservaPendiente) {
        reservaPendiente = false;
        cambiarVistaRol("vista-comprador");
        setTimeout(() => {
            confirmarReservaConGarantia();
        }, 160);
        return;
    }

    if (rol === "comprador") cambiarVistaRol("vista-comprador");
    else if (rol === "vendedor") cambiarVistaRol("vista-vendedor");
    else if (rol === "logistica") cambiarVistaRol("vista-logistica");
}

function guardarYActualizarSesion() {
    try {
        if (usuarioActivo) {
            localStorage.setItem("monai_usuario_activo", JSON.stringify(usuarioActivo));
        } else {
            localStorage.removeItem("monai_usuario_activo");
        }
    } catch (e) {}
    aplicarDatosSesionEnUI();
}

function restaurarSesionGuardada() {
    try {
        const raw = localStorage.getItem("monai_usuario_activo");
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.rol) {
                usuarioActivo = parsed;
            }
        }
    } catch (e) {}
    aplicarDatosSesionEnUI();
}

function aplicarDatosSesionEnUI() {
    const tabLabel = document.getElementById("nav-login-tab-label");
    const sessionRolePill = document.getElementById("session-role-pill");
    const btnLogout = document.getElementById("btn-logout");

    // Contenedores privados y de acceso restringido para no logueados
    const vendedorGated = document.getElementById("vendedor-gated-view");
    const vendedorPrivate = document.getElementById("vendedor-private-view");
    const logisticaGated = document.getElementById("logistica-gated-view");
    const logisticaPrivate = document.getElementById("logistica-private-view");

    const rolMap = {
        comprador: "Comprador",
        vendedor: "Vendedor",
        logistica: "Logística",
    };

    if (!usuarioActivo) {
        if (tabLabel) tabLabel.textContent = "Iniciar Sesión";
        if (sessionRolePill) {
            sessionRolePill.style.display = "none";
            sessionRolePill.textContent = "Ingresar";
        }
        if (btnLogout) btnLogout.style.display = "none";

        // Gating para usuarios no identificados: mostrar tarjetas de bienvenida/bloqueo
        if (vendedorGated) vendedorGated.style.display = "block";
        if (vendedorPrivate) vendedorPrivate.style.display = "none";
        if (logisticaGated) logisticaGated.style.display = "block";
        if (logisticaPrivate) logisticaPrivate.style.display = "none";
        return;
    }

    // Usuario con sesión iniciada en la navbar unificada
    const rolTexto = rolMap[usuarioActivo.rol] || "Usuario";
    const nombreCorto = (usuarioActivo.nombre || "Mi Cuenta").split(" ")[0];
    if (tabLabel) {
        tabLabel.textContent = `${nombreCorto} (${rolTexto})`;
    }
    if (sessionRolePill) {
        sessionRolePill.style.display = "inline-block";
        sessionRolePill.textContent = rolTexto;
    }
    if (btnLogout) {
        btnLogout.style.display = "inline-flex";
    }

    // Desbloquear paneles privados
    if (vendedorGated) vendedorGated.style.display = "none";
    if (vendedorPrivate) vendedorPrivate.style.display = "block";
    if (logisticaGated) logisticaGated.style.display = "none";
    if (logisticaPrivate) logisticaPrivate.style.display = "block";

    // Prefill de campos según el usuario activo
    const inputComprador = document.getElementById("calc-comprador");
    const inputDestino = document.getElementById("calc-destino");
    const inputEmpresa = document.getElementById("pub-empresa");
    const inputLocalidad = document.getElementById("pub-localidad");
    const inputTransportista = document.getElementById("cam-transportista");

    if (usuarioActivo.rol === "comprador") {
        if (inputComprador) inputComprador.value = usuarioActivo.organizacion || usuarioActivo.nombre;
        if (inputDestino) inputDestino.value = usuarioActivo.localidad;
    } else if (usuarioActivo.rol === "vendedor") {
        if (inputEmpresa) inputEmpresa.value = usuarioActivo.organizacion || usuarioActivo.nombre;
        if (inputLocalidad) inputLocalidad.value = usuarioActivo.localidad;
    } else if (usuarioActivo.rol === "logistica") {
        if (inputTransportista) inputTransportista.value = usuarioActivo.organizacion || usuarioActivo.nombre;
    }
}

/* =============================================================================
   2. CASOS REALES PRECARGADOS PARA LA PSEUDO-DEMOSTRACIÓN DE LA LANDING
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
        volumenM3: "66.7 m³",
        volumenPctTexto: "74% Volumen acoplado",
        volumenPctNum: 74,
        pesoTn: "14 tn",
        pesoPctTexto: "47% Capacidad",
        pesoPctNum: 47,
        explicacionTrampa:
            "El aserrín seco ocupa gran volumen con bajo peso. Al dividir 50/50 un camión de retorno (-48%), el aserradero libera su playa colapsada y el productor recibe insumo a mitad de costo.",
        precioRojo: "$1.300.000",
        descRojo: "Flete tradicional consume más del 80% del valor del aserrín en planta.",
        descuentoPct: "-48%",
        precioVerde: "$676.000",
        descVerde: "Semirremolque baranda volcable en retorno hacia Mercedes/Curuzú Cuatiá.",
        ahorro: "$624.000 ARS",
        distanciaKm: 165,
        toneladas: 14,
    },
    {
        indice: 2,
        loteIndex: 2,
        ruta: "Bella Vista, Corrientes → Goya, Corrientes (85 km)",
        actor: "Jugos del Litoral SA · Destino: Fibra y Energía para Feedlot Bovino",
        modalidad: "Flete: 100% Vendedor (Urgencia 48 hs)",
        densidad: "Densidad: 650 kg/m³",
        volumenM3: "36.9 m³",
        volumenPctTexto: "41% Volumen",
        volumenPctNum: 41,
        pesoTn: "24 tn",
        pesoPctTexto: "80% Capacidad Peso",
        pesoPctNum: 80,
        explicacionTrampa:
            "La cáscara húmeda de citrus fermenta en 48 hs generando multas ambientales. La juguera absorbe el Flete Calzado (-45%) porque le sale más barato que el pasivo ambiental.",
        precioRojo: "$950.000",
        descRojo: "Contratar batea estanca de urgencia a tarifa plena frena la evacuación diaria.",
        descuentoPct: "-45%",
        precioVerde: "$520.000",
        descVerde: "Flete absorbido por la citrícola con camión de retorno + Certificado Ambiental Hedera.",
        ahorro: "$430.000 ARS",
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
   3. MODO CLARO / MODO OSCURO SENCILLO DE ENTENDER
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
   4. NAVEGACIÓN POR TIPO DE USUARIO (CON VIEW TRANSITIONS SI DISPONIBLE)
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
   6. COTIZADOR PESO/VOLUMEN Y FLETE CALZADO (CARRIL 3 - /api/cotizar/)
   ============================================================================= */
function alCambiarModoTransporte(modo) {
    const contenedorVehiculo = document.getElementById("contenedor-vehiculo-propio");
    const contenedorCamion = document.getElementById("contenedor-camion-retorno");
    const esPropio = modo === "VEHICULO_PROPIO";

    if (contenedorVehiculo) contenedorVehiculo.style.display = esPropio ? "block" : "none";
    if (contenedorCamion) contenedorCamion.style.display = esPropio ? "none" : "block";

    recalcularCotizacionEnVivo();
}

async function recalcularCotizacionEnVivo() {
    const loteId = document.getElementById("calc-lote-id")?.value;
    const camionId = document.getElementById("calc-camion-id")?.value;
    const distanciaKm = document.getElementById("calc-distancia-km")?.value || 160;
    const toneladas = document.getElementById("calc-toneladas")?.value || 14;
    const modoTransporte = document.getElementById("calc-modo-transporte")?.value || "VUELTA";
    const tipoVehiculoPropio = document.getElementById("calc-tipo-vehiculo-propio")?.value || "CAMION_CHASIS";

    if (!loteId) return;

    const params = new URLSearchParams({
        lote_id: loteId,
        camion_id: camionId,
        distancia_km: distanciaKm,
        toneladas: toneladas,
        modo_transporte: modoTransporte,
        tipo_vehiculo_propio: tipoVehiculoPropio,
    });

    try {
        const res = await fetch(`/api/cotizar/?${params.toString()}`);
        const data = await res.json();
        if (!data.ok) return;

        const c = data.cotizacion;

        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setTxt("res-lote-titulo", c.lote_titulo);
        setTxt("res-origen", `${c.empresa_vendedora || c.vendedor || "Agroindustria"} (${c.origen || c.localidad_origen || "Planta"})`);
        setTxt("res-volumen-m3", `${c.volumen_m3} m³`);
        setTxt("res-limitante", (c.factor_limitante || "VOLUMEN FÍSICO").toUpperCase());
        
        const pctVol = c.ocupacion_volumen_pct ?? c.porcentaje_volumen_camion ?? 0;
        const pctPeso = c.ocupacion_peso_pct ?? c.porcentaje_peso_camion ?? 0;
        setTxt("pct-vol-label", `${pctVol}%`);
        setTxt("pct-peso-label", `${pctPeso}%`);

        const barVol = document.getElementById("bar-volumen");
        const barPeso = document.getElementById("bar-peso");
        if (barVol) barVol.style.width = `${Math.min(100, pctVol)}%`;
        if (barPeso) barPeso.style.width = `${Math.min(100, pctPeso)}%`;

        setTxt("res-flete-tradicional", formatoARS(c.flete_tradicional_fadeeac_ars));
        setTxt("res-incidencia-pct", `${c.incidencia_flete_tradicional_pct || c.incidencia_flete_pct || 75}% del total`);

        const esVehiculoPropio = (c.modo_transporte || modoTransporte) === "VEHICULO_PROPIO";
        if (esVehiculoPropio) {
            setTxt("res-flete-calzado", "$0 ARS (Flete Particular)");
            setTxt("res-descuento-pct", "100% en flete tercerizado");
            setTxt("res-ahorro", `${formatoARS(c.flete_tradicional_fadeeac_ars)} ARS`);
            const goodBoxTitle = document.querySelector(".comp-good .comp-badge-header");
            if (goodBoxTitle) goodBoxTitle.textContent = "Retiro con Vehículo Propio";
            const goodBoxDesc = document.querySelector(".comp-good .comp-desc");
            if (goodBoxDesc) goodBoxDesc.innerHTML = `<strong>$0 en fleteros</strong> · Retiro directo en planta`;
        } else {
            setTxt("res-flete-calzado", formatoARS(c.flete_calzado_ars || c.costo_transporte_ars));
            const descPct = c.descuento_retorno_pct ?? c.descuento_aplicado_pct ?? 45;
            setTxt("res-descuento-pct", `-${descPct}% por Retorno`);
            setTxt("res-ahorro", `${formatoARS(c.ahorro_logistico_ars)} ARS`);
            const goodBoxTitle = document.querySelector(".comp-good .comp-badge-header");
            if (goodBoxTitle) goodBoxTitle.textContent = "Con Flete Calzado Moñái";
            const goodBoxDesc = document.querySelector(".comp-good .comp-desc");
            if (goodBoxDesc) goodBoxDesc.innerHTML = `<strong id="res-descuento-pct">-${descPct}% por retorno</strong> · <strong>¡Insumo rentable en tu campo!</strong>`;
        }

        setTxt("res-subtotal-prod", formatoARS(c.subtotal_subproducto_ars));
        setTxt("res-modalidad", c.modalidad_flete_texto || c.modalidad_flete || "100% Comprador");
        setTxt("res-comision", formatoARS(c.comision_total_plataforma_ars));
        setTxt("res-total-comprador", formatoARS(c.total_comprador_subruta_ars));
    } catch (err) {
        console.error("Error en cotización en vivo:", err);
    }
}

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

    const panel = document.getElementById("panel-cotizador-comprador");
    if (panel) {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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

/* =============================================================================
   6.2. MAPA FEDERAL DE PRODUCTORES (ARGENTINA · CANVAS VECTORIAL SVG)
   ============================================================================= */
let datosMapaNEA = null;
let modoMercadoActual = "catalogo";
let regionMapaFiltro = "TODAS";

function cargarDatosMapa() {
    try {
        const scriptEl = document.getElementById("datos-mapa-nea");
        if (scriptEl && scriptEl.textContent) {
            datosMapaNEA = JSON.parse(scriptEl.textContent.trim());
        }
    } catch (e) {
        console.warn("No se pudieron parsear los datos del mapa federal:", e);
    }
}

function filtrarMapaPorRegion(region, btnEl) {
    regionMapaFiltro = region;
    document.querySelectorAll(".map-region-pill").forEach(btn => btn.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");
    renderizarMapaProductores();
}

function cambiarModoMercado(modo) {
    modoMercadoActual = modo;
    const btnCatalogo = document.getElementById("btn-vista-catalogo");
    const btnMapa = document.getElementById("btn-vista-mapa");
    const seccionCatalogo = document.getElementById("seccion-grilla-catalogo");
    const seccionMapa = document.getElementById("seccion-mapa-productores");

    if (modo === "mapa") {
        if (btnCatalogo) btnCatalogo.classList.remove("active");
        if (btnMapa) btnMapa.classList.add("active");
        if (seccionMapa) seccionMapa.style.display = "block";
        renderizarMapaProductores();
    } else {
        if (btnCatalogo) btnCatalogo.classList.add("active");
        if (btnMapa) btnMapa.classList.remove("active");
        if (seccionMapa) seccionMapa.style.display = "none";
    }
}

function calcularBoundingBoxProductores(productores, comp) {
    const lats = [comp.lat];
    const lngs = [comp.lng];
    productores.forEach(p => {
        if (p.lat && p.lng) {
            lats.push(p.lat);
            lngs.push(p.lng);
        }
    });

    const latMin = Math.min(...lats);
    const latMax = Math.max(...lats);
    const lngMin = Math.min(...lngs);
    const lngMax = Math.max(...lngs);

    const dLat = Math.max(1.2, (latMax - latMin) * 0.16);
    const dLng = Math.max(1.6, (lngMax - lngMin) * 0.16);

    return {
        latMin: latMin - dLat,
        latMax: latMax + dLat,
        lngMin: lngMin - dLng,
        lngMax: lngMax + dLng,
    };
}

function proyectarCoordASVG(lat, lng, bounds) {
    const b = bounds || {
        latMin: -39.8,
        latMax: -24.5,
        lngMin: -69.8,
        lngMax: -55.0,
    };

    const width = 880;
    const height = 500;
    const padding = 50;

    const spanLng = (b.lngMax - b.lngMin) || 1;
    const spanLat = (b.latMax - b.latMin) || 1;

    const x = padding + ((lng - b.lngMin) / spanLng) * (width - 2 * padding);
    const y = padding + ((b.latMax - lat) / spanLat) * (height - 2 * padding);

    return { x: Math.round(x), y: Math.round(y) };
}

function renderizarMapaProductores() {
    if (!datosMapaNEA) cargarDatosMapa();
    if (!datosMapaNEA) return;

    const svg = document.getElementById("svg-mapa-nea");
    const routesLayer = document.getElementById("map-routes-layer");
    const flowLayer = document.getElementById("map-flow-layer");
    const nodesLayer = document.getElementById("map-nodes-layer");

    if (!svg || !routesLayer || !nodesLayer) return;

    routesLayer.innerHTML = "";
    flowLayer.innerHTML = "";
    nodesLayer.innerHTML = "";

    const comp = datosMapaNEA.comprador || { lat: -29.14, lng: -59.2626, nombre: "Goya, Corrientes" };

    // Filtrar productores según región seleccionada
    let prodsVisibles = datosMapaNEA.productores || [];
    if (regionMapaFiltro !== "TODAS") {
        prodsVisibles = prodsVisibles.filter(p => {
            const zona = (p.zona || "").toUpperCase();
            const prov = (p.provincia || "").toUpperCase();
            const loc = (p.localidad || "").toUpperCase();
            if (regionMapaFiltro === "NEA") {
                return prov.includes("CORRIENTES") || prov.includes("CHACO") || prov.includes("MISIONES") || loc.includes("SALADAS") || loc.includes("VIRASORO") || loc.includes("GOYA");
            } else if (regionMapaFiltro === "PAMPEANA") {
                return prov.includes("SANTA FE") || prov.includes("CÓRDOBA") || prov.includes("CORDOBA") || prov.includes("BUENOS AIRES") || loc.includes("ROSARIO") || loc.includes("RECONQUISTA") || loc.includes("PERGAMINO") || loc.includes("CUARTO");
            } else if (regionMapaFiltro === "CUYO") {
                return prov.includes("MENDOZA") || prov.includes("SAN LUIS") || prov.includes("SAN JUAN") || loc.includes("MARTÍN") || loc.includes("MERCEDES");
            } else if (regionMapaFiltro === "NOA") {
                return prov.includes("TUCUMÁN") || prov.includes("TUCUMAN") || prov.includes("SALTA") || prov.includes("JUJUY");
            } else if (regionMapaFiltro === "PATAGONIA") {
                return prov.includes("RÍO NEGRO") || prov.includes("RIO NEGRO") || prov.includes("NEUQUÉN") || loc.includes("ROCA") || loc.includes("CIPOLLETTI");
            }
            return true;
        });
    }

    const bounds = calcularBoundingBoxProductores(prodsVisibles, comp);
    const pComp = proyectarCoordASVG(comp.lat, comp.lng, bounds);

    // 1. Dibujar Corredores Viales Troncales de Argentina
    const rutasTroncales = [
        // RN 12: Corrientes -> Empedrado -> Saladas -> Bella Vista -> Goya
        [
            proyectarCoordASVG(-27.4692, -58.8306, bounds),
            proyectarCoordASVG(-27.9542, -58.8042, bounds),
            proyectarCoordASVG(-28.2539, -58.6258, bounds),
            proyectarCoordASVG(-28.5089, -59.0453, bounds),
            proyectarCoordASVG(-29.1400, -59.2626, bounds),
        ],
        // RN 14: Posadas -> Virasoro -> Santo Tomé -> Paso de los Libres -> Concordia
        [
            proyectarCoordASVG(-27.3621, -55.8961, bounds),
            proyectarCoordASVG(-28.0500, -56.0167, bounds),
            proyectarCoordASVG(-28.5492, -56.0408, bounds),
            proyectarCoordASVG(-31.3930, -58.0209, bounds),
        ],
        // RN 16: Sáenz Peña -> Resistencia -> Corrientes
        [
            proyectarCoordASVG(-26.7852, -60.4388, bounds),
            proyectarCoordASVG(-27.4514, -58.9867, bounds),
            proyectarCoordASVG(-27.4692, -58.8306, bounds),
        ],
        // RN 11: Resistencia -> Reconquista -> Santa Fe -> Rosario
        [
            proyectarCoordASVG(-27.4514, -58.9867, bounds),
            proyectarCoordASVG(-29.1500, -59.6500, bounds),
            proyectarCoordASVG(-31.6333, -60.7000, bounds),
            proyectarCoordASVG(-32.9468, -60.6393, bounds),
        ],
        // RN 9 / RN 8: Rosario -> Pergamino -> Córdoba / Río Cuarto
        [
            proyectarCoordASVG(-32.9468, -60.6393, bounds),
            proyectarCoordASVG(-33.8994, -60.5736, bounds),
            proyectarCoordASVG(-33.1307, -64.3499, bounds),
        ],
        // RN 7: San Luis -> San Martín / Mendoza
        [
            proyectarCoordASVG(-33.1307, -64.3499, bounds),
            proyectarCoordASVG(-33.6757, -65.4578, bounds),
            proyectarCoordASVG(-33.0811, -68.4681, bounds),
        ],
    ];

    rutasTroncales.forEach(puntos => {
        let d = `M ${puntos[0].x} ${puntos[0].y}`;
        for (let i = 1; i < puntos.length; i++) {
            d += ` L ${puntos[i].x} ${puntos[i].y}`;
        }
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        path.setAttribute("class", "map-trunk-road");
        routesLayer.appendChild(path);
    });

    // 2. Líneas de Flujo desde cada Productor hacia el Comprador
    prodsVisibles.forEach(prod => {
        const pProd = proyectarCoordASVG(prod.lat, prod.lng, bounds);
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const cx = (pProd.x + pComp.x) / 2;
        const cy = Math.min(pProd.y, pComp.y) - 25;
        path.setAttribute("d", `M ${pProd.x} ${pProd.y} Q ${cx} ${cy} ${pComp.x} ${pComp.y}`);
        path.setAttribute("class", prod.es_urgente ? "map-flow-line map-flow-urgent" : "map-flow-line");
        flowLayer.appendChild(path);
    });

    // 3. Nodo del Comprador (Establecimiento Activo)
    const gComp = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gComp.setAttribute("class", "map-node-buyer");
    gComp.setAttribute("transform", `translate(${pComp.x}, ${pComp.y})`);
    gComp.innerHTML = `
        <circle r="18" class="buyer-pulse-halo" />
        <circle r="9" class="buyer-center-dot" />
        <text y="24" class="map-node-label">${comp.nombre || "Tu Establecimiento"}</text>
    `;
    nodesLayer.appendChild(gComp);

    // 4. Nodos de Productores con badges de urgencia / futuro
    prodsVisibles.forEach(prod => {
        const pt = proyectarCoordASVG(prod.lat, prod.lng, bounds);
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const nodeClass = prod.es_urgente ? "map-node-urgent" : (prod.es_lote_futuro ? "map-node-future" : "map-node-producer");
        g.setAttribute("class", `map-producer-node ${nodeClass}`);
        g.setAttribute("transform", `translate(${pt.x}, ${pt.y})`);
        g.setAttribute("role", "button");
        g.setAttribute("tabindex", "0");
        g.setAttribute("aria-label", `${prod.titulo} en ${prod.localidad}`);

        let badgeIcon = "🏭";
        if (prod.es_urgente) badgeIcon = "⚡";
        else if (prod.es_lote_futuro) badgeIcon = "🌱";

        g.innerHTML = `
            <circle r="14" class="node-outer-ring" />
            <circle r="8" class="node-center-point" />
            <text y="-18" class="node-title-tag">${prod.localidad} (${prod.toneladas} tn)</text>
            <text y="4" class="node-icon-emoji">${badgeIcon}</text>
        `;

        g.addEventListener("click", () => mostrarCardEnMapa(prod, pt));
        nodesLayer.appendChild(g);
    });
}

function mostrarCardEnMapa(prod, pt) {
    const card = document.getElementById("map-producer-card");
    const content = document.getElementById("map-card-content");
    if (!card || !content) return;

    let etiquetaBadge = "";
    if (prod.es_urgente) {
        etiquetaBadge = `<span class="badge-urgente-pulse"><span class="pulse-dot"></span> ${prod.etiqueta_urgencia || "VENTA INMEDIATA 48 HS"}</span>`;
    } else if (prod.es_lote_futuro) {
        etiquetaBadge = `<span class="badge-lote-futuro">📅 Lote Futuro (${prod.fecha_entrega_futura || "Zafra"})</span>`;
    }

    content.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; margin-bottom:0.4rem;">
            <span class="badge-cat badge-cat-${(prod.categoria || "arroz").toLowerCase()}">${prod.categoria}</span>
            ${etiquetaBadge}
        </div>
        <h4 style="font-size:1.05rem; font-family:var(--fuente-display); margin-bottom:0.25rem; color:var(--texto-principal);">${prod.titulo}</h4>
        <div style="font-size:0.80rem; color:var(--texto-secundario); margin-bottom:0.6rem;">
            📍 <strong>${prod.empresa}</strong> · ${prod.localidad}, ${prod.provincia} (${prod.ruta || "RN 12"})
        </div>
        <div class="map-card-metrics">
            <div><span>Disponible:</span><strong>${prod.toneladas} tn (${prod.volumen_m3} m³)</strong></div>
            <div><span>Distancia:</span><strong>${prod.distancia_km} km</strong></div>
            <div><span>Precio:</span><strong>$${Number(prod.precio_tn).toLocaleString("es-AR")}/tn</strong></div>
        </div>
        <div style="display:flex; gap:0.5rem; margin-top:0.75rem;">
            <button type="button" class="btn-primary" style="padding:0.45rem 0.9rem; font-size:0.82rem; min-height:36px;"
                    onclick="comprarSubloteDesdeMapa('${prod.id}', '${prod.sublote_min_tn || 5}', '${prod.distancia_km}')">
                Cotizar Sublote (${prod.sublote_min_tn || 5} tn) →
            </button>
            <button type="button" class="chip-btn" style="padding:0.45rem 0.75rem; font-size:0.82rem;"
                    onclick="seleccionarLote('${prod.id}', '${prod.toneladas}', '${prod.distancia_km}')">
                Lote Entero
            </button>
        </div>
    `;

    card.style.display = "block";
    // Posicionamiento adaptativo de la tarjeta flotante
    const leftPos = Math.min(Math.max(20, pt.x - 140), 580);
    const topPos = pt.y > 260 ? pt.y - 230 : pt.y + 25;
    card.style.left = `${leftPos}px`;
    card.style.top = `${topPos}px`;
}

function comprarSubloteDesdeMapa(loteId, toneladas, distanciaKm) {
    cerrarCardMapa();
    cambiarModoMercado("catalogo");
    comprarSubloteDirecto(loteId, toneladas, distanciaKm);
}

function cerrarCardMapa() {
    const card = document.getElementById("map-producer-card");
    if (card) card.style.display = "none";
}

/* =============================================================================
   6.3. CONTROL DE FORMULARIO DE PUBLICACIÓN DEL VENDEDOR (FUTURO & URGENCIA)
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
    }
}

/* =============================================================================
   7. RESERVA CON PAGO EN GARANTÍA (ESCROW) Y VOUCHER DEL COMPRADOR (CARRIL 4)
   ============================================================================= */
let ultimoCertificadoEmitido = null;

function aplicarPresetComprador(valor) {
    const inputComprador = document.getElementById("calc-comprador");
    const inputDestino = document.getElementById("calc-destino");
    const inputKm = document.getElementById("calc-distancia-km");
    const selectModo = document.getElementById("calc-modo-transporte");
    const selectVeh = document.getElementById("calc-tipo-vehiculo-propio");

    if (!valor || valor === "CUSTOM") {
        if (inputComprador) {
            inputComprador.value = "";
            inputComprador.focus();
        }
        return;
    }

    const partes = valor.split("|");
    if (partes.length >= 2) {
        if (inputComprador) inputComprador.value = partes[0];
        if (inputDestino) inputDestino.value = partes[1];
        if (partes[2] && inputKm) {
            inputKm.value = partes[2];
        }
        if (partes[3] && selectModo) {
            selectModo.value = partes[3];
            alCambiarModoTransporte(partes[3]);
        }
        if (partes[4] && selectVeh) {
            selectVeh.value = partes[4];
        }
        recalcularCotizacionEnVivo();
    }
}

async function confirmarReservaConGarantia() {
    // Si el usuario no inició sesión, interceptar, guardar intención y abrir modal de acceso
    if (!usuarioActivo) {
        reservaPendiente = true;
        const notice = document.getElementById("login-modal-notice");
        if (notice) {
            notice.style.display = "block";
            notice.innerHTML = `
                <div class="login-notice-banner">
                    <strong>🔒 Identificate para resguardar tu reserva</strong>
                    <p>Para emitir el comprobante de pago en custodia (Escrow) y el remito oficial a tu nombre, elegí tu establecimiento o ingresá tus datos.</p>
                </div>
            `;
        }
        abrirModalLogin();
        return;
    }

    const loteId = document.getElementById("calc-lote-id")?.value;
    const camionId = document.getElementById("calc-camion-id")?.value;
    const distanciaKm = document.getElementById("calc-distancia-km")?.value || 160;
    const toneladas = document.getElementById("calc-toneladas")?.value || 14;
    const modoTransporte = document.getElementById("calc-modo-transporte")?.value || "VUELTA";
    const tipoVehiculoPropio = document.getElementById("calc-tipo-vehiculo-propio")?.value || "CAMION_CHASIS";
    const compradorNombre = document.getElementById("calc-comprador")?.value || (usuarioActivo ? (usuarioActivo.organizacion || usuarioActivo.nombre) : "Granja Avícola San Isidro SRL");
    const destino = document.getElementById("calc-destino")?.value || (usuarioActivo ? usuarioActivo.localidad : "Goya, Corrientes");
    const ventanaCarga = document.getElementById("calc-ventana-carga")?.value || "";
    const destinoConVentana = ventanaCarga ? `${destino} · Turno: ${ventanaCarga}` : destino;

    const btn = document.getElementById("btn-confirmar-reserva");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Resguardando Fondos en Garantía y Sellando Hedera...";
    }

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
                localidad_destino: destinoConVentana,
                modo_transporte: modoTransporte,
                tipo_vehiculo_propio: tipoVehiculoPropio,
            }),
        });
        const data = await res.json();
        if (data.ok) {
            ultimoCertificadoEmitido = data.certificado;
            actualizarCertificadoEnPortalVendedor(data.certificado);
            mostrarModalVoucherReserva(data.certificado, modoTransporte);
        } else {
            alert(data.mensaje || "No se pudo procesar la reserva.");
        }
    } catch (err) {
        alert("No se pudo procesar la reserva. Verificá la conexión.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Reservar Lote con Pago en Garantía (Escrow) →";
        }
    }
}

async function confirmarDescargaYLiberarEscrow() {
    const opId = ultimoCertificadoEmitido ? ultimoCertificadoEmitido.id : null;
    try {
        const res = await fetch("/api/liberar-garantia/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ operacion_id: opId }),
        });
        const data = await res.json();
        if (data.ok) {
            const setTxt = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val;
            };
            setTxt("voucher-estado-badge", "PAGO LIBERADO AL VENDEDOR Y FLETERO · DESCARGA CONFIRMADA");
            setTxt("voucher-banner-title", "✅ ¡Descarga en Campo Confirmada y Fondos Liberados!");
            setTxt(
                "voucher-banner-desc",
                "El pago retenido en garantía (Escrow ARS) fue transferido al establecimiento vendedor y al transportista de retorno. Remito Circular cerrado."
            );
            setTxt("cert-estado-badge", "PAGO LIBERADO (ESCROW CERRADO) · REMITO CIRCULAR AUDITABLE");

            const vTotal = document.getElementById("voucher-total");
            if (vTotal) vTotal.textContent = vTotal.textContent.replace("(Custodia activa)", "(Pago Liberado ✓)");
            const cTotal = document.getElementById("cert-total");
            if (cTotal) cTotal.textContent = `${cTotal.textContent.split("(")[0].trim()} (Pago Liberado ✓)`;

            const btnVoucher = document.getElementById("btn-voucher-liberar");
            if (btnVoucher) {
                btnVoucher.disabled = true;
                btnVoucher.textContent = "✓ Pago Liberado";
            }
            alert(data.mensaje);
        }
    } catch (err) {
        alert("No se pudo liberar la garantía en este momento.");
    }
}

function mostrarModalVoucherReserva(cert, modoTransporteUsado) {
    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    const modo = modoTransporteUsado || document.getElementById("calc-modo-transporte")?.value || "VUELTA";
    const esVehiculoPropio = modo === "VEHICULO_PROPIO";

    setTxt("voucher-estado-badge", "OPERACIÓN EN CUSTODIA (ESCROW ARS) · CONFIRMADA");
    setTxt(
        "voucher-banner-title",
        esVehiculoPropio ? "¡Lote Reservado para Retiro con Vehículo Propio!" : "¡Flete Calzado y Lote Reservados Exitosamente!"
    );
    setTxt(
        "voucher-banner-desc",
        `Tus fondos quedaron resguardados en garantía oficial. Stock restante en planta actualizado a ${cert.stock_restante_lote_tn ?? "0"} tn.`
    );

    const btnVoucher = document.getElementById("btn-voucher-liberar");
    if (btnVoucher) {
        btnVoucher.disabled = false;
        btnVoucher.textContent = "✅ Confirmar Descarga y Liberar Pago";
    }

    setTxt("voucher-id", `#MN-RES-${String(cert.id).padStart(4, "0")}`);
    setTxt("voucher-subproducto", `${cert.subproducto} — ${cert.toneladas} tn (${cert.volumen_m3} m³)`);
    setTxt("voucher-vendedor", `${cert.vendedor} (${cert.origen})`);
    
    if (esVehiculoPropio) {
        const selVeh = document.getElementById("calc-tipo-vehiculo-propio");
        const nomVeh = selVeh ? selVeh.options[selVeh.selectedIndex]?.text.split("(")[0].trim() : "Particular";
        setTxt("voucher-camion", `🛻 Retiro Particular (${nomVeh}) · $0 Flete Tercerizado`);
    } else {
        setTxt("voucher-camion", cert.transportista);
    }

    setTxt("voucher-ahorro", `${formatoARS(cert.ahorro_logistico_ars)} ARS`);
    setTxt("voucher-total", `${formatoARS(cert.total_comprador_ars)} ARS (Custodia activa)`);
    setTxt("voucher-hash", cert.hash_certificado);
    setTxt("voucher-red", cert.red_blockchain || "Hedera Testnet (HCS)");
    const vLink = document.getElementById("voucher-hashscan-link");
    if (vLink && cert.hashscan_url) vLink.href = cert.hashscan_url;

    const modal = document.getElementById("modal-reserva-exito");
    if (modal) {
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
    }
}

function cerrarModalReserva() {
    const modal = document.getElementById("modal-reserva-exito");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "";
    }
}

function imprimirVoucherReserva() {
    window.print();
}

function irACertificadoVendedor() {
    cerrarModalReserva();
    cambiarVistaRol("vista-vendedor");
    setTimeout(() => {
        const card = document.getElementById("tarjeta-certificado-activo");
        if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 140);
}

function actualizarCertificadoEnPortalVendedor(cert) {
    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setTxt("cert-id", `#MN-2026-${String(cert.id).padStart(4, "0")}`);
    setTxt("cert-vendedor", `${cert.vendedor} (${cert.origen})`);
    setTxt("cert-comprador", `${cert.comprador} (${cert.destino})`);
    setTxt("cert-subproducto", `${cert.subproducto} — ${cert.toneladas} tn (${cert.volumen_m3} m³)`);
    setTxt("cert-transportista", cert.transportista);
    setTxt("cert-ahorro", `${formatoARS(cert.ahorro_logistico_ars)} ARS`);
    setTxt("cert-total", `${formatoARS(cert.total_comprador_ars)} ARS (Custodia activa)`);
    setTxt("cert-hash", cert.hash_certificado);
    setTxt("cert-red", cert.red_blockchain);
    const cLink = document.getElementById("cert-hashscan-link");
    if (cLink && cert.hashscan_url) cLink.href = cert.hashscan_url;
}

function imprimirCertificadoOficial() {
    window.print();
}

/* =============================================================================
   8. ABM DE EXCEDENTES (VENDEDOR) Y ABM DE CAMIONES DE RETORNO (LOGÍSTICA)
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
        preview.textContent = `${m3} m³ (${equipos} ${equipos === 1 ? "equipo Batea de 90 m³" : "equipos Batea de 90 m³"})`;
    }
}

function cargarLoteEnFormularioEdicion(id, titulo, categoria, empresa, localidad, toneladas, densidad, precio, modalidad, usos) {
    document.getElementById("pub-lote-edit-id").value = id;
    document.getElementById("pub-titulo").value = titulo;
    document.getElementById("pub-categoria").value = categoria;
    document.getElementById("pub-empresa").value = empresa;
    document.getElementById("pub-localidad").value = localidad;
    document.getElementById("pub-toneladas").value = parseFloat(String(toneladas).replace(",", ".")) || 15;
    document.getElementById("pub-densidad").value = densidad;
    document.getElementById("pub-precio").value = parseFloat(String(precio).replace(",", ".")) || 20000;
    document.getElementById("pub-modalidad").value = modalidad;
    document.getElementById("pub-usos").value = usos;

    const badge = document.getElementById("pub-form-badge");
    const title = document.getElementById("pub-form-title");
    const btnSubmit = document.getElementById("pub-btn-submit");
    const btnCancel = document.getElementById("pub-btn-cancel-edit");

    if (badge) badge.textContent = `MODIFICACIÓN DE LOTE #${id} EN SUPABASE`;
    if (title) title.textContent = `Editando: ${titulo}`;
    if (btnSubmit) btnSubmit.textContent = "Guardar Cambios del Lote en Planta";
    if (btnCancel) btnCancel.style.display = "inline-flex";

    actualizarPreviewCubicajePublicacion();
    document.getElementById("pub-titulo")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function cancelarEdicionLote() {
    document.getElementById("pub-lote-edit-id").value = "";
    document.getElementById("pub-titulo").value = "";

    const badge = document.getElementById("pub-form-badge");
    const title = document.getElementById("pub-form-title");
    const btnSubmit = document.getElementById("pub-btn-submit");
    const btnCancel = document.getElementById("pub-btn-cancel-edit");

    if (badge) badge.textContent = "Gestión de Salida de Planta (Alta / Modificación)";
    if (title) title.textContent = "Publicar Nuevo Excedente";
    if (btnSubmit) btnSubmit.textContent = "Publicar Lote y Activar Match con Camiones de Retorno";
    if (btnCancel) btnCancel.style.display = "none";
}

async function eliminarLoteABM(loteId, titulo) {
    if (!confirm(`¿Confirmás dar de baja el lote "${titulo}" del catálogo activo?`)) return;
    try {
        const res = await fetch(`/api/lote/${loteId}/eliminar/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (data.ok) {
            alert(data.mensaje);
            window.location.href = "/?rol=vendedor";
        }
    } catch (err) {
        alert("Error al dar de baja el lote.");
    }
}

async function enviarNuevoLote(event) {
    event.preventDefault();
    const editId = document.getElementById("pub-lote-edit-id")?.value;
    const tipoLote = document.getElementById("pub-tipo-lote")?.value || "INMEDIATO";
    const urgencia = document.getElementById("pub-urgencia-toggle")?.value || "NORMAL";
    const fechaFutura = document.getElementById("pub-fecha-futura")?.value || "";
    const subloteMin = document.getElementById("pub-sublote-min")?.value || "5";
    const payload = {
        titulo: document.getElementById("pub-titulo").value,
        categoria: document.getElementById("pub-categoria").value,
        empresa_vendedora: document.getElementById("pub-empresa").value,
        localidad_origen: document.getElementById("pub-localidad").value,
        toneladas_disponibles: document.getElementById("pub-toneladas").value,
        densidad_kg_m3: document.getElementById("pub-densidad").value,
        precio_tonelada_ars: document.getElementById("pub-precio").value,
        modalidad_flete: document.getElementById("pub-modalidad").value,
        usos_recomendados: document.getElementById("pub-usos").value,
        tipo_publicacion: tipoLote,
        es_urgente: urgencia.startsWith("URGENTE"),
        permite_sublotes: true,
        sublote_min_tn: subloteMin,
        fecha_disponibilidad: fechaFutura,
    };

    const url = editId ? `/api/lote/${editId}/editar/` : "/api/publicar/";

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.ok) {
            alert(data.mensaje || "Operación realizada exitosamente.");
            window.location.href = editId ? "/?rol=vendedor" : "/?rol=comprador";
        }
    } catch (err) {
        alert("Error al guardar el lote. Verificá los campos.");
    }
}

function cargarCamionEnFormularioEdicion(id, transportista, origen, destino, pasaPor, carroceria, fecha, capM3, descuento) {
    document.getElementById("cam-edit-id").value = id;
    document.getElementById("cam-transportista").value = transportista;
    document.getElementById("cam-origen").value = origen;
    document.getElementById("cam-destino").value = destino;
    document.getElementById("cam-pasa-por").value = pasaPor;
    document.getElementById("cam-carroceria").value = carroceria;
    document.getElementById("cam-fecha").value = fecha;
    document.getElementById("cam-cap-m3").value = parseFloat(String(capM3).replace(",", ".")) || 85;
    document.getElementById("cam-descuento").value = parseFloat(String(descuento).replace(",", ".")) || 45;

    const badge = document.getElementById("cam-form-badge");
    const title = document.getElementById("cam-form-title");
    const btnSubmit = document.getElementById("cam-btn-submit");
    const btnCancel = document.getElementById("cam-btn-cancel-edit");

    if (badge) badge.textContent = `MODIFICACIÓN DE CAMIÓN #${id}`;
    if (title) title.textContent = `Editando: ${transportista}`;
    if (btnSubmit) btnSubmit.textContent = "Guardar Cambios del Camión";
    if (btnCancel) btnCancel.style.display = "inline-flex";

    document.getElementById("cam-transportista")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function cancelarEdicionCamion() {
    document.getElementById("cam-edit-id").value = "";
    const badge = document.getElementById("cam-form-badge");
    const title = document.getElementById("cam-form-title");
    const btnSubmit = document.getElementById("cam-btn-submit");
    const btnCancel = document.getElementById("cam-btn-cancel-edit");

    if (badge) badge.textContent = "Alta / Modificación de Flota en Retorno";
    if (title) title.textContent = "Publicar Mi Camión con Retorno Vacío";
    if (btnSubmit) btnSubmit.textContent = "Publicar Retorno y Activar Notificaciones →";
    if (btnCancel) btnCancel.style.display = "none";
}

async function eliminarCamionABM(camionId, transportista) {
    if (!confirm(`¿Confirmás dar de baja el camión de "${transportista}" de la bolsa de retornos?`)) return;
    try {
        const res = await fetch(`/api/camion/${camionId}/eliminar/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (data.ok) {
            alert(data.mensaje);
            window.location.href = "/?rol=logistica";
        }
    } catch (err) {
        alert("Error al dar de baja el camión.");
    }
}

async function enviarNuevoCamion(event) {
    event.preventDefault();
    const editId = document.getElementById("cam-edit-id")?.value;
    const payload = {
        transportista: document.getElementById("cam-transportista").value,
        origen_viaje: document.getElementById("cam-origen").value,
        destino_viaje: document.getElementById("cam-destino").value,
        pasa_por: document.getElementById("cam-pasa-por").value,
        tipo_carroceria: document.getElementById("cam-carroceria").value,
        fecha_disponible: document.getElementById("cam-fecha").value,
        capacidad_max_m3: document.getElementById("cam-cap-m3").value,
        descuento_retorno_pct: document.getElementById("cam-descuento").value,
        capacidad_max_tn: 30,
    };

    const url = editId ? `/api/camion/${editId}/editar/` : "/api/publicar-camion/";

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.ok) {
            alert(data.mensaje || "Camión actualizado exitosamente.");
            window.location.href = "/?rol=logistica";
        }
    } catch (err) {
        alert("Error al guardar el camión. Verificá los campos.");
    }
}

/* =============================================================================
   9. INICIALIZACIÓN AL CARGAR EL DOCUMENTO
   ============================================================================= */
document.addEventListener("DOMContentLoaded", () => {
    // Restaurar sesión de usuario
    restaurarSesionGuardada();

    // Sincronizar tema actual
    const temaGuardado = localStorage.getItem("monai-theme") || "light";
    aplicarTema(temaGuardado);

    // Iniciar caso demo en landing
    seleccionarCasoDemoLanding(0);

    // Calcular primer lote en cotizador
    recalcularCotizacionEnVivo();

    // Cargar datos del mapa interactivo
    cargarDatosMapa();

    // Escuchar atajo de teclado para cerrar modales con ESC
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            cerrarModalLogin();
            cerrarModalReserva();
            cerrarCardMapa();
        }
    });
});
