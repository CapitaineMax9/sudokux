/**
 * Génère l'icône de l'application et l'image de démarrage dans assets/images.
 *
 * Outil de développement facultatif : il dessine les images en SVG puis les
 * capture avec Playwright (`npm install --no-save playwright` si besoin).
 *
 *   node scripts/generate-assets.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'images');
const FONT = path.join(
  ROOT,
  'node_modules',
  '@expo-google-fonts',
  'orbitron',
  '900Black',
  'Orbitron_900Black.ttf',
);

const CYAN = '#00f0ff';
const MAGENTA = '#ff2bd6';
const BG = '#05050d';

/**
 * Le logo : une grille 3 × 3 cyan barrée d'un grand X magenta.
 * `scale` réduit le dessin autour du centre (zone sûre des icônes Android).
 */
function logo({ background, mono = false, scale = 1, digits = true }) {
  const cyan = mono ? '#ffffff' : CYAN;
  const magenta = mono ? '#ffffff' : MAGENTA;
  const a = 212;
  const b = 812;
  const step = (b - a) / 3;
  const lines = [1, 2]
    .map((k) => {
      const p = a + step * k;
      return `<line x1="${p}" y1="${a}" x2="${p}" y2="${b}"/><line x1="${a}" y1="${p}" x2="${b}" y2="${p}"/>`;
    })
    .join('');
  const cell = (col, row) => [a + step * (col + 0.5), a + step * (row + 0.5) + 42];
  const marks = [
    ['9', 1, 0],
    ['1', 0, 1],
    ['4', 2, 1],
    ['8', 1, 2],
  ]
    .map(([d, col, row]) => {
      const [x, y] = cell(col, row);
      return `<text x="${x}" y="${y}" text-anchor="middle">${d}</text>`;
    })
    .join('');
  const glow = mono
    ? ''
    : `<filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
         <feGaussianBlur stdDeviation="16" result="blur"/>
         <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
       </filter>`;
  const filter = mono ? '' : 'filter="url(#glow)"';

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    ${glow}
    <radialGradient id="g1" cx="20%" cy="10%" r="80%">
      <stop offset="0" stop-color="${MAGENTA}" stop-opacity="0.28"/>
      <stop offset="1" stop-color="${MAGENTA}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="85%" cy="95%" r="80%">
      <stop offset="0" stop-color="${CYAN}" stop-opacity="0.25"/>
      <stop offset="1" stop-color="${CYAN}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${
    background
      ? `<rect width="1024" height="1024" fill="${BG}"/>
         <rect width="1024" height="1024" fill="url(#g1)"/>
         <rect width="1024" height="1024" fill="url(#g2)"/>`
      : ''
  }
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    <g ${filter} stroke="${cyan}" fill="none" stroke-linecap="round">
      <rect x="${a}" y="${a}" width="${b - a}" height="${b - a}" rx="26" stroke-width="20"/>
      <g stroke-width="10" stroke-opacity="${mono ? 1 : 0.75}">${lines}</g>
    </g>
    ${
      digits && !mono
        ? `<g font-family="Orbitron" font-weight="900" font-size="120" fill="${cyan}" fill-opacity="0.55">${marks}</g>`
        : ''
    }
    <g ${filter} stroke="${magenta}" stroke-width="84" stroke-linecap="round">
      <line x1="322" y1="322" x2="702" y2="702"/>
      <line x1="702" y1="322" x2="322" y2="702"/>
    </g>
  </g>
</svg>`;
}

function page(svg, transparent) {
  return `<!doctype html><html><head><style>
    @font-face { font-family: Orbitron; font-weight: 900; src: url('file://${FONT}'); }
    html, body { margin: 0; background: ${transparent ? 'transparent' : BG}; }
    svg { display: block; }
  </style></head><body>${svg}</body></html>`;
}

async function render(browser, name, svg, size, transparent) {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 1024 },
    deviceScaleFactor: size / 1024,
  });
  const tab = await context.newPage();
  // On passe par un fichier pour que la police locale puisse être chargée.
  const html = path.join(OUT, `.tmp-${name}.html`);
  fs.writeFileSync(html, page(svg, transparent));
  await tab.goto(`file://${html}`);
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: path.join(OUT, name), omitBackground: transparent });
  fs.unlinkSync(html);
  await context.close();
  console.log(`✓ ${name} (${size} × ${size})`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  await render(browser, 'icon.png', logo({ background: true }), 1024, false);
  await render(
    browser,
    'android-icon-foreground.png',
    logo({ background: false, scale: 0.62 }),
    1024,
    true,
  );
  await render(
    browser,
    'android-icon-monochrome.png',
    logo({ background: false, mono: true, scale: 0.62 }),
    1024,
    true,
  );
  await render(browser, 'splash-icon.png', logo({ background: false }), 512, true);
  await render(browser, 'favicon.png', logo({ background: true, digits: false }), 64, false);
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
