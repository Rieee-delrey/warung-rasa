// Capture a page screenshot over Chrome DevTools Protocol (Node stdlib only).
// Usage: node shot.mjs <url> <outfile> [width] [height] [waitMs]
// The tab is created over the browser-level WebSocket, never from the
// DevTools frontend page, so Chrome's local-network-access check stays quiet.
const url = process.argv[2];
const outfile = process.argv[3];
const width = Number(process.argv[4] || 1280);
const height = Number(process.argv[5] || 720);
const waitMs = Number(process.argv[6] || 2500);

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
const targetId = created.targetId;
const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = targets.find((t) => t.id === targetId);
if (!page) throw new Error('created target not listed');

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const events = [];
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
  } else if (msg.method) {
    events.push(msg);
  }
};
await new Promise((r) => { ws.onopen = r; });
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
await new Promise((r) => setTimeout(r, waitMs));
const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
for (const e of events) {
  if (e.method === 'Runtime.exceptionThrown') {
    console.log('PAGE EXCEPTION:', JSON.stringify(e.params.exceptionDetails).slice(0, 500));
  }
  if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') {
    console.log('PAGE CONSOLE ERROR:', JSON.stringify(e.params.args).slice(0, 300));
  }
}
const { writeFileSync } = await import('node:fs');
writeFileSync(outfile, Buffer.from(shot.data, 'base64'));
console.log('wrote', outfile);
process.exit(0);
