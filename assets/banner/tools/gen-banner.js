/**
 * VERDE banner generator — renders the 3 × A4 triptych (SVG sources + 300-dpi PNGs
 * + combined preview). Requires: npm install sharp  +  fonts "Oswald" and
 * "IBM Plex Mono" visible to fontconfig.
 *
 *   node gen-banner.js
 *
 * Outputs (relative to this script):
 *   ../panel-1.svg, ../panel-2.svg, ../panel-3.svg
 *   ../print/panel-1.png, ../print/panel-2.png, ../print/panel-3.png  (A4 @ 300dpi)
 *   ../banner-preview.png
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..');
const W = 2480, H = 3508; // A4 @ 300dpi, portrait

const SPROUT = `<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>`;

const DEFS = `
<defs>
  <pattern id="grid" width="310" height="310" patternUnits="userSpaceOnUse">
    <path d="M310 0H0V310" fill="none" stroke="#0e1a14" stroke-width="1.5"/>
  </pattern>
  <pattern id="scan" width="8" height="8" patternUnits="userSpaceOnUse">
    <rect width="8" height="1.4" fill="#ffffff" opacity="0.022"/>
  </pattern>
  <radialGradient id="vig" cx="0.5" cy="0.42" r="0.78">
    <stop offset="0" stop-color="#000000" stop-opacity="0"/>
    <stop offset="0.62" stop-color="#000000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000000" stop-opacity="0.55"/>
  </radialGradient>
  <radialGradient id="glowC" cx="0.5" cy="0.40" r="0.58">
    <stop offset="0" stop-color="#00FF87" stop-opacity="0.17"/>
    <stop offset="1" stop-color="#00FF87" stop-opacity="0"/>
  </radialGradient>
  <filter id="blurL" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="42"/></filter>
</defs>`;

const chrome = (glow) => `
<rect width="${W}" height="${H}" fill="#050708"/>
${glow ? `<rect width="${W}" height="${H}" fill="url(#glowC)"/>` : ''}
<rect width="${W}" height="${H}" fill="url(#grid)" opacity="0.55"/>
<rect width="${W}" height="${H}" fill="url(#scan)"/>
<rect width="${W}" height="${H}" fill="url(#vig)"/>
<rect x="80" y="80" width="2320" height="3348" fill="none" stroke="#16241c" stroke-width="2"/>
<g stroke="#00FF87" stroke-width="5" opacity="0.9" fill="none">
  <path d="M80 152V80h72"/><path d="M2328 80h72v72"/>
  <path d="M2400 3356v72h-72"/><path d="M152 3428H80v-72"/>
</g>
<text x="1240" y="3320" text-anchor="middle" font-family="IBM Plex Mono" font-weight="400" font-size="30" letter-spacing="6" fill="#3d5748">AUTONOMOUS · SEALED LOOP · ON-DEVICE AI · ZERO SOIL · AUTONOMOUS · SEALED LOOP</text>`;

const MONO = `font-family="IBM Plex Mono"`;
const OSL = `font-family="Oswald"`;

// ---------------- PANEL 1 (left) ----------------
const panel1 = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${DEFS}
${chrome(false)}
<text x="140" y="172" ${OSL} font-weight="500" font-size="70" letter-spacing="16" fill="#F2F7F3">PROJECT VERDE</text>
<text x="142" y="240" ${MONO} font-weight="400" font-size="30" letter-spacing="9" fill="#6b8577">AUTONOMOUS CULTIVATION SYSTEM</text>
<g stroke="#00FF87" stroke-width="3" fill="none" opacity="0.20" stroke-linejoin="round" stroke-linecap="round">
  <path d="M-10 880 H520 L660 1020 H1120 L1260 1160 H1760"/>
  <path d="M-10 1180 H320 L460 1320 H920 L1060 1460 H1560"/>
  <path d="M-10 1480 H720 L860 1620 H1320 L1460 1760 H1980"/>
  <path d="M180 -10 V320 L320 460 V820"/>
</g>
<path d="M-10 1780 H420 L560 1920 H1080" stroke="#2a4237" stroke-width="3" fill="none" opacity="0.35"/>
<g fill="#00FF87" opacity="0.5">
  <circle cx="520" cy="880" r="8"/><circle cx="1120" cy="1020" r="8"/>
  <circle cx="320" cy="1180" r="8"/><circle cx="920" cy="1320" r="8"/>
  <circle cx="720" cy="1480" r="8"/><circle cx="1320" cy="1620" r="8"/>
  <circle cx="320" cy="460" r="8"/>
</g>
<g fill="none" stroke="#00FF87" opacity="0.35">
  <rect x="1746" y="1146" width="28" height="28"/><rect x="1546" y="1446" width="28" height="28"/>
  <rect x="1966" y="1746" width="28" height="28"/><rect x="306" y="806" width="28" height="28"/>
</g>
<g>
  <rect x="140" y="2488" width="36" height="5" fill="#00FF87" opacity="0.9"/>
  <text x="204" y="2520" ${MONO} font-weight="500" font-size="38" letter-spacing="4" fill="#d7e8dc">20 GROWING SITES</text>
  <rect x="140" y="2618" width="36" height="5" fill="#00FF87" opacity="0.9"/>
  <text x="204" y="2650" ${MONO} font-weight="500" font-size="38" letter-spacing="4" fill="#d7e8dc">04 TIERS — CLOSED LOOP</text>
  <rect x="140" y="2748" width="36" height="5" fill="#00FF87" opacity="0.9"/>
  <text x="204" y="2780" ${MONO} font-weight="500" font-size="38" letter-spacing="4" fill="#d7e8dc">95% LESS WATER THAN SOIL</text>
</g>
</svg>`;

// ---------------- PANEL 2 (center) ----------------
const panel2 = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${DEFS}
${chrome(true)}
<text x="140" y="170" ${MONO} font-weight="500" font-size="30" letter-spacing="6" fill="#5f7a6a">VERDE OS — V3.0.0</text>
<text x="2340" y="170" text-anchor="end" ${MONO} font-weight="500" font-size="30" letter-spacing="6" fill="#5f7a6a">TOWER_01 · DELHI · IN</text>
<circle cx="1240" cy="1420" r="500" fill="none" stroke="#1d4a33" stroke-width="2.5" stroke-dasharray="4 16" opacity="0.9"/>
<circle cx="1240" cy="1420" r="500" fill="none" stroke="#00FF87" stroke-width="5" stroke-linecap="round" stroke-dasharray="250 2892" opacity="0.9" transform="rotate(-50 1240 1420)"/>
<circle cx="1240" cy="1420" r="500" fill="none" stroke="#00FF87" stroke-width="4" stroke-linecap="round" stroke-dasharray="110 3032" opacity="0.6" transform="rotate(150 1240 1420)"/>
<g transform="translate(1240,1414) rotate(-8) scale(26)" fill="none" stroke="#00FF87" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5" filter="url(#blurL)">${SPROUT}</g>
<g transform="translate(1240,1414) rotate(-8) scale(26)" fill="none" stroke="#F2F7F3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SPROUT}</g>
<text x="1240" y="2520" text-anchor="middle" ${OSL} font-weight="600" font-size="520" letter-spacing="12" fill="#F2F7F3">VERDE</text>
<rect x="1198" y="2612" width="84" height="6" fill="#00FF87"/>
<text x="1255" y="2760" text-anchor="middle" ${MONO} font-weight="500" font-size="56" letter-spacing="30" fill="#86efac" opacity="0.85">AN ECOSYSTEM</text>
</svg>`;

// ---------------- PANEL 3 (right) ----------------
const panel3 = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${DEFS}
${chrome(false)}
<text x="2340" y="170" text-anchor="end" ${MONO} font-weight="500" font-size="30" letter-spacing="6" fill="#6b8577">EST. 2025 — DELHI, IN</text>
<text x="2340" y="238" text-anchor="end" ${MONO} font-weight="400" font-size="26" letter-spacing="7" fill="#4b6355">CBSE IOT &amp; TECH EXHIBITION</text>
<g stroke="#00FF87" stroke-width="3" fill="none" opacity="0.20" stroke-linejoin="round" stroke-linecap="round">
  <path d="M720 1160 H1180 L1320 1020 H1780 L1920 880 H2490"/>
  <path d="M920 1460 H1380 L1520 1320 H1980 L2120 1180 H2490"/>
  <path d="M1020 1760 H1480 L1620 1620 H2080"/>
  <path d="M2160 -10 V360 L2020 500 V860"/>
</g>
<path d="M1400 1920 H1860 L2000 1780 H2490" stroke="#2a4237" stroke-width="3" fill="none" opacity="0.35"/>
<g fill="#00FF87" opacity="0.5">
  <circle cx="1180" cy="1160" r="8"/><circle cx="1780" cy="1020" r="8"/>
  <circle cx="1380" cy="1460" r="8"/><circle cx="1980" cy="1320" r="8"/>
  <circle cx="1480" cy="1620" r="8"/><circle cx="2020" cy="500" r="8"/>
</g>
<g fill="none" stroke="#00FF87" opacity="0.35">
  <rect x="1906" y="866" width="28" height="28"/><rect x="2106" y="1166" width="28" height="28"/>
  <rect x="2066" y="1746" width="28" height="28"/><rect x="2006" y="846" width="28" height="28"/>
</g>
<g>
  <rect x="2306" y="2488" width="36" height="5" fill="#00FF87" opacity="0.9"/>
  <text x="2276" y="2520" text-anchor="end" ${MONO} font-weight="500" font-size="38" letter-spacing="4" fill="#d7e8dc">ESP8266 · CUSTOM PCB</text>
  <rect x="2306" y="2618" width="36" height="5" fill="#00FF87" opacity="0.9"/>
  <text x="2276" y="2650" text-anchor="end" ${MONO} font-weight="500" font-size="38" letter-spacing="4" fill="#d7e8dc">TFLITE ON-DEVICE AI</text>
  <rect x="2306" y="2748" width="36" height="5" fill="#00FF87" opacity="0.9"/>
  <text x="2276" y="2780" text-anchor="end" ${MONO} font-weight="500" font-size="38" letter-spacing="4" fill="#d7e8dc">FIREBASE · WHATSAPP</text>
</g>
<text x="2340" y="3240" text-anchor="end" ${MONO} font-weight="400" font-size="32" letter-spacing="4" fill="#5f7a6a">verde-cbse.vercel.app</text>
</svg>`;

(async () => {
  fs.mkdirSync(path.join(OUT, 'print'), { recursive: true });
  const svgs = { 1: panel1, 2: panel2, 3: panel3 };
  for (const n of [1, 2, 3]) {
    const svgPath = path.join(OUT, `panel-${n}.svg`);
    fs.writeFileSync(svgPath, svgs[n]);
    await sharp(Buffer.from(svgs[n]))
      .withMetadata({ density: 300 })
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT, 'print', `panel-${n}.png`));
    console.log(`panel-${n} done (svg + 300dpi png)`);
  }
  // combined preview: extend panel-1 canvas, composite the other two, downscale
  const base = await sharp(path.join(OUT, 'print', 'panel-1.png'))
    .extend({ right: W * 2, background: '#050708' })
    .toBuffer();
  await sharp(base)
    .composite([
      { input: path.join(OUT, 'print', 'panel-2.png'), left: W, top: 0 },
      { input: path.join(OUT, 'print', 'panel-3.png'), left: W * 2, top: 0 },
    ])
    .resize({ width: 2400 })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, 'banner-preview.png'));
  console.log('banner-preview.png done');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
