from __future__ import annotations

import re
from typing import Any

from .medical_reference import compare_result


def clean(value: str | None) -> str | None:
    if not value:
        return None

    value = re.sub(r"[ \t]+", " ", value)
    value = value.strip(" :|-")

    return value or None


def lines_from_text(text: str) -> list[str]:
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    return [
        clean(line)
        for line in text.split("\n")
        if clean(line)
    ]


SECTION_HEADERS = {
    "patient_information": [
        "patient information",
        "patient info",
    ],
    "visit_information": [
        "visit information",
        "visit info",
    ],
    "chief_complaints": [
        "chief complaints",
        "chief complaint",
    ],
    "vitals": [
        "vitals",
    ],
    "clinical_examination": [
        "clinical examination",
        "clinical exam",
    ],
    "previous_visits": [
        "previous visit history",
        "previous visits",
        "previous history",
    ],
    "laboratory_results": [
        "lab investigation reports",
        "laboratory reports",
        "lab reports",
        "investigation reports",
    ],
    "diagnosis": [
        "diagnosis",
        "diagnosis (provisional)",
        "provisional diagnosis",
    ],
    "prescription": [
        "prescription",
        "medications",
        "medication",
    ],
    "advice": [
        "advice",
        "advice & lifestyle recommendations",
        "lifestyle recommendations",
    ],
    "follow_up": [
        "follow-up",
        "follow up",
    ],
}


def split_sections(
    text: str,
) -> dict[str, list[str]]:
    lines = lines_from_text(text)

    sections: dict[str, list[str]] = {}
    current: str | None = None

    for line in lines:
        normalized = re.sub(
            r"[^a-z0-9& ]",
            " ",
            line.lower(),
        )

        normalized = re.sub(
            r"\s+",
            " ",
            normalized,
        ).strip()

        found: str | None = None

        for section, headers in SECTION_HEADERS.items():
            if normalized in headers:
                found = section
                break

        if found:
            current = found
            sections.setdefault(current, [])
            continue

        if current:
            sections.setdefault(
                current,
                [],
            ).append(line)

    return sections


def extract_labelled_fields(
    lines: list[str],
    aliases: dict[str, list[str]],
) -> dict[str, str]:
    result: dict[str, str] = {}

    for line in lines:
        for field, labels in aliases.items():
            for label in labels:
                match = re.match(
                    rf"^\s*{re.escape(label)}\s*[:\-]\s*(.+)$",
                    line,
                    flags=re.I,
                )

                if match:
                    value = clean(match.group(1))

                    if value:
                        result[field] = value

                    break

    return result


def extract_patient_information(
    lines: list[str],
) -> dict[str, Any]:
    return extract_labelled_fields(
        lines,
        {
            "patient_id": [
                "Patient ID",
                "Patient No",
                "Patient Number",
            ],
            "name": [
                "Name",
                "Patient Name",
            ],
            "age": [
                "Age",
            ],
            "gender": [
                "Gender",
                "Sex",
            ],
            "contact": [
                "Contact",
                "Contact No.",
                "Phone",
                "Mobile",
            ],
            "address": [
                "Address",
            ],
            "allergies": [
                "Allergies",
                "Drug Allergies",
            ],
        },
    )


def extract_visit_information(
    lines: list[str],
) -> dict[str, Any]:
    return extract_labelled_fields(
        lines,
        {
            "visit_date": [
                "Visit Date",
                "Date",
            ],
            "consultation_time": [
                "Consultation Time",
                "Time",
            ],
            "doctor": [
                "Doctor",
                "Consulting Doctor",
            ],
            "department": [
                "Department",
            ],
            "visit_type": [
                "Visit Type",
            ],
            "referred_by": [
                "Referred By",
            ],
        },
    )


