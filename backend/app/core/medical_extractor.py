from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

try:
    from .medical_reference import compare_result
except ImportError:
    from medical_reference import compare_result


# ============================================================
# SECTION CONFIGURATION
# ============================================================

SECTION_HEADERS = {
    "patient_information": [
        "patient information",
        "patient info",
        "patient details",
        "patient detail",
    ],
    "visit_information": [
        "visit information",
        "visit details",
        "consultation details",
        "consultation information",
    ],
    "chief_complaints": [
        "chief complaints",
        "chief complaint",
        "complaints",
        "presenting complaints",
    ],
    "vitals": [
        "vitals",
        "vital signs",
        "vitals this visit",
        "vital signs this visit",
    ],
    "clinical_examination": [
        "clinical examination",
        "clinical exam",
        "examination",
        "physical examination",
        "physical exam",
    ],
    "previous_visits": [
        "previous visit history",
        "previous visits history",
        "previous visit",
        "previous visits",
        "past visit history",
        "past visits",
        "visit history",
    ],
    "laboratory_results": [
        "lab investigation reports",
        "laboratory investigation reports",
        "laboratory reports",
        "lab reports",
        "lab investigation",
        "laboratory investigations",
        "investigation reports",
        "investigations",
        "lab results",
        "laboratory results",
    ],
    "diagnoses": [
        "diagnosis",
        "diagnoses",
        "diagnosis provisional",
        "diagnosis provisional",
        "provisional diagnosis",
        "provisional diagnoses",
        "final diagnosis",
        "final diagnoses",
    ],
    "medications": [
        "prescription",
        "prescriptions",
        "medications",
        "medication",
        "medicines",
        "medicine",
        "treatment",
        "treatment given",
    ],
    "advice": [
        "advice lifestyle recommendations",
        "advice and lifestyle recommendations",
        "advice lifestyle",
        "advice",
        "lifestyle recommendations",
        "recommendations",
    ],
    "follow_up": [
        "follow up",
        "follow-up",
        "followup",
        "follow up instructions",
        "follow-up instructions",
    ],
}


# ============================================================
# GENERIC HELPERS
# ============================================================

def clean(value: Any) -> Optional[str]:
    """
    Clean OCR text without aggressively changing medical values.
    """
    if value is None:
        return None

    value = str(value)
    value = value.replace("\x00", " ")
    value = value.replace("\r", "\n")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{2,}", "\n", value)

    value = value.strip(" \t\r\n:;-|")

    return value if value else None


def normalize_text(value: Any) -> str:
    """
    Normalization used only for comparison / matching.
    Does not modify the actual extracted value.
    """
    value = clean(value) or ""

    value = value.lower()

    # OCR can produce weird punctuation around headings.
    value = value.replace("&", " and ")
    value = value.replace("/", " ")
    value = value.replace("(", " ")
    value = value.replace(")", " ")
    value = value.replace(":", " ")
    value = value.replace("-", " ")

    value = re.sub(r"[^a-z0-9\s]", " ", value)
    value = re.sub(r"\s+", " ", value)

    return value.strip()


def normalize_header(value: Any) -> str:
    """
    Normalize section headers.

    Example:
        Diagnosis (Provisional)
        Diagnosis - Provisional
        iagnosis (Provisional)

    all become a comparable normalized form.
    """
    value = normalize_text(value)

    # Common OCR loss of first character.
    if value.startswith("iagnosis "):
        value = "d" + value

    if value.startswith("rescription"):
        value = "p" + value

    if value.startswith("dvice"):
        value = "a" + value

    if value.startswith("ollow up"):
        value = "f" + value

    return value


def normalize_header_aliases() -> Dict[str, str]:
    aliases: Dict[str, str] = {}

    for section, names in SECTION_HEADERS.items():
        for name in names:
            aliases[normalize_header(name)] = section

    return aliases


NORMALIZED_SECTION_HEADERS = normalize_header_aliases()


def unique_preserve(items: List[str]) -> List[str]:
    seen = set()
    result = []

    for item in items:
        value = clean(item)

        if not value:
            continue

        key = normalize_text(value)

        if key and key not in seen:
            seen.add(key)
            result.append(value)

    return result


