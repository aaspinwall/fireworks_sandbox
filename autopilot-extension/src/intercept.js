/* Runs in the page's own JS world so it can observe the site's fetch/XHR responses.
   Clones JSON responses that look like flight availability data and hands them to
   the content script via window.postMessage. Nothing leaves the browser. */
(function () {
  if (window.__autopilotIntercept) return;
  window.__autopilotIntercept = true;
  const TAG = 'autopilot-flight-data';
  const looksRelevant = (text) => text && text.indexOf('airBound') !== -1;

  function emit(text, url) {
    try {
      if (!looksRelevant(text)) return;
      window.postMessage({ source: TAG, url: String(url || ''), body: JSON.parse(text) }, '*');
    } catch (e) { /* not JSON */ }
  }

  const origFetch = window.fetch;
  window.fetch = function () {
    const p = origFetch.apply(this, arguments);
    try {
      const req = arguments[0];
      const url = typeof req === 'string' ? req : req && req.url;
      p.then((res) => {
        const ct = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
        if (ct.indexOf('json') !== -1) res.clone().text().then((t) => emit(t, url)).catch(() => {});
      }).catch(() => {});
    } catch (e) {}
    return p;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.addEventListener('load', function () {
      try {
        if (this.responseType === '' || this.responseType === 'text') emit(this.responseText, url);
        else if (this.responseType === 'json' && this.response) emit(JSON.stringify(this.response), url);
      } catch (e) {}
    });
    return origOpen.apply(this, arguments);
  };
})();
