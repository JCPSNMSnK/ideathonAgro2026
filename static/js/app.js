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
   2. CASOS REALES DINÁMICOS PARA EL SIMULADOR DE LA LANDING (CONECTADO AL BACKEND)
   ============================================================================= */
const CASOS_DEMO_LANDING = [
    {
        clave: "arrocero",
        indice: 0,
        loteIndex: 0,
        ruta: "Saladas, Corrientes → Goya, Corrientes (135 km)",
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
        precioRojo: "$ 1.400.000",
        descRojo: "Tarifa Plena FADEEAC calculada sobre volumen aforado.",
        descuentoPct: "-45%",
        precioVerde: "$ 770.000",
        descVerde: "Camión que descargó en Corrientes y vuelve vacío hacia Goya por RN 12. Negocio rentable.",
        ahorro: "$ 630.000 ARS",
        distanciaKm: 135,
        toneladas: 15,
    },
    {
        clave: "forestal",
        indice: 1,
        loteIndex: 1,
        ruta: "Saladas, Corrientes → Mercedes, Corrientes (165 km)",
        actor: "Aserradero Río Paraná SRL · Destino: Cama Avícola y Pellets de Biomasa",
        modalidad: "Flete: 50% y 50% Compartido",
        densidad: "Densidad: 210 kg/m³",
        volumenM3: "66.7 m³",
        volumenPctTexto: "78% Volumen acoplado",
        volumenPctNum: 78,
        pesoTn: "14 tn",
        pesoPctTexto: "47% Capacidad",
        pesoPctNum: 47,
        explicacionTrampa:
            "El aserrín seco ocupa gran volumen con bajo peso. Al dividir 50/50 un camión de retorno, el aserradero libera su playa colapsada y el productor recibe insumo a mitad de costo.",
        precioRojo: "$ 1.300.000",
        descRojo: "Flete tradicional consume más del 75% del valor del aserrín en planta.",
        descuentoPct: "-48%",
        precioVerde: "$ 676.000",
        descVerde: "Semirremolque baranda volcable en retorno hacia Mercedes/Curuzú Cuatiá.",
        ahorro: "$ 624.000 ARS",
        distanciaKm: 165,
        toneladas: 14,
    },
    {
        clave: "citricola",
        indice: 2,
        loteIndex: 2,
        ruta: "Bella Vista, Corrientes → Goya, Corrientes (85 km)",
        actor: "Jugos del Litoral SA · Destino: Fibra y Energía para Feedlot Bovino",
        modalidad: "Flete: 100% Vendedor (Urgencia 48 hs)",
        densidad: "Densidad: 650 kg/m³",
        volumenM3: "36.9 m³",
        volumenPctTexto: "43% Volumen",
        volumenPctNum: 43,
        pesoTn: "24 tn",
        pesoPctTexto: "80% Capacidad Peso",
        pesoPctNum: 80,
        explicacionTrampa:
            "La cáscara húmeda de citrus fermenta en 48 hs generando multas ambientales. La juguera absorbe el Flete Calzado (-45%) porque le sale más barato que el pasivo ambiental.",
        precioRojo: "$ 950.000",
        descRojo: "Contratar batea estanca de urgencia a tarifa plena frena la evacuación diaria.",
        descuentoPct: "-45%",
        precioVerde: "$ 520.000",
        descVerde: "Flete absorbido por la citrícola con camión de retorno + Certificado Ambiental Hedera.",
        ahorro: "$ 430.000 ARS",
        distanciaKm: 85,
        toneladas: 24,
    },
];

function hidratarCasosDemoDesdeBackend() {
    try {
        const el = document.getElementById("datos-casos-demo-landing");
        if (!el || !el.textContent) return;
        const din = JSON.parse(el.textContent.trim());
        CASOS_DEMO_LANDING.forEach((c) => {
            const srv = din[c.clave];
            if (!srv) return;
            c.loteId = srv.loteId;
            if (srv.Route) c.ruta = srv.Route;
            if (srv.Rule) c.modalidad = `Flete: ${srv.Rule}`;
            if (srv.tradicional && srv.tradicional.flete) c.precioRojo = srv.tradicional.flete;
            if (srv.tradicional && srv.tradicional.fleteNote) c.descRojo = `${srv.tradicional.fleteNote} · ${srv.tradicional.verdict || ""}`;
            if (srv.subruta && srv.subruta.flete) c.precioVerde = srv.subruta.flete;
            if (srv.subruta && srv.subruta.fleteNote) c.descVerde = `${srv.subruta.fleteNote} · ${srv.subruta.verdict || ""}`;
            if (srv.Savings) c.ahorro = srv.Savings.split("(")[0].trim() + " ARS";
        });
    } catch (e) {
        console.warn("Usando valores iniciales de respaldo para casos demo:", e);
    }
}

