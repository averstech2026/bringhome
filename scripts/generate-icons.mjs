/**
 * Генерирует PWA-иконки и ассеты для push-уведомлений из исходного логотипа.
 * Запуск: node scripts/generate-icons.mjs [путь-к-исходному-png]
 */
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');

const defaultSrc = join(publicDir, 'brand', 'logo-source.png');

const srcPath = process.argv[2] || defaultSrc;
const BG = '#ffffff';

/** Находит квадратную область градиентной иконки «AI» в исходном PNG. */
async function detectAiIconBox(image) {
  const { data, info } = await image.clone().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const isBg = r > 235 && g > 235 && b > 235;
      const isBlack = r < 60 && g < 60 && b < 60;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      const isGradient = sat > 60 && r > 100 && b > 100 && g < 150 && !isBg && !isBlack;
      if (isGradient) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const side = Math.max(w, h);
  const pad = Math.round(side * 0.06);
  const cx = minX + w / 2;
  const cy = minY + h / 2;
  const left = Math.max(0, Math.round(cx - side / 2 - pad));
  const top = Math.max(0, Math.round(cy - side / 2 - pad));
  const size = Math.min(side + pad * 2, info.width - left, info.height - top);

  return { left, top, width: size, height: size };
}

async function squareIcon(image, box, size, { maskable = false } = {}) {
  const cropped = image.clone().extract(box);
  if (maskable) {
    const inner = Math.round(size * 0.72);
    const icon = await cropped.resize(inner, inner, { fit: 'contain' }).png().toBuffer();
    return sharp({
      create: { width: size, height: size, channels: 4, background: BG },
    })
      .composite([{ input: icon, gravity: 'centre' }])
      .png()
      .toBuffer();
  }
  return cropped.resize(size, size, { fit: 'cover' }).png().toBuffer();
}

async function fullLogoSquare(image, size, { maskable = false } = {}) {
  const meta = await image.metadata();
  const fill = maskable ? 0.68 : 0.88;
  const scale = (size * fill) / meta.width;
  const h = Math.round(meta.height * scale);
  const resized = await image.clone().resize(Math.round(meta.width * scale), h).png().toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: resized, gravity: 'centre' }])
    .png()
    .toBuffer();
}

/** Монохромный badge для статус-бара: белая силуэтная иконка на прозрачном фоне. */
async function makeBadge(image, box, size = 96) {
  const icon = await image.clone().extract(box).resize(size, size, { fit: 'cover' }).png().toBuffer();
  const { data, info } = await sharp(icon).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const isBg = r > 235 && g > 235 && b > 235;
    const alpha = isBg ? 0 : 255;
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
    out[i + 3] = alpha;
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function makeFavicon(image, box) {
  return squareIcon(image, box, 32);
}

async function main() {
  const image = sharp(srcPath);
  const box = await detectAiIconBox(image);
  console.log('AI icon box:', box);

  await mkdir(join(publicDir, 'icons'), { recursive: true });

  const outputs = [
    ['pwa-192x192.png', await fullLogoSquare(image, 192)],
    ['pwa-512x512.png', await fullLogoSquare(image, 512)],
    ['pwa-512x512-maskable.png', await fullLogoSquare(image, 512, { maskable: true })],
    ['apple-touch-icon.png', await fullLogoSquare(image, 180)],
    ['icons/logo.png', await fullLogoSquare(image, 512)],
    ['icons/badge.png', await makeBadge(image, box, 96)],
    ['favicon-32.png', await makeFavicon(image, box)],
  ];

  for (const [rel, buf] of outputs) {
    const dest = join(publicDir, rel);
    await writeFile(dest, buf);
    console.log('written', rel);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
