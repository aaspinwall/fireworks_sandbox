/* Autopilot – valuation maths. Pure functions, no DOM, no network. */
(function (root) {
  const DEFAULTS = {
    benchmark: 1.5, // Aeroplan benchmark, cents per point
    goldMultiple: 1.6, // gold when cpp >= benchmark * goldMultiple
    enabled: true
  };

  function num(v) {
    const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.\-]/g, '')) : Number(v);
    return Number.isFinite(n) ? n : NaN;
  }

  /**
   * @param {{points:number, taxes:number, cash:number}} fare  points, cash taxes paid on a points booking, and the full cash fare (same currency)
   * @param {Partial<typeof DEFAULTS>} settings
   */
  function evaluate(fare, settings) {
    const s = Object.assign({}, DEFAULTS, settings || {});
    const points = num(fare.points);
    const taxes = num(fare.taxes) || 0;
    const cash = num(fare.cash);
    if (!(points > 0)) return null;
    const valueOfPoints = (points * s.benchmark) / 100; // what the points are "worth" at benchmark
    if (!(cash > 0)) return { points, taxes, cash: NaN, benchmark: s.benchmark, valueOfPoints, rating: 'unknown' };
    const cashSaved = cash - taxes; // cash you avoid spending by redeeming
    const cpp = (cashSaved / points) * 100;
    const savings = cashSaved - valueOfPoints; // >0: redeeming beats benchmark value
    let rating = 'red';
    if (cpp >= s.benchmark * s.goldMultiple) rating = 'gold';
    else if (cpp >= s.benchmark) rating = 'green';
    return { points, taxes, cash, cpp, benchmark: s.benchmark, valueOfPoints, savings, rating };
  }

  const api = { DEFAULTS, evaluate, num };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AutopilotValuation = api;
})(typeof self !== 'undefined' ? self : this);
