/**
 * Sehat Saathi — Final Recording for Take 1 and Take 6
 * Records using CDP screencast and encodes to MP4 with ffmpeg.
 */

import { spawn, execSync } from 'child_process';
import { writeFileSync, mkdirSync, statSync, rmSync } from 'fs';
import { join } from 'path';

const BASE     = 'http://localhost:4173';
const OUT_DIR  = 'C:\\Users\\Roshni\\sehar-saathi\\sehat-saathi\\recordings';
const FFMPEG   = 'C:\\Users\\Roshni\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-full_build\\bin\\ffmpeg.exe';
const CDP_PORT = 9710;
const FPS      = 10;
const CHROME   = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const W = 1440, H = 900;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const ARJUN_RECORD = {
  id: "ARJUN-MEHTA-001",
  submittedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  reviewStatus: "pending",
  patientProfile: {
    name: "Arjun Mehta",
    age: "34",
    sex: "Male",
    identifier: "ABHA-34-7721-9801",
    identifierType: "abha",
    language: "en",
    emergencyContact: {
      guardianName: "Priya Mehta",
      relationship: "Wife",
      phoneNumber: "9812345678"
    }
  },
  chiefComplaint: {
    complaintId: "dizziness",
    displayName: "Dizziness and Vertigo",
    originalInput: "I have been feeling very dizzy and lightheaded for 3 days. The room spins around me.",
    confidence: 0.95,
    source: "patient"
  },
  historyAnswers: {
    duration: "3 days",
    severity: 4,
    problemDescription: "Feeling very dizzy and lightheaded for 3 days. Room spins around me.",
    loss_of_consciousness: "no",
    postural_dizziness: "yes",
    nausea: "yes",
    fever: "no",
    headache: "no"
  },
  evidence: [
    {
      field: "loss_of_consciousness",
      originalAnswer: "No, I have not fainted or lost consciousness.",
      normalizedValue: "no",
      source: "PATIENT",
      language: "en",
      timestamp: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
      confidence: "high"
    },
    {
      field: "duration",
      originalAnswer: "3 days",
      normalizedValue: "3 days",
      source: "PATIENT",
      language: "en",
      timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      confidence: "high"
    },
    {
      field: "severity",
      originalAnswer: "4 out of 10",
      normalizedValue: 4,
      source: "PATIENT",
      language: "en",
      timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      confidence: "high"
    },
    {
      field: "postural_dizziness",
      originalAnswer: "Yes, worse when standing up.",
      normalizedValue: "yes",
      source: "PATIENT",
      language: "en",
      timestamp: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
      confidence: "high"
    }
  ],
  safetyFlags: [],
  documents: [
    {
      id: "doc-arjun-01",
      name: "Prescription_Dr_Kapoor_09Sep2026.jpg",
      type: "prescription",
      uploadedAt: "2026-09-09T10:00:00.000Z",
      status: "processed",
      processingMethod: "ocr",
      extractedEntities: [
        { type: "medication", value: "Betahistine 16mg BD x 2 weeks", confidence: "high", source: "Tab Betahistine 16mg BD" },
        { type: "medication", value: "Stemetil 5mg TDS x 5 days", confidence: "high", source: "Tab Stemetil 5mg TDS" },
        { type: "medication", value: "Vitamin D3 60000IU weekly x 4", confidence: "high", source: "Vit D3 60000IU" },
        { type: "medication", value: "Flunarizine 5mg OD HS", confidence: "high", source: "Tab Flunarizine 5mg OD HS" },
        { type: "diagnosis", value: "Benign Positional Vertigo", confidence: "high", source: "Diagnosis: Benign Positional Vertigo" }
      ]
    }
  ],
  backgroundHistory: {
    pastMedical: "Hypertension (controlled)",
    pastSurgical: "None",
    medications: "Amlodipine 5mg OD, Betahistine 16mg BD",
    allergies: "No known drug allergies",
    family: "Father had hypertension",
    personal: "Non-smoker",
    reviewOfSystems: "Occasional dizziness with sudden head turns"
  },
  timeline: [
    {
      id: "tl-arjun-1",
      date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      title: "Symptom Onset",
      detail: "Sudden onset of vertigo and lightheadedness",
      source: "PATIENT"
    }
  ],
  doctorReviews: [],
  ayushHistory: {},
  suggestedRouting: {
    suggestedDepartment: "Neurology",
    routingStatus: "suggested",
    rationale: "Patient-reported dizziness and vertigo symptoms require neurological / ENT evaluation",
    determinedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
  }
};

async function getWsUrl(port) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await res.json();
      const t = targets.find(t => t.type === 'page');
      if (t?.webSocketDebuggerUrl) return t.webSocketDebuggerUrl;
    } catch {}
    await sleep(400);
  }
  throw new Error('CDP connection timeout');
}