let casoDemoActivo = CASOS_DEMO_LANDING[0];

function seleccionarCasoDemoLanding(index) {
    hidratarCasosDemoDesdeBackend();
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
    if (casoDemoActivo.loteId && selectLote) {
        selectLote.value = String(casoDemoActivo.loteId);
        seleccionarLote(casoDemoActivo.loteId, casoDemoActivo.toneladas, casoDemoActivo.distanciaKm);
    } else if (selectLote && selectLote.options[casoDemoActivo.loteIndex]) {
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
   6.2. MAPA FEDERAL INTERACTIVO REAL (LEAFLET.JS + API GEOREF IGN + OSRM ROUTING)
   ============================================================================= */
let datosMapaNEA = null;
let modoMercadoActual = "catalogo";
let regionMapaFiltro = "TODAS";
let leafletMapInstance = null;
let leafletMarkersLayer = null;
let leafletRouteLayer = null;
let georefDebounceTimer = null;
let ultimoProdSeleccionadoMapa = null;

const VISTAS_REGIONALES_ARGENTINA = {
    TODAS: { center: [-32.2, -62.5], zoom: 5 },
    NEA: { center: [-28.25, -58.4], zoom: 7 },
    PAMPEANA: { center: [-32.8, -61.8], zoom: 6 },
    CUYO: { center: [-33.2, -67.8], zoom: 7 },
    NOA: { center: [-26.2, -64.8], zoom: 6 },
    PATAGONIA: { center: [-39.0, -67.6], zoom: 7 },
};

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

function filtrarProdsPorRegion(prods, region) {
    if (!region || region === "TODAS") return prods;
    return prods.filter((p) => {
        if (p.region && p.region.toUpperCase() === region) return true;
        const prov = (p.provincia || "").toUpperCase();
        const loc = (p.localidad || "").toUpperCase();
        if (region === "NEA") {
            return prov.includes("CORRIENTES") || prov.includes("CHACO") || prov.includes("MISIONES") || prov.includes("FORMOSA") || prov.includes("ENTRE R");
        } else if (region === "PAMPEANA") {
            return prov.includes("SANTA FE") || prov.includes("CÓRDOBA") || prov.includes("CORDOBA") || prov.includes("BUENOS AIRES") || prov.includes("PAMPA");
        } else if (region === "CUYO") {
            return prov.includes("MENDOZA") || prov.includes("SAN LUIS") || prov.includes("SAN JUAN");
        } else if (region === "NOA") {
            return prov.includes("TUCUM") || prov.includes("SALTA") || prov.includes("JUJUY") || prov.includes("SANTIAGO") || prov.includes("CATAMARCA") || prov.includes("RIOJA");
        } else if (region === "PATAGONIA") {
            return prov.includes("RÍO NEGRO") || prov.includes("RIO NEGRO") || prov.includes("NEUQU") || prov.includes("CHUBUT") || prov.includes("SANTA CRUZ") || loc.includes("ROCA");
        }
        return true;
    });
}

function filtrarMapaPorRegion(region, btnEl) {
    regionMapaFiltro = region;
    document.querySelectorAll(".map-region-pill").forEach((btn) => btn.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");
    cerrarCardMapa();
    renderizarMapaProductores(true);
}

function cambiarModoMercado(modo) {
    modoMercadoActual = modo;
    const btnCatalogo = document.getElementById("btn-vista-catalogo");
    const btnMapa = document.getElementById("btn-vista-mapa");
    const seccionMapa = document.getElementById("seccion-mapa-productores");

    if (modo === "mapa") {
        if (btnCatalogo) btnCatalogo.classList.remove("active");
        if (btnMapa) btnMapa.classList.add("active");
        if (seccionMapa) seccionMapa.style.display = "block";
        setTimeout(() => {
            renderizarMapaProductores(false);
            if (leafletMapInstance) {
                leafletMapInstance.invalidateSize();
            }
        }, 60);
    } else {
        if (btnCatalogo) btnCatalogo.classList.add("active");
        if (btnMapa) btnMapa.classList.remove("active");
        if (seccionMapa) seccionMapa.style.display = "none";
    }
}

function inicializarInstanciaLeaflet() {
    const mapContainer = document.getElementById("leaflet-mapa-argentina");
    if (!mapContainer || typeof L === "undefined") return null;
    if (leafletMapInstance) return leafletMapInstance;

    const capaCartoVoyager = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://ign.gob.ar">IGN Argentina</a>',
            subdomains: "abcd",
            maxZoom: 18,
        }
    );

    const capaOpenStreetMap = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: '&copy; OpenStreetMap contributors · Rutas DNV Argentina',
            maxZoom: 18,
        }
    );

    const capaArgenmapIGN = L.tileLayer(
        "https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG%3A3857@png/{z}/{x}/{-y}.png",
        {
            attribution: '&copy; <a href="https://www.ign.gob.ar/">Instituto Geográfico Nacional (IGN)</a> — Argenmap Oficial',
            maxZoom: 18,
        }
    );

    leafletMapInstance = L.map(mapContainer, {
        center: [-30.5, -60.2],
        zoom: 5,
        layers: [capaCartoVoyager],
        scrollWheelZoom: true,
    });

    L.control
        .layers(
            {
                "Mapa Claro Vial (OSM / Carto)": capaCartoVoyager,
                "Argenmap Oficial (IGN Argentina)": capaArgenmapIGN,
                "OpenStreetMap Clásico": capaOpenStreetMap,
            },
            null,
            { position: "topright" }
        )
        .addTo(leafletMapInstance);

    leafletRouteLayer = L.layerGroup().addTo(leafletMapInstance);
    leafletMarkersLayer = L.layerGroup().addTo(leafletMapInstance);

    return leafletMapInstance;
}

