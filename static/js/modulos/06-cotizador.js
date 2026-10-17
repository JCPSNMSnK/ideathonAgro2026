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
        setTxt("badge-lote-activo-paso2", `${c.lote_titulo} (${toneladas} tn)`);
        
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
