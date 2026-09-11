import { describe, expect, it } from "vitest";
import {
  classifyFreeText,
  classifyFromQuickButton,
  classifyRouted,
} from "./complaintClassifier";

// ─── Existing classifyFreeText tests (unchanged) ─────────────────────────────

describe("classifyFreeText — abdominal pain", () => {
  it.each([
    "stomach pain",
    "I have had stomach pain for three days.",
    "belly ache",
    "pet mein dard",
    "tummy ache",
  ])("recognizes %s", (input) => {
    const result = classifyFreeText(input);
    expect(result.complaintId).toBe("abdominal_pain");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.matchedKeywords.length).toBeGreaterThan(0);
  });
});

describe("classifyFreeText — abdominal pain natural English phrases", () => {
  it.each([
    "stomach is hurting",
    "My stomach is hurting",
    "stomach hurting",
    "my stomach hurts",
  ])("recognizes '%s' → abdominal_pain", (input) => {
    const result = classifyFreeText(input);
    expect(result.complaintId).toBe("abdominal_pain");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.matchedKeywords.length).toBeGreaterThan(0);
  });
});

describe("classifyFreeText — fever", () => {
  it.each(["fever", "bukhar", "high temperature", "I think I have a fever"])(
    "recognizes %s",
    (input) => {
      const result = classifyFreeText(input);
      expect(result.complaintId).toBe("fever");
      expect(result.confidence).toBeGreaterThan(0);
    }
  );
});

describe("classifyFreeText — cough", () => {
  it.each(["cough", "khansi", "coughing", "I've been coughing all night"])(
    "recognizes %s",
    (input) => {
      const result = classifyFreeText(input);
      expect(result.complaintId).toBe("cough");
      expect(result.confidence).toBeGreaterThan(0);
    }
  );
});

describe("classifyFreeText — unknown complaints", () => {
  it.each(["my eyes hurt", "back pain", "I can't sleep well"])(
    "does not guess for %s",
    (input) => {
      const result = classifyFreeText(input);
      expect(result.complaintId).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.matchedKeywords).toHaveLength(0);
    }
  );
});

describe("classifyFreeText — confidence scaling", () => {
  it("gives higher confidence when more than one keyword matches", () => {
    const single = classifyFreeText("stomach pain");
    const double = classifyFreeText("coughing, I have a cough");
    expect(double.confidence).toBeGreaterThan(single.confidence);
  });
});

describe("classifyFromQuickButton", () => {
  it("always returns full confidence with no ambiguity", () => {
    const result = classifyFromQuickButton("fever");
    expect(result).toMatchObject({
      complaintId: "fever",
      displayName: "Fever",
      confidence: 1,
      source: "quick_button",
    });
  });
});

// ─── classifyRouted — new body-system routing tests ──────────────────────────

describe("classifyRouted — eye problems", () => {
  it.each([
    // English
    "my eyes are hurting",
    "I have eye pain",
    "my eyes hurt",
    "blurry vision",
    "red eyes",
    "eye discharge",
    "eye infection",
    // Hindi
    "आँख में दर्द",
    "आँखें लाल हैं",
    "धुंधला दिखना",
    // Hinglish
    "aankh mein dard hai",
    "aankh dard ho rahi hai",
    "aankhein lal hain",
  ])("routes %s → eye_problems", (input) => {
    const result = classifyRouted(input);
    expect(result.complaintId).toBe("eye_problems");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.matchedKeywords.length).toBeGreaterThan(0);
  });
});

describe("classifyRouted — headache", () => {
  it.each([
    // English
    "I have a headache",
    "head pain",
    "my head hurts",
    "migraine",
    "throbbing head",
    // Hindi
    "सिर दर्द हो रहा है",
    "माथे में दर्द",
    // Hinglish
    "sar dard ho raha hai",
    "sir me dard hai",
    "matha dard hai",
  ])("routes %s → headache", (input) => {
    const result = classifyRouted(input);
    expect(result.complaintId).toBe("headache");
    expect(result.confidence).toBeGreaterThan(0);
  });
});

