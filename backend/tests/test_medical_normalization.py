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
