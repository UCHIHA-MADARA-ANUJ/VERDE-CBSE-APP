/**
 * VERDE banner generator v2 — fuller triptych.
 * Usage: node gen-banner.js [outDir]   (default: parent of this script)
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..');
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
const CARD = `fill="#0a0f0d" stroke="#16241c" stroke-width="2"`;

// ---------------- PANEL 1 (left): brand → hardware → the loop → proof ----------------
const loopRows = [
  ['01', 'SENSE',   '12 channels · bed, air &amp; reservoir @ 0.5 Hz'],
  ['02', 'SEE',     'OV2640 + TFLite INT8 · leaf health in 38 ms'],
  ['03', 'DECIDE',  '41 rules · weather-aware · 0 ms cloud'],
  ['04', 'ACT',     'pump 2.4 L/min · 12-ch LED PWM'],
  ['05', 'REPORT',  'Firebase RTDB · WhatsApp alerts EN / HI'],
  ['06', 'RECLAIM', 'sealed loop · 95% of water reclaimed'],
];
const loopSvg = loopRows.map(([num, name, desc], i) => {
  const y = 1330 + i * 190;
  return `
<text x="140" y="${y}" ${OSL} font-weight="500" font-size="56" fill="#00FF87">${num}</text>
<text x="290" y="${y}" ${OSL} font-weight="500" font-size="46" letter-spacing="6" fill="#F2F7F3">${name}</text>
<text x="292" y="${y + 46}" ${MONO} font-weight="400" font-size="27" letter-spacing="1" fill="#6b8577">${desc}</text>
<line x1="140" y1="${y + 76}" x2="2340" y2="${y + 76}" stroke="#14231b" stroke-width="2"/>`;
}).join('');

const panel1 = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${DEFS}
${chrome(false)}
<text x="140" y="172" ${OSL} font-weight="500" font-size="70" letter-spacing="16" fill="#F2F7F3">PROJECT VERDE</text>
<text x="142" y="240" ${MONO} font-weight="400" font-size="30" letter-spacing="9" fill="#6b8577">AUTONOMOUS CULTIVATION SYSTEM</text>
<!-- chip -->
<rect x="960" y="460" width="560" height="360" rx="24" fill="#0a0f0d" stroke="#1d4a33" stroke-width="3"/>
<rect x="1000" y="500" width="480" height="280" rx="14" fill="#0d1512" stroke="#14231b" stroke-width="2"/>
<text x="1240" y="640" text-anchor="middle" ${OSL} font-weight="500" font-size="66" letter-spacing="10" fill="#F2F7F3">ESP8266</text>
<text x="1243" y="702" text-anchor="middle" ${MONO} font-weight="400" font-size="24" letter-spacing="4" fill="#6b8577">NODEMCU · CUSTOM PCB</text>
<g stroke="#00FF87" stroke-width="5" opacity="0.45">
  <line x1="896" y1="500" x2="960" y2="500"/><line x1="896" y1="560" x2="960" y2="560"/>
  <line x1="896" y1="620" x2="960" y2="620"/><line x1="896" y1="680" x2="960" y2="680"/>
  <line x1="896" y1="740" x2="960" y2="740"/><line x1="896" y1="800" x2="960" y2="800"/>
  <line x1="1520" y1="500" x2="1584" y2="500"/><line x1="1520" y1="560" x2="1584" y2="560"/>
  <line x1="1520" y1="620" x2="1584" y2="620"/><line x1="1520" y1="680" x2="1584" y2="680"/>
  <line x1="1520" y1="740" x2="1584" y2="740"/><line x1="1520" y1="800" x2="1584" y2="800"/>
</g>
<!-- traces -->
<g stroke="#00FF87" stroke-width="3" fill="none" opacity="0.20" stroke-linejoin="round" stroke-linecap="round">
  <path d="M-10 560 H500 L640 620 H896"/>
  <path d="M-10 800 H380 L520 740 H896"/>
  <path d="M1584 560 H1900 L2040 700 H2490"/>
  <path d="M1584 740 H1820 L1960 880 H2340"/>
  <path d="M-10 1020 H600 L740 1160 H1300 L1440 1300 H1900"/>
  <path d="M-10 1320 H480 L620 1460 H1080 L1220 1600 H1700"/>
  <path d="M-10 1620 H760 L900 1760 H1360 L1500 1900 H2000"/>
  <path d="M1100 -10 V460"/>
</g>
<path d="M-10 1920 H680 L820 2060 H1340" stroke="#2a4237" stroke-width="3" fill="none" opacity="0.35"/>
<g fill="#00FF87" opacity="0.5">
  <circle cx="640" cy="620" r="8"/><circle cx="520" cy="740" r="8"/>
  <circle cx="2040" cy="700" r="8"/><circle cx="1960" cy="880" r="8"/>
  <circle cx="740" cy="1160" r="8"/><circle cx="1440" cy="1300" r="8"/>
  <circle cx="620" cy="1460" r="8"/><circle cx="1220" cy="1600" r="8"/>
  <circle cx="900" cy="1760" r="8"/><circle cx="1500" cy="1900" r="8"/>
  <circle cx="1100" cy="240" r="8"/>
</g>
<g fill="none" stroke="#00FF87" opacity="0.35">
  <rect x="1886" y="1286" width="28" height="28"/><rect x="1686" y="1586" width="28" height="28"/>
  <rect x="1986" y="1886" width="28" height="28"/><rect x="2326" y="866" width="28" height="28"/>
</g>
<!-- the loop -->
<text x="140" y="1180" ${MONO} font-weight="500" font-size="28" letter-spacing="6" fill="#6b8577">THE LOOP — SIX STEPS, FOREVER</text>
${loopSvg}
<!-- proof stats -->
<g>
  <rect x="140" y="2488" width="36" height="5" fill="#00FF87" opacity="0.9"/>
  <text x="204" y="2520" ${MONO} font-weight="500" font-size="38" letter-spacing="4" fill="#d7e8dc">20 GROWING SITES</text>
  <rect x="140" y="2618" width="36" height="5" fill="#00FF87" opacity="0.9"/>
  <text x="204" y="2650" ${MONO} font-weight="500" font-size="38" letter-spacing="4" fill="#d7e8dc">04 TIERS — CLOSED LOOP</text>
  <rect x="140" y="2748" width="36" height="5" fill="#00FF87" opacity="0.9"/>
  <text x="204" y="2780" ${MONO} font-weight="500" font-size="38" letter-spacing="4" fill="#d7e8dc">95% LESS WATER THAN SOIL</text>
</g>
</svg>`;

// ---------------- PANEL 2 (center): hero + live telemetry + pillars ----------------
const tiles = [
  ['MOISTURE', '68%'], ['TEMP', '24.1°C'], ['NUTRIENT pH', '6.21'], ['TANK', '82%'],
].map(([lbl, val], i) => {
  const x = 140 + i * 560, y = 2920;
  return `
<rect x="${x}" y="${y}" width="520" height="190" rx="14" ${CARD}/>
<circle cx="${x + 22}" cy="${y + 44}" r="5" fill="#00FF87"/>
<text x="${x + 42}" y="${y + 52}" ${MONO} font-weight="500" font-size="24" letter-spacing="3" fill="#6b8577">${lbl}</text>
<text x="${x + 40}" y="${y + 138}" ${OSL} font-weight="600" font-size="62" fill="#F2F7F3">${val}</text>`;
}).join('');

const panel2 = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${DEFS}
${chrome(true)}
<text x="140" y="170" ${MONO} font-weight="500" font-size="30" letter-spacing="6" fill="#5f7a6a">VERDE OS — V3.0.0</text>
<text x="2340" y="170" text-anchor="end" ${MONO} font-weight="500" font-size="30" letter-spacing="6" fill="#5f7a6a">TOWER_01 · DELHI · IN</text>
<text x="1240" y="316" text-anchor="middle" ${MONO} font-weight="400" font-size="28" letter-spacing="10" fill="#4b6355">AUTONOMOUS AGRICULTURE — V3.0</text>
<circle cx="1240" cy="1420" r="500" fill="none" stroke="#1d4a33" stroke-width="2.5" stroke-dasharray="4 16" opacity="0.9"/>
<circle cx="1240" cy="1420" r="500" fill="none" stroke="#00FF87" stroke-width="5" stroke-linecap="round" stroke-dasharray="250 2892" opacity="0.9" transform="rotate(-50 1240 1420)"/>
<circle cx="1240" cy="1420" r="500" fill="none" stroke="#00FF87" stroke-width="4" stroke-linecap="round" stroke-dasharray="110 3032" opacity="0.6" transform="rotate(150 1240 1420)"/>
<g transform="translate(1240,1414) rotate(-8) scale(26)" fill="none" stroke="#00FF87" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5" filter="url(#blurL)">${SPROUT}</g>
<g transform="translate(1240,1414) rotate(-8) scale(26)" fill="none" stroke="#F2F7F3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SPROUT}</g>
<text x="1240" y="2520" text-anchor="middle" ${OSL} font-weight="600" font-size="520" letter-spacing="12" fill="#F2F7F3">VERDE</text>
<rect x="1198" y="2612" width="84" height="6" fill="#00FF87"/>
<text x="1255" y="2760" text-anchor="middle" ${MONO} font-weight="500" font-size="56" letter-spacing="30" fill="#86efac" opacity="0.85">AN ECOSYSTEM</text>
${tiles}
<text x="1240" y="3230" text-anchor="middle" ${MONO} font-weight="400" font-size="28" letter-spacing="4" fill="#4b6355">01 WATERS ITSELF · 02 WATCHES THE PLANTS · 03 TELLS YOU</text>
</svg>`;

// ---------------- PANEL 3 (right): proof bars + spec grid + sensing stack ----------------
const barRows = [
  ['WATER PER CYCLE',        '18.0 L', 1500, '0.9 L',   75],
  ['FLOOR AREA · 20 PLANTS', '4.2 m²', 1500, '0.46 m²', 164],
  ['TIME TO HARVEST',        '61 DAYS', 1500, '38 DAYS', 934],
  ['HUMAN INTERVENTIONS / WK','14 / WK',1500, '0.4 / WK', 43],
];
const barsSvg = barRows.map(([lbl, sv, sw, vv, vw], i) => {
  const y0 = 1420 + i * 200;
  return `
<text x="140" y="${y0}" ${MONO} font-weight="500" font-size="26" letter-spacing="3" fill="#8fa89a">${lbl}</text>
<text x="140" y="${y0 + 58}" ${MONO} font-weight="400" font-size="22" letter-spacing="2" fill="#5f7a6a">SOIL</text>
<rect x="300" y="${y0 + 38}" width="${sw}" height="22" fill="#33413a"/>
<text x="${300 + sw + 24}" y="${y0 + 58}" ${MONO} font-weight="400" font-size="24" fill="#8fa89a">${sv}</text>
<text x="140" y="${y0 + 116}" ${MONO} font-weight="500" font-size="22" letter-spacing="2" fill="#00FF87">VERDE</text>
<rect x="300" y="${y0 + 96}" width="${vw}" height="22" fill="#00FF87"/>
<text x="${300 + vw + 24}" y="${y0 + 116}" ${MONO} font-weight="500" font-size="24" fill="#00FF87">${vv}</text>`;
}).join('');

const specCells = [
  ['160 MHz', 'ESP8266 CLOCK SPEED'],
  ['38 ms', 'ON-DEVICE AI INFERENCE'],
  ['12 CH', 'SENSOR CHANNELS @ 0.5 Hz'],
  ['1,200+', 'LINES OF C++ FIRMWARE'],
];
const specsSvg = specCells.map(([val, lbl], i) => {
  const x = 140 + (i % 2) * 1100, y = 2240 + Math.floor(i / 2) * 250;
  return `
<rect x="${x}" y="${y}" width="1070" height="220" rx="14" ${CARD}/>
<text x="${x + 44}" y="${y + 128}" ${OSL} font-weight="600" font-size="76" fill="#F2F7F3">${val}</text>
<text x="${x + 46}" y="${y + 176}" ${MONO} font-weight="400" font-size="22" letter-spacing="3" fill="#6b8577">${lbl}</text>`;
}).join('');

const panel3 = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${DEFS}
${chrome(false)}
<text x="2340" y="170" text-anchor="end" ${MONO} font-weight="500" font-size="30" letter-spacing="6" fill="#6b8577">EST. 2025 — DELHI, IN</text>
<text x="2340" y="238" text-anchor="end" ${MONO} font-weight="400" font-size="26" letter-spacing="7" fill="#4b6355">CBSE IOT &amp; TECH EXHIBITION</text>
<g stroke="#00FF87" stroke-width="3" fill="none" opacity="0.20" stroke-linejoin="round" stroke-linecap="round">
  <path d="M620 560 H1120 L1260 700 H1740 L1880 840 H2490"/>
  <path d="M820 860 H1320 L1460 1000 H1920 L2060 1140 H2490"/>
  <path d="M1040 1140 H1540 L1680 1280 H2140"/>
  <path d="M2220 -10 V320 L2080 460 V720"/>
</g>
<path d="M420 720 H920 L1060 860 H1520" stroke="#2a4237" stroke-width="3" fill="none" opacity="0.35"/>
<g fill="#00FF87" opacity="0.5">
  <circle cx="1260" cy="700" r="8"/><circle cx="1740" cy="840" r="8"/>
  <circle cx="1460" cy="1000" r="8"/><circle cx="2060" cy="1140" r="8"/>
  <circle cx="1680" cy="1280" r="8"/><circle cx="2080" cy="460" r="8"/>
  <circle cx="1060" cy="860" r="8"/>
</g>
<g fill="none" stroke="#00FF87" opacity="0.35">
  <rect x="2126" y="1266" width="28" height="28"/><rect x="2066" y="706" width="28" height="28"/>
</g>
<text x="140" y="1330" ${MONO} font-weight="500" font-size="26" letter-spacing="4" fill="#6b8577">DIRT LOSES — MEASURED OVER THREE FULL CYCLES IN DELHI</text>
${barsSvg}
${specsSvg}
<rect x="140" y="2790" width="2200" height="110" rx="14" ${CARD}/>
<text x="180" y="2832" ${MONO} font-weight="500" font-size="22" letter-spacing="4" fill="#4b6355">SENSING STACK</text>
<text x="180" y="2880" ${MONO} font-weight="400" font-size="26" letter-spacing="2" fill="#cfe3d6">DHT22 · SOIL PROBES · HC-SR04 · NPK RS485 · RAIN SENSOR · OV2640</text>
<text x="2340" y="3150" text-anchor="end" ${MONO} font-weight="400" font-size="30" letter-spacing="4" fill="#5f7a6a">verde-cbse.vercel.app</text>
</svg>`;

(async () => {
  fs.mkdirSync(path.join(OUT, 'print'), { recursive: true });
  const svgs = { 1: panel1, 2: panel2, 3: panel3 };
  for (const n of [1, 2, 3]) {
    fs.writeFileSync(path.join(OUT, `panel-${n}.svg`), svgs[n]);
    await sharp(Buffer.from(svgs[n]))
      .withMetadata({ density: 300 })
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT, 'print', `panel-${n}.png`));
    console.log(`panel-${n} done`);
  }
  // combined preview: stitch the three PNGs side by side via raw pixels, then downscale
  const banner = Buffer.alloc(W * 3 * H * 4);
  for (let i = 0; i < 3; i++) {
    const { data } = await sharp(path.join(OUT, 'print', `panel-${i + 1}.png`))
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let row = 0; row < H; row++) {
      data.copy(banner, (row * W * 3 + i * W) * 4, row * W * 4, (row + 1) * W * 4);
    }
  }
  await sharp(banner, { raw: { width: W * 3, height: H, channels: 4 } })
    .resize({ width: 2400 })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, 'banner-preview.png'));
  console.log('preview done');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
