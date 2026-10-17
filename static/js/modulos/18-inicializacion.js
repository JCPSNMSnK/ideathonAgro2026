/* =============================================================================
   9. INICIALIZACIÓN AL CARGAR EL DOCUMENTO
   ============================================================================= */
document.addEventListener("DOMContentLoaded", () => {
    // Cargar certificados iniciales emitidos desde el backend
    cargarCertificadosIniciales();

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

    // Sincronizar reglas de propiedad, paginación y listas de certificados por rol
    sincronizarPropiedadYListasPorRol();
    if (ultimoCertificadoEmitido) {
        actualizarCertificadoEnPortalVendedor(ultimoCertificadoEmitido);
    }

    // Si viene ?rol= en la URL, abrir la vista correspondiente
    const params = new URLSearchParams(window.location.search);
    const rolParam = (params.get("rol") || "").toLowerCase();
    if (rolParam === "comprador") cambiarVistaRol("vista-comprador");
    if (rolParam === "vendedor") cambiarVistaRol("vista-vendedor");
    if (rolParam === "logistica") cambiarVistaRol("vista-logistica");

    // Escuchar atajo de teclado para cerrar modales con ESC
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            cerrarModalLogin();
            cerrarModalReserva();
            cerrarCardMapa();
        }
    });
});
