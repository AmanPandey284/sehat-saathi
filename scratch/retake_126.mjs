/**
 * Retake for individual takes with issues.
 * Takes:
 *   --take 1: New patient intake
 *   --take 2: Adaptive questioning (extended with patient review)
 *   --take 6: Physician dashboard + FHIR
 */
import { spawn, execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const BASE    = 'http://localhost:4173';
const OUT_DIR = 'C:\\Users\\Roshni\\sehar-saathi\\sehat-saathi\\recordings';
const FFMPEG  = 'C:\\Users\\Roshni\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-full_build\\bin\\ffmpeg.exe';
const CDP_PORT= 9703;
const FPS     = 10;
const CHROME  = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const W = 1440, H = 900;

const ARJUN = { name:'Arjun Mehta',age:'34',sex:'Male',identifier:'ABHA-34-7721-9801',identifierType:'abha',language:'en',emergencyContact:{guardianName:'Priya Mehta',relationship:'Wife',phoneNumber:'9812345678'} };
const SURESH= { name:'Suresh Kumar',age:'58',sex:'Male',identifier:'ABHA-58-3312-7400',identifierType:'abha',language:'en',emergencyContact:{guardianName:'Kavitha Kumar',relationship:'Wife',phoneNumber:'9900112233'} };
const DIZZINESS = { complaintId:'custom',displayName:'Dizziness and Vertigo',originalInput:'I have been feeling very dizzy and lightheaded for 3 days.',confidence:0.92,source:'patient' };
const CHEST     = { complaintId:'custom',displayName:'Chest Pain',originalInput:'Sudden severe crushing chest pain with breathlessness for 30 minutes.',confidence:0.98,source:'patient' };
const ADAPTIVE  = {
  detectedConcepts:['dizziness'], skipped:[], allAnsweredConceptIds:[],
  questions:[
    { id:'dizziness_faint',field:'loss_of_consciousness',clinicalLabel:'Loss of consciousness',text:'Have you actually fainted or lost consciousness?',textHi:'क्या आप वास्तव में बेहोश हुए हैं?',type:'yes_no',concepts:['dizziness'],priority:10 },
    { id:'dizziness_standing',field:'postural_dizziness',clinicalLabel:'Worse on standing',text:'Does the dizziness become worse when you stand up?',textHi:'क्या खड़े होने पर चक्कर बढ़ता है?',type:'yes_no',concepts:['dizziness'],priority:4 },
  ],
};
const ARJUN_HIST = { problemDescription:'Feeling dizzy and lightheaded for 3 days. The room spins.',duration:'3 days',severity:4,loss_of_consciousness:'no',postural_dizziness:'yes',associatedSymptoms:[],additionalNotes:'' };
const ARJUN_EVIDENCE = [
  { field:'loss_of_consciousness',display:'Loss of consciousness',source:'patient',normalizedValue:'no',confidence:'high',rawText:'No, I have not fainted.',language:'en' },
  { field:'postural_dizziness',display:'Worse on standing',source:'patient',normalizedValue:'yes',confidence:'high',rawText:'yes, worse on standing',language:'en' },
  { field:'duration',display:'Duration',source:'patient',normalizedValue:'3 days',confidence:'high',rawText:'3 days',language:'en' },
  { field:'severity',display:'Severity',source:'patient',normalizedValue:'4 out of 10',confidence:'high',rawText:'4',language:'en' },
];
const ARJUN_PREV = {
  id:'arjun-prev-001',patientProfile:ARJUN,chiefComplaint:DIZZINESS,
  historyAnswers:{ problemDescription:'Dizziness and spinning sensation',duration:'2 weeks',severity:3,loss_of_consciousness:'no',postural_dizziness:'yes' },
  evidence: ARJUN_EVIDENCE,
  backgroundHistory:{ pastMedical:'Hypertension (controlled)',medications:'Amlodipine 5mg OD',pastSurgical:'',allergies:'',family:'',personal:'',reviewOfSystems:'' },
  safetyFlags:[],
  documents:[{
    id:'doc-arjun-001',name:'Prescription_Dr_Kapoor_09Sep2026.jpg',type:'prescription',uploadedAt:'2026-09-09T10:00:00.000Z',status:'processed',processingMethod:'ocr',
    extractedEntities:[
      { type:'medication',value:'Betahistine 16mg BD x 2 weeks',confidence:'high' },
      { type:'medication',value:'Stemetil 5mg TDS x 5 days',confidence:'high' },
      { type:'medication',value:'Vitamin D3 60000IU weekly x 4',confidence:'high' },
      { type:'medication',value:'Flunarizine 5mg OD HS',confidence:'high' },
      { type:'diagnosis',value:'Benign Positional Vertigo',confidence:'high' },
    ],
  }],
  timeline:[],doctorReviews:[],submittedAt:'2026-09-10T08:30:00.000Z',consentGranted:true,ayushHistory:{},
  longitudinalChanges:{ previousSafetyFlags:[] },timestamps:{},
};
const SURESH_REC = {
  id:'suresh-001',patientProfile:SURESH,chiefComplaint:CHEST,
  historyAnswers:{ problemDescription:'Sudden severe crushing chest pain with breathlessness',severity:9 },
  evidence:[],
  backgroundHistory:{ pastMedical:'Type 2 Diabetes (8 yrs), Hypertension',medications:'Metformin 1g BD, Telmisartan 40mg OD',pastSurgical:'',allergies:'',family:'',personal:'',reviewOfSystems:'' },
  safetyFlags:[
    { id:'severe-chest-pain',label:'Severe chest pain reported',severity:'urgent',description:'Severe chest pain requires immediate clinical triage.' },
    { id:'breathing-difficulty',label:'Breathing difficulty reported',severity:'urgent',description:'Potential emergency symptom: immediate clinical triage is recommended.' },
  ],
  documents:[],timeline:[],doctorReviews:[],
  submittedAt:new Date().toISOString(),consentGranted:true,ayushHistory:{},
  longitudinalChanges:{ previousSafetyFlags:[] },timestamps:{},
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getWsUrl(port) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await res.json();
      const t = targets.find(t => t.type==='page' && !t.url.startsWith('chrome://') && !t.url.startsWith('devtools://'));
      if (t?.webSocketDebuggerUrl) return t.webSocketDebuggerUrl;
    } catch {}
    await sleep(400);
  }
  throw new Error('CDP timeout');
}

function createCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
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
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
    }
  };

  const send = (m, p = {}) => new Promise((res, rej) => {
    const mid = id++;
    pending.set(mid, { res, rej });
    ws.send(JSON.stringify({ id: mid, method: m, params: p }));
  });

  return {
    send, ws,
    setFrame: cb => { frameCallback = cb; },
    ready: new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }),
  };
}

async function js(cdp, expr) {
  try {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r?.exceptionDetails) { console.warn('  [js]', r.exceptionDetails.exception?.description?.substring(0,100)); return undefined; }
    return r?.result?.value;
  } catch(e) { console.warn('  [js throw]', e.message?.substring(0,80)); return undefined; }
}

async function go(cdp, url) {
  await cdp.send('Page.navigate', { url });
  await sleep(2200);
}

function beginTake(cdp, name) {
  const dir = `C:\\Users\\Roshni\\AppData\\Local\\Temp\\sih_${name}_${Date.now()}`;
  mkdirSync(dir, { recursive: true });
  let n = 0;
  cdp.setFrame(p => {
    writeFileSync(join(dir, `f${String(n++).padStart(6,'0')}.jpg`), Buffer.from(p.data, 'base64'));
    cdp.send('Page.screencastFrameAck', { sessionId: p.sessionId }).catch(() => {});
  });
  cdp.send('Page.startScreencast', { format:'jpeg', quality:80, everyNthFrame:1, maxWidth:W, maxHeight:H }).catch(() => {});
  return { dir, n: () => n };
}

