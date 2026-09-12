import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const appUrl = process.env.READER_URL || "http://127.0.0.1:3000";
const epubPath = resolve(process.argv[2] || "tests/fixtures/paginated.epub");
const browserPath = process.env.CHROME_PATH || [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find(existsSync);

if (!browserPath) {
  throw new Error("Chrome or Brave is required. Set CHROME_PATH to the browser executable.");
}

const browser = await chromium.launch({
  executablePath: browserPath,
  headless: true,
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(appUrl);
  await page.locator('input[type="file"]').setInputFiles(epubPath);
  await page.waitForFunction(() => {
    const label = document.querySelector(".upload-button")?.textContent || "";
    return label.includes("Change book") || Boolean(document.querySelector(".reader-error"));
  }, null, { timeout: 120_000 });
  const readerError = await page.locator(".reader-error").textContent().catch(() => null);
  if (readerError) {
    throw new Error(`Reader failed to open EPUB: ${readerError}`);
  }
  await page.locator(".epub-mount iframe").waitFor({ timeout: 30_000 });

  const readings = [];
  let sawReadablePage = false;
  const maxTurns = Number(process.env.MAX_TURNS || 80);
  for (let turn = 0; turn < maxTurns; turn += 1) {
    const frame = page.locator(".epub-mount iframe").contentFrame();
    const text = (await frame.locator("body").innerText()).replace(/\s+/g, " ").trim();
    const imageCount = await frame.locator("img, svg image").count();
    const visibleTextLength = await frame.locator("body").evaluate((body) => {
      const view = body.ownerDocument.defaultView;
      if (!view) return 0;
      const walker = body.ownerDocument.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      let visibleCharacters = 0;
      let node = walker.nextNode();
      while (node) {
        const value = node.textContent?.trim() || "";
        if (value) {
          const range = body.ownerDocument.createRange();
          range.selectNodeContents(node);
          const isVisible = [...range.getClientRects()].some((rect) =>
            rect.bottom > 0 && rect.right > 0 && rect.top < view.innerHeight && rect.left < view.innerWidth
          );
          if (isVisible) visibleCharacters += value.length;
        }
        node = walker.nextNode();
      }
      return visibleCharacters;
    });
    const pageLabel = await page.locator(".rail-page").innerText();
    const layout = visibleTextLength === 0 && text.length > 0
      ? await frame.locator("body").evaluate((body) => {
          const view = body.ownerDocument.defaultView;
          const firstText = body.ownerDocument.createTreeWalker(body, NodeFilter.SHOW_TEXT).nextNode();
          const range = body.ownerDocument.createRange();
          if (firstText) range.selectNodeContents(firstText);
          return {
            viewport: [view?.innerWidth, view?.innerHeight],
            bodyRect: body.getBoundingClientRect().toJSON(),
            textRects: [...range.getClientRects()].slice(0, 3).map((rect) => rect.toJSON()),
            bodyStyle: view ? {
              padding: view.getComputedStyle(body).padding,
              margin: view.getComputedStyle(body).margin,
              columns: view.getComputedStyle(body).columnWidth,
              overflow: view.getComputedStyle(body).overflow,
            } : null,
          };
        })
      : undefined;
    readings.push({ turn, pageLabel, textLength: text.length, visibleTextLength, imageCount, sample: text.slice(0, 70), layout });
    if (visibleTextLength > 0) sawReadablePage = true;
    if (sawReadablePage && text.length > 0 && visibleTextLength === 0) {
      throw new Error(`Blank rendered page after readable content at turn ${turn}: ${JSON.stringify(readings.at(-1))}`);
    }
    await page.getByRole("button", { name: "Next page" }).click();
    await page.waitForTimeout(150);
  }

  process.stdout.write(`${JSON.stringify({ readings, errors }, null, 2)}\n`);
} finally {
  await browser.close();
}