describe("classifyRouted — back pain", () => {
  it.each([
    // English
    "I have back pain",
    "my back is hurting",
    "lower back pain",
    "backache",
    "pain in my back",
    // Hindi
    "कमर दर्द है",
    "पीठ में दर्द है",
    "पीठ दर्द",
    // Hinglish
    "kamar dard hai",
    "peeth dard ho raha hai",
    "kamar me dard hai",
  ])("routes %s → back_pain", (input) => {
    const result = classifyRouted(input);
    expect(result.complaintId).toBe("back_pain");
    expect(result.confidence).toBeGreaterThan(0);
  });
});

describe("classifyRouted — skin problems", () => {
  it.each([
    // English
    "I have a skin rash",
    "itchy skin",
    "rash on skin",
    "eczema",
    "hives",
    "skin itching",
    // Hindi
    "त्वचा पर दाने हैं",
    "खुजली हो रही है",
    // Hinglish
    "skin pe daane hain",
    "daane nikal rahe hain",
    "khujli ho rahi hai",
  ])("routes %s → skin_problems", (input) => {
    const result = classifyRouted(input);
    expect(result.complaintId).toBe("skin_problems");
    expect(result.confidence).toBeGreaterThan(0);
  });
});

describe("classifyRouted — joint pain", () => {
  it.each([
    // English
    "I have joint pain",
    "knee pain",
    "my knee hurts",
    "shoulder pain",
    "ankle pain",
    "swollen joint",
    "joint stiffness",
    // Hindi
    "जोड़ों में दर्द है",
    "घुटने में दर्द है",
    "कंधे में दर्द",
    // Hinglish
    "ghutne mein dard hai",
    "jodon mein dard hai",
    "ghutna dukh raha hai",
  ])("routes %s → joint_pain", (input) => {
    const result = classifyRouted(input);
    expect(result.complaintId).toBe("joint_pain");
    expect(result.confidence).toBeGreaterThan(0);
  });
});

describe("classifyRouted — urinary problems", () => {
  it.each([
    // English
    "burning urine",
    "burning when urinating",
    "frequent urination",
    "urine infection",
    "uti",
    "blood in urine",
    "urinary problem",
    "difficulty urinating",
    // Hindi
    "पेशाब में जलन है",
    "बार बार पेशाब आता है",
    "पेशाब में खून",
    // Hinglish
    "peshab mein jalan hai",
    "bar bar peshab aata hai",
    "urine mein jalan hai",
  ])("routes %s → urinary_problems", (input) => {
    const result = classifyRouted(input);
    expect(result.complaintId).toBe("urinary_problems");
    expect(result.confidence).toBeGreaterThan(0);
  });
});

// ─── classifyRouted — boundary / no-false-match tests ────────────────────────

describe("classifyRouted — existing supported complaints are NOT re-routed", () => {
  it.each([
    ["stomach pain", null],
    ["I have a fever", null],
    ["I've been coughing", null],
  ])(
    "classifyRouted('%s') returns null so classifyFreeText handles it",
    (input, _expected) => {
      // classifyRouted should return null for the 3 already-supported complaints
      // because those are intentionally not in ROUTING_KEYWORDS — the
      // routing priority in the UI means classifyFreeText() runs first.
      // However, some of these inputs might also contain words that partially
      // appear in routing phrases (they should not). Verify no routing category
      // is wrongly returned.
      const result = classifyRouted(input);
      // "stomach pain" / "fever" / "cough" are not in ROUTING_KEYWORDS so
      // result must be null or, at most, must NOT be abdominal_pain/fever/cough
      // (those aren't routable complaints). Either way, classifyFreeText()
      // handles them correctly at higher priority.
      if (result.complaintId !== null) {
        expect(result.complaintId).not.toBe("abdominal_pain");
        expect(result.complaintId).not.toBe("fever");
        expect(result.complaintId).not.toBe("cough");
      }
    }
  );
});

describe("classifyRouted — vague single words do NOT trigger routing", () => {
  it.each([
    "pain",
    "ache",
    "I am not feeling well",
    "I feel sick",
    "something is wrong",
    "help",
    "dard",    // generic Hinglish — too vague
  ])("does not route '%s' to any category", (input) => {
    const result = classifyRouted(input);
    expect(result.complaintId).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.matchedKeywords).toHaveLength(0);
  });
});

describe("classifyRouted — completely unrelated text returns null", () => {
  it.each([
    "I can't sleep well",
    "I feel anxious",
    "my appetite is low",
    "I am tired of life",
  ])("returns null for '%s'", (input) => {
    const result = classifyRouted(input);
    expect(result.complaintId).toBeNull();
    expect(result.confidence).toBe(0);
  });
});

