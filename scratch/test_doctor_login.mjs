import { spawn } from 'child_process';
const BASE = 'http://localhost:4173';
const CDP_PORT = 9705;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const chrome = spawn(`"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=C:\\Users\\Roshni\\AppData\\Local\\Temp\\test_cdp_${Date.now()}`,
    '--headless=new', '--disable-gpu', '--window-size=1440,900', `${BASE}/doctor/login`,
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

  // Enable Page
  await send('Page.enable');
  await sleep(1000);

  // Click Auto-fill Demo
  console.log('Clicking Auto-fill Demo...');
  const autoRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Auto-fill'));
      if (btn) { btn.click(); return 'clicked auto-fill'; }
      return 'auto-fill not found: ' + btns.map(b => b.textContent).join(' | ');
    })()`,
    returnByValue: true,
  });
  console.log('Auto-fill:', autoRes.result?.value);
  await sleep(500);

  // Click Sign In
  console.log('Clicking Sign in...');
  const signRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Sign in') || b.textContent.includes('Login'));
      if (btn) { btn.click(); return 'clicked sign in'; }
      return 'sign in not found';
    })()`,
    returnByValue: true,
  });
  console.log('Sign in:', signRes.result?.value);
  await sleep(2000);

  // Check current URL and DOM
  const curUrl = await send('Runtime.evaluate', {
    expression: `window.location.href`,
    returnByValue: true,
  });
  console.log('Current URL:', curUrl.result?.value);

  const bodyText = await send('Runtime.evaluate', {
    expression: `document.body.innerText.substring(0, 300)`,
    returnByValue: true,
  });
  console.log('Body Text:', bodyText.result?.value);

  ws.close();
  chrome.kill();
}

main().catch(console.error);