function renderizarMapaProductores(forzarZoomRegion = false) {
    if (!datosMapaNEA) cargarDatosMapa();
    if (!datosMapaNEA) return;

    const comp = datosMapaNEA.comprador || {
        lat: -29.14,
        lng: -59.2626,
        nombre: "Goya, Corrientes",
    };

    const todosProds = datosMapaNEA.productores || [];
    const prodsVisibles = filtrarProdsPorRegion(todosProds, regionMapaFiltro);

    // Si Leaflet está disponible, usar el mapa interactivo real con ruteo OSRM
    const map = inicializarInstanciaLeaflet();
    if (map && leafletMarkersLayer && leafletRouteLayer) {
        leafletMarkersLayer.clearLayers();
        leafletRouteLayer.clearLayers();

        const boundsCoords = [[comp.lat, comp.lng]];

        // 1. Marcador del Establecimiento Comprador (Tu Campo)
        const iconoComprador = L.divIcon({
            className: "leaflet-custom-div-icon",
            html: `
                <div class="l-marker-pin l-marker-buyer" title="Tu Establecimiento: ${comp.nombre}">
                    <span class="l-marker-pulse"></span>
                    <span class="l-marker-core">🏡</span>
                    <span class="l-marker-label">${(comp.nombre || "Tu Campo").split(",")[0]}</span>
                </div>
            `,
            iconSize: [120, 42],
            iconAnchor: [60, 21],
        });

        const markerComp = L.marker([comp.lat, comp.lng], { icon: iconoComprador, zIndexOffset: 900 });
        markerComp.bindTooltip(
            `<strong>🏡 Tu Establecimiento Receptor</strong><br>${comp.nombre}<br><small>Centroide Oficial IGN: ${comp.lat}, ${comp.lng}</small>`,
            { direction: "top", offset: [0, -14] }
        );
        leafletMarkersLayer.addLayer(markerComp);

        // 2. Corredores de conexión y Marcadores de cada Productor / Lote
        prodsVisibles.forEach((prod) => {
            if (!prod.lat || !prod.lng) return;
            boundsCoords.push([prod.lat, prod.lng]);

            // Línea base de referencia hasta que el usuario haga clic y trace la ruta vial real OSRM
            const colorBase = prod.es_urgente ? "#dc2626" : prod.es_lote_futuro ? "#7c3aed" : "#15803d";
            const lineaRef = L.polyline(
                [
                    [prod.lat, prod.lng],
                    [comp.lat, comp.lng],
                ],
                {
                    color: colorBase,
                    weight: 2,
                    opacity: 0.35,
                    dashArray: "6, 8",
                }
            );
            leafletRouteLayer.addLayer(lineaRef);

            const tipoClase = prod.es_urgente
                ? "l-marker-urgent"
                : prod.es_lote_futuro
                ? "l-marker-future"
                : "l-marker-producer";
            const emoji = prod.es_urgente ? "⚡" : prod.es_lote_futuro ? "🌱" : "🏭";

            const iconoProd = L.divIcon({
                className: "leaflet-custom-div-icon",
                html: `
                    <div class="l-marker-pin ${tipoClase}">
                        ${prod.es_urgente ? '<span class="l-marker-pulse-red"></span>' : ""}
                        <span class="l-marker-core">${emoji}</span>
                        <span class="l-marker-label">${prod.localidad} · ${prod.toneladas} tn</span>
                    </div>
                `,
                iconSize: [140, 42],
                iconAnchor: [70, 21],
            });

            const mProd = L.marker([prod.lat, prod.lng], {
                icon: iconoProd,
                zIndexOffset: prod.es_urgente ? 700 : 500,
            });

            mProd.on("click", () => {
                seleccionarProductorEnMapaLeaflet(prod);
            });

            leafletMarkersLayer.addLayer(mProd);
        });

        // Ajustar encuadre del mapa según la región o los nodos visibles
        if (forzarZoomRegion && VISTAS_REGIONALES_ARGENTINA[regionMapaFiltro]) {
            const v = VISTAS_REGIONALES_ARGENTINA[regionMapaFiltro];
            map.flyTo(v.center, v.zoom, { duration: 0.65 });
        } else if (boundsCoords.length > 1) {
            map.fitBounds(boundsCoords, { padding: [45, 45], maxZoom: 8 });
        }

        // Si hay al menos un productor visible, trazar la ruta vial real OSRM del primero o del activo
        const prodInicial = ultimoProdSeleccionadoMapa && prodsVisibles.some((p) => p.id === ultimoProdSeleccionadoMapa.id)
            ? ultimoProdSeleccionadoMapa
            : prodsVisibles[0];
        if (prodInicial) {
            trazarRutaVialOSRM(prodInicial, comp, false);
        }
        return;
    }
}

