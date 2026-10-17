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
