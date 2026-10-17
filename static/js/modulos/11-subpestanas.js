/* =============================================================================
   6.4. ARQUITECTURA DE SUB-PESTAÑAS JERÁRQUICAS POR ROL (COMPRADOR, VENDEDOR, LOGÍSTICA)
   ============================================================================= */
function cambiarVentanaPrincipalComprador(ventana) {
    const esCompras = ventana === "compras";
    const btnNueva = document.getElementById("btn-ventana-comp-nueva");
    const btnCompras = document.getElementById("btn-ventana-comp-compras");
    const barraPasos = document.getElementById("barra-pasos-nueva-compra");

    if (btnNueva) {
        btnNueva.classList.toggle("active", !esCompras);
        btnNueva.setAttribute("aria-selected", !esCompras ? "true" : "false");
    }
    if (btnCompras) {
        btnCompras.classList.toggle("active", esCompras);
        btnCompras.setAttribute("aria-selected", esCompras ? "true" : "false");
    }
    if (barraPasos) {
        barraPasos.style.display = esCompras ? "none" : "";
    }

    if (esCompras) {
        cambiarSubTabComprador("compras");
    } else {
        const paso2Activo = document.getElementById("btn-subtab-comp-paso2")?.classList.contains("active");
        cambiarSubTabComprador(paso2Activo ? "paso2" : "paso1");
    }
}

function cambiarSubTabComprador(subtab) {
    const esCompras = subtab === "compras";
    const btnNueva = document.getElementById("btn-ventana-comp-nueva");
    const btnCompras = document.getElementById("btn-ventana-comp-compras");
    const barraPasos = document.getElementById("barra-pasos-nueva-compra");

    if (btnNueva) {
        btnNueva.classList.toggle("active", !esCompras);
        btnNueva.setAttribute("aria-selected", !esCompras ? "true" : "false");
    }
    if (btnCompras) {
        btnCompras.classList.toggle("active", esCompras);
        btnCompras.setAttribute("aria-selected", esCompras ? "true" : "false");
    }
    if (barraPasos) {
        barraPasos.style.display = esCompras ? "none" : "";
    }

    const tabs = ["paso1", "paso2", "compras"];
    tabs.forEach((t) => {
        const panel = document.getElementById(`subtab-comprador-${t}`);
        const btn = document.getElementById(`btn-subtab-comp-${t}`);
        if (panel) panel.classList.toggle("active", t === subtab);
        if (btn) btn.classList.toggle("active", t === subtab);
    });
    if (subtab === "paso1" && modoMercadoActual === "mapa" && leafletMapInstance) {
        setTimeout(() => leafletMapInstance.invalidateSize(), 80);
    }
    if (subtab === "compras") {
        renderizarComprasComprador();
    }
    const header = document.querySelector("#vista-comprador .comprador-main-windows-bar");
    if (header && subtab !== "paso1") {
        header.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}

function cambiarSubTabVendedor(subtab) {
    const tabs = ["lotes", "publicar", "certificados"];
    tabs.forEach((t) => {
        const panel = document.getElementById(`subtab-vendedor-${t}`);
        const btn = document.getElementById(`btn-subtab-vend-${t}`);
        if (panel) panel.classList.toggle("active", t === subtab);
        if (btn) btn.classList.toggle("active", t === subtab);
    });
    if (subtab === "certificados") {
        renderizarCertificadosVendedor();
    }
    const header = document.querySelector("#vista-vendedor .role-subtabs-nav");
    if (header) {
        header.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}

function cambiarSubTabLogistica(subtab) {
    const tabs = ["flota", "publicar", "viajes"];
    tabs.forEach((t) => {
        const panel = document.getElementById(`subtab-logistica-${t}`);
        const btn = document.getElementById(`btn-subtab-log-${t}`);
        if (panel) panel.classList.toggle("active", t === subtab);
        if (btn) btn.classList.toggle("active", t === subtab);
    });
    if (subtab === "viajes") {
        renderizarViajesLogistica();
    }
    const header = document.querySelector("#vista-logistica .role-subtabs-nav");
    if (header) {
        header.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}

function irANuevoLoteVendedor() {
    cancelarEdicionLote();
    cambiarSubTabVendedor("publicar");
}

function irANuevoCamionLogistica() {
    cancelarEdicionCamion();
    cambiarSubTabLogistica("publicar");
}

function irAMisComprasComprador() {
    cerrarModalReserva();
    cambiarVistaRol("vista-comprador");
    cambiarVentanaPrincipalComprador("compras");
}
