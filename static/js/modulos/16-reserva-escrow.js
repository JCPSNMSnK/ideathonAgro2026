/* =============================================================================
   7. RESERVA CON PAGO EN GARANTÍA (ESCROW) Y FIRMA EXCLUSIVA DEL COMPRADOR (CARRIL 4)
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
        cambiarActorDemoRol("comprador", partes[0]);
        recalcularCotizacionEnVivo();
    }
}

async function confirmarReservaConGarantia() {
    if (!usuarioActivo) {
        reservaPendiente = true;
        const notice = document.getElementById("login-modal-notice");
        if (notice) {
            notice.style.display = "block";
            notice.innerHTML = `
                <div class="login-notice-banner">
                    <strong>Identificate para resguardar tu reserva</strong>
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
    const compradorNombre =
        (document.getElementById("calc-comprador")?.value || "").trim() ||
        obtenerIdentidadRol("comprador") ||
        (usuarioActivo ? (usuarioActivo.organizacion || usuarioActivo.nombre) : "Comprador Agropecuario");
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
            operacionesCertificados.unshift(data.certificado);
            sincronizarPropiedadYListasPorRol();
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

async function firmarYCerrarCertificadoComprador(operacionId) {
    const opId = operacionId || (ultimoCertificadoEmitido ? ultimoCertificadoEmitido.id : null);
    const compradorActivo = obtenerIdentidadRol("comprador");

    try {
        const res = await fetch("/api/liberar-garantia/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                operacion_id: opId,
                actor_rol: "comprador",
                actor_organizacion: compradorActivo,
                actor_nombre: usuarioActivo ? usuarioActivo.nombre : compradorActivo,
            }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
            alert(data.mensaje || "Regla de Negocio: Solo el comprador titular puede firmar la recepción y liberar el Escrow.");
            return;
        }

        if (data.certificado) {
            const idx = operacionesCertificados.findIndex((item) => item.id === data.certificado.id);
            if (idx >= 0) {
                operacionesCertificados[idx] = data.certificado;
            } else {
                operacionesCertificados.unshift(data.certificado);
            }
            ultimoCertificadoEmitido = data.certificado;
            actualizarCertificadoEnPortalVendedor(data.certificado);
        } else if (opId) {
            const opLocal = operacionesCertificados.find((item) => item.id === opId);
            if (opLocal) {
                opLocal.esta_cerrado = true;
                opLocal.estado = "DESCARGA_CONFIRMADA_PAGO_LIBERADO";
                actualizarCertificadoEnPortalVendedor(opLocal);
            }
        }

        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        setTxt("voucher-estado-badge", "PAGO LIBERADO AL VENDEDOR Y FLETERO · DESCARGA CONFIRMADA");
        setTxt("voucher-banner-title", "✓ ¡Descarga en Campo Confirmada y Fondos Liberados!");
        setTxt(
            "voucher-banner-desc",
            "El pago retenido en garantía (Escrow ARS) fue transferido al establecimiento vendedor y al transportista de retorno. Remito Circular cerrado."
        );

        const vTotal = document.getElementById("voucher-total");
        if (vTotal) vTotal.textContent = vTotal.textContent.replace("(Custodia activa)", "(Pago Liberado ✓)");

        const btnVoucher = document.getElementById("btn-voucher-liberar");
        if (btnVoucher) {
            btnVoucher.disabled = true;
            btnVoucher.textContent = "✓ Recepción Firmada y Pago Liberado";
        }

        sincronizarPropiedadYListasPorRol();
        alert(data.mensaje);
    } catch (err) {
        alert("No se pudo firmar y liberar la garantía en este momento.");
    }
}

async function confirmarDescargaYLiberarEscrow() {
    const opId = ultimoCertificadoEmitido ? ultimoCertificadoEmitido.id : null;
    await firmarYCerrarCertificadoComprador(opId);
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
        btnVoucher.textContent = "Firmar Recepción en Tranquera y Liberar Pago";
    }

    setTxt("voucher-id", `#MN-RES-${String(cert.id).padStart(4, "0")}`);
    setTxt("voucher-subproducto", `${cert.subproducto} — ${cert.toneladas} tn (${cert.volumen_m3} m³)`);
    setTxt("voucher-vendedor", `${cert.vendedor} (${cert.origen})`);

    if (esVehiculoPropio) {
        const selVeh = document.getElementById("calc-tipo-vehiculo-propio");
        const nomVeh = selVeh ? selVeh.options[selVeh.selectedIndex]?.text.split("(")[0].trim() : "Particular";
        setTxt("voucher-camion", `Retiro Particular (${nomVeh}) · $0 Flete Tercerizado`);
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
    cambiarSubTabVendedor("certificados");
    setTimeout(() => {
        const card = document.getElementById("tarjeta-certificado-activo");
        if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 140);
}

function actualizarCertificadoEnPortalVendedor(cert) {
    if (!cert) return;
    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    const cerrado = Boolean(cert.esta_cerrado) || cert.estado === "DESCARGA_CONFIRMADA_PAGO_LIBERADO";

    setTxt("cert-id", `#MN-2026-${String(cert.id).padStart(4, "0")}`);
    setTxt("cert-vendedor", `${cert.vendedor} (${cert.origen})`);
    setTxt("cert-comprador", `${cert.comprador} (${cert.destino})`);
    setTxt("cert-subproducto", `${cert.subproducto} — ${cert.toneladas} tn (${cert.volumen_m3} m³)`);
    setTxt("cert-transportista", cert.transportista);
    setTxt("cert-ahorro", `${formatoARS(cert.ahorro_logistico_ars)} ARS`);
    setTxt(
        "cert-total",
        `${formatoARS(cert.total_comprador_ars)} ARS (${cerrado ? "Pago Liberado ✓" : "Custodia activa"})`
    );
    setTxt(
        "cert-estado-badge",
        cerrado
            ? "PAGO LIBERADO (ESCROW CERRADO) · FIRMADO POR COMPRADOR"
            : "OPERACIÓN EN CUSTODIA (ESCROW ACTIVO) · PENDIENTE FIRMA COMPRADOR"
    );
    setTxt("cert-hash", cert.hash_certificado);
    setTxt("cert-red", cert.red_blockchain || "Hedera Testnet (HCS)");
    const cLink = document.getElementById("cert-hashscan-link");
    if (cLink && cert.hashscan_url) cLink.href = cert.hashscan_url;

    const auditIcon = document.getElementById("cert-vendedor-audit-icon");
    const auditTitle = document.getElementById("cert-vendedor-audit-title");
    const auditDesc = document.getElementById("cert-vendedor-audit-desc");
    if (auditIcon && auditTitle && auditDesc) {
        if (cerrado) {
            auditIcon.textContent = "✓";
            auditTitle.textContent = "Certificado Firmado en Tranquera y Cerrado por el Comprador";
            auditDesc.innerHTML = `El comprador <strong>${cert.comprador}</strong> confirmó la descarga conforme y liberó los fondos de garantía. Certificado definitivo apto para auditoría ambiental.`;
        } else {
            auditIcon.textContent = "●";
            auditTitle.textContent = "Esperando Firma de Recepción del Comprador en Tranquera";
            auditDesc.innerHTML = `Por regla de negocio y seguridad del Escrow, únicamente el establecimiento comprador (<strong>${cert.comprador}</strong>) puede firmar la recepción y liberar los fondos.`;
        }
    }
}

function imprimirCertificadoOficial() {
    window.print();
}
