from __future__ import annotations

import re
from typing import Any


# ---------------------------------------------------------------------------
# Clinician-reviewed fallback references.
#
# IMPORTANT:
# - Prefer the reference range printed on the patient's report.
# - These fallback values are only used when the report does not provide
#   a reference range.
# - "attention" means "needs clinician review", NOT a diagnosis.
# ---------------------------------------------------------------------------

REFERENCE_RULES: dict[str, dict[str, Any]] = {

    # ----------------------------------------------------------------
    # Vitals
    # ----------------------------------------------------------------

    "blood_pressure": {
        "unit": "mmHg",
        "reference_display": "<120/<80 mmHg",
        "source": "AHA adult BP categories",
        "kind": "blood_pressure",
    },

    "pulse_rate": {
        "unit": "bpm",
        "low": 60,
        "high": 100,
        "reference_display": "60–100 bpm",
        "source": "Standard adult resting heart rate",
        "kind": "numeric",
    },

    "temperature_f": {
        "unit": "°F",
        "low": 97.0,
        "high": 99.5,
        "reference_display": "97.0–99.5 °F",
        "source": "Normal adult body temperature",
        "kind": "numeric",
    },

    "respiratory_rate": {
        "unit": "breaths/min",
        "low": 12,
        "high": 20,
        "reference_display": "12–20 breaths/min",
        "source": "Normal adult respiratory rate",
        "kind": "numeric",
    },

    "spo2": {
        "unit": "%",
        "low": 95,
        "high": 100,
        "reference_display": "95–100%",
        "source": "Normal adult SpO2 (pulse oximetry)",
        "kind": "numeric",
    },

    "bmi": {
        "unit": "kg/m²",
        "low": 18.5,
        "high": 24.9,
        "reference_display": "18.5–24.9 kg/m²",
        "source": "WHO BMI classification (adult)",
        "kind": "numeric",
    },

    # ----------------------------------------------------------------
    # Haematology
    # ----------------------------------------------------------------

    "hemoglobin_male": {
        "unit": "g/dL",
        "low": 13.0,
        "high": 17.0,
        "reference_display": "13.0–17.0 g/dL",
        "source": "WHO / standard adult male reference",
        "kind": "numeric",
    },

    "hemoglobin_female": {
        "unit": "g/dL",
        "low": 12.0,
        "high": 15.5,
        "reference_display": "12.0–15.5 g/dL",
        "source": "WHO / standard adult female reference",
        "kind": "numeric",
    },

    "platelets": {
        "unit": "×10³/µL",
        "low": 150,
        "high": 450,
        "reference_display": "150–450 ×10³/µL",
        "source": "Standard adult platelet reference",
        "kind": "numeric",
    },

    "wbc": {
        "unit": "×10³/µL",
        "low": 4.0,
        "high": 11.0,
        "reference_display": "4.0–11.0 ×10³/µL",
        "source": "Standard adult WBC reference",
        "kind": "numeric",
    },

    "hba1c": {
        "unit": "%",
        "low": 0.0,
        "high": 5.6,
        "reference_display": "<5.7% (non-diabetic)",
        "source": "ADA HbA1c classification",
        "kind": "numeric",
    },

    # ----------------------------------------------------------------
    # Biochemistry — glucose / diabetes
    # ----------------------------------------------------------------

    "glucose_fasting": {
        "unit": "mg/dL",
        "low": 70,
        "high": 99,
        "reference_display": "70–99 mg/dL",
        "source": "ADA fasting plasma glucose (non-diabetic)",
        "kind": "numeric",
    },

    "glucose_random": {
        "unit": "mg/dL",
        "low": 70,
        "high": 140,
        "reference_display": "70–140 mg/dL",
        "source": "Standard adult random blood glucose",
        "kind": "numeric",
    },

    # ----------------------------------------------------------------
    # Renal function
    # ----------------------------------------------------------------

    "creatinine": {
        "unit": "mg/dL",
        "low": 0.6,
        "high": 1.3,
        "reference_display": "0.6–1.3 mg/dL",
        "source": "Standard adult serum creatinine",
        "kind": "numeric",
    },

    "urea": {
        "unit": "mg/dL",
        "low": 7,
        "high": 20,
        "reference_display": "7–20 mg/dL (BUN)",
        "source": "Standard adult blood urea nitrogen",
        "kind": "numeric",
    },

    "uric_acid_male": {
        "unit": "mg/dL",
        "low": 3.5,
        "high": 7.2,
        "reference_display": "3.5–7.2 mg/dL",
        "source": "Standard adult male serum uric acid",
        "kind": "numeric",
    },

    "uric_acid_female": {
        "unit": "mg/dL",
        "low": 2.6,
        "high": 6.0,
        "reference_display": "2.6–6.0 mg/dL",
        "source": "Standard adult female serum uric acid",
        "kind": "numeric",
    },

    # ----------------------------------------------------------------
    # Electrolytes
    # ----------------------------------------------------------------

    "sodium": {
        "unit": "mEq/L",
        "low": 136,
        "high": 145,
        "reference_display": "136–145 mEq/L",
        "source": "Standard adult serum sodium",
        "kind": "numeric",
    },

    "potassium": {
        "unit": "mEq/L",
        "low": 3.5,
        "high": 5.0,
        "reference_display": "3.5–5.0 mEq/L",
        "source": "Standard adult serum potassium",
        "kind": "numeric",
    },

    # ----------------------------------------------------------------
    # Liver function
    # ----------------------------------------------------------------

    "alt": {
        "unit": "U/L",
        "low": 0,
        "high": 40,
        "reference_display": "7–40 U/L",
        "source": "Standard adult ALT (SGPT)",
        "kind": "numeric",
    },

    "ast": {
        "unit": "U/L",
        "low": 0,
        "high": 40,
        "reference_display": "10–40 U/L",
        "source": "Standard adult AST (SGOT)",
        "kind": "numeric",
    },

    "bilirubin_total": {
        "unit": "mg/dL",
        "low": 0.1,
        "high": 1.2,
        "reference_display": "0.1–1.2 mg/dL",
        "source": "Standard adult total bilirubin",
        "kind": "numeric",
    },

    "albumin": {
        "unit": "g/dL",
        "low": 3.4,
        "high": 5.4,
        "reference_display": "3.4–5.4 g/dL",
        "source": "Standard adult serum albumin",
        "kind": "numeric",
    },

    # ----------------------------------------------------------------
    # Lipids
    # ----------------------------------------------------------------

    "cholesterol_total": {
        "unit": "mg/dL",
        "low": 0,
        "high": 200,
        "reference_display": "<200 mg/dL",
        "source": "NCEP ATP III desirable total cholesterol",
        "kind": "numeric",
    },

    "triglycerides": {
        "unit": "mg/dL",
        "low": 0,
        "high": 150,
        "reference_display": "<150 mg/dL",
        "source": "NCEP ATP III normal triglycerides",
        "kind": "numeric",
    },

    "hdl_male": {
        "unit": "mg/dL",
        "low": 40,
        "high": 999,
        "reference_display": ">40 mg/dL",
        "source": "NCEP ATP III HDL (male)",
        "kind": "numeric",
    },

    "hdl_female": {
        "unit": "mg/dL",
        "low": 50,
        "high": 999,
        "reference_display": ">50 mg/dL",
        "source": "NCEP ATP III HDL (female)",
        "kind": "numeric",
    },

    "ldl": {
        "unit": "mg/dL",
        "low": 0,
        "high": 100,
        "reference_display": "<100 mg/dL (optimal)",
        "source": "NCEP ATP III optimal LDL",
        "kind": "numeric",
    },

    # ----------------------------------------------------------------
    # Inflammation / Enzymes
    # ----------------------------------------------------------------

    "crp": {
        "unit": "mg/L",
        "low": 0,
        "high": 10,
        "reference_display": "<10 mg/L",
        "source": "Standard CRP (high-sensitivity normal <1 mg/L)",
        "kind": "numeric",
    },

    "amylase": {
        "unit": "U/L",
        "low": 28,
        "high": 100,
        "reference_display": "28–100 U/L",
        "source": "Standard adult serum amylase",
        "kind": "numeric",
    },

    "lipase": {
        "unit": "U/L",
        "low": 13,
        "high": 60,
        "reference_display": "13–60 U/L",
        "source": "Standard adult serum lipase",
        "kind": "numeric",
    },

    # ----------------------------------------------------------------
    # Thyroid
    # ----------------------------------------------------------------

    "tsh": {
        "unit": "mIU/L",
        "low": 0.5,
        "high": 4.5,
        "reference_display": "0.5–4.5 mIU/L",
        "source": "Standard adult TSH reference",
        "kind": "numeric",
    },
}


