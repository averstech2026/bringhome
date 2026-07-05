/**
 * Сжимает изображение до JPEG data URL для хранения в Firestore (без Storage).
 */
export async function compressImageToDataUrl(
  file,
  { maxDimension = 256, maxBytes = 120_000 } = {},
) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(maxDimension / bitmap.width, maxDimension / bitmap.height, 1);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.82;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);

  while (dataUrl.length > maxBytes && quality > 0.35) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  if (dataUrl.length > maxBytes) {
    throw new Error('Фото слишком большое даже после сжатия. Попробуйте другое изображение.');
  }

  return dataUrl;
}
