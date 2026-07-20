import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const workspace = path.resolve(process.cwd());

const findPublishDir = async () => {
  const entries = await fs.readdir(workspace, { withFileTypes: true });
  const matches = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(workspace, entry.name);
    try {
      await Promise.all([
        fs.access(path.join(candidate, 'assets', 'manual-tiles')),
        fs.access(path.join(candidate, 'data', 'project.json')),
      ]);
      matches.push(candidate);
    } catch {
      // Not the publish directory.
    }
  }
  if (matches.length !== 1) {
    throw new Error(`Expected one publish directory, found ${matches.length}`);
  }
  return matches[0];
};

const walkWebp = async (directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkWebp(entryPath)));
    } else if (/\.webp$/i.test(entry.name) && !/\.tmp\.webp$/i.test(entry.name)) {
      files.push(entryPath);
    }
  }
  return files;
};

const mapConcurrent = async (items, limit, callback) => {
  let nextIndex = 0;
  const results = [];
  const worker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await callback(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
};

const publishDir = await findPublishDir();
const tileRoot = path.join(publishDir, 'assets', 'manual-tiles');
const project = JSON.parse(
  await fs.readFile(path.join(publishDir, 'data', 'project.json'), 'utf8'),
);
const faces = ['f', 'r', 'b', 'l', 'u', 'd'];
const expected = [];

for (const scene of project.scenes || []) {
  const tiles = scene.krpanoTiles;
  if (!tiles?.pattern) continue;
  const relativePattern = tiles.pattern
    .replace(/^\/tour-output\//, '')
    .replace(/^\.\//, '');
  for (const face of faces) {
    const relative = relativePattern
      .replaceAll('{face}', face)
      .replaceAll('{level}', String(tiles.level || 1))
      .replaceAll('{row}', '1')
      .replaceAll('{col}', '1');
    expected.push(path.resolve(publishDir, relative));
  }
}

const missing = [];
for (const filePath of expected) {
  try {
    await fs.access(filePath);
  } catch {
    missing.push(filePath);
  }
}

const files = (await walkWebp(tileRoot)).sort();
const invalid = [];
const dimensions = {};
const metadata = await mapConcurrent(files, 12, async (filePath) => {
  try {
    const info = await sharp(filePath).metadata();
    if (info.format !== 'webp' || !info.width || !info.height) {
      invalid.push(`${filePath}: ${JSON.stringify(info)}`);
    }
    const key = `${info.width}x${info.height}`;
    dimensions[key] = (dimensions[key] || 0) + 1;
    return { filePath, size: (await fs.stat(filePath)).size };
  } catch (error) {
    invalid.push(`${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    return { filePath, size: 0 };
  }
});

const largest = [...metadata].sort((a, b) => b.size - a.size).slice(0, 12);
const distributed = files.filter((_, index) => index % 55 === 0);
const decodeSamples = [
  ...new Map([...largest, ...distributed.map((filePath) => ({ filePath }))].map(
    (item) => [item.filePath, item],
  )).values(),
];
const decodeFailures = [];

await mapConcurrent(decodeSamples, 4, async ({ filePath }) => {
  try {
    await sharp(filePath).raw().toBuffer();
  } catch (error) {
    decodeFailures.push(
      `${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

const expectedSet = new Set(expected.map((filePath) => path.resolve(filePath)));
const unreferenced = files.filter((filePath) => !expectedSet.has(path.resolve(filePath)));

console.log(
  JSON.stringify({
    scenes: (project.scenes || []).length,
    expectedFaces: expected.length,
    webpFiles: files.length,
    missingFaces: missing.length,
    unreferencedWebp: unreferenced.length,
    invalidHeaders: invalid.length,
    decodedSamples: decodeSamples.length,
    decodeFailures: decodeFailures.length,
    dimensions,
    missingSamples: missing.slice(0, 5),
    invalidSamples: invalid.slice(0, 5),
    decodeFailureSamples: decodeFailures.slice(0, 5),
  }),
);
