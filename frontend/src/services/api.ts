const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? 'http://127.0.0.1:8000'
  : 'https://sehat-saathi-bce6.onrender.com';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
export interface HealthResponse {status:string;service:string;version:string;environment:string;}
export async function getHealth():Promise<HealthResponse>{const r=await fetch(`${BASE_URL}/api/health`);if(!r.ok)throw new Error(`Health check failed: ${r.status}`);return r.json();}
export async function ocrDocument(file:File){const fd=new FormData();fd.append('file',file);const r=await fetch(`${BASE_URL}/api/documents/ocr`,{method:'POST',body:fd});if(!r.ok){let m='Document processing failed';try{const d=await r.json();m=d.detail||m;}catch{}throw new Error(m);}return r.json() as Promise<{name:string;type:string;processedAt:string;extractionStatus:string;text:string;pages:Array<{page:number;text:string;confidence:string}>;entities:Array<{type:string;value:string;confidence:'high'|'medium'|'low';sourceText:string;page?:number}>}>;}
export async function generateSummary(payload:unknown){const r=await fetch(`${BASE_URL}/api/ai/summary`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok)throw new Error('Summary generation failed');return r.json() as Promise<{summary:string;provider:string}>;}
