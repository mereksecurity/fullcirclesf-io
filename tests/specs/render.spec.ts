import { test, expect, type Page } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stubExternalResources } from './external-stubs';

const ROOT = resolve(__dirname, '../..');
const PAGES = readdirSync(ROOT)
  .filter((name) => name.endsWith('.html'))
  .sort();

type Problems = {
  pageErrors: string[];
  consoleErrors: string[];
  badResponses: string[];
};

/**
 * Collect everything the browser complains about while a page loads. Only
 * same-origin trouble counts — third-party noise is stubbed out, and anything
 * that slips past is not this repository's defect.
 */
function watchForProblems(page: Page, origin: string): Problems {
  const problems: Problems = { pageErrors: [], consoleErrors: [], badResponses: [] };

  page.on('pageerror', (error) => {
    problems.pageErrors.push(error.message);
  });

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const from = message.location().url;
    if (from && !from.startsWith(origin)) return;
    problems.consoleErrors.push(message.text());
  });

  page.on('response', (response) => {
    if (!response.url().startsWith(origin)) return;
    if (response.status() >= 400) {
      problems.badResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  return problems;
}

test.describe('pages render', () => {
  for (const name of PAGES) {
    test(name, async ({ page, baseURL }) => {
      const origin = baseURL!;
      await stubExternalResources(page);
      const problems = watchForProblems(page, origin);

      const response = await page.goto(`/${name}`, { waitUntil: 'load' });
      expect(response?.status(), `${name} should be served`).toBe(200);

      // Structure: a header nav, exactly one top-level heading, a footer.
      await expect(page.locator('header nav').first()).toBeAttached();
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('footer')).toBeAttached();

      // The heading ships at opacity:0 and is only revealed by the inline
      // hero-enter script on window.load. Break that script and the page
      // still returns 200 while looking blank to a human, so assert the
      // heading actually fades in rather than merely existing in the DOM.
      const heading = page.locator('h1');
      await expect(heading).toBeVisible();
      await expect
        .poll(() => heading.evaluate((el) => Number(getComputedStyle(el).opacity)), {
          message: `${name}: h1 never faded in — the hero-enter script did not run`,
          timeout: 15_000,
        })
        .toBeGreaterThan(0.9);

      // A page that kept its chrome but lost its body copy is still broken.
      const text = (await page.locator('body').innerText()).trim();
      expect(text.length, `${name} should render substantial copy`).toBeGreaterThan(500);

      expect(problems.pageErrors, `${name}: uncaught JavaScript errors`).toEqual([]);
      expect(problems.consoleErrors, `${name}: console errors`).toEqual([]);
      expect(problems.badResponses, `${name}: failed same-origin requests`).toEqual([]);
    });
  }
});

test('internal links and anchors resolve', async () => {
  const files = new Map(PAGES.map((name) => [name, readFileSync(resolve(ROOT, name), 'utf8')]));
  const broken: string[] = [];

  for (const [name, html] of files) {
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      // Off-site, mail links and deliberate placeholders are not ours to check.
      if (/^(https?:|mailto:|tel:)/.test(href) || href === '#') continue;

      const [target, fragment] = href.split('#');
      const targetName = target === '' ? name : target;
      const targetHtml = files.get(targetName);

      if (targetHtml === undefined) {
        broken.push(`${name} -> ${href} (no such page)`);
      } else if (fragment && !targetHtml.includes(`id="${fragment}"`)) {
        broken.push(`${name} -> ${href} (no element with id="${fragment}")`);
      }
    }
  }

  expect(broken, 'broken internal links').toEqual([]);
});

test('third-party asset URLs stay well formed', async () => {
  // The browser tests stub these hosts for determinism, which means a mangled
  // CDN URL would otherwise slip through unnoticed.
  const allowedHosts = new Set([
    'cdn.tailwindcss.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'images.unsplash.com',
  ]);
  const unexpected: string[] = [];

  for (const name of PAGES) {
    const html = readFileSync(resolve(ROOT, name), 'utf8');
    for (const [, url] of html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)) {
      let host: string;
      try {
        host = new URL(url).host;
      } catch {
        unexpected.push(`${name}: malformed URL ${url}`);
        continue;
      }
      if (!allowedHosts.has(host)) unexpected.push(`${name}: unexpected host ${host}`);
    }
  }

  expect(unexpected, 'unexpected or malformed third-party URLs').toEqual([]);
  // Tailwind provides every utility class on the page; losing it blanks the design.
  const withoutTailwind = PAGES.filter(
    (name) => !readFileSync(resolve(ROOT, name), 'utf8').includes('https://cdn.tailwindcss.com'),
  );
  expect(withoutTailwind, 'pages missing the Tailwind stylesheet').toEqual([]);
});

test('mobile menu opens and closes', async ({ page }) => {
  // The toggle is display:none at and above Tailwind's md breakpoint, so this
  // only means anything on a narrow viewport.
  await page.setViewportSize({ width: 390, height: 844 });
  await stubExternalResources(page);
  await page.goto('/index.html', { waitUntil: 'load' });

  const menu = page.locator('#mobile-menu');
  const toggle = page.locator('header button').first();

  await expect(menu).toBeHidden();
  await toggle.click();
  await expect(menu).toBeVisible();
  await toggle.click();
  await expect(menu).toBeHidden();
});
