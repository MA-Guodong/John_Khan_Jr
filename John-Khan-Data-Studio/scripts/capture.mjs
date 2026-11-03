/**
 * 本地视觉验收脚本：启动无头 Chrome，逐页截图并输出控制台错误。
 *
 * 用法：node scripts/capture.mjs [baseUrl]
 * 依赖本机已安装的 Chrome / Edge。
 */
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(rootDir, 'docs', 'screenshots');
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4000';

const candidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = candidates.find((candidate) => existsSync(candidate));

if (!executablePath) {
  console.error('未找到 Chrome 或 Edge');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const pages = [
  { name: 'overview', path: '/' },
  { name: 'videos', path: '/videos' },
  { name: 'signatures', path: '/signatures' },
  { name: 'avatars', path: '/avatars' },
  { name: 'about', path: '/about' },
];

/** 触发懒加载，确保截图里不会出现半加载的封面。 */
async function primePage(page) {
  await page.evaluate(async () => {
    // 截图前把懒加载全部转为即时加载，避免全页截图时出现未解码的封面。
    for (const image of document.images) image.loading = 'eager';

    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images]
        .filter((image) => !image.complete)
        .map((image) => new Promise((resolve) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
          setTimeout(resolve, 4000);
        })),
    );
  });
  await page.waitForTimeout(600);
}

const browser = await chromium.launch({ executablePath, headless: true });
const errors = [];

for (const scheme of ['light', 'dark']) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    colorScheme: scheme,
  });

  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`[${scheme}] pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`[${scheme}] console: ${message.text()}`);
  });

  for (const target of pages) {
    await page.goto(`${baseUrl}${target.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await primePage(page);

    const folder = scheme === 'light' ? outDir : path.join(outDir, 'dark');
    mkdirSync(folder, { recursive: true });
    await page.screenshot({ path: path.join(folder, `${target.name}.png`), fullPage: true });

    if (scheme === 'light' && target.name === 'overview') {
      // 悬停在主图表上，确认 tooltip 样式。
      const chart = page.locator('canvas').first();
      const box = await chart.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.55);
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(folder, 'overview-tooltip.png') });
      }
      await page.mouse.move(0, 0);
    }

    const rootLength = await page.evaluate(() => document.getElementById('root')?.innerHTML.length ?? 0);
    console.log(`${scheme}/${target.name}: root=${rootLength}`);
  }

  await context.close();
}

// 移动端视图
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
const mobilePage = await mobile.newPage();
mobilePage.on('pageerror', (error) => errors.push(`[mobile] pageerror: ${error.message}`));
await mobilePage.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
await mobilePage.waitForTimeout(600);
await primePage(mobilePage);
await mobilePage.screenshot({ path: path.join(outDir, 'mobile-overview.png'), fullPage: true });
await mobile.close();

await browser.close();

if (errors.length > 0) {
  console.log('\n发现前端错误：');
  for (const error of new Set(errors)) console.log(` - ${error}`);
  process.exitCode = 1;
} else {
  console.log('\n没有控制台错误。');
}