async function trazarRutaVialOSRM(prod, comp, abrirFicha = true) {
    if (!prod || !comp) return;
    ultimoProdSeleccionadoMapa = prod;

    const summaryEl = document.getElementById("map-osrm-route-summary");
    if (summaryEl) {
        summaryEl.textContent = `Calculando ruta vial real por carreteras nacionales (${prod.localidad} → ${comp.nombre})...`;
    }

    try {
        const params = new URLSearchParams({
            origen: `${prod.localidad}, ${prod.provincia}`,
            origen_lat: prod.lat,
            origen_lng: prod.lng,
            destino: comp.nombre,
            destino_lat: comp.lat,
            destino_lng: comp.lng,
        });
        const res = await fetch(`/api/georef/ruta/?${params.toString()}`);
        const data = await res.json();
        if (data.ok && data.ruta) {
            const r = data.ruta;
            prod.distancia_km = r.distancia_km || prod.distancia_km;
            prod.duracion_formateada = r.duracion_formateada || "";
            prod.resumen_rutas = r.resumen_rutas || prod.ruta;

            if (summaryEl) {
                summaryEl.innerHTML = `🛣️ <strong>${prod.localidad} → ${comp.nombre}:</strong> ${r.distancia_km} km viales reales (${r.duracion_formateada}) vía <strong>${r.resumen_rutas}</strong>`;
            }

            if (leafletMapInstance && leafletRouteLayer && Array.isArray(r.coordenadas_ruta) && r.coordenadas_ruta.length > 1) {
                // Limpiar polilínea activa previa y dibujar la ruta real OSRM
                leafletRouteLayer.eachLayer((layer) => {
                    if (layer.options && layer.options.className === "osrm-active-route-line") {
                        leafletRouteLayer.removeLayer(layer);
                    }
                });

                const colorRuta = prod.es_urgente ? "#dc2626" : "#15803d";
                const polyActiva = L.polyline(r.coordenadas_ruta, {
                    color: colorRuta,
                    weight: 5,
                    opacity: 0.9,
                    className: "osrm-active-route-line",
                });
                leafletRouteLayer.addLayer(polyActiva);
            }
        }
    } catch (e) {
        console.warn("Error consultando ruta vial OSRM:", e);
    }

    if (abrirFicha) {
        mostrarCardEnMapa(prod);
    }
}

