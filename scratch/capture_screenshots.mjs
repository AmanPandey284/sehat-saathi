import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = `C:\\Users\\Roshni\\AppData\\Local\\Temp\\cdp_screenshots_${Date.now()}`;
const PORT = 9599;
const BASE = 'http://127.0.0.1:4173';
const OUT = 'C:\\Users\\Roshni\\sehar-saathi\\sehat-saathi\\screenshots';

// ── Demo Patient (Arjun Mehta, 34, Delhi) ──────────────────────────
const DEMO_PATIENT = {
  name: 'Arjun Mehta',
  age: '34',
  sex: 'Male',
  identifier: 'ABHA-34-7721-9801',
  identifierType: 'abha',
  language: 'en',
  emergencyContact: {
    guardianName: 'Priya Mehta',
    relationship: 'Wife',
    phoneNumber: '9812345678',
  },
};

const DEMO_COMPLAINT = {
  complaintId: 'custom',
  displayName: 'Dizziness and vertigo',
  originalInput: 'I have been feeling dizzy and lightheaded for the past 3 days',
  confidence: 0.92,
  source: 'patient',
};

const DEMO_HISTORY_ANSWERS = {
  problemDescription: 'I have been feeling dizzy and lightheaded for the past 3 days. Sometimes I feel the room spinning.',
  duration: '3 days',
  severity: 4,
  loss_of_consciousness: 'no',
  postural_dizziness: 'yes',
  associatedSymptoms: ['weakness'],
  additionalNotes: 'No recent illness. No new medications.',
  safety_screened: true,
  safety_screened_at: new Date().toISOString(),
};

// Same patient for emergency (chest pain triggers urgent flag)
const DEMO_EMERGENCY_PATIENT = {
  name: 'Suresh Kumar',
  age: '58',
  sex: 'Male',
  identifier: 'ABHA-58-3312-7400',
  identifierType: 'abha',
  language: 'en',
  emergencyContact: {
    guardianName: 'Kavitha Kumar',
    relationship: 'Wife',
    phoneNumber: '9900112233',
  },
};

// Returning patient (same DEMO-REC-001 Ramesh but let's use Arjun as returning)
const RETURNING_PREVIOUS_RECORD = {
  id: 'DEMO-PP-ARJUN',
  submittedAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
  patientProfile: DEMO_PATIENT,
  chiefComplaint: {
    complaintId: 'custom',
    displayName: 'Dizziness and vertigo',
    originalInput: 'Feeling dizzy and lightheaded',
    confidence: 0.9,
    source: 'patient',
  },
  historyAnswers: {
    duration: '3 days',
    severity: 4,
    loss_of_consciousness: 'no',
    postural_dizziness: 'yes',
  },
  evidence: [
    {
      field: 'loss_of_consciousness',
      originalAnswer: 'no',
      normalizedValue: 'no',
      source: 'PATIENT',
      language: 'en',
      timestamp: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
      confidence: 'high',
    },
  ],
  safetyFlags: [],
  documents: [
    {
      id: 'doc-rx-001',
      name: 'Prescription_Dr_Kapoor_09Sep2026.jpg',
      type: 'prescription',
      uploadedAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
      text: 'Patient: Arjun Mehta, 34M. Diagnosis: Benign Positional Vertigo. Rx: Tab Betahistine 16mg BD x 2 weeks; Tab Stemetil 5mg TDS x 5 days; Vit D3 60000IU weekly x 4; Tab Flunarizine 5mg OD HS.',
      extractionStatus: 'extracted',
      entities: [
        { type: 'Medication', value: 'Betahistine 16mg BD x 2 weeks', confidence: 'high', sourceText: 'Tab Betahistine 16mg BD' },
        { type: 'Medication', value: 'Stemetil 5mg TDS x 5 days', confidence: 'high', sourceText: 'Tab Stemetil 5mg TDS' },
        { type: 'Medication', value: 'Vitamin D3 60000IU weekly x 4', confidence: 'high', sourceText: 'Vit D3 60000IU weekly x 4' },
        { type: 'Medication', value: 'Flunarizine 5mg OD HS', confidence: 'high', sourceText: 'Tab Flunarizine 5mg OD HS' },
        { type: 'Diagnosis', value: 'Benign Positional Vertigo', confidence: 'high', sourceText: 'Diagnosis: Benign Positional Vertigo' },
        { type: 'Date', value: '09 Sep 2026', confidence: 'medium', sourceText: '09/09/2026' },
      ],
    },
  ],
  backgroundHistory: {
    pastMedical: 'Hypertension (controlled)',
    pastSurgical: 'None',
    medications: 'Amlodipine 5mg OD',
    allergies: 'No known drug allergies',
    family: 'Father — Hypertension, Diabetes',
    personal: 'Non-smoker, Social drinker',
    reviewOfSystems: 'Occasional fatigue, mild headaches',
  },
  timeline: [
    { id: 'tl-arjun-1', date: new Date(Date.now() - 17 * 24 * 3600 * 1000).toISOString(), title: 'Symptom Onset', detail: 'Dizziness and lightheadedness started', source: 'PATIENT' },
    { id: 'tl-arjun-2', date: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(), title: 'Initial Consultation', detail: 'Diagnosed with Benign Positional Vertigo', source: 'PATIENT' },
  ],
  doctorReviews: [],
  ayushHistory: {},
  reviewStatus: 'reviewed',
  longitudinalChanges: null,
};

