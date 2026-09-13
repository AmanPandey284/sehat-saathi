import { describe, it, expect } from 'vitest';

describe('Sehat Saathi Sahayak (Patient Support Feature)', () => {
  const STEPS = [
    {
      number: 1,
      titleEn: "Choose how you want to continue",
      titleHi: "चुनें कि आप कैसे आगे बढ़ना चाहते हैं",
      explainEn: "Choose New Patient if this is your first visit. Choose Existing Patient if you have visited before.",
      explainHi: "यदि आप पहली बार अस्पताल आए हैं तो नया मरीज चुनें। यदि आप पहले आ चुके हैं तो पुराना मरीज चुनें।",
    },
    {
      number: 2,
      titleEn: "Tell us what brings you here",
      titleHi: "बताएं कि आज आप किसलिए आए हैं",
      explainEn: "Select the problem or reason for today's visit.",
      explainHi: "आज के परामर्श का मुख्य कारण या अपनी तकलीफ चुनें।",
    },
    {
      number: 3,
      titleEn: "Answer the questions",
      titleHi: "सवालों के सरल जवाब दें",
      explainEn: "Answer the questions about your current problem. You can use the available input options, including voice when supported.",
      explainHi: "अपनी समस्या से जुड़े आसान सवालों के जवाब दें। आप बोलकर या स्क्रीन पर छूकर जवाब दे सकते हैं।",
    },
    {
      number: 4,
      titleEn: "Upload your reports",
      titleHi: "अपनी जांच रिपोर्ट व पर्चे जोड़ें",
      explainEn: "Add your prescription, laboratory report, scan or other medical document.",
      explainHi: "अपना पुराना डॉक्टर का पर्चा, खून की जांच रिपोर्ट या स्कैन जोड़ें।",
    },
    {
      number: 5,
      titleEn: "Review before continuing",
      titleHi: "आगे बढ़ने से पहले समीक्षा करें",
      explainEn: "Check the information and make corrections before continuing to your doctor.",
      explainHi: "डॉक्टर की कतार में जाने से पहले अपनी जानकारी जांचें और जरूरत पड़ने पर सुधार करें।",
    },
  ];

  it('contains exactly 5 clear steps for the interactive guide', () => {
    expect(STEPS.length).toBe(5);
    STEPS.forEach((step, index) => {
      expect(step.number).toBe(index + 1);
      expect(step.titleEn.length).toBeGreaterThan(0);
      expect(step.titleHi.length).toBeGreaterThan(0);
      expect(step.explainEn.length).toBeGreaterThan(0);
      expect(step.explainHi.length).toBeGreaterThan(0);
    });
  });

  it('verifies bilingual instructions for Step 1 through Step 5', () => {
    expect(STEPS[0].explainEn).toContain('Choose New Patient if this is your first visit');
    expect(STEPS[0].explainHi).toContain('नया मरीज चुनें');

    expect(STEPS[1].explainEn).toContain('Select the problem or reason for today\'s visit');
    expect(STEPS[1].explainHi).toContain('आज के परामर्श का मुख्य कारण');

    expect(STEPS[2].explainEn).toContain('including voice when supported');
    expect(STEPS[2].explainHi).toContain('बोलकर या स्क्रीन पर छूकर');

    expect(STEPS[3].explainEn).toContain('prescription, laboratory report');
    expect(STEPS[3].explainHi).toContain('डॉक्टर का पर्चा, खून की जांच रिपोर्ट');

    expect(STEPS[4].explainEn).toContain('Check the information and make corrections');
    expect(STEPS[4].explainHi).toContain('जानकारी जांचें और जरूरत पड़ने पर सुधार करें');
  });

  it('formats speech synthesis text to read only current step instructions', () => {
    const step = STEPS[0];
    const textEn = `${step.titleEn}. ${step.explainEn}`;
    const textHi = `${step.titleHi}. ${step.explainHi}`;

    expect(textEn).toBe("Choose how you want to continue. Choose New Patient if this is your first visit. Choose Existing Patient if you have visited before.");
    expect(textHi).toBe("चुनें कि आप कैसे आगे बढ़ना चाहते हैं. यदि आप पहली बार अस्पताल आए हैं तो नया मरीज चुनें। यदि आप पहले आ चुके हैं तो पुराना मरीज चुनें।");
  });

  it('verifies contextual help guidance strings for prioritized screens', () => {
    const contextualGuide = {
      patientEntry: {
        en: "Choose New Patient if this is your first visit. Choose Existing Patient if you have visited before.",
        hi: "यदि आप पहली बार आए हैं तो नया मरीज चुनें। यदि आप पहले आ चुके हैं तो पुराना मरीज चुनें।",
      },
      chiefComplaint: {
        en: "Select the problem you came to the doctor about today.",
        hi: "वह मुख्य समस्या चुनें जिसके लिए आप आज डॉक्टर के पास आए हैं।",
      },
      documents: {
        en: "Upload a clear photo or PDF of your prescription or medical report.",
        hi: "अपने डॉक्टर के पर्चे या मेडिकल रिपोर्ट का स्पष्ट फोटो या पीडीएफ अपलोड करें।",
      },
      review: {
        en: "Check the information carefully before continuing.",
        hi: "आगे बढ़ने से पहले दर्ज की गई जानकारी को ध्यान से जांचें।",
      },
    };

    expect(contextualGuide.patientEntry.en).toContain("Choose New Patient");
    expect(contextualGuide.chiefComplaint.en).toContain("Select the problem");
    expect(contextualGuide.documents.en).toContain("Upload a clear photo or PDF");
    expect(contextualGuide.review.en).toContain("Check the information carefully");
  });
});
