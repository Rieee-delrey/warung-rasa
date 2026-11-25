// Drive the live game over CDP: start, pick, cook, plate, screenshot.
// Usage: node playtest.mjs <file-url> <outfile>
const url = process.argv[2];
const outfile = process.argv[3];

const version = await (await fetch('http://127.0.0.1:9222/json/version')).json();
const browserWs = new WebSocket(version.webSocketDebuggerUrl);
let bid = 0;
const bpending = new Map();
const bsend = (method, params = {}) => new Promise((resolve, reject) => {
  const mid = ++bid;
  bpending.set(mid, { resolve, reject });
  browserWs.send(JSON.stringify({ id: mid, method, params }));
});
browserWs.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && bpending.has(msg.id)) {
    const { resolve, reject } = bpending.get(msg.id);
    bpending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  }
};
await new Promise((r) => { browserWs.onopen = r; });
const created = await bsend('Target.createTarget', { url });
const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = targets.find((t) => t.id === created.targetId);

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const problems = [];
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const mid = ++id;
  pending.set(mid, { resolve, reject });
  ws.send(JSON.stringify({ id: mid, method, params }));
});
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    problems.push('EXCEPTION: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 300));
  } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    problems.push('CONSOLE ERROR: ' + JSON.stringify(msg.params.args).slice(0, 300));
  }
};
await new Promise((r) => { ws.onopen = r; });
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function click(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}
async function key(k, code) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code });
}
const state = async () => (await send('Runtime.evaluate', {
  expression: `(()=>{const c=document.querySelector('#game');return c ? 'canvas '+c.width+'x'+c.height : 'NO CANVAS'})()`,
  returnByValue: true,
})).result.value;

await sleep(1500);
console.log('loaded:', await state());
// Start the shift via the title button.
await click(640, 397);
await sleep(600);
// Pick rice (key 1) and egg (key 4).
await key('1', 'Digit1');
await sleep(200);
await key('4', 'Digit4');
await sleep(200);
// Walk to the stove and put the rice on burner 0.
await click(710, 490);
await sleep(1800);
await key('e', 'KeyE');
await sleep(7000); // rice cooks (6s) + margin
// Take the cooked rice (E at the stove) and plate it.
await key('e', 'KeyE');
await sleep(300);
await click(1103, 520); // walk to the pass
await sleep(1500);
await key('e', 'KeyE');
await sleep(500);
const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
const { writeFileSync } = await import('node:fs');
writeFileSync(outfile, Buffer.from(shot.data, 'base64'));
console.log('problems:', problems.length ? problems : 'none');
console.log('wrote', outfile);
process.exit(0);
