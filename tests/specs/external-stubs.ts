import type { Page } from '@playwright/test';

/**
 * The pages load three third-party resources: the Tailwind Play CDN, Google
 * Fonts and ~17 Unsplash photos. Letting a pull request gate depend on all
 * three staying reachable means red CI for reasons that have nothing to do
 * with the diff, so the render check serves local stand-ins instead.
 *
 * What this deliberately does NOT cover is whether the real CDNs behave; the
 * URLs themselves are checked statically in render.spec.ts, and the Vercel
 * deployment exercises the real thing.
 */

// 1x1 transparent PNG.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * Stands in for the Tailwind Play CDN. The pages assign `tailwind.config`
 * immediately after the script tag, so the global has to exist or every page
 * throws. Only the utilities the tests actually rely on are reproduced, with
 * the same breakpoint semantics Tailwind gives them.
 */
const TAILWIND_STUB = `
window.tailwind = { config: {} };
var style = document.createElement('style');
style.setAttribute('data-tailwind-stub', '');
style.textContent = [
  '.hidden { display: none; }',
  '@media (min-width: 768px) { .md\\\\:hidden { display: none; } }'
].join('\\n');
document.head.appendChild(style);
`;

export async function stubExternalResources(page: Page): Promise<void> {
  await page.route('https://cdn.tailwindcss.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: TAILWIND_STUB }),
  );
  await page.route('https://cdn.tailwindcss.com', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: TAILWIND_STUB }),
  );
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: '/* fonts stubbed */' }),
  );
  await page.route('https://fonts.gstatic.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'font/woff2', body: Buffer.alloc(0) }),
  );
  await page.route('https://images.unsplash.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
  );
}