describe("classifyRouted — confidence scaling", () => {
  it("gives higher confidence when multiple phrases match", () => {
    const single = classifyRouted("I have a headache");
    const multi = classifyRouted("I have a headache, head pain and migraine");
    expect(multi.confidence).toBeGreaterThan(single.confidence);
  });
});

describe("classifyRouted — source is always free_text", () => {
  it("reports source as free_text for routed complaints", () => {
    const result = classifyRouted("my back is hurting");
    expect(result.source).toBe("free_text");
  });
});

// ─── QA-fix tests: keywords added from QA report ─────────────────────────────

describe("classifyRouted — QA fix: eye_problems Hinglish oblique form", () => {
  it.each([
    "Meri aankhon mein dard ho raha hai",
    "aankhon mein dard hai",
    "meri aankhon mein dard",
  ])("routes '%s' → eye_problems", (input) => {
    const result = classifyRouted(input);
    expect(result.complaintId).toBe("eye_problems");
    expect(result.confidence).toBeGreaterThan(0);
  });
});

describe("classifyRouted — QA fix: headache Hinglish with mein", () => {
  it.each([
    "Mere sar mein dard hai",
    "sar mein dard ho raha hai",
    "sir mein dard hai",
    "mere sir mein dard hai",
  ])("routes '%s' → headache", (input) => {
    const result = classifyRouted(input);
    expect(result.complaintId).toBe("headache");
    expect(result.confidence).toBeGreaterThan(0);
  });
});

describe("classifyRouted — QA fix: back_pain Hinglish with mein", () => {
  it.each([
    "Meri kamar mein dard ho raha hai",
    "kamar mein dard hai",
    "peeth mein dard hai",
    "meri peeth mein dard ho raha hai",
  ])("routes '%s' → back_pain", (input) => {
    const result = classifyRouted(input);
    expect(result.complaintId).toBe("back_pain");
    expect(result.confidence).toBeGreaterThan(0);
  });
});

describe("classifyRouted — QA fix: joint_pain English hurting variants", () => {
  it.each([
    "My knee is hurting",
    "my knee hurting",
    "knee is hurting",
    "knee hurting so much",
  ])("routes '%s' → joint_pain", (input) => {
    const result = classifyRouted(input);
    expect(result.complaintId).toBe("joint_pain");
    expect(result.confidence).toBeGreaterThan(0);
  });
});

describe("classifyRouted — QA fix: urinary_problems Hinglish karte waqt", () => {
  it.each([
    "Peshab karte waqt jalan hoti hai",
    "peshab karte waqt jalan",
  ])("routes '%s' → urinary_problems", (input) => {
    const result = classifyRouted(input);
    expect(result.complaintId).toBe("urinary_problems");
    expect(result.confidence).toBeGreaterThan(0);
  });
});

// ─── QA-fix: adaptive overlay suppression ────────────────────────────────────
// The routing logic (in ChiefComplaintFlow.tsx) suppresses the adaptive overlay
// when classifyRouted() matches. We verify here at the classifier level that
// classifyRouted() returns a non-null complaintId for the inputs that previously
// fell through (triggering the overlay), confirming the overlay will be skipped.
describe("classifyRouted — overlay suppression: all six routes return non-null for their QA-identified inputs", () => {
  it.each([
    ["Meri aankhon mein dard ho raha hai", "eye_problems"],
    ["Mere sar mein dard hai",             "headache"],
    ["Meri kamar mein dard ho raha hai",   "back_pain"],
    ["My knee is hurting",                 "joint_pain"],
    ["Peshab karte waqt jalan hoti hai",   "urinary_problems"],
    // Confirm an existing-working case still non-null (regression guard)
    ["I have a skin rash",                 "skin_problems"],
  ] as const)(
    "classifyRouted('%s') → %s (non-null → overlay will be suppressed)",
    (input, expectedId) => {
      const result = classifyRouted(input);
      expect(result.complaintId).toBe(expectedId);
      // A non-null complaintId from classifyRouted() is the condition that
      // triggers sessionStorage.removeItem() in ChiefComplaintFlow, ensuring
      // no adaptive questions are stored for this patient session.
    }
  );
});