def strip_bullet_or_number(value: str) -> str:
    value = clean(value) or ""

    value = re.sub(
        r"^\s*(?:[-*•▪◦·]+|\d+\s*[\.)\-:])\s*",
        "",
        value,
    )

    return clean(value) or ""


def is_date_only(value: str) -> bool:
    value = clean(value) or ""

    patterns = [
        r"^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$",
        r"^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}$",
        r"^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}$",
        r"^\(\s*\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\s*\)$",
    ]

    return any(re.match(pattern, value, re.I) for pattern in patterns)


def looks_like_section_header(value: str) -> bool:
    normalized = normalize_header(value)

    if normalized in NORMALIZED_SECTION_HEADERS:
        return True

    return False


def parse_key_value(line: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Parse:
        Name: Aman Pandey
        Name - Aman Pandey
        Medicine Name : Paracetamol

    But avoid interpreting dates or medical measurements as fields.
    """
    original = clean(line)

    if not original:
        return None, None

    # Colon is the safest separator.
    match = re.match(
        r"^\s*([^:]{2,60})\s*:\s*(.+?)\s*$",
        original,
    )

    if match:
        key = clean(match.group(1))
        value = clean(match.group(2))

        if key and value:
            return key, value

    # Dash separator.
    match = re.match(
        r"^\s*([A-Za-z][A-Za-z0-9 /().]{1,50})\s+-\s+(.+?)\s*$",
        original,
    )

    if match:
        key = clean(match.group(1))
        value = clean(match.group(2))

        if key and value:
            return key, value

    return None, None


# ============================================================
# SECTION SPLITTING
# ============================================================

def detect_section_header(line: str) -> Optional[str]:
    """
    Detect a section header from an OCR line.

    Handles:
        Diagnosis
        Diagnosis (Provisional)
        iagnosis (Provisional)
        R Prescription
        Advice & Lifestyle Recommendations
    """
    value = clean(line)

    if not value:
        return None

    normalized = normalize_header(value)

    if normalized in NORMALIZED_SECTION_HEADERS:
        return NORMALIZED_SECTION_HEADERS[normalized]

    # OCR may prepend bullets / strange characters.
    stripped = strip_bullet_or_number(value)
    normalized = normalize_header(stripped)

    if normalized in NORMALIZED_SECTION_HEADERS:
        return NORMALIZED_SECTION_HEADERS[normalized]

    # Some OCR output contains a section marker such as:
    # "R Prescription"
    # "BB Follow-Up"
    # "Q) Vitals"
    marker_removed = re.sub(
        r"^\s*[A-Za-z]{1,3}\s*[\)\]:.-]\s*",
        "",
        stripped,
    )

    normalized = normalize_header(marker_removed)

    if normalized in NORMALIZED_SECTION_HEADERS:
        return NORMALIZED_SECTION_HEADERS[normalized]

    # Special fuzzy heading handling.
    if "diagnosis" in normalized:
        if (
            normalized.startswith("diagnosis")
            or normalized.startswith("d iagnosis")
        ):
            return "diagnoses"

    if "prescription" in normalized:
        return "medications"

    if "advice" in normalized and (
        "lifestyle" in normalized
        or "recommendation" in normalized
        or normalized == "advice"
    ):
        return "advice"

    if "follow up" in normalized or normalized == "followup":
        return "follow_up"

    if "previous" in normalized and "visit" in normalized:
        return "previous_visits"

    if "lab" in normalized and (
        "investigation" in normalized
        or "report" in normalized
        or "result" in normalized
    ):
        return "laboratory_results"

    return None


def split_sections(text: str) -> Dict[str, List[str]]:
    """
    Split OCR text into logical medical sections.
    """
    sections: Dict[str, List[str]] = {}
    current_section: Optional[str] = None

    raw_lines = (text or "").replace("\r\n", "\n").replace("\r", "\n").split("\n")

    for raw_line in raw_lines:
        line = clean(raw_line)

        if not line:
            continue

        detected = detect_section_header(line)

        if detected:
            current_section = detected
            sections.setdefault(current_section, [])
            continue

        if current_section:
            sections.setdefault(current_section, []).append(line)

    return sections


# ============================================================
# LABELLED FIELD EXTRACTION
# ============================================================

def extract_labelled_fields(
    lines: List[str],
    aliases: Dict[str, List[str]],
) -> Dict[str, str]:
    """
    Extract selected fields from key/value OCR lines.
    """
    alias_lookup: Dict[str, str] = {}

    for canonical, names in aliases.items():
        for name in names:
            alias_lookup[normalize_text(name)] = canonical

    result: Dict[str, str] = {}

    for line in lines:
        key, value = parse_key_value(line)

        if not key or not value:
            continue

        normalized_key = normalize_text(key)

        canonical = alias_lookup.get(normalized_key)

        if canonical:
            result[canonical] = value

    return result


# ============================================================
# PATIENT INFORMATION
# ============================================================

def extract_patient_information(lines: List[str]) -> Dict[str, Any]:
    aliases = {
        "patientId": [
            "patient id",
            "patient no",
            "patient number",
            "id",
        ],
        "name": [
            "name",
            "patient name",
        ],
        "ageGender": [
            "age / gender",
            "age/gender",
            "age gender",
        ],
        "contactNo": [
            "contact no",
            "contact number",
            "phone",
            "mobile",
            "mobile number",
        ],
        "address": [
            "address",
        ],
        "allergies": [
            "allergies",
            "allergy",
        ],
    }

    fields = extract_labelled_fields(lines, aliases)

    # Sometimes OCR separates:
    # Age / Gender
    # 23 Years / Male
    for index, line in enumerate(lines):
        if normalize_text(line) in {
            "age gender",
            "age / gender",
        }:
            if index + 1 < len(lines):
                fields.setdefault("ageGender", lines[index + 1])

    return fields


# ============================================================
# VISIT INFORMATION
# ============================================================

def extract_visit_information(lines: List[str]) -> Dict[str, Any]:
    aliases = {
        "visitDate": [
            "visit date",
            "date of visit",
        ],
        "consultationTime": [
            "consultation time",
            "consultation",
            "time",
        ],
        "consultingDoctor": [
            "consulting doctor",
            "doctor",
            "consultant",
        ],
        "department": [
            "department",
        ],
        "visitType": [
            "visit type",
        ],
        "referredBy": [
            "referred by",
            "referral",
        ],
    }

    return extract_labelled_fields(lines, aliases)


# ============================================================
# CHIEF COMPLAINTS
# ============================================================

COMPLAINT_LABELS = {
    "chief complaints",
    "chief complaint",
    "complaints",
    "presenting complaints",
}


def extract_chief_complaints(lines: List[str]) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []

    for line in lines:
        value = strip_bullet_or_number(line)

        if not value:
            continue

        key, labelled_value = parse_key_value(value)

        if key and normalize_text(key) in COMPLAINT_LABELS:
            value = labelled_value or ""
        elif key:
            # Don't mistake unrelated labelled data for complaints.
            continue

        normalized = normalize_text(value)

        if not normalized:
            continue

        if normalized in COMPLAINT_LABELS:
            continue

        if is_date_only(value):
            continue

        results.append(
            {
                "complaint": value,
                "source": line,
            }
        )

    return results


# ============================================================
# VITALS
# ============================================================

def extract_vitals(lines: List[str]) -> Dict[str, Any]:
    result: Dict[str, Any] = {}

    patterns = [
        (
            "bloodPressure",
            [
                r"blood\s*pressure\s*[:\-]?\s*(.+)",
                r"\bbp\s*[:\-]?\s*(.+)",
            ],
        ),
        (
            "pulseRate",
            [
                r"pulse\s*rate\s*[:\-]?\s*(.+)",
                r"pulse\s*[:\-]?\s*(.+)",
            ],
        ),
        (
            "temperature",
            [
                r"temperature\s*[:\-]?\s*(.+)",
            ],
        ),
        (
            "respiratoryRate",
            [
                r"respiratory\s*rate\s*[:\-]?\s*(.+)",
                r"respiratory\s*rate\s*[:\-]?\s*(.+)",
            ],
        ),
        (
            "spo2",
            [
                r"spo2\s*[:\-]?\s*(.+)",
                r"sp[o0]2\s*[:\-]?\s*(.+)",
            ],
        ),
        (
            "weight",
            [
                r"weight\s*[:\-]?\s*(.+)",
            ],
        ),
        (
            "height",
            [
                r"height\s*[:\-]?\s*(.+)",
            ],
        ),
        (
            "bmi",
            [
                r"\bbmi\s*[:\-]?\s*(.+)",
            ],
        ),
    ]

    for line in lines:
        normalized = normalize_text(line)

        for canonical, regexes in patterns:
            for pattern in regexes:
                match = re.search(pattern, line, re.I)

                if match:
                    value = clean(match.group(1))

                    if value:
                        result[canonical] = value

                    break

    return result


# ============================================================
# CLINICAL EXAMINATION
# ============================================================

def extract_clinical_examination(lines: List[str]) -> Dict[str, Any]:
    aliases = {
        "general": [
            "general",
        ],
        "chest": [
            "chest",
            "respiratory",
        ],
        "cvs": [
            "cvs",
            "cardiovascular",
        ],
        "abdomen": [
            "abdomen",
        ],
        "cns": [
            "cns",
            "neurological",
        ],
        "throat": [
            "throat",
        ],
        "others": [
            "others",
            "other",
        ],
    }

    result: Dict[str, Any] = {}

    for line in lines:
        key, value = parse_key_value(line)

        if not key or not value:
            continue

        normalized_key = normalize_text(key)

        for canonical, names in aliases.items():
            if normalized_key in {normalize_text(name) for name in names}:
                result[canonical] = value
                break

    return result


# ============================================================
# LAB RESULTS
# ============================================================

KNOWN_LAB_NAMES = [
    "hemoglobin",
    "hemoglobin hb",
    "hb",
    "total wbc count",
    "wbc count",
    "white blood cell count",
    "platelet count",
    "platelets",
    "crp",
    "serum amylase",
    "amylase",
    "serum lipase",
    "lipase",
    "lft alt",
    "alt",
    "sgpt",
    "lft ast",
    "ast",
    "sgot",
    "blood sugar fasting",
    "fasting blood sugar",
    "fasting glucose",
    "glucose fasting",
    "serum creatinine",
    "creatinine",
    "chest x ray",
    "chest xray",
]


def canonical_lab_name(value: str) -> Optional[str]:
    normalized = normalize_text(value)

    mapping = {
        "hemoglobin": "Hemoglobin (Hb)",
        "hemoglobin hb": "Hemoglobin (Hb)",
        "hb": "Hemoglobin (Hb)",
        "total wbc count": "Total WBC Count",
        "wbc count": "Total WBC Count",
        "white blood cell count": "Total WBC Count",
        "platelet count": "Platelet Count",
        "platelets": "Platelet Count",
        "crp": "CRP",
        "serum amylase": "Serum Amylase",
        "amylase": "Serum Amylase",
        "serum lipase": "Serum Lipase",
        "lipase": "Serum Lipase",
        "lft alt": "LFT (ALT)",
        "alt": "LFT (ALT)",
        "sgpt": "LFT (ALT)",
        "lft ast": "LFT (AST)",
        "ast": "LFT (AST)",
        "sgot": "LFT (AST)",
        "blood sugar fasting": "Blood Sugar (Fasting)",
        "fasting blood sugar": "Blood Sugar (Fasting)",
        "fasting glucose": "Blood Sugar (Fasting)",
        "glucose fasting": "Blood Sugar (Fasting)",
        "serum creatinine": "Serum Creatinine",
        "creatinine": "Serum Creatinine",
        "chest x ray": "Chest X-Ray",
        "chest xray": "Chest X-Ray",
    }

    return mapping.get(normalized)


def split_table_columns(line: str) -> List[str]:
    """
    Split pipe/tab separated OCR table rows.
    """
    if "|" in line:
        parts = [clean(x) for x in line.split("|")]
        return [x for x in parts if x]

    if "\t" in line:
        parts = [clean(x) for x in line.split("\t")]
        return [x for x in parts if x]

    # OCR often destroys table spacing.
    parts = re.split(r"\s{2,}", line)

    return [clean(x) for x in parts if clean(x)]


def looks_like_lab_header(line: str) -> bool:
    normalized = normalize_text(line)

    headers = {
        "date",
        "current value",
        "previous value",
        "reference range",
        "test name",
        "date current value previous value",
        "test name current value previous value reference range",
    }

    return normalized in headers


def extract_lab_results(lines: List[str]) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []

    for line in lines:
        if looks_like_lab_header(line):
            continue

        # --------------------------------------------
        # Key/value form:
        # Hemoglobin: 13.2 g/dL
        # --------------------------------------------
        key, value = parse_key_value(line)

        if key and value:
            test_name = canonical_lab_name(key)

            if test_name:
                try:
                    status = compare_result(
                        test_name,
                        value,
                        None,
                    )
                except Exception:
                    status = None

                results.append(
                    {
                        "testName": test_name,
                        "currentValue": value,
                        "previousValue": None,
                        "referenceRange": None,
                        "status": status,
                        "source": line,
                    }
                )

                continue

        # --------------------------------------------
        # Table form
        # --------------------------------------------
        columns = split_table_columns(line)

        if not columns:
            continue

        test_name = canonical_lab_name(columns[0])

        if not test_name:
            # Sometimes OCR places extra junk before the test name.
            for index, part in enumerate(columns):
                possible = canonical_lab_name(part)

                if possible:
                    test_name = possible
                    columns = columns[index:]
                    break

        if not test_name:
            continue

        current_value = columns[1] if len(columns) > 1 else None
        previous_value = columns[2] if len(columns) > 2 else None
        reference_range = columns[3] if len(columns) > 3 else None

        try:
            status = compare_result(
                test_name,
                current_value or "",
                None,
            )
        except Exception:
            status = None

        results.append(
            {
                "testName": test_name,
                "currentValue": current_value,
                "previousValue": previous_value,
                "referenceRange": reference_range,
                "status": status,
                "source": line,
            }
        )

    return results


# ============================================================
# DIAGNOSIS
# ============================================================

DIAGNOSIS_LABELS = {
    "diagnosis",
    "diagnoses",
    "provisional diagnosis",
    "provisional diagnoses",
    "final diagnosis",
    "final diagnoses",
    "diagnosis provisional",
}


# These should NEVER become diagnoses.
NON_DIAGNOSIS_LABELS = {
    "treatment",
    "treatment given",
    "test name",
    "tests",
    "test",
    "investigation",
    "investigations",
    "medicine",
    "medicines",
    "medicine name",
    "medication",
    "medications",
    "dose",
    "frequency",
    "duration",
    "remarks",
    "advice",
    "instruction",
    "instructions",
    "follow up",
    "followup",
    "next review date",
    "date",
    "visit date",
    "patient id",
    "name",
    "age gender",
    "contact no",
    "address",
    "department",
    "visit type",
    "referred by",
    "reference range",
    "current value",
    "previous value",
}


def is_non_diagnosis_line(value: str) -> bool:
    normalized = normalize_text(value)

    if not normalized:
        return True

    if normalized in NON_DIAGNOSIS_LABELS:
        return True

    # Metadata / table headings.
    metadata_patterns = [
        r"^date\b",
        r"^test name\b",
        r"^treatment given\b",
        r"^medicine name\b",
        r"^dose\b",
        r"^frequency\b",
        r"^duration\b",
        r"^remarks\b",
        r"^reference range\b",
        r"^current value\b",
        r"^previous value\b",
        r"^next review date\b",
    ]

    for pattern in metadata_patterns:
        if re.search(pattern, normalized):
            return True

    return False


def looks_like_medication(value: str) -> bool:
    normalized = normalize_text(value)

    medication_tokens = [
        "tablet",
        "tab ",
        "syrup",
        "capsule",
        "cap ",
        "injection",
        "cream",
        "ointment",
        "drops",
        "mg",
        "mcg",
        "ml",
        "bd",
        "tds",
        "od",
        "hs",
        "sos",
        "before breakfast",
        "after food",
        "at night",
    ]

    return any(token in normalized for token in medication_tokens)


def looks_like_lab(value: str) -> bool:
    normalized = normalize_text(value)

    if canonical_lab_name(value):
        return True

    lab_tokens = [
        "hemoglobin",
        "wbc",
        "platelet",
        "crp",
        "amylase",
        "lipase",
        "lft",
        "blood sugar",
        "fasting",
        "reference range",
        "current value",
        "previous value",
    ]

    return any(token in normalized for token in lab_tokens)


def extract_diagnoses(lines: List[str]) -> List[Dict[str, Any]]:
    """
    SAFE diagnosis extraction.

    Important:
    The old implementation accepted every line in the diagnosis
    section as a diagnosis. That caused things such as:

        Treatment Given
        Test Name
        dates
        medicines
        lab values

    to appear as diagnoses.

    This implementation filters those aggressively.
    """

    results: List[Dict[str, Any]] = []

    for line in lines:
        original = clean(line)

        if not original:
            continue

        # --------------------------------------------
        # Explicit diagnosis label:
        #
        # Diagnosis: Gastritis
        # Provisional Diagnosis: Viral URI
        # --------------------------------------------
        key, value = parse_key_value(original)

        if key and value:
            normalized_key = normalize_text(key)

            if normalized_key in DIAGNOSIS_LABELS:
                value = strip_bullet_or_number(value)

                if (
                    value
                    and not is_non_diagnosis_line(value)
                    and not is_date_only(value)
                ):
                    results.append(
                        {
                            "diagnosis": value,
                            "source": line,
                        }
                    )

                continue

            # Any other labelled line should NOT become diagnosis.
            continue

        # --------------------------------------------
        # Remove numbering:
        #
        # 1. Acute Respiratory...
        # 2. Gastritis...
        # --------------------------------------------
        value = strip_bullet_or_number(original)

        if not value:
            continue

        # --------------------------------------------
        # Ignore section headings.
        # --------------------------------------------
        if looks_like_section_header(value):
            continue

        # --------------------------------------------
        # Ignore table / metadata labels.
        # --------------------------------------------
        if is_non_diagnosis_line(value):
            continue

        # --------------------------------------------
        # Ignore dates.
        # --------------------------------------------
        if is_date_only(value):
            continue

        # --------------------------------------------
        # Ignore lab-like content.
        # --------------------------------------------
        if looks_like_lab(value):
            continue

        # --------------------------------------------
        # Ignore medicine / prescription-like content.
        # --------------------------------------------
        if looks_like_medication(value):
            continue

        # --------------------------------------------
        # Ignore very short OCR garbage.
        # --------------------------------------------
        if len(value.strip()) < 3:
            continue

        # --------------------------------------------
        # Ignore obvious table rows.
        # --------------------------------------------
        columns = split_table_columns(value)

        if len(columns) >= 3:
            # A diagnosis is generally not a 3+ column table row.
            continue

        # --------------------------------------------
        # Accept remaining meaningful diagnosis text.
        # --------------------------------------------
        results.append(
            {
                "diagnosis": value,
                "source": line,
            }
        )

    # Remove duplicate diagnoses.
    unique_results: List[Dict[str, Any]] = []
    seen = set()

    for item in results:
        diagnosis = clean(item.get("diagnosis"))

        if not diagnosis:
            continue

        key = normalize_text(diagnosis)

        if key in seen:
            continue

        seen.add(key)

        unique_results.append(
            {
                "diagnosis": diagnosis,
                "source": item.get("source"),
            }
        )

    return unique_results


# ============================================================
# MEDICATIONS
# ============================================================

MEDICATION_FIELD_NAMES = {
    "medicine",
    "medicine name",
    "medication",
    "drug",
    "drug name",
}


def extract_medication_from_columns(
    columns: List[str],
    source: str,
) -> Optional[Dict[str, Any]]:
    if not columns:
        return None

    # Remove serial number.
    if re.match(r"^\d+$", columns[0] or ""):
        columns = columns[1:]

    if not columns:
        return None

    medicine = clean(columns[0])

    if not medicine:
        return None

    # Reject table headers.
    if normalize_text(medicine) in {
        "medicine name",
        "medicine",
        "medication",
        "drug",
    }:
        return None

    return {
        "medicine": medicine,
        "dose": columns[1] if len(columns) > 1 else None,
        "frequency": columns[2] if len(columns) > 2 else None,
        "duration": columns[3] if len(columns) > 3 else None,
        "remarks": columns[4] if len(columns) > 4 else None,
        "source": source,
    }


def extract_medications(lines: List[str]) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []

    for line in lines:
        original = clean(line)

        if not original:
            continue

        # --------------------------------------------
        # Explicit field
        #
        # Medicine Name: Tab Paracetamol 650 mg
        # --------------------------------------------
        key, value = parse_key_value(original)

        if key and value:
            normalized_key = normalize_text(key)

            if normalized_key in MEDICATION_FIELD_NAMES:
                results.append(
                    {
                        "medicine": value,
                        "dose": None,
                        "frequency": None,
                        "duration": None,
                        "remarks": None,
                        "source": line,
                    }
                )

            continue

        # --------------------------------------------
        # Table row
        # --------------------------------------------
        columns = split_table_columns(original)

        # If OCR has only spaces but clearly starts with serial number,
        # attempt a whitespace-based prescription row.
        if len(columns) == 1:
            number_match = re.match(
                r"^\s*(\d+)\s+(.+)$",
                original,
            )

            if number_match:
                rest = clean(number_match.group(2))

                if rest:
                    columns = [number_match.group(1), rest]

        if len(columns) >= 2:
            item = extract_medication_from_columns(
                columns,
                original,
            )

            if item:
                results.append(item)

                continue

        # --------------------------------------------
        # Simple numbered medicine:
        #
        # 1. Tab Paracetamol 650 mg
        # --------------------------------------------
        value = strip_bullet_or_number(original)

        if not value:
            continue

        if is_non_diagnosis_line(value):
            continue

        if value.lower() in {
            "prescription",
            "medicine name",
            "dose",
            "frequency",
            "duration",
            "remarks",
        }:
            continue

        if looks_like_medication(value):
            results.append(
                {
                    "medicine": value,
                    "dose": None,
                    "frequency": None,
                    "duration": None,
                    "remarks": None,
                    "source": line,
                }
            )

    # Deduplicate.
    unique_results: List[Dict[str, Any]] = []
    seen = set()

    for item in results:
        medicine = clean(item.get("medicine"))

        if not medicine:
            continue

        key = normalize_text(medicine)

        if key in seen:
            continue

        seen.add(key)

        unique_results.append(item)

    return unique_results


# ============================================================
# ADVICE
# ============================================================

ADVICE_LABELS = {
    "advice",
    "instruction",
    "instructions",
    "recommendation",
    "recommendations",
}


def extract_advice(lines: List[str]) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []

    for line in lines:
        original = clean(line)

        if not original:
            continue

        key, value = parse_key_value(original)

        if key and value:
            normalized_key = normalize_text(key)

            if normalized_key in ADVICE_LABELS:
                text = value
            else:
                # Preserve useful advice such as:
                # Diet: Light food
                # Activity: Rest
                text = original
        else:
            text = strip_bullet_or_number(original)

        if not text:
            continue

        normalized = normalize_text(text)

        if normalized in {
            "advice",
            "lifestyle recommendations",
            "recommendations",
            "instruction",
            "instructions",
        }:
            continue

        if looks_like_section_header(text):
            continue

        results.append(
            {
                "text": text,
                "source": line,
            }
        )

    # Deduplicate.
    unique_results: List[Dict[str, Any]] = []
    seen = set()

    for item in results:
        text = clean(item.get("text"))

        if not text:
            continue

        key = normalize_text(text)

        if key in seen:
            continue

        seen.add(key)
        unique_results.append(item)

    return unique_results


# ============================================================
# FOLLOW-UP
# ============================================================

def extract_follow_up(lines: List[str]) -> Dict[str, Any]:
    result: Dict[str, Any] = {}

    for line in lines:
        original = clean(line)

        if not original:
            continue

        key, value = parse_key_value(original)

        if key and value:
            normalized_key = normalize_text(key)

            if normalized_key in {
                "next review date",
                "review date",
                "follow up date",
                "followup date",
                "date",
            }:
                result["nextReviewDate"] = value
                continue

            if normalized_key in {
                "instruction",
                "instructions",
                "follow up",
                "followup",
            }:
                result["instruction"] = value
                continue

        # Detect review date embedded in OCR.
        date_match = re.search(
            r"(?:next\s+review\s+date|review\s+date|follow[\s-]*up\s+date)"
            r"\s*[:\-]?\s*"
            r"(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})",
            original,
            re.I,
        )

        if date_match:
            result["nextReviewDate"] = date_match.group(1)
            continue

        normalized = normalize_text(original)

        if (
            "earlier if symptoms increase" in normalized
            or "symptoms persist" in normalized
            or "symptoms worsen" in normalized
        ):
            result["instruction"] = original

    return result


# ============================================================
# PREVIOUS VISITS
# ============================================================

DATE_PATTERN = re.compile(
    r"\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b",
    re.I,
)


def extract_previous_visits(lines: List[str]) -> List[Dict[str, Any]]:
    """
    Basic extraction for the common previous-visit table:

    Date | Complaints | Diagnosis | Treatment Given

    OCR may flatten the table, so this intentionally remains
    conservative rather than inventing values.
    """

    results: List[Dict[str, Any]] = []

    for index, line in enumerate(lines):
        original = clean(line)

        if not original:
            continue

        date_match = DATE_PATTERN.search(original)

        if not date_match:
            continue

        visit_date = date_match.group(1)

        remaining = clean(
            original.replace(visit_date, "", 1)
        )

        item: Dict[str, Any] = {
            "date": visit_date,
            "complaints": None,
            "diagnosis": None,
            "treatment": None,
            "source": original,
        }

        columns = split_table_columns(remaining or "")

        if len(columns) >= 3:
            item["complaints"] = columns[0]
            item["diagnosis"] = columns[1]
            item["treatment"] = columns[2]

        elif remaining:
            # Do not guess the meaning of a flattened line.
            item["complaints"] = remaining

        # Look ahead for labelled fields.
        for next_line in lines[index + 1:index + 5]:
            key, value = parse_key_value(next_line)

            if not key or not value:
                continue

            normalized_key = normalize_text(key)

            if normalized_key in {"complaints", "complaint"}:
                item["complaints"] = value

            elif normalized_key in {
                "diagnosis",
                "provisional diagnosis",
            }:
                item["diagnosis"] = value

            elif normalized_key in {
                "treatment",
                "treatment given",
            }:
                item["treatment"] = value

        results.append(item)

    return results


# ============================================================
# MEDICAL DOCUMENT EXTRACTION
# ============================================================

def extract_medical_document(text: str) -> Dict[str, Any]:
    """
    Main entry point.

    Returns the same broad structure expected by the frontend.
    """

    text = text or ""

    sections = split_sections(text)

    patient_lines = sections.get(
        "patient_information",
        [],
    )

    visit_lines = sections.get(
        "visit_information",
        [],
    )

    complaints_lines = sections.get(
        "chief_complaints",
        [],
    )

    vitals_lines = sections.get(
        "vitals",
        [],
    )

    examination_lines = sections.get(
        "clinical_examination",
        [],
    )

    previous_visit_lines = sections.get(
        "previous_visits",
        [],
    )

    lab_lines = sections.get(
        "laboratory_results",
        [],
    )

    diagnosis_lines = sections.get(
        "diagnoses",
        [],
    )

    medication_lines = sections.get(
        "medications",
        [],
    )

    advice_lines = sections.get(
        "advice",
        [],
    )

    follow_up_lines = sections.get(
        "follow_up",
        [],
    )

    patient_information = extract_patient_information(
        patient_lines
    )

    visit_information = extract_visit_information(
        visit_lines
    )

    chief_complaints = extract_chief_complaints(
        complaints_lines
    )

    vitals = extract_vitals(
        vitals_lines
    )

    clinical_examination = extract_clinical_examination(
        examination_lines
    )

    previous_visits = extract_previous_visits(
        previous_visit_lines
    )

    laboratory_results = extract_lab_results(
        lab_lines
    )

    diagnoses = extract_diagnoses(
        diagnosis_lines
    )

    medications = extract_medications(
        medication_lines
    )

    advice = extract_advice(
        advice_lines
    )

    follow_up = extract_follow_up(
        follow_up_lines
    )

    return {
        "patient": patient_information,
        "visit": visit_information,
        "chiefComplaints": chief_complaints,
        "vitals": vitals,
        "clinicalExamination": clinical_examination,
        "previousVisits": previous_visits,
        "laboratoryResults": laboratory_results,
        "diagnoses": diagnoses,
        "medications": medications,
        "advice": advice,
        "followUp": follow_up,
        "sectionsDetected": list(sections.keys()),
    }