import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppHeader from "../../components/AppHeader";
import { useLanguage } from "../../i18n/LanguageContext";
import { QuestionEngine } from "./engine/QuestionEngine";
import { abdominalPainFlow } from "./engine/flows/abdominalPainFlow";
import { feverFlow } from "./engine/flows/feverFlow";
import { coughFlow } from "./engine/flows/coughFlow";
import { customComplaintFlow } from "./engine/flows/customComplaintFlow";
import type {
  AnswerValue,
  QuestionDefinition,
  QuestionFlow,
} from "./engine/types";
import { usePatientSession } from "./state/PatientSessionContext";
import { normalizeClinicalAnswer } from "./services/clinicalNormalizer";
import {
  evaluateSafety,
  detectUrgentComplaintText,
} from "../safety/safetyEngine";
import { buildTimeline } from "../history/recordUtils";
import {
  type AdaptiveAnalysis,
  type AdaptiveQuestion,
  adaptAfterAnswer,
  shouldSkipQuestion,
} from "../../adaptiveQuestionEngine";

const FLOWS: Record<string, QuestionFlow> = {
  abdominal_pain: abdominalPainFlow,
  fever: feverFlow,
  cough: coughFlow,
  custom: customComplaintFlow,
};
const yesNo = new Set(["yes", "no", "not_sure"]);
function localized(q: QuestionDefinition, language: "en" | "hi") {
  return language === "hi" ? q.questionHi : q.questionEn;
}
function optionLabel(
  o: { labelEn: string; labelHi: string },
  language: "en" | "hi",
) {
  return language === "hi" ? o.labelHi : o.labelEn;
}
function toTypedValue(
  question: QuestionDefinition,
  text: string,
  current: AnswerValue,
): AnswerValue {
  const raw = text.trim();
  if (question.answerType === "number") {
    const m = raw.match(/-?\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : current;
  }
  if (question.answerType === "single_select") {
    const lower = raw.toLowerCase();
    for (const o of question.options ?? []) {
      if (
        lower.includes(o.value) ||
        lower.includes(o.labelEn.toLowerCase()) ||
        lower.includes(o.labelHi)
      )
        return o.value;
    }
    if (yesNo.has(lower)) return lower;
  }
  return raw || current;
}
export default function AdaptiveHistoryFlow() {
  const { language } = useLanguage();
  const nav = useNavigate();
  const {
    chiefComplaint,
    setHistoryAnswers,
    setEvidence,
    setSafetyFlags,
    setTimeline,
  } = usePatientSession();
  const flow = chiefComplaint ? FLOWS[chiefComplaint.complaintId] : null;
  const engineRef = useRef<QuestionEngine | null>(null);
  if (flow && !engineRef.current)
    engineRef.current = new QuestionEngine(flow, chiefComplaint?.complaintId);
  const engine = engineRef.current;
  const [, force] = useState(0);
  const [draft, setDraft] = useState<AnswerValue>(null);
  const [typed, setTyped] = useState("");
  const [adaptiveAnalysis, setAdaptiveAnalysis] =
    useState<AdaptiveAnalysis | null>(null);

  const [adaptiveQuestions, setAdaptiveQuestions] = useState<
    AdaptiveQuestion[]
  >([]);

  const [adaptiveAnsweredIds, setAdaptiveAnsweredIds] = useState<string[]>([]);
const [adaptiveAnswers, setAdaptiveAnswers] = useState<Record<string, string>>({});
  const [adaptiveQuestionIndex, setAdaptiveQuestionIndex] = useState(0);
  const [adaptiveAnsweredIds, setAdaptiveAnsweredIds] = useState<string[]>([]);
const [adaptiveAnswers, setAdaptiveAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [evidenceLocal, setEvidenceLocal] = useState<
    Record<string, ReturnType<typeof normalizeClinicalAnswer>>
  >({});
  const state = engine?.getState();
  const current = engine?.getCurrentQuestion() ?? null;
  const currentAdaptiveQuestion =
    adaptiveQuestions[adaptiveQuestionIndex] ?? null;
  const hasAdaptiveQuestion = currentAdaptiveQuestion !== null;
  const active = useMemo(
    () =>
      editing
        ? (Object.values(flow?.questions ?? {}).find(
            (q) => q.field === editing,
          ) ?? null)
        : current,
    [editing, current, flow],
  );
  const complete = engine?.isComplete() ?? false;
  const progress = engine?.getProgress() ?? 0;
  useEffect(() => {
    const stored = sessionStorage.getItem("sehatSaathi_adaptive_analysis");

    if (!stored) return;

    try {
      const analysis: AdaptiveAnalysis = JSON.parse(stored);

      setAdaptiveAnalysis(analysis);
      setAdaptiveQuestions(analysis.questions);
      setAdaptiveQuestionIndex(0);
    } catch (error) {
      console.error("Failed to load adaptive analysis:", error);
    }
  }, []);
  useEffect(() => {
    if (active) {
      const existing = engine?.getState().answers[active.field] ?? null;
      setDraft(existing);
      setTyped(typeof existing === "string" ? existing : "");
      setError("");
    }
  }, [active?.id]);
  if (!chiefComplaint || !flow || !engine)
    return (
      <div className="min-h-screen bg-canvas">
        <AppHeader />
        <main className="mx-auto max-w-2xl px-6 py-12">
          <div className="rounded-2xl border border-clinic-100 bg-white p-8 text-center">
            <h1 className="font-display text-2xl font-semibold">
              Start with a chief complaint
            </h1>
            <Link
              className="mt-6 inline-block rounded-full bg-clinic-600 px-6 py-3 text-white"
              to="/patient"
            >
              Go to complaint
            </Link>
          </div>
        </main>
      </div>
    );
  const applyNatural = () => {
    if (!active || !typed.trim()) return;
    const value = toTypedValue(active, typed, draft);
    const ev = normalizeClinicalAnswer(active.field, typed);
    setEvidenceLocal((x) => ({ ...x, [active.field]: ev }));
    if (
      active.answerType === "text" ||
      (typeof value === "number" && Number.isFinite(value)) ||
      (typeof value === "string" &&
        ((active.answerType === "single_select" &&
          active.options?.some((o) => o.value === value)) ||
          active.answerType !== "single_select"))
    ) {
      setDraft(value);
      setError("");
    } else
      setError(
        language === "hi"
          ? "उत्तर समझ नहीं आया। कृपया विकल्प चुनें।"
          : "I could not confidently understand that. Please choose an option or rephrase.",
      );
  };
const submitAdaptiveAnswer = () => {
  if (!currentAdaptiveQuestion || !adaptiveAnalysis) return;

  const answer = typed.trim();
  const adaptiveSafetyText =
  `${currentAdaptiveQuestion.text} ${answer}`;

const urgentTextFlag =
  detectUrgentComplaintText(adaptiveSafetyText);

if (urgentTextFlag) {
  setSafetyFlags([urgentTextFlag]);
  nav("/patient/emergency");
  return;
}

  if (!answer) {
    setError(
      language === "hi"
        ? "कृपया इस सवाल का जवाब दें।"
        : "Please answer this question.",
    );
    return;
  }

  setError("");
  

  // Add the current answer to the adaptive state
  const nextAnsweredIds = adaptiveAnsweredIds.includes(
    currentAdaptiveQuestion.id,
  )
    ? adaptiveAnsweredIds
    : [
        ...adaptiveAnsweredIds,
        currentAdaptiveQuestion.id,
      ];

  const nextAnswers = {
    ...adaptiveAnswers,
    [currentAdaptiveQuestion.id]: answer,
  };
  const safetyFlags = evaluateSafety({
  ...(engine?.getState().answers ?? {}),
  ...nextAnswers,
});

setSafetyFlags(safetyFlags);

const urgentFlag = safetyFlags.find(
  (flag) => flag.severity === "urgent",
);

if (urgentFlag) {
  nav("/patient/emergency");
  return;
}

  // Let the adaptive engine react to the answer.
  // This can introduce additional relevant concepts/questions.
  const adaptedState = adaptAfterAnswer(
    {
      analysis: adaptiveAnalysis,
      answeredQuestionIds: adaptiveAnsweredIds,
      answers: adaptiveAnswers,
    },
    currentAdaptiveQuestion,
    answer,
  );

  // Save the answer as clinical evidence
  const evidence = normalizeClinicalAnswer(
  `adaptive_${currentAdaptiveQuestion.id}`,
  answer,
);

setEvidenceLocal((previous) => ({
  ...previous,
  [`adaptive_${currentAdaptiveQuestion.id}`]: evidence,
}));

setEvidence([
  ...Object.values(evidenceLocal).filter(
    (item) => item.field !== evidence.field,
  ),
  evidence,
]);

  setAdaptiveAnalysis(adaptedState.analysis);
  setAdaptiveQuestions(adaptedState.analysis.questions);
  setAdaptiveAnsweredIds(nextAnsweredIds);
  setAdaptiveAnswers(nextAnswers);

  // Find the next relevant unanswered question.
  const remainingQuestions =
    adaptedState.analysis.questions.filter(
      (question) =>
        !nextAnsweredIds.includes(question.id) &&
        !shouldSkipQuestion(
          question,
          adaptedState.analysis,
        ),
    );

  if (remainingQuestions.length > 0) {
    const nextQuestion = remainingQuestions[0];

    const nextIndex =
      adaptedState.analysis.questions.findIndex(
        (question) =>
          question.id === nextQuestion.id,
      );

    setAdaptiveQuestionIndex(
      nextIndex >= 0 ? nextIndex : 0,
    );

    setTyped("");
    setDraft(null);
    return;
  }

  // Adaptive questioning finished.
  sessionStorage.removeItem(
    "sehatSaathi_adaptive_analysis",
  );

  setAdaptiveQuestions([]);
  setAdaptiveQuestionIndex(0);
  setAdaptiveAnsweredIds([]);
  setAdaptiveAnswers({});
  setTyped("");
  setDraft(null);

  // Continue normal history
  force((x) => x + 1);
};

  const submit = () => {
    if (!active) return;
    const rawTyped = typed.trim();
    const value = rawTyped ? toTypedValue(active, rawTyped, draft) : draft;
    if (rawTyped) {
      setEvidenceLocal((x) => ({
        ...x,
        [active.field]: normalizeClinicalAnswer(active.field, rawTyped),
      }));
    }
    const r = editing
      ? engine.correctAnswer(active.field, value)
      : engine.submitAnswer(value);
    if (!r.ok) {
      setError(r.error ?? "Please answer this question.");
      return;
    }
    if (editing) {
      setEditing(null);
      force((x) => x + 1);
      return;
    }
    const stBeforeNext = engine.getState();
    const immediateFlags = evaluateSafety(stBeforeNext.answers);
    setSafetyFlags(immediateFlags);
    const urgentFlag = immediateFlags.find((f) => f.severity === "urgent");
    const ev =
      evidenceLocal[active.field] ??
      normalizeClinicalAnswer(active.field, String(value ?? ""));
    setEvidence([
      ...Object.values(evidenceLocal).filter((e) => e.field !== ev.field),
      ev,
    ]);
    if (urgentFlag) {
      setHistoryAnswers(stBeforeNext.answers);
      setTimeline(
        buildTimeline(chiefComplaint, stBeforeNext.answers, [], undefined),
      );
      nav("/patient/emergency");
      return;
    }
    const a = engine.goToNext();
    if (!a.ok) {
      setError(a.error ?? "Please answer this question.");
      return;
    }
    const st = engine.getState();
    if (engine.isComplete()) {
      setHistoryAnswers(st.answers);
      const flags = evaluateSafety(st.answers);
      setSafetyFlags(flags);
      setTimeline(buildTimeline(chiefComplaint, st.answers, [], undefined));
      nav("/patient/documents");
      return;
    }
    setTyped("");
    setDraft(null);
    force((x) => x + 1);
  };
  const goBack = () => {
    if (editing) {
      setEditing(null);
      return;
    }
    if (engine.goBack().ok) force((x) => x + 1);
  };
  const startVoice = () => {
    type SpeechCtor = new () => any;
    const Ctor =
      (
        window as unknown as {
          SpeechRecognition?: SpeechCtor;
          webkitSpeechRecognition?: SpeechCtor;
        }
      ).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechCtor })
        .webkitSpeechRecognition;
    if (!Ctor) {
      setError("Voice input is not supported here. You can type instead.");
      return;
    }
    const rec = new Ctor();
    rec.lang = language === "hi" ? "hi-IN" : "en-IN";
    rec.onresult = (e: any) => {
      const v = e.results?.[0]?.[0]?.transcript ?? "";
      setTyped(v);
      setListening(false);
      setTimeout(() => {
        setEvidenceLocal((x) => ({
          ...x,
          [active?.field ?? "voice"]: normalizeClinicalAnswer(
            active?.field ?? "voice",
            v,
          ),
        }));
      }, 0);
    };
    rec.onerror = () => {
      setListening(false);
      setError("Voice input was unavailable. Please type your answer.");
    };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };
  const speak = () => {
    if (!active) return;
    const u = new SpeechSynthesisUtterance(localized(active, language));
    u.lang = language === "hi" ? "hi-IN" : "en-IN";
    window.speechSynthesis.speak(u);
  };
  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-5">
        {hasAdaptiveQuestion && currentAdaptiveQuestion && (
  <div className="mb-6 rounded-2xl border border-clinic-200 bg-white p-6 shadow-sm">
    <p className="text-sm font-semibold uppercase tracking-wide text-clinic-700">
      Relevant follow-up
    </p>

    <h2 className="mt-2 text-2xl font-semibold text-ink">
     {language === "hi"
  ? currentAdaptiveQuestion.text
  : currentAdaptiveQuestion.text}
    </h2>

    <p className="mt-2 text-sm text-muted">
      Question {adaptiveQuestionIndex + 1} of{" "}
      {adaptiveQuestions.length}
    </p>

    {currentAdaptiveQuestion.type === "yes_no" && (
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setTyped("yes");
            setDraft("yes");
          }}
          className="rounded-xl border border-clinic-200 bg-white p-4 text-lg font-medium hover:border-clinic-500"
        >
          Yes
        </button>

        <button
          type="button"
          onClick={() => {
            setTyped("no");
            setDraft("no");
          }}
          className="rounded-xl border border-clinic-200 bg-white p-4 text-lg font-medium hover:border-clinic-500"
        >
          No
        </button>
      </div>
    )}

    {currentAdaptiveQuestion.type === "text" && (
      <textarea
        value={typed}
        onChange={(event) => {
          setTyped(event.target.value);
        }}
        placeholder="Tell us more..."
        className="mt-6 min-h-28 w-full rounded-xl border border-clinic-200 p-4"
      />
    )}

    {currentAdaptiveQuestion.type === "single" &&
      currentAdaptiveQuestion.options && (
        <div className="mt-6 grid gap-3">
         {currentAdaptiveQuestion.options.map((option: string) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setTyped(option);
                setDraft(option);
              }}
              className="rounded-xl border border-clinic-200 bg-white p-4 text-left hover:border-clinic-500"
            >
              {option}
            </button>
          ))}
        </div>
      )}

    {error && (
      <p className="mt-3 text-sm text-flag-700">
        {error}
      </p>
    )}

    <button
      type="button"
      onClick={submitAdaptiveAnswer}
      className="mt-6 rounded-full bg-clinic-600 px-6 py-3 font-semibold text-white"
    >
      Continue
    </button>
  </div>
)}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wide text-clinic-500">
            Step 3 · {chiefComplaint.displayName}
          </p>
          <span className="text-sm text-muted">
            {Math.round(progress * 100)}%
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-clinic-100">
          <div
            className="h-full bg-clinic-600 transition-all"
            style={{ width: `${Math.max(5, progress * 100)}%` }}
          />
        </div>
        {complete ? (
          <div className="mt-8 rounded-2xl border border-clinic-100 bg-white p-10 text-center shadow-sm">
            <h1 className="font-display text-3xl font-semibold">
              History complete
            </h1>
            <p className="mt-3 text-muted">
              Review and add previous records next.
            </p>
            <Link
              to="/patient/documents"
              className="mt-7 inline-block rounded-full bg-clinic-600 px-7 py-3 text-white"
            >
              Continue
            </Link>
          </div>
        ) : (
          active && !hasAdaptiveQuestion && (
            <div className="mt-8 rounded-2xl border border-clinic-100 bg-white p-7 shadow-sm sm:p-10">
              <div className="flex items-start justify-between gap-4">
                <h1 className="font-display text-2xl font-semibold text-ink">
                  {localized(active, language)}
                </h1>
                <button
                  onClick={speak}
                  className="rounded-full border border-clinic-200 px-3 py-2"
                  title="Read question aloud"
                >
                  🔊
                </button>
              </div>
              {!active.required && (
                <p className="mt-2 text-sm text-muted">Optional</p>
              )}
              <QuestionInput
                question={active}
                value={draft}
                onChange={setDraft}
                language={language}
              />
              <div className="mt-5 rounded-xl bg-canvas p-4">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="natural"
                    className="text-sm font-medium text-muted"
                  >
                    Optional: answer in your own words
                  </label>
                  <button
                    onClick={startVoice}
                    disabled={listening}
                    className="rounded-full border border-clinic-200 px-3 py-1 text-sm"
                  >
                    {listening ? "Listening…" : "🎙 Speak"}
                  </button>
                </div>
                <input
                  id="natural"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyNatural();
                    }
                  }}
                  placeholder={
                    language === "hi"
                      ? "उदाहरण: तीन दिन से"
                      : "Example: for three days"
                  }
                  className="mt-2 w-full rounded-xl border border-clinic-200 bg-white p-3"
                />
                <p className="mt-2 text-xs text-muted">
                  Your answer is understood automatically when you continue.
                </p>
              </div>
              {error && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {error}
                </p>
              )}
              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button
                  onClick={goBack}
                  disabled={!editing && (state?.history.length ?? 0) === 0}
                  className="rounded-full border border-clinic-200 px-7 py-3 disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  onClick={submit}
                  className="rounded-full bg-clinic-600 px-7 py-3 text-lg font-medium text-white"
                >
                  {editing ? "Save change" : "Continue"}
                </button>
              </div>
            </div>
          )
        )}
        {state && state.completedFields.length > 0 && (
          <div className="mt-6 rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-ink">Review your answers</h2>
            <div className="mt-4 space-y-3">
              {state.completedFields.map((field) => {
                const q = Object.values(flow.questions).find(
                  (x) => x.field === field,
                );
                if (!q) return null;
                return (
                  <div
                    key={field}
                    className="flex items-center justify-between gap-4 border-t border-clinic-50 pt-3"
                  >
                    <div>
                      <p className="text-sm text-muted">
                        {localized(q, language)}
                      </p>
                      <p>{String(state.answers[field] ?? "Not reported")}</p>
                    </div>
                    <button
                      onClick={() => setEditing(field)}
                      className="rounded-full border border-clinic-200 px-4 py-1.5 text-sm"
                    >
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
function QuestionInput({
  question,
  value,
  onChange,
  language,
}: {
  question: QuestionDefinition;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  language: "en" | "hi";
}) {
  if (question.answerType === "single_select")
    return (
      <div className="mt-6 flex flex-wrap gap-3">
        {(question.options ?? []).map((o) => (
          <button
            type="button"
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-full border px-5 py-3 ${value === o.value ? "border-clinic-600 bg-clinic-600 text-white" : "border-clinic-200 text-clinic-700"}`}
          >
            {optionLabel(o, language)}
          </button>
        ))}
      </div>
    );
  if (question.answerType === "number")
    return (
      <input
        type="number"
        min={0}
        max={10}
        value={typeof value === "number" ? value : ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        className="mt-6 w-full rounded-xl border border-clinic-200 p-4 text-lg"
      />
    );
  if (question.answerType === "multi_select")
    return (
      <div className="mt-6">
        <p className="mb-3 text-sm text-muted">Select all that apply</p>
        <div className="flex flex-wrap gap-3">
          {(question.options ?? []).map((o) => {
            const a = Array.isArray(value) ? value : [];
            const selected = a.includes(o.value);
            return (
              <button
                type="button"
                key={o.value}
                onClick={() => {
                  if (o.value === "none") {
                    onChange(selected ? [] : ["none"]);
                    return;
                  }
                  const next = selected
                    ? a.filter((x) => x !== o.value)
                    : [...a.filter((x) => x !== "none"), o.value];
                  onChange(next);
                }}
                className={`rounded-xl border px-5 py-3 ${selected ? "border-clinic-600 bg-clinic-600 text-white" : "border-clinic-200 bg-white text-clinic-700"}`}
              >
                {selected ? "✓ " : ""}
                {optionLabel(o, language)}
              </button>
            );
          })}
        </div>
      </div>
    );
  return null;
}
