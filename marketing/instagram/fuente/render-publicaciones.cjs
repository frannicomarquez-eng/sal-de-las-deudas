// Renderiza cada pieza de publicaciones.html a PNG en marketing/instagram/publicaciones/
// Uso: node marketing/instagram/fuente/render-publicaciones.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const dir = __dirname;
  const out = path.resolve(dir, '..', 'publicaciones');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 1500 } });
  await p.goto('file://' + path.join(dir, 'publicaciones.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  for (const el of await p.$$('[data-shot]')) {
    const name = await el.getAttribute('data-shot');
    await el.screenshot({ path: path.join(out, name + '.png') });
    console.log(name);
  }
  await b.close();
})();