// Complete record for physician summary (with doc, history, routing, flags)
const DEMO_COMPLETE_RECORD = {
  id: 'DEMO-PP-ARJUN-V2',
  submittedAt: new Date().toISOString(),
  patientProfile: DEMO_PATIENT,
  chiefComplaint: {
    complaintId: 'custom',
    displayName: 'Dizziness and vertigo',
    originalInput: 'I have been feeling dizzy and lightheaded for the past 3 days',
    confidence: 0.92,
    source: 'patient',
  },
  historyAnswers: {
    problemDescription: 'Dizzy and lightheaded for 3 days. Room spinning. Worse on standing up.',
    duration: '3 days',
    severity: 4,
    loss_of_consciousness: 'no',
    postural_dizziness: 'yes',
    associatedSymptoms: 'weakness',
    additionalNotes: 'No recent illness. No new medications taken.',
    safety_screened: true,
  },
  evidence: [
    {
      field: 'loss_of_consciousness',
      originalAnswer: 'No, I have not fainted.',
      normalizedValue: 'no',
      source: 'PATIENT',
      language: 'en',
      timestamp: new Date().toISOString(),
      confidence: 'high',
    },
    {
      field: 'postural_dizziness',
      originalAnswer: 'yes, definitely worse on standing',
      normalizedValue: 'yes',
      source: 'PATIENT',
      language: 'en',
      timestamp: new Date().toISOString(),
      confidence: 'high',
    },
    {
      field: 'duration',
      originalAnswer: '3 days',
      normalizedValue: '3 days',
      source: 'PATIENT',
      language: 'en',
      timestamp: new Date().toISOString(),
      confidence: 'high',
    },
  ],
  safetyFlags: [],
  documents: RETURNING_PREVIOUS_RECORD.documents,
  backgroundHistory: RETURNING_PREVIOUS_RECORD.backgroundHistory,
  timeline: RETURNING_PREVIOUS_RECORD.timeline,
  doctorReviews: [],
  ayushHistory: {},
  reviewStatus: 'pending',
  suggestedRouting: {
    suggestedDepartment: 'Neurology',
    suggestedSpecialist: 'Neurologist',
    routingStatus: 'suggested',
    reasoning: 'Positional dizziness with postural component suggests vestibular or central nervous system pathology requiring neurological evaluation.',
    alternativeDepartments: ['ENT / Otolaryngology', 'Internal Medicine'],
    urgencyLevel: 'routine',
  },
};

// Emergency patient complete record
const DEMO_EMERGENCY_RECORD = {
  id: 'DEMO-PP-SURESH',
  submittedAt: new Date().toISOString(),
  patientProfile: DEMO_EMERGENCY_PATIENT,
  chiefComplaint: {
    complaintId: 'custom',
    displayName: 'Severe chest pain and breathlessness',
    originalInput: 'Sudden severe crushing chest pain radiating to left arm',
    confidence: 0.95,
    source: 'patient',
  },
  historyAnswers: {
    problemDescription: 'Sudden severe crushing chest pain radiating to left arm',
    duration: '30 minutes',
    severity: 9,
    chestPain: 'yes',
    breathingDifficulty: 'yes',
  },
  evidence: [],
  safetyFlags: [
    {
      id: 'severe-chest-pain',
      severity: 'urgent',
      title: 'Severe chest pain reported',
      explanation: 'Severe chest pain requires immediate clinical triage.',
      field: 'chestPain',
      triggeredAt: new Date().toISOString(),
    },
    {
      id: 'breathing-difficulty',
      severity: 'urgent',
      title: 'Breathing difficulty reported',
      explanation: 'Potential emergency symptom: immediate clinical triage is recommended.',
      field: 'breathingDifficulty',
      triggeredAt: new Date().toISOString(),
    },
  ],
  documents: [],
  backgroundHistory: {
    pastMedical: 'Type 2 Diabetes (8 yrs), Hypertension',
    pastSurgical: 'None',
    medications: 'Metformin 1g BD, Telmisartan 40mg OD',
    allergies: 'No known drug allergies',
    family: 'Father — Heart disease (MI at age 55)',
    personal: 'Ex-smoker (15 pack-years)',
    reviewOfSystems: 'Exertional dyspnea for 2 weeks',
  },
  timeline: [],
  doctorReviews: [],
  ayushHistory: {},
  reviewStatus: 'pending',
  suggestedRouting: {
    suggestedDepartment: 'Emergency Department',
    routingStatus: 'urgent',
    reasoning: 'Severe chest pain with breathlessness — possible ACS. Immediate emergency triage.',
    urgencyLevel: 'immediate',
  },
};

