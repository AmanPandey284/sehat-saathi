import { spawn } from 'child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = `C:\\Users\\Roshni\\AppData\\Local\\Temp\\cdp_returning_safety_${Date.now()}`;
const PORT = 9598;

const chromeProc = spawn(`"${chromePath}"`, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${userDataDir}`,
  '--headless=new',
  '--disable-gpu',
  '--window-size=1280,900',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-web-security',
  '--test-type',
  'http://127.0.0.1:4173/'
], { shell: true });

async function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      const viteTarget = targets.find(
        (t) => t.type === 'page' && (t.url.includes('4173') || t.title.includes('Sehat Saathi'))
      );
      const fallback = targets.find(
        (t) => t.type === 'page' && !t.url.startsWith('chrome://') && !t.url.startsWith('devtools://')
      );
      const chosen = viteTarget || fallback;
      if (chosen && chosen.webSocketDebuggerUrl) {
        return chosen.webSocketDebuggerUrl;
      }
    } catch {}
    await sleep(500);
  }
  throw new Error('Could not connect to Chrome CDP');
}

const results = [];

function recordResult(testName, passed, details) {
  results.push({ testName, passed, details });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${testName}`);
  console.log(`  Evidence/Details: ${JSON.stringify(details, null, 2)}\n`);
}

