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

function abrirModalLogin() {
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
    // Si cancela sin loguearse, resetear alerta de reserva pendiente
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

    usuarioActivo = {
        rol,
        nombre,
        organizacion: nombre,
        localidad,
    };
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
    const label = document.getElementById("session-user-label");
    const pill = document.getElementById("session-role-pill");
    const tabLabel = document.getElementById("nav-login-tab-label");
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
        if (label) label.textContent = "Iniciar Sesión";
        if (pill) pill.textContent = "Ingresar";
        if (tabLabel) tabLabel.textContent = "Iniciar Sesión";
        if (btnLogout) btnLogout.style.display = "none";

        // Gating para usuarios no identificados: mostrar tarjetas de bienvenida/bloqueo
        if (vendedorGated) vendedorGated.style.display = "block";
        if (vendedorPrivate) vendedorPrivate.style.display = "none";
        if (logisticaGated) logisticaGated.style.display = "block";
        if (logisticaPrivate) logisticaPrivate.style.display = "none";
        return;
    }

    // Usuario con sesión iniciada
    if (label) {
        label.textContent = usuarioActivo.nombre || "Mi Cuenta";
    }
    if (pill) {
        pill.textContent = rolMap[usuarioActivo.rol] || "Usuario";
    }
    if (tabLabel) {
        tabLabel.textContent = `Mi Perfil (${rolMap[usuarioActivo.rol] || "Usuario"})`;
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
async function recalcularCotizacionEnVivo() {
    const loteId = document.getElementById("calc-lote-id")?.value;
    const camionId = document.getElementById("calc-camion-id")?.value;
    const distanciaKm = document.getElementById("calc-distancia-km")?.value || 160;
    const toneladas = document.getElementById("calc-toneladas")?.value || 14;

    if (!loteId) return;

    const params = new URLSearchParams({
        lote_id: loteId,
        camion_id: camionId,
        distancia_km: distanciaKm,
        toneladas: toneladas,
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
        setTxt("res-origen", `${c.vendedor} (${c.localidad_origen})`);
        setTxt("res-volumen-m3", `${c.volumen_m3} m³`);
        setTxt("res-limitante", c.factor_limitante.toUpperCase());
        setTxt("pct-vol-label", `${c.porcentaje_volumen_camion}%`);
        setTxt("pct-peso-label", `${c.porcentaje_peso_camion}%`);

        const barVol = document.getElementById("bar-volumen");
        const barPeso = document.getElementById("bar-peso");
        if (barVol) barVol.style.width = `${Math.min(100, c.porcentaje_volumen_camion)}%`;
        if (barPeso) barPeso.style.width = `${Math.min(100, c.porcentaje_peso_camion)}%`;

        setTxt("res-flete-tradicional", formatoARS(c.flete_tradicional_fadeeac_ars));
        setTxt("res-incidencia-pct", `${c.incidencia_flete_tradicional_pct}% del total`);
        setTxt("res-flete-calzado", formatoARS(c.flete_calzado_ars));
        setTxt("res-descuento-pct", `-${c.descuento_aplicado_pct}% por Retorno`);
        setTxt("res-ahorro", `${formatoARS(c.ahorro_logistico_ars)} ARS`);

        setTxt("res-subtotal-prod", formatoARS(c.subtotal_subproducto_ars));
        setTxt("res-modalidad", c.modalidad_flete);
        setTxt("res-comision", formatoARS(c.comision_total_plataforma_ars));
        setTxt("res-total-comprador", formatoARS(c.total_comprador_subruta_ars));
    } catch (err) {
        console.error("Error en cotización en vivo:", err);
    }
}

/* =============================================================================
   7. RESERVA CON PAGO EN GARANTÍA (ESCROW) Y VOUCHER DEL COMPRADOR (CARRIL 4)
   ============================================================================= */
let ultimoCertificadoEmitido = null;

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
    const compradorNombre = document.getElementById("calc-comprador")?.value || (usuarioActivo ? (usuarioActivo.organizacion || usuarioActivo.nombre) : "Granja Avícola San Isidro SRL");
    const destino = document.getElementById("calc-destino")?.value || (usuarioActivo ? usuarioActivo.localidad : "Goya, Corrientes");

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
                localidad_destino: destino,
            }),
        });
        const data = await res.json();
        if (data.ok) {
            ultimoCertificadoEmitido = data.certificado;
            actualizarCertificadoEnPortalVendedor(data.certificado);
            mostrarModalVoucherReserva(data.certificado);
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

function mostrarModalVoucherReserva(cert) {
    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setTxt("voucher-id", `#MN-RES-${String(cert.id).padStart(4, "0")}`);
    setTxt("voucher-subproducto", `${cert.subproducto} — ${cert.toneladas} tn (${cert.volumen_m3} m³)`);
    setTxt("voucher-vendedor", `${cert.vendedor} (${cert.origen})`);
    setTxt("voucher-camion", cert.transportista);
    setTxt("voucher-ahorro", `${formatoARS(cert.ahorro_logistico_ars)} ARS`);
    setTxt("voucher-total", `${formatoARS(cert.total_comprador_ars)} ARS (Custodia activa)`);
    setTxt("voucher-hash", cert.hash_certificado);

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
    setTxt("cert-total", `${formatoARS(cert.total_comprador_ars)} ARS`);
    setTxt("cert-hash", cert.hash_certificado);
    setTxt("cert-red", cert.red_blockchain);
}

function imprimirCertificadoOficial() {
    window.print();
}

/* =============================================================================
   8. PUBLICACIÓN DE EXCEDENTE (VENDEDOR) Y ALTA DE CAMIÓN (LOGÍSTICA)
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

async function enviarNuevoLote(event) {
    event.preventDefault();
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
    };

    try {
        const res = await fetch("/api/publicar/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.ok) {
            alert(data.mensaje || "Lote publicado exitosamente.");
            window.location.href = "/?rol=comprador";
        }
    } catch (err) {
        alert("Error al publicar el lote. Verificá los campos.");
    }
}

async function enviarNuevoCamion(event) {
    event.preventDefault();
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

    try {
        const res = await fetch("/api/publicar-camion/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.ok) {
            alert(data.mensaje || "Camión de retorno registrado exitosamente.");
            window.location.href = "/?rol=logistica";
        }
    } catch (err) {
        alert("Error al registrar el camión. Verificá los campos.");
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

    // Escuchar atajo de teclado para cerrar modales con ESC
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            cerrarModalLogin();
            cerrarModalReserva();
        }
    });
});