function createCdp(ws) {
  let id = 1;
  const pending = new Map();
  let frameCallback = null;

  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Page.screencastFrame') {
      frameCallback?.(msg.params);
      return;
    }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  };

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = id++;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  return {
    send,
    setFrame: cb => { frameCallback = cb; }
  };
}

function beginRecorder(cdp, name) {
  const dir = `C:\\Users\\Roshni\\AppData\\Local\\Temp\\sih_rec_${name}_${Date.now()}`;
  mkdirSync(dir, { recursive: true });
  let count = 0;
  cdp.setFrame(p => {
    writeFileSync(join(dir, `f${String(count++).padStart(6, '0')}.jpg`), Buffer.from(p.data, 'base64'));
    cdp.send('Page.screencastFrameAck', { sessionId: p.sessionId }).catch(() => {});
  });
  cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, everyNthFrame: 1, maxWidth: W, maxHeight: H }).catch(() => {});
  return { dir, count: () => count };
}

async function stopRecorder(cdp, recorder, outFile) {
  await cdp.send('Page.stopScreencast').catch(() => {});
  cdp.setFrame(null);
  await sleep(400);
  const count = recorder.count();
  console.log(`Captured ${count} frames for ${outFile}`);
  if (count < 2) {
    console.log('Too few frames, aborting encode');
    return false;
  }
  const cmd = `"${FFMPEG}" -y -framerate ${FPS} -i "${join(recorder.dir, 'f%06d.jpg')}" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${outFile}"`;
  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`✓ Saved ${outFile} (${Math.round(statSync(outFile).size / 1024)} KB)`);
    return true;
  } catch (e) {
    console.error('Encode error:', e.stderr?.toString());
    return false;
  } finally {
    try { rmSync(recorder.dir, { recursive: true, force: true }); } catch {}
  }
}

