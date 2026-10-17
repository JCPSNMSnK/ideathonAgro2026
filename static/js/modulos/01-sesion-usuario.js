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
                <button type="button" class="chip-btn" style="padding:0.2rem 0.5rem; font-size:0.76rem;" onclick="editarPerfilGuardadoABM(${idx})">Editar</button>
                <button type="button" class="chip-btn" style="padding:0.2rem 0.5rem; font-size:0.76rem; color:var(--color-peligro);" onclick="eliminarPerfilGuardadoABM(${idx})">Borrar</button>
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

    if (inputComprador) inputComprador.value = "";
    if (inputDestino) inputDestino.value = "Goya, Corrientes";
    if (inputEmpresa) inputEmpresa.value = "Molino Arrocero San Lorenzo";
    if (inputLocalidad) inputLocalidad.value = "Saladas";
    if (inputTransportista) inputTransportista.value = "Transportes Don Horacio";

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

    const vendedorGated = document.getElementById("vendedor-gated-view");
    const vendedorPrivate = document.getElementById("vendedor-private-view");
    const logisticaGated = document.getElementById("logistica-gated-view");
    const logisticaPrivate = document.getElementById("logistica-private-view");

    const navBtnVendedor = document.getElementById("nav-btn-vendedor");
    const navBtnLogistica = document.getElementById("nav-btn-logistica");
    if (navBtnVendedor) {
        navBtnVendedor.classList.remove("nav-role-locked");
        navBtnVendedor.removeAttribute("title");
    }
    if (navBtnLogistica) {
        navBtnLogistica.classList.remove("nav-role-locked");
        navBtnLogistica.removeAttribute("title");
    }

    const rolMap = {
        comprador: "Comprador",
        vendedor: "Vendedor",
        logistica: "Logística",
    };

    const btnLogin = document.getElementById("nav-btn-login");

    if (!usuarioActivo) {
        if (btnLogin) btnLogin.classList.remove("is-logged-in");
        if (tabLabel) tabLabel.textContent = "Iniciar Sesión";
        if (sessionRolePill) {
            sessionRolePill.style.display = "none";
            sessionRolePill.textContent = "Ingresar";
        }
        if (btnLogout) btnLogout.style.display = "none";

        if (vendedorGated) vendedorGated.style.display = "block";
        if (vendedorPrivate) vendedorPrivate.style.display = "none";
        if (logisticaGated) logisticaGated.style.display = "block";
        if (logisticaPrivate) logisticaPrivate.style.display = "none";
        if (typeof sincronizarPropiedadYListasPorRol === "function") {
            sincronizarPropiedadYListasPorRol();
        }
        return;
    }

    const rolTexto = rolMap[usuarioActivo.rol] || "Usuario";
    const orgNombre = usuarioActivo.organizacion || usuarioActivo.nombre || "Mi Cuenta";
    if (btnLogin) btnLogin.classList.add("is-logged-in");
    if (tabLabel) {
        tabLabel.textContent = orgNombre;
    }
    if (sessionRolePill) {
        sessionRolePill.style.display = "inline-block";
        sessionRolePill.textContent = rolTexto;
    }
    if (btnLogout) {
        btnLogout.style.display = "inline-flex";
    }

    // Aislamiento estricto de vistas privadas por rol
    const esVendedor = usuarioActivo.rol === "vendedor";
    const esLogistica = usuarioActivo.rol === "logistica";

    if (vendedorGated) vendedorGated.style.display = esVendedor ? "none" : "block";
    if (vendedorPrivate) vendedorPrivate.style.display = esVendedor ? "block" : "none";
    if (logisticaGated) logisticaGated.style.display = esLogistica ? "none" : "block";
    if (logisticaPrivate) logisticaPrivate.style.display = esLogistica ? "block" : "none";

    // Indicador visual en navbar de rol restringido
    if (navBtnVendedor && usuarioActivo.rol !== "vendedor") {
        navBtnVendedor.classList.add("nav-role-locked");
        navBtnVendedor.title = `Sesión activa como ${rolTexto} (${orgNombre}). Requiere cuenta de Vendedor.`;
    }
    if (navBtnLogistica && usuarioActivo.rol !== "logistica") {
        navBtnLogistica.classList.add("nav-role-locked");
        navBtnLogistica.title = `Sesión activa como ${rolTexto} (${orgNombre}). Requiere cuenta de Logística.`;
    }

    const inputComprador = document.getElementById("calc-comprador");
    const inputDestino = document.getElementById("calc-destino");
    const inputEmpresa = document.getElementById("pub-empresa");
    const inputLocalidad = document.getElementById("pub-localidad");
    const inputTransportista = document.getElementById("cam-transportista");

    if (usuarioActivo.rol === "comprador") {
        if (inputComprador) inputComprador.value = orgNombre;
        if (inputDestino && !inputDestino.value) inputDestino.value = usuarioActivo.localidad || "Goya, Corrientes";
    } else if (usuarioActivo.rol === "vendedor") {
        if (inputEmpresa) inputEmpresa.value = orgNombre;
        if (inputLocalidad) inputLocalidad.value = (usuarioActivo.localidad || "Saladas").split(",")[0].trim();
    } else if (usuarioActivo.rol === "logistica") {
        if (inputTransportista) inputTransportista.value = orgNombre;
    }

    if (typeof sincronizarPropiedadYListasPorRol === "function") {
        sincronizarPropiedadYListasPorRol();
    }
}
