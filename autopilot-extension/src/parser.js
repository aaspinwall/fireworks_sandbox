/* Autopilot – turns Air Canada availability JSON into a flat list of flights/fares,
   and reads fare text out of the rendered page. Pure functions (DOM-free). */
(function (root) {
  const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const first = (o, paths) => {
    for (const p of paths) { const v = get(o, p); if (v != null && v !== '') return v; }
    return undefined;
  };
  const num = (v) => { const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.\-]/g, '')) : Number(v); return Number.isFinite(n) ? n : NaN; };

  function minutesOfDay(dateTime) {
    const m = /T(\d{2}):(\d{2})/.exec(dateTime || '');
    return m ? +m[1] * 60 + +m[2] : NaN;
  }

  /** Extract flights from an air-bounds style response. Returns [{from,to,depMin,arrMin,flightNumbers,fares:[{cabin,points,taxes,cash}]}]. */
  function parseAvailability(body) {
    const data = (body && body.data) || body || {};
    const groups = data.airBoundGroups || [];
    const flightDict = get(body, 'dictionaries.flight') || get(data, 'dictionaries.flight') || {};
    const out = [];
    for (const g of groups) {
      const bd = g.boundDetails || {};
      const segs = (bd.segments || []).map((s) => flightDict[s.flightId] || {});
      const firstSeg = segs[0] || {};
      const lastSeg = segs[segs.length - 1] || {};
      const flight = {
        from: first(bd, ['origin.airportCode', 'origin.code']) || get(firstSeg, 'departure.locationCode'),
        to: first(bd, ['destination.airportCode', 'destination.code']) || get(lastSeg, 'arrival.locationCode'),
        depMin: minutesOfDay(get(firstSeg, 'departure.dateTime')),
        arrMin: minutesOfDay(get(lastSeg, 'arrival.dateTime')),
        flightNumbers: segs.map((s) => `${s.marketingAirlineCode || ''}${s.marketingFlightNumber || ''}`).filter(Boolean),
        fares: []
      };
      for (const b of g.airBounds || []) {
        const p = b.prices || {};
        const points = num(first(p, ['milesConversion.convertedMiles.total', 'milesConversion.convertedMiles.base']));
        if (!(points > 0)) continue;
        const taxes = num(first(p, ['milesConversion.remainingNonConverted.total', 'milesConversion.remainingNonConverted.base']));
        // A cash fare for the same seat, when the response carries one.
        const cash = num(first(p, ['totalPrices.0.total', 'unitPrices.0.prices.0.total', 'cashPrice.total']));
        flight.fares.push({
          cabin: first(b, ['availabilityDetails.0.cabin', 'fareFamilyCode']),
          points,
          apiTaxes: taxes,
          apiCash: cash
        });
      }
      if (flight.fares.length) out.push(flight);
    }
    return out;
  }

  /** API money may be minor units (cents). Pick the scale that makes API taxes agree with the taxes printed on the page. */
  function cashScale(apiTaxes, domTaxes) {
    if (!(apiTaxes > 0) || !(domTaxes > 0)) return 1;
    const r = domTaxes / apiTaxes;
    return [1, 0.1, 0.01].reduce((best, s) => (Math.abs(Math.log(r / s)) < Math.abs(Math.log(r / best)) ? s : best), 1);
  }

  /** "12,500 pts + $68.45" style text -> {points, taxes} */
  function parseFareText(text) {
    const p = /(\d{1,3}(?:[,\s]\d{3})+|\d{3,6})\s*(?:pts|points|pt)\b/i.exec(text);
    if (!p) return null;
    const points = num(p[1].replace(/[,\s]/g, ''));
    const after = text.slice(p.index + p[0].length);
    const t = /\+\s*(?:CAD|USD|C?\$)?\s*\$?\s*(\d[\d,]*(?:\.\d{1,2})?)/i.exec(after);
    return { points, taxes: t ? num(t[1]) : 0 };
  }

  /** All clock times in a blob of text, as minutes-of-day (handles AM/PM). */
  function timesIn(text) {
    const res = [];
    const re = /\b(\d{1,2}):(\d{2})\s*([AaPp]\.?[Mm]\.?)?/g;
    let m;
    while ((m = re.exec(text))) {
      let h = +m[1];
      const min = +m[2];
      if (m[3]) { const pm = /p/i.test(m[3]); h = (h % 12) + (pm ? 12 : 0); }
      if (h < 24 && min < 60) res.push(h * 60 + min);
    }
    return res;
  }

  function matchFare(flights, cardTimes, points, domTaxes) {
    const sameTime = (f) => cardTimes.includes(f.depMin);
    const pool = flights.filter(sameTime);
    // A card whose departure time matches no known flight must not borrow another flight's fare.
    for (const list of cardTimes.length ? [pool] : [flights]) {
      const hits = [];
      for (const f of list) for (const fare of f.fares) if (fare.points === points) hits.push({ f, fare });
      const exact = hits.filter((h) => !(h.fare.apiTaxes > 0) || !(domTaxes > 0) || Math.abs(h.fare.apiTaxes * cashScale(h.fare.apiTaxes, domTaxes) - domTaxes) < 0.5);
      if (exact.length >= 1 && (exact.length === 1 || cardTimes.length)) return exact[0];
    }
    return null;
  }

  const api = { parseAvailability, parseFareText, timesIn, cashScale, matchFare, minutesOfDay };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AutopilotParser = api;
})(typeof self !== 'undefined' ? self : this);
