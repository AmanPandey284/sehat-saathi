import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePatientSession } from '../patient/state/PatientSessionContext';
import { buildTimeline, labelField, valueText } from '../history/recordUtils';
import { buildFhirBundle } from '../history/fhir';
import { generateClinicalSummary } from '../history/summaryGenerator';
import { generateSummary, BASE_URL } from '../../services/api';
import DocumentUpload from '../documents/DocumentUpload';
import { detectConflicts } from '../history/conflictEngine';
import { useDoctorAuth } from '../auth/DoctorAuthContext';
import { getDoctorToken } from '../../services/authStorage';
import {
  getStoredPatientRecords,
  updatePatientRecord,
  type StoredPatientRecord,
} from './patientRecords';
import { AVAILABLE_HOSPITAL_DEPARTMENTS } from '../routing/routingRules';
import type { HospitalDepartment, SuggestedRouting } from '../routing/routingTypes';
import { calculateWorkflowDurations } from '../timing/timingUtils';

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function formatComplaintLabel(complaint?: { displayName?: string; originalInput?: string; complaintId?: string } | null): string {
  if (!complaint) return 'Not reported';
  const name = complaint.displayName || '';
  if (complaint.complaintId === 'custom' || name.toLowerCase().includes('other / custom complaint')) {
    return complaint.originalInput ? `Main symptom: ${complaint.originalInput}` : 'Main symptom';
  }
  return name || (complaint.originalInput ? `Main symptom: ${complaint.originalInput}` : 'Complaint not specified');
}

