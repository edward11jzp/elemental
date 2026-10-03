// One-shot image optimizer: compresses heavy PNG/JPG assets in place.
// Run with: node scripts/optimize-images.cjs
//
// Strategy:
// - PNGs > 400KB → resize to max 1600px, recompress with palette + max compression
// - JPGs > 400KB → resize to max 1920px, recompress at quality 82
// - Skips small files (already lean)
// - Keeps the same filename so all imports continue to work as-is
//
// Originals are backed up to .image-backups/ in case we need to roll back.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const DIRS = [
  path.join(ROOT, 'src/assets'),
  path.join(ROOT, 'src/assets/figma'),
  path.join(ROOT, 'imports'),
];
const BACKUP_DIR = path.join(ROOT, '.image-backups');
const MIN_SIZE_TO_OPTIMIZE = 400 * 1024; // 400 KB
const MAX_WIDTH_PNG = 1600;
const MAX_WIDTH_JPG = 1920;
const JPG_QUALITY = 82;

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

function bytesToKB(n) {
  return (n / 1024).toFixed(0) + ' KB';
}

async function optimize(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size < MIN_SIZE_TO_OPTIMIZE) return null;

  const ext = path.extname(filePath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) return null;

  // Backup
  const backupName = path.relative(ROOT, filePath).replace(/[\\/]/g, '_');
  const backupPath = path.join(BACKUP_DIR, backupName);
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
  }

  const before = stat.size;
  const image = sharp(filePath);
  const meta = await image.metadata();

  let pipeline = image;
  if (ext === '.png') {
    if (meta.width && meta.width > MAX_WIDTH_PNG) {
      pipeline = pipeline.resize({ width: MAX_WIDTH_PNG, withoutEnlargement: true });
    }
    pipeline = pipeline.png({ compressionLevel: 9, palette: true, quality: 80, effort: 10 });
  } else {
    if (meta.width && meta.width > MAX_WIDTH_JPG) {
      pipeline = pipeline.resize({ width: MAX_WIDTH_JPG, withoutEnlargement: true });
    }
    pipeline = pipeline.jpeg({ quality: JPG_QUALITY, progressive: true, mozjpeg: true });
  }

  const buffer = await pipeline.toBuffer();
  if (buffer.length >= before) {
    // Recompression made it bigger — keep original
    return { filePath, skipped: true, before };
  }

  fs.writeFileSync(filePath, buffer);
  return { filePath, before, after: buffer.length };
}

(async () => {
  let totalBefore = 0;
  let totalAfter = 0;
  let processed = 0;
  let skipped = 0;

  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const fp = path.join(dir, entry.name);
      try {
        const result = await optimize(fp);
        if (!result) continue;
        if (result.skipped) {
          skipped++;
          console.log(`  ⊝ ${path.relative(ROOT, fp)} kept (${bytesToKB(result.before)})`);
          continue;
        }
        totalBefore += result.before;
        totalAfter += result.after;
        processed++;
        const pct = (((result.before - result.after) / result.before) * 100).toFixed(0);
        console.log(`  ✓ ${path.relative(ROOT, fp)} ${bytesToKB(result.before)} → ${bytesToKB(result.after)} (-${pct}%)`);
      } catch (err) {
        console.error(`  ✗ ${path.relative(ROOT, fp)}: ${err.message}`);
      }
    }
  }

  console.log('');
  console.log(`Total: ${processed} optimized, ${skipped} skipped`);
  if (processed > 0) {
    const savedMB = ((totalBefore - totalAfter) / (1024 * 1024)).toFixed(2);
    const beforeMB = (totalBefore / (1024 * 1024)).toFixed(2);
    const afterMB = (totalAfter / (1024 * 1024)).toFixed(2);
    console.log(`Saved: ${savedMB} MB (${beforeMB} MB → ${afterMB} MB)`);
  }
  console.log(`Backups in: ${path.relative(ROOT, BACKUP_DIR)}/`);
})();
