/* =============================================================================
   8. ABM DE EXCEDENTES (VENDEDOR) Y ABM DE CAMIONES DE RETORNO (LOGÍSTICA) CON PROPIEDAD
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
    const plantaActiva = obtenerIdentidadRol("vendedor");
    if (!esRecursoPropio(empresa, plantaActiva)) {
        alert(`Regla de Negocio: Tu planta activa es "${plantaActiva}". No podés modificar lotes pertenecientes a "${empresa}".`);
        return;
    }

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
    alternarCampoMutuoAcuerdo(modalidad);

    const badge = document.getElementById("pub-form-badge");
    const title = document.getElementById("pub-form-title");
    const btnSubmit = document.getElementById("pub-btn-submit");
    const btnCancel = document.getElementById("pub-btn-cancel-edit");

    if (badge) badge.textContent = `MODIFICACIÓN DE LOTE PROPIO #${id}`;
    if (title) title.textContent = `Editando: ${titulo}`;
    if (btnSubmit) btnSubmit.textContent = "Guardar Cambios del Lote en Planta";
    if (btnCancel) btnCancel.style.display = "inline-flex";

    actualizarPreviewCubicajePublicacion();
    cambiarSubTabVendedor("publicar");
}

function cancelarEdicionLote() {
    document.getElementById("pub-lote-edit-id").value = "";
    document.getElementById("pub-titulo").value = "";
    document.getElementById("pub-empresa").value = obtenerIdentidadRol("vendedor");

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
    const plantaActiva = obtenerIdentidadRol("vendedor");
    if (!confirm(`¿Confirmás dar de baja tu lote "${titulo}" del catálogo activo?`)) return;
    try {
        const res = await fetch(`/api/lote/${loteId}/eliminar/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                actor_rol: "vendedor",
                actor_organizacion: plantaActiva,
            }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
            alert(data.mensaje);
            window.location.href = "/?rol=vendedor";
        } else {
            alert(data.mensaje || "No tenés permisos para dar de baja este lote.");
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
    const porcentajeMutuo = document.getElementById("pub-porcentaje-vendedor")?.value || "50";
    const locRaw = (document.getElementById("pub-localidad")?.value || "Saladas").trim();
    const partesLoc = locRaw.split(",").map((s) => s.trim()).filter(Boolean);
    const localidadLimpia = partesLoc[0] || "Saladas";
    const provinciaSeleccionada =
        document.getElementById("pub-provincia")?.value || partesLoc[1] || "Corrientes";

    const plantaActiva = obtenerIdentidadRol("vendedor") || (usuarioActivo ? (usuarioActivo.organizacion || usuarioActivo.nombre) : "");
    const empresaNombre = (document.getElementById("pub-empresa")?.value || plantaActiva || "Molino Arrocero San Lorenzo").trim();

    const payload = {
        titulo: document.getElementById("pub-titulo").value,
        categoria: document.getElementById("pub-categoria").value,
        empresa_vendedora: empresaNombre,
        localidad_origen: localidadLimpia,
        provincia: provinciaSeleccionada,
        toneladas_disponibles: document.getElementById("pub-toneladas").value,
        densidad_kg_m3: document.getElementById("pub-densidad").value,
        precio_tonelada_ars: document.getElementById("pub-precio").value,
        modalidad_flete: document.getElementById("pub-modalidad").value,
        porcentaje_flete_vendedor: porcentajeMutuo,
        usos_recomendados: document.getElementById("pub-usos").value,
        tipo_publicacion: tipoLote,
        es_urgente: urgencia.startsWith("URGENTE"),
        permite_sublotes: true,
        sublote_min_tn: subloteMin,
        fecha_disponibilidad: fechaFutura,
        actor_rol: "vendedor",
        actor_organizacion: empresaNombre,
        actor_nombre: usuarioActivo ? usuarioActivo.nombre : empresaNombre,
    };

    const url = editId ? `/api/lote/${editId}/editar/` : "/api/publicar/";

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
            alert(data.mensaje || "Operación realizada exitosamente.");
            window.location.href = "/?rol=vendedor";
        } else {
            alert(data.mensaje || "No se pudo guardar el lote.");
        }
    } catch (err) {
        alert("Error al guardar el lote. Verificá los campos.");
    }
}

function cargarCamionEnFormularioEdicion(id, transportista, origen, destino, pasaPor, carroceria, fecha, capM3, descuento) {
    const empresaActiva = obtenerIdentidadRol("logistica");
    if (!esRecursoPropio(transportista, empresaActiva)) {
        alert(`Regla de Negocio: Tu empresa activa es "${empresaActiva}". No podés editar camiones pertenecientes a "${transportista}".`);
        return;
    }

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

    if (badge) badge.textContent = `MODIFICACIÓN DE UNIDAD PROPIA #${id}`;
    if (title) title.textContent = `Editando: ${transportista}`;
    if (btnSubmit) btnSubmit.textContent = "Guardar Cambios del Camión";
    if (btnCancel) btnCancel.style.display = "inline-flex";

    cambiarSubTabLogistica("publicar");
}

function cancelarEdicionCamion() {
    document.getElementById("cam-edit-id").value = "";
    document.getElementById("cam-transportista").value = obtenerIdentidadRol("logistica");
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
    const empresaActiva = obtenerIdentidadRol("logistica");
    if (!confirm(`¿Confirmás dar de baja tu unidad de "${transportista}" de la bolsa de retornos?`)) return;
    try {
        const res = await fetch(`/api/camion/${camionId}/eliminar/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                actor_rol: "logistica",
                actor_organizacion: empresaActiva,
            }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
            alert(data.mensaje);
            window.location.href = "/?rol=logistica";
        } else {
            alert(data.mensaje || "No tenés permisos para eliminar un camión de otra empresa.");
        }
    } catch (err) {
        alert("Error al dar de baja el camión.");
    }
}

async function enviarNuevoCamion(event) {
    event.preventDefault();
    const editId = document.getElementById("cam-edit-id")?.value;
    const empresaActiva = obtenerIdentidadRol("logistica") || (usuarioActivo ? (usuarioActivo.organizacion || usuarioActivo.nombre) : "");
    const transportistaNombre = (document.getElementById("cam-transportista")?.value || empresaActiva || "Transportes Don Horacio").trim();

    const payload = {
        transportista: transportistaNombre,
        origen_viaje: document.getElementById("cam-origen").value,
        destino_viaje: document.getElementById("cam-destino").value,
        pasa_por: document.getElementById("cam-pasa-por").value,
        tipo_carroceria: document.getElementById("cam-carroceria").value,
        fecha_disponible: document.getElementById("cam-fecha").value,
        capacidad_max_m3: document.getElementById("cam-cap-m3").value,
        descuento_retorno_pct: document.getElementById("cam-descuento").value,
        capacidad_max_tn: 30,
        actor_rol: "logistica",
        actor_organizacion: transportistaNombre,
        actor_nombre: usuarioActivo ? usuarioActivo.nombre : transportistaNombre,
    };

    const url = editId ? `/api/camion/${editId}/editar/` : "/api/publicar-camion/";

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
            alert(data.mensaje || "Camión actualizado exitosamente.");
            window.location.href = "/?rol=logistica";
        } else {
            alert(data.mensaje || "No se pudo actualizar el camión.");
        }
    } catch (err) {
        alert("Error al guardar el camión. Verificá los campos.");
    }
}
