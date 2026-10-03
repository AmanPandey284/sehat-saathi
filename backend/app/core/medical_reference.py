from __future__ import annotations

import re
from typing import Any


# ---------------------------------------------------------------------------
# Clinician-reviewed fallback references.
#
# IMPORTANT:
# - Prefer the reference range printed on the patient's report.
# - Fallback references are only used when report range is unavailable.
# - "attention" means "requires clinical review", NOT autonomous diagnosis.
# ---------------------------------------------------------------------------

REFERENCE_RULES: dict[str, dict[str, Any]] = {
    # Vitals
    "blood_pressure": {
        "unit": "mmHg",
        "reference_display": "<120/<80 mmHg",
        "source": "AHA adult BP categories",
        "kind": "blood_pressure",
    },
    "pulse_rate": {
        "unit": "bpm",
        "low": 60.0,
        "high": 100.0,
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
        "low": 12.0,
        "high": 20.0,
        "reference_display": "12–20 breaths/min",
        "source": "Normal adult respiratory rate",
        "kind": "numeric",
    },
    "spo2": {
        "unit": "%",
        "low": 95.0,
        "high": 100.0,
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

    # Haematology
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
        "low": 150.0,
        "high": 450.0,
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

    # Biochemistry — glucose / diabetes
    "glucose_fasting": {
        "unit": "mg/dL",
        "low": 70.0,
        "high": 99.0,
        "reference_display": "70–99 mg/dL",
        "source": "ADA fasting plasma glucose (non-diabetic)",
        "kind": "numeric",
    },
    "glucose_random": {
        "unit": "mg/dL",
        "low": 70.0,
        "high": 140.0,
        "reference_display": "70–140 mg/dL",
        "source": "Standard adult random blood glucose",
        "kind": "numeric",
    },

    # Renal function
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
        "low": 7.0,
        "high": 20.0,
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

    # Electrolytes
    "sodium": {
        "unit": "mEq/L",
        "low": 136.0,
        "high": 145.0,
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

    # Liver function
    "alt": {
        "unit": "U/L",
        "low": 0.0,
        "high": 40.0,
        "reference_display": "7–40 U/L",
        "source": "Standard adult ALT (SGPT)",
        "kind": "numeric",
    },
    "ast": {
        "unit": "U/L",
        "low": 0.0,
        "high": 40.0,
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

    # Lipids
    "cholesterol_total": {
        "unit": "mg/dL",
        "low": 0.0,
        "high": 200.0,
        "reference_display": "<200 mg/dL",
        "source": "NCEP ATP III desirable total cholesterol",
        "kind": "numeric",
    },
    "triglycerides": {
        "unit": "mg/dL",
        "low": 0.0,
        "high": 150.0,
        "reference_display": "<150 mg/dL",
        "source": "NCEP ATP III normal triglycerides",
        "kind": "numeric",
    },
    "hdl_male": {
        "unit": "mg/dL",
        "low": 40.0,
        "high": 999.0,
        "reference_display": ">40 mg/dL",
        "source": "NCEP ATP III HDL (male)",
        "kind": "numeric",
    },
    "hdl_female": {
        "unit": "mg/dL",
        "low": 50.0,
        "high": 999.0,
        "reference_display": ">50 mg/dL",
        "source": "NCEP ATP III HDL (female)",
        "kind": "numeric",
    },
    "ldl": {
        "unit": "mg/dL",
        "low": 0.0,
        "high": 100.0,
        "reference_display": "<100 mg/dL (optimal)",
        "source": "NCEP ATP III optimal LDL",
        "kind": "numeric",
    },

    # Inflammation / Enzymes
    "crp": {
        "unit": "mg/L",
        "low": 0.0,
        "high": 10.0,
        "reference_display": "<10 mg/L",
        "source": "Standard CRP (high-sensitivity normal <1 mg/L)",
        "kind": "numeric",
    },
    "amylase": {
        "unit": "U/L",
        "low": 28.0,
        "high": 100.0,
        "reference_display": "28–100 U/L",
        "source": "Standard adult serum amylase",
        "kind": "numeric",
    },
    "lipase": {
        "unit": "U/L",
        "low": 13.0,
        "high": 60.0,
        "reference_display": "13–60 U/L",
        "source": "Standard adult serum lipase",
        "kind": "numeric",
    },

    # Thyroid
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

    if normalized in {"blood pressure", "bp", "bloodpressure"}:
        return "blood_pressure"
    if normalized in {"pulse rate", "pulse", "heart rate", "hr", "pulse bpm"}:
        return "pulse_rate"
    if normalized in {"temperature", "temp", "body temperature", "temperature f"}:
        return "temperature_f"
    if normalized in {"respiratory rate", "respiratory", "resp rate", "respiration rate", "rr"}:
        return "respiratory_rate"
    if normalized in {"spo2", "spo 2", "oxygen saturation", "o2 sat", "spо2"}:
        return "spo2"
    if normalized in {"bmi", "body mass index"}:
        return "bmi"
    if normalized in {"hemoglobin", "hemoglobin hb", "hb", "haemoglobin", "haemoglobin hb"}:
        return "hemoglobin_female" if g_female else "hemoglobin_male"
    if normalized in {"platelets", "platelet count", "platelet", "plt"}:
        return "platelets"
    if normalized in {"wbc", "total wbc", "total wbc count", "white blood cell count", "leucocyte count", "tlc"}:
        return "wbc"
    if normalized in {"hba1c", "hb a1c", "glycated haemoglobin", "glycated hemoglobin"}:
        return "hba1c"
    if normalized in {"fasting glucose", "fasting blood sugar", "blood sugar fasting", "glucose fasting", "fbs"}:
        return "glucose_fasting"
    if normalized in {"random glucose", "random blood sugar", "blood sugar random", "glucose random", "rbs"}:
        return "glucose_random"
    if normalized in {"creatinine", "serum creatinine", "s creatinine"}:
        return "creatinine"
    if normalized in {"urea", "blood urea", "blood urea nitrogen", "bun", "serum urea"}:
        return "urea"
    if normalized in {"uric acid", "serum uric acid", "s uric acid"}:
        return "uric_acid_female" if g_female else "uric_acid_male"
    if normalized in {"sodium", "serum sodium", "s sodium", "na"}:
        return "sodium"
    if normalized in {"potassium", "serum potassium", "s potassium", "k"}:
        return "potassium"
    if normalized in {"alt", "sgpt", "lft alt", "lft sgpt", "alanine aminotransferase", "alanine transaminase"}:
        return "alt"
    if normalized in {"ast", "sgot", "lft ast", "lft sgot", "aspartate aminotransferase", "aspartate transaminase"}:
        return "ast"
    if normalized in {"bilirubin", "total bilirubin", "bilirubin total", "s bilirubin", "serum bilirubin"}:
        return "bilirubin_total"
    if normalized in {"albumin", "serum albumin", "s albumin"}:
        return "albumin"
    if normalized in {"total cholesterol", "cholesterol", "cholesterol total", "serum cholesterol"}:
        return "cholesterol_total"
    if normalized in {"triglycerides", "triglyceride", "tg", "serum triglycerides"}:
        return "triglycerides"
    if normalized in {"hdl", "hdl cholesterol", "hdl c", "high density lipoprotein"}:
        return "hdl_female" if g_female else "hdl_male"
    if normalized in {"ldl", "ldl cholesterol", "ldl c", "low density lipoprotein"}:
        return "ldl"
    if normalized in {"crp", "c reactive protein", "c reactive protein crp"}:
        return "crp"
    if normalized in {"serum amylase", "amylase", "s amylase"}:
        return "amylase"
    if normalized in {"serum lipase", "lipase", "s lipase"}:
        return "lipase"
    if normalized in {"tsh", "thyroid stimulating hormone"}:
        return "tsh"

    return None


# ---------------------------------------------------------------------------
# Typed Clinical Value Parser
# ---------------------------------------------------------------------------

def parse_typed_clinical_value(value: str) -> dict[str, Any]:
    """
    Parses a clinical reading string into a strictly typed structure:
    - exact_numeric: precise float value
    - inequality: operator (<, <=, >, >=) and numeric threshold
    - range: interval [low, high]
    - qualitative: string finding (positive, negative, etc.)
    - unreadable: contains garbled characters or letters mixed into digits (e.g. B4, 4B)
    - unknown: blank or empty
    """
    if not value or not value.strip():
        return {"kind": "unknown", "raw": value}

    raw = value.strip()
    clean = raw.replace(",", "").strip()

    # Detect unreadable character combinations like 'B4', '4B', '??', mixed letters and numbers in numeric token
    # e.g., token starting or ending with digit and letter directly adjacent without unit space
    tokens = clean.split()
    first_token = tokens[0] if tokens else ""

    # Check for direct letter-digit juxtaposition (e.g. B4, 4B, 5O instead of 50)
    if re.search(r"\b[A-Za-z]+\d+\b|\b\d+[A-Za-z]+\b", first_token):
        # Unless it's a known scientific notation like '10e3'
        if not re.match(r"^\d+(?:\.\d+)?e[+-]?\d+$", first_token, re.IGNORECASE):
            return {
                "kind": "unreadable",
                "raw": raw,
                "unreadable_detail": f"Unreadable character combination: '{first_token}'",
            }

    # Range format: e.g. "15-45", "15 - 45", "15 to 45"
    m_range = re.match(r"^(-?\d+(?:\.\d+)?)\s*[-–—to]\s*(-?\d+(?:\.\d+)?)(.*)$", clean, re.IGNORECASE)
    if m_range:
        try:
            low = float(m_range.group(1))
            high = float(m_range.group(2))
            unit = m_range.group(3).strip() or None
            return {
                "kind": "range",
                "raw": raw,
                "range_low": min(low, high),
                "range_high": max(low, high),
                "unit": unit,
            }
        except ValueError:
            pass

    # Inequality format: e.g. "<60", "<= 60", ">= 10", "> 100", "≤ 5", "≥ 10"
    m_ineq = re.match(r"^([<>]=?|≤|≥)\s*(-?\d+(?:\.\d+)?)(.*)$", clean)
    if m_ineq:
        op = m_ineq.group(1)
        if op == "≤":
            op = "<="
        elif op == "≥":
            op = ">="
        try:
            val = float(m_ineq.group(2))
            unit = m_ineq.group(3).strip() or None
            return {
                "kind": "inequality",
                "raw": raw,
                "operator": op,
                "operand": val,
                "unit": unit,
            }
        except ValueError:
            pass

    # Exact numeric format: e.g. "13.8", "11200 /µL", "-2.5"
    m_exact = re.match(r"^(-?\d+(?:\.\d+)?)(.*)$", clean)
    if m_exact:
        try:
            val = float(m_exact.group(1))
            unit = m_exact.group(2).strip() or None
            return {
                "kind": "exact_numeric",
                "raw": raw,
                "exact_val": val,
                "unit": unit,
            }
        except ValueError:
            pass

    # Qualitative readings: positive, negative, reactive, non-reactive, trace, etc.
    lower_clean = clean.lower()
    if lower_clean in {"positive", "negative", "reactive", "non-reactive", "non reactive", "trace", "normal", "nil", "absent", "present"}:
        return {
            "kind": "qualitative",
            "raw": raw,
            "qualitative_val": lower_clean,
        }

    return {"kind": "unknown", "raw": raw}


def parse_reference_range(report_reference: str | None) -> dict[str, Any] | None:
    if not report_reference or not report_reference.strip():
        return None

    clean = report_reference.replace(",", "").strip()

    # Inequality reference: e.g. "<10 mg/L", "< 10", "<= 5.6"
    m_ineq = re.match(r"^([<>]=?|≤|≥)\s*(-?\d+(?:\.\d+)?)(.*)$", clean)
    if m_ineq:
        op = m_ineq.group(1)
        if op == "≤":
            op = "<="
        elif op == "≥":
            op = ">="
        try:
            val = float(m_ineq.group(2))
            unit = m_ineq.group(3).strip() or None
            return {
                "type": "inequality",
                "operator": op,
                "threshold": val,
                "unit": unit,
                "display": report_reference,
            }
        except ValueError:
            pass

    # Range reference: e.g. "13.0 - 17.0 g/dL", "4.0–11.0 ×10³/µL"
    m_range = re.match(r"^(-?\d+(?:\.\d+)?)\s*[-–—to]\s*(-?\d+(?:\.\d+)?)(.*)$", clean, re.IGNORECASE)
    if m_range:
        try:
            low = float(m_range.group(1))
            high = float(m_range.group(2))
            unit = m_range.group(3).strip() or None
            return {
                "type": "range",
                "low": min(low, high),
                "high": max(low, high),
                "unit": unit,
                "display": report_reference,
            }
        except ValueError:
            pass

    return None


def parse_bp(value: str) -> tuple[int, int] | None:
    match = re.search(r"\b(\d{2,3})\s*/\s*(\d{2,3})\b", value)
    if not match:
        return None
    return int(match.group(1)), int(match.group(2))


# ---------------------------------------------------------------------------
# Unit Normalization & Compatibility Engine
# ---------------------------------------------------------------------------

def normalize_unit_str(u: str | None) -> str:
    if not u:
        return ""
    s = u.lower().strip()
    s = s.replace("³", "3").replace("²", "2")
    s = s.replace(" ", "").replace("^", "").replace("*", "")
    s = s.replace("×", "x")
    s = s.replace("x103", "103")
    s = s.replace("µl", "ul").replace("micro", "u")
    return s


def adapt_cell_count_units(
    val: float,
    patient_raw_unit: str | None,
    target_unit: str,
) -> tuple[float, str | None]:
    """
    Explicitly converts /µL to ×10³/µL (1 ×10³/µL = 1000 /µL) or vice-versa,
    preserving conversion provenance without mutating raw text.
    """
    raw_u = normalize_unit_str(patient_raw_unit)
    tgt_u = normalize_unit_str(target_unit)

    # Patient has /µL or /cumm or /mm3 or raw value > 1000 without unit, and target is ×10³/µL
    if tgt_u in ("103/ul", "103/l", "k/ul", "thou/ul"):
        if raw_u in ("/ul", "/cumm", "/mm3", "cells/ul", "cells/cumm", "cumm") or (not raw_u and val >= 1000):
            converted = val / 1000.0
            note = f"Converted {val:g} /µL to {converted:g} ×10³/µL for reference comparison (1 ×10³/µL = 1000 /µL)"
            return converted, note

    # Patient has ×10³/µL and target is /µL
    if tgt_u in ("/ul", "/cumm", "/mm3", "cells/ul"):
        if raw_u in ("103/ul", "103/l", "k/ul", "thou/ul") or (not raw_u and val <= 100):
            converted = val * 1000.0
            note = f"Converted {val:g} ×10³/µL to {converted:g} /µL for reference comparison"
            return converted, note

    return val, None


# ---------------------------------------------------------------------------
# Main Result Comparator
# ---------------------------------------------------------------------------

def compare_result(
    test_name: str,
    patient_value: str,
    report_reference: str | None = None,
    gender: str | None = None,
) -> dict[str, Any]:
    """
    Compares the patient's reading against:
    1. Report-printed reference range, if provided and parsable
    2. Otherwise clinician-reviewed configured reference rule

    Enforces strict mathematical bounds on inequalities:
    An inequality can justify a status ONLY if all values allowed by it satisfy that status.
    """
    report_reference = report_reference.strip() if report_reference else None
    test_key = identify_test_key(test_name, gender)

    # 1. Handle Blood Pressure
    if test_key == "blood_pressure":
        bp = parse_bp(patient_value)
        if not bp:
            return {
                "status": "needs_review",
                "attention": True,
                "comparison": "Could not reliably parse blood pressure",
                "reference_range": report_reference or REFERENCE_RULES["blood_pressure"]["reference_display"],
                "reference_source": "document" if report_reference else REFERENCE_RULES["blood_pressure"]["source"],
            }
        systolic, diastolic = bp
        if report_reference:
            return {
                "status": "review_against_report_range",
                "attention": False,
                "comparison": "Reference range supplied by the laboratory/report",
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
            comparison = "Very high blood pressure reading; prompt clinical attention"

        return {
            "status": status,
            "attention": attention,
            "comparison": comparison,
            "reference_range": REFERENCE_RULES["blood_pressure"]["reference_display"],
            "reference_source": REFERENCE_RULES["blood_pressure"]["source"],
        }

    # 2. Parse Patient Value
    parsed_patient = parse_typed_clinical_value(patient_value)
    kind = parsed_patient["kind"]

    # Handle Unreadable values (e.g. B4, 4B)
    if kind == "unreadable":
        return {
            "status": "needs_review",
            "attention": True,
            "comparison": f"Value contains unreadable character ({parsed_patient.get('unreadable_detail')}); manual verification required",
            "reference_range": report_reference or (REFERENCE_RULES[test_key]["reference_display"] if test_key else None),
            "reference_source": "document" if report_reference else ("configured_reference" if test_key else None),
        }

    # Handle Range intervals (e.g. 15-45)
    if kind == "range":
        return {
            "status": "needs_review",
            "attention": True,
            "comparison": f"Reported value is an interval ({patient_value}); review original report",
            "reference_range": report_reference or (REFERENCE_RULES[test_key]["reference_display"] if test_key else None),
            "reference_source": "document" if report_reference else ("configured_reference" if test_key else None),
        }

    if kind == "unknown":
        return {
            "status": "needs_review",
            "attention": True,
            "comparison": "Could not parse reported patient value",
            "reference_range": report_reference or (REFERENCE_RULES[test_key]["reference_display"] if test_key else None),
            "reference_source": "document" if report_reference else ("configured_reference" if test_key else None),
        }

    # 3. Reference Range Target Determination
    parsed_report_ref = parse_reference_range(report_reference)
    ref_low: float | None = None
    ref_high: float | None = None
    ref_operator: str | None = None
    ref_threshold: float | None = None
    target_unit: str = ""
    ref_display: str = ""
    ref_source: str = ""

    if parsed_report_ref:
        ref_display = report_reference or ""
        ref_source = "document"
        target_unit = parsed_report_ref.get("unit") or ""
        if parsed_report_ref["type"] == "range":
            ref_low = parsed_report_ref["low"]
            ref_high = parsed_report_ref["high"]
        elif parsed_report_ref["type"] == "inequality":
            ref_operator = parsed_report_ref["operator"]
            ref_threshold = parsed_report_ref["threshold"]
    elif test_key:
        rule = REFERENCE_RULES[test_key]
        ref_display = rule["reference_display"]
        ref_source = "configured_reference"
        target_unit = rule.get("unit", "")
        ref_low = float(rule["low"]) if "low" in rule else None
        ref_high = float(rule["high"]) if "high" in rule else None
    else:
        # No known rule and no parsed report reference
        return {
            "status": "review_against_report_range" if report_reference else "not_assessed",
            "attention": False,
            "comparison": "Reference range supplied by report" if report_reference else "No validated reference range configured; review original report",
            "reference_range": report_reference,
            "reference_source": "document" if report_reference else None,
        }

    # 4. Cell Count Unit Adaptation (e.g. WBC 11200 /µL vs 4.0-11.0 ×10³/µL)
    conversion_note: str | None = None
    patient_unit = parsed_patient.get("unit")

    # If test is cell count, adapt units
    if test_key in ("wbc", "platelets") or "103" in normalize_unit_str(target_unit):
        if kind == "exact_numeric" and parsed_patient.get("exact_val") is not None:
            adapted_val, conversion_note = adapt_cell_count_units(
                parsed_patient["exact_val"],
                patient_unit,
                target_unit,
            )
            parsed_patient["exact_val"] = adapted_val
        elif kind == "inequality" and parsed_patient.get("operand") is not None:
            adapted_val, conversion_note = adapt_cell_count_units(
                parsed_patient["operand"],
                patient_unit,
                target_unit,
            )
            parsed_patient["operand"] = adapted_val

    # 5. Evaluate Inequality Patient Readings (e.g. "<60" or ">100")
    if kind == "inequality":
        op = parsed_patient["operator"]
        operand = parsed_patient["operand"]

        # If reference is upper-bound inequality: e.g. ref is "< 10"
        if ref_operator in ("<", "<=") and ref_threshold is not None:
            if op in ("<", "<="):
                if operand <= ref_threshold:
                    # All allowed values [0, operand] are <= ref_threshold
                    return {
                        "status": "within_reference",
                        "attention": False,
                        "comparison": f"Within normal reference threshold ({patient_value} vs {ref_display})",
                        "reference_range": ref_display,
                        "reference_source": ref_source,
                    }
                else:
                    # e.g. patient <60 and ref <10. Allowed values are [0, 60), which includes BOTH normal [0, 10] and elevated [10, 60)
                    return {
                        "status": "needs_review",
                        "attention": True,
                        "comparison": f"Inequality bound ({patient_value}) spans both normal and elevated ranges against reference ({ref_display}); clinician review required",
                        "reference_range": ref_display,
                        "reference_source": ref_source,
                    }
            elif op in (">", ">="):
                if operand >= ref_threshold:
                    return {
                        "status": "above_reference",
                        "attention": True,
                        "comparison": f"Above reference threshold ({patient_value} vs {ref_display})",
                        "reference_range": ref_display,
                        "reference_source": ref_source,
                    }

        # If reference is interval [ref_low, ref_high]
        if ref_low is not None and ref_high is not None:
            if op in ("<", "<="):
                if operand <= ref_low:
                    # All allowed values [0, operand] are <= ref_low
                    return {
                        "status": "below_reference",
                        "attention": True,
                        "comparison": f"Below reference range ({patient_value} vs {ref_display})",
                        "reference_range": ref_display,
                        "reference_source": ref_source,
                    }
                elif operand > ref_high:
                    # Spans below, within, and above!
                    return {
                        "status": "needs_review",
                        "attention": True,
                        "comparison": f"Inequality upper bound ({patient_value}) spans entire reference range ({ref_display}); clinician review required",
                        "reference_range": ref_display,
                        "reference_source": ref_source,
                    }
                else:
                    # Operand is between low and high: spans below and within
                    return {
                        "status": "needs_review",
                        "attention": True,
                        "comparison": f"Inequality bound ({patient_value}) spans normal and low ranges ({ref_display}); clinician review required",
                        "reference_range": ref_display,
                        "reference_source": ref_source,
                    }
            elif op in (">", ">="):
                if operand >= ref_high:
                    return {
                        "status": "above_reference",
                        "attention": True,
                        "comparison": f"Above reference range ({patient_value} vs {ref_display})",
                        "reference_range": ref_display,
                        "reference_source": ref_source,
                    }
                else:
                    return {
                        "status": "needs_review",
                        "attention": True,
                        "comparison": f"Inequality lower bound ({patient_value}) spans reference range ({ref_display}); clinician review required",
                        "reference_range": ref_display,
                        "reference_source": ref_source,
                    }

        return {
            "status": "needs_review",
            "attention": True,
            "comparison": f"Inequality value requires clinical review against reference ({ref_display})",
            "reference_range": ref_display,
            "reference_source": ref_source,
        }

    # 6. Evaluate Exact Numeric Patient Readings
    if kind == "exact_numeric":
        val = parsed_patient["exact_val"]

        # Check against reference inequality
        if ref_operator in ("<", "<=") and ref_threshold is not None:
            if val <= ref_threshold:
                status = "within_reference"
                attention = False
                comparison = f"Within reference threshold ({val} vs {ref_display})"
            else:
                status = "above_reference"
                attention = True
                comparison = f"Above reference threshold ({val} vs {ref_display})"

            if conversion_note:
                comparison += f" ({conversion_note})"

            return {
                "status": status,
                "attention": attention,
                "comparison": comparison,
                "reference_range": ref_display,
                "reference_source": ref_source,
                "conversion_provenance": conversion_note,
            }

        # Check against reference interval
        if ref_low is not None and ref_high is not None:
            if ref_low <= val <= ref_high:
                status = "within_reference"
                attention = False
                comparison = f"Within reference range ({val} vs {ref_display})"
            elif val < ref_low:
                status = "below_reference"
                attention = True
                comparison = f"Below reference range ({val} vs {ref_display})"
            else:
                status = "above_reference"
                attention = True
                comparison = f"Above reference range ({val} vs {ref_display})"

            if conversion_note:
                comparison += f" ({conversion_note})"

            return {
                "status": status,
                "attention": attention,
                "comparison": comparison,
                "reference_range": ref_display,
                "reference_source": ref_source,
                "conversion_provenance": conversion_note,
            }

    # 7. Fallback for unhandled qualitative or unrecognized cases
    return {
        "status": "review_against_report_range" if report_reference else "needs_review",
        "attention": False,
        "comparison": "Review patient value against laboratory report",
        "reference_range": ref_display or report_reference,
        "reference_source": ref_source or "document",
    }