async function recordTake1(cdp) {
  console.log('\n========================================');
  console.log('RECORDING TAKE 1: New Patient Structured Intake');
  console.log('========================================');

  // Navigate to landing page and clear past session
  await cdp.send('Page.navigate', { url: `${BASE}/` });
  await sleep(2000);
  await cdp.send('Runtime.evaluate', {
    expression: `['medikiosk_session_v2','sehatSaathi_language'].forEach(k => localStorage.removeItem(k)); sessionStorage.clear();`
  });
  await cdp.send('Page.navigate', { url: `${BASE}/` });
  await sleep(2000);

  const recorder = beginRecorder(cdp, 'take1');

  // 1. Landing page - pause for viewer to read
  console.log('1. Landing page display');
  await sleep(2500);

  // Click Start Consultation
  console.log('2. Click Start Consultation');
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Start Consultation') || x.textContent.includes('Start Intake'));
      if (b) b.click();
    })()`
  });
  await sleep(2000);

  // 2. Patient Entry Choice - Click Start as New Patient
  console.log('3. Click Start as New Patient');
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('New Patient'));
      if (b) b.click();
    })()`
  });
  await sleep(2000);

  // 3. Consent Screen - Accept Consent
  console.log('4. Consent Screen - Accept & Continue');
  await sleep(1500);
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Agree & Continue') || x.textContent.includes('Accept'));
      if (b) b.click();
    })()`
  });
  await sleep(2000);

  // 4. Patient Profile - Enter Details
  console.log('5. Patient Profile - Enter Name, Age, Gender');
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const nameInp = inputs.find(i => i.placeholder?.includes('Ramesh') || i.placeholder?.includes('Name') || i.type === 'text');
      if (nameInp) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(nameInp, 'Arjun Mehta');
        nameInp.dispatchEvent(new Event('input', { bubbles: true }));
        nameInp.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const ageInp = inputs.find(i => i.type === 'number' || i.placeholder?.includes('42'));
      if (ageInp) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(ageInp, '34');
        ageInp.dispatchEvent(new Event('input', { bubbles: true }));
        ageInp.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const select = document.querySelector('select');
      if (select) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
        setter.call(select, 'Male');
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`
  });
  await sleep(2000); // pause to show filled profile

  // Click Continue to Complaint
  console.log('6. Click Continue to Complaint');
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Continue to Complaint'));
      if (b) b.click();
    })()`
  });
  await sleep(2500);

  // 5. Chief Complaint Screen
  console.log('7. Chief Complaint - Select Cough quick button or enter text');
  await sleep(1500);
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const coughBtn = btns.find(b => b.textContent.includes('Cough') || b.textContent.includes('खांसी'));
      if (coughBtn) {
        coughBtn.click();
        return;
      }
      const ta = document.querySelector('textarea');
      if (ta) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(ta, 'I have had a severe cough and chest tightness for 3 days');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`
  });
  await sleep(2000);

  // If on confirm step, click Yes, that's correct
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes("Yes, that's correct") || x.textContent.includes('हाँ, यह सही है') || x.textContent.includes('Continue'));
      if (b) b.click();
    })()`
  });
  await sleep(2500);

  // 6. Structured History Questions
  console.log('8. Structured History Screen display');
  await sleep(3500); // pause so viewer clearly sees the first structured question and choices

  await stopRecorder(cdp, recorder, join(OUT_DIR, 'take1_new_patient_intake.mp4'));
}

async function recordTake6(cdp) {
  console.log('\n========================================');
  console.log('RECORDING TAKE 6: Physician Dashboard + FHIR');
  console.log('========================================');

  // Go to /doctor/login first
  await cdp.send('Page.navigate', { url: `${BASE}/doctor/login` });
  await sleep(2000);

  // Seed Arjun Mehta's record into stored patient records
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const existing = JSON.parse(localStorage.getItem('sehatSaathi_patient_records_v1') || '[]');
      const filtered = existing.filter(r => r.id !== 'ARJUN-MEHTA-001');
      localStorage.setItem('sehatSaathi_patient_records_v1', JSON.stringify([${JSON.stringify(ARJUN_RECORD)}, ...filtered]));
    })()`
  });

  const recorder = beginRecorder(cdp, 'take6');

  // 1. Click Auto-fill Demo Credentials
  console.log('1. Auto-fill Demo Credentials');
  await sleep(1500);
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Auto-fill Demo'));
      if (b) b.click();
    })()`
  });
  await sleep(1500);

  // 2. Click Sign In
  console.log('2. Click Sign In');
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Sign in') || x.type === 'submit');
      if (b) b.click();
    })()`
  });
  await sleep(2500);

  // 3. On Doctor Dashboard - Patient Queue
  console.log('3. Queue View - Select Arjun Mehta');
  await sleep(2000);
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const arjun = btns.find(b => b.textContent.includes('Arjun Mehta'));
      if (arjun) arjun.click();
    })()`
  });
  await sleep(2000);

  // 4. Clinical Summary Tab - scroll slowly
  console.log('4. Clinical Summary Tab - Showing Chief Complaint, Patient Wording, Structured History');
  await sleep(2000);

  // Scroll to show structured history answers: Loss of consciousness: no
  await cdp.send('Runtime.evaluate', { expression: `window.scrollBy({ top: 350, behavior: 'smooth' })` });
  await sleep(2500);
  await cdp.send('Runtime.evaluate', { expression: `window.scrollBy({ top: 350, behavior: 'smooth' })` });
  await sleep(2500);
  await cdp.send('Runtime.evaluate', { expression: `window.scrollTo({ top: 0, behavior: 'smooth' })` });
  await sleep(1500);

  // 5. Switch to Conversation Tab (Original Patient Evidence / Provenance)
  console.log('5. Conversation Tab - Original Patient Evidence & Provenance');
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.trim() === 'Conversation');
      if (b) b.click();
    })()`
  });
  await sleep(3000); // pause to show raw quotes, normalized values, confidence

  // 6. Switch to Documents Tab (Document evidence register)
  console.log('6. Documents Tab - OCR extracted prescriptions & medications');
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.trim() === 'Documents');
      if (b) b.click();
    })()`
  });
  await sleep(3000);

  // 7. Click FHIR Export Button
  console.log('7. FHIR R4 Bundle Export');
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Export FHIR-ready JSON'));
      if (b) {
        b.scrollIntoView({ behavior: 'smooth', block: 'center' });
        b.click();
      }
    })()`
  });
  await sleep(3000);

  await stopRecorder(cdp, recorder, join(OUT_DIR, 'take6_physician_dashboard_fhir.mp4'));
}

async function main() {
  const userDataDir = `C:\\Users\\Roshni\\AppData\\Local\\Temp\\sih_final_${Date.now()}`;
  const chrome = spawn(`"${CHROME}"`, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new', '--disable-gpu',
    `--window-size=${W},${H}`,
    '--force-device-scale-factor=1',
    '--no-first-run', '--no-default-browser-check',
    '--disable-web-security', '--test-type',
    `${BASE}/`,
  ], { shell: true });

  await sleep(3000);
  const wsUrl = await getWsUrl(CDP_PORT);
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.onopen = r);
  const cdp = createCdp(ws);

  await cdp.send('Page.enable');
  await cdp.send('DOM.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });

  await recordTake1(cdp);
  await recordTake6(cdp);

  ws.close();
  chrome.kill();
  console.log('\nALL FINAL TAKES RECORDED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
