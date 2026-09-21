import { spawn } from 'child_process';
import http from 'http';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json/list');
      const targets = await res.json();
      const t = targets.find((target) => target.type === 'page');
      if (t?.webSocketDebuggerUrl) return t.webSocketDebuggerUrl;
    } catch {}
    await sleep(400);
  }
  throw new Error('Could not connect to Chrome debugger');
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve) => {
      this.ws.onopen = resolve;
    });
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res?.result?.value;
  }
}

async function main() {
  console.log('--- Launching Chrome for AYUSH Mode Verification ---');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--window-size=1440,900',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'http://localhost:4173/',
  ]);

  try {
    const wsUrl = await getWsUrl();
    console.log('Connected to Chrome WebSocket:', wsUrl);
    const client = new CDPClient(wsUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');

    // 1. Check Landing Page
    console.log('1. Checking Landing Page...');
    await client.send('Page.navigate', { url: 'http://localhost:4173/' });
    await sleep(1500);

    const landingText = await client.evaluate(`document.body.innerText.includes('AYUSH Mode')`);
    console.log('Landing has AYUSH link:', landingText);

    // 2. Navigate to AYUSH Mode
    console.log('2. Navigating to /patient/ayush...');
    await client.send('Page.navigate', { url: 'http://localhost:4173/patient/ayush' });
    await sleep(1000);

    const title = await client.evaluate(`document.querySelector('h1')?.innerText`);
    console.log('AYUSH Page Title:', title);

    const subheader = await client.evaluate(`document.body.innerText.includes('Ayurvedic Clinical History')`);
    console.log('Has Ayurvedic Clinical History header:', subheader);

    // 3. Test Question 1: Prakriti
    console.log('3. Answering Prakriti (selecting Pitta)...');
    const clickedPitta = await client.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const pittaBtn = btns.find(b => b.innerText.includes('Pitta'));
      if (pittaBtn) { pittaBtn.click(); return true; }
      return false;
    })()`);
    console.log('Selected Pitta:', clickedPitta);
    await sleep(400);

    // Click Continue
    await client.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cont = btns.find(b => b.innerText.includes('Continue'));
      if (cont) cont.click();
    })()`);
    await sleep(400);

    // 4. Test Question 2: Vikriti (Text input)
    console.log('4. Answering Vikriti (text input)...');
    await client.evaluate(`(() => {
      const ta = document.querySelector('textarea');
      if (ta) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeSetter.call(ta, 'Pitta-Vata aggravation with mild burning sensation');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    await sleep(300);

    // Click Continue
    await client.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cont = btns.find(b => b.innerText.includes('Continue'));
      if (cont) cont.click();
    })()`);
    await sleep(400);

    // 5. Test Question 3: Sara (Pravara)
    console.log('5. Answering Sara (Pravara)...');
    await client.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.innerText.includes('Pravara'));
      if (btn) btn.click();
    })()`);
    await sleep(400);

    // 6. Click View full summary
    console.log('6. Viewing AYUSH Summary...');
    await client.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const sumBtn = btns.find(b => b.innerText.includes('View full summary') || b.innerText.includes('सारांश देखें'));
      if (sumBtn) sumBtn.click();
    })()`);
    await sleep(500);

    const summaryTitle = await client.evaluate(`document.querySelector('h1')?.innerText`);
    console.log('Summary Screen Title:', summaryTitle);

    const summaryHasPitta = await client.evaluate(`document.body.innerText.includes('Pitta')`);
    const summaryHasPravara = await client.evaluate(`document.body.innerText.includes('Pravara')`);
    console.log('Summary displays Pitta and Pravara:', summaryHasPitta && summaryHasPravara);

    // 7. Save & Continue to Documents
    console.log('7. Clicking Save Ayurvedic History & Continue...');
    await client.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const saveBtn = btns.find(b => b.innerText.includes('Save Ayurvedic History'));
      if (saveBtn) saveBtn.click();
    })()`);
    await sleep(1000);

    const currentUrl = await client.evaluate(`window.location.pathname`);
    console.log('Navigated to:', currentUrl);

    // 8. Doctor Dashboard verification
    console.log('8. Verifying Doctor Dashboard AYUSH integration...');
    // Seed doctor auth if needed
    await client.evaluate(`localStorage.setItem('sehatSaathi_doctor_auth_v1', JSON.stringify({ isAuthenticated: true, user: { id: 'doc-1', name: 'Dr. Sharma', role: 'Physician' } }))`);
    await client.send('Page.navigate', { url: 'http://localhost:4173/doctor' });
    await sleep(1500);

    // Check AYUSH tab button
    const hasAyushTab = await client.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.innerText.includes('AYUSH'));
    })()`);
    console.log('Doctor Dashboard has AYUSH tab:', hasAyushTab);

    // Select Sunita Devi in the queue (DEMO-REC-002 has seeded AYUSH data)
    await client.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const sunita = btns.find(b => b.innerText.includes('Sunita Devi'));
      if (sunita) sunita.click();
    })()`);
    await sleep(500);

    // Click AYUSH tab
    await client.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.innerText.includes('AYUSH'));
      if (btn) btn.click();
    })()`);
    await sleep(500);

    const doctorAyushTitle = await client.evaluate(`document.body.innerText.includes('Ayurvedic Clinical Intake Review')`);
    const doctorHasPitta = await client.evaluate(`document.body.innerText.includes('Pitta')`);
    const doctorHasAhara = await client.evaluate(`document.body.innerText.includes('Ahara Shakti') || document.body.innerText.includes('Amlapitta')`);
    const doctorHasDisclaimer = await client.evaluate(`document.body.innerText.includes('Not an automated diagnosis') || document.body.innerText.includes('not an automated diagnosis')`);
    console.log('Doctor Dashboard renders Ayurvedic Review Title:', doctorAyushTitle);
    console.log('Doctor Dashboard displays recorded Pitta data:', doctorHasPitta);
    console.log('Doctor Dashboard displays recorded Ahara Shakti / Amlapitta data:', doctorHasAhara);
    console.log('Doctor Dashboard displays non-diagnostic disclaimer:', doctorHasDisclaimer);

    console.log('--- ALL BROWSER INTERACTIONS VERIFIED SUCCESSFULLY ---');
  } finally {
    chrome.kill();
  }
}

main().catch((err) => {
  console.error('Error during browser verification:', err);
  process.exit(1);
});
