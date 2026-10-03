from app.core.medical_extractor import normalize_lab_value, extract_lab_results


def test_crp_less_than_60_immutable():
    """Verify that CRP <60 is NOT rewritten to <6.0 mg/L."""
    res = normalize_lab_value("CRP", "<60")
    assert res == "<60"
    assert res != "<6.0 mg/L"


def test_platelet_count_range_immutable():
    """Verify that Platelet Count 15-45 is NOT rewritten to 1.5-4.5 lakh/µL."""
    res = normalize_lab_value("Platelet Count", "15-45")
    assert res == "15-45"
    assert "lakh" not in res


def test_lipase_unreadable_chars_immutable():
    """Verify that unreadable OCR value 'B4 U/L' is NOT mutated to '54 U/L'."""
    res = normalize_lab_value("Serum Lipase", "B4 U/L")
    assert res == "B4 U/L"
    assert res != "54 U/L"


def test_per_litre_not_rewritten_to_microlitre():
    """Verify that /l (per litre) is NOT converted to /µL (per microlitre)."""
    val = "120 mg/l"
    res = normalize_lab_value("Random Test", val)
    assert "/µL" not in res
    assert "mg/L" in res


def test_trailing_punctuation_cleaned():
    """Verify that trailing periods like 'mg/L.' are safely stripped."""
    res = normalize_lab_value("CRP", "4.2 mg/L.")
    assert res == "4.2 mg/L"


def test_typed_parsing_scientific_and_range():
    from app.core.medical_reference import parse_typed_clinical_value
    p1 = parse_typed_clinical_value("1e3")
    assert p1["kind"] == "exact_numeric"
    assert p1["exact_val"] == 1000.0

    p2 = parse_typed_clinical_value("15 to 45")
    assert p2["kind"] == "range"
    assert p2["range_low"] == 15.0
    assert p2["range_high"] == 45.0


def test_clinical_comparator_inequality_boundaries():
    from app.core.medical_reference import compare_result

    # 10 mg/L vs <10 mg/L evaluates to above_reference (strictly not within <10)
    c1 = compare_result("CRP", "10 mg/L", "<10 mg/L")
    assert c1["status"] == "above_reference"

    # <=10 mg/L vs <10 mg/L evaluates to needs_review (can be 10 or <10)
    c2 = compare_result("CRP", "<=10 mg/L", "<10 mg/L")
    assert c2["status"] == "needs_review"

    # Hb <=13 vs 13-17 evaluates to needs_review (13 is normal, <13 is abnormal)
    c3 = compare_result("Hemoglobin", "<=13 g/dL", "13-17 g/dL")
    assert c3["status"] == "needs_review"

    # Hb >=17 vs 13-17 evaluates to needs_review (17 is normal, >17 is abnormal)
    c4 = compare_result("Hemoglobin", ">=17 g/dL", "13-17 g/dL")
    assert c4["status"] == "needs_review"


def test_clinical_comparator_unit_conversions_and_missing_units():
    from app.core.medical_reference import compare_result

    # 5 g/L converted to 5000 mg/L vs 0-10 mg/L evaluates to above_reference
    c1 = compare_result("CRP", "5 g/L", "0-10 mg/L")
    assert c1["status"] == "above_reference"

    # Missing unit when reference requires mg/L evaluates to needs_review
    c2 = compare_result("CRP", "15", "0-10 mg/L")
    assert c2["status"] == "needs_review"
