from __future__ import annotations

import contextlib
import hashlib
import hmac
import json
from pathlib import Path
import secrets
import sqlite3
import time
from typing import Any, Generator

from app.core.config import settings

DATA_DIR = Path(settings.data_dir)
DB_PATH = Path(settings.db_path)


def hash_password(password: str, salt: str | None = None) -> str:
    if not salt:
        salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 200_000)
    return f"{salt}${dk.hex()}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    if not stored_hash or "$" not in stored_hash:
        return False
    salt, expected = stored_hash.split("$", 1)
    dk = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 200_000)
    return hmac.compare_digest(dk.hex(), expected)


def get_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(
        str(DB_PATH),
        timeout=10.0,
        isolation_level=None,  # Autocommit mode; transactions managed via BEGIN IMMEDIATE
        check_same_thread=False,
    )
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    return conn


@contextlib.contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


@contextlib.contextmanager
def transaction() -> Generator[sqlite3.Connection, None, None]:
    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE;")
        yield conn
        conn.execute("COMMIT;")
    except Exception:
        conn.execute("ROLLBACK;")
        raise
    finally:
        conn.close()


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with transaction() as conn:
        # Accounts Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                status TEXT NOT NULL,
                medical_system TEXT,
                specialty TEXT,
                registration_id TEXT,
                council_name TEXT,
                years_of_experience INTEGER DEFAULT 0,
                hospital_name TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_accounts_role_status ON accounts(role, status);")

        # Encounters Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS encounters (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                patient_name TEXT NOT NULL,
                age INTEGER,
                gender TEXT,
                abha_id TEXT,
                abdm_consent INTEGER DEFAULT 0,
                triage_level TEXT DEFAULT 'routine',
                chief_complaint TEXT,
                history_json TEXT,
                ayush_json TEXT,
                documents_json TEXT,
                vitals_json TEXT,
                labs_json TEXT,
                summary_text TEXT,
                evidence_json TEXT,
                safety_flags_json TEXT,
                background_json TEXT,
                client_intake_id TEXT,
                version INTEGER DEFAULT 1,
                physician_decision TEXT,
                physician_review_note TEXT,
                physician_signed_by TEXT,
                physician_signed_at INTEGER,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
        """)
        # Ensure migration columns in encounters
        cur = conn.execute("PRAGMA table_info(encounters);")
        existing_cols = {row["name"] for row in cur.fetchall()}
        for col_name, col_type in [
            ("evidence_json", "TEXT"),
            ("safety_flags_json", "TEXT"),
            ("background_json", "TEXT"),
            ("client_intake_id", "TEXT"),
        ]:
            if col_name not in existing_cols:
                conn.execute(f"ALTER TABLE encounters ADD COLUMN {col_name} {col_type};")

        conn.execute("CREATE INDEX IF NOT EXISTS idx_encounters_patient ON encounters(patient_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_encounters_abha ON encounters(abha_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_encounters_client_intake ON encounters(client_intake_id);")

        # Encounter Audit Trail
        conn.execute("""
            CREATE TABLE IF NOT EXISTS encounter_audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                encounter_id TEXT NOT NULL,
                action TEXT NOT NULL,
                actor TEXT NOT NULL,
                actor_name TEXT,
                timestamp INTEGER NOT NULL,
                note TEXT,
                FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
            );
        """)

        # Documents Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                stored_name TEXT PRIMARY KEY,
                original_name TEXT NOT NULL,
                ext TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                owner_role TEXT NOT NULL,
                encounter_id TEXT,
                consent_external_processing INTEGER DEFAULT 0,
                text_content TEXT,
                pages_json TEXT,
                structured_json TEXT,
                created_at INTEGER NOT NULL
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);")

        # Document Field Corrections Audit
        conn.execute("""
            CREATE TABLE IF NOT EXISTS document_corrections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                stored_name TEXT NOT NULL,
                field_key TEXT NOT NULL,
                original_value TEXT,
                corrected_value TEXT NOT NULL,
                author_id TEXT NOT NULL,
                author_role TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                reason TEXT,
                FOREIGN KEY (stored_name) REFERENCES documents(stored_name) ON DELETE CASCADE
            );
        """)

        # Appointments Table with Active Slot Partial Index
        cur = conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='appointments';")
        apt_row = cur.fetchone()
        apt_sql = apt_row["sql"] if apt_row else ""
        if apt_row and "UNIQUE" in apt_sql and "WHERE" not in apt_sql:
            # Table-level unique constraint prevents rebooking cancelled slots; migrate table
            conn.execute("""
                CREATE TABLE appointments_migrated (
                    id TEXT PRIMARY KEY,
                    doctor_id TEXT NOT NULL,
                    doctor_name TEXT NOT NULL,
                    department TEXT NOT NULL,
                    patient_name TEXT NOT NULL,
                    patient_phone TEXT NOT NULL,
                    patient_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    time_slot TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'CONFIRMED',
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                );
            """)
            conn.execute("INSERT INTO appointments_migrated SELECT * FROM appointments;")
            conn.execute("DROP TABLE appointments;")
            conn.execute("ALTER TABLE appointments_migrated RENAME TO appointments;")
        else:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS appointments (
                    id TEXT PRIMARY KEY,
                    doctor_id TEXT NOT NULL,
                    doctor_name TEXT NOT NULL,
                    department TEXT NOT NULL,
                    patient_name TEXT NOT NULL,
                    patient_phone TEXT NOT NULL,
                    patient_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    time_slot TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'CONFIRMED',
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                );
            """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, date);")
        conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_active_appointments ON appointments(doctor_id, date, time_slot) WHERE status = 'CONFIRMED';")

        # OTP Challenges Table (Durable Rate Limiting & Verification)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS otp_challenges (
                target TEXT PRIMARY KEY,
                otp_hash TEXT NOT NULL,
                attempts INTEGER DEFAULT 0,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                cooldown_until INTEGER NOT NULL
            );
        """)

        # User Consents Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_consents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                consent_type TEXT NOT NULL,
                granted INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                revoked_at INTEGER
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_consents_user ON user_consents(user_id, consent_type);")

    # Seed development demo accounts if appropriate
    _seed_initial_accounts()


def _seed_initial_accounts() -> None:
    now = int(time.time())
    with transaction() as conn:
        count = conn.execute("SELECT COUNT(*) as c FROM accounts;").fetchone()["c"]

        # Production Guard: NEVER auto-seed default credentials in production
        if settings.is_production:
            if count == 0 and settings.admin_bootstrap_password:
                # Secure administrator bootstrap via environment configuration
                admin_id = "admin-bootstrap-01"
                pwd_hash = hash_password(settings.admin_bootstrap_password)
                conn.execute(
                    """
                    INSERT INTO accounts (id, email, password_hash, name, role, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                    """,
                    (admin_id, "admin@sehat-saathi.local", pwd_hash, "Bootstrap Administrator", "admin", "approved", now, now),
                )
            return

        # Development / Testing Seed Accounts
        if count == 0 and settings.is_simulation_permitted:
            seed_accounts = [
                {
                    "id": "admin-001",
                    "email": "admin@sehat-saathi.com",
                    "password_hash": hash_password("Admin@Sehat2026!"),
                    "name": "System Administrator",
                    "role": "admin",
                    "status": "approved",
                },
                {
                    "id": "demo-doctor",
                    "email": "demo-doctor@sehat-saathi.com",
                    "password_hash": hash_password("demo123"),
                    "name": "Dr. Sharma (MD, Clinical Lead)",
                    "role": "doctor",
                    "status": "approved",
                    "medical_system": "Allopathy",
                    "specialty": "Emergency & Internal Medicine",
                    "registration_id": "DEMO-REG-001",
                    "council_name": "Medical Council of India",
                },
                {
                    "id": "doctor-001",
                    "email": "doctor1@sehat-saathi.com",
                    "password_hash": hash_password("Doctor@123"),
                    "name": "Dr. Ramesh Sharma",
                    "role": "doctor",
                    "status": "approved",
                    "medical_system": "Allopathy",
                    "specialty": "General Medicine",
                    "registration_id": "REG001",
                    "council_name": "Delhi Medical Council",
                },
                {
                    "id": "doctor-002",
                    "email": "doctor2@sehat-saathi.com",
                    "password_hash": hash_password("Doctor@123"),
                    "name": "Dr. Priya Patel",
                    "role": "doctor",
                    "status": "approved",
                    "medical_system": "Ayurveda",
                    "specialty": "Kayachikitsa (Internal Medicine)",
                    "registration_id": "REG002",
                    "council_name": "Central Council of Indian Medicine",
                },
            ]
            for acc in seed_accounts:
                conn.execute(
                    """
                    INSERT INTO accounts (
                        id, email, password_hash, name, role, status,
                        medical_system, specialty, registration_id, council_name,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        acc["id"],
                        acc["email"],
                        acc["password_hash"],
                        acc["name"],
                        acc["role"],
                        acc["status"],
                        acc.get("medical_system"),
                        acc.get("specialty"),
                        acc.get("registration_id"),
                        acc.get("council_name"),
                        now,
                        now,
                    ),
                )
