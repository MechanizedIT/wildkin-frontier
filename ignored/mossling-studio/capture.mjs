import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => console.error(error.message));
  await page.goto('http://localhost:8080/ignored/mossling-studio/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.ready === true, { timeout: 20_000 });
  await page.screenshot({ path: 'ignored/mossling-studio/mossling-factory-3q.png' });
  console.log(await page.evaluate(() => window.report));
} finally {
  await browser.close();
}
