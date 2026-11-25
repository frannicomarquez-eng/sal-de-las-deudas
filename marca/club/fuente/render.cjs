// Genera la tarjeta Club Brote (PDF a tamaño real + PNG frente y dorso).
// Uso: node marca/club/fuente/render.cjs
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const dir = __dirname, out = path.resolve(dir, '..');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 6 });
  await p.goto('file://' + path.join(dir, 'tarjeta-club.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: path.join(out, 'Tarjeta Club Brote - tamaño real.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  for (const el of await p.$$('[data-shot]')) {
    await el.evaluate(e => { e.style.outline = 'none'; });
    await el.screenshot({ path: path.join(out, (await el.getAttribute('data-shot')) + '.png'), omitBackground: true });
  }
  await b.close();
})();
