import sharp from "sharp";
import { writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

const variants = [
  { lang: "en", subtitle: "Audio Guide for Georgia's Museums" },
  { lang: "ru", subtitle: "Аудиогид по музеям Грузии" },
  { lang: "pl", subtitle: "Audioprzewodnik po muzeach Gruzji" },
  { lang: "ka", subtitle: "საქართველოს მუზეუმების აუდიო გიდი" },
];

for (const { lang, subtitle } of variants) {
  const safe = escapeXml(subtitle);
  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FDF4E8"/>
      <stop offset="100%" stop-color="#FFFFFF"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <text x="600" y="260" text-anchor="middle" font-size="76" font-weight="700" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" fill="#E67E22">GeoGuide</text>
  <text x="600" y="350" text-anchor="middle" font-size="34" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" fill="#333333">${safe}</text>
</svg>`;

  const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
  const out = join(publicDir, `og-image-${lang}.jpg`);
  await writeFile(out, buf);
  console.log("wrote", out);
}
