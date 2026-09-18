import type { ComplaintId } from "../patient/services/complaintClassifier";
import type { HospitalDepartment } from "./routingTypes";

export interface DepartmentRule {
  department: HospitalDepartment;
  categoryLabel: string;
}

/**
 * Deterministic hospital routing rules mapping structured complaint categories
 * to hospital departments.
 *
 * Operational routing designations only — not clinical diagnoses.
 */
export const HOSPITAL_ROUTING_RULES: Record<
  Exclude<ComplaintId, "custom">,
  DepartmentRule
> = {
  abdominal_pain: {
    department: "General Medicine",
    categoryLabel: "Abdominal Pain",
  },
  fever: {
    department: "General Medicine",
    categoryLabel: "Fever",
  },
  cough: {
    department: "Pulmonary Medicine",
    categoryLabel: "Cough / Respiratory Concern",
  },
  eye_problems: {
    department: "Ophthalmology",
    categoryLabel: "Eye Problems",
  },
  headache: {
    department: "General Medicine",
    categoryLabel: "Headache",
  },
  back_pain: {
    department: "Orthopedics",
    categoryLabel: "Back Pain",
  },
  skin_problems: {
    department: "Dermatology",
    categoryLabel: "Skin Problems",
  },
  joint_pain: {
    department: "Orthopedics",
    categoryLabel: "Joint Pain",
  },
  urinary_problems: {
    department: "Urology",
    categoryLabel: "Urinary Problems",
  },
};

/**
 * Standard selectable hospital departments for staff assignment / reassignment.
 * Emergency Department is excluded from routine outpatient staff reassignment.
 */
export const AVAILABLE_HOSPITAL_DEPARTMENTS: HospitalDepartment[] = [
  "General Medicine",
  "Pulmonary Medicine",
  "Gastroenterology",
  "Orthopedics",
  "Dermatology",
  "Ophthalmology",
  "Urology",
  "General OPD / Triage Desk",
];

export const REASSIGNABLE_HOSPITAL_DEPARTMENTS: HospitalDepartment[] = AVAILABLE_HOSPITAL_DEPARTMENTS;

