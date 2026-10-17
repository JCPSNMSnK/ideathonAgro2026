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
