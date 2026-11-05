# Préstamos entre sucursales (pinturería)

App web (funciona en el celular) para registrar los productos que una sucursal le presta a otra y controlar que se devuelvan.

## Qué hace

- **Nuevo**: registrar un préstamo, ya sea "prestamos a otra sucursal" o "nos prestaron". Cada préstamo puede tener varios productos, con código, color/tono, cantidad y unidad (lata 1/4/10/20 L, litro, kg, etc.), quién entregó y quién retiró. Los nombres de productos que ya cargaste se autocompletan.
- **Pendientes**: lo que salió de tu sucursal y todavía no volvió, y lo que te prestaron y tenés que devolver. Los préstamos con **7 días o más** se marcan en rojo.
- **Registrar devolución**: total o parcial, por producto, indicando cómo se devolvió (mercadería, factura/pago u otro). Cada movimiento queda en el historial del préstamo con fecha y usuario.
- **WhatsApp**: comparte el detalle del préstamo para avisar a la otra sucursal.
- **Saldos**: para cada sucursal, lo que nos deben y lo que les debemos, sumado por producto.
- **Historial**: búsqueda por producto, código o sucursal, filtro por estado y exportación a Excel (CSV).
- **Ajustes**: la sucursal y el nombre de este dispositivo, y la lista de sucursales (compartida por todos).

## Cómo correrla

```bash
cd pintureria
npm install
npm run dev        # con Firebase (los datos se comparten entre sucursales)
npm run dev:local  # modo prueba: los datos quedan solo en este navegador
npm run build      # genera la carpeta dist/ para publicar
```

## Datos (Firebase)

Usa el mismo proyecto Firebase que "Sal de las Deudas", con colecciones separadas:

- `pint_prestamos`: un documento por préstamo
- `pint_config/general`: la lista de sucursales

Para que funcione, en Firestore → Reglas tienen que estar permitidas estas colecciones para los usuarios logueados, por ejemplo:

```
match /pint_prestamos/{id} {
  allow read, write: if request.auth != null;
}
match /pint_config/{id} {
  allow read, write: if request.auth != null;
}
```
