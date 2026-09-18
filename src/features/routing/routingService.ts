import type { ComplaintId } from "../patient/services/complaintClassifier";
import { HOSPITAL_ROUTING_RULES } from "./routingRules";
import type {
  RoutingContext,
  SuggestedRouting,
} from "./routingTypes";

/**
 * Evaluates operational hospital department routing for a patient's case.
 *
 * Operational routing designations only:
 * - Does NOT make a medical diagnosis.
 * - Does NOT predict disease or clinical probability.
 * - Does NOT recommend medical treatment.
 * - Does NOT automatically assign a physician.
 *
 * Enforces strict safety precedence:
 * - If urgent safety flags exist, normal department routing is blocked,
 *   and an emergency escalation recommendation is returned.
 */
export function determineSuggestedRouting(
  context?: RoutingContext | null
): SuggestedRouting {
  const determinedAt = new Date().toISOString();

  // Safety Precedence Check:
  // Urgent safety flags must NEVER be sent to standard OPD departments.
  const hasUrgentSafety = Boolean(
    context?.safetyFlags &&
      context.safetyFlags.some((f) => f && f.severity === "urgent")
  );

  if (hasUrgentSafety) {
    return {
      suggestedDepartment: "Emergency Department",
      routingStatus: "emergency_escalated",
      rationale:
        "Urgent red-flag safety symptom detected; prioritized for immediate emergency clinical assessment.",
      determinedAt,
    };
  }

  const cid = context?.complaintId;

  // Custom / Unknown / Null / Low-Confidence Fallback
  if (!cid || cid === "custom" || !(cid in HOSPITAL_ROUTING_RULES)) {
    return {
      suggestedDepartment: "General OPD / Triage Desk",
      routingStatus: "general_triage",
      rationale:
        "General or multi-system concern recorded in patient's words; routed to General OPD for triage assessment.",
      determinedAt,
    };
  }

  // Known structured complaint category
  const rule = HOSPITAL_ROUTING_RULES[cid as Exclude<ComplaintId, "custom">];

  return {
    suggestedDepartment: rule.department,
    routingStatus: "suggested",
    rationale: `Patient-reported complaint category: ${rule.categoryLabel}`,
    determinedAt,
  };
}
