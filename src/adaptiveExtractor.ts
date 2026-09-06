export interface ExtractedClinicalInfo {
  originalText: string;
  duration?: string;
  severity?: string;
  concepts: string[];
}

export function extractAdaptiveInfo(
  text: string,
  concepts: string[],
): ExtractedClinicalInfo {
  const normalized = text.toLowerCase();

  let duration: string | undefined;

  const durationPatterns = [
    /(\d+)\s*(day|days|din|dino|दिन)/i,
    /(\d+)\s*(week|weeks|hafta|hafte|हफ्ते|सप्ताह)/i,
    /(\d+)\s*(month|months|mahina|mahine|महीने)/i,
    /(\d+)\s*(hour|hours|ghanta|ghante|घंटे)/i,
  ];

  for (const pattern of durationPatterns) {
    const match = normalized.match(pattern);

    if (match) {
      duration = match[0];
      break;
    }
  }

  let severity: string | undefined;

  if (
    normalized.includes("severe") ||
    normalized.includes("very bad") ||
    normalized.includes("bahut tez") ||
    normalized.includes("बहुत तेज")
  ) {
    severity = "severe";
  } else if (
    normalized.includes("moderate") ||
    normalized.includes("medium")
  ) {
    severity = "moderate";
  } else if (
    normalized.includes("mild") ||
    normalized.includes("slight")
  ) {
    severity = "mild";
  }

  return {
    originalText: text,
    duration,
    severity,
    concepts,
  };
}