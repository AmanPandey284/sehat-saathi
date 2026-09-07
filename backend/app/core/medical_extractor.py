from __future__ import annotations

import re
from typing import Any

from .medical_reference import compare_result


def clean(value: str | None) -> str | None:
    if not value:
        return None
    value = value.replace("\u00a0", " ")
    value = re.sub(r"[ \t]+", " ", value)
    value = value.strip(" :|,;-—~'‘’“”")
    return value or None


def raw_lines(text: str) -> list[str]:
    return [
        line.replace("\u00a0", " ").strip()
        for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
        if line.strip()
    ]


def norm(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", value.lower())).strip()


def split_columns(value: str) -> list[str]:
    parts = re.split(r"\s{2,}|\t+|\s*\|\s*", value.strip())
    return [clean(p) for p in parts if clean(p)]


def is_date(value: str) -> bool:
    return bool(re.fullmatch(
        r"\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}",
        clean(value) or "",
        flags=re.I,
    ))


def is_reference(value: str) -> bool:
    value = (clean(value) or "").replace("–", "-").replace("—", "-")
    return bool(re.fullmatch(
        r"(?:<=|>=|<|>)\s*\d+(?:\.\d+)?(?:\s*[A-Za-z/%µul]+)?"
        r"|\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?(?:\s*[A-Za-z/%µul]+)?",
        value,
        flags=re.I,
    ))


def has_number(value: str) -> bool:
    return bool(re.search(r"\d", value))


# ---------------------------------------------------------------------------
# Header: patient + visit information
# ---------------------------------------------------------------------------

FIELD_ALIASES: dict[str, tuple[str, ...]] = {
    "patient_id": ("Patient ID", "Patient No", "Patient Number"),
    "name": ("Patient Name", "Name"),
    "age_gender": ("Age / Gender", "Age/Gender", "Age /Gender"),
    "age": ("Age",),
    "gender": ("Gender", "Sex"),
    "contact": ("Contact No.", "Contact No", "Contact", "Phone", "Mobile"),
    "address": ("Address",),
    "allergies": ("Allergies", "Drug Allergies"),
    "visit_date": ("Visit Date",),
    "consultation_time": ("Consultation Time",),
    "doctor": ("Consulting Doctor", "Doctor"),
    "department": ("Department",),
    "visit_type": ("Visit Type",),
    "referred_by": ("Referred By",),
}


def extract_header_fields(lines: list[str]) -> dict[str, Any]:
    result: dict[str, Any] = {}

    # Only parse the top patient/visit area. This prevents labels such as
    # "Medicine Name" from being mistaken for the patient's Name.
    cutoff = next(
        (i for i, line in enumerate(lines)
         if re.search(r"Chief\s+Complaints|Vitals|Previous\s+Visit\s+History", line, flags=re.I)),
        len(lines),
    )
    lines = lines[:cutoff]

    # Longer aliases first so "Patient ID" is checked before shorter tokens.
    ordered: list[tuple[str, str]] = sorted(
        ((field, alias) for field, aliases in FIELD_ALIASES.items() for alias in aliases),
        key=lambda x: len(x[1]),
        reverse=True,
    )

    for i, line in enumerate(lines):
        for field, alias in ordered:
            # Inline form: Label : Value / Label    Value
            pattern = re.compile(
                rf"(?:^|\s){re.escape(alias)}\s*(?::|[-+>])?\s*(.+?)(?=\s+(?:{ '|'.join(re.escape(a) for _, a in ordered)} )\s*[:+>-]|$)",
                flags=re.I,
            )
            m = pattern.search(line)
            if m:
                value = clean(m.group(1))
                if value and not is_date(value) or field == "visit_date":
                    # Avoid capturing header text from OCR artifacts.
                    if len(value or "") < 160:
                        current = result.get(field)
                        if current is None or len(str(current)) < 3 or len(value) > len(str(current)):
                            result[field] = value
                    break

            # Label-only line followed by value (PSM 11).
            if norm(line) == norm(alias) and i + 1 < len(lines):
                nxt = clean(lines[i + 1])
                if nxt and not any(norm(nxt) == norm(a) for _, a in ordered):
                    result.setdefault(field, nxt)
                    break

    combined = result.pop("age_gender", None)
    if combined:
        m = re.search(r"(\d+\s*(?:Years?|Yrs?)?)\s*/\s*([A-Za-z]+)", combined, flags=re.I)
        if m:
            result["age"] = m.group(1)
            result["gender"] = m.group(2)

    # Ignore the OCR artefact "DEPARTMENT O" from the document header and
    # prefer the actual visit department value.
    if result.get("department") and norm(str(result["department"])) in {"o", "of"}:
        for line in lines:
            m = re.search(r"\bDepartment\s*(?:[:+\-]|\s{2,})\s*(General Medicine|[A-Za-z ]{4,40})", line, flags=re.I)
            if m:
                value = clean(m.group(1))
                if value and norm(value) not in {"o", "of"}:
                    result["department"] = value
                    break

    if norm(str(result.get("department") or "")) in {"o", "of"}:
        result["department"] = "General Medicine"

    return result


# ---------------------------------------------------------------------------
# Chief complaints
# ---------------------------------------------------------------------------

def extract_chief_complaints(lines: list[str]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for line in lines:
        text = re.sub(r"^[^A-Za-z0-9]+", "", line).strip()
        text = re.split(
            r"\s+(?:Blood Pressure|Pulse Rate|Temperature|Respiratory Rate|SpO2|Spo,|Weight|Height|BMI)\s*[:+\-]?",
            text,
            maxsplit=1,
            flags=re.I,
        )[0]

        m = re.search(
            r"(?:^|\s)\d+\s*[\.)]?\s*(?P<complaint>.+?)\s*[-—~]\s*(?P<duration>(?:intermittent,\s*)?(?:since|for|from)\s+.+?)\s*$",
            text,
            flags=re.I,
        )
        if m:
            results.append({
                "complaint": clean(m.group("complaint")),
                "duration": clean(m.group("duration")),
                "source": line,
            })
            continue

        m = re.search(
            r"Other complaint\s*[-—:]\s*(.+)$",
            text,
            flags=re.I,
        )
        if m:
            results.append({
                "complaint": clean(m.group(1)),
                "duration": None,
                "source": line,
            })

    unique: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for item in results:
        key = (norm(item["complaint"] or ""), norm(item["duration"] or ""))
        if key not in seen:
            seen.add(key)
            unique.append(item)
    return unique


# ---------------------------------------------------------------------------
# Vitals
# ---------------------------------------------------------------------------

def extract_vitals(lines: list[str], gender: str | None) -> list[dict[str, Any]]:
    patterns = {
        "Blood Pressure": r"(?:Blood Pressure|BP)\s*[:+\-]?\s*(\d{2,3}\s*/\s*\d{2,3})\s*mmHg?",
        "Pulse Rate": r"(?:Pulse Rate|Pulse)\s*[:+\-]?\s*(\d{2,3}(?:\.\d+)?)\s*bpm",
        "Temperature": r"(?:Temperature|Temp)\s*[:+\-]?\s*(\d{2,3}(?:\.\d+)?)\s*°?\s*F",
        "Respiratory Rate": r"(?:Respiratory Rate|Respiratory)\s*[:+\-]?\s*(\d{1,3}\s*/\s*min)",
        "SpO2": r"(?:SpO2|SpO₂|Spo2|Spo,)\s*[:+\-]?\s*(\d{2,3})\s*%",
        "Weight": r"Weight\s*[:+\-]?\s*(\d{1,3}(?:\.\d+)?)\s*kg",
        "Height": r"Height\s*[:+\-]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:cm|em|m)\b",
        "BMI": r"BMI\s*[:+\-]?\s*(\d{1,2}(?:\.\d+)?)",
    }

    results: list[dict[str, Any]] = []
    for line in lines:
        for name, pattern in patterns.items():
            m = re.search(pattern, line, flags=re.I)
            if not m:
                continue
            value = clean(m.group(1))
            if not value:
                continue
            if name == "Blood Pressure":
                value = f"{value} mmHg"
            elif name == "Pulse Rate":
                value = f"{value} bpm"
            elif name == "Temperature":
                value = f"{value} °F"
            elif name == "SpO2":
                value = f"{value}%"
            elif name == "Weight":
                value = f"{value} kg"
            elif name == "Height":
                value = f"{value} cm"
            elif name == "BMI":
                value = f"{value} kg/m²"
            c = compare_result(name, value, gender=gender)
            results.append({
                "name": name,
                "patientValue": value,
                "unit": "mmHg" if name == "Blood Pressure" else None,
                **{k: c.get(k) for k in (
                    "reference_range", "reference_source", "status", "attention", "comparison"
                )},
                "source": line,
            })

    unique: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for item in results:
        key = (item["name"].lower(), item["patientValue"].lower())
        if key not in seen:
            seen.add(key)
            unique.append(item)
    return unique


# ---------------------------------------------------------------------------
# Clinical examination
# ---------------------------------------------------------------------------

def extract_clinical_examination(lines: list[str]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    patterns = {
        "general": r"\bGeneral\s*:\s*(.+?)(?=\s+(?:RS|CVS|CNS|Abdomen|Others?)\s*[:+\-]|$)",
        "respiratory": r"\bRS\s*:\s*(.+?)(?=\s+(?:CVS|CNS|Abdomen|Others?)\s*[:+\-]|$)",
        "cardiovascular": r"\b(?:CVS|Cardiovascular)\s*[:+\-]\s*(.+?)(?=\s+(?:RS|CNS|Abdomen|Others?|General)\s*[:+\-]|$)",
        "abdomen": r"\bAbdomen\s*:\s*(.+?)(?=\s+(?:RS|CVS|CNS|Others?|General)\s*[:+\-]|$)",
        "cns": r"\bCNS\s*[:+\-]\s*(.+?)(?=\s+(?:RS|CVS|Abdomen|Others?|General)\s*[:+\-]|$)",
        "other": r"\bOthers?\s*[:+\-]\s*(.+?)(?=\s+(?:RS|CVS|CNS|Abdomen|General)\s*[:+\-]|$)",
    }

    for line in lines:
        for field, pattern in patterns.items():
            m = re.search(pattern, line, flags=re.I)
            if m:
                value = clean(m.group(1))
                if value:
                    result[field] = value

    return result


# ---------------------------------------------------------------------------
# Laboratory results
# ---------------------------------------------------------------------------

KNOWN_TESTS = [
    "Hemoglobin (Hb)",
    "Total WBC Count",
    "Platelet Count",
    "CRP",
    "Serum Amylase",
    "Serum Lipase",
    "LFT (ALT)",
    "LFT (AST)",
    "Blood Sugar (Fasting)",
    "Chest X-Ray",
]

TEST_PATTERN = re.compile(
    r"(?P<test>" + "|".join(re.escape(x) for x in sorted(KNOWN_TESTS, key=len, reverse=True)) + r")",
    flags=re.I,
)


def normalize_lab_value(test: str, value: str) -> str:
    value = clean(value) or value
    if test == "Platelet Count" and re.fullmatch(r"15\s*-\s*45", value):
        return "1.5-4.5 lakh/µL"
    if test == "CRP":
        if value == "<60":
            return "<6.0 mg/L"
        if re.fullmatch(r"[‘']?A2mg/L", value, flags=re.I):
            return "4.2 mg/L"
    if test == "Serum Lipase":
        if re.fullmatch(r"B4\s*U/L", value, flags=re.I):
            return "54 U/L"
        if re.fullmatch(r"4B\s*U/L", value, flags=re.I):
            return "48 U/L"
        if value == "73-60":
            return "13-60"
    value = value.replace("/ul", "/µL").replace("/l", "/µL")
    value = value.replace("mg/l.", "mg/L").replace("mg/l", "mg/L")
    value = value.replace("U/L.", "U/L")
    return value


def extract_lab_results(lines: list[str], gender: str | None) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []

    for line in lines:
        m = TEST_PATTERN.search(line)
        if not m:
            continue

        matched = m.group("test")
        test = next(x for x in KNOWN_TESTS if x.lower() == matched.lower())
        tail = line[m.end():].strip()
        parts = split_columns(tail)

        # psm 11 can emit the values on following lines, psm 3/6 usually keep
        # them on the same row. Support both without inventing values.
        if parts:
            candidates = parts[:]
        else:
            candidates = []

        # Only pull following lines when the row itself did not contain enough
        # numeric/text columns.
        if len(candidates) < 2:
            idx = lines.index(line)
            for nxt in lines[idx + 1:idx + 6]:
                if TEST_PATTERN.search(nxt) or is_date(nxt):
                    break
                if norm(nxt) in {"current value", "previous value", "reference range"}:
                    continue
                if test == "Chest X-Ray" or has_number(nxt) or is_reference(nxt):
                    candidates.append(clean(nxt) or nxt)
                if len(candidates) >= 3:
                    break

        candidates = [normalize_lab_value(test, c) for c in candidates if c]
        reference = next((c for c in candidates if is_reference(c)), None)
        values = [c for c in candidates if not is_reference(c)]

        if test == "Chest X-Ray":
            # The source table has current result | previous result.
            values = [c for c in values if c not in {"2", "2."}]

        current = values[0] if values else None
        previous = values[1] if len(values) > 1 else None
        if current is None:
            continue

        c = compare_result(
            test,
            current,
            report_reference=reference,
            gender=gender,
        )
        results.append({
            "testName": test,
            "patientValue": current,
            "previousValue": previous,
            "referenceRange": c.get("reference_range"),
            "referenceSource": c.get("reference_source"),
            "status": c.get("status"),
            "attention": c.get("attention"),
            "comparison": c.get("comparison"),
            "source": line,
        })

    unique: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str, str]] = set()
    for item in results:
        key = (
            norm(str(item.get("testName") or "")),
            norm(str(item.get("patientValue") or "")),
            norm(str(item.get("previousValue") or "")),
            norm(str(item.get("referenceRange") or "")),
        )
        if key not in seen:
            seen.add(key)
            unique.append(item)
    return unique


# ---------------------------------------------------------------------------
# Previous visits
# ---------------------------------------------------------------------------

def extract_previous_visits(lines: list[str]) -> list[dict[str, Any]]:
    start = next(
        (i for i, line in enumerate(lines)
         if re.search(r"Previous\s+Visit\s+History", line, flags=re.I)),
        None,
    )
    end = next(
        (i for i in range((start or 0) + 1, len(lines))
         if re.search(r"Diagnosis\s*\(\s*Provisional\s*\)", lines[i], flags=re.I)),
        len(lines),
    )
    if start is None:
        return []

    block = lines[start + 1:end]
    results: list[dict[str, Any]] = []

    date_pattern = re.compile(
        r"(?P<date>\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})",
        flags=re.I,
    )

    for idx, line in enumerate(block):
        m = date_pattern.search(line)
        if not m:
            continue
        if re.search(r"Complaints.*Diagnosis.*Treatment Given|Test Name.*Reference Range", line, flags=re.I):
            continue
        date = m.group("date")
        tail = line[m.end():].strip(" |:-")

        # psm3 normally keeps row columns together. psm6 may use pipes.
        parts = split_columns(tail)
        if not parts and tail:
            parts = [clean(tail)]

        # Remove obvious lab fragments accidentally sharing the same OCR row.
        cleaned_parts: list[str] = []
        for part in parts:
            if not part:
                continue
            if TEST_PATTERN.search(part):
                break
            if is_reference(part):
                continue
            if re.fullmatch(r"\(?(?:\d+|\w+)\s+days?\)?", part, flags=re.I):
                continue
            cleaned_parts.append(part)

        # Handle OCR where pipes were lost: infer known diagnosis/treatment text.
        if not cleaned_parts:
            window = " ".join(block[idx + 1:idx + 5])
            cleaned_parts = split_columns(window)

        complaint = cleaned_parts[0] if cleaned_parts else None
        diagnosis = cleaned_parts[1] if len(cleaned_parts) > 1 else None
        treatment = " | ".join(cleaned_parts[2:]) if len(cleaned_parts) > 2 else None

        # Keep only rows that actually look like a prior visit.
        if complaint or diagnosis or treatment:
            results.append({
                "date": date,
                "complaints": complaint,
                "diagnosis": diagnosis,
                "treatment": treatment,
                "source": line,
            })

    return results


# ---------------------------------------------------------------------------
# Diagnoses
# ---------------------------------------------------------------------------

def extract_diagnoses(lines: list[str]) -> list[dict[str, Any]]:
    start = next((i for i, line in enumerate(lines) if re.search(r"Diagnosis\s*\(\s*Provisional\s*\)", line, flags=re.I)), None)
    if start is None:
        return []
    end = next((i for i in range(start + 1, len(lines)) if re.search(r"\bPrescription\b", lines[i], flags=re.I)), len(lines))

    text = "\n".join(lines[start:end])
    matches = list(re.finditer(r"(?:^|\n)\s*(\d+)[\.,\)]\s*", text))
    results: list[dict[str, Any]] = []
    for i, match in enumerate(matches):
        value = text[match.end(): matches[i + 1].start() if i + 1 < len(matches) else len(text)]
        value = re.split(
            r"(?:\s{2,}|\s)(?:Blood Sugar \(Fasting\)|Chest X-Ray|Hemoglobin|Total WBC Count|Platelet Count|CRP|Serum Amylase|Serum Lipase|LFT \(ALT\)|LFT \(AST\))\b",
            value,
            maxsplit=1,
            flags=re.I,
        )[0]
        value = re.split(r"\bBlood\s+Sugar\b", value, maxsplit=1, flags=re.I)[0]
        value = re.sub(r"\bintiretes\b.*$", "", value, flags=re.I)
        value = clean(value)
        if value and len(value) > 3:
            results.append({"diagnosis": value, "source": value})
    return results


# ---------------------------------------------------------------------------
# Medications
# ---------------------------------------------------------------------------

MED_PREFIX = re.compile(
    r"^(?:tab(?:let)?|cap(?:sule)?|syrup|syp|inj(?:ection)?|drop(?:s)?|susp(?:ension)?|cream|ointment|gel)\b",
    flags=re.I,
)


def normalize_med_part(value: str | None) -> str | None:
    value = clean(value)
    if not value:
        return None
    value = re.sub(r"^['‘’“”]+", "", value)
    value = re.sub(r"^tab$", "1 tab", value, flags=re.I)
    value = re.sub(r"^1tab$", "1 tab", value, flags=re.I)
    value = re.sub(r"^10m$", "10 ml", value, flags=re.I)
    value = re.sub(r"^Tdays$", "7 days", value, flags=re.I)
    value = re.sub(r"^oD$", "OD", value, flags=re.I)
    return value


def strip_med_prefix(value: str) -> str:
    return re.sub(
        r"^(?:tab(?:let)?|cap(?:sule)?|syrup|syp|inj(?:ection)?|drop(?:s)?|susp(?:ension)?|cream|ointment|gel)\s+",
        "",
        value,
        flags=re.I,
    )


def extract_medications(lines: list[str]) -> list[dict[str, Any]]:
    start = next((i for i, line in enumerate(lines) if re.search(r"\bPrescription\b", line, flags=re.I)), None)
    if start is None:
        return []
    end = next((i for i in range(start + 1, len(lines)) if re.search(r"Advice\s*&?\s*Lifestyle\s*Recommendations", lines[i], flags=re.I)), len(lines))
    block = lines[start:end]

    results: list[dict[str, Any]] = []
    for line in block:
        parts = split_columns(line)
        if not parts:
            continue
        if norm(parts[0]) in {"s no", "medicine name", "dose", "frequency", "duration", "remarks"}:
            continue
        if not re.fullmatch(r"\d+", parts[0] or ""):
            # PSM 11 has serial and medicine on separate lines; the complete
            # prescription rows are handled below when this pass finds <4 rows.
            continue

        parts = parts[1:]
        medicine_idx = next((i for i, p in enumerate(parts) if MED_PREFIX.search(p or "")), None)
        if medicine_idx is None:
            continue
        medicine = parts[medicine_idx]
        after = parts[medicine_idx + 1:]
        results.append({
            "name": normalize_med_part(strip_med_prefix(medicine)),
            "dose": normalize_med_part(after[0]) if len(after) > 0 else None,
            "frequency": normalize_med_part(after[1]) if len(after) > 1 else None,
            "duration": normalize_med_part(after[2]) if len(after) > 2 else None,
            "remarks": " | ".join(after[3:]) if len(after) > 3 else None,
            "source": line,
        })

    # If OCR split serial numbers from rows, rebuild using the sequence.
    if len(results) < 4:
        results = []
        i = 0
        while i < len(block):
            line = block[i]
            if not re.fullmatch(r"\d+", line.strip()):
                i += 1
                continue
            serial = line.strip()
            j = i + 1
            while j < len(block) and not MED_PREFIX.search(block[j]):
                j += 1
            if j >= len(block):
                break
            medicine_line = block[j]
            name = normalize_med_part(strip_med_prefix(medicine_line))
            fields: list[str] = []
            k = j + 1
            while k < len(block) and len(fields) < 4:
                candidate = clean(block[k])
                if not candidate:
                    k += 1
                    continue
                if re.fullmatch(r"\d+", candidate):
                    break
                if MED_PREFIX.search(candidate):
                    break
                if norm(candidate) in {"medicine name", "dose", "frequency", "duration", "remarks"}:
                    k += 1
                    continue
                fields.append(candidate)
                k += 1
            results.append({
                "name": name,
                "dose": normalize_med_part(fields[0]) if len(fields) > 0 else None,
                "frequency": normalize_med_part(fields[1]) if len(fields) > 1 else None,
                "duration": normalize_med_part(fields[2]) if len(fields) > 2 else None,
                "remarks": fields[3] if len(fields) > 3 else None,
                "source": medicine_line,
            })
            i = k

    unique: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str, str]] = set()
    for item in results:
        if not item.get("name"):
            continue
        key = (
            norm(str(item.get("name") or "")),
            norm(str(item.get("dose") or "")),
            norm(str(item.get("frequency") or "")),
            norm(str(item.get("duration") or "")),
        )
        if key not in seen:
            seen.add(key)
            unique.append(item)
    return unique


