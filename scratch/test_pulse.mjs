import { spawn } from 'child_process';

const BASE = 'http://localhost:4173';
const CDP_PORT = 9715;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const chrome = spawn(`"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=C:\\Users\\Roshni\\AppData\\Local\\Temp\\test_pulse_${Date.now()}`,
    '--headless=new', '--disable-gpu', '--window-size=1440,900', `${BASE}/`,
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

  let frames = 0;
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Page.screencastFrame') {
      frames++;
      send('Page.screencastFrameAck', { sessionId: msg.params.sessionId });
    }
  });

  await send('Page.startScreencast', { format: 'jpeg', quality: 80, everyNthFrame: 1 });

  // Start heartbeat pulse
  await send('Runtime.evaluate', {
    expression: `(() => {
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0.01;pointer-events:none;';
      document.body.appendChild(d);
      setInterval(() => { d.style.transform = 'translate(' + Math.random() + 'px)'; }, 100);
    })()`
  });

  // Wait 3 seconds
  await sleep(3000);

  await send('Page.stopScreencast');
  console.log(`In 3 seconds, captured ${frames} frames!`);

  ws.close();
  chrome.kill();
}

main().catch(console.error);
