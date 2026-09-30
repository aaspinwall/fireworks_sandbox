/* Autopilot – content script. Finds points prices on the Aeroplan results page,
   works out cents-per-point, and attaches a colour-coded badge to each one. */
(function () {
  const V = self.AutopilotValuation;
  const P = self.AutopilotParser;
  const TAG = 'autopilot-flight-data';
  const LABEL = { gold: 'Gold', green: 'Good', red: 'Pay cash', unknown: 'Add cash price' };

  let settings = Object.assign({}, V.DEFAULTS);
  let flights = [];
  const manualCash = new Map(); // in-memory only, key -> cash fare
  const results = []; // {el, card, label, ev}
  let scanTimer = null;

  // ---- data from the page's own network responses ----
  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.source !== TAG) return;
    try {
      const parsed = P.parseAvailability(e.data.body);
      if (parsed.length) { flights = parsed; scheduleScan(true); }
    } catch (err) { /* ignore unparseable payloads */ }
  });

  // ---- settings ----
  try {
    chrome.storage.sync.get(V.DEFAULTS, (s) => { settings = Object.assign({}, V.DEFAULTS, s); scheduleScan(true); });
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area !== 'sync') return;
      for (const k in ch) settings[k] = ch[k].newValue;
      scheduleScan(true);
    });
  } catch (e) { /* storage unavailable: use defaults */ }

  // ---- DOM scanning ----
  const PRICE_RE = /(\d{1,3}(?:[,\s]\d{3})+|\d{3,6})\s*(?:pts|points|pt)\b/i;

  function findPriceElements() {
    const found = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        const p = n.parentElement;
        if (!p || p.closest('.ap-badge, .ap-root, script, style')) return NodeFilter.FILTER_REJECT;
        return PRICE_RE.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    while (walker.nextNode()) {
      let el = walker.currentNode.parentElement;
      // grow to the smallest element that also holds the "+ $taxes" part
      for (let i = 0; i < 3 && el.parentElement && !/\+\s*\$?\s*\d/.test(el.textContent); i++) el = el.parentElement;
      if (el.textContent.length < 120) found.add(el);
    }
    // drop elements nested inside another matched element
    return [...found].filter((el) => ![...found].some((o) => o !== el && o.contains(el)));
  }

  function findCard(el) {
    let n = el;
    for (let i = 0; i < 12 && n.parentElement && n.parentElement !== document.body; i++) {
      n = n.parentElement;
      if (P.timesIn(n.textContent).length >= 2) return n;
    }
    return null;
  }

  function scan() {
    scanTimer = null;
    if (!document.body) return;
    document.querySelectorAll('.ap-badge').forEach((b) => b.remove());
    results.length = 0;
    if (!settings.enabled) { renderPanel(); return; }
    for (const el of findPriceElements()) {
      const fare = P.parseFareText(el.textContent);
      if (!fare) continue;
      const card = findCard(el);
      const cardText = card ? card.textContent : '';
      const hit = P.matchFare(flights, P.timesIn(cardText), fare.points, fare.taxes);
      const key = `${cardText.replace(/\s+/g, ' ').slice(0, 200)}|${fare.points}`;
      let cash = NaN;
      if (hit && hit.fare.apiCash > 0) cash = hit.fare.apiCash * P.cashScale(hit.fare.apiTaxes, fare.taxes);
      if (!(cash > 0) && manualCash.has(key)) cash = manualCash.get(key);
      const ev = V.evaluate({ points: fare.points, taxes: fare.taxes, cash }, settings);
      if (!ev) continue;
      const badge = makeBadge(ev, key);
      el.insertAdjacentElement('afterend', badge);
      results.push({ el: badge, ev, label: describe(card, hit) });
    }
    renderPanel();
  }

  function scheduleScan(now) {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, now ? 50 : 400);
  }

  // ---- badge + details popover ----
  const money = (n) => (Number.isFinite(n) ? '$' + n.toFixed(2) : '—');
  const pts = (n) => Math.round(n).toLocaleString('en-CA');

  function makeBadge(ev, key) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `ap-badge ap-${ev.rating}`;
    b.textContent = (ev.rating === 'gold' ? '🌟 ' : '') + (ev.cpp != null ? ev.cpp.toFixed(1) + '¢ · ' : '') + LABEL[ev.rating];
    b.title = 'Autopilot – click for breakdown';
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); togglePopover(b, ev, key); });
    return b;
  }

  function togglePopover(anchor, ev, key) {
    const existing = anchor.querySelector('.ap-pop');
    document.querySelectorAll('.ap-pop').forEach((p) => p.remove());
    if (existing) return;
    const pop = document.createElement('div');
    pop.className = 'ap-pop';
    pop.addEventListener('click', (e) => e.stopPropagation());
    const row = (k, v) => `<div class="ap-row"><span>${k}</span><b>${v}</b></div>`;
    if (ev.rating === 'unknown') {
      pop.innerHTML = `<div class="ap-title">Cash price needed</div>
        <p>Autopilot couldn't read the cash fare for this flight. Enter it to see your value (stays in your browser).</p>
        <input type="number" min="0" step="0.01" placeholder="Cash fare, e.g. 642.50"><button type="button" class="ap-go">Calculate</button>`;
      pop.querySelector('.ap-go').addEventListener('click', () => {
        const v = parseFloat(pop.querySelector('input').value);
        if (v > 0) { manualCash.set(key, v); scan(); }
      });
    } else {
      const sav = ev.savings;
      pop.innerHTML = `<div class="ap-title">${LABEL[ev.rating]} redemption</div>` +
        row('Your value', `${ev.cpp.toFixed(2)}¢ / pt`) +
        row('Aeroplan benchmark', `${ev.benchmark.toFixed(2)}¢ / pt`) +
        row('Cash fare', money(ev.cash)) +
        row('Taxes &amp; fees on points', money(ev.taxes)) +
        row(`Est. cash value of ${pts(ev.points)} pts`, money(ev.valueOfPoints)) +
        `<div class="ap-row ap-sum ${sav >= 0 ? 'ap-pos' : 'ap-neg'}"><span>${sav >= 0 ? 'You save' : 'You lose'}</span><b>${money(Math.abs(sav))}</b></div>`;
    }
    anchor.appendChild(pop);
  }
  document.addEventListener('click', () => document.querySelectorAll('.ap-pop').forEach((p) => p.remove()));

  // ---- ranked list panel ----
  let root = null;
  function describe(card, hit) {
    if (hit && hit.f.flightNumbers.length) return `${hit.f.from || ''}→${hit.f.to || ''} ${hit.f.flightNumbers.join('/')}`;
    const t = card ? P.timesIn(card.textContent) : [];
    return t.length ? 'Flight ' + fmt(t[0]) : 'Flight';
  }
  const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  function renderPanel() {
    if (!root) {
      root = document.createElement('div');
      root.className = 'ap-root';
      root.innerHTML = '<button type="button" class="ap-fab">✈ Autopilot</button><div class="ap-panel" hidden></div>';
      document.body.appendChild(root);
      root.querySelector('.ap-fab').addEventListener('click', () => { const p = root.querySelector('.ap-panel'); p.hidden = !p.hidden; });
    }
    root.style.display = results.length && settings.enabled ? '' : 'none';
    const ranked = results.filter((r) => r.ev.cpp != null).sort((a, b) => b.ev.cpp - a.ev.cpp).slice(0, 10);
    const panel = root.querySelector('.ap-panel');
    panel.innerHTML = '<div class="ap-title">Best redemptions on this page</div>' +
      (ranked.length ? '' : '<p>No cash prices available yet.</p>');
    ranked.forEach((r, i) => {
      const a = document.createElement('button');
      a.type = 'button';
      a.className = `ap-item ap-${r.ev.rating}`;
      a.textContent = `${i + 1}. ${r.label} — ${pts(r.ev.points)} pts · ${r.ev.cpp.toFixed(1)}¢`;
      a.addEventListener('click', () => r.el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      panel.appendChild(a);
    });
  }

  // ---- boot ----
  function boot() {
    new MutationObserver((muts) => {
      if (muts.every((m) => [...m.addedNodes, ...m.removedNodes].every((n) => n.nodeType === 1 && n.closest && n.closest('.ap-root, .ap-badge')))) return;
      scheduleScan(false);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    scheduleScan(false);
  }
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
