import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { execFile } from 'node:child_process';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(rootDir, '\u53d1\u5e03\u6d4f\u89c8\u9875');
const cubeToolDir = 'D:\\desk\\change-6';
const cubeTransformPath = path.join(cubeToolDir, 'ktransform.exe');
const cubeSourceConfigPath = path.join(cubeToolDir, 'convertdroplets.config');
const cubeJpgConfigPath = path.join(rootDir, 'tools', 'change-6-jpg.config');

const sendJson = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
};

const readRequestBody = (req) =>
  new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });

const readRawBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

const safeFilePart = (value, fallback = 'asset') => {
  const cleaned = String(value || '')
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96);
  return cleaned || fallback;
};

const safeFolderPart = (value, fallback = 'scene') =>
  safeFilePart(value, fallback)
    .replace(/\.[^.]+$/i, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || fallback;

const writeDataUrlFile = async (filePath, dataUrl) => {
  const match = /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.*)$/i.exec(dataUrl || '');
  if (!match) return false;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(match[2], 'base64'));
  return true;
};

const findFallbackAssetPath = async (targetPath, relativePath) => {
  const normalizedRelative = relativePath.replace(/\\/g, '/');
  if (!/^assets\/(panoramas|maps|thumbs|planets)\//.test(normalizedRelative)) return null;
  const fileName = path.basename(targetPath);
  const strippedName = fileName.replace(/^\d{10,}-/, '');
  if (strippedName === fileName) return null;
  const fallbackPath = path.join(path.dirname(targetPath), strippedName);
  try {
    await fs.access(fallbackPath);
    return fallbackPath;
  } catch {
    return null;
  }
};

const ensureCubeJpgConfig = async () => {
  await fs.access(cubeTransformPath);
  const sourceConfig = await fs.readFile(cubeSourceConfigPath, 'utf8');
  const jpgConfig = sourceConfig
    .replace(/(\[Convert SPHERE to CUBE\][\s\S]*?)outputformat\s*=\s*\w+/i, '$1outputformat=jpg')
    .replace(/(\[Convert SPHERE to CUBE\][\s\S]*?)jpegquality\s*=\s*\d+/i, '$1jpegquality=100')
    .replace(/(\[Convert SPHERE to CUBE\][\s\S]*?)jpegsubsamp\s*=\s*\d+/i, '$1jpegsubsamp=444')
    .replace(/(\[Convert SPHERE to CUBE\][\s\S]*?)jpegoptimize\s*=\s*\w+/i, '$1jpegoptimize=true');
  await fs.mkdir(path.dirname(cubeJpgConfigPath), { recursive: true });
  await fs.writeFile(cubeJpgConfigPath, jpgConfig, 'utf8');
  return cubeJpgConfigPath;
};

const removeIfExists = async (filePath) => {
  try {
    await fs.rm(filePath, { force: true });
  } catch {
    // ignore cleanup failures
  }
};

const runExecutable = (file, args, options = {}) =>
  new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true, ...options }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${error.message}\n${stderr || stdout || ''}`.trim()));
        return;
      }
      resolve({ stdout, stderr });
    });
  });

const runManualCubeBuild = async (inputPath, sceneId, originalName) => {
  const configPath = await ensureCubeJpgConfig();
  const sceneFolder = safeFolderPart(sceneId || originalName, 'scene');
  const sourceDir = path.dirname(inputPath);
  const sourceBase = path.basename(inputPath, path.extname(inputPath));
  const faces = ['f', 'r', 'b', 'l', 'u', 'd'];

  await Promise.all(
    faces.flatMap((face) => [
      removeIfExists(path.join(sourceDir, `${sourceBase}_${face}.jpg`)),
      removeIfExists(path.join(sourceDir, `${sourceBase}_${face}.jpeg`)),
      removeIfExists(path.join(sourceDir, `${sourceBase}_${face}.tif`)),
      removeIfExists(path.join(sourceDir, `${sourceBase}_${face}.tiff`)),
    ]),
  );

  await new Promise((resolve, reject) => {
    execFile(
      cubeTransformPath,
      [`-config=${configPath}`, inputPath],
      { cwd: cubeToolDir, windowsHide: true, maxBuffer: 1024 * 1024 * 30 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`${error.message}\n${stderr || stdout || ''}`.trim()));
          return;
        }
        resolve();
      },
    );
  });

  const tileRoot = path.join(outputDir, 'assets', 'manual-tiles', sceneFolder);
  await fs.rm(tileRoot, { recursive: true, force: true });
  await fs.mkdir(tileRoot, { recursive: true });

  await Promise.all(
    faces.map(async (face) => {
      const generatedPath = path.join(sourceDir, `${sourceBase}_${face}.jpg`);
      await fs.access(generatedPath);
      const faceDir = path.join(tileRoot, face);
      await fs.mkdir(faceDir, { recursive: true });
      await sharp(generatedPath)
        .webp({ quality: 90, effort: 6, smartSubsample: true })
        .toFile(path.join(faceDir, '1_1.webp'));
      await removeIfExists(generatedPath);
    }),
  );

  const relativeBase = `assets/manual-tiles/${sceneFolder}`;
  return {
    mode: 'manualTiles',
    tileBaseUrl: `/tour-output/${relativeBase}`,
    previewUrl: `/tour-output/${relativeBase}/f/1_1.webp`,
    thumbUrl: `/tour-output/${relativeBase}/f/1_1.webp`,
    pattern: `/tour-output/${relativeBase}/{face}/{row}_{col}.webp`,
    level: 1,
    grid: 1,
    tileSize: 1024,
    faceSize: 1024,
    sourceTool: cubeTransformPath,
    sourceBatch: path.join(cubeToolDir, '分成6面图.bat'),
  };
};

function tourSourceWriterPlugin() {
  return {
    name: 'tour-source-writer',
    configureServer(server) {
      server.middlewares.use('/tour-output', async (req, res) => {
        const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
        const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
        const targetPath = path.normalize(path.join(outputDir, relativePath));

        if (!targetPath.startsWith(outputDir)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }

        try {
          let filePath = targetPath;
          let file;
          try {
            file = await fs.readFile(filePath);
          } catch (error) {
            const fallbackPath = await findFallbackAssetPath(targetPath, relativePath);
            if (!fallbackPath) throw error;
            filePath = fallbackPath;
            file = await fs.readFile(filePath);
          }
          const ext = path.extname(filePath).toLowerCase();
          const type =
            ext === '.html'
              ? 'text/html; charset=utf-8'
              : ext === '.css'
                ? 'text/css; charset=utf-8'
                : ext === '.js'
                  ? 'text/javascript; charset=utf-8'
                  : ext === '.json'
                    ? 'application/json; charset=utf-8'
                    : ext === '.svg'
                      ? 'image/svg+xml'
                      : ext === '.jpg' || ext === '.jpeg'
                        ? 'image/jpeg'
                      : ext === '.png'
                        ? 'image/png'
                        : ext === '.gif'
                          ? 'image/gif'
                          : ext === '.webp'
                            ? 'image/webp'
                            : 'application/octet-stream';
          res.setHeader('Content-Type', type);
          res.end(file);
        } catch {
          res.statusCode = 404;
          res.end('Not found');
        }
      });

      server.middlewares.use('/api/upload-panorama-and-split', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const requestUrl = new URL(req.url || '/', 'http://localhost');
          const sceneId = safeFolderPart(requestUrl.searchParams.get('sceneId'), 'scene');
          const originalName = safeFilePart(requestUrl.searchParams.get('name'), 'panorama.jpg');
          const ext = path.extname(originalName) || '.jpg';
          const base = safeFilePart(path.basename(originalName, ext), 'panorama');
          const filename = `${sceneId}-${base}${ext}`;
          const relativePath = path.join('assets', 'panoramas', filename).replace(/\\/g, '/');
          const targetPath = path.join(outputDir, relativePath);
          const buffer = await readRawBody(req);

          await fs.mkdir(path.dirname(targetPath), { recursive: true });
          await fs.writeFile(targetPath, buffer);

          const manualTiles = await runManualCubeBuild(targetPath, sceneId, filename);

          sendJson(res, 200, {
            path: relativePath,
            url: `/tour-output/${relativePath}`,
            filename,
            size: buffer.length,
            manualTiles,
            krpanoTiles: manualTiles,
          });
        } catch (error) {
          sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
        }
      });

      server.middlewares.use('/api/upload-asset', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const requestUrl = new URL(req.url || '/', 'http://localhost');
          const requestedKind = requestUrl.searchParams.get('kind');
          const allowedKinds = new Set(['maps', 'thumbs', 'animations', 'roaming-audio', 'roaming-guides']);
          const kind = allowedKinds.has(requestedKind) ? requestedKind : 'panoramas';
          const stable = requestUrl.searchParams.get('stable') === '1';
          const originalName = safeFilePart(requestUrl.searchParams.get('name'), `${kind}-asset`);
          const ext = path.extname(originalName) || '.bin';
          const base = safeFilePart(path.basename(originalName, ext), `${kind}-asset`);
          const filename = stable ? `${base}${ext}` : `${Date.now()}-${base}${ext}`;
          const relativePath = path.join('assets', kind, filename).replace(/\\/g, '/');
          const targetPath = path.join(outputDir, relativePath);
          const buffer = await readRawBody(req);
          await fs.mkdir(path.dirname(targetPath), { recursive: true });
          await fs.writeFile(targetPath, buffer);
          sendJson(res, 200, {
            path: relativePath,
            url: `/tour-output/${relativePath}`,
            filename,
            size: buffer.length,
            krpanoTiles: null,
          });
        } catch (error) {
          sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
        }
      });

      server.middlewares.use('/api/download-tour-source', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        const zipPath = path.join(os.tmpdir(), `school-panorama-tour-${Date.now()}.zip`);
        try {
          await removeIfExists(zipPath);
          const projectPath = path.join(outputDir, 'data', 'project.json');
          const project = JSON.parse(await fs.readFile(projectPath, 'utf8'));
          const outputFolder = path.basename(outputDir);
          const entries = new Set([
            `${outputFolder}/index.html`,
            `${outputFolder}/README.txt`,
            `${outputFolder}/data`,
            `${outputFolder}/assets/tour.css`,
            `${outputFolder}/assets/tour.js`,
            `${outputFolder}/assets/maps`,
            `${outputFolder}/assets/thumbs`,
            `${outputFolder}/assets/planets`,
            `${outputFolder}/assets/animations`,
            `${outputFolder}/assets/audio`,
            `${outputFolder}/assets/roaming-audio`,
            `${outputFolder}/assets/roaming-guides`,
          ]);
          const assetPathFromUrl = (url, kind) => {
            const value = String(url || '').split(/[?#]/)[0].replace(/\\/g, '/');
            const marker = `/assets/${kind}/`;
            const index = value.lastIndexOf(marker);
            if (index >= 0) return value.slice(index + marker.length);
            const relativeMarker = `assets/${kind}/`;
            const relativeIndex = value.lastIndexOf(relativeMarker);
            return relativeIndex >= 0 ? value.slice(relativeIndex + relativeMarker.length) : '';
          };
          for (const scene of project.scenes || []) {
            const tiles = scene.krpanoTiles;
            if (tiles?.pattern) {
              const tilePath = assetPathFromUrl(tiles.tileBaseUrl || tiles.pattern, 'manual-tiles');
              const folder = tilePath.split('/')[0];
              if (folder) entries.add(`${outputFolder}/assets/manual-tiles/${folder}`);
              continue;
            }
            const panoramaFile = assetPathFromUrl(scene.imageUrl, 'panoramas');
            if (panoramaFile) entries.add(`${outputFolder}/assets/panoramas/${panoramaFile}`);
          }
          const existingEntries = [];
          for (const entry of entries) {
            try {
              await fs.access(path.join(rootDir, entry));
              existingEntries.push(entry.replace(/\\/g, '/'));
            } catch {
              // Optional assets can be absent.
            }
          }
          await runExecutable(
            'tar.exe',
            ['-a', '-c', '-f', zipPath, '-C', rootDir, ...existingEntries],
            { cwd: rootDir, maxBuffer: 1024 * 1024 * 10 },
          );
          const stat = await fs.stat(zipPath);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/zip');
          res.setHeader('Content-Length', String(stat.size));
          res.setHeader('Content-Disposition', 'attachment; filename="school-panorama-tour.zip"');
          const stream = createReadStream(zipPath);
          let cleaned = false;
          const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            removeIfExists(zipPath);
          };
          stream.on('error', (error) => {
            cleanup();
            if (!res.headersSent) sendJson(res, 500, { error: error.message });
            else res.destroy(error);
          });
          res.on('finish', cleanup);
          res.on('close', cleanup);
          stream.pipe(res);
        } catch (error) {
          await removeIfExists(zipPath);
          sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
        }
      });

      server.middlewares.use('/api/write-tour-source', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const payload = JSON.parse(await readRequestBody(req));
          await fs.mkdir(path.join(outputDir, 'assets', 'panoramas'), { recursive: true });
          await fs.mkdir(path.join(outputDir, 'assets', 'maps'), { recursive: true });
          await fs.mkdir(path.join(outputDir, 'assets', 'thumbs'), { recursive: true });
          await fs.mkdir(path.join(outputDir, 'assets', 'planets'), { recursive: true });
          await fs.mkdir(path.join(outputDir, 'assets', 'animations'), { recursive: true });
          await fs.mkdir(path.join(outputDir, 'assets', 'roaming-audio'), { recursive: true });
          await fs.mkdir(path.join(outputDir, 'assets', 'roaming-guides'), { recursive: true });
          await fs.mkdir(path.join(outputDir, 'assets', 'manual-tiles'), { recursive: true });
          await fs.mkdir(path.join(outputDir, 'data'), { recursive: true });
          await Promise.all(
            (payload.assets || []).map((asset) =>
              writeDataUrlFile(path.join(outputDir, asset.path || ''), asset.dataUrl || ''),
            ),
          );
          await fs.writeFile(path.join(outputDir, 'index.html'), payload.html || '', 'utf8');
          await fs.writeFile(path.join(outputDir, 'assets', 'tour.css'), payload.css || '', 'utf8');
          await fs.writeFile(path.join(outputDir, 'assets', 'tour.js'), payload.js || '', 'utf8');
          await fs.writeFile(path.join(outputDir, 'data', 'project.json'), payload.projectJson || '{}', 'utf8');
          if (payload.previewHtml) {
            await fs.mkdir(path.join(rootDir, 'public'), { recursive: true });
            await fs.writeFile(path.join(rootDir, 'public', 'tour-preview.html'), payload.previewHtml, 'utf8');
          }
          await fs.writeFile(
            path.join(outputDir, 'README.txt'),
            'Open index.html or visit http://localhost:5173/tour-output/index.html to browse the generated school 360 tour.',
            'utf8',
          );
          if (payload.openFolder !== false) {
            execFile('explorer.exe', [outputDir], () => {});
          }
          sendJson(res, 200, {
            outputPath: outputDir,
            url: '/tour-output/index.html',
          });
        } catch (error) {
          sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
        }
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), tourSourceWriterPlugin()],
});
