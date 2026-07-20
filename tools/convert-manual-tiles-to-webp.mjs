import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const QUALITY = 90;
const EFFORT = 4;
const WORKERS = Math.max(1, Math.min(4, os.cpus().length));

const root = path.resolve(process.argv[2] || '');
const workspace = path.resolve(process.cwd());
const relativeRoot = path.relative(workspace, root);

if (
  !root ||
  relativeRoot.startsWith('..') ||
  path.isAbsolute(relativeRoot) ||
  path.basename(root).toLowerCase() !== 'manual-tiles'
) {
  throw new Error(`Unexpected manual tiles root: ${root}`);
}

const walk = async (directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(entryPath)));
    } else if (/\.(jpe?g)$/i.test(entry.name)) {
      files.push(entryPath);
    }
  }
  return files;
};

const sources = (await walk(root)).sort();
console.log(
  `START files=${sources.length} quality=${QUALITY} effort=${EFFORT} workers=${WORKERS} root=${root}`,
);

let nextIndex = 0;
let converted = 0;
let oldBytes = 0;
let newBytes = 0;
const failures = [];
const started = Date.now();

sharp.cache(false);
sharp.concurrency(1);

const convertOne = async (source) => {
  const relative = path.relative(root, source);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Source outside manual tiles root: ${source}`);
  }

  const target = source.replace(/\.(jpe?g)$/i, '.webp');
  const temporary = target.replace(/\.webp$/i, '.tmp.webp');
  const sourceMetadata = await sharp(source).metadata();

  await sharp(source)
    .keepIccProfile()
    .webp({ quality: QUALITY, effort: EFFORT, smartSubsample: true })
    .toFile(temporary);

  const targetMetadata = await sharp(temporary).metadata();
  if (
    sourceMetadata.width !== targetMetadata.width ||
    sourceMetadata.height !== targetMetadata.height
  ) {
    throw new Error(
      `Dimension mismatch: ${sourceMetadata.width}x${sourceMetadata.height} -> ` +
        `${targetMetadata.width}x${targetMetadata.height}`,
    );
  }

  const [sourceStat, targetStat] = await Promise.all([
    fs.stat(source),
    fs.stat(temporary),
  ]);
  await fs.rm(target, { force: true });
  await fs.rename(temporary, target);
  await fs.unlink(source);
  return { relative, oldBytes: sourceStat.size, newBytes: targetStat.size };
};

const worker = async () => {
  while (true) {
    const index = nextIndex;
    nextIndex += 1;
    if (index >= sources.length) return;
    const source = sources[index];
    try {
      const result = await convertOne(source);
      converted += 1;
      oldBytes += result.oldBytes;
      newBytes += result.newBytes;
      if (converted % 20 === 0 || converted === sources.length) {
        const elapsed = (Date.now() - started) / 1000;
        const saved = oldBytes ? 100 * (1 - newBytes / oldBytes) : 0;
        console.log(
          `PROGRESS ${converted}/${sources.length} elapsed=${elapsed.toFixed(1)}s ` +
            `saved=${saved.toFixed(1)}% last=${result.relative}`,
        );
      }
    } catch (error) {
      failures.push(`${source}: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`ERROR ${source}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

await Promise.all(Array.from({ length: WORKERS }, () => worker()));

const elapsed = (Date.now() - started) / 1000;
const saved = oldBytes ? 100 * (1 - newBytes / oldBytes) : 0;
console.log(
  `DONE converted=${converted} failed=${failures.length} old_bytes=${oldBytes} ` +
    `new_bytes=${newBytes} saved=${saved.toFixed(1)}% elapsed=${elapsed.toFixed(1)}s`,
);
if (failures.length) process.exitCode = 1;
