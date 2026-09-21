import { spawn } from 'child_process';
const BASE = 'http://localhost:4173';
const CDP_PORT = 9725;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const chrome = spawn(`"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=C:\\Users\\Roshni\\AppData\\Local\\Temp\\test_snap_${Date.now()}`,
    '--headless=new', '--disable-gpu', '--window-size=1440,900', `${BASE}/doctor`,
  ], { shell: true });

  await sleep(3000);
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const targets = await res.json();
  const t = targets.find(t => t.type === 'page');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const mid = id++;
    const handler = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id === mid) {
        ws.removeEventListener('message', handler);
        resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  await send('Page.enable');
  let count = 0;
  const start = Date.now();
  for (let i = 0; i < 20; i++) {
    const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 75 });
    if (r?.data) count++;
    await sleep(150);
  }
  const elapsed = Date.now() - start;
  console.log(`Captured ${count} screenshots in ${elapsed}ms (${(count / (elapsed / 1000)).toFixed(1)} fps)`);

  ws.close();
  chrome.kill();
}
main().catch(console.error);
