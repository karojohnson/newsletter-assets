// Rasterize tastytrade icons-2.0 SVGs -> transparent PNGs in 5 brand tints.
// Usage: node build-icons.js <svgSrcDir> <outDir>
//   outDir/icons/<color>/<name>.png  (color: black white cherry blue green)
// Deps: npm i @resvg/resvg-js   (run once in this tools/ dir)
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const SRC = process.argv[2];
const OUT = process.argv[3];
const SIZE = 512;
if (!SRC || !OUT) {
  console.error('Usage: node build-icons.js <svgSrcDir> <outDir>');
  process.exit(1);
}

const TINTS = {
  black:  '#1D191B', // primary, light backdrops
  white:  '#FFFFFF', // primary, dark backdrops
  cherry: '#E21F26', // emphasis, any backdrop
  blue:   '#206395', // limited accent
  green:  '#196C3D', // limited accent
};

function isMulticolor(svg) {
  const colors = new Set();
  let hasUrl = false, m;
  const attrRe = /(?:fill|stroke|stop-color)\s*=\s*"([^"]+)"/gi;
  while ((m = attrRe.exec(svg))) {
    const v = m[1].trim().toLowerCase();
    if (v === 'none' || v === 'currentcolor' || v === 'transparent') continue;
    if (v.startsWith('url(')) { hasUrl = true; continue; }
    colors.add(v);
  }
  const styleRe = /(?:fill|stroke|stop-color)\s*:\s*(#[0-9a-f]{3,8}|rgba?\([^)]*\))/gi;
  while ((m = styleRe.exec(svg))) { colors.add(m[1].trim().toLowerCase()); }
  return hasUrl || colors.size > 1;
}

function recolor(svg, color) {
  let s = svg;
  s = s.replace(/(fill|stroke)\s*=\s*"(?!none")[^"]*"/gi, (_f, attr) => `${attr}="${color}"`);
  s = s.replace(/currentColor/gi, color);
  const tag = s.match(/<svg\b[^>]*>/i)[0];
  if (!/\bfill\s*=/i.test(tag)) { s = s.replace(/<svg\b/i, `<svg fill="${color}"`); }
  return s;
}

function render(svg, outPath) {
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: SIZE }, font: { loadSystemFonts: false } });
  fs.writeFileSync(outPath, r.render().asPng());
}

// only top-level SVGs (skip flags/ subdir — multi-color country flags)
const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.svg')).sort();
const iconsRoot = path.join(OUT, 'icons');
fs.rmSync(iconsRoot, { recursive: true, force: true });
for (const c of Object.keys(TINTS)) { fs.mkdirSync(path.join(iconsRoot, c), { recursive: true }); }

let mono = 0, skipped = 0;
for (const file of files) {
  const name = file.replace(/\.svg$/, '');
  const svg = fs.readFileSync(path.join(SRC, file), 'utf8');
  if (isMulticolor(svg)) { skipped++; continue; }
  for (const [c, hex] of Object.entries(TINTS)) {
    render(recolor(svg, hex), path.join(iconsRoot, c, `${name}.png`));
  }
  mono++;
}
console.log(`Rendered ${mono} icons x ${Object.keys(TINTS).length} tints (skipped ${skipped} multi-color). -> ${iconsRoot}`);
