// Loads the content scripts into a mock results page (no real Air Canada DOM needed).
process.on('unhandledRejection',console.log);
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage(); page.on('console',m=>console.log('C',m.text())); page.on('pageerror',e=>console.log('ERR',e.message));
  await page.setContent(`<body><div class="row"><span>08:15</span><span>10:30</span>
    <div class="fare"><span>15,000 pts</span> <span>+ $68.45</span></div></div>
    <div class="row"><span>13:00</span><span>15:10</span><div class="fare"><span>15,000 pts</span> <span>+ $68.45</span></div></div></body>`);
  await page.evaluate(() => { window.chrome = { storage: { sync: { get: (d, cb) => cb(d) }, onChanged: { addListener() {} } } }; });
  for (const f of ['valuation', 'parser', 'content']) await page.addScriptTag({ content: fs.readFileSync(`src/${f}.js`, 'utf8') });
  await page.addStyleTag({ path: 'src/content.css' });
  await page.evaluate(() => window.postMessage({ source: 'autopilot-flight-data', body: { data: { airBoundGroups: [{ boundDetails: { origin: { airportCode: 'YYZ' }, destination: { airportCode: 'LAX' }, segments: [{ flightId: 'f1' }] }, airBounds: [{ prices: { milesConversion: { convertedMiles: { total: 15000 }, remainingNonConverted: { total: 6845 } }, totalPrices: [{ total: 54000 }] } }] }] }, dictionaries: { flight: { f1: { marketingAirlineCode: 'AC', marketingFlightNumber: '791', departure: { dateTime: '2026-11-05T08:15:00' }, arrival: { dateTime: '2026-11-05T10:30:00' } } } } } }, '*'));
  await page.waitForTimeout(600); console.log(await page.evaluate(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let c=0,m=[];while(w.nextNode()){c++;m.push(w.currentNode.nodeValue)}return [c,m]}),await page.evaluate(()=>[typeof AutopilotParser, !!document.querySelector('.ap-root'), document.body.innerHTML.slice(-200)]));
  page.on('pageerror',e=>console.log('ERR',e.message)); console.log(await page.evaluate(()=>document.body.innerHTML.length), await page.$$eval('.ap-badge', (els) => els.map((e) => e.textContent)));
  await b.close();
})();
