import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { useLanguage } from "../i18n/LanguageContext";

export interface DoctorProfile {
  id: string;
  name: string;
  department: string;
  medicalSystem: "Allopathy" | "Ayurveda" | "Homeopathy";
  qualifications: string;
  languages: string[];
  experienceYears: number;
  availableDays: string[];
  timing: string;
  room: string;
}

export const DOCTORS_DIRECTORY: DoctorProfile[] = [
  {
    id: "doc-1",
    name: "Dr. Ramesh Sharma",
    department: "General Medicine",
    medicalSystem: "Allopathy",
    qualifications: "MBBS, MD (General Medicine)",
    languages: ["Hindi", "English"],
    experienceYears: 14,
    availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    timing: "09:00 AM - 01:00 PM",
    room: "OPD Room 104",
  },
  {
    id: "doc-2",
    name: "Dr. Priya Patel",
    department: "Kayachikitsa (Internal Medicine)",
    medicalSystem: "Ayurveda",
    qualifications: "BAMS, MD (Ayurveda - Kayachikitsa)",
    languages: ["Hindi", "English", "Gujarati"],
    experienceYears: 11,
    availableDays: ["Mon", "Wed", "Fri", "Sat"],
    timing: "10:00 AM - 02:00 PM",
    room: "AYUSH OPD 202",
  },
  {
    id: "doc-3",
    name: "Dr. Arvind Joshi",
    department: "Panchakarma",
    medicalSystem: "Ayurveda",
    qualifications: "BAMS, MD (Panchakarma)",
    languages: ["Hindi", "English", "Marathi"],
    experienceYears: 9,
    availableDays: ["Tue", "Thu", "Sat"],
    timing: "09:30 AM - 01:30 PM",
    room: "AYUSH OPD 205",
  },
  {
    id: "doc-4",
    name: "Dr. Anita Desai",
    department: "Pediatrics & Child Health",
    medicalSystem: "Allopathy",
    qualifications: "MBBS, DCH, DNB (Pediatrics)",
    languages: ["Hindi", "English"],
    experienceYears: 16,
    availableDays: ["Mon", "Tue", "Thu", "Fri"],
    timing: "02:00 PM - 05:00 PM",
    room: "OPD Room 108",
  },
  {
    id: "doc-5",
    name: "Dr. Rajeshwar Singh",
    department: "Shalya Tantra (General Surgery & Anorectal)",
    medicalSystem: "Ayurveda",
    qualifications: "BAMS, MS (Ayurveda - Shalya Tantra)",
    languages: ["Hindi", "English"],
    experienceYears: 12,
    availableDays: ["Mon", "Wed", "Fri"],
    timing: "11:00 AM - 03:00 PM",
    room: "AYUSH OPD 208",
  },
];

export default function DoctorDirectory() {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [systemFilter, setSystemFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredDoctors = DOCTORS_DIRECTORY.filter((doc) => {
    const matchesSystem = systemFilter === "all" || doc.medicalSystem === systemFilter;
    const matchesQuery =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.qualifications.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSystem && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader />
        <main className="mx-auto max-w-4xl px-6 py-8">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-clinic-600">
                <span>👨‍⚕️</span>
                <span>{language === "hi" ? "ओपीडी विशेषज्ञ निर्देशिका" : "Outpatient Specialists Directory"}</span>
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold text-ink">
                {language === "hi" ? "परामर्श हेतु चिकित्सक खोजें" : "Consulting Clinicians & Specialists"}
              </h1>
              <p className="mt-1 text-xs text-muted">
                {language === "hi"
                  ? "आधुनिक चिकित्सा एवं आयुष (आयुर्वेद) के प्रमाणित चिकित्सकों का परामर्श समय"
                  : "Verified schedule for Allopathic and AYUSH (Ayurvedic) hospital OPD clinicians."}
              </p>
            </div>

            <Link
              to="/patient/entry"
              className="rounded-full border border-clinic-200 bg-white px-4 py-2 text-xs font-semibold text-clinic-700 hover:bg-clinic-50 transition"
            >
              ← {language === "hi" ? "कियोस्क इनटेक पर लौटें" : "Back to Kiosk Intake"}
            </Link>
          </div>

          {/* Filters & Search */}
          <div className="mb-6 flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-clinic-100 shadow-xs">
            <div className="flex-1 min-w-[220px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === "hi" ? "चिकित्सक या विभाग खोजें..." : "Search by doctor name or specialty..."}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 mr-1">System:</span>
              {["all", "Allopathy", "Ayurveda"].map((sys) => (
                <button
                  key={sys}
                  type="button"
                  onClick={() => setSystemFilter(sys)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    systemFilter === sys
                      ? "bg-teal-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {sys === "all" ? "All Systems" : sys}
                </button>
              ))}
            </div>
          </div>

          {/* Doctor Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredDoctors.map((doc) => (
              <div
                key={doc.id}
                className="rounded-2xl border border-clinic-100 bg-white p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold text-ink">{doc.name}</h2>
                      <p className="text-xs text-clinic-700 font-medium">{doc.department}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        doc.medicalSystem === "Ayurveda"
                          ? "bg-amber-100 text-amber-900 border border-amber-200"
                          : "bg-teal-100 text-teal-900 border border-teal-200"
                      }`}
                    >
                      {doc.medicalSystem}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">{doc.qualifications}</p>

                  <div className="mt-3.5 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Experience:</span>
                      <span className="font-semibold text-slate-800">{doc.experienceYears} Years</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Available Days:</span>
                      <span className="font-medium text-slate-800">{doc.availableDays.join(", ")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Timings:</span>
                      <span className="font-medium text-slate-800">{doc.timing}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Location:</span>
                      <span className="font-semibold text-clinic-700">{doc.room}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => navigate(`/appointments?doctorId=${doc.id}`)}
                    className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition"
                  >
                    {language === "hi" ? "अपॉइंटमेंट बुक करें" : "Book OPD Consultation"} →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