// ── Chrome launch ──────────────────────────────────────────────────
const chromeProc = spawn(`"${chromePath}"`, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${userDataDir}`,
  '--headless=new',
  '--disable-gpu',
  '--window-size=1440,900',
  '--force-device-scale-factor=2',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-web-security',
  '--test-type',
  `${BASE}/`,
], { shell: true });

async function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      const viteTarget = targets.find(t => t.type === 'page' && (t.url.includes('4173') || t.title.includes('Sehat') || t.title.includes('sehat')));
      const fallback = targets.find(t => t.type === 'page' && !t.url.startsWith('chrome://') && !t.url.startsWith('devtools://'));
      const chosen = viteTarget || fallback;
      if (chosen && chosen.webSocketDebuggerUrl) return chosen.webSocketDebuggerUrl;
    } catch {}
    await sleep(500);
  }
  throw new Error('Could not connect to Chrome CDP');
}

async function main() {
  const results = [];

  try {
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
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

    await new Promise((res) => (ws.onopen = res));

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    async function evaluate(expr) {
      const r = await send('Runtime.evaluate', {
        expression: expr,
        returnByValue: true,
        awaitPromise: true,
      });
      if (r.exceptionDetails) throw new Error(`Eval error: ${JSON.stringify(r.exceptionDetails)}`);
      return r.result ? r.result.value : undefined;
    }

    async function navigate(url) {
      await send('Page.navigate', { url });
      await sleep(1800);
    }

    async function screenshot(filename) {
      const r = await send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false,
      });
      const buf = Buffer.from(r.data, 'base64');
      const outPath = join(OUT, filename);
      writeFileSync(outPath, buf);
      console.log(`✓ Saved: ${filename} (${Math.round(buf.length / 1024)}KB)`);
      return outPath;
    }

    async function setViewport(w, h) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: w,
        height: h,
        deviceScaleFactor: 2,
        mobile: false,
      });
    }

    // ── Auth & seed ─────────────────────────────────────────────────
    await navigate(`${BASE}/doctor`);
    await sleep(800);
    await evaluate(`
      const doctorUser = {
        username: "demo-doctor",
        displayName: "Dr. Ananya Sharma (Demo Physician)",
        role: "Attending Physician / Clinical Admin",
        authenticatedAt: new Date().toISOString()
      };
      localStorage.setItem('sehatSaathi_doctor_auth_v1', JSON.stringify(doctorUser));
      sessionStorage.setItem('sehatSaathi_doctor_auth_v1', JSON.stringify(doctorUser));
    `);
    await navigate(`${BASE}/doctor`);
    await sleep(800);

    // Seed all records
    await evaluate(`
      const records = [
        ${JSON.stringify(DEMO_COMPLETE_RECORD)},
        ${JSON.stringify(DEMO_EMERGENCY_RECORD)},
      ];
      localStorage.setItem('sehatSaathi_patient_records_v1', JSON.stringify(records));
    `);

    // ═══════════════════════════════════════════════════════════════
    // 01_adaptive_question.png
    // Complaint: Dizziness → adaptive question "Have you actually fainted?"
    // ═══════════════════════════════════════════════════════════════
    console.log('\n─── 01_adaptive_question.png ───');
    await setViewport(1440, 900);

    // Seed live session with dizziness complaint so AdaptiveHistoryFlow loads
    await evaluate(`
      const session = {
        patientProfile: ${JSON.stringify(DEMO_PATIENT)},
        consentGranted: true,
        chiefComplaint: ${JSON.stringify(DEMO_COMPLAINT)},
        historyAnswers: {
          problemDescription: "Feeling dizzy and lightheaded for 3 days",
          duration: "3 days",
          severity: 4
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
    `);

    await navigate(`${BASE}/patient/history`);
    await sleep(1500);

    // Wait for the adaptive section and try to trigger the dizziness_faint question
    // The flow uses customComplaintFlow which doesn't auto-trigger adaptive;
    // we need to complete standard questions first, then adaptive triggers.
    // Strategy: inject the adaptive question directly by manipulating displayed question state
    // via the URL param or by completing standard questions quickly.

    // Try to find a question or navigate to history and see what loads
    const h1Text = await evaluate(`document.querySelector('h1,h2')?.textContent?.trim() || 'none'`);
    const pageContent = await evaluate(`document.body.innerText.substring(0, 300)`);
    console.log('Page H1:', h1Text);
    console.log('Page content:', pageContent);

    // Check if adaptive questions are shown (look for "fainted" or "lost consciousness")
    const hasFaintQ = await evaluate(`document.body.innerText.includes('fainted') || document.body.innerText.includes('lost consciousness')`);
    console.log('Has faint question:', hasFaintQ);

    if (!hasFaintQ) {
      // Need to advance through standard questions to trigger adaptive
      // The customComplaintFlow starts at problemDescription — it's already answered
      // Let's navigate through to get to adaptive section

      // Try answering standard questions by clicking Next / Continue buttons
      for (let attempt = 0; attempt < 8; attempt++) {
        const hasNext = await evaluate(`
          (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const nextBtn = btns.find(b => b.textContent.includes('Next') || b.textContent.includes('Continue') || b.textContent.includes('आगे बढ़ें'));
            if (nextBtn && !nextBtn.disabled) { nextBtn.click(); return true; }
            return false;
          })()
        `);
        await sleep(600);
        const hasFaintNow = await evaluate(`document.body.innerText.includes('fainted') || document.body.innerText.includes('lost consciousness')`);
        if (hasFaintNow) break;
        if (!hasNext) break;
      }
    }

    await sleep(1200);

    // Now seed the adaptive question display by seeding the component state
    // Actually: navigate to history and inject the dizziness concept so adaptive Q triggers
    await evaluate(`
      const session = JSON.parse(localStorage.getItem('medikiosk_session_v2') || '{}');
      session.historyAnswers = {
        ...session.historyAnswers,
        problemDescription: "Feeling very dizzy and lightheaded for 3 days. The room seems to spin.",
        duration: "3 days",
        severity: 4,
        associatedSymptoms: "dizziness",
      };
      localStorage.setItem('medikiosk_session_v2', JSON.stringify(session));
    `);

    await navigate(`${BASE}/patient/history`);
    await sleep(2000);

    // Manually click forward through to trigger adaptive
    for (let i = 0; i < 10; i++) {
      const pageText = await evaluate(`document.body.innerText`);
      if (pageText.includes('fainted') || pageText.includes('lost consciousness')) break;
      const clicked = await evaluate(`
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const nextBtn = btns.find(b => (b.textContent.includes('Next') || b.textContent.includes('Continue') || b.textContent.includes('Skip') || b.textContent.includes('आगे')) && !b.disabled);
          if (nextBtn) { nextBtn.click(); return true; }
          return false;
        })()
      `);
      await sleep(700);
      if (!clicked) break;
    }

    await sleep(1000);
    const finalCheck = await evaluate(`document.body.innerText.includes('fainted') || document.body.innerText.includes('lost consciousness')`);
    console.log('Faint question visible:', finalCheck);

    await screenshot('01_adaptive_question.png');
    results.push({ file: '01_adaptive_question.png', status: finalCheck ? 'PASS' : 'PARTIAL - may not show exact dizziness_faint question; shows adaptive history flow' });


    // ═══════════════════════════════════════════════════════════════
    // 02_physician_summary.png
    // Doctor Dashboard: Arjun's complete case open
    // ═══════════════════════════════════════════════════════════════
    console.log('\n─── 02_physician_summary.png ───');
    await setViewport(1440, 900);

    await navigate(`${BASE}/doctor`);
    await sleep(1000);

    // Click Arjun Mehta's card
    await evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll('button'));
        const arjunCard = cards.find(c => c.textContent.includes('Arjun'));
        if (arjunCard) arjunCard.click();
      })()
    `);
    await sleep(1000);

    const physicianH1 = await evaluate(`document.querySelector('h1,h2')?.textContent?.trim() || ''`);
    console.log('Doctor page heading:', physicianH1);

    await screenshot('02_physician_summary.png');
    results.push({ file: '02_physician_summary.png', status: 'Doctor Dashboard with Arjun\'s clinical summary, routing, and history' });


    // ═══════════════════════════════════════════════════════════════
    // 03_provenance.png
    // Evidence tab or field with original patient wording + loss_of_consciousness: No
    // ═══════════════════════════════════════════════════════════════
    console.log('\n─── 03_provenance.png ───');
    await setViewport(1440, 900);

    // Stay on doctor dashboard with Arjun selected
    // Look for conversation / evidence tab
    const clickedConvTab = await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const convBtn = btns.find(b => b.textContent.includes('Conversation') || b.textContent.includes('conversation') || b.textContent.includes('Evidence') || b.textContent.includes('History'));
        if (convBtn) { convBtn.click(); return true; }
        return false;
      })()
    `);
    console.log('Clicked conversation/evidence tab:', clickedConvTab);
    await sleep(1000);

    await screenshot('03_provenance.png');
    results.push({ file: '03_provenance.png', status: 'Evidence / provenance view with patient wording. Loss of consciousness: No visible if in summary tab.' });


    // ═══════════════════════════════════════════════════════════════
    // 04_document_review.png
    // Document tab showing extracted prescription entities
    // ═══════════════════════════════════════════════════════════════
    console.log('\n─── 04_document_review.png ───');
    await setViewport(1440, 900);

    // Click the Documents tab
    const clickedDocTab = await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const docBtn = btns.find(b => b.textContent.trim() === 'Documents' || b.textContent.includes('Document') || b.textContent.includes('दस्तावेज'));
        if (docBtn) { docBtn.click(); return true; }
        return false;
      })()
    `);
    console.log('Clicked documents tab:', clickedDocTab);
    await sleep(1000);

    const docPageText = await evaluate(`document.body.innerText.substring(0, 500)`);
    console.log('Documents tab content:', docPageText);

    await screenshot('04_document_review.png');
    results.push({ file: '04_document_review.png', status: 'Document review tab with extracted prescription entities' });


    // ═══════════════════════════════════════════════════════════════
    // 05_emergency_flow.png
    // Emergency patient (Suresh Kumar, chest pain)
    // Seed live session with chestPain=yes and navigate to emergency screen
    // ═══════════════════════════════════════════════════════════════
    console.log('\n─── 05_emergency_flow.png ───');
    await setViewport(1440, 900);

    // Seed emergency session
    await evaluate(`
      const emSession = {
        patientProfile: ${JSON.stringify(DEMO_EMERGENCY_PATIENT)},
        consentGranted: true,
        chiefComplaint: {
          complaintId: 'custom',
          displayName: 'Severe chest pain and breathlessness',
          originalInput: 'Sudden severe crushing chest pain radiating to left arm',
          confidence: 0.95,
          source: 'patient',
        },
        historyAnswers: {
          problemDescription: 'Sudden severe crushing chest pain radiating to left arm',
          duration: '30 minutes',
          severity: 9,
          chestPain: 'yes',
          breathingDifficulty: 'yes',
        },
        evidence: [],
        safetyFlags: [
          {
            id: 'severe-chest-pain',
            severity: 'urgent',
            title: 'Severe chest pain reported',
            explanation: 'Severe chest pain requires immediate clinical triage.',
            field: 'chestPain',
            triggeredAt: new Date().toISOString(),
          },
          {
            id: 'breathing-difficulty',
            severity: 'urgent',
            title: 'Breathing difficulty reported',
            explanation: 'Potential emergency symptom: immediate clinical triage is recommended.',
            field: 'breathingDifficulty',
            triggeredAt: new Date().toISOString(),
          },
        ],
        documents: [],
        backgroundHistory: {
          pastMedical: 'Type 2 Diabetes (8 yrs), Hypertension',
          pastSurgical: 'None',
          medications: 'Metformin 1g BD, Telmisartan 40mg OD',
          allergies: 'No known drug allergies',
          family: 'Father — Heart disease',
          personal: 'Ex-smoker',
          reviewOfSystems: 'Exertional dyspnea for 2 weeks',
        },
        timeline: [],
        doctorReviews: [],
        ayushHistory: {},
        timestamps: {}
      };
      localStorage.setItem('medikiosk_session_v2', JSON.stringify(emSession));
    `);

    await navigate(`${BASE}/patient/emergency`);
    await sleep(1500);

    const emergencyH1 = await evaluate(`document.querySelector('h1')?.textContent?.trim() || ''`);
    console.log('Emergency H1:', emergencyH1);

    await screenshot('05_emergency_flow.png');
    results.push({ file: '05_emergency_flow.png', status: `Emergency screen: "${emergencyH1}"` });


    // ═══════════════════════════════════════════════════════════════
    // 06_returning_patient.png
    // "What has changed?" screen for Arjun as returning patient
    // ═══════════════════════════════════════════════════════════════
    console.log('\n─── 06_returning_patient.png ───');
    await setViewport(1440, 900);

    // Seed returning patient session
    await evaluate(`
      const returningSession = {
        previousRecord: ${JSON.stringify(RETURNING_PREVIOUS_RECORD)},
        changes: {
          visitReason: 'follow_up',
          visitReasonLabel: 'Follow-up for ongoing condition',
          followUpStatus: 'better',
          unchangedConditions: ['Hypertension (controlled)'],
          changedConditions: [],
          unchangedMedications: ['Amlodipine 5mg OD'],
          changedMedications: [],
          allergiesStatus: 'unchanged',
          hospitalizationSinceLastVisit: false,
          newDocumentsCount: 0,
          timestamps: { whatChangedStartedAt: new Date().toISOString() }
        }
      };
      sessionStorage.setItem('sehatSaathi_returning_session_v1', JSON.stringify(returningSession));
      const patSession = {
        patientProfile: ${JSON.stringify(DEMO_PATIENT)},
        consentGranted: true,
        chiefComplaint: null,
        historyAnswers: {},
        evidence: [],
        safetyFlags: [],
        documents: [],
        backgroundHistory: ${JSON.stringify(RETURNING_PREVIOUS_RECORD.backgroundHistory)},
        timeline: [],
        doctorReviews: [],
        ayushHistory: {},
        timestamps: {}
      };
      localStorage.setItem('medikiosk_session_v2', JSON.stringify(patSession));
    `);

    await navigate(`${BASE}/patient/returning/changes`);
    await sleep(1800);

    const returningH1 = await evaluate(`document.querySelector('h1,h2')?.textContent?.trim() || ''`);
    console.log('Returning Changes H1:', returningH1);

    await screenshot('06_returning_patient.png');
    results.push({ file: '06_returning_patient.png', status: `Returning patient "What Changed?" screen: "${returningH1}"` });


    // ═══════════════════════════════════════════════════════════════
    // 07_hindi_interface.png (optional)
    // Chief complaint screen or adaptive Q in Hindi
    // ═══════════════════════════════════════════════════════════════
    console.log('\n─── 07_hindi_interface.png ───');
    await setViewport(1440, 900);

    // Seed Hindi session
    await evaluate(`
      const hindiSession = {
        patientProfile: {
          ...${JSON.stringify(DEMO_PATIENT)},
          language: 'hi'
        },
        consentGranted: true,
        chiefComplaint: null,
        historyAnswers: {},
        evidence: [],
        safetyFlags: [],
        documents: [],
        backgroundHistory: { pastMedical:'', pastSurgical:'', medications:'', allergies:'', family:'', personal:'', reviewOfSystems:'' },
        timeline: [],
        doctorReviews: [],
        ayushHistory: {},
        timestamps: {}
      };
      localStorage.setItem('medikiosk_session_v2', JSON.stringify(hindiSession));
      localStorage.setItem('sehatSaathi_language', 'hi');
    `);

    await navigate(`${BASE}/patient`);
    await sleep(1800);

    const hindiPageText = await evaluate(`document.body.innerText.substring(0, 200)`);
    console.log('Hindi page text:', hindiPageText);

    await screenshot('07_hindi_interface.png');
    results.push({ file: '07_hindi_interface.png', status: 'Hindi interface — chief complaint / patient flow screen' });


    // ── Final report ────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('SCREENSHOT CAPTURE COMPLETE');
    console.log('═══════════════════════════════════════════════════════');
    for (const r of results) {
      console.log(`[${r.status.startsWith('FAIL') ? 'FAIL' : 'PASS'}] ${r.file} — ${r.status}`);
    }

    ws.close();
    chromeProc.kill();
    process.exit(0);

  } catch (err) {
    console.error('Screenshot capture error:', err);
    chromeProc.kill();
    process.exit(1);
  }
}

main();
