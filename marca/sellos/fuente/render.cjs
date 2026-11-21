// Genera el PDF de sellos a tamaño real, PNG de alta resolución de cada sello y una prueba sobre bolsa kraft.
// Uso: node marca/sellos/fuente/render.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const dir = __dirname, out = path.resolve(dir, '..');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 12 });
  await p.goto('file://' + path.join(dir, 'sellos.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: path.join(out, 'Sellos Brote - tamaño real.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  for (const el of await p.$$('[data-shot]')) {
    await el.screenshot({ path: path.join(out, (await el.getAttribute('data-shot')) + '.png'), omitBackground: true });
  }
  // Prueba sobre bolsa
  const img = n => 'data:image/png;base64,' + fs.readFileSync(path.join(out, n + '.png')).toString('base64');
  const p2 = await b.newPage({ viewport: { width: 1200, height: 700 } });
  const bag = (bg, ink, label) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:14px;font:15px sans-serif;color:#444">
    <div style="width:340px;height:440px;background:${bg};border-radius:6px 6px 12px 12px;position:relative;box-shadow:0 20px 40px -20px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center">
      <div style="position:absolute;top:-70px;left:90px;width:160px;height:90px;border:10px solid ${bg};border-bottom:0;border-radius:80px 80px 0 0;filter:brightness(.9)"></div>
      <div style="width:200px;height:200px;background:${ink};-webkit-mask:url(${img('sello-redondo-50mm')}) center/contain no-repeat;mask:url(${img('sello-redondo-50mm')}) center/contain no-repeat;opacity:.88"></div>
    </div>${label}</div>`;
  await p2.setContent(`<body style="margin:0;padding:100px 40px 30px;background:#F6F2EA;display:flex;gap:30px">
    ${bag('#C9A77C', '#2F4A3A', 'Bolsa kraft · tinta verde')}${bag('#FFFFFF', '#2F4A3A', 'Bolsa blanca · tinta verde')}${bag('#C9A77C', '#1A1A1A', 'Bolsa kraft · tinta negra')}</body>`);
  await p2.screenshot({ path: path.join(out, 'prueba-en-bolsa.png') });
  await b.close();
})();