def extract_chief_complaints(
    lines: list[str],
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []

    for line in lines:
        # Handles:
        # Cough — since 5 days
        # Abdominal pain - since 3 days
        # 1. Cough — since 5 days

        match = re.match(
            r"^\s*(?:\d+[\.)]\s*)?"
            r"(?P<complaint>.+?)"
            r"\s*[—\-]\s*"
            r"(?P<duration>(?:since|for|from).+)$",
            line,
            flags=re.I,
        )

        if match:
            results.append(
                {
                    "complaint": clean(
                        match.group("complaint")
                    ),
                    "duration": clean(
                        match.group("duration")
                    ),
                    "source": line,
                }
            )
            continue

        if "other complaint" in line.lower():
            parts = re.split(
                r"\s*[—\-]\s*",
                line,
                maxsplit=1,
            )

            if len(parts) == 2:
                results.append(
                    {
                        "complaint": clean(parts[1]),
                        "duration": None,
                        "source": line,
                    }
                )

    return results


def extract_vitals(
    lines: list[str],
    gender: str | None = None,
) -> list[dict[str, Any]]:
    aliases = {
        "Blood Pressure": ["Blood Pressure", "BP"],
        "Pulse Rate": ["Pulse Rate", "Pulse"],
        "Temperature": ["Temperature", "Temp"],
        "Respiratory Rate": [
            "Respiratory Rate",
            "Respiratory",
        ],
        "SpO2": ["SpO2", "SpO₂"],
        "Weight": ["Weight"],
        "Height": ["Height"],
        "BMI": ["BMI"],
    }

    results: list[dict[str, Any]] = []

    for line in lines:
        for display_name, labels in aliases.items():
            for label in labels:
                match = re.match(
                    rf"^\s*{re.escape(label)}\s*[:\-]\s*(.+)$",
                    line,
                    flags=re.I,
                )

                if not match:
                    continue

                patient_value = clean(match.group(1))

                if not patient_value:
                    continue

                comparison = compare_result(
                    display_name,
                    patient_value,
                    gender=gender,
                )

                results.append(
                    {
                        "name": display_name,
                        "patientValue": patient_value,
                        "unit": (
                            "mmHg"
                            if display_name.lower()
                            == "blood pressure"
                            else None
                        ),
                        **comparison,
                        "source": line,
                    }
                )

                break

    return results


def extract_clinical_examination(
    lines: list[str],
) -> dict[str, Any]:
    return extract_labelled_fields(
        lines,
        {
            "general": ["General"],
            "respiratory": [
                "RS",
                "Respiratory",
            ],
            "cardiovascular": [
                "CVS",
                "Cardiovascular",
            ],
            "abdomen": ["Abdomen"],
            "cns": ["CNS"],
            "other": [
                "Other",
                "Others",
            ],
        },
    )


def extract_lab_results(
    lines: list[str],
    gender: str | None = None,
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []

    # ------------------------------------------------------------
    # Table-style OCR:
    #
    # Test | Patient | Previous | Reference
    # ------------------------------------------------------------

    for line in lines:
        if "test name" in line.lower():
            continue

        parts = re.split(
            r"\s*\|\s*|\t+",
            line,
        )

        if len(parts) >= 2:
            test_name = clean(parts[0])

            if not test_name:
                continue

            current_value = clean(parts[1])

            previous_value = (
                clean(parts[2])
                if len(parts) > 2
                else None
            )

            reference_range = (
                clean(parts[3])
                if len(parts) > 3
                else None
            )

            comparison = compare_result(
                test_name,
                current_value or "",
                report_reference=reference_range,
                gender=gender,
            )

            results.append(
                {
                    "testName": test_name,
                    "patientValue": current_value,
                    "previousValue": previous_value,
                    "referenceRange": (
                        comparison.get(
                            "reference_range"
                        )
                    ),
                    "referenceSource": (
                        comparison.get(
                            "reference_source"
                        )
                    ),
                    "status": comparison.get(
                        "status"
                    ),
                    "attention": comparison.get(
                        "attention"
                    ),
                    "comparison": comparison.get(
                        "comparison"
                    ),
                    "source": line,
                }
            )

    # ------------------------------------------------------------
    # Label/value-style OCR
    # ------------------------------------------------------------

    known_tests = [
        "Hemoglobin",
        "Hb",
        "Total WBC Count",
        "WBC",
        "Platelet Count",
        "Platelets",
        "CRP",
        "Serum Amylase",
        "Serum Lipase",
        "Creatinine",
        "TSH",
        "T3",
        "T4",
        "Blood Sugar (Fasting)",
        "Blood Sugar",
        "Glucose",
        "Chest X-Ray",
    ]

    for line in lines:
        for test_name in known_tests:
            match = re.match(
                rf"^\s*{re.escape(test_name)}\s*[:\-]\s*(.+)$",
                line,
                flags=re.I,
            )

            if not match:
                continue

            patient_value = clean(match.group(1))

            if not patient_value:
                continue

            comparison = compare_result(
                test_name,
                patient_value,
                gender=gender,
            )

            results.append(
                {
                    "testName": test_name,
                    "patientValue": patient_value,
                    "previousValue": None,
                    "referenceRange": comparison.get(
                        "reference_range"
                    ),
                    "referenceSource": comparison.get(
                        "reference_source"
                    ),
                    "status": comparison.get(
                        "status"
                    ),
                    "attention": comparison.get(
                        "attention"
                    ),
                    "comparison": comparison.get(
                        "comparison"
                    ),
                    "source": line,
                }
            )

            break

    # Remove exact duplicates.
    unique: list[dict[str, Any]] = []
    seen: set[str] = set()

    for item in results:
        key = "|".join(
            [
                str(item.get("testName") or "").lower(),
                str(item.get("patientValue") or "").lower(),
                str(item.get("previousValue") or "").lower(),
                str(item.get("referenceRange") or "").lower(),
            ]
        )

        if key in seen:
            continue

        seen.add(key)
        unique.append(item)

    return unique


def extract_diagnoses(
    lines: list[str],
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []

    for line in lines:
        value = re.sub(
            r"^\s*\d+[\.)]\s*",
            "",
            line,
        )

        value = clean(value)

        if value:
            results.append(
                {
                    "diagnosis": value,
                    "source": line,
                }
            )

    return results


def extract_medications(
    lines: list[str],
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []

    for line in lines:
        if "medicine name" in line.lower():
            continue

        parts = re.split(
            r"\s*\|\s*|\t+",
            line,
        )

        # 1 | Paracetamol | 1 tab | TDS | 5 days | For fever
        if (
            len(parts) >= 2
            and re.fullmatch(r"\d+", parts[0].strip())
        ):
            results.append(
                {
                    "name": clean(parts[1]),
                    "dose": (
                        clean(parts[2])
                        if len(parts) > 2
                        else None
                    ),
                    "frequency": (
                        clean(parts[3])
                        if len(parts) > 3
                        else None
                    ),
                    "duration": (
                        clean(parts[4])
                        if len(parts) > 4
                        else None
                    ),
                    "remarks": (
                        clean(
                            " | ".join(parts[5:])
                        )
                        if len(parts) > 5
                        else None
                    ),
                    "source": line,
                }
            )

            continue

        numbered = re.match(
            r"^\s*(\d+)[\.)]\s+(.+)$",
            line,
        )

        if numbered:
            results.append(
                {
                    "name": clean(
                        numbered.group(2)
                    ),
                    "dose": None,
                    "frequency": None,
                    "duration": None,
                    "remarks": None,
                    "source": line,
                }
            )

    return results


def extract_advice(
    lines: list[str],
) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []

    for line in lines:
        value = re.sub(
            r"^\s*[\-\u2022•]\s*",
            "",
            line,
        )

        value = re.sub(
            r"^\s*\d+[\.)]\s*",
            "",
            value,
        )

        value = clean(value)

        if value:
            results.append(
                {
                    "text": value,
                    "source": line,
                }
            )

    return results


def extract_follow_up(
    lines: list[str],
) -> dict[str, Any]:
    text = " ".join(lines)

    date_match = re.search(
        r"\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b"
        r"|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
        text,
        flags=re.I,
    )

    return {
        "date": (
            date_match.group(0)
            if date_match
            else None
        ),
        "instruction": (
            text if text else None
        ),
    }


def extract_medical_document(
    text: str,
) -> dict[str, Any]:
    sections = split_sections(text)

    patient = extract_patient_information(
        sections.get(
            "patient_information",
            [],
        )
    )

    gender = patient.get("gender")

    structured = {
        "patient": patient,

        "visit": extract_visit_information(
            sections.get(
                "visit_information",
                [],
            )
        ),

        "chiefComplaints": extract_chief_complaints(
            sections.get(
                "chief_complaints",
                [],
            )
        ),

        "vitals": extract_vitals(
            sections.get(
                "vitals",
                [],
            ),
            gender=gender,
        ),

        "clinicalExamination":
            extract_clinical_examination(
                sections.get(
                    "clinical_examination",
                    [],
                )
            ),

        "previousVisits": [],

        "laboratoryResults":
            extract_lab_results(
                sections.get(
                    "laboratory_results",
                    [],
                ),
                gender=gender,
            ),

        "diagnoses": extract_diagnoses(
            sections.get(
                "diagnosis",
                [],
            )
        ),

        "medications": extract_medications(
            sections.get(
                "prescription",
                [],
            )
        ),

        "advice": extract_advice(
            sections.get(
                "advice",
                [],
            )
        ),

        "followUp": extract_follow_up(
            sections.get(
                "follow_up",
                [],
            )
        ),

        "sectionsDetected": list(
            sections.keys()
        ),
    }

    return structured