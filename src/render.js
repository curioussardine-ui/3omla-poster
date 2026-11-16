import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { RATES } from './config.js';
import { assertWesternDigits, formatValue } from './format.js';

const asset = (p) => fileURLToPath(new URL(`../assets/${p}`, import.meta.url));
const b64 = async (p) => (await readFile(asset(p))).toString('base64');

const WIDTH = 1080;
const HEIGHT = 1350;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// SVG triangles instead of ▲/▼ characters, so they never depend on a font.
const ARROW = {
  up: '<svg viewBox="0 0 24 24" width="40" height="40" aria-label="up"><path d="M12 4 22 19H2z" fill="#15110C"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="40" height="40" aria-label="down"><path d="M12 20 2 5h20z" fill="#15110C"/></svg>',
};

export async function buildHtml(rates, dirs, { date, time }) {
  const [kufi, tajM, tajB, logo] = await Promise.all([
    b64('fonts/NotoKufiArabic_700Bold.ttf'),
    b64('fonts/Tajawal_500Medium.ttf'),
    b64('fonts/Tajawal_700Bold.ttf'),
    b64('logo.png'),
  ]);

  const rows = RATES.map(({ code, label, perGram }) => {
    const arrow = dirs[code] ? ARROW[dirs[code]] : '';
    return `
      <div class="row">
        <div class="label">${esc(label)}${perGram ? '<span class="sub">للغرام</span>' : ''}</div>
        <div class="price">
          <span class="arrow">${arrow}</span>
          <span class="num" dir="ltr">${esc(formatValue(rates[code].value))}</span>
          <span class="unit">دينار</span>
        </div>
      </div>`;
  }).join('');

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<style>
  @font-face { font-family: Kufi; font-weight: 700; src: url(data:font/ttf;base64,${kufi}) format('truetype'); }
  @font-face { font-family: Tajawal; font-weight: 500; src: url(data:font/ttf;base64,${tajM}) format('truetype'); }
  @font-face { font-family: Tajawal; font-weight: 700; src: url(data:font/ttf;base64,${tajB}) format('truetype'); }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; }
  body {
    background: radial-gradient(ellipse 70% 55% at 50% 48%, #EBC57E 0%, #DDA94B 70%);
    color: #15110C;
    font-family: Tajawal, sans-serif;
    display: flex; flex-direction: column; align-items: center;
    padding: 84px 80px 64px;
  }
  .logo { height: 150px; }
  h1 { font-family: Kufi; font-weight: 700; font-size: 66px; line-height: 1.5; margin-top: 34px; }
  .when { font-weight: 500; font-size: 36px; margin-top: 6px; display: flex; gap: 22px; align-items: center; }
  .when .dot { width: 9px; height: 9px; border-radius: 50%; background: #15110C; }
  .rows { width: 100%; margin-top: 56px; display: flex; flex-direction: column; gap: 22px; }
  .row {
    display: flex; align-items: center; justify-content: space-between;
    height: 138px; padding: 0 44px;
    border: 4px solid #15110C; border-radius: 30px;
    background: rgba(255, 244, 222, 0.22);
  }
  .label { font-family: Kufi; font-weight: 700; font-size: 44px; display: flex; flex-direction: column; line-height: 1.35; }
  .label .sub { font-family: Tajawal; font-weight: 500; font-size: 28px; }
  .price { display: flex; align-items: center; gap: 16px; }
  .num { font-weight: 700; font-size: 72px; line-height: 1; letter-spacing: 0.5px; }
  .unit { font-weight: 500; font-size: 32px; margin-top: 10px; }
  .arrow { width: 40px; height: 40px; display: inline-flex; }
  footer {
    margin-top: auto; width: 100%; text-align: center;
    font-weight: 700; font-size: 36px;
    padding-top: 26px; border-top: 4px solid #15110C;
  }
</style>
</head>
<body>
  <img class="logo" src="data:image/png;base64,${logo}" alt="">
  <h1>أسعار اليوم في ليبيا</h1>
  <div class="when"><span>${esc(date)}</span><span class="dot"></span><span dir="rtl">${esc(time)}</span></div>
  <div class="rows">${rows}</div>
  <footer>تطبيق عُملة — احسب أي مبلغ في ثانية</footer>
</body>
</html>`;
}

// Render the post image to a PNG file.
export async function renderImage(html, outFile) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const text = await page.evaluate(() => document.body.innerText);
    assertWesternDigits(text);
    const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').length);
    if (loaded < 3) throw new Error(`Only ${loaded} of 3 fonts loaded`);
    await page.screenshot({ path: outFile, type: 'png', clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
  } finally {
    await browser.close();
  }
}
