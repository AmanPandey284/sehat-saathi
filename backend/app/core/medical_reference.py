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
    "blood_pressure": {
        "unit": "mmHg",
        "reference_display": "<120/<80 mmHg",
        "source": "AHA adult BP categories",
        "kind": "blood_pressure",
    },

    "hemoglobin_male": {
        "unit": "g/dL",
        "low": 13.0,
        "high": 17.0,
        "reference_display": "13.0–17.0 g/dL",
        "kind": "numeric",
    },

    "hemoglobin_female": {
        "unit": "g/dL",
        "low": 12.0,
        "high": 15.5,
        "reference_display": "12.0–15.5 g/dL",
        "kind": "numeric",
    },

    "platelets": {
        "unit": "10^3/µL",
        "low": 150,
        "high": 450,
        "reference_display": "150–450 ×10^3/µL",
        "kind": "numeric",
    },

    "wbc": {
        "unit": "10^3/µL",
        "low": 4.0,
        "high": 11.0,
        "reference_display": "4.0–11.0 ×10^3/µL",
        "kind": "numeric",
    },

    "glucose_fasting": {
        "unit": "mg/dL",
        "low": 70,
        "high": 99,
        "reference_display": "70–99 mg/dL",
        "kind": "numeric",
    },

    "creatinine": {
        "unit": "mg/dL",
        "low": 0.6,
        "high": 1.3,
        "reference_display": "0.6–1.3 mg/dL",
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

    if normalized in {
        "blood pressure",
        "bp",
        "bloodpressure",
    }:
        return "blood_pressure"

    if normalized in {
        "hemoglobin",
        "hemoglobin hb",
        "hb",
        "haemoglobin",
    }:
        if gender and gender.lower().startswith("f"):
            return "hemoglobin_female"

        return "hemoglobin_male"

    if normalized in {
        "platelets",
        "platelet count",
        "platelet",
    }:
        return "platelets"

    if normalized in {
        "wbc",
        "total wbc",
        "total wbc count",
        "white blood cell count",
    }:
        return "wbc"

    if normalized in {
        "fasting glucose",
        "fasting blood sugar",
        "blood sugar fasting",
        "glucose fasting",
    }:
        return "glucose_fasting"

    if normalized in {
        "creatinine",
        "serum creatinine",
    }:
        return "creatinine"

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