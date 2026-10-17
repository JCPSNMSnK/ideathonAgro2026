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
    if (usuarioActivo) {
        if (panelId === "vista-vendedor" && usuarioActivo.rol !== "vendedor") {
            const org = usuarioActivo.organizacion || usuarioActivo.nombre || "tu cuenta";
            alert(`Acceso no permitido: Estás autenticado como ${usuarioActivo.rol.toUpperCase()} (${org}). Para gestionar lotes como Vendedor debés iniciar sesión con una cuenta de Agroindustria.`);
            abrirModalLogin();
            return;
        }
        if (panelId === "vista-logistica" && usuarioActivo.rol !== "logistica") {
            const org = usuarioActivo.organizacion || usuarioActivo.nombre || "tu cuenta";
            alert(`Acceso no permitido: Estás autenticado como ${usuarioActivo.rol.toUpperCase()} (${org}). Para publicar camiones y ver liquidaciones de Logística debés iniciar sesión con una cuenta de Transportista.`);
            abrirModalLogin();
            return;
        }
    }

    if (document.startViewTransition) {
        document.startViewTransition(() => ejecutarCambioVista(panelId));
    } else {
        ejecutarCambioVista(panelId);
    }
}
