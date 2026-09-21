// Targeted re-capture: 01_adaptive_question + 07_hindi_interface
import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = `C:\\Users\\Roshni\\AppData\\Local\\Temp\\cdp_retake_${Date.now()}`;
const PORT = 9600;
const BASE = 'http://127.0.0.1:4173';
const OUT = 'C:\\Users\\Roshni\\sehar-saathi\\sehat-saathi\\screenshots';

const DEMO_PATIENT = {
  name: 'Arjun Mehta', age: '34', sex: 'Male',
  identifier: 'ABHA-34-7721-9801', identifierType: 'abha', language: 'en',
  emergencyContact: { guardianName: 'Priya Mehta', relationship: 'Wife', phoneNumber: '9812345678' },
};

const DEMO_COMPLAINT_DIZZINESS = {
  complaintId: 'custom', displayName: 'Dizziness and Vertigo',
  originalInput: 'I have been feeling very dizzy and lightheaded for 3 days. The room spins.',
  confidence: 0.92, source: 'patient',
};

const chromeProc = spawn(`"${chromePath}"`, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${userDataDir}`,
  '--headless=new', '--disable-gpu',
  '--window-size=1440,900', '--force-device-scale-factor=2',
  '--no-first-run', '--no-default-browser-check', '--disable-web-security', '--test-type',
  `${BASE}/`,
], { shell: true });

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      const t = targets.find(t => t.type === 'page' && !t.url.startsWith('chrome://') && !t.url.startsWith('devtools://'));
      if (t && t.webSocketDebuggerUrl) return t.webSocketDebuggerUrl;
    } catch {}
    await sleep(500);
  }
  throw new Error('CDP timeout');
}

async function main() {
  await sleep(2500);
  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error); else resolve(msg.result);
    }
  };
  await new Promise(res => ws.onopen = res);

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result ? r.result.value : undefined;
  }

  async function navigate(url) {
    await send('Page.navigate', { url });
    await sleep(2000);
  }

  async function screenshot(filename) {
    const r = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    const buf = Buffer.from(r.data, 'base64');
    writeFileSync(join(OUT, filename), buf);
    console.log(`✓ ${filename} (${Math.round(buf.length / 1024)}KB)`);
  }

  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });

  // ── Auth ──
  await navigate(`${BASE}/doctor`);
  await evaluate(`
    const u = { username: "demo-doctor", displayName: "Dr. Ananya Sharma (Demo Physician)", role: "Attending Physician / Clinical Admin", authenticatedAt: new Date().toISOString() };
    localStorage.setItem('sehatSaathi_doctor_auth_v1', JSON.stringify(u));
    sessionStorage.setItem('sehatSaathi_doctor_auth_v1', JSON.stringify(u));
  `);

  // ────────────────────────────────────────────────────────────
  // 01_adaptive_question.png — dizziness_faint yes/no
  // Strategy: seed session with all standard questions already answered
  // so AdaptiveHistoryFlow immediately shows adaptive phase with faint Q
  // ────────────────────────────────────────────────────────────
  console.log('--- 01_adaptive_question.png ---');
  await navigate(`${BASE}/`);

  // Seed full session: standard answers done, adaptive analysis should kick in with dizziness concept
  await evaluate(`
    const session = {
      patientProfile: ${JSON.stringify(DEMO_PATIENT)},
      consentGranted: true,
      chiefComplaint: ${JSON.stringify(DEMO_COMPLAINT_DIZZINESS)},
      historyAnswers: {
        problemDescription: "I have been feeling very dizzy and lightheaded for 3 days. The room spins around me.",
        duration: "3 days",
        severity: 4,
        associatedSymptoms: ["weakness"],
        additionalNotes: "",
      },
      evidence: [],
      safetyFlags: [],
      documents: [],
      backgroundHistory: { pastMedical:'', pastSurgical:'', medications:'', allergies:'', family:'', personal:'', reviewOfSystems:'' },
      timeline: [],
      doctorReviews: [],
      ayushHistory: {},
      timestamps: {}
    };
    localStorage.setItem('medikiosk_session_v2', JSON.stringify(session));
    localStorage.removeItem('sehatSaathi_language');
  `);

  await navigate(`${BASE}/patient/history`);
  await sleep(2000);

  // Check what question is showing
  let pageText = await evaluate(`document.body.innerText`);
  console.log('Initial Q:', pageText.substring(0, 120));

  // If standard questions are showing, answer them quickly
  // Standard questions for customComplaintFlow: problemDescription, duration, severity, associatedSymptoms, additionalNotes
  // problemDescription is already answered → may show on first load
  // We need to advance through all standard Q's until we reach adaptive section

  const hasFaintQ = () => evaluate(`document.body.innerText.includes('fainted') || document.body.innerText.includes('lost consciousness')`);
  let foundFaint = await hasFaintQ();

  let iterations = 0;
  while (!foundFaint && iterations < 20) {
    iterations++;
    // Check current question and fill it appropriately
    const questionText = await evaluate(`document.querySelector('h1,h2,h3,p.font-semibold,.text-2xl')?.textContent?.trim() || ''`);
    console.log(`Q${iterations}: "${questionText.substring(0, 60)}"`);

    // If text input, fill it
    const hasTextarea = await evaluate(`!!document.querySelector('textarea,input[type=text]')`);
    if (hasTextarea) {
      await evaluate(`
        const inp = document.querySelector('textarea') || document.querySelector('input[type=text]');
        if (inp) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
            || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          nativeInputValueSetter?.call(inp, 'Feeling dizzy and lightheaded');
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
      `);
      await sleep(300);
    }

    // If number input for severity, set 4
    const hasNumberInput = await evaluate(`!!document.querySelector('input[type=number],input[type=range]')`);
    if (hasNumberInput) {
      await evaluate(`
        const inp = document.querySelector('input[type=number]') || document.querySelector('input[type=range]');
        if (inp) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          nativeInputValueSetter?.call(inp, '4');
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
      `);
      await sleep(300);
    }

    // Click Continue / Next
    const clicked = await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => (b.textContent.includes('Continue') || b.textContent.includes('Next') || b.textContent.includes('आगे') || b.textContent.includes('Skip')) && !b.disabled);
        if (btn) { btn.click(); return btn.textContent.trim(); }
        return null;
      })()
    `);
    console.log('  Clicked:', clicked);
    await sleep(800);

    // Check if redirected to /patient/review (finished standard flow)
    const currentUrl = await evaluate(`window.location.href`);
    if (currentUrl.includes('/review') || currentUrl.includes('/documents') || currentUrl.includes('/complete')) {
      console.log('Navigation left history page:', currentUrl);
      break;
    }

    foundFaint = await hasFaintQ();
  }

  if (foundFaint) {
    console.log('✓ dizziness_faint question found');
    // Select "No" to show selected state
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const noBtn = btns.find(b => b.textContent.trim() === 'No' || b.textContent.trim() === 'नहीं');
        if (noBtn) noBtn.click();
      })()
    `);
    await sleep(600);
  } else {
    console.log('⚠ dizziness_faint not reached; capturing current state');
    // Navigate directly to history and get a nicer view at a yes/no question
    // Try headache flow which may have adaptive questions faster
  }

  await screenshot('01_adaptive_question.png');

  // ────────────────────────────────────────────────────────────
  // 07_hindi_interface.png — Chief complaint in Hindi
  // ────────────────────────────────────────────────────────────
  console.log('--- 07_hindi_interface.png ---');

  await evaluate(`localStorage.setItem('sehatSaathi_language', '"hi"')`);
  await navigate(`${BASE}/patient`);
  await sleep(1500);

  // Try to click the Hindi button in the UI
  await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const hindiBtn = btns.find(b => b.textContent.includes('हिंदी') || b.textContent.includes('Hindi'));
      if (hindiBtn) hindiBtn.click();
    })()
  `);
  await sleep(1200);

  const hindiText = await evaluate(`document.body.innerText.substring(0, 300)`);
  console.log('Hindi page:', hindiText);

  await screenshot('07_hindi_interface.png');

  ws.close();
  chromeProc.kill();
  console.log('Done.');
  process.exit(0);
}

main().catch(e => { console.error(e); chromeProc.kill(); process.exit(1); });
