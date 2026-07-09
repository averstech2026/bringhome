/**
 * Повышает patch-версию в package.json (0.1.0 → 0.1.1).
 * Запуск: node scripts/bump-patch-version.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, '..', 'package.json');

const raw = await readFile(pkgPath, 'utf8');
const pkg = JSON.parse(raw);
const previousVersion = pkg.version;
const parts = previousVersion.split('.').map(Number);

if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
  console.error(`Некорректная semver-версия: ${previousVersion}`);
  process.exit(1);
}

parts[2] += 1;
const newVersion = parts.join('.');
pkg.version = newVersion;

await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
console.log(`Версия обновлена: ${previousVersion} → ${newVersion}`);