export default function DoctorDashboard() {
  const s = usePatientSession();
  const { user, logout } = useDoctorAuth();
  const navigate = useNavigate();

  const [records, setRecords] = useState<StoredPatientRecord[]>(() =>
    getStoredPatientRecords()
  );

  // Selected patient record id from queue, or 'live' for current active session
  const [selectedRecordId, setSelectedRecordId] = useState<string>(() => {
    if (s.patientProfile?.identifier) {
      return s.patientProfile.identifier;
    }
    const stored = getStoredPatientRecords();
    return stored[0]?.id || 'live';
  });

  // Refresh records on mount and when selectedRecordId changes
  useEffect(() => {
    setRecords(getStoredPatientRecords());

    const token = getDoctorToken();
    if (!token) return;

    fetch(`${BASE_URL}/api/encounters`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.ok) {
          const apiEncounters = await res.json();
          if (Array.isArray(apiEncounters) && apiEncounters.length > 0) {
            setRecords((prev) => {
              const existingIds = new Set(prev.map((r) => r.id));
              const newRecords: StoredPatientRecord[] = [];
              for (const enc of apiEncounters) {
                if (!existingIds.has(enc.id)) {
                  newRecords.push({
                    id: enc.id,
                    submittedAt: new Date(enc.created_at * 1000).toISOString(),
                    patientProfile: {
                      name: enc.patient_name || "Patient",
                      age: enc.age ? String(enc.age) : "",
                      sex: enc.gender || "Unknown",
                      identifier: enc.abha_id || enc.patient_id || "ID",
                      identifierType: (enc.abha_id ? "abha" : "demo") as "demo" | "abha",
                      language: "en",
                    },
                    chiefComplaint: {
                      complaintId: "custom" as any,
                      displayName: enc.chief_complaint || "Patient Reported",
                      originalInput: enc.clinical_summary || enc.chief_complaint || "",
                      confidence: 1.0,
                      source: "patient",
                    },
                    historyAnswers: enc.history_present_illness || {},
                    evidence: enc.evidence || [],
                    safetyFlags: Array.isArray(enc.safety_flags) && enc.safety_flags.length > 0
                      ? enc.safety_flags
                      : (enc.triage_level === "priority" ? [{
                          id: "triage-priority",
                          severity: "urgent" as const,
                          title: "Priority Triage",
                          explanation: "Priority flag from clinical intake",
                          field: "triage",
                          triggeredAt: new Date(enc.created_at * 1000).toISOString(),
                        }] : []),
                    documents: enc.documents || [],
                    backgroundHistory: enc.background_history || {
                      pastMedical: "",
                      pastSurgical: "",
                      medications: "",
                      allergies: "",
                      family: "",
                      personal: "",
                      reviewOfSystems: "",
                    },
                    timeline: [],
                    doctorReviews: [],
                    ayushHistory: enc.ayush_intake || {},
                    version: enc.version || 1,
                    reviewStatus: (enc.physician_decision ? "reviewed" : "pending") as "pending" | "reviewed",
                    physicianDecision: enc.physician_decision === "CONFIRMED_AND_SIGNED" ? "confirmed" : enc.physician_decision === "CLARIFICATION_REQUESTED" ? "clarification" : enc.physician_decision === "FLAGGED_HIGH_RISK" ? "flagged" : undefined,
                    physicianReviewNote: enc.physician_review_note,
                    physicianDecisionBy: enc.physician_signed_by,
                  } as any);
                }
              }
              return [...newRecords, ...prev];
            });
          }
        }
      })
      .catch(() => {});
  }, [selectedRecordId]);

  const activeRecord = useMemo(() => {
    return records.find(r => r.id === selectedRecordId) || null;
  }, [records, selectedRecordId]);

  // Track physician review start for the active record if not already recorded
  useEffect(() => {
    if (activeRecord && !activeRecord.timestamps?.physicianReviewStartedAt) {
      const now = new Date().toISOString();
      const updatedTimestamps = {
        ...(activeRecord.timestamps || {}),
        physicianReviewStartedAt: now,
      };
      updatePatientRecord(activeRecord.id, {
        timestamps: updatedTimestamps,
        durations: calculateWorkflowDurations(updatedTimestamps),
      });
      setRecords(getStoredPatientRecords());
    }
  }, [activeRecord?.id]);

  const [tab, setTab] = useState<
    'summary' | 'conversation' | 'documents' | 'timeline' | 'ayush' | 'medication_safety'
  >('summary');

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState('');
  const [summaryProvider, setSummaryProvider] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewNoteInput, setReviewNoteInput] = useState('');
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [medQuery, setMedQuery] = useState('');
  const [customMeds, setCustomMeds] = useState<string[]>([]);

  // Resolved clinical data: selected record, or fallback to live session
  const answers = activeRecord ? activeRecord.historyAnswers : (s.historyAnswers ?? {});
  const complaint = activeRecord ? activeRecord.chiefComplaint : s.chiefComplaint;
  const backgroundHistory = activeRecord ? activeRecord.backgroundHistory : s.backgroundHistory;
  const documents = activeRecord ? activeRecord.documents : s.documents;
  const patientProfile = activeRecord ? activeRecord.patientProfile : s.patientProfile;
  const safetyFlags = activeRecord ? activeRecord.safetyFlags : s.safetyFlags;
  const doctorReviews = activeRecord ? activeRecord.doctorReviews : s.doctorReviews;
  const evidence = activeRecord ? activeRecord.evidence : s.evidence;
  const reviewStatus = activeRecord?.reviewStatus || 'pending';
  const ayushHistory = activeRecord ? (activeRecord.ayushHistory ?? {}) : (s.ayushHistory ?? {});

  const ayushLabels: Record<string, string> = {
    prakriti: 'Prakriti',
    vikriti: 'Vikriti',
    sara: 'Sara',
    samhanana: 'Samhanana',
    pramana: 'Pramana',
    satmya: 'Satmya',
    sattva: 'Sattva',
    ahara_shakti: 'Ahara Shakti',
    vyayama_shakti: 'Vyayama Shakti',
    vaya: 'Vaya',
    nadi: 'Nadi',
    mala: 'Mala',
    mutra: 'Mutra',
    jihva: 'Jihva',
    shabda: 'Shabda',
    sparsha: 'Sparsha',
    drik: 'Drik',
    akriti: 'Akriti',
    agni: 'Agni',
    koshtha: 'Koshtha',
    meal_pattern: 'Meal Pattern',
    food_habits: 'Food Habits',
    water_intake: 'Water Intake',
    sleep: 'Sleep',
    exercise: 'Exercise / Activity',
    daily_routine: 'Daily Routine',
    nidana: 'Nidana',
    purvarupa: 'Purvarupa',
    rupa: 'Rupa',
    upashaya: 'Upashaya',
    anupashaya: 'Anupashaya',
    dosha_history: 'Dosha-related History',
    dushya_history: 'Dushya-related History',
    srotas_history: 'Srotas-related History',
    udbhava_sthana: 'Udbhava Sthana',
    roga_marga: 'Rogamarga',
  };

  const getAyushValue = (field: string) => {
    return ayushHistory[field] || ayushHistory[field.toLowerCase()] || ayushHistory[ayushLabels[field]] || '';
  };

  const ayushSections = useMemo(() => {
    const sectionMap: Record<string, string[]> = {
      'Dashavidha Pariksha': [
        'prakriti',
        'vikriti',
        'sara',
        'samhanana',
        'pramana',
        'satmya',
        'sattva',
        'ahara_shakti',
        'vyayama_shakti',
        'vaya',
      ],
      'Ashtavidha Pariksha': [
        'nadi',
        'mala',
        'mutra',
        'jihva',
        'shabda',
        'sparsha',
        'drik',
        'akriti',
      ],
      'Agni & Koshtha': ['agni', 'koshtha'],
      'Ahara–Vihara': [
        'meal_pattern',
        'food_habits',
        'water_intake',
        'sleep',
        'exercise',
        'daily_routine',
      ],
      'Nidana Panchaka': [
        'nidana',
        'purvarupa',
        'rupa',
        'upashaya',
        'anupashaya',
      ],
      Samprapti: [
        'dosha_history',
        'dushya_history',
        'srotas_history',
        'udbhava_sthana',
        'roga_marga',
      ],
    };

    const standardKeys = new Set(Object.values(sectionMap).flat());
    const extraKeys = Object.keys(ayushHistory).filter(
      k => !standardKeys.has(k) && !standardKeys.has(k.toLowerCase()) && Boolean(ayushHistory[k])
    );

    const groups = Object.entries(sectionMap)
      .map(([section, fields]) => ({
        section,
        fields: fields.filter(
          field => Boolean(getAyushValue(field))
        ),
      }))
      .filter(group => group.fields.length > 0);

    if (extraKeys.length > 0) {
      groups.push({
        section: 'Additional Traditional History',
        fields: extraKeys,
      });
    }

    return groups;
  }, [ayushHistory]);

  const conflicts = useMemo(
    () =>
      detectConflicts(
        backgroundHistory,
        documents
      ),
    [backgroundHistory, documents]
  );

  const timeline = useMemo(
    () =>
      activeRecord?.timeline && activeRecord.timeline.length > 0
        ? activeRecord.timeline
        : buildTimeline(
            complaint,
            answers,
            documents,
            backgroundHistory
          ),
    [activeRecord, complaint, answers, documents, backgroundHistory]
  );

  const effectiveSummary =
    summary ||
    generateClinicalSummary(
      complaint,
      answers,
      documents,
      backgroundHistory,
      patientProfile,
      safetyFlags,
      doctorReviews,
      activeRecord?.longitudinalChanges
    );

  const evidenceFor = (field: string) =>
    evidence.find(e => e.field === field);

  const makeAiSummary = async () => {
    setBusy(true);

    try {
      const r = await generateSummary({
        complaint,
        history: {
          ...answers,
          ...backgroundHistory
        },
        documents: documents,
        evidence: evidence
      });

      setSummary(r.summary);
      setSummaryProvider(r.provider);
    } catch {
      setSummary(
        generateClinicalSummary(
          complaint,
          answers,
          documents,
          backgroundHistory,
          patientProfile,
          safetyFlags,
          doctorReviews,
          activeRecord?.longitudinalChanges
        )
      );

      setSummaryProvider('local fallback');
    } finally {
      setBusy(false);
    }
  };

  const review = (
    field: string,
    status: 'confirmed' | 'edited' | 'rejected'
  ) => {
    const v =
      edits[field] ??
      String(answers[field] ?? '');

    const revItem = {
      field,
      status,
      editedValue: status === 'edited' ? v : undefined,
      reviewedAt: new Date().toISOString(),
      reviewer: user?.displayName || 'Dr. Sharma'
    };

    if (activeRecord) {
      const updatedReviews = [
        ...activeRecord.doctorReviews.filter(r => r.field !== field),
        revItem
      ];
      const updatedAnswers = status === 'edited'
        ? { ...activeRecord.historyAnswers, [field]: v }
        : activeRecord.historyAnswers;

      const updated = updatePatientRecord(activeRecord.id, {
        doctorReviews: updatedReviews,
        historyAnswers: updatedAnswers,
      });
      if (updated) {
        setRecords(getStoredPatientRecords());
      }
    } else {
      s.reviewField(revItem);
    }
  };

  const saveEdit = (field: string) => {
    review(field, 'edited');
  };

  const toggleRecordStatus = (newStatus: 'pending' | 'reviewed') => {
    if (activeRecord) {
      const now = new Date().toISOString();
      const updatedTimestamps = {
        ...(activeRecord.timestamps || {}),
        physicianReviewStartedAt: activeRecord.timestamps?.physicianReviewStartedAt || now,
        physicianReviewCompletedAt: newStatus === 'reviewed' ? now : undefined,
      };
      const updatedDurations = calculateWorkflowDurations(updatedTimestamps);
      updatePatientRecord(activeRecord.id, {
        reviewStatus: newStatus,
        timestamps: updatedTimestamps,
        durations: updatedDurations,
      });
      setRecords(getStoredPatientRecords());
    }
  };

  const handleReassignDepartment = (recordId: string, newDept: HospitalDepartment) => {
    if (!activeRecord) return;
    const updatedRouting: SuggestedRouting = {
      suggestedDepartment: newDept,
      routingStatus: "staff_reassigned",
      rationale: `Reassigned by clinical staff to ${newDept}`,
      determinedAt: new Date().toISOString(),
    };
    updatePatientRecord(recordId, { suggestedRouting: updatedRouting });
    setRecords(getStoredPatientRecords());
  };

  useEffect(() => {
    setReviewNoteInput(activeRecord?.physicianReviewNote || '');
  }, [activeRecord?.id, activeRecord?.physicianReviewNote]);

  const handlePhysicianDecision = (decision: 'confirmed' | 'clarification' | 'flagged') => {
    if (!activeRecord) return;
    const now = new Date().toISOString();
    const updatedTimestamps = {
      ...(activeRecord.timestamps || {}),
      physicianReviewCompletedAt: now,
    };
    updatePatientRecord(activeRecord.id, {
      physicianDecision: decision,
      physicianReviewNote: reviewNoteInput.trim() ? reviewNoteInput.trim() : undefined,
      physicianDecisionTimestamp: now,
      physicianDecisionBy: user?.displayName || 'Dr. Attendee (MD)',
      reviewStatus: decision === 'confirmed' ? 'reviewed' : 'pending',
      timestamps: updatedTimestamps,
      durations: calculateWorkflowDurations(updatedTimestamps),
    });
    setRecords(getStoredPatientRecords());

    // Dispatch to backend API
    const token = getDoctorToken();
    if (token) {
      const apiDecision =
        decision === 'confirmed'
          ? 'CONFIRMED_AND_SIGNED'
          : decision === 'clarification'
          ? 'CLARIFICATION_REQUESTED'
          : 'FLAGGED_HIGH_RISK';

      const currentVersion = (activeRecord as any).version || 1;

      fetch(`${BASE_URL}/api/encounters/${activeRecord.id}/signoff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision: apiDecision,
          review_note: reviewNoteInput.trim(),
          expected_version: currentVersion,
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            if (res.status === 409) {
              alert("Conflict: This encounter was updated by another reviewer. Please refresh your clinical queue.");
            }
            return;
          }
          const data = await res.json();
          if (data.ok && data.encounter) {
            updatePatientRecord(activeRecord.id, {
              version: data.encounter.version,
            } as any);
          }
        })
        .catch(() => {});
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/doctor/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient">

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-clinic-100/80 glass-header">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-clinic-600 to-clinic-700 text-white shadow-sm shadow-clinic-600/20">
              <span className="text-xl">🩺</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-semibold text-ink">
                  Physician Review Portal
                </span>
                <span className="rounded-full border border-clinic-200 bg-clinic-50 px-2 py-0.5 text-[10px] font-bold text-clinic-700">
                  SIH26047 · DEMO
                </span>
              </div>
              <p className="text-xs text-muted">
                Pre-consultation clinical queue & triage validation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-ink">{user?.displayName || 'Dr. Sharma'}</p>
              <p className="text-[11px] text-muted">{user?.role || 'Senior Physician'} · <span className="font-mono text-[10px]">{user?.username || 'demo-doctor'}</span></p>
            </div>

            <Link
              to="/analytics"
              className="rounded-full border border-clinic-200 bg-white px-4 py-2 text-xs font-semibold text-muted hover:border-clinic-400 hover:text-ink transition shadow-2xs"
            >
              Analytics
            </Link>

            <button
              onClick={handleLogout}
              className="rounded-full border border-red-200 bg-red-50/60 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition shadow-2xs"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-6">

        {!complaint && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            No live patient session. The page below is safe demo scaffolding;
            use a completed patient flow for real testing.
          </div>
        )}

        {/* Safety Flags */}
        {safetyFlags.length > 0 && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-5">

            <p className="font-semibold text-red-900">
              Priority clinical review
            </p>

            {safetyFlags.map(f => (
              <p
                key={f.id}
                className="mt-1 text-sm text-red-800"
              >
                <strong>
                  {f.severity.toUpperCase()}:
                </strong>{' '}
                {f.title} — {f.explanation}
              </p>
            ))}

          </div>
        )}

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">

            <p className="font-semibold text-amber-900">
              Possible information conflicts
            </p>

            {conflicts.map(c => (
              <div
                key={c.id}
                className="mt-2 text-sm text-amber-900"
              >
                <strong>{c.field}:</strong>{' '}
                patient reported “{c.patient}”,
                document {c.source} contains “{c.document}”.
                {' '}
                {c.reason}
                {' '}
                Review before saving.
              </div>
            ))}

          </div>
        )}

        {/* PATIENT INTAKE QUEUE */}
        <div className="mb-6 rounded-2xl border border-clinic-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-ink">Patient Intake Queue</span>
              <span className="rounded-full bg-clinic-100 px-2.5 py-0.5 text-xs font-semibold text-clinic-800">
                {records.length} {records.length === 1 ? 'record' : 'records'}
              </span>
            </div>
            <p className="text-xs text-muted">
              Select a patient to inspect triage history, evidence, and review status.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {records.map((rec) => {
              const isSelected = rec.id === selectedRecordId;
              const hasUrgent = rec.safetyFlags.some((f) => f.severity === 'urgent');
              return (
                <button
                  key={rec.id}
                  onClick={() => {
                    setSelectedRecordId(rec.id);
                    setEdits({});
                    setSummary('');
                  }}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-clinic-600 bg-clinic-50/50 shadow-sm ring-1 ring-clinic-500'
                      : 'border-clinic-100 bg-white hover:border-clinic-200 hover:bg-clinic-50/30'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-1">
                    <span className="font-medium text-ink truncate text-sm">
                      {rec.patientProfile?.name || 'Anonymous'}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        rec.reviewStatus === 'reviewed'
                          ? 'bg-clinic-100 text-clinic-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {rec.reviewStatus}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-muted truncate w-full">
                    {formatComplaintLabel(rec.chiefComplaint)}
                  </p>

                  {rec.suggestedRouting?.suggestedDepartment && (
                    <span
                      className={`mt-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium truncate max-w-full ${
                        rec.suggestedRouting.routingStatus === 'emergency_escalated'
                          ? 'bg-rose-100 text-rose-800'
                          : rec.suggestedRouting.routingStatus === 'staff_reassigned'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-clinic-50 text-clinic-700'
                      }`}
                    >
                      <span>
                        {rec.suggestedRouting.routingStatus === 'emergency_escalated'
                          ? '🚨 Emergency Escalated:'
                          : rec.suggestedRouting.routingStatus === 'staff_reassigned'
                          ? '👤 Staff Reassigned:'
                          : rec.suggestedRouting.routingStatus === 'general_triage'
                          ? '📋 General Triage:'
                          : '🏥 Suggested:'}
                      </span>
                      <span className="font-semibold">{rec.suggestedRouting.suggestedDepartment}</span>
                    </span>
                  )}

                  <div className="mt-2 flex w-full items-center justify-between text-[11px] text-muted">
                    <span>{rec.patientProfile?.age ? `${rec.patientProfile.age}y` : ''} · {rec.patientProfile?.sex || '—'}</span>
                    {hasUrgent && (
                      <span className="font-bold text-red-600">🚨 Urgent</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">

          {/* Sidebar */}
          <aside className="h-fit rounded-2xl border border-clinic-100 bg-white p-5 shadow-sm">

            <div className="rounded-xl bg-clinic-50 p-4">

              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-muted">
                  Active Patient
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    reviewStatus === 'reviewed'
                      ? 'bg-clinic-200 text-clinic-900'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {reviewStatus}
                </span>
              </div>

              <p className="mt-1 font-semibold text-ink">
                {patientProfile?.name || 'Anonymous / Demo'}
              </p>

              <p className="text-sm text-muted">
                Age {patientProfile?.age || '—'} ·{' '}
                {patientProfile?.sex || '—'}
              </p>

              <p className="mt-1 text-xs text-muted">
                ID: {patientProfile?.identifier || activeRecord?.id || 'DEMO'}
              </p>

              {activeRecord && (
                <button
                  onClick={() =>
                    toggleRecordStatus(
                      reviewStatus === 'reviewed' ? 'pending' : 'reviewed'
                    )
                  }
                  className="mt-3 w-full rounded-lg border border-clinic-300 bg-white px-2 py-1.5 text-xs font-semibold text-clinic-800 hover:bg-clinic-100"
                >
                  Mark as {reviewStatus === 'reviewed' ? 'Pending' : 'Reviewed'}
                </button>
              )}

            </div>

            {/* Compact Emergency Contact Card (Shown only when emergency contact exists) */}
            {patientProfile?.emergencyContact && patientProfile.emergencyContact.guardianName && (
              <div className="mt-3 rounded-xl border border-rose-200/80 bg-rose-50/80 p-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1">
                    <span>🚨</span> Emergency Contact
                  </span>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                    {patientProfile.emergencyContact.relationship}
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-semibold text-ink">
                  {patientProfile.emergencyContact.guardianName}
                </p>
                <p className="text-xs text-muted font-mono mt-0.5">
                  {patientProfile.emergencyContact.phoneNumber}
                </p>
                <a
                  href={`tel:${patientProfile.emergencyContact.phoneNumber.replace(/\s+/g, '')}`}
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-rose-700 transition"
                >
                  <span>📞</span> Call
                </a>
              </div>
            )}

            {/* Hospital Routing Section */}
            <div
              className={`mt-3 rounded-xl border p-3.5 shadow-2xs ${
                activeRecord?.suggestedRouting?.routingStatus === 'emergency_escalated'
                  ? 'border-rose-300 bg-rose-50/70'
                  : activeRecord?.suggestedRouting?.routingStatus === 'staff_reassigned'
                  ? 'border-indigo-200/80 bg-indigo-50/60'
                  : 'border-clinic-200/80 bg-clinic-50/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    activeRecord?.suggestedRouting?.routingStatus === 'emergency_escalated'
                      ? 'text-rose-800'
                      : activeRecord?.suggestedRouting?.routingStatus === 'staff_reassigned'
                      ? 'text-indigo-800'
                      : 'text-clinic-800'
                  }`}
                >
                  <span>{activeRecord?.suggestedRouting?.routingStatus === 'emergency_escalated' ? '🚨' : '🏥'}</span> Hospital Routing
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    activeRecord?.suggestedRouting?.routingStatus === 'emergency_escalated'
                      ? 'bg-rose-200 text-rose-900 font-bold'
                      : activeRecord?.suggestedRouting?.routingStatus === 'staff_reassigned'
                      ? 'bg-indigo-100 text-indigo-800'
                      : activeRecord?.suggestedRouting?.routingStatus === 'general_triage'
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-clinic-100 text-clinic-800'
                  }`}
                >
                  {activeRecord?.suggestedRouting?.routingStatus === 'emergency_escalated'
                    ? 'Emergency Escalated'
                    : activeRecord?.suggestedRouting?.routingStatus === 'staff_reassigned'
                    ? 'Staff Reassigned'
                    : activeRecord?.suggestedRouting?.routingStatus === 'general_triage'
                    ? 'General Triage'
                    : 'Suggested'}
                </span>
              </div>

              <div className="mt-2">
                <p className="text-[10px] font-medium text-muted uppercase tracking-wider">
                  {activeRecord?.suggestedRouting?.routingStatus === 'staff_reassigned'
                    ? 'Assigned Department'
                    : 'Suggested Department'}
                </p>
                <p
                  className={`text-xs font-semibold mt-0.5 ${
                    activeRecord?.suggestedRouting?.routingStatus === 'emergency_escalated'
                      ? 'text-rose-900 font-bold'
                      : 'text-ink'
                  }`}
                >
                  {activeRecord?.suggestedRouting?.suggestedDepartment || 'General OPD / Triage Desk'}
                </p>
              </div>

              <div className="mt-2">
                <p className="text-[10px] font-medium text-muted uppercase tracking-wider">Basis</p>
                <p className="text-[11px] text-muted leading-snug mt-0.5">
                  {activeRecord?.suggestedRouting?.rationale || 'Standard intake completed; pending department assignment'}
                </p>
              </div>

              {/* Human Staff Reassignment Control */}
              {activeRecord && (
                activeRecord.suggestedRouting?.routingStatus === 'emergency_escalated' ? (
                  <div className="mt-3 border-t border-rose-200 pt-2 text-[11px] font-medium text-rose-800 flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>Emergency protocol active. Reassignment disabled — patient routed directly to ED resuscitation area.</span>
                  </div>
                ) : (
                  <div className="mt-3 border-t border-clinic-200/60 pt-2.5">
                    <label htmlFor="dept-reassign-select" className="text-[10px] font-semibold text-clinic-900 block mb-1">
                      Reassign Department:
                    </label>
                    <select
                      id="dept-reassign-select"
                      value={activeRecord.suggestedRouting?.suggestedDepartment || 'General OPD / Triage Desk'}
                      onChange={(e) => {
                        const newDept = e.target.value as HospitalDepartment;
                        handleReassignDepartment(activeRecord.id, newDept);
                      }}
                      className="w-full rounded-lg border border-clinic-200 bg-white px-2 py-1.5 text-xs text-ink focus:border-clinic-500 focus:outline-none transition shadow-2xs"
                    >
                      {AVAILABLE_HOSPITAL_DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              )}
            </div>

            <div className="mt-5 space-y-2">

              {(
                [
                  'summary',
                  'conversation',
                  'documents',
                  'timeline',
                  'ayush',
                  'medication_safety'
                ] as const
              ).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                    tab === t
                      ? 'bg-clinic-600 text-white'
                      : 'text-muted hover:bg-clinic-50'
                  }`}
                >
                  {t === 'ayush'
                    ? '🌿 AYUSH'
                    : t === 'medication_safety'
                    ? '💊 Medication Safety'
                    : t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}

            </div>

            <button
              disabled={busy}
              onClick={makeAiSummary}
              className="mt-4 w-full rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy
                ? 'Generating…'
                : 'Generate evidence-grounded summary'}
            </button>

            <button
              onClick={() =>
                downloadJson(
                  buildFhirBundle(
                    complaint,
                    answers,
                    patientProfile,
                    backgroundHistory,
                    documents,
                    safetyFlags,
                    doctorReviews
                  ),
                  'medikiosk-fhir-bundle.json'
                )
              }
              className="mt-3 w-full rounded-lg border border-clinic-200 px-3 py-2 text-sm font-medium text-clinic-700"
            >
              Export FHIR-ready JSON
            </button>

            <button
              onClick={s.resetSession}
              className="mt-3 w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700"
            >
              End & clear demo session
            </button>

          </aside>

          {/* Content */}
          <section className="space-y-5">

            {/* CLINICIAN WORKFLOW DECISION & ABDM ENCOUNTER HEADER */}
            <div className="rounded-2xl border border-clinic-200 bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-clinic-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-clinic-600 text-white text-sm font-bold shadow-xs">
                    🩺
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-ink uppercase tracking-wide">
                        Physician Decision & Record Sign-Off
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          activeRecord?.physicianDecision === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : activeRecord?.physicianDecision === 'clarification'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : activeRecord?.physicianDecision === 'flagged'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}
                      >
                        {activeRecord?.physicianDecision
                          ? activeRecord.physicianDecision === 'confirmed'
                            ? '✓ Confirmed & Approved'
                            : activeRecord.physicianDecision === 'clarification'
                            ? '💬 Clarification Requested'
                            : '🚩 Flagged for Investigation'
                          : 'Pending Doctor Decision'}
                      </span>
                    </div>
                    {activeRecord?.physicianDecisionTimestamp && (
                      <p className="text-[11px] text-muted">
                        Signed by {activeRecord.physicianDecisionBy || 'Dr. Attendee'} on{' '}
                        {new Date(activeRecord.physicianDecisionTimestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handlePhysicianDecision('confirmed')}
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold shadow-xs transition flex items-center gap-1.5 ${
                      activeRecord?.physicianDecision === 'confirmed'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    <span>✓</span>
                    <span>Confirm & Sign Record</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePhysicianDecision('clarification')}
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold shadow-xs transition flex items-center gap-1.5 ${
                      activeRecord?.physicianDecision === 'clarification'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    <span>💬</span>
                    <span>Request Clarification</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePhysicianDecision('flagged')}
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold shadow-xs transition flex items-center gap-1.5 ${
                      activeRecord?.physicianDecision === 'flagged'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100'
                    }`}
                  >
                    <span>🚩</span>
                    <span>Flag Case</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowNoteEditor((v) => !v)}
                    className="rounded-xl border border-clinic-200 bg-white px-3 py-2 text-xs font-medium text-muted hover:bg-clinic-50 transition"
                  >
                    {showNoteEditor ? 'Hide Note' : 'Add/Edit Note'}
                  </button>
                </div>
              </div>

              {/* Review Note Editor */}
              {showNoteEditor && (
                <div className="mt-3 rounded-xl border border-clinic-200 bg-canvas/60 p-3.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Attending Physician Clinical Review Note
                  </label>
                  <textarea
                    rows={2}
                    value={reviewNoteInput}
                    onChange={(e) => setReviewNoteInput(e.target.value)}
                    placeholder="Enter clinical observations, differential notes, or follow-up orders..."
                    className="w-full rounded-lg border border-clinic-200 bg-white p-2.5 text-xs text-ink focus:border-clinic-500 focus:outline-hidden focus:ring-1 focus:ring-clinic-200 transition"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeRecord) {
                          updatePatientRecord(activeRecord.id, {
                            physicianReviewNote: reviewNoteInput.trim() ? reviewNoteInput.trim() : undefined,
                          });
                          setRecords(getStoredPatientRecords());
                          setShowNoteEditor(false);
                        }
                      }}
                      className="rounded-lg bg-clinic-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-clinic-700 transition"
                    >
                      Save Clinical Note
                    </button>
                  </div>
                </div>
              )}

              {/* Saved Note Display if present and not editing */}
              {!showNoteEditor && activeRecord?.physicianReviewNote && (
                <div className="mt-3 rounded-xl border border-clinic-100 bg-clinic-50/50 p-3 text-xs text-ink">
                  <span className="font-semibold text-clinic-900 block mb-0.5">Physician Note:</span>
                  <p className="text-muted leading-relaxed">{activeRecord.physicianReviewNote}</p>
                </div>
              )}

              {/* ABDM & ABHA Encounter Consent Status Bar */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-200/80 bg-teal-50/60 px-3.5 py-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-teal-900">ABDM Encounter:</span>
                  <span className="font-mono text-teal-800">
                    {patientProfile?.identifierType === 'abha' || patientProfile?.abhaNumber
                      ? `ABHA: ${patientProfile.abhaNumber || patientProfile.identifier}`
                      : 'ABHA: Unlinked / Kiosk Demo ID'}
                  </span>
                  {patientProfile?.abhaAddress && (
                    <span className="text-muted">({patientProfile.abhaAddress})</span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-800 border border-teal-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                    Consent: Active (EHR Exchange Ready)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted">FHIR R4 Bundle ready</span>
                </div>
              </div>
            </div>

            {/* SUMMARY TAB */}
            {tab === 'summary' && (
              <>
                {/* WHAT CHANGED SINCE LAST VISIT? (Returning Patient Longitudinal Delta) */}
                {activeRecord?.longitudinalChanges && (
                  <div className="rounded-2xl border-2 border-clinic-500/30 bg-gradient-to-br from-white to-clinic-50/50 p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-clinic-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-clinic-600 text-white font-bold text-sm shadow-2xs">
                          Δ
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="font-display text-lg font-semibold text-ink">
                              What Changed Since Last Visit?
                            </h2>
                            <span className="rounded-full bg-clinic-100 px-2 py-0.5 text-[10px] font-bold text-clinic-700">
                              Zero-Repetition Longitudinal Delta
                            </span>
                          </div>
                          <p className="text-xs text-muted">
                            Highlights what is new, changed, or confirmed unchanged since previous consultation.
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-clinic-100 px-3 py-1 text-xs font-semibold text-clinic-800">
                        {activeRecord.longitudinalChanges.visitReasonLabel}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {/* 1. Today's Visit Context */}
                      <div className="rounded-xl bg-white p-3.5 border border-clinic-100 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-clinic-700 block">
                          Today's Visit Reason
                        </span>
                        <p className="mt-1 text-xs font-semibold text-ink">
                          {activeRecord.longitudinalChanges.visitReasonLabel}
                        </p>
                        {activeRecord.longitudinalChanges.followUpStatus && (
                          <p className="mt-1 text-[11px] text-clinic-800">
                            Status: <strong className="uppercase">{activeRecord.longitudinalChanges.followUpStatus}</strong>
                          </p>
                        )}
                        {activeRecord.longitudinalChanges.naturalLanguageUpdate && (
                          <p className="mt-1.5 text-[11px] text-muted italic line-clamp-3">
                            “{activeRecord.longitudinalChanges.naturalLanguageUpdate}”
                          </p>
                        )}
                      </div>

                      {/* 2. New Since Last Visit */}
                      <div className="rounded-xl bg-white p-3.5 border border-clinic-100 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-clinic-700 block">
                          New Since Last Visit
                        </span>
                        <ul className="mt-1 space-y-1 text-[11px]">
                          {activeRecord.longitudinalChanges.changedConditions.length > 0 ? (
                            activeRecord.longitudinalChanges.changedConditions.map((c, i) => (
                              <li key={i} className="text-amber-800 font-medium">
                                • {c.name}: {c.status}
                              </li>
                            ))
                          ) : (
                            <li className="text-muted">• No chronic condition changes</li>
                          )}
                          {activeRecord.longitudinalChanges.hospitalizationSinceLastVisit && (
                            <li className="text-red-700 font-semibold">
                              • Hospitalization: {activeRecord.longitudinalChanges.hospitalizationDetails || "Yes"}
                            </li>
                          )}
                          {activeRecord.longitudinalChanges.newDocumentsCount > 0 && (
                            <li className="text-clinic-700 font-medium">
                              • {activeRecord.longitudinalChanges.newDocumentsCount} new document(s) added
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* 3. Medication Changes */}
                      <div className="rounded-xl bg-white p-3.5 border border-clinic-100 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-clinic-700 block">
                          Medication Status
                        </span>
                        <div className="mt-1 space-y-1 text-[11px]">
                          {activeRecord.longitudinalChanges.changedMedications.length > 0 ? (
                            activeRecord.longitudinalChanges.changedMedications.map((m, i) => (
                              <p key={i} className={m.status === 'stopped' ? 'text-red-700 font-medium' : 'text-amber-800 font-medium'}>
                                • {m.name}: <span className="font-bold uppercase text-[9px] px-1 py-0.5 rounded bg-slate-100">{m.status}</span>
                              </p>
                            ))
                          ) : (
                            <p className="text-muted">• No medication changes</p>
                          )}
                          {activeRecord.longitudinalChanges.unchangedMedications.length > 0 && (
                            <p className="text-muted text-[10px] mt-1 line-clamp-2">
                              Continued: {activeRecord.longitudinalChanges.unchangedMedications.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 4. Verified Unchanged Baseline */}
                      <div className="rounded-xl bg-white p-3.5 border border-clinic-100 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-clinic-700 block">
                          Verified Unchanged Baseline
                        </span>
                        <p className="mt-1 text-[11px] text-muted leading-relaxed">
                          <strong>Conditions:</strong> {activeRecord.longitudinalChanges.unchangedConditions.join(', ') || 'None'}<br />
                          <strong>Allergies:</strong> {activeRecord.longitudinalChanges.allergiesNote || 'NKDA'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">

                  <div className="flex flex-wrap items-start justify-between gap-4">

                    <div>

                      <p className="text-xs font-semibold uppercase tracking-wide text-clinic-500">
                        Chief complaint
                      </p>

                      <h2 className="mt-1 font-display text-2xl font-semibold text-ink">
                        {formatComplaintLabel(complaint)}
                      </h2>

                      <p className="mt-1 text-sm text-muted">
                        Patient said: “
                        {complaint?.originalInput || 'Not reported'}
                        ”
                      </p>

                    </div>

                    <span className="rounded-full bg-clinic-50 px-3 py-1 text-xs text-clinic-800">
                      Draft · physician controlled
                    </span>

                  </div>
                </div>

                {/* Physician Summary */}
                <div className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">

                  <div className="flex items-center justify-between gap-3">

                    <div>

                      <h2 className="font-display text-xl font-semibold text-ink">
                        Physician-ready summary
                      </h2>

                      <p className="text-xs text-muted">
                        {summaryProvider
                          ? `Provider: ${summaryProvider}`
                          : 'Evidence-based local draft'}
                      </p>

                    </div>

                    <button
                      onClick={() =>
                        navigator.clipboard?.writeText(
                          effectiveSummary
                        )
                      }
                      className="rounded-full border border-clinic-200 px-4 py-2 text-sm text-clinic-700"
                    >
                      Copy
                    </button>

                  </div>

                  <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-canvas p-4 text-sm leading-6 text-ink">
                    {effectiveSummary}
                  </pre>

                </div>

                {/* Structured History */}
                <div className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">

                  <div className="flex items-center justify-between">

                    <h2 className="font-display text-xl font-semibold text-ink">
                      Structured history
                    </h2>

                    <span className="text-xs text-muted">
                      Confirm each field before clinical use
                    </span>

                  </div>

                  <div className="mt-3 divide-y divide-clinic-50">

                    {Object.entries(answers).map(
                      ([field, value]) => {

                        const ev =
                          evidenceFor(field);

                        /*
                         * IMPORTANT FIX:
                         * The review() function above is kept intact.
                         * We use reviewRecord here to avoid
                         * shadowing the review() function.
                         */
                        const reviewRecord =
                          doctorReviews.find(
                            r => r.field === field
                          );

                        const status = reviewRecord?.status || 'unverified';

                        const displayed =
                          status === 'edited'
                            ? (
                                reviewRecord?.editedValue ??
                                String(valueText(value))
                              )
                            : valueText(value);

                        const hasPendingEdit =
                          edits[field] !== undefined &&
                          edits[field] !== displayed;

                        return (
                          <div
                            key={field}
                            className="py-4"
                          >

                            <div className="grid gap-3 lg:grid-cols-[180px_1fr] lg:items-start">

                              {/* Field label */}
                              <div>

                                <p className="text-sm font-medium text-ink">
                                  {labelField(field)}
                                </p>

                                <div className="mt-1 flex items-center gap-1.5">
                                  {status === 'confirmed' ? (
                                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                                      ✓ Confirmed
                                    </span>
                                  ) : status === 'edited' ? (
                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                      ✎ Edited
                                    </span>
                                  ) : status === 'rejected' ? (
                                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-800">
                                      ✕ Rejected
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                      Unverified
                                    </span>
                                  )}
                                  <span className="text-xs text-muted">
                                    · {ev?.confidence || 'medium'}
                                  </span>
                                </div>

                              </div>

                              {/* Field content */}
                              <div>

                                <input
                                  value={
                                    edits[field] ??
                                    displayed
                                  }
                                  onChange={e =>
                                    setEdits(x => ({
                                      ...x,
                                      [field]:
                                        e.target.value
                                    }))
                                  }
                                  className={`w-full rounded-lg border p-2.5 text-sm ${
                                    status === 'rejected'
                                      ? 'border-red-200 bg-red-50/40 text-red-900 line-through'
                                      : status === 'confirmed'
                                      ? 'border-emerald-200 bg-emerald-50/20'
                                      : status === 'edited'
                                      ? 'border-amber-200 bg-amber-50/20'
                                      : 'border-clinic-200'
                                  }`}
                                />

                                <div className="mt-2 flex flex-wrap items-center gap-2">

                                  <span className="rounded-full bg-clinic-50 px-2 py-1 text-xs text-clinic-800">
                                    Source:{' '}
                                    {ev?.source ||
                                      'PATIENT'}
                                  </span>

                                  {ev?.originalAnswer && (
                                    <span className="rounded-full bg-slate-50 px-2 py-1 text-xs text-slate-700">
                                      Original:{' '}
                                      {ev.originalAnswer}
                                    </span>
                                  )}

                                  {/* Action buttons: conditionally rendered based on review state */}
                                  {status !== 'confirmed' && (
                                    <button
                                      onClick={() =>
                                        review(
                                          field,
                                          'confirmed'
                                        )
                                      }
                                      className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition shadow-2xs"
                                    >
                                      Confirm
                                    </button>
                                  )}

                                  {hasPendingEdit && (
                                    <button
                                      onClick={() =>
                                        saveEdit(field)
                                      }
                                      className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition shadow-2xs"
                                    >
                                      Save edit
                                    </button>
                                  )}

                                  {status !== 'rejected' && (
                                    <button
                                      onClick={() =>
                                        review(
                                          field,
                                          'rejected'
                                        )
                                      }
                                      className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 transition shadow-2xs"
                                    >
                                      Reject
                                    </button>
                                  )}

                                  {/* For already-confirmed or rejected fields without draft changes, offer an easy Edit action */}
                                  {(status === 'confirmed' || status === 'rejected') && !hasPendingEdit && (
                                    <button
                                      onClick={() => {
                                        setEdits(x => ({
                                          ...x,
                                          [field]: displayed
                                        }));
                                      }}
                                      className="rounded-full border border-clinic-200 bg-white px-3 py-1 text-xs font-medium text-clinic-700 hover:bg-clinic-50 transition shadow-2xs"
                                    >
                                      Edit
                                    </button>
                                  )}

                                </div>

                              </div>

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>

                  {/* AYUSH CLINICAL SUMMARY CARD */}
                  {Object.keys(ayushHistory).length > 0 && (
                    <div className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-clinic-50 px-2.5 py-0.5 text-xs font-semibold text-clinic-700">
                            <span>🌿</span> AYUSH Module · Ayurvedic Intake
                          </span>
                          <h2 className="mt-2 font-display text-xl font-semibold text-ink">
                            Ayurvedic Clinical History Available
                          </h2>
                          <p className="mt-1 text-sm text-muted">
                            Structured patient-reported traditional medicine intake ({Object.keys(ayushHistory).length} recorded items).
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setTab('ayush')}
                          className="rounded-full bg-clinic-50 border border-clinic-300 px-5 py-2 text-sm font-semibold text-clinic-800 hover:bg-clinic-100 transition shadow-2xs"
                        >
                          View Ayurvedic History →
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </>
            )}

            {/* CONVERSATION TAB */}
            {tab === 'conversation' && (
              <div className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">

                <h2 className="font-display text-xl font-semibold text-ink">
                  Original patient evidence
                </h2>

                <div className="mt-5 space-y-3">

                  {evidence.map(e => (
                    <div
                      key={`${e.field}-${e.timestamp}`}
                      className="rounded-xl border border-clinic-100 p-4"
                    >

                      <p className="text-xs uppercase tracking-wide text-muted">
                        {labelField(e.field)} ·{' '}
                        {e.language} ·{' '}
                        {e.confidence}
                      </p>

                      <p className="mt-1 text-ink">
                        “{e.originalAnswer}”
                      </p>

                      <p className="mt-1 text-sm text-clinic-700">
                        Normalized:{' '}
                        {String(
                          e.normalizedValue ??
                          'unknown'
                        )}
                      </p>

                    </div>
                  ))}

                </div>

              </div>
            )}

            {/* DOCUMENTS TAB */}
            {tab === 'documents' && (
              <div className="space-y-4">

                <DocumentUpload />

                <div className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">

                  <h2 className="font-display text-xl font-semibold">
                    Document evidence register
                  </h2>

                  {documents.map(d => (
                    <div
                      key={d.id}
                      className="mt-4 rounded-xl bg-canvas p-4"
                    >

                      <p className="font-medium">
                        {d.name}
                      </p>

                      {d.entities.map(
                        (e: any, i: number) => (
                          <p
                            key={i}
                            className="mt-1 text-sm text-muted"
                          >
                            {e.type}: {e.value} ·{' '}
                            {e.confidence} · source:{' '}
                            {e.sourceText}
                          </p>
                        )
                      )}

                    </div>
                  ))}

                </div>

              </div>
            )}

            {/* TIMELINE TAB */}
            {tab === 'timeline' && (
              <div className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">

                <h2 className="font-display text-xl font-semibold">
                  Medical timeline
                </h2>

                {timeline.map((e, i) => (
                  <div
                    key={e.id}
                    className="relative mt-5 pl-7"
                  >

                    <span className="absolute left-1 top-1 h-3 w-3 rounded-full bg-clinic-600" />

                    {i < timeline.length - 1 && (
                      <span className="absolute left-[6px] top-4 h-full w-px bg-clinic-100" />
                    )}

                    <p className="text-xs text-muted">
                      {new Date(
                        e.date
                      ).toLocaleString()}{' '}
                      · {e.source}
                    </p>

                    <p className="font-medium text-ink">
                      {e.title}
                    </p>

                    <p className="text-sm text-muted">
                      {e.detail}
                    </p>

                  </div>
                ))}

              </div>
            )}

            {/* AYUSH TAB */}
            {tab === 'ayush' && (
              <div className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-clinic-600">
                      <span>🌿</span>
                      <span>AYUSH Mode · Ayurvedic Clinical History</span>
                    </div>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-ink">
                      Ayurvedic Clinical Intake Review
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Patient-reported Ayurvedic clinical history for practitioner reference. This is not an automated diagnosis.
                    </p>
                  </div>

                  <span className="rounded-full bg-clinic-50 border border-clinic-200 px-3 py-1 text-xs font-medium text-clinic-800">
                    Practitioner Reference Only
                  </span>
                </div>

                {ayushSections.length === 0 ? (
                  <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    No Ayurvedic clinical history has been recorded for this patient.
                  </div>
                ) : (
                  <div className="mt-6 space-y-6">
                    {ayushSections.map(group => (
                      <section
                        key={group.section}
                        className="rounded-xl border border-clinic-100 p-5 bg-clinic-50/20"
                      >
                        <h3 className="text-base font-semibold text-ink border-b border-clinic-100 pb-2">
                          {group.section}
                        </h3>

                        <div className="mt-3 divide-y divide-slate-100">
                          {group.fields.map(field => (
                            <div
                              key={field}
                              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between"
                            >
                              <p className="font-medium text-ink text-sm">
                                {ayushLabels[field] || field}
                              </p>

                              <p className="max-w-2xl text-sm font-medium text-clinic-800 sm:text-right">
                                {getAyushValue(field)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}

                <div className="mt-6 rounded-xl bg-canvas p-4 text-xs text-muted border border-clinic-100">
                  <strong className="text-ink">Source:</strong> Patient-reported Ayurvedic clinical history ·
                  Captured during intake · Designed for Ayurvedic OPD practitioner review · Does not constitute an autonomous diagnosis or prescription.
                </div>
              </div>
            )}

            {/* MEDICATION SAFETY TAB */}
            {tab === 'medication_safety' && (
              <div className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-clinic-100 pb-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-clinic-600">
                      <span>💊</span>
                      <span>Clinical Pharmacology · Official Label Evidence</span>
                    </div>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-ink">
                      Medication Safety & Interaction Review
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Evaluates active and provisional medications against reported patient allergies, chronic conditions, and official product labels.
                    </p>
                  </div>

                  <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-800">
                    Rule-Based Prototype Checker
                  </span>
                </div>

                {/* Honest Clinical Scope Notice */}
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                  <strong>Clinical Scope Notice:</strong> Preliminary rule-based screening for prototype demonstration. Absence of an alert does <em>NOT</em> imply absence of drug-drug interactions or complete safety. Licensed clinician review against official CDSCO / Indian Pharmacopoeia formulary is required before prescribing.
                </div>

                {/* Add / Check Medication Input */}
                <div className="mt-5 rounded-xl border border-clinic-200 bg-canvas/40 p-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Check Medication or Add to Interaction Screen
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={medQuery}
                      onChange={(e) => setMedQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && medQuery.trim()) {
                          e.preventDefault();
                          if (!customMeds.includes(medQuery.trim())) {
                            setCustomMeds([...customMeds, medQuery.trim()]);
                          }
                          setMedQuery('');
                        }
                      }}
                      placeholder="Type allopathic medicine name (e.g. Paracetamol, Ibuprofen, Amoxicillin, Metformin)..."
                      className="w-full rounded-xl border border-clinic-200 bg-white px-4 py-2.5 text-xs text-ink focus:border-clinic-500 focus:outline-hidden focus:ring-1 focus:ring-clinic-200 transition"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (medQuery.trim() && !customMeds.includes(medQuery.trim())) {
                          setCustomMeds([...customMeds, medQuery.trim()]);
                          setMedQuery('');
                        }
                      }}
                      className="shrink-0 rounded-xl bg-clinic-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-clinic-700 transition"
                    >
                      + Add to Check
                    </button>
                  </div>

                  {/* Quick-add chips */}
                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-muted">Quick test:</span>
                    {['Paracetamol 500mg', 'Ibuprofen 400mg', 'Amoxicillin 500mg', 'Metformin 500mg', 'Atenolol 25mg', 'Pantoprazole 40mg'].map((qm) => (
                      <button
                        key={qm}
                        type="button"
                        onClick={() => {
                          if (!customMeds.includes(qm)) {
                            setCustomMeds([...customMeds, qm]);
                          }
                        }}
                        className="rounded-lg border border-clinic-200 bg-white px-2 py-1 text-[11px] font-medium text-clinic-700 hover:bg-clinic-50 transition"
                      >
                        + {qm}
                      </button>
                    ))}
                    {customMeds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCustomMeds([])}
                        className="ml-auto text-[11px] font-medium text-rose-600 hover:underline"
                      >
                        Clear added ({customMeds.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* ACTIVE MEDICATIONS LIST */}
                <div className="mt-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                    Current Medications Under Review
                  </h3>
                  {(() => {
                    const extracted = documents.flatMap((d) =>
                      (d.entities || [])
                        .filter((e) => e.type === 'Medication')
                        .map((e) => e.value)
                    );
                    const reported = backgroundHistory.medications
                      ? backgroundHistory.medications
                          .split(/[,;\n]+/)
                          .map((m) => m.trim())
                          .filter((m) => m && m.toLowerCase() !== 'none')
                      : [];
                    const allList = Array.from(new Set([...reported, ...extracted, ...customMeds]));

                    if (allList.length === 0) {
                      return (
                        <p className="rounded-xl border border-dashed border-clinic-200 p-4 text-xs text-muted">
                          No medications currently recorded. Add medicine names above or upload a prescription to run safety checks.
                        </p>
                      );
                    }

                    return (
                      <div className="flex flex-wrap gap-2">
                        {allList.map((m, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-clinic-200 bg-clinic-50/60 px-3 py-1.5 text-xs font-semibold text-clinic-900"
                          >
                            <span>💊</span>
                            <span>{m}</span>
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* SAFETY ALERTS & CONTRAINDICATIONS */}
                <div className="mt-6 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Clinical Safety Warnings & Contraindication Analysis
                  </h3>

                  {(() => {
                    const extracted = documents.flatMap((d) =>
                      (d.entities || [])
                        .filter((e) => e.type === 'Medication')
                        .map((e) => e.value)
                    );
                    const reported = backgroundHistory.medications
                      ? backgroundHistory.medications
                          .split(/[,;\n]+/)
                          .map((m) => m.trim())
                          .filter((m) => m && m.toLowerCase() !== 'none')
                      : [];
                    const allList = Array.from(new Set([...reported, ...extracted, ...customMeds]));
                    const allText = allList.join(' ').toLowerCase();

                    const allergiesText = (backgroundHistory.allergies || '').toLowerCase();
                    const pastConditions = (backgroundHistory.pastMedical || '').toLowerCase();
                    const complaintText = ((complaint?.originalInput || '') + ' ' + (complaint?.displayName || '')).toLowerCase();

                    const warnings: Array<{ level: 'urgent' | 'caution' | 'info'; title: string; detail: string }> = [];

                    // Allergy cross-matching
                    if (allergiesText && allergiesText !== 'none') {
                      if ((allergiesText.includes('penicillin') || allergiesText.includes('amoxicillin')) && (allText.includes('amoxicillin') || allText.includes('penicillin') || allText.includes('augmentin'))) {
                        warnings.push({
                          level: 'urgent',
                          title: 'Severe Allergy Contraindication: Penicillin Class',
                          detail: `Patient reported allergy "${backgroundHistory.allergies}". Prescribing penicillin/amoxicillin-class antibiotics carries risk of anaphylaxis.`,
                        });
                      }
                      if ((allergiesText.includes('aspirin') || allergiesText.includes('nsaid') || allergiesText.includes('sulfa')) && (allText.includes('aspirin') || allText.includes('ibuprofen') || allText.includes('diclofenac'))) {
                        warnings.push({
                          level: 'urgent',
                          title: 'Allergy Warning: NSAID / Aspirin Hypersensitivity',
                          detail: `Patient reported allergy "${backgroundHistory.allergies}". Cross-reactive with active NSAID medication.`,
                        });
                      }
                    }

                    // NSAID + GI Ulcer / Gastritis / Bleeding
                    if (allText.includes('ibuprofen') || allText.includes('diclofenac') || allText.includes('aspirin') || allText.includes('naproxen') || allText.includes('aceclofenac')) {
                      if (pastConditions.includes('ulcer') || pastConditions.includes('gastritis') || complaintText.includes('stomach') || complaintText.includes('abdominal pain') || complaintText.includes('vomit')) {
                        warnings.push({
                          level: 'caution',
                          title: 'Gastrointestinal Toxicity Precaution (NSAID)',
                          detail: 'NSAIDs significantly increase risk of gastric ulceration, bleeding, and perforation. Co-prescribe PPI (e.g. Pantoprazole) or consider acetaminophen alternative.',
                        });
                      }
                      if (pastConditions.includes('kidney') || pastConditions.includes('renal') || pastConditions.includes('ckd')) {
                        warnings.push({
                          level: 'urgent',
                          title: 'Renal Toxicity Warning: NSAIDs in Pre-existing Renal Impairment',
                          detail: 'NSAIDs inhibit renal prostaglandins and can induce acute kidney injury in vulnerable patients.',
                        });
                      }
                    }

                    // Beta-Blocker + Asthma / COPD
                    if (allText.includes('atenolol') || allText.includes('metoprolol') || allText.includes('propranolol') || allText.includes('bisoprolol')) {
                      if (pastConditions.includes('asthma') || pastConditions.includes('copd') || complaintText.includes('wheez') || complaintText.includes('breathless')) {
                        warnings.push({
                          level: 'caution',
                          title: 'Bronchospasm Risk: Beta-Blockers with Reactive Airway Disease',
                          detail: 'Beta-adrenergic blockade may precipitate life-threatening bronchospasm in patients with asthma or severe COPD.',
                        });
                      }
                    }

                    // Metformin + Dehydration / Renal
                    if (allText.includes('metformin')) {
                      if (complaintText.includes('vomiting') || complaintText.includes('diarrhea') || complaintText.includes('dehydrat')) {
                        warnings.push({
                          level: 'caution',
                          title: 'Lactic Acidosis Precaution: Metformin during Acute Illness',
                          detail: 'Temporarily withhold Metformin in patients presenting with dehydration, severe vomiting, or acute hemodynamic instability.',
                        });
                      }
                    }

                    // General guidance note if no critical warnings triggered
                    if (warnings.length === 0) {
                      warnings.push({
                        level: 'info',
                        title: 'No Critical Drug-Allergy or Disease Contraindications Flagged',
                        detail: 'Evaluated against patient reported allergies and chronic conditions. Always confirm renal and hepatic function before finalizing discharge prescription.',
                      });
                    }

                    return warnings.map((w, i) => (
                      <div
                        key={i}
                        className={`rounded-xl border p-4 shadow-2xs ${
                          w.level === 'urgent'
                            ? 'border-rose-300 bg-rose-50/90 text-rose-900'
                            : w.level === 'caution'
                            ? 'border-amber-300 bg-amber-50/90 text-amber-900'
                            : 'border-clinic-200 bg-clinic-50/60 text-clinic-900'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {w.level === 'urgent' ? '🚨' : w.level === 'caution' ? '⚠️' : 'ℹ️'}
                          </span>
                          <strong className="text-xs uppercase tracking-wide">{w.title}</strong>
                        </div>
                        <p className="mt-1 text-xs pl-5 leading-relaxed">{w.detail}</p>
                      </div>
                    ));
                  })()}
                </div>

                {/* OFFICIAL LABEL & DOSAGE REFERENCE GUIDE */}
                <div className="mt-6 rounded-xl border border-clinic-100 bg-canvas p-4 text-xs text-muted">
                  <div className="flex items-center justify-between">
                    <strong className="text-ink">Official Product Label Evidence Summary:</strong>
                    <span className="text-[10px] font-semibold text-clinic-700">FDA / CDSCO Monograph Standards</span>
                  </div>
                  <ul className="mt-2 space-y-1.5 list-disc pl-4">
                    <li><strong className="text-ink">Paracetamol:</strong> Max 4000 mg/24h in adults (reduced in hepatic disease or chronic alcohol use).</li>
                    <li><strong className="text-ink">Amoxicillin:</strong> Standard adult dose 500 mg TID or 875 mg BID. Check hypersensitivity history.</li>
                    <li><strong className="text-ink">Ibuprofen:</strong> 400 mg q6-8h PRN. Contraindicated in active peptic ulceration or 3rd trimester pregnancy.</li>
                    <li><strong className="text-ink">Metformin:</strong> Titrate with meals to minimize GI adverse effects. Monitor eGFR annually.</li>
                  </ul>
                  <p className="mt-3 text-[11px] text-muted italic">
                    * For physician reference only. Final prescription decisions and dosing remain the exclusive clinical responsibility of the certified practitioner.
                  </p>
                </div>
              </div>
            )}

          </section>

        </div>

      </main>

    </div>
  );
}