function seleccionarProductorEnMapaLeaflet(prod) {
    const comp = (datosMapaNEA && datosMapaNEA.comprador) || {
        lat: -29.14,
        lng: -59.2626,
        nombre: "Goya, Corrientes",
    };
    mostrarCardEnMapa(prod);
    trazarRutaVialOSRM(prod, comp, true);
}

function mostrarCardEnMapa(prod) {
    const card = document.getElementById("map-producer-card");
    const content = document.getElementById("map-card-content");
    if (!card || !content) return;

    let etiquetaBadge = "";
    if (prod.es_urgente) {
        etiquetaBadge = `<span class="badge-urgente-pulse"><span class="pulse-dot"></span> ${prod.etiqueta_urgencia || "VENTA INMEDIATA 48 HS"}</span>`;
    } else if (prod.es_lote_futuro) {
        etiquetaBadge = `<span class="badge-lote-futuro">📅 Lote Futuro (${prod.fecha_entrega_futura || "Zafra"})</span>`;
    }

    const duracionTexto = prod.duracion_formateada ? ` · ⏱️ ${prod.duracion_formateada}` : "";

    content.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; margin-bottom:0.4rem;">
            <span class="badge-cat badge-cat-${(prod.categoria || "arroz").toLowerCase()}">${prod.categoria}</span>
            ${etiquetaBadge}
        </div>
        <h4 style="font-size:1.05rem; font-family:var(--fuente-display); margin-bottom:0.25rem; color:var(--texto-principal);">${prod.titulo}</h4>
        <div style="font-size:0.80rem; color:var(--texto-secundario); margin-bottom:0.6rem;">
            📍 <strong>${prod.empresa}</strong> · ${prod.localidad}, ${prod.provincia} (${prod.resumen_rutas || prod.ruta || "RN"})
        </div>
        <div class="map-card-metrics">
            <div><span>Disponible:</span><strong>${prod.toneladas} tn (${prod.volumen_m3} m³)</strong></div>
            <div><span>Ruta Vial OSRM:</span><strong>${prod.distancia_km} km${duracionTexto}</strong></div>
            <div><span>Precio:</span><strong>$${Number(prod.precio_tn).toLocaleString("es-AR")}/tn</strong></div>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:0.45rem; margin-top:0.75rem;">
            <button type="button" class="btn-primary" style="padding:0.45rem 0.85rem; font-size:0.80rem; min-height:34px; flex:1;"
                    onclick="comprarSubloteDesdeMapa('${prod.id}', '${prod.sublote_min_tn || 5}', '${prod.distancia_km}')">
                Sublote (${prod.sublote_min_tn || 5} tn) →
            </button>
            <button type="button" class="chip-btn" style="padding:0.45rem 0.7rem; font-size:0.80rem;"
                    onclick="comprarSubloteDesdeMapa('${prod.id}', '1', '${prod.distancia_km}')">
                🛻 Retiro 1 tn
            </button>
            <button type="button" class="chip-btn" style="padding:0.45rem 0.7rem; font-size:0.80rem;"
                    onclick="comprarSubloteDesdeMapa('${prod.id}', '${prod.toneladas}', '${prod.distancia_km}')">
                Lote Entero
            </button>
        </div>
    `;

    card.style.display = "block";
    card.style.right = "18px";
    card.style.bottom = "18px";
    card.style.left = "auto";
    card.style.top = "auto";
}

function comprarSubloteDesdeMapa(loteId, toneladas, distanciaKm) {
    cerrarCardMapa();
    comprarSubloteDirecto(loteId, toneladas, distanciaKm);
}

function cerrarCardMapa() {
    const card = document.getElementById("map-producer-card");
    if (card) card.style.display = "none";
}

/* =============================================================================
   6.2.1. AUTOCOMPLETADO OFICIAL EN VIVO (API GEOREF DATOS ARGENTINA + OSRM)
   ============================================================================= */
function autocompletarLocalidadGeoref(texto, provinciaOpcional) {
    const q = (texto || "").trim();
    if (q.length < 2) return;

    if (georefDebounceTimer) clearTimeout(georefDebounceTimer);
    georefDebounceTimer = setTimeout(async () => {
        try {
            const params = new URLSearchParams({ q: q, max: "12" });
            if (provinciaOpcional) params.set("provincia", provinciaOpcional);

            const res = await fetch(`/api/georef/localidades/?${params.toString()}`);
            const data = await res.json();
            if (!data.ok || !Array.isArray(data.localidades)) return;

            const datalist = document.getElementById("datalist-localidades-argentina");
            if (!datalist) return;

            datalist.innerHTML = "";
            data.localidades.forEach((loc) => {
                const opt = document.createElement("option");
                opt.value = loc.etiqueta || `${loc.nombre}, ${loc.provincia}`;
                opt.label = `${loc.zona || loc.provincia} · IGN (${loc.lat}, ${loc.lng})`;
                datalist.appendChild(opt);
            });
        } catch (err) {
            console.warn("Autocompletado Georef no disponible temporalmente:", err);
        }
    }, 220);
}

async function actualizarRutaRealDesdeDestino(destinoTexto) {
    const destino = (destinoTexto || "").trim();
    if (destino.length < 3) return;

    if (!datosMapaNEA) cargarDatosMapa();
    const selectLote = document.getElementById("calc-lote-id");
    const loteId = selectLote ? parseInt(selectLote.value, 10) : null;
    const prodActivo =
        (datosMapaNEA &&
            datosMapaNEA.productores &&
            datosMapaNEA.productores.find((p) => p.id === loteId)) ||
        (datosMapaNEA && datosMapaNEA.productores ? datosMapaNEA.productores[0] : null);

    try {
        const params = new URLSearchParams({
            origen: prodActivo ? `${prodActivo.localidad}, ${prodActivo.provincia}` : "Saladas, Corrientes",
            destino: destino,
        });
        if (prodActivo && prodActivo.lat && prodActivo.lng) {
            params.set("origen_lat", prodActivo.lat);
            params.set("origen_lng", prodActivo.lng);
        }

        const res = await fetch(`/api/georef/ruta/?${params.toString()}`);
        const data = await res.json();
        if (data.ok && data.ruta && data.destino) {
            const inputKm = document.getElementById("calc-distancia-km");
            if (inputKm && data.ruta.distancia_km) {
                inputKm.value = data.ruta.distancia_km;
            }

            if (datosMapaNEA) {
                datosMapaNEA.comprador = {
                    codigo: destino.toUpperCase(),
                    nombre: `${data.destino.nombre}${data.destino.provincia ? ", " + data.destino.provincia : ""}`,
                    lat: data.destino.lat,
                    lng: data.destino.lng,
                    ruta: data.destino.ruta || data.ruta.resumen_rutas,
                    zona: data.destino.zona || "",
                };
            }

            recalcularCotizacionEnVivo();
            if (modoMercadoActual === "mapa") {
                renderizarMapaProductores(false);
            }
        }
    } catch (e) {
        console.warn("No se pudo actualizar ruta real desde destino:", e);
    }
}

function fijarDestinoCompradorDesdeMapa() {
    const inputMapa = document.getElementById("mapa-georef-input");
    const valor = (inputMapa ? inputMapa.value : "").trim();
    if (!valor) return;

    const inputDestino = document.getElementById("calc-destino");
    if (inputDestino) inputDestino.value = valor;

    actualizarRutaRealDesdeDestino(valor);
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
    const locRaw = (document.getElementById("pub-localidad")?.value || "Saladas").trim();
    const partesLoc = locRaw.split(",").map((s) => s.trim()).filter(Boolean);
    const localidadLimpia = partesLoc[0] || "Saladas";
    const provinciaSeleccionada =
        document.getElementById("pub-provincia")?.value || partesLoc[1] || "Corrientes";

    const payload = {
        titulo: document.getElementById("pub-titulo").value,
        categoria: document.getElementById("pub-categoria").value,
        empresa_vendedora: document.getElementById("pub-empresa").value,
        localidad_origen: localidadLimpia,
        provincia: provinciaSeleccionada,
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
