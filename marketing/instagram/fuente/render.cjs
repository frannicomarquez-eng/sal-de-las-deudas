// Renderiza cada pieza de plantillas.html a PNG en marketing/instagram/
// Uso: node marketing/instagram/fuente/render.cjs
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const dir = path.resolve(__dirname);
  const out = path.resolve(dir, '..');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 2000 } });
  await p.goto('file://' + path.join(dir, 'plantillas.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  for (const el of await p.$$('[data-shot]')) {
    const name = await el.getAttribute('data-shot');
    await el.screenshot({ path: path.join(out, name + '.png') });
    console.log(name);
  }
  await b.close();
})();
