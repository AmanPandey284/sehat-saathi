import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { useLanguage } from "../i18n/LanguageContext";
import { DOCTORS_DIRECTORY } from "./DoctorDirectory";
import { BASE_URL } from "../services/api";
import { getAuthorizationHeader, setGuestToken } from "../services/authStorage";

interface AppointmentRecord {
  id: string;
  doctorId: string;
  doctorName: string;
  department: string;
  patientName: string;
  patientPhone: string;
  date: string;
  timeSlot: string;
  status: "CONFIRMED" | "CANCELLED";
  bookedAt: string;
}

const APPOINTMENT_STORAGE_KEY = "sehat_saathi_appointments_v1";

function loadAppointments(): AppointmentRecord[] {
  try {
    const raw = localStorage.getItem(APPOINTMENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAppointments(records: AppointmentRecord[]) {
  try {
    localStorage.setItem(APPOINTMENT_STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

const TIME_SLOTS = [
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
];

export default function AppointmentBooking() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialDocId = searchParams.get("doctorId") || DOCTORS_DIRECTORY[0].id;
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId);
  const [patientName, setPatientName] = useState<string>("");
  const [patientPhone, setPatientPhone] = useState<string>("");
  const [appointmentDate, setAppointmentDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<string>(TIME_SLOTS[0]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>(loadAppointments);
  const [confirmedTicket, setConfirmedTicket] = useState<AppointmentRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [unavailableSlots, setUnavailableSlots] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function checkAvailability() {
      try {
        const res = await fetch(`${BASE_URL}/api/appointments/availability?doctor_id=${selectedDocId}&date=${appointmentDate}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data.booked_slots)) {
            setUnavailableSlots(data.booked_slots);
          }
        }
      } catch {}
    }
    checkAvailability();
    return () => {
      cancelled = true;
    };
  }, [selectedDocId, appointmentDate]);

  const selectedDoctor = DOCTORS_DIRECTORY.find((d) => d.id === selectedDocId) || DOCTORS_DIRECTORY[0];

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!patientName.trim() || !patientPhone.trim()) {
      setErrorMsg("Please provide patient name and contact phone number.");
      return;
    }

    // Ensure session token
    let authHeaders = getAuthorizationHeader();
    if (!authHeaders.Authorization) {
      try {
        const guestRes = await fetch(`${BASE_URL}/api/auth/guest-session`, { method: "POST" });
        if (guestRes.ok) {
          const guestData = await guestRes.json();
          setGuestToken(guestData.token);
          authHeaders = { Authorization: `Bearer ${guestData.token}` };
        }
      } catch {}
    }

    // Attempt atomic server booking
    try {
      const res = await fetch(`${BASE_URL}/api/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          doctor_id: selectedDoctor.id,
          doctor_name: selectedDoctor.name,
          department: selectedDoctor.department,
          patient_name: patientName.trim(),
          patient_phone: patientPhone.trim(),
          date: appointmentDate,
          time_slot: selectedSlot,
        }),
      });

      if (res.status === 409) {
        const conflictData = await res.json().catch(() => ({}));
        setErrorMsg(
          conflictData.detail ||
            `This time slot (${selectedSlot}) on ${appointmentDate} has already been confirmed by another patient. Please choose another slot.`
        );
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.detail || "Unable to confirm appointment. Please check availability.");
        return;
      }

      const data = await res.json();
      const serverTicket: AppointmentRecord = {
        id: data.appointment?.id || `APT-${Date.now().toString().slice(-6)}`,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        department: selectedDoctor.department,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        date: appointmentDate,
        timeSlot: selectedSlot,
        status: "CONFIRMED",
        bookedAt: new Date().toISOString(),
      };

      const updated = [serverTicket, ...appointments];
      setAppointments(updated);
      saveAppointments(updated);
      setConfirmedTicket(serverTicket);
    } catch {
      // Local fallback if offline
      const ticket: AppointmentRecord = {
        id: `APT-${Date.now().toString().slice(-6)}`,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        department: selectedDoctor.department,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        date: appointmentDate,
        timeSlot: selectedSlot,
        status: "CONFIRMED",
        bookedAt: new Date().toISOString(),
      };
      const updated = [ticket, ...appointments];
      setAppointments(updated);
      saveAppointments(updated);
      setConfirmedTicket(ticket);
    }
  };

  const handleCancel = (ticketId: string) => {
    const updated = appointments.map((a) =>
      a.id === ticketId ? { ...a, status: "CANCELLED" as const } : a
    );
    setAppointments(updated);
    saveAppointments(updated);
    if (confirmedTicket?.id === ticketId) {
      setConfirmedTicket(null);
    }
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-6 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-clinic-600">
                <span>📅</span>
                <span>{language === "hi" ? "ओपीडी अपॉइंटमेंट शेड्यूलिंग" : "Outpatient OPD Scheduling"}</span>
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold text-ink">
                {language === "hi" ? "परामर्श समय निर्धारित करें" : "Schedule Consultation"}
              </h1>
            </div>

            <Link
              to="/doctors"
              className="text-xs font-semibold text-clinic-700 hover:text-clinic-900 underline"
            >
              ← {language === "hi" ? "विशेषज्ञ सूची देखें" : "View Specialist Directory"}
            </Link>
          </div>

          {confirmedTicket ? (
            <div className="rounded-3xl border border-emerald-200 bg-white p-7 shadow-sm">
              <div className="flex items-center gap-3 text-emerald-800 mb-4">
                <span className="text-3xl">✓</span>
                <div>
                  <h2 className="text-lg font-bold">Appointment Confirmed</h2>
                  <p className="text-xs text-emerald-700 font-mono">Token ID: #{confirmedTicket.id}</p>
                </div>
              </div>

              <div className="rounded-2xl bg-emerald-50/60 p-4 border border-emerald-100 text-xs text-slate-700 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted">Physician:</span>
                  <span className="font-bold text-slate-900">{confirmedTicket.doctorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Specialty / Department:</span>
                  <span className="font-semibold text-slate-900">{confirmedTicket.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Patient Name:</span>
                  <span className="font-semibold text-slate-900">{confirmedTicket.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Scheduled Slot:</span>
                  <span className="font-bold text-teal-800">{confirmedTicket.date} at {confirmedTicket.timeSlot}</span>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Please report to the OPD desk 15 minutes before your scheduled slot with your token number.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmedTicket(null)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Book Another Appointment
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/patient/entry")}
                  className="py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-semibold text-white"
                >
                  Proceed to Clinical Intake →
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-clinic-100 bg-white p-7 shadow-sm">
              {errorMsg && (
                <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleBook} className="space-y-4">
                {/* Doctor Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                    Select Attending Specialist
                  </label>
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                  >
                    {DOCTORS_DIRECTORY.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.department} ({d.medicalSystem})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Patient Details */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                      Patient Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>

                {/* Date & Slot */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                      Appointment Date
                    </label>
                    <input
                      type="date"
                      value={appointmentDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                      Available Time Slot
                    </label>
                    <select
                      value={selectedSlot}
                      onChange={(e) => setSelectedSlot(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                    >
                      {TIME_SLOTS.map((slot) => {
                        const isBooked = unavailableSlots.includes(slot);
                        return (
                          <option key={slot} value={slot} disabled={isBooked}>
                            {slot} {isBooked ? "(Booked / Unavailable)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-3 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition"
                >
                  Confirm Appointment Slot
                </button>
              </form>
            </div>
          )}

          {/* Existing Booked Appointments */}
          {appointments.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Your Scheduled Visits ({appointments.length})
              </h3>
              <div className="space-y-2.5">
                {appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-100 text-xs shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{apt.doctorName}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600">{apt.department}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            apt.status === "CONFIRMED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-500 line-through"
                          }`}
                        >
                          {apt.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-muted">
                        Date: <strong>{apt.date}</strong> at <strong>{apt.timeSlot}</strong> · Patient: {apt.patientName}
                      </p>
                    </div>

                    {apt.status === "CONFIRMED" && (
                      <button
                        type="button"
                        onClick={() => handleCancel(apt.id)}
                        className="text-xs font-semibold text-red-600 hover:text-red-800 px-2 py-1 rounded border border-red-200"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