async function main() {
  try {
    await sleep(2000);
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);

    let id = 1;
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
        const msgId = id++;
        pending.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    async function evaluate(expr) {
      const r = await send('Runtime.evaluate', {
        expression: expr,
        returnByValue: true,
        awaitPromise: true,
      });
      if (r.exceptionDetails) {
        throw new Error(`Eval exception: ${JSON.stringify(r.exceptionDetails)}`);
      }
      return r.result ? r.result.value : undefined;
    }

    async function navigate(url) {
      await send('Page.navigate', { url });
      await sleep(1000);
    }

    // Initialize doctor auth and demo records on origin
    await navigate('http://127.0.0.1:4173/doctor');
    await sleep(1000);
    await evaluate(`
      const doctorUser = {
        username: "demo-doctor",
        displayName: "Dr. Sharma (Demo Physician)",
        role: "Attending Physician / Clinical Admin",
        authenticatedAt: new Date().toISOString()
      };
      localStorage.setItem('sehatSaathi_doctor_auth_v1', JSON.stringify(doctorUser));
      sessionStorage.setItem('sehatSaathi_doctor_auth_v1', JSON.stringify(doctorUser));
    `);
    // Reload doctor once to trigger demo seed if not already done
    await navigate('http://127.0.0.1:4173/doctor');
    await sleep(1000);

    // =========================================================================
    // SCENARIO 1: Returning Patient Normal "None of the above" Safety Path
    // =========================================================================
    console.log('=============================================================');
    console.log('SCENARIO 1: Returning Patient Normal "None of the above" Safety Path');
    console.log('=============================================================');

    // Seed returning session for Ramesh Patel (DEMO-REC-001)
    await evaluate(`(() => {
      let records = JSON.parse(localStorage.getItem('sehatSaathi_patient_records_v1') || '[]');
      let ramesh = records.find(r => r.id === 'DEMO-REC-001');
      if (!ramesh) {
        ramesh = {
          id: "DEMO-REC-001",
          submittedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          patientProfile: {
            name: "Ramesh Patel",
            age: "48",
            sex: "Male",
            identifier: "ABHA-91-4458-1200",
            identifierType: "abha",
            language: "en",
            emergencyContact: {
              guardianName: "Sunita Patel",
              relationship: "Mother",
              phoneNumber: "9876543210",
            },
          },
          chiefComplaint: {
            complaintId: "cough",
            displayName: "Cough with breathlessness",
            originalInput: "I have cough and breathlessness for 4 days",
            confidence: 0.9,
            source: "patient",
          },
          historyAnswers: {
            coughDuration: "4_days",
            fever: "yes",
            sputumColor: "clear",
            severity: 6,
          },
          evidence: [],
          safetyFlags: [],
          documents: [],
          backgroundHistory: {
            conditions: ["Hypertension"],
            medications: ["Amlodipine 5mg"],
            allergies: ["Penicillin"],
            ayushUse: "none",
          },
          timeline: [],
          doctorReviews: [],
          ayushHistory: {},
          reviewStatus: "pending",
        };
        records.unshift(ramesh);
        localStorage.setItem('sehatSaathi_patient_records_v1', JSON.stringify(records));
      }

      const returningSession = {
        previousRecord: ramesh,
        changes: {
          visitReason: 'follow_up',
          visitReasonLabel: 'Follow-up for ongoing condition',
          followUpStatus: 'better',
          unchangedConditions: ['Hypertension'],
          changedConditions: [],
          unchangedMedications: ['Amlodipine 5mg'],
          changedMedications: [],
          allergiesStatus: 'unchanged',
          hospitalizationSinceLastVisit: false,
          timestamps: { whatChangedStartedAt: new Date().toISOString() }
        }
      };
      sessionStorage.setItem('sehatSaathi_returning_session_v1', JSON.stringify(returningSession));
      localStorage.setItem('medikiosk_session_v2', JSON.stringify({
        patientProfile: ramesh.patientProfile,
        consentGranted: true,
        chiefComplaint: ramesh.chiefComplaint,
        historyAnswers: {},
        evidence: [],
        safetyFlags: [],
        documents: [],
        backgroundHistory: ramesh.backgroundHistory,
        timeline: [],
        doctorReviews: [],
        ayushHistory: {},
        timestamps: {}
      }));
    })()`);

    // Navigate to returning safety gate
    await navigate('http://127.0.0.1:4173/patient/returning/safety');
    await sleep(800);

    const s1SafetyTitle = await evaluate(`document.querySelector('h1')?.textContent?.trim() || ''`);
    console.log('Safety Page Title:', s1SafetyTitle);

    // Click "None of the above — No emergency symptoms"
    const clickedNone = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const noneBtn = btns.find(b => b.textContent.includes('None of the above') || b.textContent.includes('इनमें से कोई नहीं'));
      if (noneBtn) {
        noneBtn.click();
        return true;
      }
      return false;
    })()`);
    await sleep(1200);

    const s1PathAfterSafety = await evaluate(`location.pathname`);
    console.log('Path after safety check:', s1PathAfterSafety);

    // On ReturningPatientOptions page, click "Add to physician queue"
    const clickedQueue = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const queueBtn = btns.find(b => b.textContent.includes('Add to Physician Queue') || b.textContent.includes('कतार में जोड़ें') || b.textContent.includes('Queue'));
      if (queueBtn) {
        queueBtn.click();
        return true;
      }
      return false;
    })()`);
    await sleep(1500);

    const s1PathAfterOptions = await evaluate(`location.pathname`);
    console.log('Path after queue submission:', s1PathAfterOptions);

    // Now navigate to /doctor to verify the physician-facing summary & history answers
    await navigate('http://127.0.0.1:4173/doctor');
    await sleep(1000);

    // Click Ramesh Patel card
    await evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('button'));
      const rameshCard = cards.find(c => c.textContent.includes('Ramesh Patel'));
      if (rameshCard) rameshCard.click();
    })()`);
    await sleep(800);

    const s1DoctorData = await evaluate(`(() => {
      const summaryText = document.querySelector('pre')?.textContent || '';
      const records = JSON.parse(localStorage.getItem('sehatSaathi_patient_records_v1') || '[]');
      const ramesh = records.find(r => r.patientProfile?.name === 'Ramesh Patel' || r.id === 'DEMO-REC-001');
      return {
        summaryText,
        historyAnswers: ramesh?.historyAnswers || {},
        safetyFlags: ramesh?.safetyFlags || [],
        previousSafetyFlags: ramesh?.longitudinalChanges?.previousSafetyFlags || []
      };
    })()`);

    console.log('Physician Summary Observed:\n', s1DoctorData.summaryText);
    console.log('History Answers Observed:\n', JSON.stringify(s1DoctorData.historyAnswers, null, 2));
    console.log('Active Safety Flags Observed:\n', JSON.stringify(s1DoctorData.safetyFlags, null, 2));
    console.log('Historical Safety Flags Observed:\n', JSON.stringify(s1DoctorData.previousSafetyFlags, null, 2));

    const s1NoSyntheticFluids = s1DoctorData.historyAnswers.keepingFluidsDown === undefined;
    const s1NoSyntheticSeverity = s1DoctorData.historyAnswers.severity === undefined;
    const s1NoSyntheticNoCheckboxes = s1DoctorData.historyAnswers.breathingDifficulty === undefined && s1DoctorData.historyAnswers.chestPain === undefined;
    const s1NoActiveUrgentSafetyFlag = s1DoctorData.safetyFlags.length === 0;
    const s1HistoricalPreserved = s1DoctorData.previousSafetyFlags.some(f => f.id === 'breathing-difficulty');
    const s1SummaryClean = !s1DoctorData.summaryText.includes('Keeping fluids down') &&
                           !s1DoctorData.summaryText.includes('Severity: 2') &&
                           !s1DoctorData.summaryText.includes('Breathing difficulty: No') &&
                           !s1DoctorData.summaryText.includes('URGENT: Breathing difficulty reported') &&
                           s1DoctorData.summaryText.includes('Safety flags: None configured for this session.');
    const s1HistoricalInSummary = s1DoctorData.summaryText.includes('Prior consultation safety alert (historical): Breathing difficulty reported [URGENT]');
    const s1DeltaPresent = s1DoctorData.summaryText.includes('Longitudinal visit delta:') &&
                           s1DoctorData.summaryText.includes('Visit category: follow_up');

    const s1Passed = s1NoSyntheticFluids && s1NoSyntheticSeverity && s1NoSyntheticNoCheckboxes &&
                     s1NoActiveUrgentSafetyFlag && s1HistoricalPreserved && s1SummaryClean &&
                     s1HistoricalInSummary && s1DeltaPresent;

    recordResult('Scenario 1: "None of the above" Safety Path Data Integrity & Provenance',
      s1Passed,
      {
        pathAfterSafety: s1PathAfterSafety,
        pathAfterQueue: s1PathAfterOptions,
        noSyntheticFluids: s1NoSyntheticFluids,
        noSyntheticSeverity: s1NoSyntheticSeverity,
        noSyntheticNoCheckboxes: s1NoSyntheticNoCheckboxes,
        noActiveUrgentSafetyFlag: s1NoActiveUrgentSafetyFlag,
        historicalPreserved: s1HistoricalPreserved,
        summaryClean: s1SummaryClean,
        historicalInSummary: s1HistoricalInSummary,
        deltaPresent: s1DeltaPresent,
        observedActiveSafetyFlags: s1DoctorData.safetyFlags,
        observedHistoricalSafetyFlags: s1DoctorData.previousSafetyFlags,
        summarySnippet: s1DoctorData.summaryText.split('\n').filter(l => l.includes('History of present illness') || l.includes('Longitudinal visit delta') || l.includes('Prior consultation') || l.includes('Safety flags'))
      }
    );


    // =========================================================================
    // SCENARIO 2: Returning Patient Urgent / Red-Flag Emergency Escalation Path
    // =========================================================================
    console.log('=============================================================');
    console.log('SCENARIO 2: Returning Patient Urgent / Red-Flag Emergency Escalation Path');
    console.log('=============================================================');

    // Seed returning session for Ramesh Patel again
    await evaluate(`(() => {
      const records = JSON.parse(localStorage.getItem('sehatSaathi_patient_records_v1') || '[]');
      const ramesh = records.find(r => r.id === 'DEMO-REC-001') || records[0];
      const returningSession = {
        previousRecord: ramesh,
        changes: {
          visitReason: 'follow_up',
          visitReasonLabel: 'Follow-up for ongoing condition',
          followUpStatus: 'worse',
          unchangedConditions: ['Hypertension'],
          changedConditions: [],
          unchangedMedications: ['Amlodipine 5mg'],
          changedMedications: [],
          allergiesStatus: 'unchanged',
          hospitalizationSinceLastVisit: false,
          timestamps: { whatChangedStartedAt: new Date().toISOString() }
        }
      };
      sessionStorage.setItem('sehatSaathi_returning_session_v1', JSON.stringify(returningSession));
    })()`);

    // Navigate to returning safety gate
    await navigate('http://127.0.0.1:4173/patient/returning/safety');
    await sleep(800);

    // Select the "Chest Pain / Pressure" red flag checkbox
    const checkedChestPain = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const chestBtn = btns.find(b => b.textContent.includes('Chest Pain') || b.textContent.includes('सीने में दर्द'));
      if (chestBtn) {
        chestBtn.click();
        return true;
      }
      return false;
    })()`);
    console.log('Checked chest pain flag:', checkedChestPain);
    await sleep(500);

    // Click "Evaluate Selected Symptoms (Safety Triage)"
    const clickedRun = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const runBtn = btns.find(b => b.textContent.includes('Evaluate Selected Symptoms') || b.textContent.includes('Safety Triage') || b.textContent.includes('लक्षणों का मूल्यांकन'));
      if (runBtn) {
        runBtn.click();
        return true;
      }
      return false;
    })()`);
    console.log('Clicked evaluate button:', clickedRun);
    await sleep(1500);

    const s2PathAfterCheck = await evaluate(`location.pathname`);
    console.log('Path after emergency red flag check:', s2PathAfterCheck);

    const s2EmergencyH1 = await evaluate(`document.querySelector('h1')?.textContent?.trim() || ''`);
    const s2EmergencyAlertText = await evaluate(`document.querySelector('main')?.textContent || ''`);

    console.log('Emergency Page H1:', s2EmergencyH1);

    const s2Escalated = s2PathAfterCheck === '/patient/emergency';
    const s2EmergencyNoticePresent = s2EmergencyH1.includes('Immediate Triage') || s2EmergencyH1.includes('Emergency') || s2EmergencyAlertText.includes('Chest pain') || s2EmergencyAlertText.includes('chest-pain');

    recordResult('Scenario 2: Returning Patient Urgent Red Flag Escalation',
      s2Escalated && s2EmergencyNoticePresent,
      {
        pathAfterCheck: s2PathAfterCheck,
        escalatedToEmergency: s2Escalated,
        emergencyH1: s2EmergencyH1,
        noticePresent: s2EmergencyNoticePresent
      }
    );

    // Final Report Summary
    console.log('=============================================================');
    console.log('FINAL RETURNING PATIENT SAFETY VERIFICATION REPORT');
    console.log('=============================================================');
    const allPassed = results.every(r => r.passed);
    console.log(`TOTAL SCENARIOS: ${results.length}, PASSED: ${results.filter(r => r.passed).length}, FAILED: ${results.filter(r => !r.passed).length}`);
    console.log(`OVERALL RESULT: ${allPassed ? 'ALL PASS' : 'FAILURES DETECTED'}`);

    ws.close();
    chromeProc.kill();
    process.exit(allPassed ? 0 : 1);

  } catch (err) {
    console.error('Browser verification error:', err);
    chromeProc.kill();
    process.exit(1);
  }
}

main();
