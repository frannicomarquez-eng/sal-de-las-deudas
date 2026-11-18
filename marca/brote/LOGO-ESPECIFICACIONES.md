# Logo Brote: especificaciones fijas

Este es el logo elegido (concepto B, "clásico apilado"). Todo lo que use el logo tiene que salir de los archivos de `svg/` o `png/`, nunca reescribiendo "Brote" con una fuente.

| Elemento | Valor |
|---|---|
| Palabra | "Brote", Fraunces Light (peso 300), tamaño óptico 144, espaciado −0,027 em |
| Símbolo | Brote de dos hojas en línea, trazo fino, centrado arriba de la palabra |
| Proporción | Símbolo 72 · espacio 18 · palabra 136 · espacio 18 · bajada 13 (unidades relativas) |
| Bajada | "CRECE CON VOS" (antes "ROPA DE BEBÉ", cambiada al ampliar a 0–8 años), Inter Regular, espaciado 0,36 em, con una línea de 40 a cada lado |
| Verde principal | #2F4A3A |
| Bajada y líneas | Texto #5C6B60, líneas #8FAE8B |
| Fondo crema | #F6F2EA |

El texto está convertido a curvas en los SVG: imprenta, bordado y etiquetas no necesitan tener la fuente instalada.

## Logo aprobado

Aprobado como definitivo. Para regenerar los archivos exactamente iguales:

    python3 marca/brote/fuente/make_logo.py marca/brote/fuente marca/brote/svg

Requiere `pip install fonttools uharfbuzz`. Las fuentes de `fuente/` son de licencia libre (SIL Open Font License).
