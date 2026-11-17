// Renderiza las fotos de perfil y una vista previa recortada en círculo.
// Uso: node marketing/instagram/fuente/render-perfil.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const dir = __dirname, out = path.resolve(dir, '..');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 2300, height: 1200 } });
  await p.goto('file://' + path.join(dir, 'perfil.html'), { waitUntil: 'networkidle' });
  for (const el of await p.$$('[data-shot]')) {
    await el.screenshot({ path: path.join(out, (await el.getAttribute('data-shot')) + '.png') });
  }
  const img = n => 'data:image/png;base64,' + fs.readFileSync(path.join(out, n + '.png')).toString('base64');
  const cell = (n, s) => `<img src="${img(n)}" style="width:${s}px;height:${s}px;border-radius:50%">`;
  await p.setViewportSize({ width: 1000, height: 380 });
  await p.setContent(`<body style="margin:0;background:#fff;display:flex;gap:30px;align-items:center;padding:30px">${cell('perfil-verde', 320)}${cell('perfil-verde', 110)}${cell('perfil-crema', 320)}${cell('perfil-crema', 110)}</body>`);
  await p.screenshot({ path: path.join(out, 'perfil-vista-previa.png') });
  await b.close();
})();