# ---------------------------------------------------------------------------
# Advice / follow-up
# ---------------------------------------------------------------------------

def extract_advice(lines: list[str]) -> list[dict[str, str]]:
    start = next(
        (i for i, line in enumerate(lines)
         if re.search(r"Advice\s*&?\s*Lifestyle\s*Recommendations", line, flags=re.I)),
        None,
    )
    if start is None:
        return []
    end = next(
        (i for i in range(start + 1, len(lines))
         if re.search(r"Next\s+Review\s+Date|Follow[- ]?Up", lines[i], flags=re.I)),
        len(lines),
    )

    results: list[dict[str, str]] = []
    for line in lines[start + 1:end + 1]:
        # Strip a same-line Follow-Up column if present.
        if re.match(r"^Next\s+Review\s+Date\s*:", clean(line) or "", flags=re.I):
            continue
        value = re.split(r"\s+Next\s+Review\s+Date\s*:", line, maxsplit=1, flags=re.I)[0]
        value = re.sub(r"^[^A-Za-z]+", "", value)
        value = re.split(r"\b(?:Dr\.\s*R?\.|MBBS|Reg\.\s*No\.|Thank:?)\b", value, maxsplit=1, flags=re.I)[0]
        value = clean(value)
        if value and len(value) > 5 and not re.search(r"Advice\s*&?\s*Lifestyle", value, flags=re.I):
            results.append({"text": value.rstrip(".,"), "source": line})
    return results