async function endTake(cdp, t, file) {
  await cdp.send('Page.stopScreencast').catch(() => {});
  cdp.setFrame(null);
  await sleep(300);
  const n = t.n();
  console.log(`  ${n} frames → ${file}`);
  if (n < 2) { console.log('  ⚠ Too few frames'); return false; }
  const cmd = `"${FFMPEG}" -y -framerate ${FPS} -i "${join(t.dir, 'f%06d.jpg')}" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${file}"`;
  try {
    execSync(cmd, { stdio:'pipe' });
    console.log(`  ✓ ${Math.round(statSync(file).size/1024)} KB`);
    return true;
  } catch(e) { console.error('  ✗ Encode:', e.stderr?.toString().substring(0,200)); return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// RETAKE 1 — New Patient Intake
// Strategy: start from landing, record everything from the beginning
// ─────────────────────────────────────────────────────────────────────────────
async function retakeTake1(cdp) {
  console.log('\n══ RETAKE 1 — New Patient Structured Intake ══');

  // First navigate to app to establish localStorage origin
  await go(cdp, `${BASE}/`);
  // Clear any existing session
  await js(cdp, `['medikiosk_session_v2','sehatSaathi_patient_records_v1','sehatSaathi_language'].forEach(k=>localStorage.removeItem(k)); try{sessionStorage.clear();}catch{}`);
  await sleep(500);
  // Navigate back fresh
  await go(cdp, `${BASE}/`);
  await sleep(800);

  const t = beginTake(cdp, 'take1');

  // Landing page — pause
  await sleep(3000);

  // Debug: what's on the page
  const text = await js(cdp, `document.body.innerText.substring(0, 300)`);
  console.log('  Landing page text:', text?.substring(0, 100));

  // Find and click Start Intake button
  const clicked = await js(cdp, `
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      for (const b of btns) {
        const t = b.textContent.trim();
        if (t.includes('Start Intake') || t.includes('शुरू') || t.includes('Consultation') || t.includes('Begin')) {
          b.click(); return 'clicked: ' + t.substring(0,40);
        }
      }
      return btns.map(b => b.textContent.trim().substring(0,20)).join(' | ').substring(0,120);
    })()
  `);
  console.log('  Start button result:', clicked);
  await sleep(2000);

  // Where are we now?
  let path = await js(cdp, `window.location.pathname`);
  console.log('  Path after start click:', path);

  // If still on landing, try clicking the link/card directly
  if (path === '/' || !path) {
    const linked = await js(cdp, `
      (() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        const l = links.find(a => a.href.includes('/entry') || a.href.includes('/consent') || a.href.includes('/patient'));
        if (l) { l.click(); return l.href; }
        return 'no link found';
      })()
    `);
    console.log('  Link click:', linked);
    await sleep(1500);
    path = await js(cdp, `window.location.pathname`);
    console.log('  Path after link click:', path);
  }

  // Manual fallback: navigate directly to entry
  if (path === '/' || path === null) {
    console.log('  Fallback: navigating directly to /patient/entry');
    await go(cdp, `${BASE}/patient/entry`);
  }

  // Entry choice page
  path = await js(cdp, `window.location.pathname`);
  console.log('  Entry path:', path);
  await sleep(1000);

  if (path?.includes('/entry')) {
    const txt = await js(cdp, `document.body.innerText.substring(0,200)`);
    console.log('  Entry page:', txt?.substring(0,100));
    const r = await js(cdp, `
      (() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        for (const b of btns) {
          const t = b.textContent.trim();
          if (t.includes('New') || t.includes('नया') || t.includes('First') || t.includes('Fresh')) {
            b.click(); return 'clicked: ' + t.substring(0,40);
          }
        }
        return btns.map(b=>b.textContent.trim().substring(0,20)).join(' | ').substring(0,150);
      })()
    `);
    console.log('  Entry choice:', r);
    await sleep(1800);
  }

  // Consent
  path = await js(cdp, `window.location.pathname`);
  console.log('  After entry:', path);
  if (path?.includes('/consent')) {
    await sleep(1500); // read consent
    const r = await js(cdp, `
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        for (const b of btns) {
          const t = b.textContent.trim().toLowerCase();
          if (t.includes('accept') || t.includes('agree') || t.includes('understand') || t.includes('सहमति')) {
            b.click(); return 'clicked: ' + b.textContent.trim().substring(0,40);
          }
        }
        return btns.map(b=>b.textContent.trim().substring(0,20)).join(' | ').substring(0,150);
      })()
    `);
    console.log('  Consent:', r);
    await sleep(1800);
  }

  // Profile
  path = await js(cdp, `window.location.pathname`);
  console.log('  After consent:', path);
  if (path?.includes('/profile') || path?.includes('/consent')) {
    // Try to fill profile
    await js(cdp, `
      (() => {
        const s = (inp, val) => {
          if (!inp) return;
          const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')?.set;
          d?.call(inp, val);
          inp.dispatchEvent(new Event('input',{bubbles:true}));
          inp.dispatchEvent(new Event('change',{bubbles:true}));
        };
        const inputs = Array.from(document.querySelectorAll('input'));
        const nameInp = inputs.find(i => /name/i.test(i.placeholder+i.name+i.id));
        s(nameInp, 'Arjun Mehta');
        const ageInp = inputs.find(i => /age/i.test(i.placeholder+i.name+i.id) || i.type === 'number');
        s(ageInp, '34');
      })()
    `);
    await sleep(500);
    await js(cdp, `
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        btns.find(b => b.textContent.trim() === 'Male' || b.textContent.trim() === 'पुरुष')?.click();
      })()
    `);
    await sleep(1500); // pause on profile
    await js(cdp, `
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => (b.textContent.includes('Continue') || b.textContent.includes('आगे')) && !b.disabled);
        btn?.click();
      })()
    `);
    await sleep(1800);
  }

  // Chief Complaint
  path = await js(cdp, `window.location.pathname`);
  console.log('  CC path:', path);
  if (path === '/patient' || path?.endsWith('/patient')) {
    await sleep(800);
    await js(cdp, `
      (() => {
        const ta = document.querySelector('textarea');
        if (!ta) return 'no textarea';
        const s = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value')?.set;
        s?.call(ta, 'I have been feeling very dizzy and lightheaded for 3 days. The room spins around me.');
        ta.dispatchEvent(new Event('input',{bubbles:true}));
        ta.dispatchEvent(new Event('change',{bubbles:true}));
      })()
    `);
    await sleep(2000); // pause — show typed complaint
    await js(cdp, `
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => (b.textContent.includes('Continue') || b.textContent.includes('आगे')) && !b.disabled);
        btn?.click();
      })()
    `);
    await sleep(2000); // → history
  }

  // History page
  path = await js(cdp, `window.location.pathname`);
  console.log('  History path:', path);
  if (path?.includes('/history')) {
    const h1 = await js(cdp, `document.querySelector('h1')?.textContent?.trim()`);
    console.log('  History H1:', h1);
    await sleep(2500); // show history questions
  }

  await endTake(cdp, t, join(OUT_DIR, 'take1_new_patient_intake.mp4'));
}

// ─────────────────────────────────────────────────────────────────────────────
// RETAKE 2 — Adaptive + Patient Review
// ─────────────────────────────────────────────────────────────────────────────
async function retakeTake2(cdp) {
  console.log('\n══ RETAKE 2 — Adaptive Questioning + Patient Review ══');

  await go(cdp, `${BASE}/`);
  await js(cdp, `['medikiosk_session_v2','sehatSaathi_patient_records_v1','sehatSaathi_language'].forEach(k=>localStorage.removeItem(k)); try{sessionStorage.clear();}catch{}`);

  // Seed session with all history answered (for patient review jump)
  const fullSession = {
    patientProfile:ARJUN, consentGranted:true, chiefComplaint:DIZZINESS,
    historyAnswers:ARJUN_HIST, evidence:ARJUN_EVIDENCE, safetyFlags:[], documents:[],
    backgroundHistory:{ pastMedical:'Hypertension (controlled)', medications:'Amlodipine 5mg OD', pastSurgical:'', allergies:'', family:'', personal:'', reviewOfSystems:'' },
    timeline:[], doctorReviews:[], ayushHistory:{}, timestamps:{},
  };
  await js(cdp, `localStorage.setItem('medikiosk_session_v2', JSON.stringify(${JSON.stringify(fullSession)}))`);

  // Navigate to history page to get adaptive analysis in sessionStorage
  await go(cdp, `${BASE}/patient/history`);
  await sleep(500);
  await js(cdp, `sessionStorage.setItem('sehatSaathi_adaptive_analysis', JSON.stringify(${JSON.stringify(ADAPTIVE)}))`);

  // Remount history page
  await cdp.send('Page.navigate', { url: `${BASE}/patient` });
  await sleep(400);
  await cdp.send('Page.navigate', { url: `${BASE}/patient/history` });
  await sleep(2500);

  const t = beginTake(cdp, 'take2');

  // Verify faint question
  const hasFaint = await js(cdp, `document.body.innerText.includes('fainted') || document.body.innerText.includes('lost consciousness')`);
  console.log('  Adaptive question visible:', hasFaint);
  if (!hasFaint) {
    const txt = await js(cdp, `document.body.innerText.substring(0,300)`);
    console.log('  Page text:', txt);
    console.log('  ✗ TAKE 2 RETAKE FAILURE: faint question not visible');
    await endTake(cdp, t, join(OUT_DIR, 'take2_adaptive_FAILED.mp4'));
    return;
  }

  await sleep(2500); // pause — viewer reads question

  // Click No
  await js(cdp, `
    (() => {
      const n = document.querySelector('[data-testid="adaptive-option-no"]');
      if (n) { n.click(); return; }
      Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='No')?.click();
    })()
  `);
  await sleep(2500); // pause — show No selected

  // Change to Yes
  await js(cdp, `
    (() => {
      const y = document.querySelector('[data-testid="adaptive-option-yes"]');
      if (y) { y.click(); return; }
      Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Yes')?.click();
    })()
  `);
  await sleep(1500);

  // Change back to No
  await js(cdp, `
    (() => {
      const n = document.querySelector('[data-testid="adaptive-option-no"]');
      if (n) { n.click(); return; }
      Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='No')?.click();
    })()
  `);
  await sleep(2500); // hold — final = No

  // Click Continue on the adaptive card
  await js(cdp, `
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      btns.find(b => b.textContent.trim() === 'Continue')?.click();
    })()
  `);
  await sleep(2000);

  // 2nd adaptive question
  const has2 = await js(cdp, `document.body.innerText.includes('worse') || document.body.innerText.includes('stand')`);
  if (has2) {
    await js(cdp, `
      (() => {
        const y = document.querySelector('[data-testid="adaptive-option-yes"]');
        if (y) { y.click(); return; }
        Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Yes')?.click();
      })()
    `);
    await sleep(2000);
    await js(cdp, `
      Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Continue')?.click()
    `);
    await sleep(2000);
  }

  // Now navigate to patient review directly (session already has all answers)
  console.log('  → Navigate to patient review');
  await go(cdp, `${BASE}/patient/review`);
  await sleep(2000);

  // Scroll through review
  const reviewText = await js(cdp, `document.body.innerText.substring(0, 500)`);
  console.log('  Review text sample:', reviewText?.substring(0, 150));

  const hasLOC = await js(cdp, `document.body.innerText.toLowerCase().includes('loss of consciousness')`);
  const hasAddl = await js(cdp, `document.body.innerText.toLowerCase().includes('additional notes: no')`);
  console.log('  "Loss of consciousness" label:', hasLOC, ' | "Additional Notes: No":', hasAddl);

  await sleep(2000); // pause
  await js(cdp, `window.scrollBy({top:300, behavior:'smooth'})`);
  await sleep(1800);
  await js(cdp, `window.scrollTo({top:0, behavior:'smooth'})`);
  await sleep(1500);

  await endTake(cdp, t, join(OUT_DIR, 'take2_adaptive_questioning.mp4'));
}

// ─────────────────────────────────────────────────────────────────────────────
// RETAKE 6 — Physician Dashboard
// ─────────────────────────────────────────────────────────────────────────────
async function retakeTake6(cdp) {
  console.log('\n══ RETAKE 6 — Physician Dashboard + FHIR ══');

  await go(cdp, `${BASE}/`);
  await js(cdp, `['medikiosk_session_v2','sehatSaathi_patient_records_v1'].forEach(k=>localStorage.removeItem(k)); try{sessionStorage.clear();}catch{}`);

  // Seed auth + records
  await js(cdp, `
    const u = { username:'demo-doctor', displayName:'Dr. Sharma (Demo Physician)', role:'Attending Physician / Clinical Admin', authenticatedAt:new Date().toISOString() };
    localStorage.setItem('sehatSaathi_doctor_auth_v1', JSON.stringify(u));
    sessionStorage.setItem('sehatSaathi_doctor_auth_v1', JSON.stringify(u));
  `);
  await js(cdp, `localStorage.setItem('sehatSaathi_patient_records_v1', JSON.stringify(${JSON.stringify([ARJUN_PREV, SURESH_REC])}))`);

  // Navigate to doctor dashboard
  await go(cdp, `${BASE}/doctor`);
  await sleep(1000);

  // Handle login if redirected
  let path = await js(cdp, `window.location.pathname`);
  console.log('  Path after /doctor:', path);
  if (path?.includes('/login')) {
    console.log('  → Filling login form');
    await js(cdp, `
      (() => {
        const s = (inp, val) => {
          const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')?.set;
          d?.call(inp, val);
          inp.dispatchEvent(new Event('input',{bubbles:true}));
        };
        const inputs = Array.from(document.querySelectorAll('input'));
        const uInp = inputs.find(i => i.type==='text' || /user/i.test(i.name+i.id));
        const pInp = inputs.find(i => i.type==='password');
        if (uInp) s(uInp, 'demo-doctor');
        if (pInp) s(pInp, 'demo123');
      })()
    `);
    await sleep(500);
    await js(cdp, `
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.type==='submit' || /sign in|login|enter/i.test(b.textContent));
        btn?.click();
      })()
    `);
    await sleep(2500);
  }

  // Verify on dashboard
  path = await js(cdp, `window.location.pathname`);
  console.log('  On dashboard:', path);

  const t = beginTake(cdp, 'take6');

  await sleep(2500); // show queue

  // Click Arjun's card
  console.log('  → Click Arjun Mehta card');
  const cardResult = await js(cdp, `
    (() => {
      // Find any element showing Arjun that has a click handler
      const all = Array.from(document.querySelectorAll('[class*="cursor"], button, li, [role="button"]'));
      for (const el of all) {
        if (el.innerText?.includes('Arjun') || el.innerText?.includes('Mehta')) {
          el.click();
          return 'clicked: ' + el.tagName + ' ' + el.className.substring(0,40);
        }
      }
      // Try any element with the text
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.includes('Arjun')) {
          const el = node.parentElement;
          const clickable = el.closest('[class*="cursor"]') || el.closest('button') || el.closest('li') || el;
          clickable.click();
          return 'clicked via walker: ' + clickable.tagName;
        }
      }
      return 'Arjun not found in DOM. Available text: ' + document.body.innerText.substring(0,200);
    })()
  `);
  console.log('  Card click result:', cardResult?.substring(0, 100));
  await sleep(2500);

  // Show clinical summary
  const summaryH1 = await js(cdp, `document.querySelector('h1, h2')?.textContent?.trim()`);
  console.log('  Summary heading:', summaryH1);

  await sleep(2000); // pause on summary
  await js(cdp, `window.scrollBy({top:200, behavior:'smooth'})`);
  await sleep(1500);
  await js(cdp, `window.scrollBy({top:200, behavior:'smooth'})`);
  await sleep(1500);
  await js(cdp, `window.scrollBy({top:200, behavior:'smooth'})`);
  await sleep(1500);

  const hasLOC = await js(cdp, `document.body.innerText.toLowerCase().includes('loss of consciousness')`);
  console.log('  "Loss of consciousness" visible:', hasLOC);

  await js(cdp, `window.scrollTo({top:0, behavior:'smooth'})`);
  await sleep(1200);

  // Evidence tab
  const evtab = await js(cdp, `
    (() => {
      const btns = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const tab = btns.find(b => /evidence|provenance|original/i.test(b.textContent));
      if (tab) { tab.click(); return 'clicked: ' + tab.textContent.trim().substring(0,30); }
      return btns.map(b=>b.textContent.trim().substring(0,15)).join(' | ').substring(0,150);
    })()
  `);
  console.log('  Evidence tab:', evtab);
  await sleep(2500);

  // FHIR export
  const fhirBtn = await js(cdp, `
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(b => /fhir|export/i.test(b.textContent));
      if (b) { b.scrollIntoView({behavior:'smooth',block:'center'}); return b.textContent.trim().substring(0,40); }
      return 'FHIR button not found. Buttons: ' + btns.map(b=>b.textContent.trim().substring(0,12)).join(' | ').substring(0,150);
    })()
  `);
  console.log('  FHIR button:', fhirBtn);
  await sleep(1800);

  // Click FHIR
  await js(cdp, `
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      btns.find(b => /fhir|export/i.test(b.textContent))?.click();
    })()
  `);
  await sleep(2500);

  await endTake(cdp, t, join(OUT_DIR, 'take6_physician_dashboard_fhir.mp4'));
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const userDataDir = `C:\\Users\\Roshni\\AppData\\Local\\Temp\\sih_retake_${Date.now()}`;
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
  const cdp = createCdp(wsUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('DOM.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width:W, height:H, deviceScaleFactor:1, mobile:false });
  console.log('CDP connected');

  await retakeTake1(cdp);
  await retakeTake2(cdp);
  await retakeTake6(cdp);

  console.log('\n══ RETAKE COMPLETE ══');
  cdp.ws.close();
  chrome.kill();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
