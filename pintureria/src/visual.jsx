// Elementos visuales: muestras de color (como una carta de colores) e íconos.

import { colorSucursal } from "./colores.js";

export function Muestra({ color, grande = false, titulo }) {
  return <span className={`muestra ${grande ? "grande" : ""} ${color === "transparent" ? "incoloro" : ""}`} style={{ "--m": color }} title={titulo} aria-hidden={titulo ? undefined : "true"} />;
}

export function MuestraSucursal({ nombre, grande }) {
  return <Muestra color={colorSucursal(nombre)} grande={grande} />;
}

// Abanico de tres muestras usado como logo.
export function Logo({ tam = 40 }) {
  return (
    <svg className="logo-svg" width={tam} height={tam} viewBox="0 0 48 48" aria-hidden="true">
      <g transform="rotate(-18 24 40)"><rect x="17" y="4" width="14" height="36" rx="3" fill="#E3A21A" /></g>
      <g transform="rotate(0 24 40)"><rect x="17" y="4" width="14" height="36" rx="3" fill="#D9483B" /></g>
      <g transform="rotate(18 24 40)"><rect x="17" y="4" width="14" height="36" rx="3" fill="#2F6FDE" /></g>
      <circle cx="24" cy="38" r="2.4" fill="var(--surface)" />
    </svg>
  );
}

const TRAZOS = {
  pendientes: "M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8",
  nuevo: "M12 5v14M5 12h14",
  saldos: "M12 4v16M6 20h12M5 8h14M5 8l-2.5 6h5zM19 8l-2.5 6h5z",
  historial: "M4 6h16M4 12h16M4 18h10",
  ajustes: "M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4",
  copiar: "M8 8h11v11H8zM5 16V5h11",
  descargar: "M12 4v11M7 10l5 5 5-5M5 20h14",
  flecha: "M5 12h14M13 6l6 6-6 6",
  alerta: "M12 4l9 16H3zM12 10v4M12 17v.5",
  vacio: "M6 4h12v16H6zM9 8h6M9 12h6",
};

export function Icono({ nombre, tam = 22 }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}
