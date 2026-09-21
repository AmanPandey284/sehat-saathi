import { spawn, execSync } from 'child_process';
import { writeFileSync, mkdirSync, statSync, rmSync } from 'fs';
import { join } from 'path';

const BASE     = 'http://localhost:4173';
const OUT_DIR  = 'C:\\Users\\Roshni\\sehar-saathi\\sehat-saathi\\recordings';
const FFMPEG   = 'C:\\Users\\Roshni\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-full_build\\bin\\ffmpeg.exe';
const CDP_PORT = 9720;
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

async function main() {
  const chrome = spawn(`"${CHROME}"`, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=C:\\Users\\Roshni\\AppData\\Local\\Temp\\sih_t6_${Date.now()}`,
    '--headless=new', '--disable-gpu',
    `--window-size=${W},${H}`,
    '--force-device-scale-factor=1',
    '--no-first-run', '--no-default-browser-check',
    '--disable-web-security', '--test-type',
    `${BASE}/doctor/login`,
  ], { shell: true });

  await sleep(3000);
  const wsUrl = await getWsUrl(CDP_PORT);
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.onopen = r);

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

  await send('Page.enable');
  await send('DOM.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });

  // 1. Seed Arjun's record before login
  await send('Runtime.evaluate', {
    expression: `(() => {
      const existing = JSON.parse(localStorage.getItem('sehatSaathi_patient_records_v1') || '[]');
      const filtered = existing.filter(r => r.id !== 'ARJUN-MEHTA-001');
      localStorage.setItem('sehatSaathi_patient_records_v1', JSON.stringify([${JSON.stringify(ARJUN_RECORD)}, ...filtered]));
    })()`
  });

  // Setup frames recording dir
  const dir = `C:\\Users\\Roshni\\AppData\\Local\\Temp\\sih_t6_frames_${Date.now()}`;
  mkdirSync(dir, { recursive: true });
  let count = 0;

  frameCallback = p => {
    writeFileSync(join(dir, `f${String(count++).padStart(6, '0')}.jpg`), Buffer.from(p.data, 'base64'));
    send('Page.screencastFrameAck', { sessionId: p.sessionId }).catch(() => {});
  };

  await send('Page.startScreencast', { format: 'jpeg', quality: 85, everyNthFrame: 1, maxWidth: W, maxHeight: H });

  const pulse = async () => {
    await send('Runtime.evaluate', {
      expression: `(() => {
        let d = document.getElementById('__pulse');
        if (!d) {
          d = document.createElement('div');
          d.id = '__pulse';
          d.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0.01;pointer-events:none;';
          document.body.appendChild(d);
        }
        d.style.transform = 'translate(' + Math.random() + 'px)';
      })()`
    });
  };

  const smoothWait = async (ms) => {
    const steps = Math.floor(ms / 100);
    for (let i = 0; i < steps; i++) {
      await pulse();
      await sleep(100);
    }
  };

  console.log('1. On Login screen - Auto-fill Demo credentials');
  await smoothWait(1500);

  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Auto-fill Demo'));
      if (b) b.click();
    })()`
  });
  await smoothWait(1500);

  console.log('2. Click Sign In');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Sign in') || x.type === 'submit');
      if (b) b.click();
    })()`
  });
  await smoothWait(2500);

  console.log('3. Queue View - Select Arjun Mehta');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const arjun = btns.find(b => b.textContent.includes('Arjun Mehta'));
      if (arjun) arjun.click();
    })()`
  });
  await smoothWait(2000);

  console.log('4. Summary Tab - Show Chief Complaint & Patient Wording');
  await smoothWait(2000);

  console.log('5. Scroll down to show Structured History: Loss of consciousness: no');
  for (let s = 0; s < 10; s++) {
    await send('Runtime.evaluate', { expression: `window.scrollBy(0, 40)` });
    await smoothWait(150);
  }
  await smoothWait(2500); // pause on structured history answers

  console.log('6. Scroll back up smoothly');
  for (let s = 0; s < 10; s++) {
    await send('Runtime.evaluate', { expression: `window.scrollBy(0, -40)` });
    await smoothWait(100);
  }
  await smoothWait(1500);

  console.log('7. Switch to Conversation Tab (Evidence & Provenance)');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.trim() === 'Conversation');
      if (b) b.click();
    })()`
  });
  await smoothWait(3500); // pause to show raw wording, confidence, normalized values

  console.log('8. Switch to Documents Tab (Document evidence register)');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.trim() === 'Documents');
      if (b) b.click();
    })()`
  });
  await smoothWait(3500); // pause to show extracted prescription entities

  console.log('9. Scroll to Export FHIR-ready JSON button');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Export FHIR-ready JSON'));
      if (b) {
        b.scrollIntoView({ behavior: 'smooth', block: 'center' });
        b.click();
      }
    })()`
  });
  await smoothWait(2500);

  await send('Page.stopScreencast');
  console.log(`Total frames captured: ${count}`);

  const outFile = join(OUT_DIR, 'take6_physician_dashboard_fhir.mp4');
  const cmd = `"${FFMPEG}" -y -framerate ${FPS} -i "${join(dir, 'f%06d.jpg')}" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${outFile}"`;
  execSync(cmd, { stdio: 'pipe' });
  console.log(`✓ Saved ${outFile} (${Math.round(statSync(outFile).size / 1024)} KB)`);

  rmSync(dir, { recursive: true, force: true });
  ws.close();
  chrome.kill();
  console.log('Take 6 smooth recording complete!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
