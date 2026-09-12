const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? "http://127.0.0.1:8000"
  : "https://sehat-saathi-bce6.onrender.com";

export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

/* =========================================================
   HEALTH
========================================================= */

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
}

export async function getHealth(): Promise<HealthResponse> {
  const r = await fetch(`${BASE_URL}/api/health`);

  if (!r.ok) {
    throw new Error(`Health check failed: ${r.status}`);
  }

  return r.json() as Promise<HealthResponse>;
}

/* =========================================================
   DOCUMENT OCR
========================================================= */

export interface OCRDocumentResponse {
  name: string;
  type: string;
  processedAt: string;
  extractionStatus: string;
  text: string;

  pages: Array<{
    page: number;
    text: string;
    confidence: string;
  }>;

  entities: Array<{
    type: string;
    value: string;
    confidence: "high" | "medium" | "low";
    sourceText: string;
    page?: number;
  }>;

  structuredData?: any;
  attentionItems?: any[];

  sourceDocument?: {
    originalName: string;
    storedName: string;
    url: string;
  } | null;
}

// Fix 3: 90-second abort timeout so the UI never freezes forever.
// On large real-world images the Render free-tier backend can take
// 30–60 s; 90 s gives a generous margin while still surfacing a clear
// error (AbortError) instead of an infinite spinner.
const OCR_TIMEOUT_MS = 90_000;

export async function ocrDocument(
  file: File,
): Promise<OCRDocumentResponse> {
  const fd = new FormData();

  fd.append("file", file);

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    OCR_TIMEOUT_MS,
  );

  try {
    const r = await fetch(
      `${BASE_URL}/api/documents/ocr`,
      {
        method: "POST",
        body: fd,
        signal: controller.signal,
      },
    );

    if (!r.ok) {
      let message = "Document processing failed";

      try {
        const data = await r.json();
        message = data.detail || message;
      } catch {
        // Keep default message.
      }

      throw new Error(message);
    }

    return (await r.json()) as OCRDocumentResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}

/* =========================================================
   AI SUMMARY
========================================================= */

export async function generateSummary(
  payload: unknown,
): Promise<{
  summary: string;
  provider: string;
}> {
  const r = await fetch(
    `${BASE_URL}/api/ai/summary`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!r.ok) {
    throw new Error("Summary generation failed");
  }

  return (await r.json()) as {
    summary: string;
    provider: string;
  };
}

/* =========================================================
   AUTHENTICATION
========================================================= */

export interface CurrentUser {
  id: string;
  name?: string;
  email: string;
  role: string;
  doctor_status?: string | null;
  registration_id?: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = localStorage.getItem("sehatSaathi_auth_token");

  if (!token) {
    return null;
  }

  const r = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!r.ok) {
    if (r.status === 401 || r.status === 403) {
      localStorage.removeItem("sehatSaathi_auth_token");
      return null;
    }

    throw new Error(`Failed to get current user: ${r.status}`);
  }

  return (await r.json()) as CurrentUser;
}

/* ---------------------------------------------------------
   DOCTOR LOGIN
--------------------------------------------------------- */
export async function doctorLogin(
  {
    email,
    password,
  }: {
    email: string
    password: string
  }
): Promise<any> {
  const r = await fetch(
    `${BASE_URL}/api/auth/doctor/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    },
  );

  if (!r.ok) {
    let message = "Doctor login failed";

    try {
      const data = await r.json();
      message = data.detail || message;
    } catch {
      // Keep default error.
    }

    throw new Error(message);
  }

  const data = await r.json()

  if (data.token) {
    localStorage.setItem(
      "sehatSaathi_auth_token",
      data.token,
    );
  }

  return data;
}