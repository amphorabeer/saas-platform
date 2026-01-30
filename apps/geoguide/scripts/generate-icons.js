const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const sizes = [192, 512];
const inputImage = path.join(__dirname, "../public/logo.png");
const outputDir = path.join(__dirname, "../public/icons");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  const useLogo = fs.existsSync(inputImage);

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

    if (useLogo) {
      await sharp(inputImage).resize(size, size).png().toFile(outputPath);
    } else {
      const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f59e0b"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.3}" 
              fill="white" text-anchor="middle" dominant-baseline="middle" font-weight="bold">
          🎧
        </text>
      </svg>
    `;
      await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outputPath);
    }

    console.log(`Created: ${outputPath}`);
  }
}

generateIcons().catch(console.error);
