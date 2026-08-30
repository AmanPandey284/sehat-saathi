import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ComplaintId } from '../services/complaintClassifier';
import type { AnswerValue } from '../engine/types';
import type { AnswerEvidence } from '../services/clinicalNormalizer';

export interface ChiefComplaintRecord { complaintId: ComplaintId; displayName: string; originalInput: string; confidence: number; source: 'patient'; }
export interface PatientProfile { name: string; age: string; sex: string; identifier: string; identifierType: 'demo' | 'abha'; language: 'en' | 'hi'; }
export interface BackgroundHistory { pastMedical: string; pastSurgical: string; medications: string; allergies: string; family: string; personal: string; reviewOfSystems: string; }
export interface ClinicalDocument {
  id: string; name: string; type: string; uploadedAt: string; text: string;
  extractionStatus: 'extracted' | 'ocr' | 'preview_only' | 'failed';
  entities: Array<{ type: string; value: string; confidence: 'high'|'medium'|'low'; sourceText: string; page?: number; }>;
  pages?: Array<{ page: number; text: string; confidence: string }>;
  previewUrl?: string;
}
export interface SafetyFlag { id: string; severity: 'urgent'|'attention'; title: string; explanation: string; field: string; triggeredAt: string; }
export interface TimelineEvent { id: string; date: string; title: string; detail: string; source: 'PATIENT'|'DOCUMENT'|'DOCTOR'|'DEMO'; }
export interface DoctorReview { field: string; status: 'confirmed'|'edited'|'rejected'; editedValue?: string; reviewedAt: string; reviewer: string; }
export type AyushHistory = Record<string, string>;

interface PatientSessionValue {
  patientProfile: PatientProfile | null; setPatientProfile: (p: PatientProfile) => void;
  consentGranted: boolean; setConsentGranted: (v: boolean) => void;
  chiefComplaint: ChiefComplaintRecord | null; setChiefComplaint: (record: ChiefComplaintRecord) => void; clearChiefComplaint: () => void;
  historyAnswers: Record<string, AnswerValue> | null; setHistoryAnswers: (answers: Record<string, AnswerValue>) => void; clearHistoryAnswers: () => void;
  evidence: AnswerEvidence[]; setEvidence: (items: AnswerEvidence[]) => void;
  safetyFlags: SafetyFlag[]; setSafetyFlags: (items: SafetyFlag[]) => void;
  documents: ClinicalDocument[]; addDocument: (doc: ClinicalDocument) => void; removeDocument: (id: string) => void; clearDocuments: () => void;
  backgroundHistory: BackgroundHistory; setBackgroundHistory: (h: BackgroundHistory) => void;
  timeline: TimelineEvent[]; setTimeline: (events: TimelineEvent[]) => void;
  doctorReviews: DoctorReview[]; reviewField: (review: DoctorReview) => void;
  ayushHistory: AyushHistory; setAyushHistory: (h: AyushHistory) => void;
  resetSession: () => void;
}
const EMPTY_BACKGROUND: BackgroundHistory = { pastMedical:'', pastSurgical:'', medications:'', allergies:'', family:'', personal:'', reviewOfSystems:'' };
const EMPTY = { patientProfile:null, consentGranted:false, chiefComplaint:null, historyAnswers:null, evidence:[], safetyFlags:[], documents:[], backgroundHistory:EMPTY_BACKGROUND, timeline:[], doctorReviews:[], ayushHistory:{} };
const STORAGE_KEY='medikiosk_session_v2';
function load() { try { const raw=localStorage.getItem(STORAGE_KEY); return raw ? {...EMPTY,...JSON.parse(raw)} : EMPTY; } catch { return EMPTY; } }
export function PatientSessionProvider({children}:{children:ReactNode}){
 const initial=load();
 const [patientProfile,setPatientProfile]=useState<PatientProfile|null>(initial.patientProfile);
 const [consentGranted,setConsentGranted]=useState(Boolean(initial.consentGranted));
 const [chiefComplaint,setChiefComplaintState]=useState<ChiefComplaintRecord|null>(initial.chiefComplaint);
 const [historyAnswers,setHistoryAnswersState]=useState<Record<string,AnswerValue>|null>(initial.historyAnswers);
 const [evidence,setEvidenceState]=useState<AnswerEvidence[]>(initial.evidence);
 const [safetyFlags,setSafetyFlagsState]=useState<SafetyFlag[]>(initial.safetyFlags);
 const [documents,setDocuments]=useState<ClinicalDocument[]>(initial.documents);
 const [backgroundHistory,setBackgroundHistory]=useState<BackgroundHistory>(initial.backgroundHistory ?? EMPTY_BACKGROUND);
 const [timeline,setTimelineState]=useState<TimelineEvent[]>(initial.timeline);
 const [doctorReviews,setDoctorReviews]=useState<DoctorReview[]>(initial.doctorReviews ?? []);
 const [ayushHistory,setAyushHistoryState]=useState<AyushHistory>(initial.ayushHistory ?? {});
 useEffect(()=>{ try { localStorage.setItem(STORAGE_KEY,JSON.stringify({patientProfile,consentGranted,chiefComplaint,historyAnswers,evidence,safetyFlags,documents,backgroundHistory,timeline,doctorReviews,ayushHistory})); } catch {} },[patientProfile,consentGranted,chiefComplaint,historyAnswers,evidence,safetyFlags,documents,backgroundHistory,timeline,doctorReviews,ayushHistory]);
 const value=useMemo<PatientSessionValue>(()=>({
  patientProfile,setPatientProfile,consentGranted,setConsentGranted,chiefComplaint,setChiefComplaint:setChiefComplaintState,clearChiefComplaint:()=>setChiefComplaintState(null),historyAnswers,setHistoryAnswers:setHistoryAnswersState,clearHistoryAnswers:()=>setHistoryAnswersState(null),evidence,setEvidence:setEvidenceState,safetyFlags,setSafetyFlags:setSafetyFlagsState,documents,addDocument:d=>setDocuments(p=>[...p.filter(x=>x.id!==d.id),d]),removeDocument:id=>setDocuments(p=>p.filter(d=>d.id!==id)),clearDocuments:()=>setDocuments([]),backgroundHistory,setBackgroundHistory,timeline,setTimeline:setTimelineState,doctorReviews,reviewField:r=>setDoctorReviews(p=>[...p.filter(x=>x.field!==r.field),r]),ayushHistory,setAyushHistory:setAyushHistoryState,resetSession:()=>{setPatientProfile(null);setConsentGranted(false);setChiefComplaintState(null);setHistoryAnswersState(null);setEvidenceState([]);setSafetyFlagsState([]);setDocuments([]);setBackgroundHistory(EMPTY_BACKGROUND);setTimelineState([]);setDoctorReviews([]);setAyushHistoryState({});try{localStorage.removeItem(STORAGE_KEY)}catch{}}}),[patientProfile,consentGranted,chiefComplaint,historyAnswers,evidence,safetyFlags,documents,backgroundHistory,timeline,doctorReviews,ayushHistory]);
 return <PatientSessionContext.Provider value={value}>{children}</PatientSessionContext.Provider>;
}
const PatientSessionContext=createContext<PatientSessionValue|null>(null);
export function usePatientSession(){ const c=useContext(PatientSessionContext); if(!c) throw new Error('usePatientSession must be used inside PatientSessionProvider'); return c; }