def _normalise_name(name: str) -> str:
    value = name.lower().strip()

    value = re.sub(r"[^a-z0-9]+", " ", value)
    value = re.sub(r"\s+", " ", value)

    return value.strip()


def identify_test_key(
    name: str,
    gender: str | None = None,
) -> str | None:
    normalized = _normalise_name(name)
    g_female = bool(gender and gender.lower().startswith("f"))

    # ---- Vitals ----

    if normalized in {"blood pressure", "bp", "bloodpressure"}:
        return "blood_pressure"

    if normalized in {"pulse rate", "pulse", "heart rate", "hr", "pulse bpm"}:
        return "pulse_rate"

    if normalized in {
        "temperature", "temp", "body temperature", "temperature f",
    }:
        return "temperature_f"

    if normalized in {
        "respiratory rate", "respiratory", "resp rate",
        "respiration rate", "rr",
    }:
        return "respiratory_rate"

    if normalized in {"spo2", "spo 2", "oxygen saturation", "o2 sat", "spо2"}:
        return "spo2"

    if normalized in {"bmi", "body mass index"}:
        return "bmi"

    # ---- Haematology ----

    if normalized in {"hemoglobin", "hemoglobin hb", "hb", "haemoglobin", "haemoglobin hb"}:
        return "hemoglobin_female" if g_female else "hemoglobin_male"

    if normalized in {"platelets", "platelet count", "platelet", "plt"}:
        return "platelets"

    if normalized in {
        "wbc", "total wbc", "total wbc count",
        "white blood cell count", "leucocyte count", "tlc",
    }:
        return "wbc"

    if normalized in {"hba1c", "hb a1c", "glycated haemoglobin", "glycated hemoglobin"}:
        return "hba1c"

    # ---- Glucose ----

    if normalized in {
        "fasting glucose", "fasting blood sugar", "blood sugar fasting",
        "glucose fasting", "fbs", "fasting plasma glucose",
    }:
        return "glucose_fasting"

    if normalized in {
        "random glucose", "random blood sugar", "blood sugar random",
        "glucose random", "rbs", "rbs glucose",
    }:
        return "glucose_random"

    # ---- Renal ----

    if normalized in {"creatinine", "serum creatinine", "s creatinine"}:
        return "creatinine"

    if normalized in {"urea", "blood urea", "blood urea nitrogen", "bun", "serum urea"}:
        return "urea"

    if normalized in {"uric acid", "serum uric acid", "s uric acid"}:
        return "uric_acid_female" if g_female else "uric_acid_male"

    # ---- Electrolytes ----

    if normalized in {"sodium", "serum sodium", "s sodium", "na"}:
        return "sodium"

    if normalized in {"potassium", "serum potassium", "s potassium", "k"}:
        return "potassium"

    # ---- Liver function ----

    if normalized in {
        "alt", "sgpt", "lft alt", "lft sgpt",
        "alanine aminotransferase", "alanine transaminase",
    }:
        return "alt"

    if normalized in {
        "ast", "sgot", "lft ast", "lft sgot",
        "aspartate aminotransferase", "aspartate transaminase",
    }:
        return "ast"

    if normalized in {
        "bilirubin", "total bilirubin", "bilirubin total",
        "s bilirubin", "serum bilirubin",
    }:
        return "bilirubin_total"

    if normalized in {"albumin", "serum albumin", "s albumin"}:
        return "albumin"

    # ---- Lipids ----

    if normalized in {
        "total cholesterol", "cholesterol", "cholesterol total",
        "serum cholesterol",
    }:
        return "cholesterol_total"

    if normalized in {"triglycerides", "triglyceride", "tg", "serum triglycerides"}:
        return "triglycerides"

    if normalized in {"hdl", "hdl cholesterol", "hdl c", "high density lipoprotein"}:
        return "hdl_female" if g_female else "hdl_male"

    if normalized in {"ldl", "ldl cholesterol", "ldl c", "low density lipoprotein"}:
        return "ldl"

    # ---- Inflammation / Enzymes ----

    if normalized in {"crp", "c reactive protein", "c reactive protein crp"}:
        return "crp"

    if normalized in {"serum amylase", "amylase", "s amylase"}:
        return "amylase"

    if normalized in {"serum lipase", "lipase", "s lipase"}:
        return "lipase"

    # ---- Thyroid ----

    if normalized in {"tsh", "thyroid stimulating hormone", "thyroid stimulating"}:
        return "tsh"

    return None



