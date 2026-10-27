---
name: youtube
description: >-
  Skill de YouTube (youtube-agent-skill): guiones, hooks, títulos y miniaturas,
  SEO, capítulos, Shorts, edición desde transcripción, retención, comentarios,
  plan de publicaciones, auditoría de canal y qué está funcionando en el nicho.
  Usar SIEMPRE que el usuario mencione "youtube" o pida algo para un video o
  canal de YouTube.
---

# YouTube

Esta carpeta contiene las once skills de
[youtube-agent-skill](https://github.com/Jakeschincariol/youtube-agent-skill) (MIT).
Este archivo es solo el punto de entrada: elegí la sub-skill que corresponde al pedido,
leé su `SKILL.md` completo y seguilo. Respondé en el idioma del usuario.

| Pedido del usuario | Sub-skill |
| --- | --- |
| guion, hook, apertura, idea de video | `yt-script/SKILL.md` |
| título, miniatura, CTR | `yt-package/SKILL.md` |
| descripción, tags, SEO, que lo encuentren | `yt-seo/SKILL.md` |
| capítulos, timestamps | `yt-chapters/SKILL.md` |
| Shorts, clips, reutilizar un video largo | `yt-shorts/SKILL.md` |
| editar, cortar tiempos muertos, recortar | `yt-edit/SKILL.md` |
| retención, por qué dejan de mirar | `yt-retention/SKILL.md` |
| responder comentarios | `yt-comment/SKILL.md` |
| plan semanal/mensual, calendario | `yt-plan/SKILL.md` |
| auditar el canal, por qué no crece | `yt-audit/SKILL.md` |
| qué es viral / qué funciona en el nicho | `yt-viral/SKILL.md` |

Si el pedido no es claro, preguntá cuál de estas tareas quiere el usuario.

Las rutas de los scripts (`python3 hookscore.py`, `../yt-package/title.py`, etc.) son
relativas a la carpeta de cada sub-skill: ejecutalos desde esa carpeta o con su ruta completa
dentro de `.claude/skills/youtube/`.

El perfil de voz se lee de `~/.claude/youtube/voice.md` si existe; la plantilla está en
`templates/voice.md`.
