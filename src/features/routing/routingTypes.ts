import type { ComplaintId } from "../patient/services/complaintClassifier";
import type { SafetyFlag } from "../patient/state/PatientSessionContext";

/**
 * Minimum configured hospital departments for the Sehat Saathi prototype.
 * Operational routing designations only — not clinical diagnoses.
 */
export type HospitalDepartment =
  | "General Medicine"
  | "Pulmonary Medicine"
  | "Gastroenterology"
  | "Orthopedics"
  | "Dermatology"
  | "Ophthalmology"
  | "Urology"
  | "General OPD / Triage Desk"
  | "Emergency Department";

/**
 * Operational routing status.
 * - 'suggested': Standard operational match from structured complaint category.
 * - 'general_triage': Uncategorized or custom complaint routed to General OPD for triage.
 * - 'emergency_escalated': Urgent safety flag detected; prevented from normal department routing.
 * - 'staff_reassigned': Department explicitly modified or assigned by authorized clinical staff.
 */
export type RoutingStatus =
  | "suggested"
  | "general_triage"
  | "emergency_escalated"
  | "staff_reassigned";

/**
 * Operational routing recommendation.
 * Strictly non-diagnostic: provides suggested department and basis without disease or doctor claims.
 */
export interface SuggestedRouting {
  suggestedDepartment: HospitalDepartment;
  routingStatus: RoutingStatus;
  rationale: string;
  determinedAt: string;
}

/**
 * Context required by routing service to compute department suggestion.
 */
export interface RoutingContext {
  complaintId?: ComplaintId | string | null;
  displayName?: string | null;
  originalInput?: string | null;
  safetyFlags?: SafetyFlag[] | null;
}
