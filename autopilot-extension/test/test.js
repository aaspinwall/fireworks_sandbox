const assert = require('assert');
const V = require('../src/valuation');
const P = require('../src/parser');

// valuation
let e = V.evaluate({ points: 10000, taxes: 50, cash: 400 }, {});
assert.strictEqual(e.cpp.toFixed(2), '3.50'); assert.strictEqual(e.rating, 'gold');
assert.strictEqual(e.valueOfPoints, 150); assert.strictEqual(e.savings, 200);
assert.strictEqual(V.evaluate({ points: 10000, taxes: 50, cash: 230 }, {}).rating, 'green');
e = V.evaluate({ points: 10000, taxes: 50, cash: 150 }, {});
assert.strictEqual(e.rating, 'red'); assert.ok(e.savings < 0);
assert.strictEqual(V.evaluate({ points: 10000, taxes: 50, cash: NaN }, {}).rating, 'unknown');

// text parsing
assert.deepStrictEqual(P.parseFareText('12,500 pts + $68.45'), { points: 12500, taxes: 68.45 });
assert.deepStrictEqual(P.parseFareText('Economy 9500 pts +CAD $5.60'), { points: 9500, taxes: 5.6 });
assert.deepStrictEqual(P.timesIn('Dep 8:15 AM arr 11:40 PM 14:05'), [495, 1420, 845]);

// API parsing + matching
const body = { data: { airBoundGroups: [{
  boundDetails: { origin: { airportCode: 'YYZ' }, destination: { airportCode: 'LAX' }, segments: [{ flightId: 'f1' }] },
  airBounds: [{ fareFamilyCode: 'ECO', prices: { milesConversion: { convertedMiles: { total: 15000 }, remainingNonConverted: { total: 6845 } }, totalPrices: [{ total: 54000 }] } }]
}] }, dictionaries: { flight: { f1: { marketingAirlineCode: 'AC', marketingFlightNumber: '791', departure: { locationCode: 'YYZ', dateTime: '2026-11-05T08:15:00' }, arrival: { locationCode: 'LAX', dateTime: '2026-11-05T10:30:00' } } } } };
const fl = P.parseAvailability(body);
assert.strictEqual(fl.length, 1); assert.strictEqual(fl[0].depMin, 495); assert.deepStrictEqual(fl[0].flightNumbers, ['AC791']);
const hit = P.matchFare(fl, [495, 630], 15000, 68.45);
assert.ok(hit); assert.strictEqual(P.cashScale(hit.fare.apiTaxes, 68.45), 0.01);
assert.strictEqual(hit.fare.apiCash * 0.01, 540);
console.log('all tests passed');
