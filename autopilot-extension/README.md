# Autopilot – Aeroplan point value (Chrome extension)

Colour-coded cents-per-point badges on Air Canada Aeroplan award results.
🌟 Gold ≥ benchmark × 1.6 · 🟢 Green ≥ benchmark (default 1.5¢) · 🔴 Red below. Click a badge for the breakdown; the **✈ Autopilot** button lists the best redemptions on the page.

## Install
`chrome://extensions` → Developer mode → **Load unpacked** → select this folder.

## How it works
- `src/intercept.js` (page world) clones the site's own JSON responses that contain `airBound` data and posts them to the content script. No requests of its own; no data leaves the browser.
- `src/parser.js` reads the flights/fares, and reads `NN,NNN pts + $tax` text from the DOM; fares are matched to cards by departure time and points.
- `src/valuation.js`: `cpp = (cash fare − taxes paid) / points × 100`; savings = cash saved − points × benchmark.
- Settings (benchmark, gold multiple, on/off) via the toolbar popup, stored in `chrome.storage.sync`.

## Caveats
Written without access to a live Aeroplan session: the JSON field names (`airBoundGroups`, `milesConversion`, …) and card markup are best-effort and tolerant, and need checking against the real site. If a cash fare isn't in the response, the badge is grey and asks for the cash price (kept in memory only).

## Test
`node test/test.js` (logic) · `NODE_PATH=$(npm root -g) node test/smoke.js` (mock page, needs Playwright).
