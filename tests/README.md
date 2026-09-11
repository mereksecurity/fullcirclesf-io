# Render check

A Playwright suite that loads every page in a real browser and asserts it
actually renders — not just that the server returned 200.

```bash
npm ci
npx playwright install chromium
npm run test:render
```

`npm run serve` starts the same static server on its own at
<http://localhost:4173> if you want to poke at the pages by hand.

## What it checks

For each `*.html` file at the repository root (new pages are picked up
automatically):

- the page is served and returns 200;
- it has a header nav, exactly one `<h1>` and a footer;
- the `<h1>` **fades in** — the headings ship at `opacity:0` and are only
  revealed by the inline `hero-enter` script on `window.load`, so a broken
  script leaves a page that looks blank to a human while still returning 200;
- it renders a substantial amount of body copy;
- no uncaught JavaScript errors, console errors or failed same-origin requests.

Across the whole site:

- every internal link and `#anchor` resolves to a page and element that exist;
- third-party URLs point at the expected hosts and are well formed;
- the mobile menu opens and closes on a narrow viewport.

## Why the third-party hosts are stubbed

The pages pull Tailwind, Google Fonts and ~17 Unsplash photos over the
network. Gating pull requests on three external services staying up means red
CI for reasons unrelated to the change, so `specs/external-stubs.ts` serves
local stand-ins. The trade-off is that this suite does not prove the real CDNs
behave — the URLs are checked statically instead, and the Vercel deployment
exercises the live versions.

## Why it lives here

The repository root is what Netlify and Vercel publish, and both auto-install
when they find a `package.json` there. Keeping the harness in `tests/` leaves
the deployed site untouched.

## Note on the Playwright version

`@playwright/test` is pinned to `~1.56` only because that is the build that was
verifiable in the environment this was written in. CI downloads its own
browser, so bumping it is safe — update the pin and re-run the suite.
