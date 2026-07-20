import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const manualResponses = [];
const consoleErrors = [];
const pageErrors = [];

page.on('response', (response) => {
  if (response.url().includes('/manual-tiles/')) {
    manualResponses.push({
      url: response.url(),
      status: response.status(),
      contentType: response.headers()['content-type'] || '',
    });
  }
});
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => pageErrors.push(error.message));

await page.goto('http://127.0.0.1:5173/tour-output/index.html', {
  waitUntil: 'load',
  timeout: 30000,
});
await page.waitForTimeout(2500);

const mainTitle = page.locator('.tour-title #title');
const mainTitleBefore = (await mainTitle.textContent())?.trim() || '';
const mainCanvas = page.locator('#stage canvas');
const canvasCount = await mainCanvas.count();
const canvasBuffer = canvasCount ? await mainCanvas.screenshot() : null;
const canvasStats = canvasBuffer ? await sharp(canvasBuffer).stats() : null;
const canvasVariation = canvasStats
  ? Math.max(...canvasStats.channels.slice(0, 3).map((channel) => channel.stdev))
  : 0;

const quickButtons = page.locator('#quickEntry button');
const quickButtonCount = await quickButtons.count();
if (quickButtonCount < 3) {
  throw new Error(`Expected at least 3 quick buttons, found ${quickButtonCount}`);
}

await quickButtons.nth(2).click();
await page.waitForTimeout(1800);

const modalOpenBeforeHotspot = await page.locator('#quickModal').evaluate((element) =>
  element.classList.contains('open'),
);
const quickTitleBefore = (await page.locator('#quickTitle').textContent())?.trim() || '';
const quickMarkers = page.locator('#quickStage .tour-marker');
const quickMarkerCount = await quickMarkers.count();

if (!quickMarkerCount) {
  throw new Error('Quick scene did not render a hotspot');
}

await quickMarkers.first().click({ force: true });
await page.waitForTimeout(1800);

const modalOpenAfterHotspot = await page.locator('#quickModal').evaluate((element) =>
  element.classList.contains('open'),
);
const quickTitleAfter = (await page.locator('#quickTitle').textContent())?.trim() || '';
const mainTitleAfter = (await mainTitle.textContent())?.trim() || '';

const failedManualResponses = manualResponses.filter((response) => response.status !== 200);
const jpgRequests = manualResponses.filter((response) => /\.jpe?g(?:\?|$)/i.test(response.url));
const nonWebpResponses = manualResponses.filter(
  (response) =>
    !/\.webp(?:\?|$)/i.test(response.url) ||
    !response.contentType.toLowerCase().includes('image/webp'),
);

const editorPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const editorManualResponses = [];
const editorErrors = [];
editorPage.on('response', (response) => {
  if (response.url().includes('/manual-tiles/')) {
    editorManualResponses.push({
      url: response.url(),
      status: response.status(),
      contentType: response.headers()['content-type'] || '',
    });
  }
});
editorPage.on('console', (message) => {
  if (message.type() === 'error') editorErrors.push(message.text());
});
editorPage.on('pageerror', (error) => editorErrors.push(error.message));
await editorPage.goto('http://127.0.0.1:5176/', {
  waitUntil: 'load',
  timeout: 30000,
});
await editorPage.waitForTimeout(2500);
const editorCanvasCount = await editorPage.locator('canvas').count();
const editorFailedResponses = editorManualResponses.filter(
  (response) => response.status !== 200,
);
const editorJpgRequests = editorManualResponses.filter((response) =>
  /\.jpe?g(?:\?|$)/i.test(response.url),
);
const editorNonWebpResponses = editorManualResponses.filter(
  (response) =>
    !/\.webp(?:\?|$)/i.test(response.url) ||
    !response.contentType.toLowerCase().includes('image/webp'),
);

console.log(
  JSON.stringify({
    mainTitleBefore,
    mainTitleAfter,
    canvasCount,
    canvasVariation,
    quickButtonCount,
    modalOpenBeforeHotspot,
    modalOpenAfterHotspot,
    quickMarkerCount,
    quickTitleBefore,
    quickTitleAfter,
    quickTitleChanged: quickTitleBefore !== quickTitleAfter,
    mainTitleUnchanged: mainTitleBefore === mainTitleAfter,
    manualResponses: manualResponses.length,
    failedManualResponses: failedManualResponses.length,
    jpgRequests: jpgRequests.length,
    nonWebpResponses: nonWebpResponses.length,
    responseSamples: manualResponses.slice(0, 12),
    consoleErrors,
    pageErrors,
    editorCanvasCount,
    editorManualResponses: editorManualResponses.length,
    editorFailedResponses: editorFailedResponses.length,
    editorJpgRequests: editorJpgRequests.length,
    editorNonWebpResponses: editorNonWebpResponses.length,
    editorErrors,
  }),
);

await browser.close();