def parse_numeric_value(
    value: str,
) -> float | None:
    match = re.search(
        r"-?\d+(?:\.\d+)?",
        value.replace(",", ""),
    )

    if not match:
        return None

    try:
        return float(match.group(0))
    except ValueError:
        return None


def parse_bp(
    value: str,
) -> tuple[int, int] | None:
    match = re.search(
        r"\b(\d{2,3})\s*/\s*(\d{2,3})\b",
        value,
    )

    if not match:
        return None

    return int(match.group(1)), int(match.group(2))


def compare_result(
    test_name: str,
    patient_value: str,
    report_reference: str | None = None,
    gender: str | None = None,
) -> dict[str, Any]:
    """
    Compare the patient's result with:
    1. the range printed on the report, if available
    2. otherwise a configured fallback reference
    """

    report_reference = (
        report_reference.strip()
        if report_reference
        else None
    )

    # ------------------------------------------------------------
    # Blood pressure
    # ------------------------------------------------------------
    test_key = identify_test_key(
        test_name,
        gender,
    )

    if test_key == "blood_pressure":
        bp = parse_bp(patient_value)

        if not bp:
            return {
                "status": "needs_review",
                "attention": True,
                "comparison": "Could not reliably parse blood pressure",
                "reference_range": (
                    report_reference
                    or REFERENCE_RULES["blood_pressure"][
                        "reference_display"
                    ]
                ),
                "reference_source": (
                    "document"
                    if report_reference
                    else REFERENCE_RULES["blood_pressure"]["source"]
                ),
            }

        systolic, diastolic = bp

        if report_reference:
            # If a report-specific BP range exists, preserve it.
            # We don't attempt to reinterpret arbitrary report text.
            return {
                "status": "review_against_report_range",
                "attention": False,
                "comparison": (
                    "Reference range supplied by the laboratory/report"
                ),
                "reference_range": report_reference,
                "reference_source": "document",
            }

        if systolic < 120 and diastolic < 80:
            status = "within_reference"
            attention = False
            comparison = "Within normal adult BP category"

        elif systolic < 130 and diastolic < 80:
            status = "elevated"
            attention = True
            comparison = "Above normal adult BP category"

        elif systolic < 140 or diastolic < 90:
            status = "stage_1_range"
            attention = True
            comparison = "In stage 1 high BP range"

        elif systolic <= 180 and diastolic <= 120:
            status = "stage_2_range"
            attention = True
            comparison = "In stage 2 high BP range"

        else:
            status = "severe_range"
            attention = True
            comparison = (
                "Very high blood pressure reading; prompt clinical attention"
            )

        return {
            "status": status,
            "attention": attention,
            "comparison": comparison,
            "reference_range": (
                REFERENCE_RULES["blood_pressure"][
                    "reference_display"
                ]
            ),
            "reference_source": REFERENCE_RULES[
                "blood_pressure"
            ]["source"],
        }

    # ------------------------------------------------------------
    # No known fallback reference
    # ------------------------------------------------------------
    if not test_key:
        if report_reference:
            return {
                "status": "review_against_report_range",
                "attention": False,
                "comparison": (
                    "Use the reference range printed on the report"
                ),
                "reference_range": report_reference,
                "reference_source": "document",
            }

        return {
            "status": "not_assessed",
            "attention": False,
            "comparison": (
                "No validated reference range configured; "
                "review original report"
            ),
            "reference_range": None,
            "reference_source": None,
        }

    rule = REFERENCE_RULES[test_key]

    # ------------------------------------------------------------
    # Prefer report-provided range
    # ------------------------------------------------------------
    if report_reference:
        return {
            "status": "review_against_report_range",
            "attention": False,
            "comparison": (
                "Reference range supplied by the laboratory/report"
            ),
            "reference_range": report_reference,
            "reference_source": "document",
        }

    numeric = parse_numeric_value(patient_value)

    if numeric is None:
        return {
            "status": "needs_review",
            "attention": True,
            "comparison": (
                "Could not reliably parse the reported value"
            ),
            "reference_range": rule["reference_display"],
            "reference_source": "configured_reference",
        }

    low = float(rule["low"])
    high = float(rule["high"])

    if low <= numeric <= high:
        status = "within_reference"
        attention = False
        comparison = "Within configured reference range"

    elif numeric < low:
        status = "below_reference"
        attention = True
        comparison = "Below configured reference range"

    else:
        status = "above_reference"
        attention = True
        comparison = "Above configured reference range"

    return {
        "status": status,
        "attention": attention,
        "comparison": comparison,
        "reference_range": rule["reference_display"],
        "reference_source": "configured_reference",
    }