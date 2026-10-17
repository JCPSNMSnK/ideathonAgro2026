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
    cambiarSubTabComprador("paso2");
}