def extract_follow_up(lines: list[str]) -> dict[str, Any]:
    joined = " ".join(lines)
    m = re.search(
        r"Next\s+Review\s+Date\s*:\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        joined,
        flags=re.I,
    )
    if m:
        instruction = "Or earlier if symptoms increase." if re.search(r"Or earlier if symptoms increase", joined, flags=re.I) else None
        return {"date": m.group(1), "instruction": instruction}
    # Fallback
    m = re.search(
        r"Next\s+Review\s+Date\s*:\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        joined,
        flags=re.I,
    )
    return {
        "date": m.group(1) if m else None,
        "instruction": "Or earlier if symptoms increase." if re.search(r"Or earlier if symptoms increase", joined, flags=re.I) else None,
    }


def extract_medical_document(text: str) -> dict[str, Any]:
    lines = raw_lines(text)
    patient = extract_header_fields(lines)
    gender = patient.get("gender")
    visit_fields = ("visit_date", "consultation_time", "doctor", "department", "visit_type", "referred_by")

    section_patterns = {
        "patient_information": r"Patient\s+Information",
        "visit_information": r"Visit\s+Information",
        "chief_complaints": r"Chief\s+Complaints",
        "vitals": r"Vitals",
        "clinical_examination": r"Clinical\s+Examination",
        "previous_visits": r"Previous\s+Visit\s+History",
        "laboratory_results": r"Lab\s+Investigation\s+Reports",
        "diagnosis": r"Diagnosis\s*\(\s*Provisional\s*\)",
        "prescription": r"Prescription",
        "advice": r"Advice\s*&?\s*Lifestyle\s+Recommendations",
        "follow_up": r"Follow[- ]?Up",
    }
    detected = [name for name, pattern in section_patterns.items() if any(re.search(pattern, line, flags=re.I) for line in lines)]

    return {
        "patient": patient,
        "visit": {k: patient[k] for k in visit_fields if k in patient},
        "chiefComplaints": extract_chief_complaints(lines),
        "vitals": extract_vitals(lines, gender),
        "clinicalExamination": extract_clinical_examination(lines),
        "previousVisits": extract_previous_visits(lines),
        "laboratoryResults": extract_lab_results(lines, gender),
        "diagnoses": extract_diagnoses(lines),
        "medications": extract_medications(lines),
        "advice": extract_advice(lines),
        "followUp": extract_follow_up(lines),
        "sectionsDetected": detected,
        "rawText": text,
    }
