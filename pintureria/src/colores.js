// Colores de sucursales y tonos de pintura.

// Paleta de "cartas de color" para identificar cada sucursal.
const CARTA = ["#2F6FDE", "#D9483B", "#1F9D6B", "#E3A21A", "#7A4FD1", "#0F8FA6", "#C2487E", "#5C7A29", "#E0702A", "#3D4B8C", "#9C6B3F", "#2BA39A"];

export function colorSucursal(nombre = "") {
  let h = 0;
  for (const ch of nombre.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CARTA[h % CARTA.length];
}

// Colores de pintura comunes, para mostrar una muestra junto al tono cargado.
const TONOS = [
  ["blanco", "#F7F7F2"], ["negro", "#1C1C1C"], ["gris", "#8A8F96"], ["plata", "#C0C4C8"], ["aluminio", "#B9BDC1"],
  ["marfil", "#F2E8CF"], ["crema", "#F3E5C0"], ["beige", "#D9C7A3"], ["arena", "#D2BB8E"], ["habano", "#A9825A"],
  ["rojo", "#C8302C"], ["bermellón", "#D9452B"], ["bordo", "#6E1E2B"], ["naranja", "#E8772E"], ["amarillo", "#F2C12E"],
  ["verde", "#3E8E4E"], ["celeste", "#7CC0E8"], ["azul", "#2449A8"], ["turquesa", "#2BA39A"], ["violeta", "#7A4FD1"],
  ["rosa", "#E79BB4"], ["marrón", "#6B4428"], ["nogal", "#5A3A22"], ["roble", "#9A6B3E"], ["cedro", "#A4532F"],
  ["caoba", "#6A2E1F"], ["natural", "#D8B98A"], ["incoloro", "transparent"], ["transparente", "transparent"],
];

export function colorDeTono(texto = "") {
  const t = texto.toLowerCase();
  const hit = TONOS.find(([n]) => t.includes(n));
  return hit ? hit[1] : null;
}
