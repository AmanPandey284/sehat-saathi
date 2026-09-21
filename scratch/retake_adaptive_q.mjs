// Targeted re-capture: 01_adaptive_question.png
// Seeds sessionStorage with adaptive analysis so the dizziness_faint question appears
import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = `C:\\Users\\Roshni\\AppData\\Local\\Temp\\cdp_adaptive_${Date.now()}`;
const PORT = 9601;
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

// Simulate what adaptAfterAnswer returns after standard questions completed
// This is what gets stored in sehatSaathi_adaptive_analysis in sessionStorage
const ADAPTIVE_ANALYSIS = {
  detectedConcepts: ['dizziness'],
  questions: [
    {
      id: 'dizziness_faint',
      field: 'loss_of_consciousness',
      clinicalLabel: 'Loss of consciousness',
      text: 'Have you actually fainted or lost consciousness?',
      textHi: 'क्या आप वास्तव में बेहोश हुए हैं या आपकी चेतना चली गई थी?',
      type: 'yes_no',
      concepts: ['dizziness'],
      priority: 10,
    },
    {
      id: 'dizziness_standing',
      field: 'postural_dizziness',
      clinicalLabel: 'Worse on standing',
      text: 'Does the dizziness become worse when you stand up?',
      textHi: 'क्या खड़े होने पर चक्कर अधिक बढ़ जाता है?',
      type: 'yes_no',
      concepts: ['dizziness'],
      priority: 4,
    },
  ],
  allAnsweredConceptIds: [],
  skipped: [],
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
    if (r.exceptionDetails) { console.error('Eval error:', JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails)); return undefined; }
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

  // Step 1: Navigate to app to get a tab, set up auth
  await navigate(`${BASE}/`);

  // Step 2: Seed localStorage and sessionStorage
  await evaluate(`
    // Patient session (standard questions complete)
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

  // Step 3: Navigate to history page so sessionStorage is available on that origin
  await navigate(`${BASE}/patient/history`);
  await sleep(500);

  // Step 4: Inject adaptive analysis into sessionStorage
  // This mimics what adaptAfterAnswer() produces after the natural-language description
  await evaluate(`
    sessionStorage.setItem('sehatSaathi_adaptive_analysis', JSON.stringify(${JSON.stringify(ADAPTIVE_ANALYSIS)}));
    console.log('[INJECT] adaptive analysis stored', sessionStorage.getItem('sehatSaathi_adaptive_analysis')?.length, 'chars');
  `);

  // Step 5: Trigger a React re-render by navigating away and back  
  // The useEffect on mount reads sessionStorage, so we need a fresh mount
  await send('Page.navigate', { url: `${BASE}/patient/review` });
  await sleep(400);
  await send('Page.navigate', { url: `${BASE}/patient/history` });
  await sleep(2500);

  // Check what's on screen
  let pageText = await evaluate(`document.body.innerText`);
  console.log('Page text (first 400):', pageText?.substring(0, 400));

  // Check if dizziness_faint question is showing
  const hasFaint = await evaluate(`document.body.innerText.includes('fainted') || document.body.innerText.includes('lost consciousness')`);
  console.log('Has faint question:', hasFaint);

  if (hasFaint) {
    // Select "No" to show selected visual state
    await evaluate(`
      (() => {
        // Click "No" button using data-testid
        const noBtn = document.querySelector('[data-testid="adaptive-option-no"]');
        if (noBtn) { noBtn.click(); return 'clicked No via testid'; }
        // Fallback: find by text
        const btns = Array.from(document.querySelectorAll('button'));
        const noBtnByText = btns.find(b => b.textContent.trim() === 'No');
        if (noBtnByText) { noBtnByText.click(); return 'clicked No via text'; }
        return 'No button not found';
      })()
    `);
    await sleep(500);
    console.log('Selected No on faint question');
  } else {
    console.log('⚠ Faint question not found — capturing current page state');
  }

  await screenshot('01_adaptive_question.png');

  ws.close();
  chromeProc.kill();
  console.log('Done');
  process.exit(0);
}

main().catch(e => { console.error(e); chromeProc.kill(); process.exit(1); });
